/**
 * useAutoSave Hook
 *
 * React hook for automatic content saving with:
 * - Debounced save operations
 * - Dirty state tracking
 * - Conflict detection
 * - Offline support via localStorage
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface UseAutoSaveOptions<T> {
  /** Unique key for this content (used for localStorage fallback) */
  key: string;

  /** Current content data */
  data: T;

  /** Save function - should return the saved data or throw on error */
  onSave: (data: T) => Promise<T>;

  /** Debounce delay in milliseconds (default: 2000) */
  debounceMs?: number;

  /** Minimum interval between saves in milliseconds (default: 5000) */
  minSaveInterval?: number;

  /** Enable localStorage fallback for offline support (default: true) */
  enableLocalStorage?: boolean;

  /** Callback when save starts */
  onSaveStart?: () => void;

  /** Callback when save succeeds */
  onSaveSuccess?: (data: T) => void;

  /** Callback when save fails */
  onSaveError?: (error: Error) => void;

  /** Compare function to detect changes (default: JSON.stringify comparison) */
  isEqual?: (a: T, b: T) => boolean;

  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
}

export interface UseAutoSaveReturn<T> {
  /** Whether there are unsaved changes */
  isDirty: boolean;

  /** Whether a save operation is in progress */
  isSaving: boolean;

  /** Last save error, if any */
  saveError: Error | null;

  /** Timestamp of last successful save */
  lastSavedAt: Date | null;

  /** The last successfully saved data */
  lastSavedData: T | null;

  /** Whether there's data in localStorage that hasn't been synced */
  hasLocalChanges: boolean;

  /** Manually trigger a save */
  save: () => Promise<void>;

  /** Discard unsaved changes and reset to last saved state */
  discardChanges: () => void;

  /** Clear local storage backup */
  clearLocalBackup: () => void;

  /** Restore from local storage backup */
  restoreFromLocal: () => T | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function getLocalStorageKey(key: string): string {
  return `autosave:${key}`;
}

function saveToLocalStorage(key: string, data: unknown): void {
  try {
    const storageKey = getLocalStorageKey(key);
    const payload = {
      data,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (error) {
    console.warn('[AutoSave] Failed to save to localStorage:', error);
  }
}

interface LocalStoragePayload {
  data: unknown;
  savedAt: string;
}

function loadFromLocalStorage(key: string): { data: unknown; savedAt: Date } | null {
  try {
    const storageKey = getLocalStorageKey(key);
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as LocalStoragePayload;
    return {
      data: parsed.data,
      savedAt: new Date(parsed.savedAt),
    };
  } catch (error) {
    console.warn('[AutoSave] Failed to load from localStorage:', error);
    return null;
  }
}

function clearLocalStorage(key: string): void {
  try {
    const storageKey = getLocalStorageKey(key);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('[AutoSave] Failed to clear localStorage:', error);
  }
}

function defaultIsEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

export function useAutoSave<T>(options: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
  const {
    key,
    data,
    onSave,
    debounceMs = 2000,
    minSaveInterval = 5000,
    enableLocalStorage = true,
    onSaveStart,
    onSaveSuccess,
    onSaveError,
    isEqual = defaultIsEqual,
    enabled = true,
  } = options;

  // State
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastSavedData, setLastSavedData] = useState<T | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Refs
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const pendingDataRef = useRef<T | null>(null);
  const isMountedRef = useRef(true);

  // Computed
  const isDirty = useMemo(() => {
    if (lastSavedData === null) return false;
    return !isEqual(data, lastSavedData);
  }, [data, lastSavedData, isEqual]);

  // ────────────────────────────────────────────────────────────────────────────
  // SAVE LOGIC
  // ────────────────────────────────────────────────────────────────────────────

  const executeSave = useCallback(
    async (dataToSave: T): Promise<void> => {
      if (isSaving) {
        // Queue this save for later
        pendingDataRef.current = dataToSave;
        return;
      }

      setIsSaving(true);
      setSaveError(null);
      onSaveStart?.();

      try {
        const savedData = await onSave(dataToSave);

        if (!isMountedRef.current) return;

        lastSaveTimeRef.current = Date.now();
        setLastSavedAt(new Date());
        setLastSavedData(savedData);

        // Clear local backup on successful save
        if (enableLocalStorage) {
          clearLocalStorage(key);
          setHasLocalChanges(false);
        }

        onSaveSuccess?.(savedData);

        // Check for pending saves
        if (pendingDataRef.current !== null && !isEqual(pendingDataRef.current, savedData)) {
          const pending = pendingDataRef.current;
          pendingDataRef.current = null;
          // Schedule another save for pending changes
          setTimeout(() => executeSave(pending), minSaveInterval);
        }
      } catch (error) {
        if (!isMountedRef.current) return;

        const err = error instanceof Error ? error : new Error('Save failed');
        setSaveError(err);
        onSaveError?.(err);

        // Save to localStorage as fallback
        if (enableLocalStorage) {
          saveToLocalStorage(key, dataToSave);
          setHasLocalChanges(true);
        }
      } finally {
        if (isMountedRef.current) {
          setIsSaving(false);
        }
      }
    },
    [
      isSaving,
      onSave,
      onSaveStart,
      onSaveSuccess,
      onSaveError,
      isEqual,
      enableLocalStorage,
      key,
      minSaveInterval,
    ]
  );

  const debouncedSave = useCallback(
    (dataToSave: T) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Check minimum interval
      const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
      const delay = Math.max(debounceMs, minSaveInterval - timeSinceLastSave);

      debounceTimerRef.current = setTimeout(() => {
        void executeSave(dataToSave);
      }, delay);

      // Save to localStorage immediately for crash recovery
      if (enableLocalStorage) {
        saveToLocalStorage(key, dataToSave);
      }
    },
    [debounceMs, minSaveInterval, executeSave, enableLocalStorage, key]
  );

  // Manual save (immediate)
  const save = useCallback(async (): Promise<void> => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    await executeSave(data);
  }, [data, executeSave]);

