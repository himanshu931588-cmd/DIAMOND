export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AgentState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'BLOCKED' | 'COMPLETED';
export type Verdict = 'ALLOW' | 'PAUSE_PROMPT' | 'BLOCK';

export interface AllowList {
  sessionId: string;
  agentId: string;
  allowedTools: string[];
  deniedCategories: string[];
  createdAt: string;
}

export interface ToolRequest {
  id: string;
  agentId: string;
  sessionId: string;
  tool: string;
  args: Record<string, unknown>;
  timestamp: string;
}

export interface SecurityEvaluation {
  requestId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  verdict: Verdict;
  reason: string;
  factors: { name: string; score: number }[];
  timestamp: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  agentId: string;
  sessionId: string;
  tool: string;
  args: Record<string, unknown>;
  verdict: Verdict;
  riskScore: number | null;
  reason: string;
  resolvedBy: 'AUTO' | 'USER_ALLOW' | 'USER_DENY' | 'SYSTEM_BLOCK';
}

export interface AlertPayload {
  requestId: string;
  agentId: string;
  tool: string;
  args: Record<string, unknown>;
  riskScore: number;
  riskLevel: RiskLevel;
  reason: string;
  timestamp: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function startAgent(prompt: string, agentId: string): Promise<AllowList> {
  const res = await fetch(`${API_BASE}/agent/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, agentId })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to start agent (${res.status})`);
  }

  const data = await res.json();
  return data.allowList;
}

export async function sendToolRequest(
  agentId: string,
  sessionId: string,
  tool: string,
  args: Record<string, unknown> = {}
): Promise<any> {
  const res = await fetch(`${API_BASE}/agent/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, sessionId, tool, args })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 403) {
    throw new Error(data.error || `Tool request failed with status ${res.status}`);
  }
  return data;
}

export async function getAuditLogs(): Promise<AuditEntry[]> {
  const res = await fetch(`${API_BASE}/audit/logs`);
  if (!res.ok) {
    throw new Error('Failed to fetch audit logs');
  }
  const data = await res.json();
  return data.logs || [];
}

export async function clearAuditLogs(): Promise<void> {
  const res = await fetch(`${API_BASE}/audit/logs`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error('Failed to clear audit logs');
  }
}

export async function getCurrentPolicy(agentId?: string): Promise<AllowList | null> {
  const url = agentId ? `${API_BASE}/policy/current?agentId=${encodeURIComponent(agentId)}` : `${API_BASE}/policy/current`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.allowList || null;
}

export async function updateAgentState(state: AgentState, agentId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/agent/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, agentId })
  });
  return res.json();
}
