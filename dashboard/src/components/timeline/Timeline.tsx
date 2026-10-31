import React, { useCallback, useRef } from 'react';
import { usePlayback } from '@/hooks/usePlayback';
import { useEventStore } from '@/store/eventStore';
import { useUIStore } from '@/store/uiStore';
import { REPO_NAME, REPO_REVISION, REPO_WINDOW_START, REPO_WINDOW_END } from '@/data/mockRepository';
import { EVENT_COLORS, EVENT_LABELS, VisualEventCategory } from '@/types/events';
import { formatTimestamp, formatDateRange } from '@/utils/time';
import { hexToRgba } from '@/utils/colors';
import { Play, Pause, RotateCcw } from 'lucide-react';

const SPEEDS = [0.5, 1, 2, 4, 8];

const EVENT_CATEGORIES: VisualEventCategory[] = [
  'read', 'write', 'create', 'rename', 'delete', 'commit',
  'warning', 'blocked', 'allowed', 'network', 'process',
];

const Timeline: React.FC = () => {
  const {
    state: playbackState,
    speed,
    progress,
    currentStep,
    currentTimestamp,
    totalSteps,
    setSpeed,
    togglePlayPause,
    restart,
    scrubTo,
  } = usePlayback();

  const trackRef = useRef<HTMLDivElement>(null);
  const filter = useEventStore((s) => s.filter);
  const allEvents = useEventStore((s) => s.allEvents);
  const toggleCategory = useEventStore((s) => s.toggleCategory);
  const timeMode = useUIStore((s) => s.timeMode);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      scrubTo(x);
    },
    [scrubTo],
  );

  const handleTrackDrag = useCallback(
    (e: React.MouseEvent) => {
      if (e.buttons !== 1) return;
      handleTrackClick(e);
    },
    [handleTrackClick],
  );

  const handleTrackKeyDown = useCallback((event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      scrubTo(progress - step);
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      scrubTo(progress + step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      scrubTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      scrubTo(1);
    }
  }, [progress, scrubTo]);

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: '1px solid var(--border-default)',
        background: 'var(--bg-panel)',
        padding: '10px 24px 8px 24px',
      }}
    >
      {/* Main timeline row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Play button */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={togglePlayPause}
            aria-label={playbackState === 'playing' ? 'Pause' : 'Play'}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '1px solid var(--border-active)',
              background: 'transparent',
              color: 'var(--accent-mint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              flexShrink: 0,
            }}
          >
            {playbackState === 'playing' ? (
              <Pause size={14} fill="currentColor" />
            ) : (
              <Play size={14} fill="currentColor" style={{ marginLeft: 2 }} />
            )}
          </button>
          <button
            onClick={restart}
            aria-label="Restart"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid var(--border-default)',
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              alignSelf: 'center',
            }}
          >
            <RotateCcw size={11} />
          </button>
        </div>

        {/* Timeline track */}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          onMouseMove={handleTrackDrag}
          onKeyDown={handleTrackKeyDown}
          tabIndex={0}
          style={{
            flex: 1,
            height: 32,
            position: 'relative',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          role="slider"
          aria-label="Timeline"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          {/* Track background */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 2,
              background: 'var(--border-default)',
              borderRadius: 1,
            }}
          />

          {/* Progress fill */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: `${progress * 100}%`,
              height: 2,
              background: 'var(--accent-mint)',
              borderRadius: 1,
              transition: playbackState === 'playing' ? 'none' : 'width 100ms ease',
            }}
          />

          {/* Event markers */}
          {allEvents.map((evt) => {
            const timestamp = new Date(evt.timestamp).getTime();
            const first = new Date(allEvents[0]?.timestamp ?? evt.timestamp).getTime();
            const last = new Date(allEvents[allEvents.length - 1]?.timestamp ?? evt.timestamp).getTime();
            const pos = last === first ? 0 : ((timestamp - first) / (last - first)) * 100;
            const color = EVENT_COLORS[evt.visualCategory] || '#56636C';
            const isVisible = filter.categories.includes(evt.visualCategory);
            if (!isVisible) return null;

            return (
              <div
                key={evt.id}
                style={{
                  position: 'absolute',
                  left: `${pos}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: evt.severity === 'critical' || evt.severity === 'high' ? 5 : 3,
                  height: evt.severity === 'critical' || evt.severity === 'high' ? 8 : 5,
                  background: color,
                  opacity: evt.stepNumber <= currentStep ? 0.8 : 0.25,
                  borderRadius: 1,
                  pointerEvents: 'none',
                }}
              />
            );
          })}

          {/* Playhead */}
          <div
            style={{
              position: 'absolute',
              left: `${progress * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'var(--accent-mint)',
              border: '2px solid var(--bg-panel)',
              boxShadow: `0 0 8px ${hexToRgba('#72E0BE', 0.4)}`,
              zIndex: 5,
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Speed control */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                padding: '3px 6px',
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                background: speed === s ? 'var(--bg-hover)' : 'transparent',
                color: speed === s ? 'var(--accent-mint)' : 'var(--text-muted)',
                border: speed === s ? '1px solid var(--border-active)' : '1px solid transparent',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Timestamp */}
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
            flexShrink: 0,
            minWidth: 180,
            textAlign: 'right',
          }}
        >
          {formatTimestamp(currentTimestamp, timeMode)}
        </div>
      </div>

      {/* Bottom row: Event legend + metadata */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 8,
        }}
      >
        {/* Event legend */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {EVENT_CATEGORIES.map((cat) => {
            const isActive = filter.categories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: isActive ? 1 : 0.35,
                  transition: 'opacity var(--transition-fast)',
                  padding: 0,
                }}
                aria-label={`Toggle ${EVENT_LABELS[cat]} events`}
              >
                <div
                  style={{
                    width: 12,
                    height: 2,
                    background: EVENT_COLORS[cat],
                    borderRadius: 1,
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {EVENT_LABELS[cat]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer metadata */}
        <div
          style={{
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}
        >
          repository: {REPO_NAME} · revision: {REPO_REVISION} · window:{' '}
          {formatDateRange(REPO_WINDOW_START, REPO_WINDOW_END)} · generator: diamond
        </div>
      </div>
    </div>
  );
};

export default Timeline;
