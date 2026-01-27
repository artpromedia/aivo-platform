/**
 * Tests for Creator Portal Builder Hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '../useAutoSave';
import { useUndoRedo } from '../useUndoRedo';

// ══════════════════════════════════════════════════════════════════════════════
// useAutoSave Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not be dirty initially', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ data: { value: 1 }, onSave, debounceMs: 1000 })
    );

    expect(result.current.isDirty).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  it('should become dirty when data changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 1000 }),
      { initialProps: { data: { value: 1 } } }
    );

    // Skip initial render
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Change data
    rerender({ data: { value: 2 } });

    expect(result.current.isDirty).toBe(true);
  });

  it('should auto-save after debounce period', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 1000 }),
      { initialProps: { data: { value: 1 } } }
    );

    // Skip initial render
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Change data
    rerender({ data: { value: 2 } });

    // Before debounce
    expect(onSave).not.toHaveBeenCalled();

    // After debounce
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    expect(onSave).toHaveBeenCalledWith({ value: 2 });
  });

  it('should reset dirty state after successful save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 1000 }),
      { initialProps: { data: { value: 1 } } }
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    rerender({ data: { value: 2 } });
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    await waitFor(() => {
      expect(result.current.isDirty).toBe(false);
    });
  });

  it('should set error state when save fails', async () => {
    const error = new Error('Save failed');
    const onSave = vi.fn().mockRejectedValue(error);

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 1000 }),
      { initialProps: { data: { value: 1 } } }
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    rerender({ data: { value: 2 } });

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });
  });

  it('should support manual save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 5000 }),
      { initialProps: { data: { value: 1 } } }
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    rerender({ data: { value: 2 } });

    // Manual save before debounce
    await act(async () => {
      await result.current.saveNow();
    });

    expect(onSave).toHaveBeenCalledWith({ value: 2 });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// useUndoRedo Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('useUndoRedo', () => {
  it('should initialize with given state', () => {
    const { result } = renderHook(() =>
      useUndoRedo('hello')
    );

    expect(result.current.state).toBe('hello');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should track state changes with pushState', () => {
    const { result } = renderHook(() =>
      useUndoRedo(1)
    );

    act(() => {
      result.current.pushState(2);
    });

    expect(result.current.state).toBe(2);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should undo to previous state', () => {
    const { result } = renderHook(() =>
      useUndoRedo('a')
    );

    act(() => {
      result.current.pushState('b');
      result.current.pushState('c');
    });

    expect(result.current.state).toBe('c');

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toBe('b');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
  });

  it('should redo to next state', () => {
    const { result } = renderHook(() =>
      useUndoRedo('a')
    );

    act(() => {
      result.current.pushState('b');
      result.current.pushState('c');
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.state).toBe('a');

    act(() => {
      result.current.redo();
    });

    expect(result.current.state).toBe('b');
  });

  it('should clear redo stack on new change after undo', () => {
    const { result } = renderHook(() =>
      useUndoRedo('a')
    );

    act(() => {
      result.current.pushState('b');
      result.current.pushState('c');
      result.current.undo(); // back to 'b'
      result.current.pushState('d'); // new change, should clear 'c' from redo
    });

    expect(result.current.state).toBe('d');
    expect(result.current.canRedo).toBe(false);
  });

  it('should respect maxHistorySize limit', () => {
    const { result } = renderHook(() =>
      useUndoRedo(0, { maxHistorySize: 3 })
    );

    act(() => {
      result.current.pushState(1);
      result.current.pushState(2);
      result.current.pushState(3);
      result.current.pushState(4);
      result.current.pushState(5);
    });

    // Only 3 items in history, so can only undo limited times
    let undoCount = 0;
    while (result.current.canUndo) {
      act(() => {
        result.current.undo();
      });
      undoCount++;
      if (undoCount > 10) break; // Safety limit
    }

    // With maxHistorySize of 3, we expect limited undo capacity
    expect(undoCount).toBeLessThanOrEqual(3);
  });

  it('should support clearHistory to reset state', () => {
    const { result } = renderHook(() =>
      useUndoRedo('start')
    );

    act(() => {
      result.current.pushState('a');
      result.current.pushState('b');
      result.current.clearHistory();
    });

    // clearHistory keeps current state but clears history
    expect(result.current.state).toBe('b');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should support setState for direct state replacement', () => {
    const { result } = renderHook(() =>
      useUndoRedo({ x: 0, y: 0 })
    );

    act(() => {
      result.current.pushState({ x: 1, y: 0 });
      result.current.pushState({ x: 1, y: 1 });
    });

    expect(result.current.state).toEqual({ x: 1, y: 1 });
    expect(result.current.canUndo).toBe(true);

    // setState replaces state and clears history
    act(() => {
      result.current.setState({ x: 2, y: 2 });
    });

    expect(result.current.state).toEqual({ x: 2, y: 2 });
    expect(result.current.canUndo).toBe(false);
  });
});
