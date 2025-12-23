/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
/**
 * Class Store - Classes state management
 */

import { create } from 'zustand';

import type { Class, ClassAnalytics } from '@/lib/types';

interface ClassState {
  classes: Class[];
  selectedClass: Class | null;
  analytics: ClassAnalytics | null;
  loading: boolean;
  error: string | null;

  setClasses: (classes: Class[]) => void;
  selectClass: (classId: string) => void;
  setAnalytics: (analytics: ClassAnalytics) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  addClass: (cls: Class) => void;
  updateClass: (classId: string, updates: Partial<Class>) => void;
  removeClass: (classId: string) => void;
}

export const useClassStore = create<ClassState>((set, get) => ({
  classes: [],
  selectedClass: null,
  analytics: null,
  loading: false,
  error: null,

  setClasses: (classes) => set({ classes, error: null }),

  selectClass: (classId) => {
    const cls = get().classes.find((c) => c.id === classId) || null;
    set({ selectedClass: cls });
  },

  setAnalytics: (analytics) => set({ analytics }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addClass: (cls) => set((s) => ({ classes: [...s.classes, cls] })),

  updateClass: (classId, updates) =>
    set((s) => ({
      classes: s.classes.map((c) => (c.id === classId ? { ...c, ...updates } : c)),
      selectedClass:
        s.selectedClass?.id === classId ? { ...s.selectedClass, ...updates } : s.selectedClass,
    })),

  removeClass: (classId) =>
    set((s) => ({
      classes: s.classes.filter((c) => c.id !== classId),
      selectedClass: s.selectedClass?.id === classId ? null : s.selectedClass,
    })),
}));
