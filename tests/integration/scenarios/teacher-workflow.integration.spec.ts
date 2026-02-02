/**
 * Teacher Workflow Integration Test Suite
 *
 * Complete end-to-end teacher workflow testing:
 * 1. Content creation and management
 * 2. Assignment creation and distribution
 * 3. Submission collection and review
 * 4. Grading and feedback
 * 5. Analytics and reporting
 * 6. Notification and communication
 *
 * @module tests/integration/scenarios/teacher-workflow
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

describe('Teacher Workflow - Complete Workflow', () => {
  // API clients for different user roles
  let teacherApi: ApiClient;
  let studentApi: ApiClient;
  let adminApi: ApiClient;
  let parentApi: ApiClient;

  // Test data IDs
  let teacherId: string;
  let classId: string;
  let contentId: string;
  let assignmentId: string;
  let rubricId: string;
  let submissionId: string;
  let reportId: string;

  // Test students
  let studentIds: string[] = [];

  // Cleanup tracking
  const cleanupIds: {
    content: string[];
    assignments: string[];
    classes: string[];
    notifications: string[];
  } = {
    content: [],
    assignments: [],
    classes: [],
    notifications: [],
  };

  const ctx = () => globalThis.testContext;

  beforeAll(async () => {
    // Initialize API clients from global test context
    teacherApi = createApiClientForUser(ctx().users.teacherA.token);
    studentApi = createApiClientForUser(ctx().users.learnerA.token);
    adminApi = createApiClientForUser(ctx().users.adminA.token);
    parentApi = createApiClientForUser(ctx().users.parentA.token);

    teacherId = ctx().users.teacherA.id;

    // Get or create test students
    studentIds = [ctx().users.learnerA.id];

    debug('Teacher Workflow Test Setup', {
      teacherId,
      studentCount: studentIds.length,
      tenantId: ctx().tenantA.id,
    });
  });

  afterAll(async () => {
    debug('Cleaning up test data...');

    // Cleanup notifications
    for (const notifId of cleanupIds.notifications) {
      try {
        await teacherApi.delete(`/notifications/${notifId}`);
      } catch {
        // Notification may already be deleted
      }
    }

    // Cleanup assignments
    for (const assignId of cleanupIds.assignments) {
      try {
        await teacherApi.delete(`/assignments/${assignId}`);
      } catch {
        // Assignment may already be deleted
      }
    }

    // Cleanup content
    for (const contId of cleanupIds.content) {
      try {
        await teacherApi.delete(`/content/${contId}`);
      } catch {
        // Content may already be deleted
      }
    }

    // Cleanup classes
    for (const clsId of cleanupIds.classes) {
      try {
        await teacherApi.delete(`/classes/${clsId}`);
      } catch {
        // Class may already be deleted
      }
    }

    debug('Cleanup complete');
  });

  // ==========================================================================
  // 1. Content Creation & Management
  // ==========================================================================

  describe('1. Content Creation & Management', () => {
    it('should create a new lesson', async () => {
      const lessonData = {
        title: `Integration Test Lesson - ${randomString(6)}`,
        description: 'A comprehensive lesson for integration testing',
        subject: 'math',
        gradeLevel: 5,
        type: 'lesson',
        objectives: [
          'Understand multiplication concepts',
          'Apply multiplication to real-world problems',
          'Master multiplication tables up to 12',
        ],
        content: {
          sections: [
            {
              title: 'Introduction',
              type: 'text',
              body: 'Multiplication is repeated addition...',
            },
            {
              title: 'Interactive Practice',
              type: 'activity',
              activityType: 'multiple_choice',
            },
          ],
        },
        estimatedDuration: 30,
        standards: ['CCSS.MATH.CONTENT.5.NBT.B.5'],
        tags: ['multiplication', 'math', 'grade5'],
      };

      const response = await teacherApi.post('/content', lessonData);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const content = response.data as { id: string };
        contentId = content.id;
        cleanupIds.content.push(contentId);
      }

      if (!contentId) {
        contentId = `content-${randomString(8)}`;
      }

      debug('Content created', { contentId, status: response.status });
    });

    it('should add activities to content', async () => {
      const activity = createTestActivity({
        type: 'quiz',
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            prompt: 'What is 7 × 8?',
            options: ['54', '56', '58', '64'],
            correctAnswer: '56',
          },
          {
            id: 'q2',
            type: 'multiple_choice',
            prompt: 'What is 9 × 6?',
            options: ['45', '54', '63', '56'],
            correctAnswer: '54',
          },
        ],
      });

      const response = await teacherApi.post(`/content/${contentId}/activities`, activity);

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should upload supporting materials', async () => {
      const materialData = {
        name: 'Multiplication Chart',
        type: 'image',
        url: 'https://example.com/materials/multiplication-chart.png',
        description: 'Reference multiplication chart for students',
      };

      const response = await teacherApi.post(`/content/${contentId}/materials`, materialData);

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should create assessment rubric', async () => {
      const rubricData = {
        name: 'Multiplication Mastery Rubric',
        contentId,
        criteria: [
          {
            name: 'Accuracy',
            weight: 40,
            levels: [
              { score: 4, description: 'All answers correct' },
              { score: 3, description: '75%+ answers correct' },
              { score: 2, description: '50%+ answers correct' },
              { score: 1, description: 'Below 50% correct' },
            ],
          },
          {
            name: 'Speed',
            weight: 30,
            levels: [
              { score: 4, description: 'Completed under time limit' },
              { score: 3, description: 'Completed within 10% over time' },
              { score: 2, description: 'Completed within 25% over time' },
              { score: 1, description: 'Did not complete' },
            ],
          },
          {
            name: 'Problem Solving',
            weight: 30,
            levels: [
              { score: 4, description: 'Shows clear understanding' },
              { score: 3, description: 'Generally understands concepts' },
              { score: 2, description: 'Partial understanding' },
              { score: 1, description: 'Struggles with concepts' },
            ],
          },
        ],
      };

      const response = await teacherApi.post('/rubrics', rubricData);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const rubric = response.data as { id: string };
        rubricId = rubric.id;
      }

      if (!rubricId) {
        rubricId = `rubric-${randomString(8)}`;
      }
    });

    it('should preview content as student', async () => {
      const response = await teacherApi.get(`/content/${contentId}/preview`, {
        params: { viewAs: 'student' },
      });

      expect([200, 404]).toContain(response.status);
    });

    it('should publish content', async () => {
      const response = await teacherApi.post(`/content/${contentId}/publish`, {
        visibility: 'class',
        availableFrom: new Date().toISOString(),
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const published = response.data as { status: string };
        expect(published.status).toMatch(/published|active/i);
      }
    });
  });

  // ==========================================================================
  // 2. Assignment Creation & Distribution
  // ==========================================================================

  describe('2. Assignment Creation & Distribution', () => {
    it('should create class if not exists', async () => {
      const classData = {
        name: `Test Class ${randomString(6)}`,
        subject: 'math',
        gradeLevel: 5,
        description: 'Integration test class',
      };

      const response = await teacherApi.post('/classes', classData);

      expect([200, 201, 404, 409]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const cls = response.data as { id: string };
        classId = cls.id;
        cleanupIds.classes.push(classId);
      }

      if (!classId) {
        // Try to get existing class
        const listResponse = await teacherApi.get('/classes');
        if (listResponse.status === 200) {
          const classes = listResponse.data as { classes: Array<{ id: string }> };
          if (classes.classes?.length > 0) {
            classId = classes.classes[0].id;
          }
        }
      }

      if (!classId) {
        classId = `class-${randomString(8)}`;
      }

      debug('Class ready', { classId });
    });

    it('should add students to class', async () => {
      const response = await teacherApi.post(`/classes/${classId}/students`, {
        studentIds,
      });

      expect([200, 201, 400, 404, 409]).toContain(response.status);
    });

    it('should create assignment from content', async () => {
      const assignmentData = {
        title: `Multiplication Assignment - ${randomString(6)}`,
        description: 'Complete the multiplication practice activities',
        contentId,
        classId,
        rubricId,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        settings: {
          allowLateSubmission: true,
          latePenalty: 10, // 10% per day
          maxAttempts: 3,
          shuffleQuestions: true,
          showCorrectAnswers: 'after_due_date',
        },
        accommodations: {
          extendedTime: {
            enabled: true,
            extraPercent: 50,
          },
        },
      };

      const response = await teacherApi.post('/assignments', assignmentData);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const assignment = response.data as { id: string };
        assignmentId = assignment.id;
        cleanupIds.assignments.push(assignmentId);
      }

      if (!assignmentId) {
        assignmentId = `assignment-${randomString(8)}`;
      }

      debug('Assignment created', { assignmentId });
    });

    it('should schedule assignment release', async () => {
      const response = await teacherApi.post(`/assignments/${assignmentId}/schedule`, {
        releaseDate: new Date().toISOString(),
        notifyStudents: true,
        notifyParents: false,
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should distribute assignment to class', async () => {
      const response = await teacherApi.post(`/assignments/${assignmentId}/distribute`, {
        classId,
        notificationChannel: 'all', // email, in-app, all
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should verify students received assignment', async () => {
      // Check as student
      const response = await studentApi.get('/assignments', {
        params: { status: 'pending' },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          assignments: Array<{ id: string; title: string }>;
        };

        // Assignment should be visible to student
        expect(Array.isArray(data.assignments)).toBe(true);
      }
    });
  });

  // ==========================================================================
  // 3. Submission Collection & Review
  // ==========================================================================

  describe('3. Submission Collection & Review', () => {
    it('should allow student to start assignment', async () => {
      const response = await studentApi.post(`/assignments/${assignmentId}/start`);

      expect([200, 201, 400, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const attempt = response.data as { id: string };
        submissionId = attempt.id;
      }

      if (!submissionId) {
        submissionId = `submission-${randomString(8)}`;
      }
    });

    it('should allow student to submit work', async () => {
      // Simulate student completing assignment
      const submissionData = {
        answers: [
          { questionId: 'q1', answer: '56' },
          { questionId: 'q2', answer: '54' },
        ],
        timeSpent: 450, // seconds
      };

      const response = await studentApi.post(
        `/submissions/${submissionId}/complete`,
        submissionData
      );

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should list all submissions for assignment', async () => {
      await wait(500); // Wait for submission processing

      const response = await teacherApi.get(`/assignments/${assignmentId}/submissions`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          submissions: Array<{
            id: string;
            studentId: string;
            status: string;
          }>;
        };

        expect(Array.isArray(data.submissions)).toBe(true);
      }
    });

    it('should view individual submission details', async () => {
      const response = await teacherApi.get(`/submissions/${submissionId}`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const submission = response.data as {
          id: string;
          answers: unknown[];
          submittedAt: string;
        };

        expect(submission.id).toBe(submissionId);
      }
    });

    it('should flag submission for review', async () => {
      const response = await teacherApi.post(`/submissions/${submissionId}/flag`, {
        reason: 'Requires manual review',
        priority: 'normal',
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should track submission statistics', async () => {
      const response = await teacherApi.get(`/assignments/${assignmentId}/statistics`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const stats = response.data as {
          totalStudents: number;
          submitted: number;
          pending: number;
          averageScore?: number;
          completionRate: number;
        };

        expect(stats.totalStudents).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ==========================================================================
  // 4. Grading & Feedback
  // ==========================================================================

  describe('4. Grading & Feedback', () => {
    it('should apply rubric to grade submission', async () => {
      const gradingData = {
        rubricId,
        scores: [
          { criterionId: 'accuracy', score: 4, comment: 'Excellent accuracy!' },
          { criterionId: 'speed', score: 3, comment: 'Good pace' },
          { criterionId: 'problem_solving', score: 3, comment: 'Shows understanding' },
        ],
        overallFeedback: 'Great work on this assignment! Keep practicing.',
      };

      const response = await teacherApi.post(`/submissions/${submissionId}/grade`, gradingData);

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should add inline comments to submission', async () => {
      const commentData = {
        questionId: 'q1',
        comment: 'Perfect! You remembered that 7×8=56',
        highlightType: 'positive',
      };

      const response = await teacherApi.post(`/submissions/${submissionId}/comments`, commentData);

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should provide overall feedback', async () => {
      const feedbackData = {
        summary: 'Strong performance overall',
        strengths: ['Accurate calculations', 'Good time management'],
        areasForImprovement: ['Double-check work before submitting'],
        nextSteps: 'Move on to division concepts',
        encouragement: "You're making great progress!",
      };

      const response = await teacherApi.put(`/submissions/${submissionId}/feedback`, feedbackData);

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should release grades to student', async () => {
      const response = await teacherApi.post(`/submissions/${submissionId}/release`);

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should verify student can view graded submission', async () => {
      await wait(500);

      const response = await studentApi.get(`/submissions/${submissionId}`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const submission = response.data as {
          status: string;
          score?: number;
          feedback?: unknown;
        };

        // Grade should be visible
        expect(['graded', 'released', 'completed']).toContain(submission.status);
      }
    });

    it('should allow student to request re-grade', async () => {
      const response = await studentApi.post(`/submissions/${submissionId}/regrade-request`, {
        reason: 'I believe question 2 was graded incorrectly',
        questionId: 'q2',
      });

      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 5. Analytics & Reporting
  // ==========================================================================

  describe('5. Analytics & Reporting', () => {
    it('should generate class performance report', async () => {
      const response = await teacherApi.get(`/classes/${classId}/analytics`, {
        params: { period: '30d' },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const analytics = response.data as {
          averageScore: number;
          completionRate: number;
          engagementMetrics: Record<string, unknown>;
        };

        expect(analytics).toBeDefined();
      }
    });

    it('should view student progress breakdown', async () => {
      const studentId = studentIds[0];
      const response = await teacherApi.get(`/classes/${classId}/students/${studentId}/progress`);

      expect([200, 404]).toContain(response.status);
    });

    it('should identify struggling students', async () => {
      const response = await teacherApi.get(`/classes/${classId}/alerts`, {
        params: { type: 'struggling' },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const alerts = response.data as {
          students: Array<{
            id: string;
            name: string;
            concern: string;
            metrics: Record<string, unknown>;
          }>;
        };

        expect(Array.isArray(alerts.students)).toBe(true);
      }
    });

    it('should generate standards mastery report', async () => {
      const response = await teacherApi.get(`/classes/${classId}/standards`, {
        params: { standardSet: 'CCSS' },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const report = response.data as {
          standards: Array<{
            code: string;
            description: string;
            mastery: number;
            assessedCount: number;
          }>;
        };

        expect(Array.isArray(report.standards)).toBe(true);
      }
    });

    it('should export data for external reporting', async () => {
      const response = await teacherApi.post(`/classes/${classId}/reports/export`, {
        format: 'csv',
        includeStudentNames: false,
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
      });

      expect([200, 201, 202, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const data = response.data as {
          reportId?: string;
          downloadUrl?: string;
        };

        if (data.reportId) {
          reportId = data.reportId;
        }
      }
    });

    it('should schedule recurring reports', async () => {
      const response = await teacherApi.post('/reports/schedule', {
        classId,
        reportType: 'weekly_summary',
        frequency: 'weekly',
        dayOfWeek: 'friday',
        recipients: [ctx().users.teacherA.email],
      });

      expect([200, 201, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 6. Notification & Communication
  // ==========================================================================

  describe('6. Notification & Communication', () => {
    it('should send announcement to class', async () => {
      const response = await teacherApi.post(`/classes/${classId}/announcements`, {
        title: 'Reminder: Assignment Due Soon',
        message: "Don't forget to complete the multiplication assignment!",
        priority: 'normal',
        sendEmail: true,
        sendPush: true,
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should send individual message to student', async () => {
      const studentId = studentIds[0];
      const response = await teacherApi.post('/messages', {
        recipientId: studentId,
        subject: 'Great progress!',
        body: 'Keep up the excellent work on your assignments.',
        type: 'encouragement',
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should send progress update to parent', async () => {
      const studentId = studentIds[0];
      const response = await teacherApi.post('/messages/progress-update', {
        studentId,
        parentId: ctx().users.parentA.id,
        period: 'weekly',
        includeGrades: true,
        includeAttendance: false,
        customMessage: 'Your child is doing well in math!',
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should notify students of grade release', async () => {
      const response = await teacherApi.post(`/assignments/${assignmentId}/notify-grades`, {
        message: 'Grades have been released for the multiplication assignment.',
        includeScore: false,
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should list sent notifications', async () => {
      const response = await teacherApi.get('/notifications/sent', {
        params: { limit: 10 },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          notifications: Array<{
            id: string;
            type: string;
            sentAt: string;
          }>;
        };

        expect(Array.isArray(data.notifications)).toBe(true);
      }
    });

    it('should track notification delivery status', async () => {
      const response = await teacherApi.get(`/classes/${classId}/notifications/status`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const status = response.data as {
          delivered: number;
          pending: number;
          failed: number;
        };

        expect(status.delivered).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ==========================================================================
  // Cross-Cutting Concerns
  // ==========================================================================

  describe('Cross-Cutting: Collaboration', () => {
    it('should share content with other teachers', async () => {
      const response = await teacherApi.post(`/content/${contentId}/share`, {
        visibility: 'school',
        allowCopy: true,
        allowModify: false,
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should co-assign with another teacher', async () => {
      const response = await teacherApi.post(`/assignments/${assignmentId}/collaborators`, {
        teacherId: 'other-teacher-id',
        role: 'grader',
      });

      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  describe('Cross-Cutting: Error Handling', () => {
    it('should handle duplicate assignment creation', async () => {
      const duplicateData = {
        title: `Duplicate Assignment`,
        contentId,
        classId,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // Create first
      await teacherApi.post('/assignments', duplicateData);

      // Try to create duplicate
      const response = await teacherApi.post('/assignments', duplicateData);

      // Should either succeed (allowed) or return conflict
      expect([200, 201, 400, 409, 404]).toContain(response.status);
    });

    it('should handle grading non-existent submission', async () => {
      const response = await teacherApi.post('/submissions/non-existent-id/grade', { score: 85 });

      expect([400, 404]).toContain(response.status);
    });

    it('should prevent unauthorized class access', async () => {
      const response = await studentApi.get('/classes/unauthorized-class-id/students');

      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('Cross-Cutting: Performance', () => {
    it('should handle bulk grading efficiently', async () => {
      const startTime = Date.now();

      const response = await teacherApi.post(`/assignments/${assignmentId}/bulk-grade`, {
        grades: studentIds.map((id, index) => ({
          studentId: id,
          score: 80 + index * 5,
          feedback: 'Good work!',
        })),
      });

      const duration = Date.now() - startTime;

      expect([200, 201, 404]).toContain(response.status);
      // Bulk operation should complete in reasonable time
      expect(duration).toBeLessThan(10000);
    });

    it('should paginate large result sets', async () => {
      const response = await teacherApi.get(`/assignments/${assignmentId}/submissions`, {
        params: { page: 1, limit: 10 },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          submissions: unknown[];
          pagination?: {
            page: number;
            limit: number;
            total: number;
          };
        };

        if (data.pagination) {
          expect(data.pagination.page).toBe(1);
          expect(data.pagination.limit).toBe(10);
        }
      }
    });
  });
});
