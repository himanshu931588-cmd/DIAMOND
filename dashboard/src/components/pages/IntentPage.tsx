import React from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { Shield, Check, X, Eye, MessageSquare } from 'lucide-react';

const IntentPage: React.FC = () => {
  const activeSession = useSessionStore((s) => s.activeSession);

  if (!activeSession) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)' }}>
        No active session selected.
      </div>
    );
  }

  const { permissions, userIntent } = activeSession;

  // Simulated observed actions
  const observedActions = [
    { description: 'Read project source files', permitted: true },
    { description: 'Created new components in src/components/', permitted: true },
    { description: 'Modified existing CSS files', permitted: true },
    { description: 'Executed npm test and npm build', permitted: true },
    { description: 'Read user personal image from /home/user/photos/', permitted: true },
    { description: 'Attempted to read .env file with API keys', permitted: false },
    { description: 'Attempted to upload image to external host', permitted: false },
    { description: 'Created local HTML gallery instead', permitted: true },
  ];

  // Simulated security decisions
  const securityDecisions = [
    {
      event: 'Read .env file',
      decision: 'DENIED',
      policy: 'sensitive-file-protection',
      reason: 'Environment files containing secrets are protected from agent access.',
    },
    {
      event: 'Upload image to example-image-host.com',
      decision: 'DENIED',
      policy: 'outbound-data-protection',
      reason: 'User intent specifies local-only display. External uploads are not permitted.',
    },
  ];

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
          DIAMOND · INTENT & PERMISSIONS
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Intent Compiler
        </h1>
        <p
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginTop: 4,
          }}
        >
          Intent interpretation is based on natural language analysis. Results may not be exhaustive.
        </p>
      </div>

      <div style={{ height: 1, background: 'var(--border-default)', marginBottom: 24 }} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          maxWidth: 960,
        }}
      >
        {/* 1. Original User Intent */}
        <div
          style={{
            padding: 18,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 14,
            }}
          >
            <MessageSquare size={14} color="var(--accent-cyan)" />
            <span
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              1. ORIGINAL USER INTENT
            </span>
          </div>
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-default)',
              fontSize: 13,
              color: 'var(--text-primary)',
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}
          >
            "{userIntent}"
          </div>
        </div>

        {/* 2. Generated Permissions */}
        <div
          style={{
            padding: 18,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 14,
            }}
          >
            <Shield size={14} color="var(--accent-mint)" />
            <span
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              2. GENERATED PERMISSIONS
            </span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--event-allowed)',
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              ALLOWED
            </div>
            {permissions.allowed.map((perm) => (
              <div
                key={perm.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '5px 0',
                  borderBottom: '1px solid var(--border-default)',
                }}
              >
                <Check size={11} color="var(--event-allowed)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {perm.description}
                  </div>
                  {perm.scope && (
                    <div
                      style={{
                        fontSize: 9,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)',
                        marginTop: 2,
                      }}
                    >
                      {perm.scope}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--event-blocked)',
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              RESTRICTED
            </div>
            {permissions.restricted.map((perm) => (
              <div
                key={perm.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '5px 0',
                  borderBottom: '1px solid var(--border-default)',
                }}
              >
                <X size={11} color="var(--event-blocked)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {perm.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Observed Agent Actions */}
        <div
          style={{
            padding: 18,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 14,
            }}
          >
            <Eye size={14} color="var(--accent-cyan)" />
            <span
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              3. OBSERVED AGENT ACTIONS
            </span>
          </div>

          {observedActions.map((action, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '5px 0',
                borderBottom: '1px solid var(--border-default)',
              }}
            >
              {action.permitted ? (
                <Check size={11} color="var(--event-allowed)" style={{ marginTop: 2, flexShrink: 0 }} />
              ) : (
                <X size={11} color="var(--event-blocked)" style={{ marginTop: 2, flexShrink: 0 }} />
              )}
              <div
                style={{
                  fontSize: 11,
                  color: action.permitted ? 'var(--text-secondary)' : 'var(--event-blocked)',
                }}
              >
                {action.description}
              </div>
            </div>
          ))}
        </div>

        {/* 4. Security Decisions */}
        <div
          style={{
            padding: 18,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 14,
            }}
          >
            <Shield size={14} color="var(--event-blocked)" />
            <span
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              4. SECURITY DECISIONS
            </span>
          </div>

          {securityDecisions.map((decision, i) => (
            <div
              key={i}
              style={{
                padding: '10px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-primary)',
                  }}
                >
                  {decision.event}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: 'var(--event-blocked)',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 8px',
                    border: '1px solid rgba(240, 108, 118, 0.3)',
                    borderRadius: 'var(--radius-pill)',
                  }}
                >
                  {decision.decision}
                </span>
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-cyan)',
                  marginBottom: 4,
                }}
              >
                Policy: {decision.policy}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}
              >
                {decision.reason}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IntentPage;
