import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the api module used by caregiver-hooks (relative import from lib/)
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the api/client (isDevMode)
vi.mock('@/lib/api/client', () => ({
  isDevMode: () => false,
}));

import { api } from '@/lib/api';
import {
  caregiverQueryKeys,
  DEFAULT_CAREGIVER_PERMISSIONS,
  CAREGIVER_RELATIONSHIP_LABELS,
  PERMISSION_LABELS,
  useStudentCaregivers,
  useCaregiverLimit,
  useCreateCaregiverInvite,
} from '@/lib/caregiver-hooks';

const mockedApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Pure constants & query keys
// ============================================================================
describe('caregiverQueryKeys', () => {
  it('creates caregivers key for a student', () => {
    expect(caregiverQueryKeys.caregivers('stu-1')).toEqual(['caregivers', 'stu-1']);
  });

  it('creates limit key for a student', () => {
    expect(caregiverQueryKeys.limit('stu-1')).toEqual(['caregivers', 'limit', 'stu-1']);
  });
});

describe('DEFAULT_CAREGIVER_PERMISSIONS', () => {
  it('grants viewProgress, viewGrades, viewActivity, viewAchievements by default', () => {
    expect(DEFAULT_CAREGIVER_PERMISSIONS.viewProgress).toBe(true);
    expect(DEFAULT_CAREGIVER_PERMISSIONS.viewGrades).toBe(true);
    expect(DEFAULT_CAREGIVER_PERMISSIONS.viewActivity).toBe(true);
    expect(DEFAULT_CAREGIVER_PERMISSIONS.viewAchievements).toBe(true);
  });

  it('enables notifications but restricts teacher notes by default', () => {
    expect(DEFAULT_CAREGIVER_PERMISSIONS.receiveNotifications).toBe(true);
    expect(DEFAULT_CAREGIVER_PERMISSIONS.viewTeacherNotes).toBe(false);
  });
});

describe('CAREGIVER_RELATIONSHIP_LABELS', () => {
  it('maps all relationship types to human labels', () => {
    expect(CAREGIVER_RELATIONSHIP_LABELS.grandparent).toBe('Grandparent');
    expect(CAREGIVER_RELATIONSHIP_LABELS.nanny).toBe('Nanny/Au Pair');
    expect(CAREGIVER_RELATIONSHIP_LABELS.aunt_uncle).toBe('Aunt/Uncle');
    expect(CAREGIVER_RELATIONSHIP_LABELS.family_friend).toBe('Family Friend');
    expect(CAREGIVER_RELATIONSHIP_LABELS.other).toBe('Other');
  });
});

describe('PERMISSION_LABELS', () => {
  it('provides label and description for every permission key', () => {
    const keys = Object.keys(DEFAULT_CAREGIVER_PERMISSIONS) as (keyof typeof PERMISSION_LABELS)[];
    for (const key of keys) {
      expect(PERMISSION_LABELS[key]).toBeDefined();
      expect(PERMISSION_LABELS[key].label).toBeTruthy();
      expect(PERMISSION_LABELS[key].description).toBeTruthy();
    }
  });
});

// ============================================================================
// Hook tests
// ============================================================================
describe('useStudentCaregivers', () => {
  it('fetches caregiver summary for a given student', async () => {
    const summary = {
      studentId: 'stu-1',
      studentName: 'Alice',
      maxCaregivers: 3,
      currentCount: 2,
      remainingSlots: 1,
      caregivers: [],
      pendingInvites: [],
    };
    mockedApi.get.mockResolvedValueOnce(summary);

    const { result } = renderHook(() => useStudentCaregivers('stu-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ studentId: 'stu-1', remainingSlots: 1 });
  });

  it('is disabled when studentId is null', () => {
    const { result } = renderHook(() => useStudentCaregivers(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCaregiverLimit', () => {
  it('fetches limit info for a student', async () => {
    const limit = { studentId: 'stu-1', maxCaregivers: 3, currentCount: 2, remainingSlots: 1, canAddMore: true };
    mockedApi.get.mockResolvedValueOnce(limit);

    const { result } = renderHook(() => useCaregiverLimit('stu-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.canAddMore).toBe(true);
  });

  it('allows up to 3 caregivers per child by default', async () => {
    const limit = {
      studentId: 'stu-1',
      maxCaregivers: 3,
      currentCount: 0,
      remainingSlots: 3,
      canAddMore: true,
    };
    mockedApi.get.mockResolvedValueOnce(limit);

    const { result } = renderHook(() => useCaregiverLimit('stu-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.maxCaregivers).toBe(3);
    expect(result.current.data?.canAddMore).toBe(true);
  });

  it('blocks invitations when limit reached', async () => {
    const limit = {
      studentId: 'stu-1',
      maxCaregivers: 3,
      currentCount: 3,
      remainingSlots: 0,
      canAddMore: false,
    };
    mockedApi.get.mockResolvedValueOnce(limit);

    const { result } = renderHook(() => useCaregiverLimit('stu-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.canAddMore).toBe(false);
  });
});

describe('useCreateCaregiverInvite', () => {
  it('posts invite and returns invite details', async () => {
    const response = { inviteId: 'inv-1', inviteCode: 'ABC123', inviteUrl: 'https://app/invite/ABC123', expiresAt: '2026-04-01' };
    mockedApi.post.mockResolvedValueOnce(response);

    const { result } = renderHook(() => useCreateCaregiverInvite(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      studentId: 'stu-1',
      caregiverEmail: 'grandma@example.com',
      relationship: 'grandparent',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.inviteCode).toBe('ABC123');
  });
});
