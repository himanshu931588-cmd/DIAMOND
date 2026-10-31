import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { useUIStore } from '@/store/uiStore';
import { formatTimestamp } from '@/utils/time';
import { getSeverityColor } from '@/utils/colors';
import { Users, ArrowRight } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  active: '#72E0BE',
  completed: '#89969E',
  terminated: '#F06C76',
  paused: '#E6B85C',
};

const SECURITY_COLORS: Record<string, string> = {
  clean: '#57D8B2',
  warning: '#E6B85C',
  alert: '#F08C72',
  critical: '#F06C76',
};

const SessionsPage: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions);
  const timeMode = useUIStore((s) => s.timeMode);
  const location = useLocation();

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            marginBottom: 4,
            fontFamily: 'var(--font-mono)',
          }}
        >
          DIAMOND · AGENT SESSIONS
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Agent Sessions
        </h1>
      </div>

      <div style={{ height: 1, background: 'var(--border-default)', marginBottom: 24 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sessions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>No sessions are available yet.</div>
        ) : sessions.map((session) => (
          <Link
            key={session.id}
            to={`/sessions/${encodeURIComponent(session.id)}${location.search}`}
            aria-label={`Open session ${session.id}`}
            style={{
              padding: '16px 20px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              transition: 'border-color var(--transition-fast)',
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'block',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
            }}
          >
            {/* Top row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={14} color="var(--text-muted)" />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                  }}
                >
                  {session.agentName}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                    color: STATUS_COLORS[session.status],
                    padding: '2px 8px',
                    border: `1px solid ${STATUS_COLORS[session.status]}40`,
                    borderRadius: 'var(--radius-pill)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {session.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                    color: SECURITY_COLORS[session.securityStatus],
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {session.securityStatus}
                </span>
                <ArrowRight size={12} color="var(--text-muted)" />
              </div>
            </div>

            {/* Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 12,
              }}
            >
              {[
                { label: 'SESSION', value: session.id.slice(-6) },
                { label: 'REPOSITORY', value: session.repositoryName },
                { label: 'EVENTS', value: session.eventCount.toString() },
                { label: 'BLOCKED', value: session.blockedCount.toString() },
                {
                  label: 'START',
                  value: formatTimestamp(session.startTime, timeMode).slice(0, 16),
                },
              ].map((col) => (
                <div key={col.label}>
                  <div
                    style={{
                      fontSize: 8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--text-muted)',
                      marginBottom: 3,
                    }}
                  >
                    {col.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {col.value}
                  </div>
                </div>
              ))}
            </div>

            {/* User Intent */}
            <div
              style={{
                marginTop: 10,
                padding: '8px 10px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  marginBottom: 3,
                }}
              >
                USER INTENT
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                }}
              >
                "{session.userIntent}"
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SessionsPage;
