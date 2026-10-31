import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import TelemetryBootstrap from '@/components/telemetry/TelemetryBootstrap';
import { AppRoutes } from './routes';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <TelemetryBootstrap />
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
