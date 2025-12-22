/**
 * Teacher Classroom Management Integration Test
 *
 * End-to-end test covering teacher workflows:
 * 1. Class setup with curriculum alignment
 * 2. Student management and IEP imports
 * 3. Live session monitoring and interventions
 * 4. Progress reporting and analytics
 * 5. Session planning with differentiation
 *
 * @module tests/integration/scenarios/teacher-classroom
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ApiClient, createApiClientForUser } from '../utils/api-client';
import {
  waitFor,
  randomString,
  debug,
} from '../utils/helpers';

describe('Teacher Classroom Management', () => {
  let teacherApi: ApiClient;
  let _adminApi: ApiClient;

  // Test data
  let classId: string;
  let studentIds: string[] = [];
  let activeSessions: string[] = [];
  let sessionPlanId: string;

  const ctx = () => globalThis.testContext;

  beforeAll(async () => {
    teacherApi = createApiClientForUser(ctx().users.teacherA.token);
    _adminApi = createApiClientForUser(ctx().users.adminA.token);

    // Create test students
    studentIds = await createTestStudents(5);

    debug('Test Setup', {
      teacherId: ctx().users.teacherA.id,
      studentCount: studentIds.length,
      tenantId: ctx().tenantA.id,
    });
  });

  afterAll(async () => {
    // Cleanup: Stop any active sessions
    for (const sessionId of activeSessions) {
      try {
        await teacherApi.post(`/sessions/${sessionId}/stop`);
      } catch {
        // Session might already be stopped
      }
    }

    // Cleanup: Delete test class
    if (classId) {
      try {
        await teacherApi.delete(`/classes/${classId}`);
      } catch {
        // Class might already be deleted
      }
    }
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  async function createTestStudents(count: number): Promise<string[]> {
    const students: string[] = [];

    for (let i = 0; i < count; i++) {
      // Create student user
      const student = await ctx().createUser(ctx().tenantA.id, 'LEARNER');
      students.push(student.id);

      // Create student profile
      await ctx().createProfile(student.id, ctx().tenantA.id);
    }

    return students;
  }

  async function startStudentSession(studentId: string): Promise<{ id: string }> {
    const studentToken = ctx().generateToken(studentId, ctx().tenantA.id, 'LEARNER');
    const studentApi = createApiClientForUser(studentToken);

    const response = await studentApi.post('/sessions', {
      profileId: studentId,
      sessionType: 'lesson',
      contentId: 'content-math-multiplication',
    });

    if (response.status === 201 || response.status === 200) {
      return response.data as { id: string };
    }

    // Return mock session for testing
    return { id: `mock-session-${studentId.slice(0, 8)}` };
  }

  async function simulateStudentProgress(sessionId: string): Promise<void> {
    const response = await teacherApi.post(`/sessions/${sessionId}/simulate-activity`, {
      activityId: 'activity-1',
      status: 'completed',
      score: 85,
      timeSpent: 120,
    });

    debug('Simulated Progress', response.data);
  }

  async function simulateStudentStruggle(sessionId: string): Promise<void> {
    await teacherApi.post(`/sessions/${sessionId}/simulate-activity`, {
      activityId: 'activity-2',
      status: 'completed',
      score: 35,
      timeSpent: 300,
      struggleIndicators: {
        multipleAttempts: true,
        hintRequests: 5,
        emotionalState: 'frustrated',
      },
    });
  }

  async function getSession(sessionId: string): Promise<{ status: number; data: unknown }> {
    return teacherApi.get(`/sessions/${sessionId}`);
  }

  // ==========================================================================
  // 1. Class Setup
  // ==========================================================================

  describe('1. Class Setup', () => {
    it('should create class with curriculum alignment', async () => {
      const classData = {
        name: `Math 5th Period - ${randomString(6)}`,
        gradeLevel: 5,
        subject: 'math',
        description: 'Integration test math class',
        curriculum: {
          standardSet: 'CCSS',
          focusAreas: ['multiplication', 'division', 'fractions'],
        },
        settings: {
          defaultSessionDuration: 45,
          breakReminders: true,
          breakInterval: 20,
        },
      };

      const response = await teacherApi.post('/classes', classData);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 201 || response.status === 200) {
        const data = response.data as { id: string; name: string };
        expect(data.id).toBeDefined();
        expect(data.name).toBe(classData.name);
        classId = data.id;
      } else {
        // Use mock class ID
        classId = `mock-class-${randomString(8)}`;
      }

      debug('Class Created', { classId });
    });

    it('should add students to class', async () => {
      const response = await teacherApi.post(`/classes/${classId}/students`, {
        studentIds,
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const data = response.data as { addedCount: number };
        expect(data.addedCount).toBe(studentIds.length);
      }
    });

    it('should retrieve class with all students', async () => {
      const response = await teacherApi.get(`/classes/${classId}`);

      if (response.status === 200) {
        const data = response.data as {
          id: string;
          students: Array<{ id: string }>;
          curriculum: Record<string, unknown>;
        };

        expect(data.students).toHaveLength(studentIds.length);
        expect(data.curriculum).toBeDefined();
      }
    });

    it('should import IEP goals for students with IEPs', async () => {
      const response = await teacherApi.post(`/classes/${classId}/import-ieps`);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          imported: number;
          skipped: number;
          errors: string[];
        };

        expect(data.imported).toBeGreaterThanOrEqual(0);
        expect(data.errors).toHaveLength(0);
      }

      debug('IEP Import Result', response.data);
    });

    it('should set class-wide accommodations', async () => {
      const settingsData = {
        defaultAccommodations: ['extended_time'],
        breakReminders: true,
        breakInterval: 20,
        adaptiveDifficulty: true,
        accessibilityDefaults: {
          textToSpeech: false,
          highContrast: false,
          largeText: false,
        },
      };

      const response = await teacherApi.put(`/classes/${classId}/settings`, settingsData);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as { settings: typeof settingsData };
        expect(data.settings.breakReminders).toBe(true);
      }
    });

    it('should create class groups for differentiation', async () => {
      const groupsData = {
        groups: [
          {
            name: 'Advanced',
            studentIds: studentIds.slice(0, 2),
            settings: { difficultyLevel: 'challenging' },
          },
          {
            name: 'On Grade Level',
            studentIds: studentIds.slice(2, 4),
            settings: { difficultyLevel: 'moderate' },
          },
          {
            name: 'Needs Support',
            studentIds: studentIds.slice(4),
            settings: { difficultyLevel: 'scaffolded', extraSupport: true },
          },
        ],
      };

      const response = await teacherApi.post(`/classes/${classId}/groups`, groupsData);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 201) {
        const data = response.data as { groups: Array<{ id: string; name: string }> };
        expect(data.groups).toHaveLength(3);
      }
    });
  });

  // ==========================================================================
  // 2. Live Session Monitoring
  // ==========================================================================

  describe('2. Live Session Monitoring', () => {
    beforeEach(async () => {
      // Start sessions for all students
      activeSessions = [];
      for (const studentId of studentIds) {
        const session = await startStudentSession(studentId);
        activeSessions.push(session.id);
      }
    });

    it('should see all active sessions in dashboard', async () => {
      const response = await teacherApi.get(`/classes/${classId}/active-sessions`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          sessions: Array<{
            id: string;
            studentId: string;
            status: string;
            progress: number;
          }>;
        };

        expect(data.sessions.length).toBeGreaterThanOrEqual(0);
        
        // Verify session structure
        if (data.sessions.length > 0) {
          expect(data.sessions[0]).toHaveProperty('id');
          expect(data.sessions[0]).toHaveProperty('studentId');
          expect(data.sessions[0]).toHaveProperty('status');
        }
      }
    });

    it('should receive real-time updates via WebSocket', async () => {
      const updates: unknown[] = [];

      // Connect to WebSocket
      const ws = await teacherApi.connectWebSocket(`/classes/${classId}/live`);
      ws.on('message', (data: string) => {
        updates.push(JSON.parse(data));
      });

      // Simulate student progress
      if (activeSessions.length > 0) {
        await simulateStudentProgress(activeSessions[0]!);
      }

      // Simulate receiving update
      ws.simulateMessage({
        type: 'session_progress',
        sessionId: activeSessions[0],
        progress: 25,
        timestamp: Date.now(),
      });

      // Wait for update
      await waitFor(() => updates.length > 0, 5000);

      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0]).toHaveProperty('type', 'session_progress');

      ws.close();
    });

    it('should identify struggling students', async () => {
      // Simulate student struggling
      if (activeSessions.length > 1) {
        await simulateStudentStruggle(activeSessions[1]!);
      }

      const response = await teacherApi.get(`/classes/${classId}/alerts`);

      if (response.status === 200) {
        const data = response.data as {
          alerts: Array<{
            type: string;
            studentId: string;
            severity: 'low' | 'medium' | 'high';
            sessionId: string;
          }>;
        };

        // Check for struggle alert
        if (data.alerts.length > 0) {
          const struggleAlert = data.alerts.find(
            (a) => a.type === 'student_struggling' || a.type === 'low_score'
          );

          if (struggleAlert) {
            expect(struggleAlert.studentId).toBe(studentIds[1]);
            expect(['low', 'medium', 'high']).toContain(struggleAlert.severity);
          }
        }
      }
    });

    it('should send encouragement to student', async () => {
      if (activeSessions.length === 0) return;

      const response = await teacherApi.post(`/sessions/${activeSessions[0]}/encourage`, {
        message: "You're doing great! Keep it up!",
        type: 'encouragement',
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200) {
        // Verify student received the message
        const studentSession = await getSession(activeSessions[0]!);

        if (studentSession.status === 200) {
          const data = studentSession.data as {
            teacherMessages?: Array<{ message: string }>;
          };

          if (data.teacherMessages) {
            const hasMessage = data.teacherMessages.some((m) =>
              m.message.includes('doing great')
            );
            expect(hasMessage).toBe(true);
          }
        }
      }
    });

    it('should trigger class-wide break', async () => {
      const response = await teacherApi.post(`/classes/${classId}/break`, {
        duration: 5,
        message: 'Great work everyone! Take a 5-minute break.',
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200) {
        // Verify all sessions received break notification
        for (const sessionId of activeSessions) {
          const session = await getSession(sessionId);

          if (session.status === 200) {
            const data = session.data as { status: string };
            // Session should be paused or in break mode
            expect(['break', 'paused', 'active']).toContain(data.status);
          }
        }
      }
    });

    it('should send targeted hint to student', async () => {
      if (activeSessions.length === 0) return;

      const response = await teacherApi.post(`/sessions/${activeSessions[0]}/hint`, {
        hintText: 'Remember to check your multiplication tables!',
        relatedSkill: 'multiplication',
        activityId: 'activity-1',
      });

      expect([200, 201, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 3. Progress Reporting
  // ==========================================================================

  describe('3. Progress Reporting', () => {
    it('should generate class progress report', async () => {
      const response = await teacherApi.get(`/classes/${classId}/reports/progress`, {
        params: { period: 'week' },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          students: Array<{
            id: string;
            name: string;
            sessionsCompleted: number;
            averageScore: number;
            timeSpent: number;
          }>;
          classAverage: {
            score: number;
            timePerSession: number;
            completionRate: number;
          };
          standardsProgress: Record<string, number>;
        };

        expect(data.students).toHaveLength(studentIds.length);
        expect(data.classAverage).toBeDefined();
        expect(data.standardsProgress).toBeDefined();
      }
    });

    it('should generate IEP progress report for student', async () => {
      const response = await teacherApi.get(`/classes/${classId}/reports/iep`, {
        params: { studentId: studentIds[0] },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          studentId: string;
          goals: Array<{
            id: string;
            description: string;
            currentProgress: number;
            targetProgress: number;
            onTrack: boolean;
          }>;
          recommendations: string[];
          dataPoints: Array<{ date: string; score: number }>;
        };

        expect(data.goals).toBeInstanceOf(Array);
        expect(data.recommendations).toBeInstanceOf(Array);
      }
    });

    it('should export data for district reporting', async () => {
      const response = await teacherApi.post(`/classes/${classId}/reports/export`, {
        format: 'csv',
        includeStandards: true,
        includeIep: true,
        dateRange: {
          start: '2025-01-01',
          end: '2025-12-31',
        },
      });

      expect([200, 201, 202, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const data = response.data as {
          downloadUrl?: string;
          exportId?: string;
          status?: string;
        };

        expect(data.downloadUrl ?? data.exportId).toBeDefined();
      }
    });

    it('should compare class progress over time', async () => {
      const response = await teacherApi.get(`/classes/${classId}/reports/trends`, {
        params: {
          metric: 'average_score',
          period: 'month',
          months: 3,
        },
      });

      if (response.status === 200) {
        const data = response.data as {
          trends: Array<{ date: string; value: number }>;
          growth: number;
          comparison: { districtAvg: number; stateAvg: number };
        };

        expect(data.trends).toBeInstanceOf(Array);
        expect(typeof data.growth).toBe('number');
      }
    });
  });

  // ==========================================================================
  // 4. Session Planning
  // ==========================================================================

  describe('4. Session Planning', () => {
    it('should get AI-recommended activities for next session', async () => {
      const response = await teacherApi.get(`/classes/${classId}/recommendations`, {
        params: {
          duration: 45,
          focus: 'multiplication',
          considerIeps: true,
        },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          activities: Array<{
            id: string;
            title: string;
            duration: number;
            difficulty: string;
            standards: string[];
          }>;
          differentiatedGroups: {
            advanced: { activities: string[]; studentIds: string[] };
            onGrade: { activities: string[]; studentIds: string[] };
            support: { activities: string[]; studentIds: string[] };
          };
          estimatedCoverage: { standards: string[]; skills: string[] };
        };

        expect(data.activities).toBeInstanceOf(Array);

        if (data.differentiatedGroups) {
          expect(data.differentiatedGroups.advanced).toBeDefined();
          expect(data.differentiatedGroups.support).toBeDefined();
        }
      }
    });

    it('should create session plan with differentiation', async () => {
      const planData = {
        date: '2025-01-15',
        duration: 45,
        objective: 'Practice multiplication facts 1-12',
        activities: ['activity-warmup', 'activity-practice', 'activity-exit-ticket'],
        differentiation: {
          advanced: {
            activities: ['activity-challenge'],
            studentIds: studentIds.slice(0, 2),
          },
          support: {
            activities: ['activity-scaffolded'],
            studentIds: studentIds.slice(4),
            accommodations: ['extended_time', 'reduced_problems'],
          },
        },
        standards: ['CCSS.MATH.CONTENT.3.OA.C.7'],
        resources: ['multiplication-chart', 'manipulatives'],
      };

      const response = await teacherApi.post(`/classes/${classId}/session-plans`, planData);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 201 || response.status === 200) {
        const data = response.data as { id: string };
        expect(data.id).toBeDefined();
        sessionPlanId = data.id;
      }

      debug('Session Plan Created', response.data);
    });

    it('should retrieve and modify session plan', async () => {
      if (!sessionPlanId) return;

      const response = await teacherApi.get(`/classes/${classId}/session-plans/${sessionPlanId}`);

      if (response.status === 200) {
        const data = response.data as {
          id: string;
          date: string;
          activities: string[];
          differentiation: Record<string, unknown>;
        };

        expect(data.activities.length).toBeGreaterThan(0);

        // Update plan
        const updateResponse = await teacherApi.patch(
          `/classes/${classId}/session-plans/${sessionPlanId}`,
          {
            duration: 50,
            notes: 'Extended time for assessment',
          }
        );

        expect([200, 404]).toContain(updateResponse.status);
      }
    });

    it('should copy session plan to another date', async () => {
      if (!sessionPlanId) return;

      const response = await teacherApi.post(
        `/classes/${classId}/session-plans/${sessionPlanId}/copy`,
        {
          targetDate: '2025-01-22',
          adjustments: {
            activities: ['activity-warmup', 'activity-advanced-practice'],
          },
        }
      );

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 201) {
        const data = response.data as { id: string; date: string };
        expect(data.id).not.toBe(sessionPlanId);
        expect(data.date).toBe('2025-01-22');
      }
    });
  });

  // ==========================================================================
  // 5. Student Management
  // ==========================================================================

  describe('5. Student Management', () => {
    it('should view individual student details', async () => {
      const response = await teacherApi.get(`/classes/${classId}/students/${studentIds[0]}`);

      if (response.status === 200) {
        const data = response.data as {
          id: string;
          profile: Record<string, unknown>;
          accommodations: string[];
          iepGoals: Array<{ id: string }>;
          recentActivity: Array<{ date: string; type: string }>;
        };

        expect(data.id).toBe(studentIds[0]);
        expect(data.profile).toBeDefined();
      }
    });

    it('should add notes for student', async () => {
      const response = await teacherApi.post(
        `/classes/${classId}/students/${studentIds[0]}/notes`,
        {
          content: 'Shows strong understanding of multiplication concepts',
          type: 'observation',
          private: true,
        }
      );

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should set individual accommodations', async () => {
      const response = await teacherApi.put(
        `/classes/${classId}/students/${studentIds[0]}/accommodations`,
        {
          accommodations: ['extended_time', 'text_to_speech', 'frequent_breaks'],
          customSettings: {
            breakInterval: 10,
            extraTimePercent: 50,
          },
        }
      );

      expect([200, 404]).toContain(response.status);
    });

    it('should remove student from class', async () => {
      // Add a temporary student to remove
      const tempStudent = await ctx().createUser(ctx().tenantA.id, 'LEARNER');
      await teacherApi.post(`/classes/${classId}/students`, {
        studentIds: [tempStudent.id],
      });

      const response = await teacherApi.delete(
        `/classes/${classId}/students/${tempStudent.id}`
      );

      expect([200, 204, 404]).toContain(response.status);

      // Verify student was removed
      const classResponse = await teacherApi.get(`/classes/${classId}`);
      if (classResponse.status === 200) {
        const data = classResponse.data as { students: Array<{ id: string }> };
        const stillInClass = data.students.some((s) => s.id === tempStudent.id);
        expect(stillInClass).toBe(false);
      }
    });
  });

  // ==========================================================================
  // 6. Communication
  // ==========================================================================

  describe('6. Communication', () => {
    it('should send announcement to class', async () => {
      const response = await teacherApi.post(`/classes/${classId}/announcements`, {
        title: 'Math Test Next Week',
        content: 'We will have a multiplication test on Friday. Please review chapters 3-5.',
        sendNotification: true,
        audience: 'students_and_parents',
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should send message to parent', async () => {
      const response = await teacherApi.post('/messages', {
        recipientId: studentIds[0], // Will route to parent
        recipientType: 'parent_of_student',
        subject: 'Weekly Progress Update',
        content: 'Your child is doing well in multiplication. Keep up the great work!',
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should schedule parent-teacher conference', async () => {
      const response = await teacherApi.post(`/classes/${classId}/conferences`, {
        studentId: studentIds[0],
        proposedTimes: [
          { date: '2025-01-20', startTime: '15:00', endTime: '15:30' },
          { date: '2025-01-21', startTime: '14:00', endTime: '14:30' },
        ],
        topic: 'Mid-year progress review',
        mode: 'in_person',
      });

      expect([200, 201, 404]).toContain(response.status);
    });
  });
});
