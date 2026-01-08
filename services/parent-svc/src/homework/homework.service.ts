/**
 * Homework Monitoring Service
 *
 * Provides parent access to student homework helper session data.
 * Proxies requests to homework-helper-svc and aggregates data for parent dashboard.
 */

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { logger, metrics } from '@aivo/ts-observability';
import { PrismaService } from '../prisma/prisma.service.js';
import { config } from '../config.js';

// Types for homework monitoring
export interface HomeworkSubmission {
  id: string;
  sessionId?: string;
  subject: 'ELA' | 'MATH' | 'SCIENCE' | 'OTHER';
  gradeBand: 'K5' | 'G6_8' | 'G9_12';
  sourceType: 'IMAGE' | 'TEXT' | 'PDF';
  status: 'RECEIVED' | 'PARSED' | 'SCAFFOLDED' | 'COMPLETED' | 'FAILED';
  stepCount: number;
  stepsCompleted: number;
  createdAt: string;
  completedAt?: string;
}

export interface HomeworkStep {
  id: string;
  stepOrder: number;
  promptText: string;
  isStarted: boolean;
  isCompleted: boolean;
  hintRevealed: boolean;
  lastResponse?: {
    responseText: string;
    aiFeedback?: string;
    isCorrect?: boolean;
    createdAt: string;
  };
}

export interface HomeworkDetail extends HomeworkSubmission {
  rawText: string;
  steps: HomeworkStep[];
}

export interface HomeworkSummary {
  studentId: string;
  period: {
    start: string;
    end: string;
  };
  totalSessions: number;
  completedSessions: number;
  averageCompletionRate: number;
  bySubject: {
    subject: string;
    count: number;
    completed: number;
  }[];
  recentActivity: HomeworkSubmission[];
}

export interface HomeworkTrend {
  date: string;
  sessions: number;
  completionRate: number;
  avgStepsCompleted: number;
}

@Injectable()
export class HomeworkService {
  private readonly homeworkServiceUrl: string;

  constructor(private readonly prisma: PrismaService) {
    this.homeworkServiceUrl =
      process.env.HOMEWORK_HELPER_SERVICE_URL ?? 'http://homework-helper-svc:3000';
  }

  /**
   * Verify parent has access to a student
   */
  private async verifyParentStudentAccess(parentId: string, studentId: string): Promise<void> {
    const link = await this.prisma.parentStudentLink.findFirst({
      where: {
        parentId,
        studentId,
        status: 'active',
      },
    });

    if (!link) {
      throw new ForbiddenException('You do not have access to this student');
    }
  }

  /**
   * Get homework submissions for a student
   */
  async getStudentHomework(
    parentId: string,
    studentId: string,
    options?: {
      limit?: number;
      offset?: number;
      subject?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ submissions: HomeworkSubmission[]; total: number }> {
    await this.verifyParentStudentAccess(parentId, studentId);

    const { limit = 20, offset = 0, subject, status, startDate, endDate } = options ?? {};

    try {
      // Build query params
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (subject) params.append('subject', subject);
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await fetch(
        `${this.homeworkServiceUrl}/parent/students/${studentId}/homework?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': 'parent-svc',
            'X-Parent-Id': parentId,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Homework service returned ${response.status}`);
      }

      const data = await response.json();
      metrics.increment('parent.homework.list', { status: 'success' });

      return {
        submissions: data.submissions || [],
        total: data.total || 0,
      };
    } catch (error) {
      logger.error('Failed to fetch student homework', { error, studentId, parentId });
      metrics.increment('parent.homework.list', { status: 'error' });
      throw error;
    }
  }

