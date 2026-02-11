/**
 * use-dashboard hook tests
 *
 * Validates that the dashboard hook:
 * - Calls analyticsApi.getDashboardSummary
 * - Does NOT fall back to mock data on error (removed in Sprint 3)
 * - Returns error state when API fails
 */

import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the analytics API
vi.mock('@/src/lib/api/analytics', () => ({
  analyticsApi: {
    getDashboardSummary: vi.fn(),
  },
}));

import { analyticsApi } from '@/src/lib/api/analytics';
import { useDashboard } from '@/src/hooks/use-dashboard';

const mockSummary = {
  stats: { totalStudents: 50, averageMastery: 80, iepStudents: 5, atRiskStudents: 3 },
  classPerformance: [],
  atRiskStudents: [],
  iepProgress: [],
  recentActivity: [],
  upcomingItems: [],
};

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches dashboard data from the API', async () => {
    vi.mocked(analyticsApi.getDashboardSummary).mockResolvedValue(mockSummary);

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(analyticsApi.getDashboardSummary).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockSummary);
    expect(result.current.stats).toEqual(mockSummary.stats);
    expect(result.current.error).toBeNull();
  });

  it('sets error state when API fails — no mock data fallback', async () => {
    vi.mocked(analyticsApi.getDashboardSummary).mockRejectedValue(new Error('API down'));

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('API down');
    // CRITICAL: data must be null — no mock fallback
    expect(result.current.data).toBeNull();
  });

  it('does not auto-fetch when autoFetch is false', async () => {
    const { result } = renderHook(() => useDashboard({ autoFetch: false }));

    // Should remain in initial state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(analyticsApi.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('provides refresh function', async () => {
    vi.mocked(analyticsApi.getDashboardSummary).mockResolvedValue(mockSummary);

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Call refresh
    await result.current.refresh();

    expect(analyticsApi.getDashboardSummary).toHaveBeenCalledTimes(2);
  });
});
