/**
 * Google Classroom DTOs (Data Transfer Objects)
 *
 * Validation schemas for all Google Classroom API requests.
 *
 * @module google-classroom/dto
 */

import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// OAUTH DTOs
// ══════════════════════════════════════════════════════════════════════════════

export const ConnectGoogleClassroomSchema = z.object({
  redirectUrl: z.string().url().optional(),
  loginHint: z.string().email().optional(),
});

export type ConnectGoogleClassroomDto = z.infer<typeof ConnectGoogleClassroomSchema>;

export const OAuthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export type OAuthCallbackDto = z.infer<typeof OAuthCallbackSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// SYNC DTOs
// ══════════════════════════════════════════════════════════════════════════════

export const SyncCourseSchema = z.object({
  syncGuardians: z.boolean().optional().default(true),
  forceFullSync: z.boolean().optional().default(false),
  courseStates: z
    .array(z.enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED']))
    .optional(),
});

export type SyncCourseDto = z.infer<typeof SyncCourseSchema>;

export const ListCoursesSchema = z.object({
  state: z.enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED']).optional(),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  pageToken: z.string().optional(),
});

export type ListCoursesDto = z.infer<typeof ListCoursesSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENT DTOs
// ══════════════════════════════════════════════════════════════════════════════

export const PostAssignmentSchema = z.object({
  lessonId: z.string().uuid('Invalid lesson ID'),
  courseId: z.string().min(1, 'Course ID is required'),
  title: z.string().max(200).optional(),
  description: z.string().max(30000).optional(),
  dueDate: z.string().datetime().optional(),
  dueTime: z
    .object({
      hours: z.number().min(0).max(23),
      minutes: z.number().min(0).max(59),
    })
    .optional(),
  maxPoints: z.number().min(0).max(1000).optional(),
  scheduledTime: z.string().datetime().optional(),
  topicId: z.string().optional(),
});

export type PostAssignmentDto = z.infer<typeof PostAssignmentSchema>;

export const UpdateAssignmentSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(30000).optional(),
  dueDate: z.string().datetime().optional(),
  maxPoints: z.number().min(0).max(1000).optional(),
  state: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export type UpdateAssignmentDto = z.infer<typeof UpdateAssignmentSchema>;

export const ListAssignmentsSchema = z.object({
  courseId: z.string().optional(),
  lessonId: z.string().uuid().optional(),
  status: z.enum(['active', 'deleted', 'archived']).optional(),
});

export type ListAssignmentsDto = z.infer<typeof ListAssignmentsSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// GRADE PASSBACK DTOs
// ══════════════════════════════════════════════════════════════════════════════

export const UpdateGradeSchema = z
  .object({
    lessonId: z.string().uuid('Invalid lesson ID'),
    courseId: z.string().min(1, 'Course ID is required'),
    studentId: z.string().uuid('Invalid student ID'),
    grade: z.number().min(0).max(100).optional(),
    draftGrade: z.number().min(0).max(100).optional(),
    returnToStudent: z.boolean().optional().default(false),
  })
  .refine((data) => data.grade !== undefined || data.draftGrade !== undefined, {
    message: 'Either grade or draftGrade must be provided',
  });

export type UpdateGradeDto = z.infer<typeof UpdateGradeSchema>;

export const StudentGradeSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  grade: z.number().min(0).max(100),
});

export type StudentGradeDto = z.infer<typeof StudentGradeSchema>;

export const BatchGradePassbackSchema = z.object({
  lessonId: z.string().uuid('Invalid lesson ID'),
  courseId: z.string().min(1, 'Course ID is required'),
  grades: z.array(StudentGradeSchema).min(1, 'At least one grade is required'),
  returnToStudents: z.boolean().optional().default(false),
});

export type BatchGradePassbackDto = z.infer<typeof BatchGradePassbackSchema>;

export const AutoSyncGradesSchema = z.object({
  courseId: z.string().optional(),
  lessonId: z.string().uuid().optional(),
});

export type AutoSyncGradesDto = z.infer<typeof AutoSyncGradesSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// COURSE MAPPING DTOs
// ══════════════════════════════════════════════════════════════════════════════

