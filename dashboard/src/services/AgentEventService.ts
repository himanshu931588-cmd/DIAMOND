// ============================================
// DIAMOND Agent Event Service — API Abstraction
// ============================================
//
// This service provides a unified interface for fetching agent sessions,
// events, and sending approval/denial decisions.
//
// Currently backed by mock data. Designed to be replaced with real
// REST + WebSocket backend integration.
//
// Proposed API contracts:
// REST:
//   GET  /api/sessions
//   GET  /api/sessions/:id
//   GET  /api/sessions/:id/events
//   GET  /api/sessions/:id/repository
//   GET  /api/sessions/:id/processes
// Live:
//   WebSocket or Server-Sent Events for real-time event streaming
// Approval:
//   POST /api/events/:id/decision

import { DiamondEvent } from '@/types/events';
import { AgentSession } from '@/types/sessions';
import { MOCK_EVENTS } from '@/data/mockEvents';
import { MOCK_SESSIONS } from '@/data/mockSessions';
import { z } from 'zod';
import { telemetryIngestor } from '@/services/TelemetryIngestor';
import { useEventStore } from '@/store/eventStore';
import { useSessionStore } from '@/store/sessionStore';
import { useTelemetryStore } from '@/store/telemetryStore';
import type { TelemetrySourceMode } from '@/types/telemetry';

export interface WebSocketTelemetryOptions {
  url: string;
  reconnectBaseMs?: number;
  maxReconnectDelayMs?: number;
  staleAfterMs?: number;
}

const eventSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  timestamp: z.string().datetime(),
  type: z.enum([
    'FILE_READ', 'FILE_WRITE', 'FILE_CREATE', 'FILE_DELETE', 'FILE_RENAME',
    'PROCESS_START', 'PROCESS_EXIT', 'PROCESS_SPAWN', 'COMMAND_EXECUTION',
    'NETWORK_CONNECT', 'NETWORK_SEND', 'NETWORK_BLOCK', 'DNS_LOOKUP',
    'POLICY_ALLOW', 'POLICY_DENY', 'SENSITIVE_FILE_ACCESS', 'SUSPICIOUS_DATA_FLOW',
    'AGENT_BLOCKED', 'USER_APPROVAL_REQUIRED',
  ]),
  processId: z.number().int().nonnegative(),
  parentProcessId: z.number().int().nonnegative(),
  agentName: z.string().min(1),
  command: z.string().optional(),
  sourceFile: z.string().optional(),
  targetFile: z.string().optional(),
  networkDestination: z.string().optional(),
  result: z.enum(['ok', 'denied', 'error', 'pending']),
  severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),
  description: z.string(),
  policyDecision: z.enum(['allowed', 'denied', 'pending', 'user_review']).optional(),
  triggeredPolicy: z.string().optional(),
  affectedFiles: z.array(z.string()),
  stepNumber: z.number().int().nonnegative(),
  totalSteps: z.number().int().nonnegative(),
  visualCategory: z.enum([
    'read', 'write', 'create', 'rename', 'delete', 'commit', 'warning',
    'blocked', 'allowed', 'network', 'process',
  ]),
});

const permissionSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  category: z.enum(['filesystem', 'network', 'process', 'data']),
  scope: z.string().optional(),
});

const sessionSchema = z.object({
  id: z.string().min(1),
  agentName: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  status: z.enum(['active', 'completed', 'terminated', 'paused']),
  processCount: z.number().int().nonnegative(),
  eventCount: z.number().int().nonnegative(),
  securityStatus: z.enum(['clean', 'warning', 'alert', 'critical']),
  repositoryName: z.string(),
  repositoryRevision: z.string(),
  userIntent: z.string(),
  permissions: z.object({
    allowed: z.array(permissionSchema),
    restricted: z.array(permissionSchema),
  }),
  blockedCount: z.number().int().nonnegative(),
  allowedCount: z.number().int().nonnegative(),
});

const decisionResponseSchema = z.object({
  success: z.boolean(),
  simulated: z.boolean(),
});

export class AgentEventService {
  private baseUrl: string;
  private useMock: boolean;
  private bootstrapPromise: Promise<void> | null = null;
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private staleTimer: ReturnType<typeof setInterval> | null = null;
  private websocketOptions: WebSocketTelemetryOptions | null = null;
  private reconnectAttempts = 0;
  private stopped = false;
  private connectedAt: number | null = null;
  private lastWebSocketActivityAt: number | null = null;
  private websocketConsumers = 0;

