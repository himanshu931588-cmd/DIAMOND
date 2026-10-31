import { Server, Socket } from 'socket.io';
import { AgentState, AlertPayload, AllowList, AuditEntry } from '../types';

let ioInstance: Server | null = null;
let currentAgentState: AgentState = 'IDLE';
let currentAgentId: string = 'agent-alpha';

interface PendingRequest {
  requestId: string;
  resolve: (allow: boolean) => void;
  timer: NodeJS.Timeout;
}

const pendingRequests = new Map<string, PendingRequest>();

export function initSocketIO(io: Server): void {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Immediately send current state upon connection
    socket.emit('agent:state', { state: currentAgentState, agentId: currentAgentId });

    socket.on('user:verdict', (data: { requestId: string; allow: boolean }) => {
      console.log(`[Socket.IO] Received user verdict for request ${data.requestId}: allow=${data.allow}`);
      const pending = pendingRequests.get(data.requestId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingRequests.delete(data.requestId);
        pending.resolve(data.allow);
      } else {
        console.warn(`[Socket.IO] No pending request found for ID: ${data.requestId}`);
      }
    });

    socket.on('agent:reset', () => {
      console.log(`[Socket.IO] Received agent reset signal`);
      setAgentState('IDLE');
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
}

export function registerPendingRequest(
  requestId: string,
  timeoutMs: number = 60000
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      console.warn(`[Socket.IO] Request ${requestId} timed out waiting for human verdict. Defaulting to DENY.`);
      pendingRequests.delete(requestId);
      resolve(false);
    }, timeoutMs);

    pendingRequests.set(requestId, {
      requestId,
      resolve,
      timer
    });
  });
}

export function emitAlert(payload: AlertPayload): void {
  if (ioInstance) {
    ioInstance.emit('alert:new', payload);
  }
}

export function setAgentState(state: AgentState, agentId?: string): void {
  currentAgentState = state;
  if (agentId) {
    currentAgentId = agentId;
  }
  if (ioInstance) {
    ioInstance.emit('agent:state', { state: currentAgentState, agentId: currentAgentId });
  }
}

export function getAgentState(): { state: AgentState; agentId: string } {
  return { state: currentAgentState, agentId: currentAgentId };
}

export function emitAuditEntry(entry: AuditEntry): void {
  if (ioInstance) {
    ioInstance.emit('audit:entry', entry);
  }
}

export function emitAllowList(allowList: AllowList): void {
  if (ioInstance) {
    ioInstance.emit('allowlist:updated', allowList);
  }
}
