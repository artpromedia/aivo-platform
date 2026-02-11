/**
 * Tests for TanStack Query hooks (lib/hooks/use-learner-api.ts).
 *
 * Wraps each hook in a QueryClientProvider and mocks the underlying
 * API client functions.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  useDashboard,
  useCourses,
  useGames,
  useProgress,
  useProfile,
  useGoals,
  useAssessments,
} from '../lib/hooks/use-learner-api';

// ── Mock the API client module ───────────────────────────

vi.mock('../lib/api-client', () => ({
  fetchDashboard: vi.fn(),
  fetchCourses: vi.fn(),
  fetchGames: vi.fn(),
  fetchProgress: vi.fn(),
  fetchProfile: vi.fn(),
  updateAvatar: vi.fn(),
  fetchGoals: vi.fn(),
  fetchAssessments: vi.fn(),
  ApiError: class extends Error {
    status: number;
    constructor(status: number, msg: string) {
      super(msg);
      this.status = status;
    }
  },
}));

import {
  fetchDashboard,
  fetchCourses,
  fetchGames,
  fetchProgress,
  fetchProfile,
  fetchGoals,
  fetchAssessments,
} from '../lib/api-client';

// ── Helper: create a wrapper with fresh QueryClient ──────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── useDashboard ─────────────────────────────────────────

describe('useDashboard', () => {
  it('fetches and returns dashboard data', async () => {
    const mockData = {
      continueLearning: [],
      dailyGoals: [],
      achievements: [],
      upcoming: [],
      streakDays: 3,
      totalXp: 100,
      firstName: 'Test',
    };
    vi.mocked(fetchDashboard).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });
});

// ── useCourses ───────────────────────────────────────────

describe('useCourses', () => {
  it('fetches and returns courses', async () => {
    const mockCourses = [{ id: 'c1', title: 'Math 5' }];
    vi.mocked(fetchCourses).mockResolvedValueOnce(mockCourses as never);

    const { result } = renderHook(() => useCourses(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCourses);
  });
});

// ── useGames ─────────────────────────────────────────────

describe('useGames', () => {
  it('fetches and returns games data', async () => {
    const mockData = { games: [{ id: 'g1' }], dailyChallenge: null };
    vi.mocked(fetchGames).mockResolvedValueOnce(mockData as never);

    const { result } = renderHook(() => useGames(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.games).toHaveLength(1);
  });
});

// ── useProgress ──────────────────────────────────────────

describe('useProgress', () => {
  it('fetches and returns progress data', async () => {
    const mockData = {
      weeklyStats: [],
      subjectProgress: [],
      skills: [],
      recentActivity: [],
      streakDays: 5,
      lessonsCompleted: 10,
    };
    vi.mocked(fetchProgress).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useProgress(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.streakDays).toBe(5);
  });
});

// ── useProfile ───────────────────────────────────────────

describe('useProfile', () => {
  it('fetches and returns profile data', async () => {
    const mockData = {
      learner: { firstName: 'Test', avatar: '🦸' },
      stats: { lessonsCompleted: 5 },
      journey: [],
    };
    vi.mocked(fetchProfile).mockResolvedValueOnce(mockData as never);

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.learner.firstName).toBe('Test');
  });
});

// ── useGoals ─────────────────────────────────────────────

describe('useGoals', () => {
  it('fetches and returns goals data', async () => {
    const mockData = { active: [], completed: [], firstName: 'Test' };
    vi.mocked(fetchGoals).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useGoals(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.active).toEqual([]);
  });
});

// ── useAssessments ───────────────────────────────────────

describe('useAssessments', () => {
  it('fetches and returns assessments data', async () => {
    const mockData = { upcoming: [], completed: [], firstName: 'Test' };
    vi.mocked(fetchAssessments).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useAssessments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.upcoming).toEqual([]);
  });
});
