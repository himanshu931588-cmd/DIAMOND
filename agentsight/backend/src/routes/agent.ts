import { Request, Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { auditLog } from '../services/auditLog';
import { ebpfInterceptor } from '../services/ebpfMock';
import { generateAllowList } from '../services/policyAI';
import { evaluateRequest } from '../services/securityAI';
import {
  emitAlert,
  emitAllowList,
  emitAuditEntry,
  getAgentState,
  registerPendingRequest,
  setAgentState
} from '../socket/events';
import { AlertPayload, AuditEntry, ToolRequest } from '../types';

const router = Router();

// POST /api/agent/start
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { prompt, agentId } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const assignedAgentId = agentId || `agent-${uuidv4().substring(0, 6)}`;
    console.log(`[API] Starting agent ${assignedAgentId} with prompt: "${prompt}"`);

    // 1. Generate AllowList via Policy AI
    const allowList = await generateAllowList(prompt, assignedAgentId);

    // 2. Load policy into mock eBPF kernel layer
    ebpfInterceptor.loadAllowList(allowList);

    // 3. Broadcast updates
    emitAllowList(allowList);
    setAgentState('RUNNING', assignedAgentId);

    // 4. Log initial startup in audit log
    const startupAudit: AuditEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      agentId: assignedAgentId,
      sessionId: allowList.sessionId,
      tool: 'system:initialize',
      args: { prompt, allowedCount: allowList.allowedTools.length },
      verdict: 'ALLOW',
      riskScore: 0,
      reason: `Agent initialized with ${allowList.allowedTools.length} pre-approved tools by Policy AI`,
      resolvedBy: 'AUTO'
    };
    auditLog.append(startupAudit);
    emitAuditEntry(startupAudit);

    return res.status(200).json({
      success: true,
      agentId: assignedAgentId,
      sessionId: allowList.sessionId,
      allowList
    });
  } catch (err: any) {
    console.error('[API] Error starting agent:', err);
    return res.status(500).json({ error: err.message || 'Internal server error starting agent' });
  }
});