  constructor(baseUrl: string = '/api', useMock: boolean = true) {
    this.baseUrl = baseUrl;
    this.useMock = useMock;
  }

  /** True only when the service is serving demonstration fixtures. */
  get isMockMode(): boolean {
    return this.useMock;
  }

  /**
   * The demo source deliberately uses the identical normalization and store
   * ingestion boundary as an eventual supervisor source.
   */
  async initializeTelemetry(source: TelemetrySourceMode = this.useMock ? 'mock' : 'rest'): Promise<void> {
    if (this.bootstrapPromise) return this.bootstrapPromise;
    this.bootstrapPromise = this.loadInitialTelemetry(source).finally(() => {
      this.bootstrapPromise = null;
    });
    return this.bootstrapPromise;
  }

  private async loadInitialTelemetry(source: TelemetrySourceMode): Promise<void> {
    const telemetry = useTelemetryStore.getState();
    telemetry.setConnection('connecting', source);
    try {
      const sessions = await this.getSessions();
      const eventGroups = await Promise.all(sessions.map((session) => this.getSessionEvents(session.id)));
      useSessionStore.getState().setSessions(sessions);
      useEventStore.getState().resetEvents();
      telemetryIngestor.ingest(eventGroups.flat(), {
        provenance: source === 'mock' ? 'simulated' : 'supervisor_observed',
        defaultEnforcement: source === 'mock' ? 'simulated' : 'observed',
      });
      telemetry.setConnection('connected', source);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to initialize telemetry.';
      telemetry.setError(message);
      throw error;
    }
  }

  /**
   * Opt-in wire protocol: either one event object, or `{ type: "events",
   * events: unknown[] }`. No socket is opened unless a caller supplies a URL.
   */
  connectWebSocket(options: WebSocketTelemetryOptions): void {
    if (this.socket && this.websocketOptions?.url === options.url) return;
    this.disconnectWebSocket();
    this.websocketOptions = options;
    this.stopped = false;
    this.openWebSocket();
  }

