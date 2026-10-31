// ============================================
// DIAMOND Event Store — Zustand
// ============================================

import { create } from 'zustand';
import { DiamondEvent, EventFilter, NormalizedTelemetryEvent, VisualEventCategory } from '@/types/events';

interface EventState {
  allEvents: NormalizedTelemetryEvent[];
  visibleEvents: NormalizedTelemetryEvent[];
  currentEvent: NormalizedTelemetryEvent | null;
  selectedEvent: NormalizedTelemetryEvent | null;
  currentStep: number;
  filter: EventFilter;
  ingestionErrors: string[];

  setCurrentStep: (step: number) => void;
  setSelectedEvent: (event: NormalizedTelemetryEvent | null) => void;
  ingestEvents: (events: NormalizedTelemetryEvent[]) => { accepted: number; duplicates: number };
  recordIngestionError: (message: string) => void;
  resetEvents: () => void;
  toggleCategory: (category: VisualEventCategory) => void;
  setFilter: (filter: Partial<EventFilter>) => void;
  resetFilter: () => void;
}

function matchesFilter(event: DiamondEvent, filter: EventFilter): boolean {
  const query = filter.searchQuery.trim().toLowerCase();
  const searchable = [
    event.id,
    event.agentName,
    event.command,
    event.sourceFile,
    event.targetFile,
    event.networkDestination,
    event.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    filter.categories.includes(event.visualCategory) &&
    filter.severities.includes(event.severity) &&
    (filter.agents.length === 0 || filter.agents.includes(event.agentName)) &&
    (!query || searchable.includes(query))
  );
}

function filteredEvents<T extends DiamondEvent>(events: T[], step: number, filter: EventFilter): T[] {
  return events.filter((event) => event.stepNumber <= step && matchesFilter(event, filter));
}

function compareEvents(a: NormalizedTelemetryEvent, b: NormalizedTelemetryEvent): number {
  const timeDifference = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  if (timeDifference !== 0) return timeDifference;
  if (a.sessionId === b.sessionId && a.sequenceNumber !== undefined && b.sequenceNumber !== undefined) {
    return a.sequenceNumber - b.sequenceNumber;
  }
  const receivedDifference = new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
  return receivedDifference || a.id.localeCompare(b.id);
}

function insertionIndex(events: NormalizedTelemetryEvent[], event: NormalizedTelemetryEvent): number {
  let low = 0;
  let high = events.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (compareEvents(events[middle], event) <= 0) low = middle + 1;
    else high = middle;
  }
  return low;
}

function withTimelineSteps(events: NormalizedTelemetryEvent[]): NormalizedTelemetryEvent[] {
  const totalSteps = events.length;
  return events.map((event, index) => ({ ...event, stepNumber: index + 1, totalSteps }));
}

const DEFAULT_FILTER: EventFilter = {
  categories: ['read', 'write', 'create', 'rename', 'delete', 'commit', 'warning', 'blocked', 'allowed', 'network', 'process'],
  severities: ['info', 'low', 'medium', 'high', 'critical'],
  agents: [],
  searchQuery: '',
};

export const useEventStore = create<EventState>((set, get) => ({
  allEvents: [],
  visibleEvents: [],
  currentEvent: null,
  selectedEvent: null,
  currentStep: 0,
  filter: { ...DEFAULT_FILTER },
  ingestionErrors: [],

  setCurrentStep: (step: number) => {
    const { allEvents, filter } = get();
    const boundedStep = Math.max(0, Math.min(step, allEvents.length));
    const eventsUpToStep = allEvents.filter((e) => e.stepNumber <= boundedStep);
    const filtered = filteredEvents(allEvents, boundedStep, filter);
    const current = eventsUpToStep.length > 0 ? eventsUpToStep[eventsUpToStep.length - 1] : null;
    set({ currentStep: boundedStep, visibleEvents: filtered, currentEvent: current });
  },

  setSelectedEvent: (event) => set({ selectedEvent: event }),

  ingestEvents: (incoming) => {
    const state = get();
    const knownIds = new Set(state.allEvents.map((event) => event.id));
    const nextEvents = [...state.allEvents];
    let accepted = 0;
    let duplicates = 0;

    for (const event of incoming) {
      if (knownIds.has(event.id)) {
        duplicates += 1;
        continue;
      }
      knownIds.add(event.id);
      nextEvents.splice(insertionIndex(nextEvents, event), 0, event);
      accepted += 1;
    }

    if (accepted === 0) return { accepted, duplicates };
    const allEvents = withTimelineSteps(nextEvents);
    const currentStep = Math.min(state.currentStep, allEvents.length);
    const eventsUpToStep = allEvents.filter((event) => event.stepNumber <= currentStep);
    set({
      allEvents,
      currentStep,
      currentEvent: eventsUpToStep[eventsUpToStep.length - 1] ?? null,
      visibleEvents: filteredEvents(allEvents, currentStep, state.filter),
    });
    return { accepted, duplicates };
  },

  recordIngestionError: (message) => set((state) => ({
    ingestionErrors: [...state.ingestionErrors.slice(-19), message],
  })),

  resetEvents: () => set({
    allEvents: [], visibleEvents: [], currentEvent: null, selectedEvent: null,
    currentStep: 0, ingestionErrors: [],
  }),

  toggleCategory: (category: VisualEventCategory) => {
    const { filter, currentStep } = get();
    const categories = filter.categories.includes(category)
      ? filter.categories.filter((c) => c !== category)
      : [...filter.categories, category];
    const newFilter = { ...filter, categories };
    set({ filter: newFilter });
    // Recompute visible events
    const { allEvents } = get();
    const filtered = filteredEvents(allEvents, currentStep, newFilter);
    set({ visibleEvents: filtered });
  },

  setFilter: (partial) => {
    const { filter, allEvents, currentStep } = get();
    const newFilter = { ...filter, ...partial };
    set({
      filter: newFilter,
      visibleEvents: filteredEvents(allEvents, currentStep, newFilter),
    });
  },

  resetFilter: () => {
    const { allEvents, currentStep } = get();
    const filter = { ...DEFAULT_FILTER };
    set({ filter, visibleEvents: filteredEvents(allEvents, currentStep, filter) });
  },
}));
