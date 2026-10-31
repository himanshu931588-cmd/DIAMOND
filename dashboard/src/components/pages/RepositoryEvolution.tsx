import React, { useRef, useEffect, useState, useCallback } from 'react';
import NebulaCanvas from '@/components/nebula/NebulaCanvas';
import NebulaLegend from '@/components/nebula/NebulaLegend';
import Timeline from '@/components/timeline/Timeline';
import EventInspector from '@/components/events/EventInspector';
import SecurityAlert from '@/components/events/SecurityAlert';
import { useEventStore } from '@/store/eventStore';

const RepositoryEvolution: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [alertEvent, setAlertEvent] = useState<null | ReturnType<typeof useEventStore.getState>['currentEvent']>(null);

  const currentEvent = useEventStore((s) => s.currentEvent);

  // Show security alert on critical blocked events
  useEffect(() => {
    if (
      currentEvent &&
      currentEvent.result === 'denied' &&
      (currentEvent.severity === 'critical' || currentEvent.severity === 'high') &&
      currentEvent.visualCategory === 'blocked'
    ) {
      setAlertEvent(currentEvent);
    }
  }, [currentEvent?.id]);

  // Measure canvas area
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Central visualization area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {canvasSize.width > 0 && (
          <NebulaCanvas width={canvasSize.width} height={canvasSize.height} />
        )}
        <NebulaLegend />
        <EventInspector />
      </div>

      <Timeline />

      {/* Security Alert Modal */}
      {alertEvent && (
        <SecurityAlert
          event={alertEvent}
          onClose={() => setAlertEvent(null)}
        />
      )}
    </div>
  );
};

export default RepositoryEvolution;
