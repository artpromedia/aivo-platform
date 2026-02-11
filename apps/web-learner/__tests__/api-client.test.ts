/**
 * Tests for the centralized API client (lib/api-client.ts).
 *
 * Uses global fetch mocking — no MSW needed for unit tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchDashboard,
  fetchCourses,
  fetchGames,
  fetchProgress,
  fetchProfile,
  fetchGoals,
  fetchAssessments,
  ApiError,
} from '../lib/api-client';

// ── Mock fetch globally ──────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonOk(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

function jsonError(status: number, msg = 'error') {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: msg }),
    text: () => Promise.resolve(msg),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ── Dashboard ────────────────────────────────────────────

describe('fetchDashboard', () => {
  it('returns dashboard data on success', async () => {
    const body = {
      continueLearning: [],
      dailyGoals: [],
      achievements: [],
      upcoming: [],
      streakDays: 3,
      totalXp: 500,
      firstName: 'Alex',
    };
    mockFetch.mockResolvedValueOnce(jsonOk(body));

    const data = await fetchDashboard();
    expect(data).toEqual(body);
    expect(mockFetch).toHaveBeenCalledWith('/api/learner/dashboard', expect.objectContaining({
      credentials: 'include',
    }));
  });

  it('throws ApiError on 401', async () => {
    mockFetch.mockResolvedValueOnce(jsonError(401, 'Unauthorized'));

    await expect(fetchDashboard()).rejects.toThrow(ApiError);
    await expect(fetchDashboard()).rejects.toThrow(); // re-mock needed
  });
});

// ── Courses ──────────────────────────────────────────────

describe('fetchCourses', () => {
  it('returns array of courses', async () => {
    const courses = [{ id: 'c1', title: 'Math 5', progress: 45 }];
    mockFetch.mockResolvedValueOnce(jsonOk(courses));

    const data = await fetchCourses();
    expect(data).toEqual(courses);
  });
});

// ── Games ────────────────────────────────────────────────

describe('fetchGames', () => {
  it('returns games + daily challenge', async () => {
    const body = { games: [{ id: 'g1' }], dailyChallenge: null };
    mockFetch.mockResolvedValueOnce(jsonOk(body));

    const data = await fetchGames();
    expect(data.games).toHaveLength(1);
    expect(data.dailyChallenge).toBeNull();
  });
});

// ── Progress ─────────────────────────────────────────────

describe('fetchProgress', () => {
  it('returns progress data', async () => {
    const body = {
      weeklyStats: [],
      subjectProgress: [],
      skills: [],
      recentActivity: [],
      streakDays: 5,
      lessonsCompleted: 10,
    };
    mockFetch.mockResolvedValueOnce(jsonOk(body));

    const data = await fetchProgress();
    expect(data.streakDays).toBe(5);
  });
});

// ── Profile ──────────────────────────────────────────────

describe('fetchProfile', () => {
  it('returns profile data', async () => {
    const body = {
      learner: { firstName: 'Alex', xp: 100 },
      stats: { lessonsCompleted: 5 },
      journey: [],
    };
    mockFetch.mockResolvedValueOnce(jsonOk(body));

    const data = await fetchProfile();
    expect(data.learner.firstName).toBe('Alex');
  });
});

// ── Goals ────────────────────────────────────────────────

describe('fetchGoals', () => {
  it('returns goals data', async () => {
    const body = { active: [], completed: [], firstName: 'Alex' };
    mockFetch.mockResolvedValueOnce(jsonOk(body));

    const data = await fetchGoals();
    expect(data.active).toEqual([]);
  });
});

// ── Assessments ──────────────────────────────────────────

describe('fetchAssessments', () => {
  it('returns assessments data', async () => {
    const body = { upcoming: [], completed: [], firstName: 'Alex' };
    mockFetch.mockResolvedValueOnce(jsonOk(body));

    const data = await fetchAssessments();
    expect(data.upcoming).toEqual([]);
  });
});

// ── Error handling ───────────────────────────────────────

describe('ApiError', () => {
  it('carries status and message', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('ApiError');
  });

  it('is thrown on non-ok responses', async () => {
    mockFetch.mockResolvedValueOnce(jsonError(500, 'Internal server error'));

    try {
      await fetchDashboard();
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(500);
    }
  });
});
