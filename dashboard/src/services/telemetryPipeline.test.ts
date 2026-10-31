import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeTelemetryEvent } from '@/services/telemetryNormalizer';
import { telemetryIngestor } from '@/services/TelemetryIngestor';
import { useEventStore } from '@/store/eventStore';
import { useTelemetryStore } from '@/store/telemetryStore';

const simulated = { provenance: 'simulated' as const, defaultEnforcement: 'simulated' as const, receivedAt: '2026-01-01T00:00:10.000Z' };
const observed = { provenance: 'supervisor_observed' as const, defaultEnforcement: 'observed' as const, receivedAt: '2026-01-01T00:00:10.000Z' };

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1', sessionId: 'session-a', timestamp: '2026-01-01T00:00:00.000Z',
    type: 'FILE_READ', agentName: 'Demo Agent', processId: 1, parentProcessId: 0,
    sourceFile: 'src/main.tsx', description: 'Read source.', affectedFiles: ['src/main.tsx'],
    ...overrides,
  };
}

describe('telemetry normalization and ingestion', () => {
  beforeEach(() => {
    useEventStore.getState().resetEvents();
    useTelemetryStore.setState({ connectionState: 'disconnected', sourceMode: 'mock', lastReceivedAt: null, lastError: null });
  });

  it('normalizes legacy mock fields with simulated provenance and enforcement', () => {
    const normalized = normalizeTelemetryEvent(event(), simulated);
    expect(normalized.category).toBe('file');
    expect(normalized.filePath).toBe('src/main.tsx');
    expect(normalized.provenance).toBe('simulated');
    expect(normalized.enforcement).toBe('simulated');
  });

  it('rejects malformed required fields without adding an event', () => {
    const result = telemetryIngestor.ingest([{ id: '', timestamp: 'not-a-date' }], simulated);
    expect(result).toEqual({ accepted: 0, duplicates: 0, rejected: 1 });
    expect(useEventStore.getState().allEvents).toHaveLength(0);
    expect(useEventStore.getState().ingestionErrors).toHaveLength(1);
  });

  it('preserves unknown event types as safe system telemetry', () => {
    const normalized = normalizeTelemetryEvent(event({ type: 'FUTURE_EVENT' }), observed);
    expect(normalized.type).toBe('UNKNOWN_EVENT');
    expect(normalized.category).toBe('system');
    expect(normalized.visualCategory).toBe('warning');
  });

  it('deduplicates IDs and inserts late events in timestamp order without sequence numbers', () => {
    const result = telemetryIngestor.ingest([
      event({ id: 'late', timestamp: '2026-01-01T00:00:03.000Z' }),
      event({ id: 'early', timestamp: '2026-01-01T00:00:01.000Z' }),
      event({ id: 'late', timestamp: '2026-01-01T00:00:03.000Z' }),
    ], observed);
    expect(result).toEqual({ accepted: 2, duplicates: 1, rejected: 0 });
    expect(useEventStore.getState().allEvents.map((item) => item.id)).toEqual(['early', 'late']);
    expect(useEventStore.getState().allEvents.map((item) => item.stepNumber)).toEqual([1, 2]);
  });

  it('keeps sessions separate while accepting out-of-order arrival', () => {
    telemetryIngestor.ingest([
      event({ id: 'b', sessionId: 'session-b', timestamp: '2026-01-01T00:00:02.000Z', sequenceNumber: 1 }),
      event({ id: 'a', sessionId: 'session-a', timestamp: '2026-01-01T00:00:01.000Z', sequenceNumber: 9 }),
    ], observed);
    expect(useEventStore.getState().allEvents.map((item) => item.sessionId)).toEqual(['session-a', 'session-b']);
  });

  it('does not treat an observed backend denial as proven kernel enforcement', () => {
    const normalized = normalizeTelemetryEvent(event({
      type: 'NETWORK_BLOCK', result: 'denied', enforcement: 'denied_by_kernel',
    }), observed);
    expect(normalized.enforcement).toBe('observed');
    expect(normalized.provenance).toBe('supervisor_observed');
  });
});
