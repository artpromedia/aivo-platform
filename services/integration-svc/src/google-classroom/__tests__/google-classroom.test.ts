/**
 * Google Classroom Service Tests
 *
 * Comprehensive test suite for the Google Classroom integration.
 * Tests OAuth flow, roster sync, assignment posting, and grade passback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleClassroomService } from '../google-classroom.service.js';
import { AssignmentSyncService } from '../assignment-sync.service.js';
import { GoogleClassroomErrorHandler, ErrorCodes } from '../error-handler.js';
import type { PrismaClient } from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ══════════════════════════════════════════════════════════════════════════════

// Mock Google APIs
vi.mock('googleapis', () => ({
  google: {
    classroom: vi.fn(() => mockClassroomApi),
    auth: {
      OAuth2: vi.fn().mockImplementation(() => mockOAuth2Client),
    },
  },
}));

const mockOAuth2Client = {
  generateAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?...'),
  getToken: vi.fn().mockResolvedValue({
    tokens: {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      expiry_date: Date.now() + 3600000,
    },
  }),
  setCredentials: vi.fn(),
  refreshAccessToken: vi.fn().mockResolvedValue({
    credentials: {
      access_token: 'new_access_token',
      expiry_date: Date.now() + 3600000,
    },
  }),
  revokeToken: vi.fn().mockResolvedValue({}),
};

const mockClassroomApi = {
  courses: {
    list: vi.fn(),
    get: vi.fn(),
    students: {
      list: vi.fn(),
    },
    teachers: {
      list: vi.fn(),
    },
    courseWork: {
      create: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      studentSubmissions: {
        get: vi.fn(),
        patch: vi.fn(),
        return: vi.fn(),
      },
    },
  },
  userProfiles: {
    get: vi.fn(),
    guardians: {
      list: vi.fn(),
    },
  },
  registrations: {
    create: vi.fn(),
    delete: vi.fn(),
  },
};

// Mock Prisma
const mockPrisma = {
  googleClassroomCredential: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  googleClassroomSync: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  googleClassroomSyncLog: {
    create: vi.fn(),
  },
  googleClassroomAssignment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  gradePassbackLog: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  googleClassroomWebhookRegistration: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  class: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  enrollment: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  studentProfile: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  lesson: {
    findUnique: vi.fn(),
  },
  lessonAttempt: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
} as unknown as PrismaClient;

// ══════════════════════════════════════════════════════════════════════════════
// TEST DATA
// ══════════════════════════════════════════════════════════════════════════════

const mockConfig = {
  clientId: 'mock_client_id',
  clientSecret: 'mock_client_secret',
  redirectUri: 'http://localhost:3000/api/integrations/google-classroom/callback',
  webhookUrl: 'http://localhost:3000/api/integrations/google-classroom/webhook',
};

const mockCourse = {
  id: 'course123',
  name: 'Math 101',
  section: 'Period 1',
  courseState: 'ACTIVE',
  ownerId: 'teacher123',
  alternateLink: 'https://classroom.google.com/c/course123',
  guardiansEnabled: true,
};

const mockStudent = {
  userId: 'student123',
  courseId: 'course123',
  profile: {
    id: 'student123',
    name: {
      givenName: 'John',
      familyName: 'Doe',
      fullName: 'John Doe',
    },
    emailAddress: 'john.doe@school.edu',
  },
};

const mockTeacher = {
  userId: 'teacher123',
  courseId: 'course123',
  profile: {
    id: 'teacher123',
    name: {
      givenName: 'Jane',
      familyName: 'Smith',
      fullName: 'Jane Smith',
    },
    emailAddress: 'jane.smith@school.edu',
  },
};

const mockStoredCredential = {
  id: 'cred123',
  userId: 'user123',
  tenantId: 'tenant123',
  googleUserId: 'google123',
  email: 'user@school.edu',
  accessToken: 'encrypted_access_token',
  refreshToken: 'encrypted_refresh_token',
  expiresAt: new Date(Date.now() + 3600000),
  scopes: ['classroom.courses.readonly'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ══════════════════════════════════════════════════════════════════════════════
// TESTS: OAUTH FLOW
// ══════════════════════════════════════════════════════════════════════════════

describe('GoogleClassroomService - OAuth', () => {
  let service: GoogleClassroomService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GoogleClassroomService(mockPrisma, mockConfig);
  });

  describe('getAuthorizationUrl', () => {
    it('should generate a valid authorization URL', () => {
      const url = service.getAuthorizationUrl('user123', 'state123');

      expect(url).toContain('accounts.google.com');
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          access_type: 'offline',
          prompt: 'consent',
        })
      );
    });

    it('should include required scopes', () => {
      service.getAuthorizationUrl('user123', 'state123');

      const callArgs = mockOAuth2Client.generateAuthUrl.mock.calls[0][0];
      expect(callArgs.scope).toContain('classroom.courses.readonly');
      expect(callArgs.scope).toContain('classroom.rosters.readonly');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange auth code for tokens', async () => {
      mockPrisma.googleClassroomCredential.create.mockResolvedValue(mockStoredCredential);
      mockClassroomApi.userProfiles.get.mockResolvedValue({
        data: {
          id: 'google123',
          emailAddress: 'user@school.edu',
          name: { fullName: 'Test User' },
        },
      });

      const result = await service.exchangeCodeForTokens('user123', 'tenant123', 'auth_code');

      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('auth_code');
      expect(mockPrisma.googleClassroomCredential.create).toHaveBeenCalled();
      expect(result.email).toBe('user@school.edu');
    });

    it('should handle invalid auth code', async () => {
      mockOAuth2Client.getToken.mockRejectedValueOnce(new Error('invalid_grant'));

      await expect(
        service.exchangeCodeForTokens('user123', 'tenant123', 'invalid_code')
      ).rejects.toThrow();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh expired tokens', async () => {
      const expiredCredential = {
        ...mockStoredCredential,
        expiresAt: new Date(Date.now() - 1000),
      };
      mockPrisma.googleClassroomCredential.findUnique.mockResolvedValue(expiredCredential);
      mockPrisma.googleClassroomCredential.update.mockResolvedValue({
        ...expiredCredential,
        expiresAt: new Date(Date.now() + 3600000),
      });

      await service.getValidAccessToken('user123');

      expect(mockOAuth2Client.refreshAccessToken).toHaveBeenCalled();
      expect(mockPrisma.googleClassroomCredential.update).toHaveBeenCalled();
    });
  });

  describe('revokeAccess', () => {
    it('should revoke access and delete stored credentials', async () => {
      mockPrisma.googleClassroomCredential.findUnique.mockResolvedValue(mockStoredCredential);
      mockPrisma.googleClassroomCredential.delete.mockResolvedValue(mockStoredCredential);

      await service.revokeAccess('user123');

      expect(mockOAuth2Client.revokeToken).toHaveBeenCalled();
      expect(mockPrisma.googleClassroomCredential.delete).toHaveBeenCalled();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS: ROSTER SYNC
// ══════════════════════════════════════════════════════════════════════════════

describe('GoogleClassroomService - Roster Sync', () => {
  let service: GoogleClassroomService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GoogleClassroomService(mockPrisma, mockConfig);
    mockPrisma.googleClassroomCredential.findUnique.mockResolvedValue(mockStoredCredential);
  });

  describe('listCourses', () => {
    it('should list courses for authenticated user', async () => {
      mockClassroomApi.courses.list.mockResolvedValue({
        data: {
          courses: [mockCourse],
          nextPageToken: null,
        },
      });

      const courses = await service.listCourses('user123');

      expect(courses).toHaveLength(1);
      expect(courses[0].id).toBe('course123');
      expect(courses[0].name).toBe('Math 101');
    });

    it('should filter by course state', async () => {
      mockClassroomApi.courses.list.mockResolvedValue({
        data: { courses: [mockCourse] },
      });

      await service.listCourses('user123', { courseStates: ['ACTIVE'] });

      expect(mockClassroomApi.courses.list).toHaveBeenCalledWith(
        expect.objectContaining({
          courseStates: ['ACTIVE'],
        })
      );
    });

    it('should handle pagination', async () => {
      mockClassroomApi.courses.list
        .mockResolvedValueOnce({
          data: { courses: [mockCourse], nextPageToken: 'page2' },
        })
        .mockResolvedValueOnce({
          data: { courses: [{ ...mockCourse, id: 'course456' }], nextPageToken: null },
        });

      const courses = await service.listCourses('user123');

      expect(courses).toHaveLength(2);
      expect(mockClassroomApi.courses.list).toHaveBeenCalledTimes(2);
    });
  });

  describe('syncCourseRoster', () => {
    beforeEach(() => {
      mockPrisma.class.findUnique.mockResolvedValue({
        id: 'class123',
        tenantId: 'tenant123',
        googleCourseId: 'course123',
      });
      mockPrisma.enrollment.findMany.mockResolvedValue([]);
      mockClassroomApi.courses.get.mockResolvedValue({ data: mockCourse });
      mockClassroomApi.courses.students.list.mockResolvedValue({
        data: { students: [mockStudent] },
      });
      mockClassroomApi.courses.teachers.list.mockResolvedValue({
        data: { teachers: [mockTeacher] },
      });
    });

    it('should sync students from Google Classroom', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'newUser123' });
      mockPrisma.enrollment.create.mockResolvedValue({});

      const result = await service.syncCourseRoster('user123', 'tenant123', 'course123');

      expect(result.success).toBe(true);
      expect(result.studentsAdded).toBe(1);
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should update existing students', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existingUser' });
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { id: 'enroll1', googleUserId: 'student123', status: 'ACTIVE' },
      ]);

      const result = await service.syncCourseRoster('user123', 'tenant123', 'course123');

      expect(result.studentsUpdated).toBeGreaterThanOrEqual(0);
    });

    it('should handle removed students', async () => {
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { id: 'enroll1', googleUserId: 'removed_student', status: 'ACTIVE' },
      ]);
      mockClassroomApi.courses.students.list.mockResolvedValue({ data: { students: [] } });
      mockPrisma.enrollment.update.mockResolvedValue({});

      const result = await service.syncCourseRoster('user123', 'tenant123', 'course123');

      expect(result.studentsRemoved).toBe(1);
      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'INACTIVE' }),
        })
      );
    });

    it('should sync guardians when enabled', async () => {
      mockClassroomApi.userProfiles.guardians.list.mockResolvedValue({
        data: {
          guardians: [
            {
              guardianId: 'guardian123',
              guardianProfile: {
                id: 'guardian123',
                emailAddress: 'parent@example.com',
                name: { fullName: 'Parent Doe' },
              },
            },
          ],
        },
      });

      const result = await service.syncCourseRoster('user123', 'tenant123', 'course123', {
        syncGuardians: true,
      });

      expect(result.guardiansAdded).toBeGreaterThanOrEqual(0);
    });

    it('should handle API errors gracefully', async () => {
      mockClassroomApi.courses.students.list.mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      const result = await service.syncCourseRoster('user123', 'tenant123', 'course123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('rate limit'));
    });

    it('should log sync operations', async () => {
      await service.syncCourseRoster('user123', 'tenant123', 'course123');

      expect(mockPrisma.googleClassroomSyncLog.create).toHaveBeenCalled();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS: ASSIGNMENTS
// ══════════════════════════════════════════════════════════════════════════════

describe('AssignmentSyncService', () => {
  let service: AssignmentSyncService;
  let googleService: GoogleClassroomService;

  beforeEach(() => {
    vi.clearAllMocks();
    googleService = new GoogleClassroomService(mockPrisma, mockConfig);
    service = new AssignmentSyncService(mockPrisma, googleService);
    mockPrisma.googleClassroomCredential.findUnique.mockResolvedValue(mockStoredCredential);
  });

  describe('postLessonAsAssignment', () => {
    const mockLesson = {
      id: 'lesson123',
      title: 'Algebra Basics',
      description: 'Learn basic algebra concepts',
      estimatedMinutes: 30,
    };

    beforeEach(() => {
      mockPrisma.lesson.findUnique.mockResolvedValue(mockLesson);
      mockPrisma.googleClassroomAssignment.findUnique.mockResolvedValue(null);
      mockClassroomApi.courses.courseWork.create.mockResolvedValue({
        data: {
          id: 'assignment123',
          courseId: 'course123',
          title: 'Algebra Basics',
          alternateLink: 'https://classroom.google.com/...',
        },
      });
      mockPrisma.googleClassroomAssignment.create.mockResolvedValue({
        id: 'link123',
        googleAssignmentId: 'assignment123',
        googleCourseId: 'course123',
        lessonId: 'lesson123',
      });
    });

    it('should create assignment in Google Classroom', async () => {
      const result = await service.postLessonAsAssignment('user123', {
        lessonId: 'lesson123',
        courseId: 'course123',
        title: 'Algebra Basics',
        maxPoints: 100,
      });

      expect(mockClassroomApi.courses.courseWork.create).toHaveBeenCalled();
      expect(result.googleAssignmentId).toBe('assignment123');
    });

    it('should include due date when provided', async () => {
      const dueDate = new Date('2024-12-31T23:59:00Z');

      await service.postLessonAsAssignment('user123', {
        lessonId: 'lesson123',
        courseId: 'course123',
        title: 'Algebra Basics',
        dueDate: dueDate.toISOString(),
      });

      const createCall = mockClassroomApi.courses.courseWork.create.mock.calls[0][0];
      expect(createCall.requestBody.dueDate).toBeDefined();
      expect(createCall.requestBody.dueTime).toBeDefined();
    });

    it('should prevent duplicate assignments', async () => {
      mockPrisma.googleClassroomAssignment.findUnique.mockResolvedValue({
        id: 'existing',
        googleAssignmentId: 'assignment123',
      });

      await expect(
        service.postLessonAsAssignment('user123', {
          lessonId: 'lesson123',
          courseId: 'course123',
          title: 'Algebra Basics',
        })
      ).rejects.toThrow('already posted');
    });

    it('should store assignment link in database', async () => {
      await service.postLessonAsAssignment('user123', {
        lessonId: 'lesson123',
        courseId: 'course123',
        title: 'Algebra Basics',
        autoGradePassback: true,
      });

      expect(mockPrisma.googleClassroomAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lessonId: 'lesson123',
            googleCourseId: 'course123',
            autoGradePassback: true,
          }),
        })
      );
    });
  });

  describe('passbackGrade', () => {
    beforeEach(() => {
      mockPrisma.googleClassroomAssignment.findUnique.mockResolvedValue({
        id: 'link123',
        googleAssignmentId: 'assignment123',
        googleCourseId: 'course123',
        lessonId: 'lesson123',
        maxPoints: 100,
      });
      mockClassroomApi.courses.courseWork.studentSubmissions.get.mockResolvedValue({
        data: {
          id: 'submission123',
          courseId: 'course123',
          courseWorkId: 'assignment123',
          userId: 'student123',
          state: 'TURNED_IN',
        },
      });
      mockClassroomApi.courses.courseWork.studentSubmissions.patch.mockResolvedValue({
        data: { id: 'submission123', assignedGrade: 85 },
      });
      mockPrisma.gradePassbackLog.create.mockResolvedValue({});
    });

    it('should update grade in Google Classroom', async () => {
      await service.passbackGrade('user123', {
        assignmentId: 'link123',
        studentGoogleId: 'student123',
        score: 85,
        maxPoints: 100,
      });

      expect(mockClassroomApi.courses.courseWork.studentSubmissions.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          updateMask: 'assignedGrade,draftGrade',
          requestBody: expect.objectContaining({
            assignedGrade: 85,
            draftGrade: 85,
          }),
        })
      );
    });

    it('should return submission to student when requested', async () => {
      mockClassroomApi.courses.courseWork.studentSubmissions.return.mockResolvedValue({});

      await service.passbackGrade('user123', {
        assignmentId: 'link123',
        studentGoogleId: 'student123',
        score: 85,
        maxPoints: 100,
        returnToStudent: true,
      });

      expect(mockClassroomApi.courses.courseWork.studentSubmissions.return).toHaveBeenCalled();
    });

    it('should log grade passback', async () => {
      await service.passbackGrade('user123', {
        assignmentId: 'link123',
        studentGoogleId: 'student123',
        score: 85,
        maxPoints: 100,
      });

      expect(mockPrisma.gradePassbackLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            score: 85,
            success: true,
          }),
        })
      );
    });

    it('should handle submission not found', async () => {
      mockClassroomApi.courses.courseWork.studentSubmissions.get.mockRejectedValue({
        code: 404,
        message: 'Submission not found',
      });

      await expect(
        service.passbackGrade('user123', {
          assignmentId: 'link123',
          studentGoogleId: 'unknown_student',
          score: 85,
          maxPoints: 100,
        })
      ).rejects.toThrow();
    });
  });

  describe('batchPassbackGrades', () => {
    it('should process multiple grades', async () => {
      mockPrisma.googleClassroomAssignment.findUnique.mockResolvedValue({
        id: 'link123',
        googleAssignmentId: 'assignment123',
        googleCourseId: 'course123',
        maxPoints: 100,
      });
      mockClassroomApi.courses.courseWork.studentSubmissions.get.mockResolvedValue({
        data: { id: 'submission123', state: 'TURNED_IN' },
      });
      mockClassroomApi.courses.courseWork.studentSubmissions.patch.mockResolvedValue({
        data: { assignedGrade: 85 },
      });

      const result = await service.batchPassbackGrades('user123', 'link123', [
        { studentGoogleId: 'student1', score: 85 },
        { studentGoogleId: 'student2', score: 92 },
        { studentGoogleId: 'student3', score: 78 },
      ]);

      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should continue on individual failures', async () => {
      mockPrisma.googleClassroomAssignment.findUnique.mockResolvedValue({
        id: 'link123',
        googleAssignmentId: 'assignment123',
        googleCourseId: 'course123',
        maxPoints: 100,
      });
      mockClassroomApi.courses.courseWork.studentSubmissions.get
        .mockResolvedValueOnce({ data: { id: 'sub1' } })
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({ data: { id: 'sub3' } });
      mockClassroomApi.courses.courseWork.studentSubmissions.patch.mockResolvedValue({
        data: { assignedGrade: 85 },
      });

      const result = await service.batchPassbackGrades('user123', 'link123', [
        { studentGoogleId: 'student1', score: 85 },
        { studentGoogleId: 'student2', score: 92 },
        { studentGoogleId: 'student3', score: 78 },
      ]);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS: ERROR HANDLING
// ══════════════════════════════════════════════════════════════════════════════

describe('GoogleClassroomErrorHandler', () => {
  describe('parseGoogleError', () => {
    it('should identify token expired error', () => {
      const error = { status: 401, message: 'Token has been expired or revoked' };
      const parsed = GoogleClassroomErrorHandler.handle(error);

      expect(parsed.code).toBe(ErrorCodes.TOKEN_EXPIRED);
      expect(parsed.retryConfig.retryable).toBe(false);
    });

    it('should identify rate limit error', () => {
      const error = { status: 429, message: 'Rate limit exceeded' };
      const parsed = GoogleClassroomErrorHandler.handle(error);

      expect(parsed.code).toBe(ErrorCodes.RATE_LIMITED);
      expect(parsed.retryConfig.retryable).toBe(true);
    });

    it('should identify permission denied error', () => {
      const error = { status: 403, message: 'Permission denied' };
      const parsed = GoogleClassroomErrorHandler.handle(error);

      expect(parsed.code).toBe(ErrorCodes.PERMISSION_DENIED);
      expect(parsed.retryConfig.retryable).toBe(false);
    });

    it('should identify server error', () => {
      const error = { status: 500, message: 'Internal server error' };
      const parsed = GoogleClassroomErrorHandler.handle(error);

      expect(parsed.code).toBe(ErrorCodes.GOOGLE_SERVER_ERROR);
      expect(parsed.retryConfig.retryable).toBe(true);
    });
  });

  describe('isRetryable', () => {
    it('should return true for transient errors', () => {
      expect(GoogleClassroomErrorHandler.isRetryable({ status: 429 })).toBe(true);
      expect(GoogleClassroomErrorHandler.isRetryable({ status: 500 })).toBe(true);
      expect(GoogleClassroomErrorHandler.isRetryable({ status: 503 })).toBe(true);
    });

    it('should return false for permanent errors', () => {
      expect(GoogleClassroomErrorHandler.isRetryable({ status: 401 })).toBe(false);
      expect(GoogleClassroomErrorHandler.isRetryable({ status: 403 })).toBe(false);
      expect(GoogleClassroomErrorHandler.isRetryable({ status: 404 })).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should apply exponential backoff', () => {
      const error = { status: 429 };

      const delay0 = GoogleClassroomErrorHandler.getRetryDelay(error, 0);
      const delay1 = GoogleClassroomErrorHandler.getRetryDelay(error, 1);
      const delay2 = GoogleClassroomErrorHandler.getRetryDelay(error, 2);

      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);
    });

    it('should return 0 for non-retryable errors', () => {
      const error = { status: 401 };
      expect(GoogleClassroomErrorHandler.getRetryDelay(error, 0)).toBe(0);
    });
  });

  describe('getUserMessage', () => {
    it('should return user-friendly messages', () => {
      const tokenError = { status: 401, message: 'Token has been expired' };
      const message = GoogleClassroomErrorHandler.getUserMessage(tokenError);

      expect(message).toContain('reconnect');
      expect(message).not.toContain('token');
    });
  });

  describe('requiresUserAction', () => {
    it('should identify auth errors requiring user action', () => {
      expect(GoogleClassroomErrorHandler.requiresUserAction({ status: 401 })).toBe(true);
      expect(
        GoogleClassroomErrorHandler.requiresUserAction({
          message: 'insufficient scope',
        })
      ).toBe(true);
    });

    it('should not require user action for server errors', () => {
      expect(GoogleClassroomErrorHandler.requiresUserAction({ status: 500 })).toBe(false);
      expect(GoogleClassroomErrorHandler.requiresUserAction({ status: 429 })).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS: WEBHOOKS
// ══════════════════════════════════════════════════════════════════════════════

describe('GoogleClassroomService - Webhooks', () => {
  let service: GoogleClassroomService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GoogleClassroomService(mockPrisma, mockConfig);
    mockPrisma.googleClassroomCredential.findUnique.mockResolvedValue(mockStoredCredential);
  });

  describe('registerPushNotifications', () => {
    it('should register for course roster changes', async () => {
      mockClassroomApi.registrations.create.mockResolvedValue({
        data: {
          registrationId: 'reg123',
          expirationTime: new Date(Date.now() + 604800000).toISOString(),
        },
      });
      mockPrisma.googleClassroomWebhookRegistration.create.mockResolvedValue({});

      const result = await service.registerPushNotifications(
        'user123',
        'course123',
        'COURSE_ROSTER_CHANGES'
      );

      expect(mockClassroomApi.registrations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            feed: {
              feedType: 'COURSE_ROSTER_CHANGES',
              courseRosterChangesInfo: { courseId: 'course123' },
            },
          }),
        })
      );
      expect(result.registrationId).toBe('reg123');
    });

    it('should store registration in database', async () => {
      mockClassroomApi.registrations.create.mockResolvedValue({
        data: {
          registrationId: 'reg123',
          expirationTime: new Date(Date.now() + 604800000).toISOString(),
        },
      });

      await service.registerPushNotifications('user123', 'course123', 'COURSE_ROSTER_CHANGES');

      expect(mockPrisma.googleClassroomWebhookRegistration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            courseId: 'course123',
            feedType: 'COURSE_ROSTER_CHANGES',
            active: true,
          }),
        })
      );
    });
  });

  describe('processWebhookNotification', () => {
    it('should process roster change notification', async () => {
      const notification = {
        collection: 'course_roster_changes',
        eventType: 'CREATED',
        resourceId: {
          courseid: 'course123',
        },
      };

      mockPrisma.googleClassroomWebhookRegistration.findFirst.mockResolvedValue({
        courseId: 'course123',
      });

      // Spy on syncCourseRoster
      const syncSpy = vi.spyOn(service, 'syncCourseRoster').mockResolvedValue({
        courseId: 'course123',
        success: true,
        studentsAdded: 1,
        studentsRemoved: 0,
        studentsUpdated: 0,
        teachersAdded: 0,
        teachersRemoved: 0,
        guardiansAdded: 0,
        errors: [],
        duration: 1000,
      });

      await service.processWebhookNotification(notification);

      expect(syncSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'course123',
        expect.any(Object)
      );
    });

    it('should ignore duplicate notifications', async () => {
      const notification = {
        collection: 'course_roster_changes',
        eventType: 'CREATED',
        resourceId: { courseid: 'course123' },
      };

      mockPrisma.googleClassroomWebhookRegistration.findFirst.mockResolvedValue(null);

      await service.processWebhookNotification(notification);

      // Should not trigger sync when registration not found
      expect(mockPrisma.googleClassroomSyncLog.create).not.toHaveBeenCalled();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS: EDGE CASES
// ══════════════════════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  let service: GoogleClassroomService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GoogleClassroomService(mockPrisma, mockConfig);
  });

  describe('Token Expiration During Operation', () => {
    it('should refresh token mid-operation and retry', async () => {
      const expiredCredential = {
        ...mockStoredCredential,
        expiresAt: new Date(Date.now() - 1000),
      };
      mockPrisma.googleClassroomCredential.findUnique.mockResolvedValue(expiredCredential);
      mockPrisma.googleClassroomCredential.update.mockResolvedValue({
        ...expiredCredential,
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockClassroomApi.courses.list.mockResolvedValue({
        data: { courses: [mockCourse] },
      });

      const courses = await service.listCourses('user123');

      expect(mockOAuth2Client.refreshAccessToken).toHaveBeenCalled();
      expect(courses).toHaveLength(1);
    });
  });

  describe('Archived Courses', () => {
    it('should handle archived course gracefully', async () => {
      mockPrisma.googleClassroomCredential.findUnique.mockResolvedValue(mockStoredCredential);
      mockClassroomApi.courses.get.mockResolvedValue({
        data: { ...mockCourse, courseState: 'ARCHIVED' },
      });

      const course = await service.getCourse('user123', 'course123');

      expect(course.courseState).toBe('ARCHIVED');
    });
  });

  describe('Empty Course', () => {
    it('should sync empty course without errors', async () => {
      mockPrisma.googleClassroomCredential.findUnique.mockResolvedValue(mockStoredCredential);
      mockPrisma.class.findUnique.mockResolvedValue({
        id: 'class123',
        tenantId: 'tenant123',
        googleCourseId: 'course123',
      });
      mockPrisma.enrollment.findMany.mockResolvedValue([]);
      mockClassroomApi.courses.get.mockResolvedValue({ data: mockCourse });
      mockClassroomApi.courses.students.list.mockResolvedValue({ data: { students: [] } });
      mockClassroomApi.courses.teachers.list.mockResolvedValue({ data: { teachers: [] } });

      const result = await service.syncCourseRoster('user123', 'tenant123', 'course123');

      expect(result.success).toBe(true);
      expect(result.studentsAdded).toBe(0);
    });
  });

  describe('Network Failures', () => {
    it('should handle network timeout', async () => {
      mockPrisma.googleClassroomCredential.findUnique.mockResolvedValue(mockStoredCredential);
      mockClassroomApi.courses.list.mockRejectedValue(new Error('ETIMEDOUT: Connection timed out'));

      await expect(service.listCourses('user123')).rejects.toThrow();
    });
  });

  describe('Concurrent Sync Prevention', () => {
    it('should prevent concurrent sync on same course', async () => {
      mockPrisma.googleClassroomSync.findUnique.mockResolvedValue({
        syncInProgress: true,
        lastSyncAt: new Date(),
      });

      const result = await service.syncCourseRoster('user123', 'tenant123', 'course123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('already in progress'));
    });
  });
});
