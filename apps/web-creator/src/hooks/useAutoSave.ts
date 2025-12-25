/**
 * Auto-save hook for content editing
 * Debounces saves and provides status feedback
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseAutoSaveResult {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  saveNow: () => Promise<void>;
  isDirty: boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveResult {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const dataRef = useRef(data);
  const savedDataRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveInProgressRef = useRef(false);

  // Serialize data for comparison
  const serializedData = JSON.stringify(data);

  // Update ref when data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Check if data is dirty
  useEffect(() => {
    if (savedDataRef.current === null) {
      savedDataRef.current = serializedData;
    }
    setIsDirty(serializedData !== savedDataRef.current);
  }, [serializedData]);

  const performSave = useCallback(async () => {
    if (saveInProgressRef.current) return;
    if (!isDirty) return;

    saveInProgressRef.current = true;
    setIsSaving(true);
    setError(null);

    try {
      await onSave(dataRef.current);
      savedDataRef.current = JSON.stringify(dataRef.current);
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Save failed'));
      console.error('Auto-save failed:', err);
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false;
    }
  }, [onSave, isDirty]);

  // Debounced auto-save
  useEffect(() => {
    if (!enabled || !isDirty) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [serializedData, enabled, debounceMs, isDirty, performSave]);

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      if (isDirty && enabled) {
        // Synchronous save attempt on unmount
        performSave();
      }
    };
  }, [isDirty, enabled, performSave]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await performSave();
  }, [performSave]);

  return {
    isSaving,
    lastSaved,
    error,
    saveNow,
    isDirty,
  };
}
