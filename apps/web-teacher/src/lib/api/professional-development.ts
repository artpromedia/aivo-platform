/**
 * Professional Development API Client
 *
 * Handles PD programs, enrollments, requirements, compliance, and certifications
 */

import { api } from './client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type PDProgramStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type PDEnrollmentStatus = 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'WITHDRAWN';
export type PDRequirementStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export interface PDProgram {
  id: string;
  title: string;
  description: string;
  category: string;
  creditHours: number;
  estimatedDuration: number; // minutes
  status: PDProgramStatus;
  modules: PDModule[];
  requirements: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PDModule {
  id: string;
  title: string;
  description: string;
  order: number;
  durationMinutes: number;
  contentType: 'VIDEO' | 'READING' | 'QUIZ' | 'ACTIVITY' | 'DISCUSSION';
  contentUrl?: string;
  isRequired: boolean;
}

export interface PDEnrollment {
  id: string;
  programId: string;
  program?: PDProgram;
  teacherId: string;
  status: PDEnrollmentStatus;
  progress: number; // 0-100
  completedModules: string[];
  startedAt: string;
  completedAt?: string;
  dueDate?: string;
  certificateId?: string;
}

export interface PDRequirement {
  id: string;
  title: string;
  description: string;
  category: string;
  creditHoursRequired: number;
  creditHoursCompleted: number;
  dueDate: string;
  status: PDRequirementStatus;
  programIds: string[];
}

export interface PDCertificate {
  id: string;
  enrollmentId: string;
  programTitle: string;
  teacherName: string;
  creditHours: number;
  issuedAt: string;
  expiresAt?: string;
  certificateNumber: string;
  downloadUrl?: string;
}

export interface PDComplianceStatus {
  isCompliant: boolean;
  totalRequirements: number;
  completedRequirements: number;
  overdueRequirements: number;
  upcomingDeadlines: Array<{
    requirement: PDRequirement;
    daysUntilDue: number;
  }>;
  creditHoursSummary: {
    required: number;
    completed: number;
    inProgress: number;
  };
}

export interface PDProgress {
  totalPrograms: number;
  completedPrograms: number;
  inProgressPrograms: number;
  totalCreditHours: number;
  earnedCreditHours: number;
  currentStreak: number;
  lastActivityAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAMS API
// ═══════════════════════════════════════════════════════════════════════════════

export const pdProgramsApi = {
  list: (params?: { category?: string; status?: PDProgramStatus }) =>
    api.get<{ programs: PDProgram[] }>('/pd/programs', params),

  get: (id: string) =>
    api.get<{ program: PDProgram }>(`/pd/programs/${id}`),

  getRecommended: () =>
    api.get<{ programs: PDProgram[] }>('/pd/programs/recommended'),

  search: (query: string) =>
    api.get<{ programs: PDProgram[] }>('/pd/programs/search', { q: query }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENROLLMENTS API
// ═══════════════════════════════════════════════════════════════════════════════

export const pdEnrollmentsApi = {
  list: (params?: { status?: PDEnrollmentStatus }) =>
    api.get<{ enrollments: PDEnrollment[] }>('/pd/enrollments', params),

  get: (id: string) =>
    api.get<{ enrollment: PDEnrollment }>(`/pd/enrollments/${id}`),

  enroll: (programId: string) =>
    api.post<{ enrollment: PDEnrollment }>('/pd/enrollments', { programId }),

  completeModule: (enrollmentId: string, moduleId: string) =>
    api.post<{ enrollment: PDEnrollment }>(
      `/pd/enrollments/${enrollmentId}/modules/${moduleId}/complete`
    ),

  withdraw: (enrollmentId: string, reason?: string) =>
    api.post<{ enrollment: PDEnrollment }>(
      `/pd/enrollments/${enrollmentId}/withdraw`,
      { reason }
    ),

  getProgress: () =>
    api.get<{ progress: PDProgress }>('/pd/enrollments/progress'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// REQUIREMENTS API
// ═══════════════════════════════════════════════════════════════════════════════

export const pdRequirementsApi = {
  list: () =>
    api.get<{ requirements: PDRequirement[] }>('/pd/requirements'),

  get: (id: string) =>
    api.get<{ requirement: PDRequirement }>(`/pd/requirements/${id}`),

  getCompliance: () =>
    api.get<{ compliance: PDComplianceStatus }>('/pd/compliance'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// CERTIFICATIONS API
// ═══════════════════════════════════════════════════════════════════════════════

export const pdCertificatesApi = {
  list: () =>
    api.get<{ certificates: PDCertificate[] }>('/pd/certifications'),

  get: (id: string) =>
    api.get<{ certificate: PDCertificate }>(`/pd/certifications/${id}`),

  download: async (id: string): Promise<Blob> => {
    const response = await fetch(`/pd/certifications/${id}/download`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to download certificate');
    }
    return response.blob();
  },

  verify: (certificateNumber: string) =>
    api.get<{ valid: boolean; certificate?: PDCertificate }>(
      `/pd/certifications/verify/${certificateNumber}`
    ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS API
// ═══════════════════════════════════════════════════════════════════════════════

export const pdReportsApi = {
  getMyReport: (params?: { startDate?: string; endDate?: string }) =>
    api.get<{
      report: {
        period: { start: string; end: string };
        summary: PDProgress;
        enrollments: PDEnrollment[];
        certificates: PDCertificate[];
        requirements: PDRequirement[];
      };
    }>('/pd/reports/me', params),

  exportReport: async (format: 'pdf' | 'csv'): Promise<Blob> => {
    const response = await fetch(`/pd/reports/me/export?format=${format}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to export report');
    }
    return response.blob();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate progress percentage
 */
export function calculateProgress(enrollment: PDEnrollment): number {
  if (!enrollment.program?.modules.length) return enrollment.progress;
  return Math.round(
    (enrollment.completedModules.length / enrollment.program.modules.length) * 100
  );
}

/**
 * Check if a requirement is at risk (due within 30 days)
 */
export function isRequirementAtRisk(requirement: PDRequirement): boolean {
  if (requirement.status === 'COMPLETED') return false;
  const dueDate = new Date(requirement.dueDate);
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return daysUntilDue <= 30 && daysUntilDue > 0;
}

/**
 * Get status color for display
 */
export function getStatusColor(status: PDEnrollmentStatus | PDRequirementStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'green';
    case 'IN_PROGRESS':
      return 'blue';
    case 'ENROLLED':
    case 'NOT_STARTED':
      return 'gray';
    case 'OVERDUE':
    case 'WITHDRAWN':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Format credit hours for display
 */
export function formatCreditHours(hours: number): string {
  if (hours === 1) return '1 credit hour';
  return `${hours} credit hours`;
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
