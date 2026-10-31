import React from 'react';
import { useUIStore } from '@/store/uiStore';
import { useEventStore } from '@/store/eventStore';
import { RepositoryFile } from '@/types/repository';
import { INITIAL_FILES } from '@/data/mockRepository';
import { MOCK_EVENTS } from '@/data/mockEvents';
import { formatTimestamp } from '@/utils/time';
import { X, FileText, Clock, Activity } from 'lucide-react';
import { reconstructRepositoryState } from '@/utils/eventTransform';

const EventInspector: React.FC = () => {
  const selectedFileId = useUIStore((s) => s.selectedFileId);
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const setSelectedFileId = useUIStore((s) => s.setSelectedFileId);
  const timeMode = useUIStore((s) => s.timeMode);
  const visibleEvents = useEventStore((s) => s.visibleEvents);
  const allEvents = useEventStore((s) => s.allEvents);
  const currentStep = useEventStore((s) => s.currentStep);

  if (!inspectorOpen || !selectedFileId) return null;

  const eventsUpToStep = allEvents.filter((e) => e.stepNumber <= currentStep);
  const { files } = reconstructRepositoryState(eventsUpToStep);
  const file = files.find((f) => f.id === selectedFileId);

  if (!file) return null;

  const fileEvents = allEvents.filter(
    (e) => e.stepNumber <= currentStep && e.affectedFiles.includes(file.path),
  );

  const handleClose = () => {
    setInspectorOpen(false);
    setSelectedFileId(null);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 320,
        height: '100%',
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-default)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        animation: 'fade-in 150ms ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={14} color="var(--accent-mint)" />
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
            }}
          >
            FILE INSPECTOR
          </span>
        </div>
        <button
          onClick={handleClose}
          aria-label="Close inspector"
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

      {/* File Info */}
      <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: 4,
          }}
        >
          {file.name}
        </div>
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
            marginBottom: 16,
            wordBreak: 'break-all',
          }}
        >
          {file.path}
        </div>

        {/* Details */}
        {[
          { label: 'DIRECTORY', value: file.directory },
          { label: 'EXTENSION', value: file.extension || '—' },
          { label: 'STATUS', value: file.status.toUpperCase() },
          { label: 'LAST OP', value: file.lastOperation || '—' },
          {
            label: 'LAST TIME',
            value: file.lastOperationTime
              ? formatTimestamp(file.lastOperationTime, timeMode)
              : '—',
          },
        ].map((row) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            <span
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}

        {/* Event history */}
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 10,
          }}
        >
          <Activity size={12} color="var(--text-muted)" />
          <span
            style={{
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            Event History ({fileEvents.length})
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {fileEvents.map((evt) => (
            <div
              key={evt.id}
              style={{
                padding: '8px 10px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    color:
                      evt.result === 'denied'
                        ? 'var(--event-blocked)'
                        : 'var(--text-primary)',
                  }}
                >
                  {evt.type}
                </span>
                <span
                  style={{
                    fontSize: 8,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                  }}
                >
                  #{evt.stepNumber}
                </span>
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {formatTimestamp(evt.timestamp, timeMode)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventInspector;
