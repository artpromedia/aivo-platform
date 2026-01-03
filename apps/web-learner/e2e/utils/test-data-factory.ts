import { APIRequestContext, request } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * Test Data Factory
 *
 * Manages test data lifecycle:
 * - User creation and cleanup
 * - Lesson and course data
 * - Authentication tokens
 * - MFA codes
 * - Progress and achievements
 * - Automatic cleanup on teardown
 */

const API_BASE_URL = process.env.E2E_API_URL || 'http://localhost:4000/api';
const ADMIN_TOKEN = process.env.E2E_ADMIN_TOKEN || 'test-admin-token';

export class TestDataFactory {
  private static apiContext: APIRequestContext;
  private static createdUsers: string[] = [];
  private static createdLessons: string[] = [];
  private static createdCourses: string[] = [];
  private static createdClasses: string[] = [];
  private static initialized = false;

  // ============================================================================
  // INITIALIZATION & CLEANUP
  // ============================================================================

  /**
   * Initialize the factory with API context
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    this.apiContext = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
        'x-test-mode': 'true',
      },
    });

    this.initialized = true;
    console.log('📦 TestDataFactory initialized');
  }

  /**
   * Cleanup all created test data
   */
  static async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    // Delete in reverse order of dependencies
    for (const classId of this.createdClasses) {
      await this.safeDelete(`/test/classes/${classId}`);
    }
    this.createdClasses = [];

    for (const lessonId of this.createdLessons) {
      await this.safeDelete(`/test/lessons/${lessonId}`);
    }
    this.createdLessons = [];

    for (const courseId of this.createdCourses) {
      await this.safeDelete(`/test/courses/${courseId}`);
    }
    this.createdCourses = [];

    for (const userId of this.createdUsers) {
      await this.safeDelete(`/test/users/${userId}`);
    }
    this.createdUsers = [];

    await this.apiContext?.dispose();
    this.initialized = false;

