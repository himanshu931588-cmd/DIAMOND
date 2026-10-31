import { useEffect } from 'react';
import { agentEventService } from '@/services/AgentEventService';

/** Starts the selected local source once for the mounted application. */
const TelemetryBootstrap = () => {
  useEffect(() => {
    void agentEventService.initializeTelemetry();
  }, []);

  return null;
};

export default TelemetryBootstrap;
