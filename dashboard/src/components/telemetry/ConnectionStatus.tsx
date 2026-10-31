import React from 'react';
import { Radio, WifiOff } from 'lucide-react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { formatTimestamp } from '@/utils/time';

const LABELS = {
  disconnected: 'BACKEND DISCONNECTED',
  connecting: 'CONNECTING',
  connected: 'LIVE TELEMETRY',
  reconnecting: 'RECONNECTING',
  stale: 'TELEMETRY STALE',
  error: 'TELEMETRY ERROR',
} as const;

const ConnectionStatus: React.FC = () => {
  const connectionState = useTelemetryStore((state) => state.connectionState);
  const sourceMode = useTelemetryStore((state) => state.sourceMode);
  const lastReceivedAt = useTelemetryStore((state) => state.lastReceivedAt);
  const lastError = useTelemetryStore((state) => state.lastError);
  const isMock = sourceMode === 'mock';
  const label = isMock ? 'SIMULATED TELEMETRY' : LABELS[connectionState];
  const color = isMock
    ? 'var(--event-warning)'
    : connectionState === 'connected'
      ? 'var(--accent-mint)'
      : connectionState === 'error' || connectionState === 'stale'
        ? 'var(--event-blocked)'
        : 'var(--text-muted)';

  return (
    <div
      role="status"
      title={lastError ?? (isMock ? 'Demo fixtures; no backend or OS enforcement is connected.' : label)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, color,
        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.05em',
      }}
    >
      {connectionState === 'disconnected' || connectionState === 'error'
        ? <WifiOff size={11} />
        : <Radio size={11} />}
      <span>{label}</span>
      {lastReceivedAt && (
        <span style={{ color: 'var(--text-muted)' }}>
          · LAST {formatTimestamp(lastReceivedAt, 'local')}
        </span>
      )}
    </div>
  );
};

export default ConnectionStatus;
