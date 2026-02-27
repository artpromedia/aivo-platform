import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from "@/hooks/useUndoRedo";

describe('useUndoRedo', () => {
  it('initializes with the provided state', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));

    expect(result.current.state).toBe('initial');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyLength).toBe(1);
  });

  it('pushState adds to history and updates state', () => {
    const { result } = renderHook(() => useUndoRedo('v1'));

    act(() => result.current.pushState('v2'));

    expect(result.current.state).toBe('v2');
    expect(result.current.historyLength).toBe(2);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo restores previous state', () => {
    const { result } = renderHook(() => useUndoRedo('v1'));

    act(() => result.current.pushState('v2'));
    act(() => result.current.pushState('v3'));

    expect(result.current.state).toBe('v3');

    act(() => result.current.undo());
    expect(result.current.state).toBe('v2');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.state).toBe('v1');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo restores next state after undo', () => {
    const { result } = renderHook(() => useUndoRedo('v1'));

    act(() => result.current.pushState('v2'));
    act(() => result.current.pushState('v3'));
    act(() => result.current.undo());
    act(() => result.current.undo());

    act(() => result.current.redo());
    expect(result.current.state).toBe('v2');

    act(() => result.current.redo());
    expect(result.current.state).toBe('v3');
    expect(result.current.canRedo).toBe(false);
  });

  it('pushState after undo discards future states', () => {
    const { result } = renderHook(() => useUndoRedo('v1'));

    act(() => result.current.pushState('v2'));
    act(() => result.current.pushState('v3'));
    act(() => result.current.undo()); // back to v2

    act(() => result.current.pushState('v4'));

    expect(result.current.state).toBe('v4');
    expect(result.current.historyLength).toBe(3); // v1, v2, v4 (v3 discarded)
    expect(result.current.canRedo).toBe(false);
  });

  it('respects maxHistorySize', () => {
    const { result } = renderHook(() => useUndoRedo(0, { maxHistorySize: 3 }));

    act(() => result.current.pushState(1));
    act(() => result.current.pushState(2));
    act(() => result.current.pushState(3));

    // History should be trimmed to 3: [1, 2, 3] (0 dropped)
    expect(result.current.historyLength).toBe(3);
  });

  it('setState replaces history entirely', () => {
    const { result } = renderHook(() => useUndoRedo('v1'));

    act(() => result.current.pushState('v2'));
    act(() => result.current.pushState('v3'));

    act(() => result.current.setState('fresh'));

    expect(result.current.state).toBe('fresh');
    expect(result.current.historyLength).toBe(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('clearHistory keeps current state but removes history', () => {
    const { result } = renderHook(() => useUndoRedo('v1'));

    act(() => result.current.pushState('v2'));
    act(() => result.current.pushState('v3'));

    act(() => result.current.clearHistory());

    expect(result.current.state).toBe('v3');
    expect(result.current.historyLength).toBe(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo at beginning does nothing', () => {
    const { result } = renderHook(() => useUndoRedo('only'));

    act(() => result.current.undo());

    expect(result.current.state).toBe('only');
    expect(result.current.canUndo).toBe(false);
  });

  it('redo at end does nothing', () => {
    const { result } = renderHook(() => useUndoRedo('only'));

    act(() => result.current.redo());

    expect(result.current.state).toBe('only');
    expect(result.current.canRedo).toBe(false);
  });

  it('works with complex object states', () => {
    const initial = { blocks: [{ id: 1, text: 'Hello' }] };
    const { result } = renderHook(() => useUndoRedo(initial));

    const updated = { blocks: [{ id: 1, text: 'Hello' }, { id: 2, text: 'World' }] };
    act(() => result.current.pushState(updated));

    expect(result.current.state.blocks).toHaveLength(2);

    act(() => result.current.undo());
    expect(result.current.state.blocks).toHaveLength(1);
  });
});
