/**
 * React Query Hooks for Caregiver Delegation
 *
 * These hooks manage caregiver invitations, permissions, and access control.
 * Sprint 4.1: Updated to import isDevMode from api/client instead of deprecated mock-data.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { isDevMode } from './api/client';

// ============================================================================
// TYPES
// ============================================================================

export interface CaregiverPermissions {
  viewProgress: boolean;
  viewGrades: boolean;
  viewActivity: boolean;
  viewAchievements: boolean;
  receiveNotifications: boolean;
  viewTeacherNotes: boolean;
}

export type CaregiverRelationship =
  | 'caregiver'
  | 'grandparent'
  | 'nanny'
  | 'aunt_uncle'
  | 'family_friend'
  | 'other';

export interface Caregiver {
  id: string;
  email: string;
  givenName: string;
  familyName: string;
  photoUrl: string | null;
  relationship: CaregiverRelationship;
  status: 'active' | 'pending' | 'revoked';
  permissions: CaregiverPermissions;
  delegatedAt: string;
}

export interface CaregiverInvite {
  id: string;
  caregiverEmail: string;
  caregiverName: string | null;
  relationship: CaregiverRelationship;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  permissions: CaregiverPermissions;
  expiresAt: string;
  createdAt: string;
}

export interface StudentCaregiverSummary {
  studentId: string;
  studentName: string;
  maxCaregivers: number;
  currentCount: number;
  remainingSlots: number;
  caregivers: Caregiver[];
  pendingInvites: CaregiverInvite[];
}

export interface CaregiverLimitInfo {
  studentId: string;
  maxCaregivers: number;
  currentCount: number;
  remainingSlots: number;
  canAddMore: boolean;
}

export interface CreateCaregiverInviteDto {
  studentId: string;
  caregiverEmail: string;
  caregiverName?: string;
  relationship?: CaregiverRelationship;
  permissions?: Partial<CaregiverPermissions>;
  message?: string;
}

export interface CreateCaregiverInviteResponse {
  inviteId: string;
  inviteCode: string;
  inviteUrl: string;
  expiresAt: string;
}

export interface UpdateCaregiverPermissionsDto {
  caregiverId: string;
  studentId: string;
  viewProgress?: boolean;
  viewGrades?: boolean;
  viewActivity?: boolean;
  viewAchievements?: boolean;
  receiveNotifications?: boolean;
  viewTeacherNotes?: boolean;
}

export interface RevokeCaregiverAccessDto {
  caregiverId: string;
  studentId: string;
  reason?: string;
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const caregiverQueryKeys = {
  caregivers: (studentId: string) => ['caregivers', studentId] as const,
  limit: (studentId: string) => ['caregivers', 'limit', studentId] as const,
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to fetch caregivers and pending invites for a student
 */
export function useStudentCaregivers(studentId: string | null) {
  return useQuery({
    queryKey: caregiverQueryKeys.caregivers(studentId || ''),
    queryFn: async (): Promise<StudentCaregiverSummary> => {
      if (!studentId) {
        throw new Error('No student selected');
      }

      const data = await api.get<StudentCaregiverSummary>(`/api/caregivers?studentId=${studentId}`);
      return data;
    },
    enabled: !!studentId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch caregiver limit info for a student
 */
export function useCaregiverLimit(studentId: string | null) {
  return useQuery({
    queryKey: caregiverQueryKeys.limit(studentId || ''),
    queryFn: async (): Promise<CaregiverLimitInfo> => {
      if (!studentId) {
        throw new Error('No student selected');
      }

      const data = await api.get<CaregiverLimitInfo>(`/api/caregivers/limit/${studentId}`);
      return data;
    },
    enabled: !!studentId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a caregiver invitation
 */
export function useCreateCaregiverInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateCaregiverInviteDto): Promise<CreateCaregiverInviteResponse> => {
      const data = await api.post<CreateCaregiverInviteResponse>('/api/caregivers', dto);
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate caregivers list to refresh
      queryClient.invalidateQueries({ queryKey: caregiverQueryKeys.caregivers(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: caregiverQueryKeys.limit(variables.studentId) });
    },
  });
}

/**
 * Hook to update caregiver permissions
 */
export function useUpdateCaregiverPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: UpdateCaregiverPermissionsDto): Promise<void> => {
      await api.put('/api/caregivers/permissions', dto);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: caregiverQueryKeys.caregivers(variables.studentId) });
    },
  });
}

/**
 * Hook to revoke caregiver access
 */
export function useRevokeCaregiverAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: RevokeCaregiverAccessDto): Promise<void> => {
      await api.delete(`/api/caregivers/access/${dto.studentId}/${dto.caregiverId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: caregiverQueryKeys.caregivers(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: caregiverQueryKeys.limit(variables.studentId) });
    },
  });
}

/**
 * Hook to resend a caregiver invitation
 */
export function useResendCaregiverInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteId, studentId }: { inviteId: string; studentId: string }): Promise<void> => {
      await api.post(`/api/caregivers/invite/${inviteId}`, {});
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: caregiverQueryKeys.caregivers(variables.studentId) });
    },
  });
}

/**
 * Hook to cancel a pending caregiver invitation
 */
export function useCancelCaregiverInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteId, studentId }: { inviteId: string; studentId: string }): Promise<void> => {
      await api.delete(`/api/caregivers/invite/${inviteId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: caregiverQueryKeys.caregivers(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: caregiverQueryKeys.limit(variables.studentId) });
    },
  });
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_CAREGIVER_PERMISSIONS: CaregiverPermissions = {
  viewProgress: true,
  viewGrades: true,
  viewActivity: true,
  viewAchievements: true,
  receiveNotifications: true,
  viewTeacherNotes: false,
};

export const CAREGIVER_RELATIONSHIP_LABELS: Record<CaregiverRelationship, string> = {
  caregiver: 'Caregiver',
  grandparent: 'Grandparent',
  nanny: 'Nanny/Au Pair',
  aunt_uncle: 'Aunt/Uncle',
  family_friend: 'Family Friend',
  other: 'Other',
};

export const PERMISSION_LABELS: Record<keyof CaregiverPermissions, { label: string; description: string }> = {
  viewProgress: {
    label: 'View Progress',
    description: "See your child's learning progress and mastery levels",
  },
  viewGrades: {
    label: 'View Grades',
    description: "See your child's grades and scores",
  },
  viewActivity: {
    label: 'View Activity',
    description: "See your child's daily learning activity and time spent",
  },
  viewAchievements: {
    label: 'View Achievements',
    description: 'See badges and achievements earned',
  },
  receiveNotifications: {
    label: 'Receive Notifications',
    description: 'Get email notifications about progress and achievements',
  },
  viewTeacherNotes: {
    label: 'View Teacher Notes',
    description: 'See notes from teachers (when shared)',
  },
};