  // ────────────────────────────────────────────────────────────────────────────
  // DISCARD & RESTORE
  // ────────────────────────────────────────────────────────────────────────────

  const discardChanges = useCallback(() => {
    // Clear pending saves
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingDataRef.current = null;

    // Clear local storage
    if (enableLocalStorage) {
      clearLocalStorage(key);
      setHasLocalChanges(false);
    }
  }, [enableLocalStorage, key]);

  const clearLocalBackup = useCallback(() => {
    if (enableLocalStorage) {
      clearLocalStorage(key);
      setHasLocalChanges(false);
    }
  }, [enableLocalStorage, key]);

  const restoreFromLocal = useCallback((): T | null => {
    if (!enableLocalStorage) return null;

    const stored = loadFromLocalStorage(key);
    if (stored) {
      return stored.data as T;
    }
    return null;
  }, [enableLocalStorage, key]);

  // ────────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ────────────────────────────────────────────────────────────────────────────

  // Initialize with current data as last saved
  useEffect(() => {
    if (lastSavedData === null) {
      setLastSavedData(data);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for local changes on mount
  useEffect(() => {
    if (enableLocalStorage) {
      const stored = loadFromLocalStorage(key);
      if (stored) {
        setHasLocalChanges(true);
      }
    }
  }, [enableLocalStorage, key]);

  // Auto-save when data changes
  useEffect(() => {
    if (!enabled || !isDirty) return;

    debouncedSave(data);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, enabled, isDirty, debouncedSave]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty && enabled) {
        // Save to localStorage
        if (enableLocalStorage) {
          saveToLocalStorage(key, data);
        }

        // Show confirmation dialog - preventDefault is the modern way
        event.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, enabled, enableLocalStorage, key, data]);

  return {
    isDirty,
    isSaving,
    saveError,
    lastSavedAt,
    lastSavedData,
    hasLocalChanges,
    save,
    discardChanges,
    clearLocalBackup,
    restoreFromLocal,
  };
}

export default useAutoSave;
