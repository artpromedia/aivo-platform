/**
 * React Hooks Integration Tests
 *
 * Tests for useContent, useReview, and useAutoSave hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContent } from '../lib/hooks/useContent';
import { useAutoSave } from '../lib/hooks/useAutoSave';
import * as contentApi from '../lib/api/content';
import type { LearningObject, LearningObjectVersion } from '../lib/types';

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn((key, _fetcher) => {
    if (!key) return { data: undefined, error: undefined, isLoading: false };
    return {
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    };
  }),
}));

// Mock content API
vi.mock('../lib/api/content', () => ({
  listContent: vi.fn(),
  getContent: vi.fn(),
  createContent: vi.fn(),
  updateContent: vi.fn(),
  deleteContent: vi.fn(),
  listVersions: vi.fn(),
  getVersion: vi.fn(),
  updateVersion: vi.fn(),
  createNewVersion: vi.fn(),
  submitForReview: vi.fn(),
  approveVersion: vi.fn(),
  rejectVersion: vi.fn(),
  publishVersion: vi.fn(),
  retireVersion: vi.fn(),
  setVersionSkills: vi.fn(),
}));

describe('useContent Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('content operations', () => {
    it('should initialize with undefined content', () => {
      const { result } = renderHook(() => useContent(null));

      expect(result.current.content).toBeUndefined();
      expect(result.current.versions).toEqual([]);
    });

    it('should update content', async () => {
      const mockUpdated = { id: 'content-123', title: 'Updated' };

      vi.mocked(contentApi.updateContent).mockResolvedValueOnce(mockUpdated as LearningObject);

      const { result } = renderHook(() => useContent('content-123'));

      await act(async () => {
        await result.current.update({ title: 'Updated' });
      });

      expect(contentApi.updateContent).toHaveBeenCalledWith('content-123', {
        title: 'Updated',
      });
    });

    it('should remove content', async () => {
      vi.mocked(contentApi.deleteContent).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useContent('content-123'));

      await act(async () => {
        await result.current.remove();
      });

      expect(contentApi.deleteContent).toHaveBeenCalledWith('content-123');
    });
  });

  describe('version operations', () => {
    it('should save version', async () => {
      const mockSaved = { id: 'v1', versionNumber: 1 };

      vi.mocked(contentApi.updateVersion).mockResolvedValueOnce(mockSaved as LearningObjectVersion);

      const { result } = renderHook(() => useContent('content-123'));

      await act(async () => {
        await result.current.saveVersion(1, {
          contentJson: { blocks: [{ id: 'b1', type: 'paragraph', content: 'Test' }] },
        });
      });

      expect(contentApi.updateVersion).toHaveBeenCalledWith('content-123', 1, {
        contentJson: { blocks: [{ id: 'b1', type: 'paragraph', content: 'Test' }] },
      });
    });

    it('should create new version', async () => {
      const mockNewVersion = { id: 'v2', versionNumber: 2 };

      vi.mocked(contentApi.createNewVersion).mockResolvedValueOnce(
        mockNewVersion as LearningObjectVersion
      );

      const { result } = renderHook(() => useContent('content-123'));

      await act(async () => {
        await result.current.createVersion();
      });

      expect(contentApi.createNewVersion).toHaveBeenCalledWith('content-123');
    });
  });

  describe('workflow operations', () => {
    it('should submit for review', async () => {
      vi.mocked(contentApi.submitForReview).mockResolvedValueOnce({
        state: 'IN_REVIEW',
      } as LearningObjectVersion);

      const { result } = renderHook(() => useContent('content-123'));

      await act(async () => {
        await result.current.submitVersion(1);
      });

      expect(contentApi.submitForReview).toHaveBeenCalledWith('content-123', 1);
    });

    it('should approve version', async () => {
      vi.mocked(contentApi.approveVersion).mockResolvedValueOnce({
        state: 'APPROVED',
      } as LearningObjectVersion);

      const { result } = renderHook(() => useContent('content-123'));

      await act(async () => {
        await result.current.approve(1);
      });

      expect(contentApi.approveVersion).toHaveBeenCalledWith('content-123', 1);
    });

    it('should reject version', async () => {
      vi.mocked(contentApi.rejectVersion).mockResolvedValueOnce({
        state: 'DRAFT',
      } as LearningObjectVersion);

      const { result } = renderHook(() => useContent('content-123'));

      await act(async () => {
        await result.current.reject(1, 'Needs work');
      });

      expect(contentApi.rejectVersion).toHaveBeenCalledWith('content-123', 1, 'Needs work');
    });

    it('should publish version', async () => {
      vi.mocked(contentApi.publishVersion).mockResolvedValueOnce({
        state: 'PUBLISHED',
      } as LearningObjectVersion);

      const { result } = renderHook(() => useContent('content-123'));

      await act(async () => {
        await result.current.publish(1);
      });

      expect(contentApi.publishVersion).toHaveBeenCalledWith('content-123', 1);
    });
  });
});

describe('useAutoSave Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with clean state', () => {
    const saveFn = vi.fn().mockResolvedValue({ content: 'test' });
    const { result } = renderHook(() =>
      useAutoSave({
        key: 'test-key',
        data: { content: 'test' },
        onSave: saveFn,
        debounceMs: 1000,
      })
    );

    expect(result.current.isDirty).toBe(false);
    expect(result.current.lastSavedAt).toBeNull();
    expect(result.current.isSaving).toBe(false);
  });

  it('should track dirty state on data change', () => {
    const saveFn = vi.fn().mockResolvedValue({ content: 'updated' });
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          key: 'test-key',
          data,
          onSave: saveFn,
          debounceMs: 1000,
        }),
      { initialProps: { data: { content: 'initial' } } }
    );

    expect(result.current.isDirty).toBe(false);

    // Update data
    rerender({ data: { content: 'updated' } });

    expect(result.current.isDirty).toBe(true);
  });

  it('should debounce save calls', async () => {
    const saveFn = vi.fn().mockResolvedValue({ content: 'update3' });
    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          key: 'test-key',
          data,
          onSave: saveFn,
          debounceMs: 1000,
        }),
      { initialProps: { data: { content: 'initial' } } }
    );

    // Multiple rapid updates
    rerender({ data: { content: 'update1' } });
    rerender({ data: { content: 'update2' } });
    rerender({ data: { content: 'update3' } });

    // Should not have saved yet
    expect(saveFn).not.toHaveBeenCalled();

    // Advance timer past debounce
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    // Should have saved once with final value
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith({ content: 'update3' });
  });

  it('should allow manual save', async () => {
    const saveFn = vi.fn().mockResolvedValue({ content: 'updated' });
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          key: 'test-key',
          data,
          onSave: saveFn,
          debounceMs: 5000, // Long debounce
        }),
      { initialProps: { data: { content: 'initial' } } }
    );

    rerender({ data: { content: 'updated' } });

    // Manual save before debounce
    await act(async () => {
      await result.current.save();
    });

    expect(saveFn).toHaveBeenCalled();
  });

  it('should save to localStorage when enabled', () => {
    const saveFn = vi.fn().mockResolvedValue({ content: 'draft-content' });
    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          key: 'test-draft',
          data,
          onSave: saveFn,
          debounceMs: 1000,
          enableLocalStorage: true,
        }),
      { initialProps: { data: { content: 'initial' } } }
    );

    rerender({ data: { content: 'draft-content' } });

    // Local storage should be updated immediately for crash recovery
    const stored = localStorage.getItem('autosave:test-draft');
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.data.content).toBe('draft-content');
  });

  it('should restore from localStorage on mount', () => {
    // Pre-populate localStorage
    localStorage.setItem(
      'autosave:test-draft',
      JSON.stringify({
        data: { content: 'saved-draft' },
        savedAt: new Date().toISOString(),
      })
    );

    const saveFn = vi.fn().mockResolvedValue({ content: 'initial' });
    const { result } = renderHook(() =>
      useAutoSave({
        key: 'test-draft',
        data: { content: 'initial' },
        onSave: saveFn,
        debounceMs: 1000,
        enableLocalStorage: true,
      })
    );

    expect(result.current.hasLocalChanges).toBe(true);

    const restored = result.current.restoreFromLocal();
    expect(restored?.content).toBe('saved-draft');
  });

  it('should discard changes', async () => {
    localStorage.setItem(
      'autosave:test-draft',
      JSON.stringify({
        data: { content: 'saved-draft' },
        savedAt: new Date().toISOString(),
      })
    );

    const saveFn = vi.fn().mockResolvedValue({ content: 'initial' });
    const { result } = renderHook(() =>
      useAutoSave({
        key: 'test-draft',
        data: { content: 'initial' },
        onSave: saveFn,
        debounceMs: 1000,
        enableLocalStorage: true,
      })
    );

    await act(async () => {
      result.current.discardChanges();
    });

    expect(localStorage.getItem('autosave:test-draft')).toBeNull();
    expect(result.current.hasLocalChanges).toBe(false);
  });

  it('should not auto-save when disabled', async () => {
    const saveFn = vi.fn().mockResolvedValue({ content: 'updated' });
    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          key: 'test-key',
          data,
          onSave: saveFn,
          debounceMs: 1000,
          enabled: false,
        }),
      { initialProps: { data: { content: 'initial' } } }
    );

    rerender({ data: { content: 'updated' } });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(saveFn).not.toHaveBeenCalled();
  });
});
