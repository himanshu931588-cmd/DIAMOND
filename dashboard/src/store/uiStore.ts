// ============================================
// DIAMOND UI Store — Zustand
// ============================================

import { create } from 'zustand';

export type TimeMode = 'agent' | 'local' | 'utc';

interface UIState {
  timeMode: TimeMode;
  inspectorOpen: boolean;
  alertOpen: boolean;
  selectedFileId: string | null;
  selectedDirectoryPath: string | null;
  hoveredFileId: string | null;
  sidebarCollapsed: boolean;
  demoMode: boolean;

  setTimeMode: (mode: TimeMode) => void;
  setInspectorOpen: (open: boolean) => void;
  setAlertOpen: (open: boolean) => void;
  setSelectedFileId: (id: string | null) => void;
  setSelectedDirectoryPath: (path: string | null) => void;
  setHoveredFileId: (id: string | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  timeMode: 'agent',
  inspectorOpen: false,
  alertOpen: false,
  selectedFileId: null,
  selectedDirectoryPath: null,
  hoveredFileId: null,
  sidebarCollapsed: false,
  demoMode: true,

  setTimeMode: (mode) => set({ timeMode: mode }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  setAlertOpen: (open) => set({ alertOpen: open }),
  setSelectedFileId: (id) => set({ selectedFileId: id }),
  setSelectedDirectoryPath: (path) => set({ selectedDirectoryPath: path }),
  setHoveredFileId: (id) => set({ hoveredFileId: id }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
