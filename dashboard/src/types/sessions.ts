// ============================================
// DIAMOND Session Types
// ============================================

export type SessionStatus = 'active' | 'completed' | 'terminated' | 'paused';
export type SecurityStatus = 'clean' | 'warning' | 'alert' | 'critical';

export interface AgentSession {
  id: string;
  agentName: string;
  startTime: string;
  endTime?: string;
  status: SessionStatus;
  processCount: number;
  eventCount: number;
  securityStatus: SecurityStatus;
  repositoryName: string;
  repositoryRevision: string;
  userIntent: string;
  permissions: SessionPermissions;
  blockedCount: number;
  allowedCount: number;
}

export interface SessionPermissions {
  allowed: PermissionRule[];
  restricted: PermissionRule[];
}

export interface PermissionRule {
  id: string;
  description: string;
  category: 'filesystem' | 'network' | 'process' | 'data';
  scope?: string;
}
