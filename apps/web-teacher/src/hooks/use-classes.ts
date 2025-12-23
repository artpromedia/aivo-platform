/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * useClasses Hook
 *
 * Fetch and manage class data
 */

'use client';

import * as React from 'react';

import { classesApi } from '@/lib/api';
import type { Class, ClassSummary, ClassAnalytics } from '@/lib/types';

interface UseClassesOptions {
  initialData?: ClassSummary[];
}

export function useClasses(options: UseClassesOptions = {}) {
  const [classes, setClasses] = React.useState<ClassSummary[]>(options.initialData ?? []);
  const [loading, setLoading] = React.useState(!options.initialData);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchClasses = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await classesApi.list();
      setClasses(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch classes'));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!options.initialData) {
      fetchClasses();
    }
  }, [fetchClasses, options.initialData]);

  return { classes, loading, error, refetch: fetchClasses };
}

export function useClass(classId: string) {
  const [classData, setClassData] = React.useState<Class | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchClass = React.useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await classesApi.get(classId);
      setClassData(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch class'));
    } finally {
      setLoading(false);
    }
  }, [classId]);

  React.useEffect(() => {
    fetchClass();
  }, [fetchClass]);

  return { class: classData, loading, error, refetch: fetchClass };
}

export function useClassAnalytics(classId: string) {
  const [analytics, setAnalytics] = React.useState<ClassAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!classId) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const data = await classesApi.getAnalytics(classId);
        setAnalytics(data);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch analytics'));
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [classId]);

  return { analytics, loading, error };
}
