import { create } from 'zustand';
import type { TelemetryConnectionState, TelemetrySourceMode } from '@/types/telemetry';

interface TelemetryState {
  connectionState: TelemetryConnectionState;
  sourceMode: TelemetrySourceMode;
  lastReceivedAt: string | null;
  lastError: string | null;
  setConnection: (state: TelemetryConnectionState, sourceMode?: TelemetrySourceMode) => void;
  markReceived: (receivedAt: string) => void;
  setError: (message: string) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  connectionState: 'disconnected',
  sourceMode: 'mock',
  lastReceivedAt: null,
  lastError: null,
  setConnection: (connectionState, sourceMode) => set((state) => ({
    connectionState,
    sourceMode: sourceMode ?? state.sourceMode,
    // Preserve the failure reason while reconnecting; clear it only after recovery.
    lastError: connectionState === 'connected' ? null : state.lastError,
  })),
  markReceived: (lastReceivedAt) => set({ lastReceivedAt }),
  setError: (lastError) => set({ connectionState: 'error', lastError }),
}));
