import React from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useEventStore } from '@/store/eventStore';
import { MOCK_EVENTS } from '@/data/mockEvents';
import { Shield, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

const OverviewPage: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions);

  const activeSessions = sessions.filter((s) => s.status === 'active');
  const totalBlocked = sessions.reduce((acc, s) => acc + s.blockedCount, 0);
  const totalAllowed = sessions.reduce((acc, s) => acc + s.allowedCount, 0);
  const totalEvents = sessions.reduce((acc, s) => acc + s.eventCount, 0);
  const criticalEvents = MOCK_EVENTS.filter((e) => e.severity === 'critical');

  const stats = [
    {
      label: 'ACTIVE SESSIONS',
      value: activeSessions.length,
      color: 'var(--accent-mint)',
      icon: <Activity size={14} />,
    },
    {
      label: 'TOTAL EVENTS',
      value: totalEvents,
      color: 'var(--accent-cyan)',
      icon: <Activity size={14} />,
    },
    {
      label: 'BLOCKED OPS',
      value: totalBlocked,
      color: 'var(--event-blocked)',
      icon: <AlertTriangle size={14} />,
    },
    {
      label: 'ALLOWED OPS',
      value: totalAllowed,
      color: 'var(--event-allowed)',
      icon: <CheckCircle size={14} />,
    },
  ];

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100vh' }}>
      {/* Header */}
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
          DIAMOND · OVERVIEW
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Security Overview
        </h1>
      </div>

      <div style={{ height: 1, background: 'var(--border-default)', marginBottom: 24 }} />

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 32,
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '16px 18px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
                color: 'var(--text-muted)',
              }}
            >
              {stat.icon}
              <span
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 500,
                }}
              >
                {stat.label}
              </span>
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 300,
                color: stat.color,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Security Events */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Shield size={14} color="var(--event-blocked)" />
          <span
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            RECENT SECURITY EVENTS
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {MOCK_EVENTS.filter((e) => e.severity === 'high' || e.severity === 'critical')
            .slice(0, 6)
            .map((evt) => (
              <div
                key={evt.id}
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-primary)',
                      marginBottom: 3,
                    }}
                  >
                    {evt.type}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {evt.sourceFile || evt.command} · {evt.agentName}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: evt.result === 'denied' ? 'var(--event-blocked)' : 'var(--event-warning)',
                    padding: '3px 8px',
                    border: `1px solid ${evt.result === 'denied' ? 'var(--event-blocked)' : 'var(--event-warning)'}40`,
                    borderRadius: 'var(--radius-pill)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {evt.result}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
