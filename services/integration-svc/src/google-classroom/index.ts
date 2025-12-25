/**
 * Google Classroom Integration Module
 *
 * This module provides comprehensive Google Classroom integration for AIVO,
 * enabling bi-directional roster sync, assignment posting, and grade passback.
 *
 * ## Features
 *
 * - **OAuth 2.0 Authentication**: Secure teacher authentication with Google
 * - **Roster Sync**: Bi-directional sync of classes, students, teachers, and guardians
 * - **Real-time Updates**: Webhook-based sync for roster changes
 * - **Assignment Posting**: Post AIVO lessons as Google Classroom assignments
 * - **Grade Passback**: Automatic and manual grade sync to Classroom gradebook
 * - **Domain-wide Installation**: Admin console for managing integrations at scale
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   GoogleClassroomService,
 *   AssignmentSyncService,
 *   registerGoogleClassroomRoutes,
 * } from './google-classroom';
 *
 * // Initialize services
 * const googleService = new GoogleClassroomService(prisma, config);
 * const assignmentService = new AssignmentSyncService(prisma, googleService);
 *
 * // Register routes
 * registerGoogleClassroomRoutes(app, { googleService, assignmentService });
 * ```
 *
 * ## Configuration
 *
 * Required environment variables:
 * - `GOOGLE_CLIENT_ID`: OAuth client ID from Google Cloud Console
 * - `GOOGLE_CLIENT_SECRET`: OAuth client secret
 * - `GOOGLE_REDIRECT_URI`: OAuth callback URL
 * - `GOOGLE_WEBHOOK_URL`: URL for receiving webhook notifications
 *
 * @module google-classroom
 */

// Core Services
import { AssignmentSyncService } from './assignment-sync.service.js';
import { GoogleClassroomService } from './google-classroom.service.js';
import { registerGoogleClassroomRoutes } from './routes.js';
import { ScheduledSyncJob, GradeSyncJob } from './scheduled-sync.js';

export { GoogleClassroomService } from './google-classroom.service.js';
export { AssignmentSyncService } from './assignment-sync.service.js';

// Scheduled Jobs
export { ScheduledSyncJob, GradeSyncJob } from './scheduled-sync.js';

// Error Handling
export {
  GoogleClassroomErrorHandler,
  ErrorCodes,
  parseGoogleError,
  withRetry,
  createErrorLogEntry,
} from './error-handler.js';
export type {
  ErrorCode,
  ParsedGoogleError,
  RetryConfig,
  RetryOptions,
  ErrorLogEntry,
} from './error-handler.js';

// Types
export type {
  // Configuration
  GoogleClassroomConfig,

  // Course types
  ClassroomCourse,
  ClassroomStudent,
  ClassroomTeacher,
  ClassroomGuardian,
  ClassroomUserProfile,

  // Assignment types
  ClassroomAssignment,
  ClassroomSubmission,
  SubmissionState,
  AssignmentPostRequest,
  AssignmentLinkRecord,

  // Sync types
  SyncOptions,
  SyncResult,
  SyncBatchResult,

  // Grade types
  GradePassbackRequest,
  GradePassbackResult,

  // Webhook types
  WebhookNotification,
  WebhookRegistration,

  // OAuth types
  GoogleOAuthTokens as OAuthTokens,
  StoredCredential,

  // Pagination
  PaginatedResult,
} from './types.js';

export { GoogleClassroomError } from './types.js';

// DTOs
export {
  // OAuth
  ConnectGoogleClassroomSchema,
  OAuthCallbackSchema,

  // Courses
  ListCoursesSchema,
  SyncCourseSchema,

  // Assignments
  PostAssignmentSchema,
  UpdateAssignmentSchema,
  DeleteAssignmentSchema,

  // Grades
  UpdateGradeSchema,
  BatchGradePassbackSchema,

  // Mappings
  CreateCourseMappingSchema,
  UpdateCourseMappingSchema,

  // Admin
  DomainInstallationSchema,
  SyncHistoryQuerySchema,
} from './dto.js';

// Routes
export { registerGoogleClassroomRoutes } from './routes.js';

// Re-export route types for consumers
export type { GoogleClassroomRouteOptions } from './routes.js';

/**
 * Create a fully configured Google Classroom integration
 *
 * @param prisma - Prisma client instance
 * @param config - Google Classroom configuration
 * @returns Object containing all services and a route registration function
 *
 * @example
 * ```typescript
 * const gc = createGoogleClassroomIntegration(prisma, {
 *   clientId: process.env.GOOGLE_CLIENT_ID!,
 *   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
 *   redirectUri: process.env.GOOGLE_REDIRECT_URI!,
 *   webhookUrl: process.env.GOOGLE_WEBHOOK_URL!,
 * });
 *
 * // Register routes
 * gc.registerRoutes(app);
 *
 * // Start scheduled jobs
 * gc.startScheduledJobs();
 * ```
 */
export function createGoogleClassroomIntegration(
  prisma: any,
  config: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    webhookUrl: string;
    appBaseUrl: string;
    frontendUrl: string;
  }
) {
  const googleService = new GoogleClassroomService(prisma, config);
  const assignmentService = new AssignmentSyncService(prisma, googleService, config.appBaseUrl);
  const scheduledSync = new ScheduledSyncJob(prisma, googleService, assignmentService);
  const gradeSync = new GradeSyncJob(prisma, assignmentService);

  return {
    googleService,
    assignmentService,
    scheduledSync,
    gradeSync,

    /**
     * Register Google Classroom routes on a Fastify app
     */
    registerRoutes(app: any) {
      return registerGoogleClassroomRoutes(app, {
        googleClassroomService: googleService,
        assignmentSyncService: assignmentService,
        frontendUrl: config.frontendUrl,
      });
    },

    /**
     * Start scheduled sync jobs
     */
    startScheduledJobs() {
      scheduledSync.start();
      gradeSync.start();
    },

    /**
     * Stop scheduled sync jobs
     */
    stopScheduledJobs() {
      scheduledSync.stop();
      gradeSync.stop();
    },
  };
}