export const CreateCourseMappingSchema = z.object({
  aivoClassId: z.string().uuid('Invalid AIVO class ID'),
  googleCourseId: z.string().min(1, 'Google Course ID is required'),
  autoSync: z.boolean().optional().default(true),
  syncDirection: z
    .enum(['google_to_aivo', 'aivo_to_google', 'bidirectional'])
    .optional()
    .default('google_to_aivo'),
});

export type CreateCourseMappingDto = z.infer<typeof CreateCourseMappingSchema>;

export const UpdateCourseMappingSchema = z.object({
  autoSync: z.boolean().optional(),
  syncDirection: z.enum(['google_to_aivo', 'aivo_to_google', 'bidirectional']).optional(),
});

export type UpdateCourseMappingDto = z.infer<typeof UpdateCourseMappingSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK DTOs
// ══════════════════════════════════════════════════════════════════════════════

export const WebhookNotificationSchema = z.object({
  message: z
    .object({
      data: z.string(), // Base64 encoded JSON
      messageId: z.string(),
      publishTime: z.string(),
      attributes: z.record(z.string()).optional(),
    })
    .optional(),
  subscription: z.string().optional(),
});

export type WebhookNotificationDto = z.infer<typeof WebhookNotificationSchema>;

export const RegisterWebhookSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  feedType: z
    .enum(['COURSE_ROSTER_CHANGES', 'COURSE_WORK_CHANGES'])
    .optional()
    .default('COURSE_ROSTER_CHANGES'),
});

export type RegisterWebhookDto = z.infer<typeof RegisterWebhookSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN DTOs
// ══════════════════════════════════════════════════════════════════════════════

export const DomainInstallationSchema = z.object({
  googleDomain: z.string().min(1, 'Domain is required'),
  adminEmail: z.string().email('Invalid admin email'),
  installationType: z.enum(['domain_wide', 'individual']).optional().default('individual'),
  serviceAccountEmail: z.string().email().optional(),
  serviceAccountKey: z.string().optional(), // JSON key file content
});

export type DomainInstallationDto = z.infer<typeof DomainInstallationSchema>;

export const SyncHistoryQuerySchema = z.object({
  courseId: z.string().optional(),
  status: z.enum(['success', 'failed', 'in_progress']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20),
});

export type SyncHistoryQueryDto = z.infer<typeof SyncHistoryQuerySchema>;

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ConnectionStatusResponse {
  connected: boolean;
  email?: string;
  scopes?: string[];
  expiresAt?: Date;
}

export interface CourseResponse {
  id: string;
  name: string;
  section?: string;
  description?: string;
  courseState: string;
  alternateLink?: string;
  syncStatus?: {
    synced: boolean;
    lastSyncAt?: Date;
    inProgress?: boolean;
  };
}

export interface SyncResultResponse {
  courseId: string;
  courseName?: string;
  success: boolean;
  studentsAdded: number;
  studentsRemoved: number;
  studentsUpdated: number;
  teachersAdded: number;
  teachersRemoved: number;
  guardiansAdded: number;
  errors: string[];
  warnings?: string[];
  duration: number;
  syncedAt?: Date;
}

export interface SyncBatchResultResponse {
  totalCourses: number;
  successful: number;
  failed: number;
  results: SyncResultResponse[];
  totalDuration: number;
  startedAt: Date;
  completedAt: Date;
}

export interface AssignmentLinkResponse {
  id: string;
  lessonId: string;
  lessonTitle?: string;
  googleCourseId: string;
  googleAssignmentId: string;
  title?: string;
  maxPoints?: number;
  dueDate?: Date;
  status: string;
  createdAt: Date;
  lesson?: {
    id: string;
    title: string;
    status: string;
    subject?: string;
  };
}

export interface GradePassbackResponse {
  success: boolean;
  studentId: string;
  grade?: number;
  error?: string;
}

export interface BatchGradePassbackResponse {
  succeeded: number;
  failed: number;
  errors: string[];
  results: GradePassbackResponse[];
}

export interface SyncHistoryEntry {
  id: string;
  courseId: string;
  courseName?: string;
  status: 'success' | 'failed' | 'in_progress';
  studentsAdded: number;
  studentsRemoved: number;
  teachersAdded: number;
  teachersRemoved: number;
  guardiansAdded: number;
  errors: string[];
  duration: number;
  syncedAt: Date;
  triggeredBy: string;
}

export interface SyncHistoryResponse {
  entries: SyncHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
