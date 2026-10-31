import { z } from 'zod';
import type {
  EnforcementStatus,
  TelemetryProvenance,
} from '@/types/events';

export type TelemetryConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'stale'
  | 'error';

export type TelemetrySourceMode = 'mock' | 'rest' | 'websocket';

export const telemetryProvenanceSchema = z.enum([
  'simulated',
  'agent_observed',
  'supervisor_observed',
  'kernel_observed',
  'supervisor_decision',
  'kernel_enforced',
]);

export const enforcementStatusSchema = z.enum([
  'unknown',
  'observed',
  'allowed',
  'pending_approval',
  'denied_by_supervisor',
  'denied_by_kernel',
  'failed',
  'simulated',
]);

/** Broad wire envelope. Unknown event types are normalized as system warnings. */
export const telemetryWireEventSchema = z.object({
  id: z.string().trim().min(1).max(256),
  sessionId: z.string().trim().min(1).max(256),
  timestamp: z.string().datetime(),
  type: z.string().trim().min(1).max(128).optional(),
  eventType: z.string().trim().min(1).max(128).optional(),
  operation: z.string().trim().max(256).optional(),
  sequenceNumber: z.number().int().nonnegative().optional(),
  agentId: z.string().trim().max(256).optional(),
  agentName: z.string().trim().max(256).optional(),
  processId: z.number().int().nonnegative().optional(),
  parentProcessId: z.number().int().nonnegative().optional(),
  executable: z.string().max(4096).optional(),
  command: z.string().max(8192).optional(),
  source: z.string().max(4096).optional(),
  destination: z.string().max(4096).optional(),
  filePath: z.string().max(4096).optional(),
  sourceFile: z.string().max(4096).optional(),
  targetFile: z.string().max(4096).optional(),
  networkDestination: z.string().max(4096).optional(),
  riskScore: z.number().finite().min(0).max(100).optional(),
  severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional(),
  taint: z.string().trim().max(128).optional(),
  policy: z.string().max(512).optional(),
  triggeredPolicy: z.string().max(512).optional(),
  decision: z.enum(['allowed', 'denied', 'pending', 'user_review']).optional(),
  policyDecision: z.enum(['allowed', 'denied', 'pending', 'user_review']).optional(),
  result: z.enum(['ok', 'denied', 'error', 'pending']).optional(),
  explanation: z.string().max(8192).optional(),
  description: z.string().max(8192).optional(),
  affectedFiles: z.array(z.string().max(4096)).max(512).optional(),
  provenance: telemetryProvenanceSchema.optional(),
  enforcement: enforcementStatusSchema.optional(),
  metadata: z.record(z.string().max(128), z.unknown()).optional(),
  stepNumber: z.number().int().nonnegative().optional(),
  totalSteps: z.number().int().nonnegative().optional(),
  visualCategory: z.enum([
    'read', 'write', 'create', 'rename', 'delete', 'commit', 'warning',
    'blocked', 'allowed', 'network', 'process',
  ]).optional(),
});

export type TelemetryWireEvent = z.infer<typeof telemetryWireEventSchema>;

export interface NormalizationContext {
  provenance: TelemetryProvenance;
  defaultEnforcement: EnforcementStatus;
  receivedAt?: string;
}
