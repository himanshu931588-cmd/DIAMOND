import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const location = useLocation();
  return (
    <section style={{ padding: 24, height: '100%', display: 'grid', placeItems: 'center' }} aria-labelledby="not-found-title">
      <div style={{ maxWidth: 480, padding: 24, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-panel)' }}>
        <div className="uppercase-label">DIAMOND · ROUTE NOT FOUND</div>
        <h1 id="not-found-title" style={{ margin: '8px 0', fontSize: 28, fontWeight: 300 }}>Control surface unavailable</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 18 }}>
          No DIAMOND view exists at <span className="mono">{location.pathname}</span>.
        </p>
        <Link to="/overview" style={{ color: 'var(--accent-mint)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>RETURN TO OVERVIEW</Link>
      </div>
    </section>
  );
};

export default NotFoundPage;

