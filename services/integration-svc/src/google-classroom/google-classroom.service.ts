/**
 * Google Classroom Integration Service
 *
 * Handles all interactions with Google Classroom API including:
 * - OAuth 2.0 authentication and token management
 * - Roster synchronization (courses, teachers, students, guardians)
 * - Assignment creation and management
 * - Grade passback to Classroom gradebook
 * - Real-time webhook processing
 *
 * @module google-classroom/service
 */

import { EventEmitter } from 'events';

import type { PrismaClient } from '@prisma/client';
import type { OAuth2Client, Credentials } from 'google-auth-library';
import type { classroom_v1 } from 'googleapis';
import { google } from 'googleapis';

import type {
  GoogleClassroomConfig,
  ClassroomCourse,
  ClassroomStudent,
  ClassroomTeacher,
  ClassroomGuardian,
  ClassroomAssignment,
  ClassroomSubmission,
  SyncResult,
  SyncOptions,
  GradePassbackRequest,
  CourseState,
  WebhookNotification,
} from './types.js';
import { GoogleClassroomError } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
  'https://www.googleapis.com/auth/classroom.profile.photos',
  'https://www.googleapis.com/auth/classroom.coursework.students',
  'https://www.googleapis.com/auth/classroom.coursework.me',
  'https://www.googleapis.com/auth/classroom.guardianlinks.students.readonly',
  'https://www.googleapis.com/auth/classroom.push-notifications',
];

const RATE_LIMIT_REQUESTS_PER_SECOND = 10;
const RATE_LIMIT_REQUESTS_PER_MINUTE = 500;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

export class GoogleClassroomService {
  private readonly classroom: classroom_v1.Classroom;
  private readonly oauth2Client: OAuth2Client;
  private readonly config: GoogleClassroomConfig;
  private readonly eventEmitter: EventEmitter;

  // Rate limiting
  private requestQueue: {
    request: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }[] = [];
  private isProcessingQueue = false;
  private requestsThisSecond = 0;
  private lastSecondReset = Date.now();

  constructor(
    private readonly prisma: PrismaClient,
    config: Partial<GoogleClassroomConfig> & {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    },
    eventEmitter?: EventEmitter
  ) {
    this.config = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      scopes: config.scopes || DEFAULT_SCOPES,
      projectId: config.projectId,
    };

    this.oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    this.classroom = google.classroom({ version: 'v1', auth: this.oauth2Client });
    this.eventEmitter = eventEmitter || new EventEmitter();

