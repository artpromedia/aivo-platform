/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
/**
 * UI Store - Global UI state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  selectedClassId: string | null;
  setSelectedClassId: (classId: string | null) => void;

  gradingPeriod: string;
  setGradingPeriod: (period: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      selectedClassId: null,
      setSelectedClassId: (classId) => set({ selectedClassId: classId }),

      gradingPeriod: 'Q2 2024',
      setGradingPeriod: (period) => set({ gradingPeriod: period }),
    }),
    {
      name: 'teacher-ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        selectedClassId: state.selectedClassId,
        gradingPeriod: state.gradingPeriod,
      }),
    }
  )
);
