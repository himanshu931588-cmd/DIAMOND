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
