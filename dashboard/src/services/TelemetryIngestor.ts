import { ZodError } from 'zod';
import type { NormalizedTelemetryEvent } from '@/types/events';
import type { NormalizationContext } from '@/types/telemetry';
import { normalizeTelemetryEvent } from '@/services/telemetryNormalizer';
import { useEventStore } from '@/store/eventStore';
import { useTelemetryStore } from '@/store/telemetryStore';

export interface IngestionResult {
  accepted: number;
  duplicates: number;
  rejected: number;
}

/** Single untrusted-input boundary for all transports. */
export class TelemetryIngestor {
  ingest(payloads: unknown[], context: NormalizationContext): IngestionResult {
    const valid: NormalizedTelemetryEvent[] = [];
    let rejected = 0;

    for (const payload of payloads) {
      try {
        valid.push(normalizeTelemetryEvent(payload, context));
      } catch (error) {
        rejected += 1;
        const message = error instanceof ZodError
          ? `Rejected telemetry payload: ${error.issues[0]?.message ?? 'schema validation failed'}`
          : 'Rejected telemetry payload: normalization failed';
        useEventStore.getState().recordIngestionError(message);
      }
    }

    const { accepted, duplicates } = useEventStore.getState().ingestEvents(valid);
    if (accepted > 0) {
      const last = valid[valid.length - 1];
      useTelemetryStore.getState().markReceived(last.receivedAt);
    }
    return { accepted, duplicates, rejected };
  }
}

export const telemetryIngestor = new TelemetryIngestor();
