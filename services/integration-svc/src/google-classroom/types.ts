/**
 * Google Classroom Integration Types
 *
 * Type definitions for all Google Classroom API interactions including:
 * - Course and roster data structures
 * - Assignment and submission types
 * - Sync operation results
 * - Grade passback requests
 */

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export interface GoogleClassroomConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  projectId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// COURSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type CourseState = 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED';

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  description?: string;
  descriptionHeading?: string;
  room?: string;
  ownerId: string;
  courseState: CourseState;
  alternateLink?: string;
  creationTime?: Date;
  updateTime?: Date;
  enrollmentCode?: string;
  calendarId?: string;
  guardiansEnabled?: boolean;
  courseGroupEmail?: string;
  teacherGroupEmail?: string;
}

export interface ClassroomCourseMaterial {
  driveFile?: {
    driveFile: {
      id: string;
      title?: string;
      alternateLink?: string;
      thumbnailUrl?: string;
    };
    shareMode?: 'VIEW' | 'EDIT' | 'STUDENT_COPY';
  };
  youtubeVideo?: {
    id: string;
    title?: string;
    alternateLink?: string;
    thumbnailUrl?: string;
  };
  link?: {
    url: string;
    title?: string;
    thumbnailUrl?: string;
  };
  form?: {
    formUrl: string;
    title?: string;
    responseUrl?: string;
    thumbnailUrl?: string;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// USER PROFILE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ClassroomUserName {
  givenName: string;
  familyName: string;
  fullName: string;
}

export interface ClassroomUserProfile {
  id: string;
  name?: ClassroomUserName;
  emailAddress: string;
  photoUrl?: string;
  permissions?: {
    permission: string;
  }[];
  verifiedTeacher?: boolean;
}

export interface ClassroomStudent {
  courseId: string;
  userId: string;
  emailAddress: string;
  profile?: ClassroomUserProfile;
  studentWorkFolder?: {
    id: string;
    title?: string;
    alternateLink?: string;
  };
}

export interface ClassroomTeacher {
  courseId: string;
  userId: string;
  emailAddress: string;
  profile?: ClassroomUserProfile;
}

export interface ClassroomGuardian {
  studentId: string;
  guardianId: string;
  guardianProfile?: ClassroomUserProfile;
  invitedEmailAddress: string;
}

export interface ClassroomInvitation {
  id: string;
  userId: string;
  courseId: string;
  role: 'STUDENT' | 'TEACHER' | 'OWNER';
}

// ══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type AssignmentState = 'DRAFT' | 'PUBLISHED' | 'DELETED';
export type WorkType = 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';

export interface ClassroomDate {
  year: number;
  month: number;
  day: number;
}

export interface ClassroomTime {
  hours: number;
  minutes: number;
  seconds?: number;
  nanos?: number;
}

export interface ClassroomAssignment {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  state: AssignmentState;
  alternateLink?: string;
  creationTime?: Date;
  updateTime?: Date;
  dueDate?: Date;
  dueTime?: ClassroomTime;
  maxPoints?: number;
  workType: WorkType;
  topicId?: string;
  materials?: ClassroomCourseMaterial[];
  associatedWithDeveloper?: boolean;
  scheduledTime?: Date;
  assigneeMode?: 'ALL_STUDENTS' | 'INDIVIDUAL_STUDENTS';
  individualStudentsOptions?: {
    studentIds: string[];
  };
  submissionModificationMode?: 'MODIFIABLE_UNTIL_TURNED_IN' | 'MODIFIABLE';
  creatorUserId?: string;
}

export interface ClassroomTopic {
  courseId: string;
  topicId: string;
  name: string;
  updateTime?: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBMISSION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type SubmissionState = 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT';

export interface ClassroomSubmission {
  id: string;
  courseId: string;
  courseWorkId: string;
  userId: string;
  state: SubmissionState;
  late: boolean;
  draftGrade?: number;
  assignedGrade?: number;
  alternateLink?: string;
  creationTime?: Date;
  updateTime?: Date;
  associatedWithDeveloper?: boolean;
  submissionHistory?: SubmissionHistoryEntry[];
  assignmentSubmission?: {
    attachments?: ClassroomCourseMaterial[];
  };
  shortAnswerSubmission?: {
    answer: string;
  };
  multipleChoiceSubmission?: {
    answer: string;
  };
}

export interface SubmissionHistoryEntry {
  stateHistory?: {
    state: SubmissionState;
    stateTimestamp: string;
    actorUserId?: string;
  };
  gradeHistory?: {
    pointsEarned: number;
    maxPoints: number;
    gradeTimestamp: string;
    actorUserId?: string;
    gradeChangeType:
      | 'ASSIGNED_GRADE_POINTS_EARNED_CHANGE'
      | 'MAX_POINTS_CHANGE'
      | 'DRAFT_GRADE_POINTS_EARNED_CHANGE';
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface SyncOptions {
  incrementalSince?: Date;
  syncGuardians?: boolean;
  forceFullSync?: boolean;
  dryRun?: boolean;
  courseStates?: CourseState[];
}

export interface SyncResult {
  courseId: string;
  courseName?: string;
  success: boolean;
  studentsAdded: number;
  studentsRemoved: number;
  studentsUpdated: number;
  teachersAdded: number;
  teachersRemoved: number;
  guardiansAdded: number;
  guardiansRemoved?: number;
  errors: string[];
  warnings?: string[];
  duration: number;
  syncedAt?: Date;
}

export interface SyncBatchResult {
  totalCourses: number;
  successful: number;
  failed: number;
  skipped: number;
  results: SyncResult[];
  totalDuration: number;
  startedAt: Date;
  completedAt: Date;
}

export interface SyncStatus {
  synced: boolean;
  lastSyncAt?: Date;
  classId?: string;
  syncInProgress?: boolean;
  lastError?: string;
  consecutiveFailures?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// GRADE PASSBACK TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface GradePassbackRequest {
  courseId: string;
  assignmentId: string;
  submissionId: string;
  grade?: number;
  draftGrade?: number;
}

export interface GradePassbackResult {
  studentId: string;
  googleUserId: string;
  success: boolean;
  grade?: number;
  error?: string;
}

export interface BatchGradePassbackResult {
  succeeded: number;
  failed: number;
  errors: string[];
  results: GradePassbackResult[];
}

// ══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENT LINKING TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface AssignmentPostRequest {
  lessonId: string;
  courseId: string;
  title?: string;
  description?: string;
  dueDate?: Date;
  dueTime?: ClassroomTime;
  maxPoints?: number;
  scheduledTime?: Date;
  topicId?: string;
}

export interface AssignmentLinkRecord {
  id: string;
  lessonId: string;
  googleCourseId: string;
  googleAssignmentId: string;
  title?: string;
  maxPoints?: number;
  dueDate?: Date;
  status: 'active' | 'deleted' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type WebhookCollection =
  | 'courses'
  | 'courses.courseWork'
  | 'courses.courseWorkMaterials'
  | 'courses.students'
  | 'courses.teachers';

export type WebhookEventType = 'CREATED' | 'UPDATED' | 'DELETED';

export interface WebhookNotification {
  collection: WebhookCollection;
  eventType: WebhookEventType;
  resourceId: {
    courseId?: string;
    userId?: string;
    courseWorkId?: string;
  };
  stateToken?: string;
}

export interface WebhookRegistration {
  registrationId: string;
  feed: {
    feedType: string;
    courseRosterChangesInfo?: {
      courseId: string;
    };
    courseWorkChangesInfo?: {
      courseId: string;
    };
  };
  cloudPubsubTopic: {
    topicName: string;
  };
  expirationTime: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface DomainInstallation {
  id: string;
  tenantId: string;
  googleDomain: string;
  adminEmail: string;
  installationType: 'domain_wide' | 'individual';
  status: 'active' | 'pending' | 'revoked';
  scopes: string[];
  installedAt: Date;
  lastValidatedAt?: Date;
  serviceAccountEmail?: string;
}

export interface CourseMapping {
  id: string;
  tenantId: string;
  aivoClassId: string;
  googleCourseId: string;
  autoSync: boolean;
  syncDirection: 'google_to_aivo' | 'aivo_to_google' | 'bidirectional';
  createdAt: Date;
  lastSyncAt?: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type GoogleAPIErrorCode =
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden / Rate Limit
  | 404 // Not Found
  | 409 // Conflict
  | 429 // Too Many Requests
  | 500 // Internal Server Error
  | 503; // Service Unavailable

export interface GoogleAPIError {
  code: GoogleAPIErrorCode;
  message: string;
  errors?: {
    message: string;
    domain: string;
    reason: string;
    location?: string;
    locationType?: string;
  }[];
  status?: string;
  retryable: boolean;
  retryAfterMs?: number;
}

export class GoogleClassroomError extends Error {
  constructor(
    message: string,
    public readonly code: GoogleAPIErrorCode,
    public readonly retryable = false,
    public readonly retryAfterMs?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'GoogleClassroomError';
  }

