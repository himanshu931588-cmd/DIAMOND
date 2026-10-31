import React, { useState } from 'react';
import { NormalizedTelemetryEvent } from '@/types/events';
import { useUIStore } from '@/store/uiStore';
import { formatTimestamp } from '@/utils/time';
import { getSeverityColor } from '@/utils/colors';
import { agentEventService } from '@/services/AgentEventService';
import { ShieldAlert, X, AlertTriangle } from 'lucide-react';

interface SecurityAlertProps {
  event: NormalizedTelemetryEvent;
  onClose: () => void;
}

const SecurityAlert: React.FC<SecurityAlertProps> = ({ event, onClose }) => {
  const timeMode = useUIStore((s) => s.timeMode);
  const [actionTaken, setActionTaken] = useState<string | null>(null);
  const isMockMode = agentEventService.isMockMode;
  const canDecide = !isMockMode && event.result === 'pending';

  const handleAction = async (action: 'allow' | 'deny' | 'terminate') => {
    const result = await agentEventService.sendDecision(event.id, action);
    if (result.simulated) {
      setActionTaken(`${action.toUpperCase()} (simulated — demo mode)`);
    } else {
      setActionTaken(action.toUpperCase());
    }
  };

  const sevColor = getSeverityColor(event.severity);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 9, 12, 0.8)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          background: 'var(--bg-panel)',
          border: `1px solid ${sevColor}40`,
          borderRadius: 'var(--radius-lg)',
          boxShadow: `0 0 40px ${sevColor}15, 0 20px 60px rgba(0,0,0,0.5)`,
          animation: 'fade-in 200ms ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert size={16} color={sevColor} />
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: sevColor,
                }}
              >
                {isMockMode
                  ? 'SIMULATED SECURITY EVENT'
                  : event.severity === 'critical'
                    ? 'SENSITIVE DATA EXPOSURE ATTEMPT'
                    : 'SECURITY EVENT'}
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  marginTop: 2,
                }}
              >
                {event.id}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close alert"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          {/* Details */}
          {[
            { label: 'AGENT', value: event.agentName },
            { label: 'PROCESS', value: event.command || '—' },
            { label: 'ACTION', value: event.type },
            { label: 'SOURCE', value: event.sourceFile || '—' },
            { label: 'DESTINATION', value: event.networkDestination || '—' },
            {
              label: 'STATUS',
              value: isMockMode ? `SIMULATED ${event.result.toUpperCase()}` : event.result.toUpperCase(),
              color: event.result === 'denied' ? 'var(--event-blocked)' : 'var(--event-allowed)',
            },
            { label: 'ENFORCEMENT', value: event.enforcement.replace(/_/g, ' ').toUpperCase() },
            { label: 'PROVENANCE', value: event.provenance.replace(/_/g, ' ').toUpperCase() },
            { label: 'SEVERITY', value: event.severity.toUpperCase(), color: sevColor },
            { label: 'POLICY', value: event.triggeredPolicy || '—' },
            { label: 'TIMESTAMP', value: formatTimestamp(event.timestamp, timeMode) },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '5px 0',
                borderBottom: '1px solid var(--border-default)',
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                {row.label}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: (row as { color?: string }).color || 'var(--text-secondary)',
                  textAlign: 'right',
                  wordBreak: 'break-all',
                  maxWidth: '60%',
                }}
              >
                {row.value}
              </span>
            </div>
          ))}

          {/* Reason */}
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 6,
              }}
            >
              <AlertTriangle size={11} color="var(--event-warning)" />
              <span
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                EXPLANATION
              </span>
            </div>
            <p
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {event.description}
            </p>
          </div>

          {/* Decisions are available only for real pending approval events. */}
          {actionTaken ? (
            <div
              style={{
                marginTop: 14,
                padding: '8px 12px',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-active)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-mint)',
                textAlign: 'center',
              }}
            >
              Decision: {actionTaken}
            </div>
          ) : canDecide ? (
            <div
              style={{
                marginTop: 14,
                display: 'flex',
                gap: 8,
              }}
            >
              <button
                onClick={() => handleAction('deny')}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  background: 'transparent',
                  border: '1px solid var(--event-blocked)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--event-blocked)',
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Deny
              </button>
              <button
                onClick={() => handleAction('allow')}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  background: 'transparent',
                  border: '1px solid var(--event-allowed)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--event-allowed)',
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Allow Once
              </button>
              <button
                onClick={() => handleAction('terminate')}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  background: 'transparent',
                  border: '1px solid var(--text-muted)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Terminate
              </button>
            </div>
          ) : (
            <div
              style={{
                marginTop: 14,
                padding: '9px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.45,
              }}
            >
              {isMockMode
                ? 'Simulation only — this record does not confirm host, supervisor, or kernel enforcement.'
                : 'This operation already has a recorded decision; no approval action is available.'}
            </div>
          )}

          {/* Demo notice */}
          <div
            style={{
              marginTop: 10,
              fontSize: 8,
              color: 'var(--text-muted)',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {isMockMode
              ? 'DEMO TELEMETRY — no operating-system action was performed'
              : 'DECISIONS ARE SENT TO THE CONNECTED SUPERVISOR'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityAlert;