  /** Reference-counted option for UI consumers sharing the singleton transport. */
  subscribeWebSocket(options: WebSocketTelemetryOptions): () => void {
    this.websocketConsumers += 1;
    this.connectWebSocket(options);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.websocketConsumers = Math.max(0, this.websocketConsumers - 1);
      if (this.websocketConsumers === 0) this.disconnectWebSocket();
    };
  }

  disconnectWebSocket(): void {
    this.stopped = true;
    if (this.reconnectTimer !== null) globalThis.clearTimeout(this.reconnectTimer);
    if (this.staleTimer !== null) globalThis.clearInterval(this.staleTimer);
    this.reconnectTimer = null;
    this.staleTimer = null;
    this.connectedAt = null;
    this.lastWebSocketActivityAt = null;
    this.reconnectAttempts = 0;
    const socket = this.socket;
    this.socket = null;
    // Detach callbacks before closing so a late browser event cannot ingest
    // telemetry or create a reconnect loop after this transport is disposed.
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
    }
    useTelemetryStore.getState().setConnection('disconnected', 'websocket');
  }

  private openWebSocket(): void {
    const options = this.websocketOptions;
    if (!options || typeof WebSocket === 'undefined') {
      useTelemetryStore.getState().setError('WebSocket transport is unavailable in this environment.');
      return;
    }
    useTelemetryStore.getState().setConnection(this.reconnectAttempts ? 'reconnecting' : 'connecting', 'websocket');
    let socket: WebSocket;
    try {
      socket = new WebSocket(options.url);
    } catch {
      useTelemetryStore.getState().setError('WebSocket telemetry transport could not be created.');
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket || this.stopped) return;
      this.reconnectAttempts = 0;
      this.connectedAt = Date.now();
      this.lastWebSocketActivityAt = this.connectedAt;
      useTelemetryStore.getState().setConnection('connected', 'websocket');
      this.startStaleTimer(options.staleAfterMs ?? 30_000);
    };
    socket.onmessage = (message) => {
      if (this.socket !== socket || this.stopped) return;
      this.handleWebSocketMessage(message.data);
    };
    socket.onerror = () => useTelemetryStore.getState().setError('WebSocket telemetry transport reported an error.');
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.connectedAt = null;
      this.lastWebSocketActivityAt = null;
      if (this.staleTimer !== null) globalThis.clearInterval(this.staleTimer);
      this.staleTimer = null;
      if (!this.stopped) this.scheduleReconnect();
    };
  }

  private handleWebSocketMessage(data: unknown): void {
    try {
      const decoded = typeof data === 'string' ? JSON.parse(data) : data;
      const envelope = z.object({ type: z.string().optional(), events: z.array(z.unknown()).optional() }).passthrough().parse(decoded);
      const payloads = envelope.events ?? [decoded];
      const result = telemetryIngestor.ingest(payloads, {
        provenance: 'supervisor_observed',
        defaultEnforcement: 'observed',
      });
      if (result.rejected > 0) useTelemetryStore.getState().setError('One or more telemetry messages were rejected.');
      if (result.accepted + result.duplicates > 0) {
        const now = new Date().toISOString();
        this.lastWebSocketActivityAt = Date.now();
        useTelemetryStore.getState().markReceived(now);
        useTelemetryStore.getState().setConnection('connected', 'websocket');
      }
    } catch {
      useEventStore.getState().recordIngestionError('Rejected WebSocket message: invalid JSON or protocol envelope.');
    }
  }

  private scheduleReconnect(): void {
    const options = this.websocketOptions;
    if (!options || this.stopped || this.reconnectTimer !== null) return;
    const base = options.reconnectBaseMs ?? 1_000;
    const maximum = options.maxReconnectDelayMs ?? 30_000;
    const delay = Math.min(maximum, base * 2 ** this.reconnectAttempts);
    this.reconnectAttempts += 1;
    useTelemetryStore.getState().setConnection('reconnecting', 'websocket');
    this.reconnectTimer = globalThis.setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.stopped && this.socket === null) this.openWebSocket();
    }, delay);
  }

  private startStaleTimer(staleAfterMs: number): void {
    if (this.staleTimer !== null) globalThis.clearInterval(this.staleTimer);
    this.staleTimer = globalThis.setInterval(() => {
      // The current wire protocol defines activity as a successfully parsed
      // telemetry event. It has no separate heartbeat control frame.
      const lastActivity = this.lastWebSocketActivityAt ?? this.connectedAt;
      if (lastActivity !== null && Date.now() - lastActivity >= staleAfterMs) {
        useTelemetryStore.getState().setConnection('stale', 'websocket');
      }
    }, Math.min(staleAfterMs, 5_000));
  }

  private async request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      throw new Error(`DIAMOND supervisor request failed (${response.status} ${response.statusText}).`);
    }
    return schema.parse(await response.json());
  }

  async getSessions(): Promise<AgentSession[]> {
    if (this.useMock) return MOCK_SESSIONS;
    return this.request('/sessions', z.array(sessionSchema));
  }

  async getSession(id: string): Promise<AgentSession | undefined> {
    if (this.useMock) return MOCK_SESSIONS.find((s) => s.id === id);
    const response = await fetch(`${this.baseUrl}/sessions/${encodeURIComponent(id)}`);
    if (response.status === 404) return undefined;
    if (!response.ok) {
      throw new Error(`DIAMOND supervisor request failed (${response.status} ${response.statusText}).`);
    }
    return sessionSchema.parse(await response.json());
  }

  async getSessionEvents(sessionId: string): Promise<DiamondEvent[]> {
    if (this.useMock) return MOCK_EVENTS.filter((e) => e.sessionId === sessionId);
    return this.request(
      `/sessions/${encodeURIComponent(sessionId)}/events`,
      z.array(eventSchema),
    );
  }

  async sendDecision(
    eventId: string,
    decision: 'allow' | 'deny' | 'terminate',
  ): Promise<{ success: boolean; simulated: boolean }> {
    if (this.useMock) {
      // Simulate decision — clearly marked as simulated
      console.log(`[DIAMOND DEMO] Simulated decision: ${decision} for event ${eventId}`);
      return { success: true, simulated: true };
    }
    return this.request(`/events/${encodeURIComponent(eventId)}/decision`, decisionResponseSchema, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
  }
}

// Singleton instance
export const agentEventService = new AgentEventService();
