// ============================================
// DIAMOND Event Type System
// ============================================

// ── Filesystem Events ──
export type FilesystemEventType =
  | 'FILE_READ'
  | 'FILE_WRITE'
  | 'FILE_CREATE'
  | 'FILE_DELETE'
  | 'FILE_RENAME';

// ── Process Events ──
export type ProcessEventType =
  | 'PROCESS_START'
  | 'PROCESS_EXIT'
  | 'PROCESS_SPAWN'
  | 'COMMAND_EXECUTION';

// ── Network Events ──
export type NetworkEventType =
  | 'NETWORK_CONNECT'
  | 'NETWORK_SEND'
  | 'NETWORK_BLOCK'
  | 'DNS_LOOKUP';

// ── Security Events ──
export type SecurityEventType =
  | 'POLICY_ALLOW'
  | 'POLICY_DENY'
  | 'SENSITIVE_FILE_ACCESS'
  | 'SUSPICIOUS_DATA_FLOW'
  | 'AGENT_BLOCKED'
  | 'USER_APPROVAL_REQUIRED';

export type DiamondEventType =
  | FilesystemEventType
  | ProcessEventType
  | NetworkEventType
  | SecurityEventType
  | 'UNKNOWN_EVENT';

export type TelemetryCategory =
  | 'process'
  | 'file'
  | 'network'
  | 'security'
  | 'taint'
  | 'risk'
  | 'session'
  | 'system';

/** Evidence source, not a statement about desired architecture. */
export type TelemetryProvenance =
  | 'simulated'
  | 'agent_observed'
  | 'supervisor_observed'
  | 'kernel_observed'
  | 'supervisor_decision'
  | 'kernel_enforced';

/** Outcome evidence kept independent from event kind, risk, and provenance. */
export type EnforcementStatus =
  | 'unknown'
  | 'observed'
  | 'allowed'
  | 'pending_approval'
  | 'denied_by_supervisor'
  | 'denied_by_kernel'
  | 'failed'
  | 'simulated';

// ── Severity ──
export type EventSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

// ── Operation Result ──
export type OperationResult = 'ok' | 'denied' | 'error' | 'pending';

// ── Policy Decision ──
export type PolicyDecision = 'allowed' | 'denied' | 'pending' | 'user_review';

// ── Visual Event Category (for UI rendering) ──
export type VisualEventCategory =
  | 'read'
  | 'write'
  | 'create'
  | 'rename'
  | 'delete'
  | 'commit'
  | 'warning'
  | 'blocked'
  | 'allowed'
  | 'network'
  | 'process';

// ── Core Event Interface ──
export interface DiamondEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  type: DiamondEventType;
  processId: number;
  parentProcessId: number;
  agentName: string;
  command?: string;
  sourceFile?: string;
  targetFile?: string;
  networkDestination?: string;
  result: OperationResult;
  severity: EventSeverity;
  description: string;
  policyDecision?: PolicyDecision;
  triggeredPolicy?: string;
  affectedFiles: string[];
  stepNumber: number;
  totalSteps: number;
  visualCategory: VisualEventCategory;
}

/**
 * Canonical event used at the telemetry boundary. Legacy fields are retained so
 * the existing visualization can evolve without a parallel event system.
 */
export interface NormalizedTelemetryEvent extends DiamondEvent {
  receivedAt: string;
  category: TelemetryCategory;
  eventType: string;
  operation?: string;
  agentId?: string;
  executable?: string;
  source?: string;
  destination?: string;
  filePath?: string;
  riskScore?: number;
  taint?: string;
  policy?: string;
  decision?: PolicyDecision;
  explanation?: string;
  sequenceNumber?: number;
  provenance: TelemetryProvenance;
  enforcement: EnforcementStatus;
  metadata: Record<string, unknown>;
}

// ── Event Filter ──
export interface EventFilter {
  categories: VisualEventCategory[];
  severities: EventSeverity[];
  agents: string[];
  searchQuery: string;
}

// ── Event Color Map ──
export const EVENT_COLORS: Record<VisualEventCategory, string> = {
  read: '#D1DCE3',
  write: '#F08C72',
  create: '#57D8B2',
  rename: '#54C7D0',
  delete: '#D66D83',
  commit: '#E2CE83',
  warning: '#E6B85C',
  blocked: '#F06C76',
  allowed: '#57D8B2',
  network: '#55C9CB',
  process: '#89969E',
};

export const EVENT_LABELS: Record<VisualEventCategory, string> = {
  read: 'Read',
  write: 'Write',
  create: 'Create',
  rename: 'Rename',
  delete: 'Delete',
  commit: 'Commit',
  warning: 'Warning',
  blocked: 'Blocked',
  allowed: 'Allowed',
  network: 'Network',
  process: 'Process',
};