// POST /api/agent/request
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { agentId, sessionId, tool, args } = req.body;

    if (!tool || typeof tool !== 'string') {
      return res.status(400).json({ error: 'Tool parameter is required' });
    }

    const requestId = uuidv4();
    const timestamp = new Date().toISOString();
    const currentSessionId = sessionId || 'sess_default';
    const currentAgentId = agentId || getAgentState().agentId || 'agent-alpha';

    const toolRequest: ToolRequest = {
      id: requestId,
      agentId: currentAgentId,
      sessionId: currentSessionId,
      tool,
      args: args || {},
      timestamp
    };

    console.log(`[API] Processing Tool Request ${requestId} for ${currentAgentId}: ${tool}`);

    // Check active AllowList
    const activeAllowList = ebpfInterceptor.getAllowList(currentSessionId) ||
      ebpfInterceptor.getAllowList(currentAgentId) || {
        sessionId: currentSessionId,
        agentId: currentAgentId,
        allowedTools: [],
        deniedCategories: [],
        createdAt: timestamp
      };

    // 1. Intercept with eBPF layer
    const ebpfResult = ebpfInterceptor.intercept(toolRequest);

    if (ebpfResult.inAllowList) {
      // PRE-APPROVED: Fast-path execution
      const entry: AuditEntry = {
        id: requestId,
        timestamp,
        agentId: currentAgentId,
        sessionId: currentSessionId,
        tool,
        args: args || {},
        verdict: 'ALLOW',
        riskScore: 0,
        reason: `Matched eBPF AllowList rule: "${ebpfResult.matchedRule}"`,
        resolvedBy: 'AUTO'
      };

      auditLog.append(entry);
      emitAuditEntry(entry);
      setAgentState('RUNNING', currentAgentId);

      return res.status(200).json({
        success: true,
        requestId,
        status: 'ALLOWED',
        inAllowList: true,
        verdict: 'ALLOW',
        riskScore: 0,
        reason: entry.reason
      });
    }

    // 2. NOT in AllowList -> Security AI evaluation
    console.log(`[API] Tool "${tool}" not in AllowList. Calling Security AI evaluator...`);
    const evaluation = await evaluateRequest(toolRequest, activeAllowList);

    // Case A: Low risk (score < 10) -> Auto Allow
    if (evaluation.verdict === 'ALLOW') {
      const entry: AuditEntry = {
        id: requestId,
        timestamp,
        agentId: currentAgentId,
        sessionId: currentSessionId,
        tool,
        args: args || {},
        verdict: 'ALLOW',
        riskScore: evaluation.riskScore,
        reason: evaluation.reason,
        resolvedBy: 'AUTO'
      };

      auditLog.append(entry);
      emitAuditEntry(entry);
      setAgentState('RUNNING', currentAgentId);

      return res.status(200).json({
        success: true,
        requestId,
        status: 'ALLOWED',
        inAllowList: false,
        verdict: 'ALLOW',
        evaluation
      });
    }

    // Case B: Moderate risk (10 <= score <= 40) -> Pause Agent + Prompt Human
    if (evaluation.verdict === 'PAUSE_PROMPT') {
      setAgentState('PAUSED', currentAgentId);

      const alertPayload: AlertPayload = {
        requestId,
        agentId: currentAgentId,
        tool,
        args: args || {},
        riskScore: evaluation.riskScore,
        riskLevel: evaluation.riskLevel,
        reason: evaluation.reason,
        timestamp
      };

      emitAlert(alertPayload);

      // Create an initial audit log entry representing the pause
      const initialEntry: AuditEntry = {
        id: requestId,
        timestamp,
        agentId: currentAgentId,
        sessionId: currentSessionId,
        tool,
        args: args || {},
        verdict: 'PAUSE_PROMPT',
        riskScore: evaluation.riskScore,
        reason: `Operator intervention requested: ${evaluation.reason}`,
        resolvedBy: 'AUTO'
      };
      auditLog.append(initialEntry);
      emitAuditEntry(initialEntry);

      console.log(`[API] Agent PAUSED. Awaiting operator decision for request ${requestId}...`);

      // Wait for socket user:verdict event
      const userApproved = await registerPendingRequest(requestId, 60000);

      if (userApproved) {
        console.log(`[API] Operator APPROVED request ${requestId}. Resuming agent.`);
        auditLog.updateEntry(requestId, {
          verdict: 'ALLOW',
          resolvedBy: 'USER_ALLOW',
          reason: `Approved by human operator: ${evaluation.reason}`
        });

        const updated = auditLog.getById(requestId);
        if (updated) emitAuditEntry(updated);

        setAgentState('RUNNING', currentAgentId);

        return res.status(200).json({
          success: true,
          requestId,
          status: 'ALLOWED',
          inAllowList: false,
          verdict: 'ALLOW',
          evaluation,
          userApproved: true
        });
      } else {
        console.log(`[API] Operator DENIED request ${requestId} (or timed out). Agent blocked.`);
        auditLog.updateEntry(requestId, {
          verdict: 'BLOCK',
          resolvedBy: 'USER_DENY',
          reason: `Blocked by human operator: ${evaluation.reason}`
        });

        const updated = auditLog.getById(requestId);
        if (updated) emitAuditEntry(updated);

        setAgentState('BLOCKED', currentAgentId);

        return res.status(403).json({
          success: false,
          requestId,
          status: 'BLOCKED',
          inAllowList: false,
          verdict: 'BLOCK',
          evaluation,
          userApproved: false
        });
      }
    }

    // Case C: High / Critical risk (score > 40) -> Immediate Containment Block
    setAgentState('BLOCKED', currentAgentId);

    const alertPayload: AlertPayload = {
      requestId,
      agentId: currentAgentId,
      tool,
      args: args || {},
      riskScore: evaluation.riskScore,
      riskLevel: evaluation.riskLevel,
      reason: evaluation.reason,
      timestamp
    };

    emitAlert(alertPayload);

    const blockedEntry: AuditEntry = {
      id: requestId,
      timestamp,
      agentId: currentAgentId,
      sessionId: currentSessionId,
      tool,
      args: args || {},
      verdict: 'BLOCK',
      riskScore: evaluation.riskScore,
      reason: `Automated containment block: ${evaluation.reason}`,
      resolvedBy: 'SYSTEM_BLOCK'
    };

    auditLog.append(blockedEntry);
    emitAuditEntry(blockedEntry);

    return res.status(403).json({
      success: false,
      requestId,
      status: 'BLOCKED',
      inAllowList: false,
      verdict: 'BLOCK',
      evaluation
    });
  } catch (err: any) {
    console.error('[API] Error handling tool request:', err);
    return res.status(500).json({ error: err.message || 'Internal server error processing request' });
  }
});

// GET /api/agent/state
router.get('/state', (_req: Request, res: Response) => {
  return res.status(200).json(getAgentState());
});

// POST /api/agent/state (e.g. unpause, reset to RUNNING or IDLE)
router.post('/state', (req: Request, res: Response) => {
  const { state, agentId } = req.body;
  if (!state) {
    return res.status(400).json({ error: 'State is required' });
  }
  setAgentState(state, agentId);
  return res.status(200).json(getAgentState());
});

export default router;