    // Start queue processor
    this.startQueueProcessor();
  }

  // ============================================================================
  // OAUTH AUTHENTICATION
  // ============================================================================

  /**
   * Generate OAuth authorization URL for user consent
   */
  getAuthorizationUrl(state: string, loginHint?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.config.scopes,
      state,
      login_hint: loginHint,
      prompt: 'consent', // Force consent to get refresh token
      include_granted_scopes: true,
    });
  }

  /**
   * Exchange authorization code for OAuth tokens
   */
  async exchangeCodeForTokens(code: string): Promise<Credentials> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error: any) {
      throw GoogleClassroomError.fromGoogleError(error);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<Credentials> {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error: any) {
      if (error.message?.includes('invalid_grant')) {
        throw GoogleClassroomError.tokenExpiredError();
      }
      throw GoogleClassroomError.fromGoogleError(error);
    }
  }

  /**
   * Store OAuth tokens for a user
   */
  async storeTokens(userId: string, tenantId: string, tokens: Credentials): Promise<void> {
    // Get user info from Google
    let googleUserId: string | undefined;
    let googleEmail: string | undefined;

    try {
      this.oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      googleUserId = userInfo.data.id || undefined;
      googleEmail = userInfo.data.email || undefined;
    } catch (error) {
      // Continue without Google user info
      console.warn('Failed to fetch Google user info:', error);
    }

    await this.prisma.googleClassroomCredential.upsert({
      where: { userId },
      create: {
        userId,
        tenantId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope || this.config.scopes.join(' '),
        googleUserId,
        googleEmail,
      },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope || undefined,
        googleUserId: googleUserId || undefined,
        googleEmail: googleEmail || undefined,
        updatedAt: new Date(),
      },
    });

    this.eventEmitter.emit('google-classroom.connected', { userId, tenantId });
  }

  /**
   * Get valid access token for a user (refresh if needed)
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const credential = await this.prisma.googleClassroomCredential.findUnique({
      where: { userId },
    });

    if (!credential) {
      throw new GoogleClassroomError('No Google Classroom credentials found for user', 401, false);
    }

    // Check if token is expired or will expire soon
    const isExpired =
      credential.expiresAt && credential.expiresAt.getTime() < Date.now() + TOKEN_REFRESH_BUFFER_MS;

    if (isExpired) {
      console.log('Refreshing expired Google token', { userId });

      const newTokens = await this.refreshAccessToken(credential.refreshToken);
      await this.storeTokens(userId, credential.tenantId, newTokens);

      return newTokens.access_token!;
    }

    return credential.accessToken;
  }

  /**
   * Revoke OAuth tokens and remove credentials
   */
  async revokeAccess(userId: string): Promise<void> {
    const credential = await this.prisma.googleClassroomCredential.findUnique({
      where: { userId },
    });

    if (credential) {
      try {
        await this.oauth2Client.revokeToken(credential.accessToken);
      } catch (error) {
        // Ignore revocation errors - token may already be invalid
        console.warn('Failed to revoke Google token:', error);
      }

      await this.prisma.googleClassroomCredential.delete({
        where: { userId },
      });

      this.eventEmitter.emit('google-classroom.disconnected', { userId });
    }
  }

  /**
   * Check if user has valid Google Classroom connection
   */
  async isConnected(userId: string): Promise<boolean> {
    try {
      await this.getValidAccessToken(userId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set up OAuth client with user's tokens for API calls
   */
  private async setupAuthForUser(userId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken(userId);
    this.oauth2Client.setCredentials({ access_token: accessToken });
  }

  // ============================================================================
  // COURSE OPERATIONS
  // ============================================================================

  /**
   * List courses with optional filters
   */
  async listCourses(
    userId: string,
    options: {
      teacherId?: string;
      studentId?: string;
      courseStates?: CourseState[];
      pageSize?: number;
      pageToken?: string;
    } = {}
  ): Promise<{ courses: ClassroomCourse[]; nextPageToken?: string }> {
    await this.setupAuthForUser(userId);

    const response = await this.rateLimitedRequest(() =>
      this.classroom.courses.list({
        teacherId: options.teacherId,
        studentId: options.studentId,
        courseStates: options.courseStates,
        pageSize: options.pageSize || 100,
        pageToken: options.pageToken,
      })
    );

    const courses = (response.data.courses || []).map((c) => this.mapCourse(c));

    return {
      courses,
      nextPageToken: response.data.nextPageToken || undefined,
    };
  }

  /**
   * Get a specific course by ID
   */
  async getCourse(userId: string, courseId: string): Promise<ClassroomCourse> {
    await this.setupAuthForUser(userId);

    try {
      const response = await this.rateLimitedRequest(() =>
        this.classroom.courses.get({ id: courseId })
      );
      return this.mapCourse(response.data);
    } catch (error: any) {
      if (error.code === 404) {
        throw GoogleClassroomError.notFoundError('Course', courseId);
      }
      throw GoogleClassroomError.fromGoogleError(error);
    }
  }

  /**
   * List all active courses where user is a teacher
   */
  async listTeacherCourses(userId: string): Promise<ClassroomCourse[]> {
    const allCourses: ClassroomCourse[] = [];
    let pageToken: string | undefined;

    do {
      const result = await this.listCourses(userId, {
        teacherId: 'me',
        courseStates: ['ACTIVE'],
        pageToken,
      });

      allCourses.push(...result.courses);
      pageToken = result.nextPageToken;
    } while (pageToken);

    return allCourses;
  }

  /**
   * List all active courses where user is a student
   */
  async listStudentCourses(userId: string): Promise<ClassroomCourse[]> {
    const allCourses: ClassroomCourse[] = [];
    let pageToken: string | undefined;

    do {
      const result = await this.listCourses(userId, {
        studentId: 'me',
        courseStates: ['ACTIVE'],
        pageToken,
      });

      allCourses.push(...result.courses);
      pageToken = result.nextPageToken;
    } while (pageToken);

    return allCourses;
  }

  // ============================================================================
  // ROSTER OPERATIONS
  // ============================================================================

  /**
   * List students in a course with pagination
   */
  async listStudents(
    userId: string,
    courseId: string,
    pageToken?: string
  ): Promise<{ students: ClassroomStudent[]; nextPageToken?: string }> {
    await this.setupAuthForUser(userId);

    try {
      const response = await this.rateLimitedRequest(() =>
        this.classroom.courses.students.list({
          courseId,
          pageSize: 100,
          pageToken,
        })
      );

      const students = (response.data.students || []).map((s) => this.mapStudent(s));

      return {
        students,
        nextPageToken: response.data.nextPageToken || undefined,
      };
    } catch (error: any) {
      if (error.code === 403) {
        throw GoogleClassroomError.permissionDeniedError(`course ${courseId} students`);
      }
      throw GoogleClassroomError.fromGoogleError(error);
    }
  }

  /**
   * List all students in a course (handles pagination automatically)
   */
  async listAllStudents(userId: string, courseId: string): Promise<ClassroomStudent[]> {
    const allStudents: ClassroomStudent[] = [];
    let pageToken: string | undefined;

    do {
      const result = await this.listStudents(userId, courseId, pageToken);
      allStudents.push(...result.students);
      pageToken = result.nextPageToken;
    } while (pageToken);

    return allStudents;
  }

  /**
   * List teachers in a course with pagination
   */
  async listTeachers(
    userId: string,
    courseId: string,
    pageToken?: string
  ): Promise<{ teachers: ClassroomTeacher[]; nextPageToken?: string }> {
    await this.setupAuthForUser(userId);

    const response = await this.rateLimitedRequest(() =>
      this.classroom.courses.teachers.list({
        courseId,
        pageSize: 100,
        pageToken,
      })
    );

    const teachers = (response.data.teachers || []).map((t) => this.mapTeacher(t));

    return {
      teachers,
      nextPageToken: response.data.nextPageToken || undefined,
    };
  }

  /**
   * List all teachers in a course
   */
  async listAllTeachers(userId: string, courseId: string): Promise<ClassroomTeacher[]> {
    const allTeachers: ClassroomTeacher[] = [];
    let pageToken: string | undefined;

    do {
      const result = await this.listTeachers(userId, courseId, pageToken);
      allTeachers.push(...result.teachers);
      pageToken = result.nextPageToken;
    } while (pageToken);

    return allTeachers;
  }

  /**
   * List guardians for a student
   */
  async listGuardians(userId: string, studentId: string): Promise<ClassroomGuardian[]> {
    await this.setupAuthForUser(userId);

    try {
      const response = await this.rateLimitedRequest(() =>
        this.classroom.userProfiles.guardians.list({
          studentId,
        })
      );

      return (response.data.guardians || []).map((g) => this.mapGuardian(g));
    } catch (error: any) {
      // Guardian access may not be enabled for all domains
      if (error.code === 403 || error.code === 404) {
        console.debug('Guardian access not available', { studentId });
        return [];
      }
      throw GoogleClassroomError.fromGoogleError(error);
    }
  }

  // ============================================================================
  // ASSIGNMENT OPERATIONS
  // ============================================================================

  /**
   * Create a coursework assignment
   */
  async createAssignment(
    userId: string,
    courseId: string,
    assignment: {
      title: string;
      description?: string;
      materials?: {
        link?: { url: string; title?: string };
        driveFile?: { id: string };
      }[];
      dueDate?: Date;
      dueTime?: { hours: number; minutes: number };
      maxPoints?: number;
      workType?: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
      state?: 'DRAFT' | 'PUBLISHED';
      scheduledTime?: Date;
      topicId?: string;
    }
  ): Promise<ClassroomAssignment> {
    await this.setupAuthForUser(userId);

    const materials: classroom_v1.Schema$Material[] = [];

    if (assignment.materials) {
      for (const material of assignment.materials) {
        if (material.link) {
          materials.push({
            link: {
              url: material.link.url,
              title: material.link.title,
            },
          });
        }
        if (material.driveFile) {
          materials.push({
            driveFile: {
              driveFile: { id: material.driveFile.id },
            },
          });
        }
      }
    }

    const coursework: classroom_v1.Schema$CourseWork = {
      title: assignment.title,
      description: assignment.description,
      materials: materials.length > 0 ? materials : undefined,
      maxPoints: assignment.maxPoints,
      workType: assignment.workType || 'ASSIGNMENT',
      state: assignment.state || 'PUBLISHED',
      topicId: assignment.topicId,
      associatedWithDeveloper: true,
    };

    // Add due date if specified
    if (assignment.dueDate) {
      coursework.dueDate = {
        year: assignment.dueDate.getFullYear(),
        month: assignment.dueDate.getMonth() + 1,
        day: assignment.dueDate.getDate(),
      };

      if (assignment.dueTime) {
        coursework.dueTime = {
          hours: assignment.dueTime.hours,
          minutes: assignment.dueTime.minutes,
        };
      }
    }

    // Add scheduled time if specified
    if (assignment.scheduledTime) {
      coursework.scheduledTime = assignment.scheduledTime.toISOString();
    }

    const response = await this.rateLimitedRequest(() =>
      this.classroom.courses.courseWork.create({
        courseId,
        requestBody: coursework,
      })
    );

    this.eventEmitter.emit('google-classroom.assignment.created', {
      courseId,
      assignmentId: response.data.id,
    });

    return this.mapAssignment(response.data);
  }

  /**
   * Update an existing coursework assignment
   */
  async updateAssignment(
    userId: string,
    courseId: string,
    assignmentId: string,
    updates: Partial<{
      title: string;
      description: string;
      dueDate: Date;
      maxPoints: number;
      state: 'DRAFT' | 'PUBLISHED';
    }>
  ): Promise<ClassroomAssignment> {
    await this.setupAuthForUser(userId);

    const updateMask: string[] = [];
    const coursework: classroom_v1.Schema$CourseWork = {};

    if (updates.title !== undefined) {
      coursework.title = updates.title;
      updateMask.push('title');
    }
    if (updates.description !== undefined) {
      coursework.description = updates.description;
      updateMask.push('description');
    }
    if (updates.maxPoints !== undefined) {
      coursework.maxPoints = updates.maxPoints;
      updateMask.push('maxPoints');
    }
    if (updates.state !== undefined) {
      coursework.state = updates.state;
      updateMask.push('state');
    }
    if (updates.dueDate !== undefined) {
      coursework.dueDate = {
        year: updates.dueDate.getFullYear(),
        month: updates.dueDate.getMonth() + 1,
        day: updates.dueDate.getDate(),
      };
      updateMask.push('dueDate');
    }

    const response = await this.rateLimitedRequest(() =>
      this.classroom.courses.courseWork.patch({
        courseId,
        id: assignmentId,
        updateMask: updateMask.join(','),
        requestBody: coursework,
      })
    );

    return this.mapAssignment(response.data);
  }

  /**
   * Delete a coursework assignment
   */
  async deleteAssignment(userId: string, courseId: string, assignmentId: string): Promise<void> {
    await this.setupAuthForUser(userId);

    await this.rateLimitedRequest(() =>
      this.classroom.courses.courseWork.delete({
        courseId,
        id: assignmentId,
      })
    );

    this.eventEmitter.emit('google-classroom.assignment.deleted', {
      courseId,
      assignmentId,
    });
  }

  /**
   * List assignments in a course
   */
  async listAssignments(
    userId: string,
    courseId: string,
    options: {
      courseWorkStates?: ('DRAFT' | 'PUBLISHED' | 'DELETED')[];
      pageToken?: string;
    } = {}
  ): Promise<{ assignments: ClassroomAssignment[]; nextPageToken?: string }> {
    await this.setupAuthForUser(userId);

    const response = await this.rateLimitedRequest(() =>
      this.classroom.courses.courseWork.list({
        courseId,
        courseWorkStates: options.courseWorkStates,
        pageSize: 100,
        pageToken: options.pageToken,
      })
    );

    const assignments = (response.data.courseWork || []).map((a) => this.mapAssignment(a));

    return {
      assignments,
      nextPageToken: response.data.nextPageToken || undefined,
    };
  }

  // ============================================================================
  // GRADE PASSBACK
  // ============================================================================

  /**
   * Get a student's submission for an assignment
   */
  async getSubmission(
    userId: string,
    courseId: string,
    assignmentId: string,
    studentUserId: string
  ): Promise<ClassroomSubmission | null> {
    await this.setupAuthForUser(userId);

    const response = await this.rateLimitedRequest(() =>
      this.classroom.courses.courseWork.studentSubmissions.list({
        courseId,
        courseWorkId: assignmentId,
        userId: studentUserId,
      })
    );

    const submissions = response.data.studentSubmissions || [];
    return submissions.length > 0 ? this.mapSubmission(submissions[0]) : null;
  }

  /**
   * Update grade for a submission
   */
  async updateGrade(userId: string, request: GradePassbackRequest): Promise<ClassroomSubmission> {
    await this.setupAuthForUser(userId);

    const { courseId, assignmentId, submissionId, grade, draftGrade } = request;

    const submission: classroom_v1.Schema$StudentSubmission = {};
    const updateMask: string[] = [];

    if (grade !== undefined) {
      submission.assignedGrade = grade;
      updateMask.push('assignedGrade');
    }

    if (draftGrade !== undefined) {
      submission.draftGrade = draftGrade;
      updateMask.push('draftGrade');
    }

    const response = await this.rateLimitedRequest(() =>
      this.classroom.courses.courseWork.studentSubmissions.patch({
        courseId,
        courseWorkId: assignmentId,
        id: submissionId,
        updateMask: updateMask.join(','),
        requestBody: submission,
      })
    );

    this.eventEmitter.emit('google-classroom.grade.updated', {
      courseId,
      assignmentId,
      submissionId,
      grade,
    });

    return this.mapSubmission(response.data);
  }

  /**
   * Return a submission to the student (finalize grading)
   */
  async returnSubmission(
    userId: string,
    courseId: string,
    assignmentId: string,
    submissionId: string
  ): Promise<void> {
    await this.setupAuthForUser(userId);

    await this.rateLimitedRequest(() =>
      this.classroom.courses.courseWork.studentSubmissions.return({
        courseId,
        courseWorkId: assignmentId,
        id: submissionId,
      })
    );
  }

  /**
   * Batch update grades for multiple students
   */
  async batchUpdateGrades(
    userId: string,
    courseId: string,
    assignmentId: string,
    grades: {
      studentUserId: string;
      grade: number;
    }[]
  ): Promise<{ succeeded: number; failed: number; errors: string[] }> {
    const results = {
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process in small batches to respect rate limits
    const BATCH_SIZE = 5;

    for (let i = 0; i < grades.length; i += BATCH_SIZE) {
      const batch = grades.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async ({ studentUserId, grade }) => {
          // Get submission ID for student
          const submission = await this.getSubmission(
            userId,
            courseId,
            assignmentId,
            studentUserId
          );

          if (!submission) {
            throw new Error(`No submission found for student ${studentUserId}`);
          }

          await this.updateGrade(userId, {
            courseId,
            assignmentId,
            submissionId: submission.id,
            grade,
          });
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.succeeded++;
        } else {
          results.failed++;
          results.errors.push(result.reason?.message || 'Unknown error');
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < grades.length) {
        await this.delay(200);
      }
    }

    return results;
  }

  // ============================================================================
  // SYNC OPERATIONS
  // ============================================================================

  /**
   * Full sync of a course roster
   */
  async syncCourseRoster(
    userId: string,
    tenantId: string,
    googleCourseId: string,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      courseId: googleCourseId,
      success: true,
      studentsAdded: 0,
      studentsRemoved: 0,
      studentsUpdated: 0,
      teachersAdded: 0,
      teachersRemoved: 0,
      guardiansAdded: 0,
      errors: [],
      warnings: [],
      duration: 0,
    };

    try {
      console.log('Starting course roster sync', { googleCourseId, tenantId });

      // Get course details
      const course = await this.getCourse(userId, googleCourseId);
      result.courseName = course.name;

      // Find or create local class
      const localClass = await this.findOrCreateClass(tenantId, course);

      // Mark sync as in progress
      await this.prisma.googleClassroomSync.upsert({
        where: { googleCourseId },
        create: {
          googleCourseId,
          classId: localClass.id,
          syncInProgress: true,
          lastSyncAt: new Date(),
        },
        update: {
          syncInProgress: true,
          lastSyncAt: new Date(),
        },
      });

      // Sync teachers
      const teacherResult = await this.syncTeachers(
        userId,
        tenantId,
        googleCourseId,
        localClass.id
      );
      result.teachersAdded = teacherResult.added;
      result.teachersRemoved = teacherResult.removed;

      // Sync students
      const studentResult = await this.syncStudents(
        userId,
        tenantId,
        googleCourseId,
        localClass.id,
        options
      );
      result.studentsAdded = studentResult.added;
      result.studentsRemoved = studentResult.removed;
      result.studentsUpdated = studentResult.updated;

      // Sync guardians if enabled
      if (options.syncGuardians !== false) {
        const guardianResult = await this.syncGuardians(
          userId,
          tenantId,
          googleCourseId,
          localClass.id
        );
        result.guardiansAdded = guardianResult.added;
      }

      // Update sync record
      await this.prisma.googleClassroomSync.update({
        where: { googleCourseId },
        data: {
          lastSyncAt: new Date(),
          syncInProgress: false,
          lastError: null,
          consecutiveFailures: 0,
        },
      });

      result.duration = Date.now() - startTime;
      result.syncedAt = new Date();

      this.eventEmitter.emit('google-classroom.sync.completed', result);

      console.log('Course roster sync completed', {
        googleCourseId,
        ...result,
      });
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;

      // Update sync record with error
      await this.prisma.googleClassroomSync.upsert({
        where: { googleCourseId },
        create: {
          googleCourseId,
          classId: '',
          syncInProgress: false,
          lastError: error.message,
          consecutiveFailures: 1,
        },
        update: {
          syncInProgress: false,
          lastError: error.message,
          consecutiveFailures: { increment: 1 },
        },
      });

      this.eventEmitter.emit('google-classroom.sync.failed', {
        courseId: googleCourseId,
        error: error.message,
      });

      console.error('Course roster sync failed', {
        googleCourseId,
        error: error.message,
      });
    }

    return result;
  }

  /**
   * Sync all courses for a teacher
   */
  async syncAllCourses(userId: string, tenantId: string): Promise<SyncResult[]> {
    const courses = await this.listTeacherCourses(userId);
    const results: SyncResult[] = [];

    for (const course of courses) {
      const result = await this.syncCourseRoster(userId, tenantId, course.id);
      results.push(result);

      // Delay between courses to respect rate limits
      await this.delay(500);
    }

    return results;
  }

  // ============================================================================
  // WEBHOOK HANDLING
  // ============================================================================

  /**
   * Register push notifications for a course
   */
  async registerPushNotifications(
    userId: string,
    courseId: string,
    feedType: 'COURSE_ROSTER_CHANGES' | 'COURSE_WORK_CHANGES' = 'COURSE_ROSTER_CHANGES'
  ): Promise<{ registrationId: string; expirationTime: Date }> {
    await this.setupAuthForUser(userId);

    if (!this.config.projectId) {
      throw new Error('Google Cloud Project ID required for push notifications');
    }

    const expirationTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const feed: classroom_v1.Schema$Feed = {
      feedType,
    };

    if (feedType === 'COURSE_ROSTER_CHANGES') {
      feed.courseRosterChangesInfo = { courseId };
    } else {
      feed.courseWorkChangesInfo = { courseId };
    }

    const response = await this.rateLimitedRequest(() =>
      this.classroom.registrations.create({
        requestBody: {
          feed,
          cloudPubsubTopic: {
            topicName: `projects/${this.config.projectId}/topics/classroom-notifications`,
          },
        },
      })
    );

    // Store registration
    await this.prisma.googleClassroomWebhookRegistration.create({
      data: {
        registrationId: response.data.registrationId!,
        courseId,
        feedType,
        expiresAt: expirationTime,
      },
    });

    return {
      registrationId: response.data.registrationId!,
      expirationTime,
    };
  }

  /**
   * Process incoming webhook notification
   */
  async processWebhookNotification(notification: WebhookNotification): Promise<void> {
    console.debug('Processing Classroom webhook', notification);

    const { collection, eventType, resourceId } = notification;

    switch (collection) {
      case 'courses.students':
        await this.handleStudentChange(resourceId.courseId!, resourceId.userId!, eventType);
        break;

      case 'courses.teachers':
        await this.handleTeacherChange(resourceId.courseId!, resourceId.userId!, eventType);
        break;

      case 'courses':
        await this.handleCourseChange(resourceId.courseId!, eventType);
        break;

      case 'courses.courseWork':
        await this.handleCourseWorkChange(
          resourceId.courseId!,
          resourceId.courseWorkId!,
          eventType
        );
        break;

      default:
        console.debug('Unhandled webhook collection', { collection });
    }
  }

  // ============================================================================
  // PRIVATE SYNC HELPERS
  // ============================================================================

  private async syncTeachers(
    userId: string,
    tenantId: string,
    googleCourseId: string,
    localClassId: string
  ): Promise<{ added: number; removed: number }> {
    const googleTeachers = await this.listAllTeachers(userId, googleCourseId);
    const googleTeacherIds = new Set(googleTeachers.map((t) => t.userId));

    // Get current local teachers for this class
    const localEnrollments = await this.prisma.enrollment.findMany({
      where: {
        classId: localClassId,
        role: 'TEACHER',
        googleUserId: { not: null },
      },
    });

    const localTeacherGoogleIds = new Set(localEnrollments.map((e) => e.googleUserId));

    let added = 0;
    let removed = 0;

    // Add new teachers
    for (const teacher of googleTeachers) {
      if (!localTeacherGoogleIds.has(teacher.userId)) {
        await this.createOrUpdateTeacher(tenantId, localClassId, teacher);
        added++;
      }
    }

    // Remove teachers no longer in course
    for (const enrollment of localEnrollments) {
      if (enrollment.googleUserId && !googleTeacherIds.has(enrollment.googleUserId)) {
        await this.prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: 'REMOVED',
            removedAt: new Date(),
            removedReason: 'google_classroom_sync',
          },
        });
        removed++;
      }
    }

    return { added, removed };
  }

  private async syncStudents(
    userId: string,
    tenantId: string,
    googleCourseId: string,
    localClassId: string,
    options: SyncOptions
  ): Promise<{ added: number; removed: number; updated: number }> {
    const googleStudents = await this.listAllStudents(userId, googleCourseId);
    const googleStudentIds = new Set(googleStudents.map((s) => s.userId));

    // Get current local students for this class
    const localEnrollments = await this.prisma.enrollment.findMany({
      where: {
        classId: localClassId,
        role: 'STUDENT',
        googleUserId: { not: null },
        status: 'ACTIVE',
      },
      include: {
        student: true,
      },
    });

    const localStudentGoogleIds = new Set(localEnrollments.map((e) => e.googleUserId));

    let added = 0;
    let removed = 0;
    let updated = 0;

    // Add or update students
    for (const student of googleStudents) {
      if (!localStudentGoogleIds.has(student.userId)) {
        await this.createOrUpdateStudent(tenantId, localClassId, student);
        added++;
      } else {
        // Check for updates
        const enrollment = localEnrollments.find((e) => e.googleUserId === student.userId);
        if (enrollment && this.studentNeedsUpdate(enrollment.student, student)) {
          await this.updateStudentFromGoogle(enrollment.studentId, student);
          updated++;
        }
      }
    }

    // Remove students no longer in course
    for (const enrollment of localEnrollments) {
      if (enrollment.googleUserId && !googleStudentIds.has(enrollment.googleUserId)) {
        await this.prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: 'REMOVED',
            removedAt: new Date(),
            removedReason: 'google_classroom_sync',
          },
        });
        removed++;

        this.eventEmitter.emit('student.removed', {
          studentId: enrollment.studentId,
          classId: localClassId,
          reason: 'google_classroom_sync',
        });
      }
    }

    return { added, removed, updated };
  }

  private async syncGuardians(
    userId: string,
    tenantId: string,
    googleCourseId: string,
    localClassId: string
  ): Promise<{ added: number }> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        classId: localClassId,
        role: 'STUDENT',
        googleUserId: { not: null },
      },
    });

    let added = 0;

    for (const enrollment of enrollments) {
      if (!enrollment.googleUserId) continue;

      try {
        const guardians = await this.listGuardians(userId, enrollment.googleUserId);

        for (const guardian of guardians) {
          const created = await this.createOrUpdateGuardian(
            tenantId,
            enrollment.studentId,
            guardian
          );
          if (created) added++;
        }
      } catch (error) {
        // Guardian access might fail for some students
        console.debug('Failed to sync guardians for student', {
          studentId: enrollment.studentId,
        });
      }
    }

    return { added };
  }

  private async findOrCreateClass(
    tenantId: string,
    course: ClassroomCourse
  ): Promise<{ id: string }> {
    // Look for existing class linked to this Google course
    let classRecord = await this.prisma.class.findFirst({
      where: {
        tenantId,
        googleCourseId: course.id,
      },
    });

    if (!classRecord) {
      classRecord = await this.prisma.class.create({
        data: {
          tenantId,
          name: course.name,
          description: course.description,
          section: course.section,
          googleCourseId: course.id,
          googleCourseState: course.courseState,
          sourceSystem: 'google_classroom',
          status: 'ACTIVE',
        },
      });

      console.log('Created class from Google Classroom', {
        classId: classRecord.id,
        googleCourseId: course.id,
      });
    }

    return { id: classRecord.id };
  }

  private async createOrUpdateTeacher(
    tenantId: string,
    classId: string,
    teacher: ClassroomTeacher
  ): Promise<void> {
    // Find or create user
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: teacher.userId }, { email: teacher.emailAddress }],
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          tenantId,
          email: teacher.emailAddress,
          googleId: teacher.userId,
          givenName: teacher.profile?.name?.givenName || '',
          familyName: teacher.profile?.name?.familyName || '',
          photoUrl: teacher.profile?.photoUrl,
          role: 'TEACHER',
          sourceSystem: 'google_classroom',
        },
      });
    }

    // Create enrollment
    await this.prisma.enrollment.upsert({
      where: {
        userId_classId: { userId: user.id, classId },
      },
      create: {
        userId: user.id,
        classId,
        role: 'TEACHER',
        googleUserId: teacher.userId,
        status: 'ACTIVE',
      },
      update: {
        status: 'ACTIVE',
        googleUserId: teacher.userId,
      },
    });
  }

  private async createOrUpdateStudent(
    tenantId: string,
    classId: string,
    student: ClassroomStudent
  ): Promise<void> {
    // Find or create student profile
    let profile = await this.prisma.studentProfile.findFirst({
      where: {
        OR: [{ googleId: student.userId }, { email: student.emailAddress }],
        tenantId,
      },
    });

    if (!profile) {
      profile = await this.prisma.studentProfile.create({
        data: {
          tenantId,
          email: student.emailAddress,
          googleId: student.userId,
          givenName: student.profile?.name?.givenName || '',
          familyName: student.profile?.name?.familyName || '',
          photoUrl: student.profile?.photoUrl,
          sourceSystem: 'google_classroom',
        },
      });

      // Create learner model for new student
      await this.prisma.learnerModel.create({
        data: {
          studentId: profile.id,
          overallMastery: 0,
          lastActivityAt: new Date(),
        },
      });

      console.log('Created student from Google Classroom', {
        studentId: profile.id,
        googleUserId: student.userId,
      });
    }

    // Create enrollment
    await this.prisma.enrollment.upsert({
      where: {
        studentId_classId: { studentId: profile.id, classId },
      },
      create: {
        studentId: profile.id,
        classId,
        role: 'STUDENT',
        googleUserId: student.userId,
        status: 'ACTIVE',
      },
      update: {
        status: 'ACTIVE',
        googleUserId: student.userId,
      },
    });

    this.eventEmitter.emit('student.enrolled', {
      studentId: profile.id,
      classId,
      source: 'google_classroom',
    });
  }

  private async updateStudentFromGoogle(
    studentId: string,
    student: ClassroomStudent
  ): Promise<void> {
    await this.prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        givenName: student.profile?.name?.givenName,
        familyName: student.profile?.name?.familyName,
        photoUrl: student.profile?.photoUrl,
        updatedAt: new Date(),
      },
    });
  }

  private async createOrUpdateGuardian(
    tenantId: string,
    studentId: string,
    guardian: ClassroomGuardian
  ): Promise<boolean> {
    const existing = await this.prisma.guardian.findFirst({
      where: {
        studentId,
        email: guardian.invitedEmailAddress,
      },
    });

    if (existing) {
      return false;
    }

    await this.prisma.guardian.create({
      data: {
        tenantId,
        studentId,
        email: guardian.invitedEmailAddress,
        googleGuardianId: guardian.guardianId,
        givenName: guardian.guardianProfile?.name?.givenName,
        familyName: guardian.guardianProfile?.name?.familyName,
        sourceSystem: 'google_classroom',
      },
    });

    return true;
  }

  private studentNeedsUpdate(localStudent: any, googleStudent: ClassroomStudent): boolean {
    if (!googleStudent.profile?.name) return false;

    return (
      localStudent.givenName !== googleStudent.profile.name.givenName ||
      localStudent.familyName !== googleStudent.profile.name.familyName ||
      localStudent.photoUrl !== googleStudent.profile.photoUrl
    );
  }

  // ============================================================================
  // PRIVATE WEBHOOK HELPERS
  // ============================================================================

  private async handleStudentChange(
    courseId: string,
    studentUserId: string,
    eventType: string
  ): Promise<void> {
    const syncRecord = await this.prisma.googleClassroomSync.findUnique({
      where: { googleCourseId: courseId },
    });

    if (!syncRecord) {
      console.debug('No sync record for course', { courseId });
      return;
    }

    const credential = await this.findTeacherCredentialForCourse(courseId);
    if (!credential) return;

    if (eventType === 'CREATED') {
      await this.setupAuthForUser(credential.userId);

      try {
        const response = await this.classroom.courses.students.get({
          courseId,
          userId: studentUserId,
        });

        const student = this.mapStudent(response.data);
        await this.createOrUpdateStudent(credential.tenantId, syncRecord.classId, student);
      } catch (error) {
        console.error('Failed to add student from webhook', { courseId, studentUserId });
      }
    } else if (eventType === 'DELETED') {
      await this.prisma.enrollment.updateMany({
        where: {
          classId: syncRecord.classId,
          googleUserId: studentUserId,
        },
        data: {
          status: 'REMOVED',
          removedAt: new Date(),
          removedReason: 'google_classroom_webhook',
        },
      });
    }
  }

  private async handleTeacherChange(
    courseId: string,
    teacherUserId: string,
    eventType: string
  ): Promise<void> {
    const syncRecord = await this.prisma.googleClassroomSync.findUnique({
      where: { googleCourseId: courseId },
    });

    if (!syncRecord) return;

    if (eventType === 'DELETED') {
      await this.prisma.enrollment.updateMany({
        where: {
          classId: syncRecord.classId,
          googleUserId: teacherUserId,
          role: 'TEACHER',
        },
        data: {
          status: 'REMOVED',
          removedAt: new Date(),
        },
      });
    }
  }

  private async handleCourseChange(courseId: string, eventType: string): Promise<void> {
    const syncRecord = await this.prisma.googleClassroomSync.findUnique({
      where: { googleCourseId: courseId },
    });

    if (!syncRecord) return;

    if (eventType === 'DELETED') {
      await this.prisma.class.update({
        where: { id: syncRecord.classId },
        data: {
          status: 'DELETED',
          googleCourseState: 'DELETED',
        },
      });
    } else if (eventType === 'UPDATED') {
      // Could fetch updated course details
      console.debug('Course updated', { courseId });
    }
  }

  private async handleCourseWorkChange(
    courseId: string,
    courseWorkId: string,
    eventType: string
  ): Promise<void> {
    // Update linked assignment if exists
    if (eventType === 'DELETED') {
      await this.prisma.googleClassroomAssignment.updateMany({
        where: {
          googleCourseId: courseId,
          googleAssignmentId: courseWorkId,
        },
        data: {
          status: 'deleted',
          deletedAt: new Date(),
        },
      });
    }
  }

  private async findTeacherCredentialForCourse(courseId: string): Promise<{
    userId: string;
    tenantId: string;
  } | null> {
    const syncRecord = await this.prisma.googleClassroomSync.findUnique({
      where: { googleCourseId: courseId },
      include: {
        class: {
          include: {
            enrollments: {
              where: { role: 'TEACHER' },
              include: { user: true },
            },
          },
        },
      },
    });

    if (!syncRecord?.class?.enrollments?.[0]) return null;

    const teacherId = syncRecord.class.enrollments[0].userId;

    const credential = await this.prisma.googleClassroomCredential.findUnique({
      where: { userId: teacherId },
    });

    return credential ? { userId: credential.userId, tenantId: credential.tenantId } : null;
  }

  // ============================================================================
  // MAPPING FUNCTIONS
  // ============================================================================

  private mapCourse(course: classroom_v1.Schema$Course): ClassroomCourse {
    return {
      id: course.id!,
      name: course.name!,
      section: course.section || undefined,
      description: course.descriptionHeading || course.description || undefined,
      room: course.room || undefined,
      ownerId: course.ownerId!,
      courseState: course.courseState as CourseState,
      alternateLink: course.alternateLink || undefined,
      creationTime: course.creationTime ? new Date(course.creationTime) : undefined,
      updateTime: course.updateTime ? new Date(course.updateTime) : undefined,
      enrollmentCode: course.enrollmentCode || undefined,
      calendarId: course.calendarId || undefined,
      guardiansEnabled: course.guardiansEnabled || undefined,
    };
  }

  private mapStudent(student: classroom_v1.Schema$Student): ClassroomStudent {
    return {
      courseId: student.courseId!,
      userId: student.userId!,
      emailAddress: student.profile?.emailAddress || '',
      profile: student.profile
        ? {
            id: student.profile.id!,
            name: student.profile.name
              ? {
                  givenName: student.profile.name.givenName || '',
                  familyName: student.profile.name.familyName || '',
                  fullName: student.profile.name.fullName || '',
                }
              : undefined,
            emailAddress: student.profile.emailAddress || '',
            photoUrl: student.profile.photoUrl || undefined,
          }
        : undefined,
    };
  }

  private mapTeacher(teacher: classroom_v1.Schema$Teacher): ClassroomTeacher {
    return {
      courseId: teacher.courseId!,
      userId: teacher.userId!,
      emailAddress: teacher.profile?.emailAddress || '',
      profile: teacher.profile
        ? {
            id: teacher.profile.id!,
            name: teacher.profile.name
              ? {
                  givenName: teacher.profile.name.givenName || '',
                  familyName: teacher.profile.name.familyName || '',
                  fullName: teacher.profile.name.fullName || '',
                }
              : undefined,
            emailAddress: teacher.profile.emailAddress || '',
            photoUrl: teacher.profile.photoUrl || undefined,
          }
        : undefined,
    };
  }

  private mapGuardian(guardian: classroom_v1.Schema$Guardian): ClassroomGuardian {
    return {
      studentId: guardian.studentId!,
      guardianId: guardian.guardianId!,
      guardianProfile: guardian.guardianProfile
        ? {
            id: guardian.guardianProfile.id!,
            emailAddress: guardian.guardianProfile.emailAddress || '',
            name: guardian.guardianProfile.name
              ? {
                  givenName: guardian.guardianProfile.name.givenName || '',
                  familyName: guardian.guardianProfile.name.familyName || '',
                  fullName: guardian.guardianProfile.name.fullName || '',
                }
              : undefined,
          }
        : undefined,
      invitedEmailAddress: guardian.invitedEmailAddress || '',
    };
  }

  private mapAssignment(coursework: classroom_v1.Schema$CourseWork): ClassroomAssignment {
    return {
      id: coursework.id!,
      courseId: coursework.courseId!,
      title: coursework.title!,
      description: coursework.description || undefined,
      state: coursework.state as any,
      alternateLink: coursework.alternateLink || undefined,
      creationTime: coursework.creationTime ? new Date(coursework.creationTime) : undefined,
      updateTime: coursework.updateTime ? new Date(coursework.updateTime) : undefined,
      dueDate: coursework.dueDate
        ? new Date(
            coursework.dueDate.year!,
            (coursework.dueDate.month || 1) - 1,
            coursework.dueDate.day || 1
          )
        : undefined,
      maxPoints: coursework.maxPoints || undefined,
      workType: coursework.workType as any,
      topicId: coursework.topicId || undefined,
    };
  }

  private mapSubmission(submission: classroom_v1.Schema$StudentSubmission): ClassroomSubmission {
    return {
      id: submission.id!,
      courseId: submission.courseId!,
      courseWorkId: submission.courseWorkId!,
      userId: submission.userId!,
      state: submission.state as any,
      late: submission.late || false,
      draftGrade: submission.draftGrade || undefined,
      assignedGrade: submission.assignedGrade || undefined,
      alternateLink: submission.alternateLink || undefined,
      creationTime: submission.creationTime ? new Date(submission.creationTime) : undefined,
      updateTime: submission.updateTime ? new Date(submission.updateTime) : undefined,
    };
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  private async rateLimitedRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ request, resolve, reject });
    });
  }

  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessingQueue || this.requestQueue.length === 0) {
        return;
      }

      // Reset counter every second
      const now = Date.now();
      if (now - this.lastSecondReset >= 1000) {
        this.requestsThisSecond = 0;
        this.lastSecondReset = now;
      }

      // Check rate limit
      if (this.requestsThisSecond >= RATE_LIMIT_REQUESTS_PER_SECOND) {
        return;
      }

      this.isProcessingQueue = true;

      // Process one request at a time
      const item = this.requestQueue.shift();
      if (item) {
        this.requestsThisSecond++;
        try {
          const result = await this.executeWithRetry(item.request);
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }
      }

      this.isProcessingQueue = false;
    }, 100);
  }

  private async executeWithRetry<T>(request: () => Promise<T>, retries = 0): Promise<T> {
    try {
      return await request();
    } catch (error: any) {
      // Check if retryable
      const isRateLimited = error.code === 429;
      const isServerError = error.code >= 500 && error.code < 600;
      const shouldRetry = (isRateLimited || isServerError) && retries < MAX_RETRIES;

      if (shouldRetry) {
        const delay = isRateLimited
          ? (error.retryAfter || 60) * 1000
          : RETRY_DELAY_MS * Math.pow(2, retries);

        console.log(`Retrying request after ${delay}ms (attempt ${retries + 1}/${MAX_RETRIES})`);
        await this.delay(delay);
        return this.executeWithRetry(request, retries + 1);
      }

      throw GoogleClassroomError.fromGoogleError(error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
