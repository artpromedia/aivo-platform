/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * useStudents Hook
 *
 * Fetch and manage student data
 */

'use client';

import * as React from 'react';

import { studentsApi } from '@/lib/api';
import type { Student, StudentDetail, StudentProgress, IEPGoal } from '@/lib/types';

export function useStudents(classId?: string) {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchStudents = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentsApi.list(classId);
      setStudents(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch students'));
    } finally {
      setLoading(false);
    }
  }, [classId]);

  React.useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return { students, loading, error, refetch: fetchStudents };
}

export function useStudent(studentId: string) {
  const [student, setStudent] = React.useState<StudentDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!studentId) return;

    const fetchStudent = async () => {
      setLoading(true);
      try {
        const data = await studentsApi.get(studentId);
        setStudent(data);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch student'));
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [studentId]);

  return { student, loading, error };
}

export function useStudentProgress(studentId: string, classId?: string) {
  const [progress, setProgress] = React.useState<StudentProgress | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!studentId) return;

    const fetchProgress = async () => {
      setLoading(true);
      try {
        const data = await studentsApi.getProgress(studentId, classId);
        setProgress(data);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch progress'));
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [studentId, classId]);

  return { progress, loading, error };
}

export function useIEPGoals(studentId: string) {
  const [goals, setGoals] = React.useState<IEPGoal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchGoals = React.useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const data = await studentsApi.getIepGoals(studentId);
      setGoals(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch IEP goals'));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  React.useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  return { goals, loading, error, refetch: fetchGoals };
}
