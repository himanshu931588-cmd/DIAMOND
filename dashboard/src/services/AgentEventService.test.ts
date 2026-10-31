import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentEventService } from '@/services/AgentEventService';
import { useEventStore } from '@/store/eventStore';
import { useTelemetryStore } from '@/store/telemetryStore';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static failConstruction = false;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  readonly url: string;
  closed = false;

  constructor(url: string) {
    if (MockWebSocket.failConstruction) throw new Error('connection unavailable');
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  open() { this.onopen?.(); }
  fail() { this.onerror?.(); }
  close() { this.closed = true; this.onclose?.(); }
  message(payload: unknown) { this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent); }
}

const options = { url: 'ws://supervisor.test/telemetry', reconnectBaseMs: 100, maxReconnectDelayMs: 400, staleAfterMs: 1_000 };

function validEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'socket-event', sessionId: 'session-ws', timestamp: '2026-01-01T00:00:00.000Z',
    type: 'PROCESS_START', agentName: 'Supervisor Agent', processId: 42, parentProcessId: 1,
    description: 'Process observed.', affectedFiles: [],
    ...overrides,
  };
}

describe('AgentEventService WebSocket transport', () => {
  let service: AgentEventService;

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    MockWebSocket.failConstruction = false;
    vi.stubGlobal('WebSocket', MockWebSocket);
    useEventStore.getState().resetEvents();
    useTelemetryStore.setState({ connectionState: 'disconnected', sourceMode: 'mock', lastReceivedAt: null, lastError: null });
    service = new AgentEventService('/api', false);
  });

  afterEach(() => {
    service.disconnectWebSocket();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('moves from connecting to connected after the socket opens', () => {
    service.connectWebSocket(options);
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(useTelemetryStore.getState().connectionState).toBe('connecting');

    MockWebSocket.instances[0].open();
    expect(useTelemetryStore.getState().connectionState).toBe('connected');
    expect(useTelemetryStore.getState().sourceMode).toBe('websocket');
  });

  it('records an error and reconnects once after an unexpected close', () => {
    service.connectWebSocket(options);
    MockWebSocket.instances[0].open();
    MockWebSocket.instances[0].fail();
    expect(useTelemetryStore.getState().connectionState).toBe('error');
    expect(useTelemetryStore.getState().lastError).toContain('reported an error');

    MockWebSocket.instances[0].close();
    expect(useTelemetryStore.getState().connectionState).toBe('reconnecting');
    vi.advanceTimersByTime(99);
    expect(MockWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it('does not start retry loops for repeated errors until the socket closes', () => {
    service.connectWebSocket(options);
    const socket = MockWebSocket.instances[0];
    socket.fail();
    socket.fail();
    vi.advanceTimersByTime(1_000);
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(useTelemetryStore.getState().connectionState).toBe('error');

    socket.close();
    vi.advanceTimersByTime(100);
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it('retries a connection that cannot be created and recovers when creation succeeds', () => {
    MockWebSocket.failConstruction = true;
    service.connectWebSocket(options);
    expect(useTelemetryStore.getState().connectionState).toBe('reconnecting');
    expect(useTelemetryStore.getState().lastError).toContain('could not be created');

    MockWebSocket.failConstruction = false;
    vi.advanceTimersByTime(100);
    expect(MockWebSocket.instances).toHaveLength(1);
    MockWebSocket.instances[0].open();
    expect(useTelemetryStore.getState().connectionState).toBe('connected');
  });

  it('uses capped exponential reconnect delays and resets backoff after recovery', () => {
    service.connectWebSocket(options);
    MockWebSocket.instances[0].close();
    vi.advanceTimersByTime(100);
    MockWebSocket.instances[1].close();
    vi.advanceTimersByTime(199);
    expect(MockWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(3);
    MockWebSocket.instances[2].close();
    vi.advanceTimersByTime(400);
    expect(MockWebSocket.instances).toHaveLength(4);

    MockWebSocket.instances[3].open();
    MockWebSocket.instances[3].close();
    vi.advanceTimersByTime(99);
    expect(MockWebSocket.instances).toHaveLength(4);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(5);
  });

  it('does not schedule reconnects after manual disconnect', () => {
    service.connectWebSocket(options);
    MockWebSocket.instances[0].close();
    service.disconnectWebSocket();
    vi.advanceTimersByTime(5_000);
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(useTelemetryStore.getState().connectionState).toBe('disconnected');
  });

  it('cancels a pending retry and starts a new manual connection without old backoff', () => {
    service.connectWebSocket(options);
    MockWebSocket.instances[0].close();
    service.disconnectWebSocket();
    service.connectWebSocket(options);
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(useTelemetryStore.getState().connectionState).toBe('connecting');
  });

  it('shares one transport between consumers and closes only after the final release', () => {
    const releaseFirst = service.subscribeWebSocket(options);
    const releaseSecond = service.subscribeWebSocket(options);
    expect(MockWebSocket.instances).toHaveLength(1);
    releaseFirst();
    expect(MockWebSocket.instances[0].closed).toBe(false);
    releaseSecond();
    expect(MockWebSocket.instances[0].closed).toBe(true);
    vi.advanceTimersByTime(1_000);
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('marks a quiet open connection stale and restores connected after valid telemetry', () => {
    service.connectWebSocket(options);
    MockWebSocket.instances[0].open();
    vi.advanceTimersByTime(1_001);
    expect(useTelemetryStore.getState().connectionState).toBe('stale');

    MockWebSocket.instances[0].message(validEvent());
    expect(useTelemetryStore.getState().connectionState).toBe('connected');
    expect(useEventStore.getState().allEvents).toHaveLength(1);
  });

  it('does not count unsupported heartbeat control frames as fresh telemetry', () => {
    service.connectWebSocket(options);
    MockWebSocket.instances[0].open();
    MockWebSocket.instances[0].message({ type: 'heartbeat' });
    expect(useEventStore.getState().ingestionErrors).toHaveLength(1);
    vi.advanceTimersByTime(1_000);
    expect(useTelemetryStore.getState().connectionState).toBe('stale');
  });

  it('keeps malformed messages isolated and retains unknown and duplicate events safely', () => {
    service.connectWebSocket(options);
    MockWebSocket.instances[0].open();
    MockWebSocket.instances[0].message('{not-json');
    expect(useEventStore.getState().ingestionErrors).toHaveLength(1);
    expect(useTelemetryStore.getState().connectionState).toBe('connected');

    MockWebSocket.instances[0].message(validEvent({ id: 'unknown', type: 'FUTURE_OPERATION' }));
    MockWebSocket.instances[0].message(validEvent({ id: 'unknown', type: 'FUTURE_OPERATION' }));
    expect(useEventStore.getState().allEvents).toHaveLength(1);
    expect(useEventStore.getState().allEvents[0].type).toBe('UNKNOWN_EVENT');
  });

  it('ignores closure from a superseded socket rather than creating another reconnect loop', () => {
    service.connectWebSocket(options);
    const first = MockWebSocket.instances[0];
    service.connectWebSocket({ ...options, url: 'ws://replacement.test/telemetry' });
    expect(MockWebSocket.instances).toHaveLength(2);
    first.close();
    vi.advanceTimersByTime(1_000);
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it('removes callbacks on disposal so late socket events cannot ingest or reconnect', () => {
    service.connectWebSocket(options);
    const socket = MockWebSocket.instances[0];
    socket.open();
    service.disconnectWebSocket();
    socket.message(validEvent());
    socket.close();
    vi.advanceTimersByTime(1_000);

    expect(useEventStore.getState().allEvents).toHaveLength(0);
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(useTelemetryStore.getState().connectionState).toBe('disconnected');
  });
});
