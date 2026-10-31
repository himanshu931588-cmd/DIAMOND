import React from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore, TimeMode } from '@/store/uiStore';
import { useEventStore } from '@/store/eventStore';
import { formatTimestamp } from '@/utils/time';

const TIME_MODES: { value: TimeMode; label: string }[] = [
  { value: 'agent', label: 'AGENT' },
  { value: 'local', label: 'LOCAL' },
  { value: 'utc', label: 'UTC' },
];

const AppHeader: React.FC = () => {
  const timeMode = useUIStore((s) => s.timeMode);
  const setTimeMode = useUIStore((s) => s.setTimeMode);
  const currentEvent = useEventStore((s) => s.currentEvent);
  const { pathname } = useLocation();
  const page = pathname.startsWith('/repository')
    ? { section: 'REPOSITORY EVOLUTION', title: 'Repository Evolution', description: 'Files are stars. Root entries define color; paths define attraction.' }
    : pathname.startsWith('/sessions/')
      ? { section: 'AGENT SESSIONS', title: 'Session Detail', description: 'Observed session activity and security posture.' }
      : pathname.startsWith('/sessions')
        ? { section: 'AGENT SESSIONS', title: 'Agent Sessions', description: 'Observed agent runs and their current security posture.' }
        : pathname.startsWith('/processes')
          ? { section: 'PROCESS TREE', title: 'Process Hierarchy', description: 'Parent-child process relationships observed for the selected session.' }
          : pathname.startsWith('/intent')
            ? { section: 'INTENT & PERMISSIONS', title: 'Intent Compiler', description: 'Intent interpretation and policy-derived permissions.' }
            : { section: 'OVERVIEW', title: 'Security Overview', description: 'Current telemetry, sessions, and security decisions.' };

  return (
    <header
      style={{
        padding: '16px 24px 0 24px',
        flexShrink: 0,
      }}
    >
      {/* Top row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        {/* Left: Title */}
        <div>
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
            DIAMOND · {page.section}
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 300,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {page.title}
          </h1>
          <p
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              marginTop: 4,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {page.description}
          </p>
        </div>

        {/* Right: Time mode switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-pill)',
            padding: 2,
            gap: 0,
          }}
        >
          {TIME_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setTimeMode(mode.value)}
              style={{
                padding: '4px 10px',
                fontSize: 9,
                fontWeight: 500,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.06em',
                background:
                  timeMode === mode.value ? 'var(--bg-hover)' : 'transparent',
                color:
                  timeMode === mode.value
                    ? 'var(--accent-mint)'
                    : 'var(--text-muted)',
                border:
                  timeMode === mode.value
                    ? '1px solid var(--border-active)'
                    : '1px solid transparent',
                borderRadius: 'var(--radius-pill)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: 'var(--border-default)',
          marginTop: 12,
        }}
      />

      {/* Event info panel */}
      <div
        style={{
          margin: '10px 0 0 0',
          padding: '8px 12px',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-panel)',
          maxWidth: 560,
        }}
      >
        {currentEvent ? (
          <>
            <div
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                marginBottom: 2,
              }}
            >
              <span style={{ color: 'var(--accent-cyan)' }}>
                {currentEvent.agentName.toLowerCase()}
              </span>
              <span style={{ color: 'var(--text-muted)' }}> · </span>
              <span>{currentEvent.command || currentEvent.type.toLowerCase()}</span>
              <span style={{ color: 'var(--text-muted)' }}> · </span>
              <span
                style={{
                  color:
                    currentEvent.result === 'denied'
                      ? 'var(--event-blocked)'
                      : 'var(--event-allowed)',
                }}
              >
                {currentEvent.enforcement.replace(/_/g, ' ')}
              </span>
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                marginBottom: 2,
              }}
            >
              {currentEvent.sourceFile || 'no repository file effect'}
            </div>
            <div
              style={{
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
              }}
            >
              {formatTimestamp(currentEvent.timestamp, timeMode)} · step{' '}
              {currentEvent.stepNumber}/{currentEvent.totalSteps} ·{' '}
              {currentEvent.affectedFiles.length} files
            </div>
          </>
        ) : (
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
            }}
          >
            Waiting for agent events...
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