    console.log('✅ Test data cleanup complete');
  }

  private static async safeDelete(path: string): Promise<void> {
    try {
      await this.apiContext.delete(path);
    } catch (error) {
      console.warn(`Failed to delete ${path}:`, error);
    }
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  /**
   * Create a test user
   */
  static async createUser(options: CreateUserOptions = {}): Promise<TestUser> {
    await this.ensureInitialized();

    const userData = {
      email: options.email || faker.internet.email({ provider: 'test.aivo.edu' }),
      password: options.password || 'TestPassword123!',
      firstName: options.firstName || faker.person.firstName(),
      lastName: options.lastName || faker.person.lastName(),
      role: options.role || 'student',
      verified: options.verified ?? true,
      tenantId: options.tenantId || 'test-tenant',
      gradeLevel: options.gradeLevel || '6',
    };

    const response = await this.apiContext.post('/test/users', {
      data: userData,
    });

    if (!response.ok()) {
      throw new Error(`Failed to create user: ${await response.text()}`);
    }

    const user = await response.json();
    this.createdUsers.push(user.id);

    // Enable MFA if requested
    let mfaSecret: string | undefined;
    if (options.mfaEnabled) {
      const mfaResult = await this.enableMFA(user.id);
      mfaSecret = mfaResult.secret;
    }

    return {
      id: user.id,
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role as UserRole,
      verified: userData.verified,
      mfaEnabled: options.mfaEnabled || false,
      mfaSecret,
      tenantId: userData.tenantId,
      gradeLevel: userData.gradeLevel,
    };
  }

  /**
   * Create multiple test users
   */
  static async createUsers(count: number, options: CreateUserOptions = {}): Promise<TestUser[]> {
    const users: TestUser[] = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.createUser(options));
    }
    return users;
  }

  /**
   * Delete a test user
   */
  static async deleteUser(userId: string): Promise<void> {
    await this.ensureInitialized();

    const response = await this.apiContext.delete(`/test/users/${userId}`);
    if (!response.ok()) {
      throw new Error(`Failed to delete user: ${await response.text()}`);
    }

    this.createdUsers = this.createdUsers.filter((id) => id !== userId);
  }

  /**
   * Update user data
   */
  static async updateUser(userId: string, updates: Partial<CreateUserOptions>): Promise<void> {
    await this.ensureInitialized();

    const response = await this.apiContext.patch(`/test/users/${userId}`, {
      data: updates,
    });

    if (!response.ok()) {
      throw new Error(`Failed to update user: ${await response.text()}`);
    }
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /**
   * Enable MFA for a user
   */
  static async enableMFA(userId: string): Promise<{ secret: string }> {
    await this.ensureInitialized();

    const response = await this.apiContext.post(`/test/users/${userId}/mfa/enable`);
    if (!response.ok()) {
      throw new Error(`Failed to enable MFA: ${await response.text()}`);
    }

    return await response.json();
  }

  /**
   * Generate TOTP code for MFA
   */
  static async generateTotpCode(secret: string): Promise<string> {
    // Simple TOTP implementation for testing
    const { TOTP } = await import('otpauth');

    const totp = new TOTP({
      secret,
      digits: 6,
      period: 30,
    });

    return totp.generate();
  }

  /**
   * Create password reset token
   */
  static async createPasswordResetToken(email: string): Promise<string> {
    await this.ensureInitialized();

    const response = await this.apiContext.post('/test/password-reset-token', {
      data: { email },
    });

    if (!response.ok()) {
      throw new Error(`Failed to create reset token: ${await response.text()}`);
    }

    const { token } = await response.json();
    return token;
  }

  /**
   * Reset user password directly
   */
  static async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    await this.ensureInitialized();

    const response = await this.apiContext.put(`/test/users/${userId}/password`, {
      data: { password: newPassword },
    });

    if (!response.ok()) {
      throw new Error(`Failed to reset password: ${await response.text()}`);
    }
  }

  /**
   * Expire user session
   */
  static async expireUserSession(userId: string): Promise<void> {
    await this.ensureInitialized();

    const response = await this.apiContext.post(`/test/users/${userId}/expire-session`);
    if (!response.ok()) {
      throw new Error(`Failed to expire session: ${await response.text()}`);
    }
  }

  /**
   * Get authentication token for a user
   */
  static async getAuthToken(email: string, password: string): Promise<string> {
    await this.ensureInitialized();

    const response = await this.apiContext.post('/auth/login', {
      data: { email, password },
    });

    if (!response.ok()) {
      throw new Error(`Failed to get auth token: ${await response.text()}`);
    }

    const { accessToken } = await response.json();
    return accessToken;
  }

  /**
   * Create authenticated API context for a user
   */
  static async createAuthenticatedContext(user: TestUser): Promise<APIRequestContext> {
    const token = await this.getAuthToken(user.email, user.password);

    return await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // ============================================================================
  // LESSON MANAGEMENT
  // ============================================================================

  /**
   * Create a test lesson
   */
  static async createLesson(options: CreateLessonOptions = {}): Promise<TestLesson> {
    await this.ensureInitialized();

    const lessonData = {
      title: options.title || faker.lorem.sentence(4),
      description: options.description || faker.lorem.paragraph(),
      subject: options.subject || 'Mathematics',
      gradeLevel: options.gradeLevel || '6',
      duration: options.duration || 30,
      blocks: options.blocks || this.generateDefaultBlocks(),
      published: options.published ?? true,
      tenantId: options.tenantId || 'test-tenant',
    };

    const response = await this.apiContext.post('/test/lessons', {
      data: lessonData,
    });

    if (!response.ok()) {
      throw new Error(`Failed to create lesson: ${await response.text()}`);
    }

    const lesson = await response.json();
    this.createdLessons.push(lesson.id);

    return {
      id: lesson.id,
      title: lessonData.title,
      description: lessonData.description,
      subject: lessonData.subject,
      gradeLevel: lessonData.gradeLevel,
      duration: lessonData.duration,
      blockCount: lessonData.blocks.length,
      published: lessonData.published,
    };
  }

  /**
   * Generate default lesson blocks for testing
   */
  static generateDefaultBlocks(): LessonBlock[] {
    return [
      {
        type: 'heading',
        data: {
          content: faker.lorem.sentence(3),
          level: 1,
        },
      },
      {
        type: 'text',
        data: {
          content: faker.lorem.paragraphs(2),
        },
      },
      {
        type: 'question',
        data: {
          type: 'multiple_choice',
          stem: 'What is 2 + 2?',
          options: [
            { id: 'a', text: '3', correct: false },
            { id: 'b', text: '4', correct: true },
            { id: 'c', text: '5', correct: false },
            { id: 'd', text: '6', correct: false },
          ],
          explanation: 'Two plus two equals four.',
          points: 10,
        },
      },
      {
        type: 'text',
        data: {
          content: faker.lorem.paragraph(),
        },
      },
      {
        type: 'question',
        data: {
          type: 'fill_blank',
          stem: 'The capital of France is ___.',
          correctAnswer: 'Paris',
          explanation: 'Paris is the capital city of France.',
          points: 10,
        },
      },
    ];
  }

  /**
   * Delete a test lesson
   */
  static async deleteLesson(lessonId: string): Promise<void> {
    await this.ensureInitialized();

    const response = await this.apiContext.delete(`/test/lessons/${lessonId}`);
    if (!response.ok()) {
      throw new Error(`Failed to delete lesson: ${await response.text()}`);
    }

    this.createdLessons = this.createdLessons.filter((id) => id !== lessonId);
  }

  /**
   * Get lesson by ID
   */
  static async getLesson(lessonId: string): Promise<TestLesson> {
    await this.ensureInitialized();

    const response = await this.apiContext.get(`/lessons/${lessonId}`);
    if (!response.ok()) {
      throw new Error(`Failed to get lesson: ${await response.text()}`);
    }

    return await response.json();
  }

  // ============================================================================
  // COURSE MANAGEMENT
  // ============================================================================

  /**
   * Create a test course
   */
  static async createCourse(options: CreateCourseOptions = {}): Promise<TestCourse> {
    await this.ensureInitialized();

    // Create lessons if not provided
    let lessonIds = options.lessonIds || [];
    if (lessonIds.length === 0 && options.lessonCount) {
      for (let i = 0; i < options.lessonCount; i++) {
        const lesson = await this.createLesson({
          title: `${options.title || 'Test Course'} - Lesson ${i + 1}`,
          subject: options.subject,
          gradeLevel: options.gradeLevel,
        });
        lessonIds.push(lesson.id);
      }
    }

    const courseData = {
      title: options.title || faker.lorem.words(3),
      description: options.description || faker.lorem.paragraph(),
      subject: options.subject || 'Mathematics',
      gradeLevel: options.gradeLevel || '6',
      lessonIds,
      published: options.published ?? true,
      tenantId: options.tenantId || 'test-tenant',
    };

    const response = await this.apiContext.post('/test/courses', {
      data: courseData,
    });

    if (!response.ok()) {
      throw new Error(`Failed to create course: ${await response.text()}`);
    }

    const course = await response.json();
    this.createdCourses.push(course.id);

    return {
      id: course.id,
      title: courseData.title,
      description: courseData.description,
      subject: courseData.subject,
      gradeLevel: courseData.gradeLevel,
      lessonIds,
      published: courseData.published,
    };
  }

  /**
   * Delete a test course
   */
  static async deleteCourse(courseId: string): Promise<void> {
    await this.ensureInitialized();

    const response = await this.apiContext.delete(`/test/courses/${courseId}`);
    if (!response.ok()) {
      throw new Error(`Failed to delete course: ${await response.text()}`);
    }

    this.createdCourses = this.createdCourses.filter((id) => id !== courseId);
  }

  // ============================================================================
  // PROGRESS & GAMIFICATION
  // ============================================================================

  /**
   * Set user progress
   */
  static async setUserProgress(
    userId: string,
    options: { xp?: number; level?: number; streak?: number; completedLessons?: string[] }
  ): Promise<void> {
    await this.ensureInitialized();

    const response = await this.apiContext.put(`/test/users/${userId}/progress`, {
      data: options,
    });

    if (!response.ok()) {
      throw new Error(`Failed to set user progress: ${await response.text()}`);
    }
  }

  /**
   * Complete lesson for user
   */
  static async completeLessonForUser(
    userId: string,
    lessonId: string,
    options?: { score?: number; xpEarned?: number }
  ): Promise<void> {
    await this.ensureInitialized();

    const response = await this.apiContext.post(`/test/users/${userId}/complete-lesson`, {
      data: { lessonId, ...options },
    });

    if (!response.ok()) {
      throw new Error(`Failed to complete lesson: ${await response.text()}`);
    }
  }

  /**
   * Add achievement to user
   */
  static async addAchievement(userId: string, achievementId: string): Promise<void> {
    await this.ensureInitialized();

    const response = await this.apiContext.post(`/test/users/${userId}/achievements`, {
      data: { achievementId },
    });

    if (!response.ok()) {
      throw new Error(`Failed to add achievement: ${await response.text()}`);
    }
  }

  /**
   * Get user progress
   */
  static async getUserProgress(userId: string): Promise<UserProgress> {
    await this.ensureInitialized();

    const response = await this.apiContext.get(`/test/users/${userId}/progress`);
    if (!response.ok()) {
      throw new Error(`Failed to get user progress: ${await response.text()}`);
    }

    return await response.json();
  }

  // ============================================================================
  // CLASS MANAGEMENT
  // ============================================================================

  /**
   * Create a test class
   */
  static async createClass(options: CreateClassOptions = {}): Promise<TestClass> {
    await this.ensureInitialized();

    const classData = {
      name: options.name || faker.lorem.words(2) + ' Class',
      teacherId: options.teacherId,
      studentIds: options.studentIds || [],
      courseIds: options.courseIds || [],
      gradeLevel: options.gradeLevel || '6',
      tenantId: options.tenantId || 'test-tenant',
    };

    const response = await this.apiContext.post('/test/classes', {
      data: classData,
    });

    if (!response.ok()) {
      throw new Error(`Failed to create class: ${await response.text()}`);
    }

    const testClass = await response.json();
    this.createdClasses.push(testClass.id);

    return {
      id: testClass.id,
      name: classData.name,
      teacherId: classData.teacherId,
      studentIds: classData.studentIds,
      courseIds: classData.courseIds,
      gradeLevel: classData.gradeLevel,
    };
  }

  /**
   * Add student to class
   */
  static async addStudentToClass(classId: string, studentId: string): Promise<void> {
    await this.ensureInitialized();

    const response = await this.apiContext.post(`/test/classes/${classId}/students`, {
      data: { studentId },
    });

    if (!response.ok()) {
      throw new Error(`Failed to add student to class: ${await response.text()}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private static async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Generate random email
   */
  static generateEmail(): string {
    return faker.internet.email({ provider: 'test.aivo.edu' });
  }

  /**
   * Generate random password
   */
  static generatePassword(): string {
    return faker.internet.password({ length: 16, memorable: false }) + 'A1!';
  }

  /**
   * Generate random name
   */
  static generateName(): { firstName: string; lastName: string } {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };
  }

  /**
   * Wait for a specified duration (for testing timeouts)
   */
  static async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// TYPES
// ============================================================================

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export interface CreateUserOptions {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  verified?: boolean;
  mfaEnabled?: boolean;
  tenantId?: string;
  gradeLevel?: string;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  verified: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  tenantId: string;
  gradeLevel: string;
}

export interface CreateLessonOptions {
  title?: string;
  description?: string;
  subject?: string;
  gradeLevel?: string;
  duration?: number;
  blocks?: LessonBlock[];
  published?: boolean;
  tenantId?: string;
}

export interface LessonBlock {
  type: 'text' | 'heading' | 'image' | 'video' | 'question' | 'interactive';
  data: Record<string, unknown>;
}

export interface TestLesson {
  id: string;
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  duration: number;
  blockCount: number;
  published: boolean;
}

export interface CreateCourseOptions {
  title?: string;
  description?: string;
  subject?: string;
  gradeLevel?: string;
  lessonIds?: string[];
  lessonCount?: number;
  published?: boolean;
  tenantId?: string;
}

export interface TestCourse {
  id: string;
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  lessonIds: string[];
  published: boolean;
}

export interface CreateClassOptions {
  name?: string;
  teacherId?: string;
  studentIds?: string[];
  courseIds?: string[];
  gradeLevel?: string;
  tenantId?: string;
}

export interface TestClass {
  id: string;
  name: string;
  teacherId?: string;
  studentIds: string[];
  courseIds: string[];
  gradeLevel: string;
}

export interface UserProgress {
  xp: number;
  level: number;
  streak: number;
  completedLessons: string[];
  achievements: string[];
}
