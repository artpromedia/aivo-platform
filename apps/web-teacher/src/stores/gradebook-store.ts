/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars */
/**
 * Gradebook Store - Gradebook state with optimistic updates
 */

import { create } from 'zustand';

import type { Gradebook, Grade } from '@/lib/types';

interface GradebookState {
  gradebook: Gradebook | null;
  loading: boolean;
  error: string | null;
  pendingUpdates: Map<string, number | null>;

  setGradebook: (gradebook: Gradebook) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  updateGrade: (studentId: string, assignmentId: string, score: number | null) => void;
  commitUpdate: (studentId: string, assignmentId: string) => void;
  rollbackUpdate: (studentId: string, assignmentId: string, originalScore: number | null) => void;
}

export const useGradebookStore = create<GradebookState>((set, get) => ({
  gradebook: null,
  loading: false,
  error: null,
  pendingUpdates: new Map(),

  setGradebook: (gradebook) => set({ gradebook, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  updateGrade: (studentId, assignmentId, score) => {
    const { gradebook, pendingUpdates } = get();
    if (!gradebook) return;

    const key = `${studentId}:${assignmentId}`;
    pendingUpdates.set(key, score);

    // Optimistic update
    const updatedStudents = gradebook.students.map((s) => {
      if (s.studentId !== studentId) return s;
      return {
        ...s,
        grades: s.grades.map((g) =>
          g.assignmentId === assignmentId ? { ...g, score, status: 'graded' as const } : g
        ),
      };
    });

    set({
      gradebook: { ...gradebook, students: updatedStudents },
      pendingUpdates: new Map(pendingUpdates),
    });
  },

  commitUpdate: (studentId, assignmentId) => {
    const { pendingUpdates } = get();
    pendingUpdates.delete(`${studentId}:${assignmentId}`);
    set({ pendingUpdates: new Map(pendingUpdates) });
  },

  rollbackUpdate: (studentId, assignmentId, originalScore) => {
    const { gradebook, pendingUpdates } = get();
    if (!gradebook) return;

    pendingUpdates.delete(`${studentId}:${assignmentId}`);

    const updatedStudents = gradebook.students.map((s) => {
      if (s.studentId !== studentId) return s;
      return {
        ...s,
        grades: s.grades.map((g) =>
          g.assignmentId === assignmentId ? { ...g, score: originalScore } : g
        ),
      };
    });

    set({
      gradebook: { ...gradebook, students: updatedStudents },
      pendingUpdates: new Map(pendingUpdates),
    });
  },
}));
