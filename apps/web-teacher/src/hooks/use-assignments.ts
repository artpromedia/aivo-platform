/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * useAssignments Hook
 *
 * Fetch and manage assignment data
 */

'use client';

import * as React from 'react';

import { assignmentsApi } from '@/lib/api';
import type { Assignment, Submission, CreateAssignmentDto } from '@/lib/types';

export function useAssignments(classId?: string) {
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchAssignments = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assignmentsApi.list(classId);
      setAssignments(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch assignments'));
    } finally {
      setLoading(false);
    }
  }, [classId]);

  React.useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const createAssignment = async (data: CreateAssignmentDto) => {
    const newAssignment = await assignmentsApi.create(data);
    setAssignments((prev) => [...prev, newAssignment]);
    return newAssignment;
  };

  const deleteAssignment = async (id: string) => {
    await assignmentsApi.delete(id);
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  return {
    assignments,
    loading,
    error,
    refetch: fetchAssignments,
    createAssignment,
    deleteAssignment,
  };
}

export function useAssignment(assignmentId: string) {
  const [assignment, setAssignment] = React.useState<Assignment | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!assignmentId) return;

    const fetchAssignment = async () => {
      setLoading(true);
      try {
        const data = await assignmentsApi.get(assignmentId);
        setAssignment(data);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch assignment'));
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [assignmentId]);

  return { assignment, loading, error };
}

export function useSubmissions(assignmentId: string) {
  const [submissions, setSubmissions] = React.useState<Submission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchSubmissions = React.useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);
    try {
      const data = await assignmentsApi.getSubmissions(assignmentId);
      setSubmissions(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch submissions'));
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  React.useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const gradeSubmission = async (submissionId: string, score: number, feedback?: string) => {
    const updated = await assignmentsApi.gradeSubmission(submissionId, {
      score,
      feedback,
    });
    setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? updated : s)));
    return updated;
  };

  return { submissions, loading, error, refetch: fetchSubmissions, gradeSubmission };
}
