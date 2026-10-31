import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import ConnectionStatus from '@/components/telemetry/ConnectionStatus';
import AppHeader from './AppHeader';

const MainLayout: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg-main)',
      }}
    >
      <Navigation />
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: '100vh',
        }}
      >
        <div style={{ position: 'absolute', top: 14, right: 24, zIndex: 40 }}><ConnectionStatus /></div>
        <AppHeader />
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><Outlet /></div>
      </main>
    </div>
  );
};

export default MainLayout;
