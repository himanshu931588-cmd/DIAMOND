// ============================================
// DIAMOND Session Store — Zustand
// ============================================

import { create } from 'zustand';
import { AgentSession } from '@/types/sessions';
import { MOCK_SESSIONS } from '@/data/mockSessions';

interface SessionState {
  sessions: AgentSession[];
  activeSession: AgentSession | null;
  setActiveSession: (session: AgentSession | null) => void;
  setSessions: (sessions: AgentSession[]) => void;
  getSessionById: (id: string) => AgentSession | undefined;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: MOCK_SESSIONS,
  activeSession: MOCK_SESSIONS[0],

  setActiveSession: (session) => set({ activeSession: session }),

  setSessions: (sessions) => set((state) => ({
    sessions,
    activeSession: state.activeSession
      ? sessions.find((session) => session.id === state.activeSession?.id) ?? sessions[0] ?? null
      : sessions[0] ?? null,
  })),

  getSessionById: (id) => {
    return get().sessions.find((s) => s.id === id);
  },
}));
