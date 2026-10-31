import React from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '@/app/routePaths';
import {
  GitBranch,
  LayoutDashboard,
  Users,
  Network,
  Shield,
  Diamond,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: ROUTES.overview, label: 'OVERVIEW', icon: <LayoutDashboard size={16} />, end: true },
  { to: ROUTES.repository, label: 'REPOSITORY EVOLUTION', icon: <GitBranch size={16} />, end: true },
  { to: ROUTES.sessions, label: 'SESSIONS', icon: <Users size={16} /> },
  { to: ROUTES.processes, label: 'PROCESS TREE', icon: <Network size={16} />, end: true },
  { to: ROUTES.intent, label: 'INTENT & PERMISSIONS', icon: <Shield size={16} />, end: true },
];

const Navigation: React.FC = () => {
  return (
    <nav
      style={{
        width: 56,
        minHeight: '100vh',
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 12,
        gap: 2,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          color: 'var(--accent-mint)',
        }}
        title="DIAMOND"
      >
        <Diamond size={20} />
      </div>

      {/* Divider */}
      <div
        style={{
          width: 24,
          height: 1,
          background: 'var(--border-default)',
          marginBottom: 12,
        }}
      />

      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
        return (
          <NavLink key={item.to} to={item.to} end={item.end} title={item.label} aria-label={`Navigate to ${item.label}`}>
            {({ isActive }) => (
              <span
                style={{
                  width: 40, height: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                  border: isActive ? '1px solid var(--border-active)' : '1px solid transparent', borderRadius: 'var(--radius-md)',
                  color: isActive ? 'var(--accent-mint)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all var(--transition-fast)', padding: 0,
                }}
              >
                {item.icon}
                <span style={{ fontSize: 7, fontWeight: 500, letterSpacing: '0.06em', fontFamily: 'var(--font-primary)' }}>{item.label}</span>
              </span>
            )}
          </NavLink>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Demo badge */}
      <div
        style={{
          width: 40,
          padding: '4px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent-mint)',
            boxShadow: '0 0 6px rgba(114, 224, 190, 0.4)',
          }}
        />
        <span
          style={{
            fontSize: 7,
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
          }}
        >
          DEMO
        </span>
      </div>
    </nav>
  );
};

export default Navigation;
