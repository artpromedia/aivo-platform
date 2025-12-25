/**
 * Undo/Redo state management hook
 * Maintains history stack for reversible operations
 */

import { useState, useCallback, useRef } from 'react';

interface UseUndoRedoOptions {
  maxHistorySize?: number;
}

interface UseUndoRedoResult<T> {
  state: T;
  setState: (newState: T) => void;
  pushState: (newState: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
  historyLength: number;
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
): UseUndoRedoResult<T> {
  const { maxHistorySize = 50 } = options;

  const [state, setStateInternal] = useState<T>(initialState);
  const historyRef = useRef<T[]>([initialState]);
  const currentIndexRef = useRef(0);

  // Force re-render when history changes
  const [, forceUpdate] = useState({});

  const canUndo = currentIndexRef.current > 0;
  const canRedo = currentIndexRef.current < historyRef.current.length - 1;

  const pushState = useCallback((newState: T) => {
    const history = historyRef.current;
    const currentIndex = currentIndexRef.current;

    // Remove any future states if we're not at the end
    if (currentIndex < history.length - 1) {
      history.splice(currentIndex + 1);
    }

    // Add new state
    history.push(newState);

    // Trim history if it exceeds max size
    if (history.length > maxHistorySize) {
      history.shift();
    } else {
      currentIndexRef.current = history.length - 1;
    }

    setStateInternal(newState);
    forceUpdate({});
  }, [maxHistorySize]);

  const setState = useCallback((newState: T) => {
    // Direct set without history (for initial loads)
    historyRef.current = [newState];
    currentIndexRef.current = 0;
    setStateInternal(newState);
    forceUpdate({});
  }, []);

  const undo = useCallback(() => {
    if (currentIndexRef.current > 0) {
      currentIndexRef.current -= 1;
      const previousState = historyRef.current[currentIndexRef.current];
      setStateInternal(previousState);
      forceUpdate({});
    }
  }, []);

  const redo = useCallback(() => {
    if (currentIndexRef.current < historyRef.current.length - 1) {
      currentIndexRef.current += 1;
      const nextState = historyRef.current[currentIndexRef.current];
      setStateInternal(nextState);
      forceUpdate({});
    }
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [state];
    currentIndexRef.current = 0;
    forceUpdate({});
  }, [state]);

  return {
    state,
    setState,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    historyLength: historyRef.current.length,
  };
}

/**
 * Enhanced undo/redo with operation batching
 */
interface BatchedOperation<T> {
  type: string;
  timestamp: number;
  state: T;
}

export function useUndoRedoWithBatching<T>(
  initialState: T,
  options: UseUndoRedoOptions & { batchTimeMs?: number } = {}
): UseUndoRedoResult<T> & { batchPush: (newState: T, operationType: string) => void } {
  const { batchTimeMs = 500, ...undoRedoOptions } = options;
  const baseResult = useUndoRedo(initialState, undoRedoOptions);
  
  const lastOperationRef = useRef<BatchedOperation<T> | null>(null);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const batchPush = useCallback((newState: T, operationType: string) => {
    const now = Date.now();
    const lastOp = lastOperationRef.current;

    // If same operation type within batch window, update pending state
    if (
      lastOp &&
      lastOp.type === operationType &&
      now - lastOp.timestamp < batchTimeMs
    ) {
      lastOperationRef.current = {
        type: operationType,
        timestamp: now,
        state: newState,
      };

      // Reset timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      batchTimeoutRef.current = setTimeout(() => {
        if (lastOperationRef.current) {
          baseResult.pushState(lastOperationRef.current.state);
          lastOperationRef.current = null;
        }
      }, batchTimeMs);
    } else {
      // Flush any pending batched operation
      if (lastOperationRef.current) {
        baseResult.pushState(lastOperationRef.current.state);
      }

      // Start new batch
      lastOperationRef.current = {
        type: operationType,
        timestamp: now,
        state: newState,
      };

      batchTimeoutRef.current = setTimeout(() => {
        if (lastOperationRef.current) {
          baseResult.pushState(lastOperationRef.current.state);
          lastOperationRef.current = null;
        }
      }, batchTimeMs);
    }
  }, [baseResult, batchTimeMs]);

  return {
    ...baseResult,
    batchPush,
  };
}
