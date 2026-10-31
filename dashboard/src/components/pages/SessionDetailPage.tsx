import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Activity, Shield, Network } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { useEventStore } from '@/store/eventStore';
import { useUIStore } from '@/store/uiStore';
import { formatTimestamp } from '@/utils/time';

const sessionDuration = (start: string, end?: string) => {
  const milliseconds = Math.max(0, (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime());
  const minutes = Math.floor(milliseconds / 60_000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

const cardStyle: React.CSSProperties = {
  padding: 16, background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
};

const SessionDetailPage: React.FC = () => {
  const { sessionId = '' } = useParams();
  const location = useLocation();
  const session = useSessionStore((state) => state.sessions.find((item) => item.id === sessionId));
  const events = useEventStore((state) => state.allEvents);
  const timeMode = useUIStore((state) => state.timeMode);

  if (!session) {
    return (
      <section style={{ padding: 24, height: '100%' }} aria-labelledby="session-missing-title">
        <Link to={`/sessions${location.search}`} style={{ color: 'var(--accent-mint)', fontSize: 11, fontFamily: 'var(--font-mono)' }}><ArrowLeft size={12} /> BACK TO SESSIONS</Link>
        <div style={{ ...cardStyle, marginTop: 20, maxWidth: 560 }}>
          <div className="uppercase-label">SESSION UNAVAILABLE</div>
          <h1 id="session-missing-title" style={{ fontSize: 24, fontWeight: 300, margin: '8px 0' }}>Session not found</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No session with ID <span className="mono">{sessionId}</span> is available in the current telemetry source.</p>
        </div>
      </section>
    );
  }

  const sessionEvents = events.filter((event) => event.sessionId === session.id);
  const securityEvents = sessionEvents.filter((event) => event.severity === 'high' || event.severity === 'critical' || event.result === 'denied');
  const processes = [...new Map(sessionEvents.map((event) => [event.processId, event])).values()];
  const recentEvents = [...sessionEvents].slice(-6).reverse();

  return (
    <section style={{ padding: 24, overflowY: 'auto', height: '100%' }} aria-labelledby="session-title">
      <Link to={`/sessions${location.search}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--accent-mint)', fontSize: 11, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>
        <ArrowLeft size={12} /> BACK TO SESSIONS
      </Link>
      <div style={{ margin: '16px 0 24px' }}>
        <div className="uppercase-label">DIAMOND · SESSION DETAIL</div>
        <h1 id="session-title" style={{ fontSize: 28, fontWeight: 300, margin: '4px 0', color: 'var(--text-primary)' }}>{session.agentName}</h1>
        <div className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>{session.id} · {session.repositoryName} @ {session.repositoryRevision}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'STATUS', value: session.status }, { label: 'DURATION', value: sessionDuration(session.startTime, session.endTime) },
          { label: 'EVENTS', value: String(session.eventCount) }, { label: 'PROCESSES', value: String(session.processCount) },
          { label: 'RISK', value: session.securityStatus },
        ].map((item) => <div key={item.label} style={cardStyle}><div className="uppercase-label">{item.label}</div><div className="mono" style={{ marginTop: 7, color: 'var(--text-primary)', fontSize: 15 }}>{item.value}</div></div>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(240px, 1fr)', gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}><Activity size={14} color="var(--accent-mint)" /><span className="uppercase-label">RECENT ACTIVITY</span></div>
          {recentEvents.length ? recentEvents.map((event) => <div key={event.id} style={{ padding: '9px 0', borderTop: '1px solid var(--border-default)' }}><div style={{ color: 'var(--text-primary)', fontSize: 12 }}>{event.description}</div><div className="mono" style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{formatTimestamp(event.timestamp, timeMode)} · {event.type}</div></div>) : <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No telemetry event records are available for this session yet.</p>}
        </div>
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div style={cardStyle}><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}><AlertTriangle size={14} color="var(--event-warning)" /><span className="uppercase-label">SECURITY EVENTS</span></div><div className="mono" style={{ fontSize: 20, color: securityEvents.length ? 'var(--event-warning)' : 'var(--accent-mint)' }}>{securityEvents.length}</div><p style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>High-risk, critical, or denied telemetry records.</p></div>
          <div style={cardStyle}><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}><Network size={14} color="var(--accent-cyan)" /><span className="uppercase-label">ASSOCIATED PROCESSES</span></div><div className="mono" style={{ fontSize: 20 }}>{processes.length}</div><p style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>{processes.length ? 'Observed in the current telemetry buffer.' : 'No process-level telemetry is available yet.'}</p></div>
          <div style={cardStyle}><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}><Shield size={14} color="var(--accent-mint)" /><span className="uppercase-label">WORKSPACE</span></div><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{session.repositoryName}</div><div className="mono" style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 3 }}>{session.repositoryRevision}</div></div>
        </div>
      </div>
    </section>
  );
};

export default SessionDetailPage;
