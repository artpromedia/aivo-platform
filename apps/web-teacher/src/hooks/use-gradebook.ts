/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-plus-operands */
/**
 * useGradebook Hook
 *
 * Fetch and manage gradebook data
 */

'use client';

import * as React from 'react';

import { gradesApi, classesApi } from '@/lib/api';
import type { Gradebook, Grade, BulkGradeOperation } from '@/lib/types';

export function useGradebook(classId: string) {
  const [gradebook, setGradebook] = React.useState<Gradebook | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [saving, setSaving] = React.useState(false);

  const fetchGradebook = React.useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await classesApi.getGradebook(classId);
      setGradebook(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch gradebook'));
    } finally {
      setLoading(false);
    }
  }, [classId]);

  React.useEffect(() => {
    fetchGradebook();
  }, [fetchGradebook]);

  const updateGrade = async (studentId: string, assignmentId: string, score: number | null) => {
    setSaving(true);
    try {
      await gradesApi.update({
        studentId,
        assignmentId,
        score,
      });

      // Update local state
      setGradebook((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map((student) => {
            if (student.studentId !== studentId) return student;
            const existingGradeIndex = student.grades.findIndex(
              (g) => g.assignmentId === assignmentId
            );
            const newGrade: Grade = {
              id: `${studentId}-${assignmentId}`,
              studentId,
              assignmentId,
              score,
              status: score === null ? 'pending' : 'graded',
              gradedAt: new Date().toISOString(),
            };

            const newGrades = [...student.grades];
            if (existingGradeIndex >= 0) {
              newGrades[existingGradeIndex] = { ...newGrades[existingGradeIndex], ...newGrade };
            } else {
              newGrades.push(newGrade);
            }

            // Recalculate overall (simplified)
            const gradedAssignments = prev.assignments.filter((a) =>
              newGrades.some((g) => g.assignmentId === a.id && g.score !== null)
            );
            const total = gradedAssignments.reduce((sum, a) => {
              const grade = newGrades.find((g) => g.assignmentId === a.id);
              return sum + (grade?.score ?? 0);
            }, 0);
            const maxTotal = gradedAssignments.reduce((sum, a) => sum + a.totalPoints, 0);
            const overallGrade = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

            return { ...student, grades: newGrades, overallGrade };
          }),
        };
      });
    } finally {
      setSaving(false);
    }
  };

  const bulkUpdateGrades = async (operations: BulkGradeOperation[]) => {
    setSaving(true);
    try {
      await gradesApi.bulkUpdate(operations);
      await fetchGradebook(); // Refetch to get updated data
    } finally {
      setSaving(false);
    }
  };

  return {
    gradebook,
    loading,
    error,
    saving,
    refetch: fetchGradebook,
    updateGrade,
    bulkUpdateGrades,
  };
}
