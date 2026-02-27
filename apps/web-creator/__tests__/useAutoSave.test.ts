import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from "@/hooks/useAutoSave";

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with clean state (not saving, not dirty, no error)', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ data: { title: 'Hello' }, onSave }),
    );

    expect(result.current.isSaving).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.lastSaved).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('marks data as dirty when data changes', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    let data = { title: 'Hello' };

    const { result, rerender } = renderHook(() =>
      useAutoSave({ data, onSave }),
    );

    expect(result.current.isDirty).toBe(false);

    data = { title: 'Changed' };
    rerender();

    expect(result.current.isDirty).toBe(true);
  });

  it('auto-saves after debounce period', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    let data = { title: 'Hello' };

    const { result, rerender } = renderHook(() =>
      useAutoSave({ data, onSave, debounceMs: 1000 }),
    );

    // Change data
    data = { title: 'Updated' };
    rerender();

    // Not saved yet (within debounce)
    expect(onSave).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    expect(onSave).toHaveBeenCalledWith({ title: 'Updated' });
  });

  it('does not auto-save when disabled', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    let data = { title: 'Hello' };

    const { rerender } = renderHook(() =>
      useAutoSave({ data, onSave, enabled: false, debounceMs: 500 }),
    );

    data = { title: 'Changed' };
    rerender();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('saveNow triggers an immediate save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    let data = { title: 'Hello' };

    const { result, rerender } = renderHook(() =>
      useAutoSave({ data, onSave }),
    );

    data = { title: 'Changed' };
    rerender();

    await act(async () => {
      await result.current.saveNow();
    });

    expect(onSave).toHaveBeenCalledWith({ title: 'Changed' });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('sets error on save failure', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Network error'));
    let data = { title: 'Hello' };

    const { result, rerender } = renderHook(() =>
      useAutoSave({ data, onSave }),
    );

    data = { title: 'Fail me' };
    rerender();

    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.isSaving).toBe(false);
  });

  it('updates lastSaved timestamp on successful save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    let data = { title: 'Hello' };

    const { result, rerender } = renderHook(() =>
      useAutoSave({ data, onSave }),
    );

    expect(result.current.lastSaved).toBeNull();

    data = { title: 'Saved' };
    rerender();

    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.lastSaved).not.toBeNull();
  });

  it('resets debounce timer when data changes again', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    let data = { title: 'v1' };

    const { rerender } = renderHook(() =>
      useAutoSave({ data, onSave, debounceMs: 1000 }),
    );

    data = { title: 'v2' };
    rerender();

    // Advance 800ms (not yet debounce)
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    // Change data again — should reset timer
    data = { title: 'v3' };
    rerender();

    // Advance 800ms from second change
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    // v2 save should not have fired (since timer was reset)
    expect(onSave).not.toHaveBeenCalledWith({ title: 'v2' });

    // Advance past debounce from second change
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(onSave).toHaveBeenCalledWith({ title: 'v3' });
  });

  it('prevents concurrent saves', async () => {
    let resolveFirst: () => void;
    const firstSave = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const onSave = vi.fn().mockReturnValueOnce(firstSave).mockResolvedValue(undefined);

    let data = { title: 'Hello' };
    const { result, rerender } = renderHook(() =>
      useAutoSave({ data, onSave }),
    );

    data = { title: 'Save1' };
    rerender();

    // Start first save
    act(() => {
      result.current.saveNow();
    });

    // Try to save again while first is in progress
    data = { title: 'Save2' };
    rerender();

    act(() => {
      result.current.saveNow();
    });

    // Should only have been called once (concurrent guard)
    expect(onSave).toHaveBeenCalledTimes(1);

    // Resolve first save
    await act(async () => {
      resolveFirst!();
    });
  });

  it('does not save when data is not dirty', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ data: { title: 'Stable' }, onSave }),
    );

    await act(async () => {
      await result.current.saveNow();
    });

    expect(onSave).not.toHaveBeenCalled();
  });
});
