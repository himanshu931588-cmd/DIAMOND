import type {
  DiamondEventType,
  EnforcementStatus,
  NormalizedTelemetryEvent,
  TelemetryCategory,
  VisualEventCategory,
} from '@/types/events';
import {
  telemetryWireEventSchema,
  type NormalizationContext,
  type TelemetryWireEvent,
} from '@/types/telemetry';

const TYPE_CATEGORY: Record<string, TelemetryCategory> = {
  FILE_READ: 'file', FILE_WRITE: 'file', FILE_CREATE: 'file', FILE_DELETE: 'file', FILE_RENAME: 'file',
  PROCESS_START: 'process', PROCESS_EXIT: 'process', PROCESS_SPAWN: 'process', COMMAND_EXECUTION: 'process',
  NETWORK_CONNECT: 'network', NETWORK_SEND: 'network', NETWORK_BLOCK: 'network', DNS_LOOKUP: 'network',
  POLICY_ALLOW: 'security', POLICY_DENY: 'security', SENSITIVE_FILE_ACCESS: 'security',
  SUSPICIOUS_DATA_FLOW: 'security', AGENT_BLOCKED: 'security', USER_APPROVAL_REQUIRED: 'security',
  TAINT_UPDATE: 'taint', RISK_UPDATE: 'risk', SESSION_START: 'session', SESSION_END: 'session',
};

function eventType(raw: TelemetryWireEvent): string {
  return (raw.eventType ?? raw.type ?? 'UNKNOWN_EVENT').toUpperCase();
}

function visualCategory(raw: TelemetryWireEvent, normalizedType: string): VisualEventCategory {
  if (raw.visualCategory) return raw.visualCategory;
  if (normalizedType === 'FILE_READ') return 'read';
  if (normalizedType === 'FILE_WRITE') return 'write';
  if (normalizedType === 'FILE_CREATE') return 'create';
  if (normalizedType === 'FILE_DELETE') return 'delete';
  if (normalizedType === 'FILE_RENAME') return 'rename';
  if (normalizedType.startsWith('NETWORK')) return 'network';
  if (normalizedType.startsWith('PROCESS') || normalizedType === 'COMMAND_EXECUTION') return 'process';
  if (normalizedType === 'POLICY_ALLOW') return 'allowed';
  if (normalizedType === 'POLICY_DENY' || normalizedType === 'AGENT_BLOCKED') return 'blocked';
  return 'warning';
}

function enforcement(raw: TelemetryWireEvent, context: NormalizationContext): EnforcementStatus {
  if (context.provenance === 'simulated') return 'simulated';
  // A backend can establish a denial only with a matching decision/enforcement provenance.
  if (raw.enforcement === 'denied_by_kernel' && context.provenance === 'kernel_enforced') return raw.enforcement;
  if (raw.enforcement === 'denied_by_supervisor' && context.provenance === 'supervisor_decision') return raw.enforcement;
  if (raw.enforcement === 'allowed' && context.provenance === 'supervisor_decision') return raw.enforcement;
  if (raw.enforcement === 'pending_approval') return raw.enforcement;
  if (raw.enforcement === 'failed') return raw.enforcement;
  return context.defaultEnforcement;
}

/** Validates untrusted telemetry then projects it into the existing UI event contract. */
export function normalizeTelemetryEvent(
  input: unknown,
  context: NormalizationContext,
): NormalizedTelemetryEvent {
  const raw = telemetryWireEventSchema.parse(input);
  const normalizedType = eventType(raw);
  const category = TYPE_CATEGORY[normalizedType] ?? 'system';
  const sourceFile = raw.filePath ?? raw.sourceFile ?? raw.source;
  const destination = raw.destination ?? raw.targetFile ?? raw.networkDestination;
  const decision = raw.decision ?? raw.policyDecision;
  const status = enforcement(raw, context);

  return {
    id: raw.id,
    sessionId: raw.sessionId,
    timestamp: raw.timestamp,
    receivedAt: context.receivedAt ?? new Date().toISOString(),
    sequenceNumber: raw.sequenceNumber,
    category,
    eventType: normalizedType,
    operation: raw.operation,
    agentId: raw.agentId,
    agentName: raw.agentName ?? raw.agentId ?? 'unknown-agent',
    processId: raw.processId ?? 0,
    parentProcessId: raw.parentProcessId ?? 0,
    executable: raw.executable,
    command: raw.command,
    source: raw.source ?? sourceFile,
    destination,
    filePath: sourceFile,
    riskScore: raw.riskScore,
    severity: raw.severity ?? (category === 'system' ? 'medium' : 'info'),
    taint: raw.taint,
    policy: raw.policy ?? raw.triggeredPolicy,
    decision,
    explanation: raw.explanation ?? raw.description,
    provenance: context.provenance,
    enforcement: status,
    metadata: { ...raw.metadata, originalType: raw.type, originalEventType: raw.eventType },
    type: (TYPE_CATEGORY[normalizedType] ? normalizedType : 'UNKNOWN_EVENT') as DiamondEventType,
    sourceFile,
    targetFile: raw.targetFile,
    networkDestination: raw.networkDestination ?? raw.destination,
    result: status === 'pending_approval' ? 'pending' : status === 'failed' ? 'error' : raw.result ?? 'ok',
    description: raw.description ?? raw.explanation ?? `Telemetry event: ${normalizedType}`,
    policyDecision: decision,
    triggeredPolicy: raw.triggeredPolicy ?? raw.policy,
    affectedFiles: raw.affectedFiles ?? (sourceFile ? [sourceFile] : []),
    stepNumber: raw.stepNumber ?? 0,
    totalSteps: raw.totalSteps ?? 0,
    visualCategory: visualCategory(raw, normalizedType),
  };
}
