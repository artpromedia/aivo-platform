/**
 * API Integration Tests
 *
 * Comprehensive integration tests for all API endpoints using
 * real containerized infrastructure (PostgreSQL, Redis, etc.)
 *
 * COPPA Compliance: Tests verify child-safe data handling
 */

import { test, expect, APIRequestContext, request } from '@playwright/test';
import {
  getTestContainers,
  stopTestContainers,
  setTestEnvironment,
  TestContainersManager,
} from './testcontainers.config';
import { TestDataFactory } from '../utils/test-data-factory';

let containers: TestContainersManager;
let apiContext: APIRequestContext;

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

test.describe('API Integration Tests', () => {
  test.beforeAll(async () => {
    // Start test containers
    containers = await getTestContainers();
    const config = containers.getConfig();
    setTestEnvironment(config);

    // Create API request context
    apiContext = await request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'X-Test-Mode': 'true',
      },
    });

    // Initialize test data
    await TestDataFactory.initialize();
  });

  test.afterAll(async () => {
    await apiContext.dispose();
    await TestDataFactory.cleanup();
    await stopTestContainers();
  });

  test.beforeEach(async () => {
    // Reset database state between tests if needed
    // await containers.resetDatabase();
  });

  // ===========================================================================
  // AUTHENTICATION ENDPOINTS
  // ===========================================================================

  test.describe('Authentication API', () => {
    test('POST /api/auth/register - should register new user', async () => {
      const userData = {
        email: `test-${Date.now()}@example.com`,
        password: 'SecureP@ss123!',
        name: 'Test User',
        dateOfBirth: '2010-01-15', // Child user for COPPA
        parentEmail: 'parent@example.com',
      };

      const response = await apiContext.post('/api/auth/register', {
        data: userData,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        success: true,
        user: {
          email: userData.email,
          name: userData.name,
          requiresParentalConsent: true, // COPPA requirement
        },
      });
      expect(body.user.password).toBeUndefined(); // Password not returned
    });

    test('POST /api/auth/register - should reject weak password', async () => {
      const response = await apiContext.post('/api/auth/register', {
        data: {
          email: 'weak@example.com',
          password: '123', // Too weak
          name: 'Weak Pass User',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('password');
    });

    test('POST /api/auth/login - should login with valid credentials', async () => {
      const testUser = await TestDataFactory.createUser({
        email: `login-test-${Date.now()}@example.com`,
        password: 'TestP@ss123!',
      });

      const response = await apiContext.post('/api/auth/login', {
        data: {
          email: testUser.email,
          password: 'TestP@ss123!',
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        success: true,
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: testUser.id,
          email: testUser.email,
        },
      });
    });

    test('POST /api/auth/login - should reject invalid credentials', async () => {
      const response = await apiContext.post('/api/auth/login', {
        data: {
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test('POST /api/auth/logout - should invalidate session', async () => {
      const testUser = await TestDataFactory.createUser();
      const loginResponse = await apiContext.post('/api/auth/login', {
        data: {
          email: testUser.email,
          password: testUser.password!,
        },
      });

      const { accessToken, refreshToken } = await loginResponse.json();

      const logoutResponse = await apiContext.post('/api/auth/logout', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: { refreshToken },
      });

      expect(logoutResponse.ok()).toBeTruthy();

      // Verify token is invalidated
      const protectedResponse = await apiContext.get('/api/user/profile', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(protectedResponse.status()).toBe(401);
    });

    test('POST /api/auth/refresh - should refresh access token', async () => {
      const testUser = await TestDataFactory.createUser();
      const loginResponse = await apiContext.post('/api/auth/login', {
        data: {
          email: testUser.email,
          password: testUser.password!,
        },
      });

      const { refreshToken } = await loginResponse.json();

      const refreshResponse = await apiContext.post('/api/auth/refresh', {
        data: { refreshToken },
      });

      expect(refreshResponse.ok()).toBeTruthy();
      const body = await refreshResponse.json();
      expect(body.accessToken).toBeDefined();
    });
  });

  // ===========================================================================
  // USER ENDPOINTS
  // ===========================================================================

  test.describe('User API', () => {
    let authHeaders: Record<string, string>;
    let testUser: Awaited<ReturnType<typeof TestDataFactory.createUser>>;

    test.beforeAll(async () => {
      testUser = await TestDataFactory.createUser();
      const loginResponse = await apiContext.post('/api/auth/login', {
        data: {
          email: testUser.email,
          password: testUser.password!,
        },
      });
      const { accessToken } = await loginResponse.json();
      authHeaders = { Authorization: `Bearer ${accessToken}` };
    });

    test('GET /api/user/profile - should return user profile', async () => {
      const response = await apiContext.get('/api/user/profile', {
        headers: authHeaders,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
      });
    });

    test('PATCH /api/user/profile - should update profile', async () => {
      const response = await apiContext.patch('/api/user/profile', {
        headers: authHeaders,
        data: {
          name: 'Updated Name',
          preferences: {
            theme: 'dark',
            soundEnabled: false,
          },
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.name).toBe('Updated Name');
      expect(body.preferences.theme).toBe('dark');
    });

    test('GET /api/user/progress - should return learning progress', async () => {
      const response = await apiContext.get('/api/user/progress', {
        headers: authHeaders,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        totalXP: expect.any(Number),
        level: expect.any(Number),
        streak: expect.any(Number),
        lessonsCompleted: expect.any(Number),
        coursesInProgress: expect.any(Array),
      });
    });

    test('GET /api/user/achievements - should return achievements', async () => {
      const response = await apiContext.get('/api/user/achievements', {
        headers: authHeaders,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        achievements: expect.any(Array),
        totalPoints: expect.any(Number),
      });
    });
  });

  // ===========================================================================
  // COURSE ENDPOINTS
  // ===========================================================================

  test.describe('Course API', () => {
    let authHeaders: Record<string, string>;

    test.beforeAll(async () => {
      const testUser = await TestDataFactory.createUser();
      const loginResponse = await apiContext.post('/api/auth/login', {
        data: {
          email: testUser.email,
          password: testUser.password!,
        },
      });
      const { accessToken } = await loginResponse.json();
      authHeaders = { Authorization: `Bearer ${accessToken}` };
    });

    test('GET /api/courses - should return course catalog', async () => {
      const response = await apiContext.get('/api/courses', {
        headers: authHeaders,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        courses: expect.any(Array),
        pagination: {
          page: 1,
          limit: expect.any(Number),
          total: expect.any(Number),
        },
      });
    });

    test('GET /api/courses - should filter by age group (COPPA)', async () => {
      const response = await apiContext.get('/api/courses?ageGroup=6-8', {
        headers: authHeaders,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      // All courses should be appropriate for the age group
      body.courses.forEach((course: any) => {
        expect(course.ageGroups).toContain('6-8');
        expect(course.adultContent).toBeFalsy();
      });
    });

    test('GET /api/courses/:id - should return course details', async () => {
      const testCourse = await TestDataFactory.createCourse();

      const response = await apiContext.get(`/api/courses/${testCourse.id}`, {
        headers: authHeaders,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        id: testCourse.id,
        title: testCourse.title,
        lessons: expect.any(Array),
        totalLessons: expect.any(Number),
      });
    });

    test('POST /api/courses/:id/enroll - should enroll user', async () => {
      const testCourse = await TestDataFactory.createCourse();

      const response = await apiContext.post(`/api/courses/${testCourse.id}/enroll`, {
        headers: authHeaders,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        enrolled: true,
        enrolledAt: expect.any(String),
        progress: 0,
      });
    });
  });

  // ===========================================================================
  // LESSON ENDPOINTS
  // ===========================================================================

  test.describe('Lesson API', () => {
    let authHeaders: Record<string, string>;
    let testLesson: Awaited<ReturnType<typeof TestDataFactory.createLesson>>;

    test.beforeAll(async () => {
      const testUser = await TestDataFactory.createUser();
      testLesson = await TestDataFactory.createLesson();

      const loginResponse = await apiContext.post('/api/auth/login', {
        data: {
          email: testUser.email,
          password: testUser.password!,
        },
      });
      const { accessToken } = await loginResponse.json();
      authHeaders = { Authorization: `Bearer ${accessToken}` };
    });

    test('GET /api/lessons/:id - should return lesson content', async () => {
      const response = await apiContext.get(`/api/lessons/${testLesson.id}`, {
        headers: authHeaders,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        id: testLesson.id,
        title: testLesson.title,
        blocks: expect.any(Array),
        estimatedDuration: expect.any(Number),
      });
    });

    test('POST /api/lessons/:id/progress - should update progress', async () => {
      const response = await apiContext.post(`/api/lessons/${testLesson.id}/progress`, {
        headers: authHeaders,
        data: {
          blockIndex: 2,
          completed: false,
          timeSpent: 120,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        currentBlock: 2,
        percentComplete: expect.any(Number),
        timeSpent: expect.any(Number),
      });
    });

    test('POST /api/lessons/:id/complete - should mark lesson complete', async () => {
      const response = await apiContext.post(`/api/lessons/${testLesson.id}/complete`, {
        headers: authHeaders,
        data: {
          score: 85,
          timeSpent: 300,
          answers: [
            { questionId: 'q1', answer: 'A', correct: true },
            { questionId: 'q2', answer: 'C', correct: true },
          ],
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        completed: true,
        xpEarned: expect.any(Number),
        achievements: expect.any(Array),
        nextLesson: expect.anything(),
      });
    });

    test('POST /api/lessons/:id/answer - should validate answer', async () => {
      const response = await apiContext.post(`/api/lessons/${testLesson.id}/answer`, {
        headers: authHeaders,
        data: {
          questionId: 'q1',
          answer: 'B',
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        correct: expect.any(Boolean),
        feedback: expect.any(String),
      });
    });
  });

  // ===========================================================================
  // SEARCH ENDPOINTS
  // ===========================================================================

  test.describe('Search API', () => {
    let authHeaders: Record<string, string>;

    test.beforeAll(async () => {
      const testUser = await TestDataFactory.createUser();
      const loginResponse = await apiContext.post('/api/auth/login', {
        data: {
          email: testUser.email,
          password: testUser.password!,
        },
      });
      const { accessToken } = await loginResponse.json();
      authHeaders = { Authorization: `Bearer ${accessToken}` };
    });

    test('GET /api/search - should search courses and lessons', async () => {
      const response = await apiContext.get('/api/search?q=math', {
        headers: authHeaders,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        results: expect.any(Array),
        total: expect.any(Number),
        facets: expect.any(Object),
      });
    });

    test('GET /api/search - should filter by content type', async () => {
      const response = await apiContext.get('/api/search?q=science&type=lesson', {
        headers: authHeaders,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      body.results.forEach((result: any) => {
        expect(result.type).toBe('lesson');
      });
    });

    test('GET /api/search/suggestions - should return autocomplete', async () => {
      const response = await apiContext.get('/api/search/suggestions?q=alg', {
        headers: authHeaders,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.suggestions).toBeInstanceOf(Array);
    });
  });

  // ===========================================================================
  // PARENTAL CONTROLS (COPPA)
  // ===========================================================================

  test.describe('Parental Controls API', () => {
    let parentAuthHeaders: Record<string, string>;
    let childUser: Awaited<ReturnType<typeof TestDataFactory.createUser>>;

    test.beforeAll(async () => {
      const parentUser = await TestDataFactory.createUser({
        role: 'parent',
        email: `parent-${Date.now()}@example.com`,
      });

      childUser = await TestDataFactory.createUser({
        isChild: true,
        parentId: parentUser.id,
      });

      const loginResponse = await apiContext.post('/api/auth/login', {
        data: {
          email: parentUser.email,
          password: parentUser.password!,
        },
      });
      const { accessToken } = await loginResponse.json();
      parentAuthHeaders = { Authorization: `Bearer ${accessToken}` };
    });

    test('GET /api/parental/children - should list linked children', async () => {
      const response = await apiContext.get('/api/parental/children', {
        headers: parentAuthHeaders,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.children).toBeInstanceOf(Array);
      expect(body.children.length).toBeGreaterThan(0);
    });

    test('GET /api/parental/children/:id/activity - should return child activity', async () => {
      const response = await apiContext.get(`/api/parental/children/${childUser.id}/activity`, {
        headers: parentAuthHeaders,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        recentLessons: expect.any(Array),
        totalTimeToday: expect.any(Number),
        weeklyProgress: expect.any(Object),
      });
    });

    test('PATCH /api/parental/children/:id/settings - should update child settings', async () => {
      const response = await apiContext.patch(`/api/parental/children/${childUser.id}/settings`, {
        headers: parentAuthHeaders,
        data: {
          dailyTimeLimit: 60, // 60 minutes
          allowedHours: { start: '08:00', end: '20:00' },
          contentRestrictions: ['advanced'],
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.dailyTimeLimit).toBe(60);
    });

    test('POST /api/parental/consent - should record consent', async () => {
      const response = await apiContext.post('/api/parental/consent', {
        headers: parentAuthHeaders,
        data: {
          childId: childUser.id,
          consentType: 'data_collection',
          granted: true,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        consentRecorded: true,
        timestamp: expect.any(String),
      });
    });

    test('DELETE /api/parental/children/:id/data - should delete child data (COPPA)', async () => {
      const tempChild = await TestDataFactory.createUser({ isChild: true });

      const response = await apiContext.delete(`/api/parental/children/${tempChild.id}/data`, {
        headers: parentAuthHeaders,
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toMatchObject({
        deleted: true,
        dataTypes: expect.arrayContaining(['profile', 'progress', 'analytics']),
      });
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  test.describe('Error Handling', () => {
    test('should return 401 for unauthenticated requests', async () => {
      const response = await apiContext.get('/api/user/profile');
      expect(response.status()).toBe(401);
    });

    test('should return 404 for non-existent resources', async () => {
      const testUser = await TestDataFactory.createUser();
      const loginResponse = await apiContext.post('/api/auth/login', {
        data: { email: testUser.email, password: testUser.password! },
      });
      const { accessToken } = await loginResponse.json();

      const response = await apiContext.get('/api/courses/non-existent-id', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status()).toBe(404);
    });

    test('should return 400 for invalid request body', async () => {
      const response = await apiContext.post('/api/auth/register', {
        data: { invalid: 'data' },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test('should return 429 for rate limited requests', async () => {
      // Make many rapid requests
      const requests = Array(100)
        .fill(null)
        .map(() =>
          apiContext.post('/api/auth/login', {
            data: { email: 'test@example.com', password: 'wrong' },
          })
        );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some((r) => r.status() === 429);

      expect(rateLimited).toBeTruthy();
    });
  });

  // ===========================================================================
  // PERFORMANCE ASSERTIONS
  // ===========================================================================

  test.describe('Performance', () => {
    let authHeaders: Record<string, string>;

    test.beforeAll(async () => {
      const testUser = await TestDataFactory.createUser();
      const loginResponse = await apiContext.post('/api/auth/login', {
        data: { email: testUser.email, password: testUser.password! },
      });
      const { accessToken } = await loginResponse.json();
      authHeaders = { Authorization: `Bearer ${accessToken}` };
    });

    test('GET /api/courses should respond within 500ms', async () => {
      const start = Date.now();
      const response = await apiContext.get('/api/courses', { headers: authHeaders });
      const duration = Date.now() - start;

      expect(response.ok()).toBeTruthy();
      expect(duration).toBeLessThan(500);
    });

    test('GET /api/user/profile should respond within 200ms', async () => {
      const start = Date.now();
      const response = await apiContext.get('/api/user/profile', { headers: authHeaders });
      const duration = Date.now() - start;

      expect(response.ok()).toBeTruthy();
      expect(duration).toBeLessThan(200);
    });
  });
});
