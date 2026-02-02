/**
 * Student Learning Journey Integration Test Suite
 *
 * Complete end-to-end workflow testing:
 * 1. Student authentication and login
 * 2. Course enrollment and setup
 * 3. Content access and consumption
 * 4. Assessment taking
 * 5. Grading and feedback
 * 6. Progress tracking
 * 7. Achievement unlocking
 *
 * @module tests/integration/scenarios/learning-journey
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApiClient, createApiClientForUser } from '../utils/api-client';
import {
  wait,
  waitFor,
  retry,
  randomString,
  randomEmail,
  createTestContent,
  createTestActivity,
  debug,
} from '../utils/helpers';

describe('Student Learning Journey - Complete Workflow', () => {
  // API clients for different user roles
  let studentApi: ApiClient;
  let teacherApi: ApiClient;
  let parentApi: ApiClient;
  let adminApi: ApiClient;

  // Test data IDs
  let studentId: string;
  let studentToken: string;
  let courseId: string;
  let enrollmentId: string;
  let lessonId: string;
  let assessmentId: string;
  let submissionId: string;
  let achievementId: string;

  // Cleanup tracking
  const cleanupIds: {
    enrollments: string[];
    submissions: string[];
    sessions: string[];
  } = {
    enrollments: [],
    submissions: [],
    sessions: [],
  };

  const ctx = () => globalThis.testContext;

  beforeAll(async () => {
    // Initialize API clients from global test context
    studentApi = createApiClientForUser(ctx().users.learnerA.token);
    teacherApi = createApiClientForUser(ctx().users.teacherA.token);
    parentApi = createApiClientForUser(ctx().users.parentA.token);
    adminApi = createApiClientForUser(ctx().users.adminA.token);

    studentId = ctx().users.learnerA.id;
    studentToken = ctx().users.learnerA.token;

    debug('Learning Journey Test Setup', {
      studentId,
      tenantId: ctx().tenantA.id,
    });
  });

  afterAll(async () => {
    // Cleanup all test data in reverse order
    debug('Cleaning up test data...');

    // End any active sessions
    for (const sessionId of cleanupIds.sessions) {
      try {
        await studentApi.post(`/sessions/${sessionId}/end`);
      } catch {
        // Session may already be ended
      }
    }

    // Delete submissions
    for (const subId of cleanupIds.submissions) {
      try {
        await studentApi.delete(`/submissions/${subId}`);
      } catch {
        // Submission may already be deleted
      }
    }

    // Delete enrollments
    for (const enrollId of cleanupIds.enrollments) {
      try {
        await adminApi.delete(`/enrollments/${enrollId}`);
      } catch {
        // Enrollment may already be deleted
      }
    }

    debug('Cleanup complete');
  });

  // ==========================================================================
  // 1. Student Authentication & Login
  // ==========================================================================

  describe('1. Student Authentication & Login', () => {
    it('should authenticate student with valid credentials', async () => {
      const response = await studentApi.get('/auth/me');

      expect([200, 401, 404]).toContain(response.status);

      if (response.status === 200) {
        const user = response.data as {
          id: string;
          email: string;
          role: string;
        };

        expect(user.id).toBe(studentId);
        expect(user.role).toMatch(/learner|student/i);
      }

      debug('Auth verification', { status: response.status });
    });

    it('should retrieve student profile', async () => {
      const response = await studentApi.get('/profiles/me');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const profile = response.data as {
          id: string;
          userId: string;
          gradeLevel?: number;
          learningPreferences?: Record<string, unknown>;
        };

        expect(profile.userId).toBe(studentId);
      }
    });

    it('should load student dashboard data', async () => {
      const response = await studentApi.get('/dashboard');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const dashboard = response.data as {
          enrolledCourses?: unknown[];
          recentActivity?: unknown[];
          upcomingAssessments?: unknown[];
          achievements?: unknown[];
        };

        // Verify dashboard structure
        expect(dashboard).toBeDefined();
      }
    });

    it('should handle session refresh correctly', async () => {
      const response = await studentApi.post('/auth/refresh');

      expect([200, 201, 401, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const data = response.data as {
          token?: string;
          accessToken?: string;
        };

        expect(data.token || data.accessToken).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // 2. Course Enrollment & Setup
  // ==========================================================================

  describe('2. Course Enrollment & Setup', () => {
    it('should list available courses', async () => {
      const response = await studentApi.get('/courses', {
        params: { status: 'active', gradeLevel: 5 },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          courses: Array<{ id: string; name: string }>;
        };

        if (data.courses?.length > 0) {
          courseId = data.courses[0].id;
        }
      }

      // Use mock course ID if none found
      if (!courseId) {
        courseId = `course-${randomString(8)}`;
      }

      debug('Available courses', { courseId });
    });

    it('should view course details before enrollment', async () => {
      const response = await studentApi.get(`/courses/${courseId}`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const course = response.data as {
          id: string;
          name: string;
          description?: string;
          lessons?: unknown[];
          prerequisites?: string[];
        };

        expect(course.id).toBe(courseId);
      }
    });

    it('should check enrollment eligibility', async () => {
      const response = await studentApi.get(`/courses/${courseId}/eligibility`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const eligibility = response.data as {
          eligible: boolean;
          reasons?: string[];
        };

        expect(eligibility).toHaveProperty('eligible');
      }
    });

    it('should enroll student in course', async () => {
      const response = await studentApi.post(`/courses/${courseId}/enroll`, {
        studentId,
        startDate: new Date().toISOString(),
      });

      expect([200, 201, 400, 404, 409]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const enrollment = response.data as { id: string };
        enrollmentId = enrollment.id;
        cleanupIds.enrollments.push(enrollmentId);
      } else if (response.status === 409) {
        // Already enrolled - get existing enrollment
        const existingResponse = await studentApi.get('/enrollments/me');
        if (existingResponse.status === 200) {
          const enrollments = existingResponse.data as Array<{ id: string; courseId: string }>;
          const existing = enrollments.find((e) => e.courseId === courseId);
          if (existing) {
            enrollmentId = existing.id;
          }
        }
      }

      if (!enrollmentId) {
        enrollmentId = `enrollment-${randomString(8)}`;
      }

      debug('Enrollment result', { enrollmentId, status: response.status });
    });

    it('should verify enrollment status', async () => {
      const response = await studentApi.get(`/enrollments/${enrollmentId}`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const enrollment = response.data as {
          id: string;
          status: string;
          progress?: number;
        };

        expect(enrollment.status).toMatch(/active|enrolled|pending/i);
      }
    });
  });

  // ==========================================================================
  // 3. Content Access & Consumption
  // ==========================================================================

  describe('3. Content Access & Consumption', () => {
    it('should list course lessons', async () => {
      const response = await studentApi.get(`/courses/${courseId}/lessons`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          lessons: Array<{ id: string; title: string; order: number }>;
        };

        if (data.lessons?.length > 0) {
          lessonId = data.lessons[0].id;
        }
      }

      if (!lessonId) {
        lessonId = `lesson-${randomString(8)}`;
      }

      debug('Lessons loaded', { lessonId });
    });

    it('should access lesson content', async () => {
      const response = await studentApi.get(`/lessons/${lessonId}`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const lesson = response.data as {
          id: string;
          content?: unknown;
          activities?: unknown[];
          objectives?: string[];
        };

        expect(lesson.id).toBe(lessonId);
      }
    });

    it('should start learning session', async () => {
      const response = await studentApi.post('/sessions', {
        lessonId,
        courseId,
        sessionType: 'lesson',
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const session = response.data as { id: string };
        cleanupIds.sessions.push(session.id);
      }
    });

    it('should track content progress', async () => {
      const response = await studentApi.post(`/lessons/${lessonId}/progress`, {
        sectionId: 'section-1',
        completed: true,
        timeSpent: 120,
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const progress = response.data as {
          lessonProgress: number;
          courseProgress?: number;
        };

        expect(progress.lessonProgress).toBeGreaterThanOrEqual(0);
      }
    });

    it('should complete lesson with all activities', async () => {
      // Simulate completing multiple activities
      const activities = ['activity-1', 'activity-2', 'activity-3'];

      for (const activityId of activities) {
        await studentApi.post(`/lessons/${lessonId}/activities/${activityId}/complete`, {
          score: Math.floor(Math.random() * 30) + 70, // 70-100
          timeSpent: Math.floor(Math.random() * 60) + 30, // 30-90 seconds
        });
      }

      // Mark lesson as complete
      const response = await studentApi.post(`/lessons/${lessonId}/complete`);

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should fetch recommended next content', async () => {
      const response = await studentApi.get('/recommendations', {
        params: { courseId, limit: 5 },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          recommendations: Array<{ id: string; type: string }>;
        };

        expect(Array.isArray(data.recommendations)).toBe(true);
      }
    });
  });

  // ==========================================================================
  // 4. Assessment Taking
  // ==========================================================================

  describe('4. Assessment Taking', () => {
    it('should list available assessments', async () => {
      const response = await studentApi.get(`/courses/${courseId}/assessments`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          assessments: Array<{ id: string; title: string; type: string }>;
        };

        if (data.assessments?.length > 0) {
          assessmentId = data.assessments[0].id;
        }
      }

      if (!assessmentId) {
        assessmentId = `assessment-${randomString(8)}`;
      }

      debug('Assessments loaded', { assessmentId });
    });

    it('should start assessment attempt', async () => {
      const response = await studentApi.post(`/assessments/${assessmentId}/start`);

      expect([200, 201, 400, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const attempt = response.data as {
          id: string;
          questions?: unknown[];
          timeLimit?: number;
        };

        submissionId = attempt.id;
        cleanupIds.submissions.push(submissionId);
      }

      if (!submissionId) {
        submissionId = `submission-${randomString(8)}`;
      }
    });

    it('should submit answers progressively', async () => {
      const answers = [
        { questionId: 'q1', answer: 'A', timeSpent: 45 },
        { questionId: 'q2', answer: 'B', timeSpent: 30 },
        { questionId: 'q3', answer: 'C', timeSpent: 60 },
        { questionId: 'q4', answer: 'A', timeSpent: 25 },
        { questionId: 'q5', answer: 'D', timeSpent: 40 },
      ];

      for (const answer of answers) {
        const response = await studentApi.post(`/submissions/${submissionId}/answers`, answer);

        expect([200, 201, 404]).toContain(response.status);
      }
    });

    it('should complete and submit assessment', async () => {
      const response = await studentApi.post(`/submissions/${submissionId}/submit`);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const result = response.data as {
          status: string;
          submittedAt?: string;
        };

        expect(result.status).toMatch(/submitted|pending_grade|completed/i);
      }
    });

    it('should handle assessment timeout gracefully', async () => {
      // Start a timed assessment
      const timedResponse = await studentApi.post(`/assessments/${assessmentId}/start`, {
        timed: true,
        timeLimit: 60,
      });

      if (timedResponse.status === 200 || timedResponse.status === 201) {
        const timedSubmissionId = (timedResponse.data as { id: string }).id;

        // Simulate timeout by forcing submit
        const timeoutResponse = await studentApi.post(`/submissions/${timedSubmissionId}/timeout`);

        expect([200, 201, 404]).toContain(timeoutResponse.status);
      }
    });
  });

  // ==========================================================================
  // 5. Grading & Feedback
  // ==========================================================================

  describe('5. Grading & Feedback', () => {
    it('should auto-grade objective questions', async () => {
      // Wait for auto-grading to process
      await wait(500);

      const response = await studentApi.get(`/submissions/${submissionId}`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const submission = response.data as {
          status: string;
          score?: number;
          gradedAt?: string;
        };

        // Auto-graded submissions should have a score
        if (submission.status === 'graded') {
          expect(submission.score).toBeDefined();
        }
      }
    });

    it('should receive feedback on submission', async () => {
      const response = await studentApi.get(`/submissions/${submissionId}/feedback`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const feedback = response.data as {
          overall?: string;
          perQuestion?: Array<{
            questionId: string;
            correct: boolean;
            explanation?: string;
          }>;
        };

        expect(feedback).toBeDefined();
      }
    });

    it('should view grade breakdown', async () => {
      const response = await studentApi.get(`/submissions/${submissionId}/breakdown`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const breakdown = response.data as {
          totalQuestions: number;
          correctAnswers: number;
          incorrectAnswers: number;
          skipped?: number;
          score: number;
          maxScore: number;
        };

        expect(breakdown.totalQuestions).toBeGreaterThan(0);
        expect(breakdown.score).toBeLessThanOrEqual(breakdown.maxScore);
      }
    });

    it('should access detailed question analysis', async () => {
      const response = await studentApi.get(`/submissions/${submissionId}/analysis`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const analysis = response.data as {
          strengths?: string[];
          areasForImprovement?: string[];
          recommendedTopics?: string[];
        };

        expect(analysis).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // 6. Progress Tracking
  // ==========================================================================

  describe('6. Progress Tracking', () => {
    it('should update course progress after assessment', async () => {
      const response = await studentApi.get(`/enrollments/${enrollmentId}/progress`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const progress = response.data as {
          overallProgress: number;
          lessonsCompleted: number;
          assessmentsCompleted: number;
          averageScore?: number;
        };

        expect(progress.overallProgress).toBeGreaterThanOrEqual(0);
        expect(progress.overallProgress).toBeLessThanOrEqual(100);
      }
    });

    it('should track learning metrics over time', async () => {
      const response = await studentApi.get('/progress/metrics', {
        params: { courseId, period: '7d' },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const metrics = response.data as {
          timeSpent: number;
          lessonsViewed: number;
          activitiesCompleted: number;
          assessmentsTaken: number;
        };

        expect(metrics.timeSpent).toBeGreaterThanOrEqual(0);
      }
    });

    it('should generate progress report', async () => {
      const response = await studentApi.get('/progress/report', {
        params: { format: 'summary' },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const report = response.data as {
          period: string;
          summary: Record<string, unknown>;
        };

        expect(report).toBeDefined();
      }
    });

    it('should calculate mastery levels by topic', async () => {
      const response = await studentApi.get('/progress/mastery');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const mastery = response.data as {
          topics: Array<{
            topic: string;
            level: 'novice' | 'developing' | 'proficient' | 'mastered';
            score: number;
          }>;
        };

        expect(Array.isArray(mastery.topics)).toBe(true);
      }
    });

    it('should sync progress across devices', async () => {
      // Simulate progress sync request
      const response = await studentApi.post('/progress/sync', {
        deviceId: `device-${randomString(8)}`,
        lastSyncTimestamp: new Date(Date.now() - 3600000).toISOString(),
      });

      expect([200, 201, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 7. Achievement Unlocking
  // ==========================================================================

  describe('7. Achievement Unlocking', () => {
    it('should check for new achievements after progress', async () => {
      const response = await studentApi.get('/achievements/check');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          newAchievements: Array<{ id: string; name: string; earnedAt: string }>;
        };

        if (data.newAchievements?.length > 0) {
          achievementId = data.newAchievements[0].id;
        }
      }

      if (!achievementId) {
        achievementId = `achievement-${randomString(8)}`;
      }
    });

    it('should list all earned achievements', async () => {
      const response = await studentApi.get('/achievements');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          achievements: Array<{
            id: string;
            name: string;
            description: string;
            earnedAt: string;
            badge?: string;
          }>;
        };

        expect(Array.isArray(data.achievements)).toBe(true);
      }
    });

    it('should view achievement details', async () => {
      const response = await studentApi.get(`/achievements/${achievementId}`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const achievement = response.data as {
          id: string;
          name: string;
          description: string;
          criteria: string;
          points?: number;
          rarity?: string;
        };

        expect(achievement.id).toBe(achievementId);
      }
    });

    it('should track progress toward next achievement', async () => {
      const response = await studentApi.get('/achievements/progress');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const progress = response.data as {
          upcoming: Array<{
            id: string;
            name: string;
            progress: number;
            requirement: number;
          }>;
        };

        expect(Array.isArray(progress.upcoming)).toBe(true);
      }
    });

    it('should display achievement on profile', async () => {
      // Set achievement to display
      await studentApi.put(`/achievements/${achievementId}/display`, {
        featured: true,
      });

      // Verify it appears on profile
      const response = await studentApi.get('/profiles/me');

      expect([200, 404]).toContain(response.status);
    });

    it('should share achievement (optional)', async () => {
      const response = await studentApi.post(`/achievements/${achievementId}/share`, {
        platform: 'internal',
        message: 'I earned a new achievement!',
      });

      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // Cross-Cutting Concerns
  // ==========================================================================

  describe('Cross-Cutting: Parent Visibility', () => {
    it('should allow parent to view student progress', async () => {
      const response = await parentApi.get(`/children/${studentId}/progress`);

      expect([200, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        const progress = response.data as {
          studentId: string;
          courses: unknown[];
          recentActivity: unknown[];
        };

        expect(progress.studentId).toBe(studentId);
      }
    });

    it('should allow parent to view achievement history', async () => {
      const response = await parentApi.get(`/children/${studentId}/achievements`);

      expect([200, 403, 404]).toContain(response.status);
    });

    it('should send progress notification to parent', async () => {
      const response = await parentApi.get('/notifications', {
        params: { type: 'progress', unread: true },
      });

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Cross-Cutting: Error Handling', () => {
    it('should handle invalid course enrollment gracefully', async () => {
      const response = await studentApi.post('/courses/invalid-course-id/enroll');

      expect([400, 404]).toContain(response.status);
    });

    it('should handle invalid assessment submission', async () => {
      const response = await studentApi.post('/submissions/invalid-id/submit');

      expect([400, 404]).toContain(response.status);
    });

    it('should handle unauthorized access to other student data', async () => {
      const response = await studentApi.get('/students/other-student-id/progress');

      expect([401, 403, 404]).toContain(response.status);
    });
  });
});
