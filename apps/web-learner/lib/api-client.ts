/**
 * Centralized API client for the web-learner app.
 *
 * All client-side data fetching goes through this module.
 * Cookies (including aivo_access_token) are sent automatically
 * via credentials: 'include' on same-origin requests.
 */

import type {
  AssessmentsData,
  Course,
  DashboardData,
  GamesData,
  GoalsData,
  LearnerSettings,
  ProfileData,
  ProgressData,
} from './types';

// ────────────────────────────────────────────────────────────
// Error handling
// ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ────────────────────────────────────────────────────────────
// Base fetch helper
// ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const extraHeaders = options?.headers
    ? Object.fromEntries(new Headers(options.headers).entries())
    : {};
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => 'Unknown error');
    throw new ApiError(res.status, body);
  }

  return res.json() as Promise<T>;
}

// ────────────────────────────────────────────────────────────
// Dashboard
// ────────────────────────────────────────────────────────────

export function fetchDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/api/learner/dashboard');
}

// ────────────────────────────────────────────────────────────
// Courses
// ────────────────────────────────────────────────────────────

export function fetchCourses(): Promise<Course[]> {
  return apiFetch<Course[]>('/api/learner/courses');
}

// ────────────────────────────────────────────────────────────
// Games
// ────────────────────────────────────────────────────────────

export function fetchGames(): Promise<GamesData> {
  return apiFetch<GamesData>('/api/learner/games');
}

// ────────────────────────────────────────────────────────────
// Progress
// ────────────────────────────────────────────────────────────

export function fetchProgress(): Promise<ProgressData> {
  return apiFetch<ProgressData>('/api/learner/progress');
}

// ────────────────────────────────────────────────────────────
// Profile
// ────────────────────────────────────────────────────────────

export function fetchProfile(): Promise<ProfileData> {
  return apiFetch<ProfileData>('/api/learner/profile-full');
}

export function updateAvatar(avatar: string): Promise<{ avatar: string }> {
  return apiFetch<{ avatar: string }>('/api/learner/profile-full', {
    method: 'PATCH',
    body: JSON.stringify({ avatar }),
  });
}

// ────────────────────────────────────────────────────────────
// Goals
// ────────────────────────────────────────────────────────────

export function fetchGoals(): Promise<GoalsData> {
  return apiFetch<GoalsData>('/api/learner/goals');
}

// ────────────────────────────────────────────────────────────
// Assessments
// ────────────────────────────────────────────────────────────

export function fetchAssessments(): Promise<AssessmentsData> {
  return apiFetch<AssessmentsData>('/api/learner/assessments');
}

// ────────────────────────────────────────────────────────────
// Settings
// ────────────────────────────────────────────────────────────

export function fetchSettings(): Promise<LearnerSettings> {
  return apiFetch<LearnerSettings>('/api/learner/settings');
}

export function updateSettings(
  settings: Partial<LearnerSettings>,
): Promise<LearnerSettings> {
  return apiFetch<LearnerSettings>('/api/learner/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}