  /**
   * Get detailed homework session with steps
   */
  async getHomeworkDetail(
    parentId: string,
    studentId: string,
    homeworkId: string
  ): Promise<HomeworkDetail> {
    await this.verifyParentStudentAccess(parentId, studentId);

    try {
      const response = await fetch(
        `${this.homeworkServiceUrl}/parent/students/${studentId}/homework/${homeworkId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': 'parent-svc',
            'X-Parent-Id': parentId,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundException('Homework session not found');
        }
        throw new Error(`Homework service returned ${response.status}`);
      }

      metrics.increment('parent.homework.detail', { status: 'success' });
      return response.json();
    } catch (error) {
      logger.error('Failed to fetch homework detail', { error, studentId, homeworkId });
      metrics.increment('parent.homework.detail', { status: 'error' });
      throw error;
    }
  }

  /**
   * Get homework summary for a time period
   */
  async getHomeworkSummary(
    parentId: string,
    studentId: string,
    options?: {
      days?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<HomeworkSummary> {
    await this.verifyParentStudentAccess(parentId, studentId);

    const { days = 30, startDate, endDate } = options ?? {};

    try {
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.append('startDate', startDate.toISOString());
        params.append('endDate', endDate.toISOString());
      } else {
        params.append('days', days.toString());
      }

      const response = await fetch(
        `${this.homeworkServiceUrl}/parent/students/${studentId}/homework/summary?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': 'parent-svc',
            'X-Parent-Id': parentId,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Homework service returned ${response.status}`);
      }

      metrics.increment('parent.homework.summary', { status: 'success' });
      return response.json();
    } catch (error) {
      logger.error('Failed to fetch homework summary', { error, studentId, parentId });
      metrics.increment('parent.homework.summary', { status: 'error' });
      throw error;
    }
  }

  /**
   * Get homework trends over time
   */
  async getHomeworkTrends(
    parentId: string,
    studentId: string,
    options?: {
      days?: number;
      granularity?: 'day' | 'week';
    }
  ): Promise<HomeworkTrend[]> {
    await this.verifyParentStudentAccess(parentId, studentId);

    const { days = 30, granularity = 'day' } = options ?? {};

    try {
      const params = new URLSearchParams({
        days: days.toString(),
        granularity,
      });

      const response = await fetch(
        `${this.homeworkServiceUrl}/parent/students/${studentId}/homework/trends?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': 'parent-svc',
            'X-Parent-Id': parentId,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Homework service returned ${response.status}`);
      }

      metrics.increment('parent.homework.trends', { status: 'success' });
      return response.json();
    } catch (error) {
      logger.error('Failed to fetch homework trends', { error, studentId, parentId });
      metrics.increment('parent.homework.trends', { status: 'error' });
      throw error;
    }
  }

  /**
   * Get homework overview for all linked children
   */
  async getHomeworkOverview(parentId: string): Promise<{
    children: {
      studentId: string;
      studentName: string;
      recentHomework: HomeworkSubmission[];
      weeklyStats: {
        totalSessions: number;
        completed: number;
        avgCompletionRate: number;
      };
    }[];
  }> {
    // Get all linked students
    const links = await this.prisma.parentStudentLink.findMany({
      where: {
        parentId,
        status: 'active',
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (links.length === 0) {
      return { children: [] };
    }

    // Fetch homework data for each child in parallel
    const childrenData = await Promise.all(
      links.map(async (link) => {
        try {
          const response = await fetch(
            `${this.homeworkServiceUrl}/parent/students/${link.studentId}/homework/overview`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'X-Internal-Service': 'parent-svc',
                'X-Parent-Id': parentId,
              },
            }
          );

          if (!response.ok) {
            return {
              studentId: link.studentId,
              studentName: `${link.student.firstName} ${link.student.lastName}`,
              recentHomework: [],
              weeklyStats: { totalSessions: 0, completed: 0, avgCompletionRate: 0 },
            };
          }

          const data = await response.json();
          return {
            studentId: link.studentId,
            studentName: `${link.student.firstName} ${link.student.lastName}`,
            recentHomework: data.recentHomework || [],
            weeklyStats: data.weeklyStats || { totalSessions: 0, completed: 0, avgCompletionRate: 0 },
          };
        } catch (error) {
          logger.warn('Failed to fetch homework for child', { studentId: link.studentId, error });
          return {
            studentId: link.studentId,
            studentName: `${link.student.firstName} ${link.student.lastName}`,
            recentHomework: [],
            weeklyStats: { totalSessions: 0, completed: 0, avgCompletionRate: 0 },
          };
        }
      })
    );

    metrics.increment('parent.homework.overview', { status: 'success' });
    return { children: childrenData };
  }
}