  static fromGoogleError(error: unknown): GoogleClassroomError {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    const code = err.code || err.status || 500;
    const message = err.message || 'Unknown Google API error';
    const retryable = [429, 500, 503].includes(code);
    const retryAfterMs = err.retryAfterMs || (retryable ? 5000 : undefined);

    return new GoogleClassroomError(message, code, retryable, retryAfterMs, error as Error);
  }

  static rateLimitError(retryAfterMs = 60000): GoogleClassroomError {
    return new GoogleClassroomError(
      'Google Classroom API rate limit exceeded',
      429,
      true,
      retryAfterMs
    );
  }

  static tokenExpiredError(): GoogleClassroomError {
    return new GoogleClassroomError(
      'Google OAuth token expired and could not be refreshed',
      401,
      false
    );
  }

  static permissionDeniedError(resource: string): GoogleClassroomError {
    return new GoogleClassroomError(
      `Permission denied for ${resource}. User may not have access.`,
      403,
      false
    );
  }

  static notFoundError(resource: string, id: string): GoogleClassroomError {
    return new GoogleClassroomError(`${resource} not found: ${id}`, 404, false);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGINATION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface PaginatedResult<T> {
  items: T[];
  nextPageToken?: string;
  totalCount?: number;
}

export interface PaginationOptions {
  pageSize?: number;
  pageToken?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// OAUTH TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface GoogleOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
}

export interface StoredCredential {
  userId: string;
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date | null;
  scope: string;
  googleUserId?: string;
  googleEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenRefreshResult {
  accessToken: string;
  expiresAt: Date;
  refreshToken?: string;
}
