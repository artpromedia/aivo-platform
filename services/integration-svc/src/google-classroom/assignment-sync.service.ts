/**
 * Assignment Sync Service
 *
 * Manages the synchronization of AIVO lessons with Google Classroom assignments,
 * including posting assignments, linking records, and grade passback.
 *
 * @module google-classroom/assignment-sync
 */

import type { EventEmitter } from 'events';

import type { PrismaClient } from '@prisma/client';

import type { GoogleClassroomService } from './google-classroom.service.js';
import type {
  ClassroomAssignment,
  AssignmentLinkRecord,
  BatchGradePassbackResult,
} from './types.js';
import { GoogleClassroomError } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_MAX_POINTS = 100;
const GRADE_SYNC_BATCH_SIZE = 10;

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

export class AssignmentSyncService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly googleClassroom: GoogleClassroomService,
    private readonly appBaseUrl: string,
    private readonly eventEmitter?: EventEmitter
  ) {}

  // ============================================================================
  // ASSIGNMENT POSTING
  // ============================================================================

  /**
   * Post an AIVO lesson as a Google Classroom assignment
   */
  async postLessonAsAssignment(
    userId: string,
    lessonId: string,
    courseId: string,
    options: {
      title?: string;
      description?: string;
      dueDate?: Date;
      dueTime?: { hours: number; minutes: number };
      maxPoints?: number;
      scheduledTime?: Date;
      topicId?: string;
    } = {}
  ): Promise<ClassroomAssignment> {
    // Get lesson details
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        blocks: {
          where: { type: 'assessment' },
          select: { settings: true },
        },
      },
    });

    if (!lesson) {
      throw new GoogleClassroomError('Lesson not found', 404, false);
    }

    // Check if already linked
    const existingLink = await this.prisma.googleClassroomAssignment.findFirst({
      where: {
        lessonId,
        googleCourseId: courseId,
        status: 'active',
      },
    });

    if (existingLink) {
      throw new GoogleClassroomError('Lesson is already posted to this course', 409, false);
    }

    // Generate lesson link
    const lessonUrl = `${this.appBaseUrl}/learn/${lessonId}`;

    // Calculate max points from lesson content or use provided value
    const maxPoints = options.maxPoints ?? this.calculateMaxPoints(lesson);

    // Generate description from lesson
    const description = options.description ?? this.generateDescription(lesson);

    // Create assignment in Google Classroom
    const assignment = await this.googleClassroom.createAssignment(userId, courseId, {
      title: options.title || lesson.title,
      description,
      materials: [
        {
          link: {
            url: lessonUrl,
            title: `Open ${lesson.title} in AIVO`,
          },
        },
      ],
      dueDate: options.dueDate,
      dueTime: options.dueTime,
      maxPoints,
      workType: 'ASSIGNMENT',
      state: options.scheduledTime ? 'DRAFT' : 'PUBLISHED',
      scheduledTime: options.scheduledTime,
      topicId: options.topicId,
    });

    // Store link record
    await this.prisma.googleClassroomAssignment.create({
      data: {
        lessonId,
        googleCourseId: courseId,
        googleAssignmentId: assignment.id,
        title: assignment.title,
        maxPoints: assignment.maxPoints,
        dueDate: assignment.dueDate,
        status: 'active',
        lessonUrl,
      },
    });

    console.log('Posted lesson as Classroom assignment', {
      lessonId,
      courseId,
      assignmentId: assignment.id,
    });

    this.eventEmitter?.emit('google-classroom.assignment.posted', {
      lessonId,
      courseId,
      assignmentId: assignment.id,
    });

    return assignment;
  }

  /**
   * Update a linked assignment in Google Classroom
   */
  async updateLinkedAssignment(
    userId: string,
    linkId: string,
    updates: {
      title?: string;
      description?: string;
      dueDate?: Date;
      maxPoints?: number;
      state?: 'DRAFT' | 'PUBLISHED';
    }
  ): Promise<ClassroomAssignment> {
    const link = await this.prisma.googleClassroomAssignment.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new GoogleClassroomError('Assignment link not found', 404, false);
    }

    if (link.status !== 'active') {
      throw new GoogleClassroomError('Cannot update inactive assignment link', 400, false);
    }

    const assignment = await this.googleClassroom.updateAssignment(
      userId,
      link.googleCourseId,
      link.googleAssignmentId,
      updates
    );

    // Update local record
    await this.prisma.googleClassroomAssignment.update({
      where: { id: linkId },
      data: {
        title: updates.title ?? link.title,
        maxPoints: updates.maxPoints ?? link.maxPoints,
        dueDate: updates.dueDate ?? link.dueDate,
        updatedAt: new Date(),
      },
    });

    return assignment;
  }

  /**
   * Delete a linked assignment from Google Classroom
   */
  async deleteLinkedAssignment(userId: string, linkId: string): Promise<void> {
    const link = await this.prisma.googleClassroomAssignment.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new GoogleClassroomError('Assignment link not found', 404, false);
    }

    // Delete from Google Classroom
    try {
      await this.googleClassroom.deleteAssignment(
        userId,
        link.googleCourseId,
        link.googleAssignmentId
      );
    } catch (error: any) {
      // If already deleted in Classroom, continue
      if (error.code !== 404) {
        throw error;
      }
    }

    // Mark as deleted locally
    await this.prisma.googleClassroomAssignment.update({
      where: { id: linkId },
      data: {
        status: 'deleted',
        deletedAt: new Date(),
      },
    });

    console.log('Deleted linked assignment', { linkId });

    this.eventEmitter?.emit('google-classroom.assignment.deleted', {
      linkId,
      lessonId: link.lessonId,
    });
  }

  // ============================================================================
  // ASSIGNMENT LINK QUERIES
  // ============================================================================

  /**
   * Get all linked assignments with optional filters
   */
  async getLinkedAssignments(
    filters: {
      userId?: string;
      courseId?: string;
      lessonId?: string;
      status?: 'active' | 'deleted' | 'archived';
    } = {}
  ): Promise<AssignmentLinkRecord[]> {
    const where: any = {};

    if (filters.courseId) {
      where.googleCourseId = filters.courseId;
    }

    if (filters.lessonId) {
      where.lessonId = filters.lessonId;
    }

    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = 'active';
    }

    const records = await this.prisma.googleClassroomAssignment.findMany({
      where,
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            status: true,
            subject: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      lessonId: r.lessonId,
      googleCourseId: r.googleCourseId,
      googleAssignmentId: r.googleAssignmentId,
      title: r.title ?? undefined,
      maxPoints: r.maxPoints ?? undefined,
      dueDate: r.dueDate ?? undefined,
      status: r.status as 'active' | 'deleted' | 'archived',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      deletedAt: r.deletedAt ?? undefined,
    }));
  }

  /**
   * Get a specific assignment link by ID
   */
  async getAssignmentLink(id: string): Promise<AssignmentLinkRecord | null> {
    const record = await this.prisma.googleClassroomAssignment.findUnique({
      where: { id },
    });

    if (!record) return null;

    return {
      id: record.id,
      lessonId: record.lessonId,
      googleCourseId: record.googleCourseId,
      googleAssignmentId: record.googleAssignmentId,
      title: record.title ?? undefined,
      maxPoints: record.maxPoints ?? undefined,
      dueDate: record.dueDate ?? undefined,
      status: record.status as 'active' | 'deleted' | 'archived',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt ?? undefined,
    };
  }

  /**
   * Get assignment link by lesson and course
   */
  async getAssignmentLinkByLesson(
    lessonId: string,
    courseId: string
  ): Promise<AssignmentLinkRecord | null> {
    const record = await this.prisma.googleClassroomAssignment.findFirst({
      where: {
        lessonId,
        googleCourseId: courseId,
        status: 'active',
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      lessonId: record.lessonId,
      googleCourseId: record.googleCourseId,
      googleAssignmentId: record.googleAssignmentId,
      title: record.title ?? undefined,
      maxPoints: record.maxPoints ?? undefined,
      dueDate: record.dueDate ?? undefined,
      status: record.status as 'active' | 'deleted' | 'archived',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt ?? undefined,
    };
  }

  // ============================================================================
  // GRADE PASSBACK
  // ============================================================================

  /**
   * Pass back a single grade to Google Classroom
   */
  async passbackGrade(
    userId: string,
    options: {
      lessonId: string;
      courseId: string;
      studentId: string;
      grade: number;
      draftGrade?: number;
      returnToStudent?: boolean;
    }
  ): Promise<void> {
    const { lessonId, courseId, studentId, grade, draftGrade, returnToStudent } = options;

    // Get the assignment link
    const link = await this.getAssignmentLinkByLesson(lessonId, courseId);
    if (!link) {
      throw new GoogleClassroomError('No linked assignment found for this lesson', 404, false);
    }

    // Get student's Google user ID
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        class: { googleCourseId: courseId },
      },
    });

    if (!enrollment?.googleUserId) {
      throw new GoogleClassroomError('Student not linked to Google Classroom', 400, false);
    }

    // Get submission
    const submission = await this.googleClassroom.getSubmission(
      userId,
      courseId,
      link.googleAssignmentId,
      enrollment.googleUserId
    );

    if (!submission) {
      throw new GoogleClassroomError('No submission found for student', 404, false);
    }

    // Scale grade to match assignment max points
    const maxPoints = link.maxPoints ?? DEFAULT_MAX_POINTS;
    const scaledGrade = Math.round((grade / 100) * maxPoints);

    // Update grade
    await this.googleClassroom.updateGrade(userId, {
      courseId,
      assignmentId: link.googleAssignmentId,
      submissionId: submission.id,
      grade: scaledGrade,
      draftGrade: draftGrade !== undefined ? Math.round((draftGrade / 100) * maxPoints) : undefined,
    });

    // Return submission if requested
    if (returnToStudent) {
      await this.googleClassroom.returnSubmission(
        userId,
        courseId,
        link.googleAssignmentId,
        submission.id
      );
    }

    // Record grade sync
    await this.prisma.gradePassbackLog.create({
      data: {
        assignmentLinkId: link.id,
        studentId,
        googleUserId: enrollment.googleUserId,
        aivoScore: grade,
        googleGrade: scaledGrade,
        maxPoints,
        returned: returnToStudent ?? false,
        success: true,
      },
    });

    this.eventEmitter?.emit('google-classroom.grade.passedback', {
      lessonId,
      studentId,
      grade: scaledGrade,
    });
  }

  /**
   * Batch pass back grades for multiple students
   */
  async batchPassbackGrades(
    userId: string,
    options: {
      lessonId: string;
      courseId: string;
      grades: { studentId: string; grade: number }[];
      returnToStudents?: boolean;
    }
  ): Promise<BatchGradePassbackResult> {
    const { lessonId, courseId, grades, returnToStudents } = options;

    const link = await this.getAssignmentLinkByLesson(lessonId, courseId);
    if (!link) {
      throw new GoogleClassroomError('No linked assignment found', 404, false);
    }

    const maxPoints = link.maxPoints ?? DEFAULT_MAX_POINTS;
    const results: BatchGradePassbackResult = {
      succeeded: 0,
      failed: 0,
      errors: [],
      results: [],
    };

    // Process in batches
    for (let i = 0; i < grades.length; i += GRADE_SYNC_BATCH_SIZE) {
      const batch = grades.slice(i, i + GRADE_SYNC_BATCH_SIZE);

      await Promise.all(
        batch.map(async ({ studentId, grade }) => {
          try {
            await this.passbackGrade(userId, {
              lessonId,
              courseId,
              studentId,
              grade,
              returnToStudent: returnToStudents,
            });

            results.succeeded++;
            results.results.push({
              studentId,
              googleUserId: '', // Would need to fetch
              success: true,
              grade: Math.round((grade / 100) * maxPoints),
            });
          } catch (error: any) {
            results.failed++;
            results.errors.push(`Student ${studentId}: ${error.message}`);
            results.results.push({
              studentId,
              googleUserId: '',
              success: false,
              error: error.message,
            });
          }
        })
      );

      // Small delay between batches
      if (i + GRADE_SYNC_BATCH_SIZE < grades.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  /**
   * Sync all pending grades for linked assignments
   */
  async syncPendingGrades(
    userId: string,
    courseId?: string
  ): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Find linked assignments
    const links = await this.prisma.googleClassroomAssignment.findMany({
      where: {
        status: 'active',
        ...(courseId && { googleCourseId: courseId }),
      },
    });

    for (const link of links) {
      try {
        const syncResult = await this.syncGradesForAssignment(
          userId,
          link.lessonId,
          link.googleCourseId,
          link.googleAssignmentId,
          link.maxPoints ?? DEFAULT_MAX_POINTS
        );

        result.synced += syncResult.synced;
        result.failed += syncResult.failed;
        result.errors.push(...syncResult.errors);
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Assignment ${link.id}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Sync grades for a specific assignment
   */
  private async syncGradesForAssignment(
    userId: string,
    lessonId: string,
    courseId: string,
    assignmentId: string,
    maxPoints: number
  ): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    // Get all completed attempts for this lesson that haven't been synced
    const completedAttempts = await this.prisma.lessonAttempt.findMany({
      where: {
        lessonId,
        status: 'COMPLETED',
        gradeSyncedAt: null,
        student: {
          enrollments: {
            some: {
              class: { googleCourseId: courseId },
              googleUserId: { not: null },
            },
          },
        },
      },
      include: {
        student: {
          include: {
            enrollments: {
              where: {
                class: { googleCourseId: courseId },
              },
            },
          },
        },
      },
    });

    if (completedAttempts.length === 0) {
      return { synced: 0, failed: 0, errors: [] };
    }

    // Build grade list
    const grades: { studentUserId: string; grade: number }[] = [];

    for (const attempt of completedAttempts) {
      const googleUserId = attempt.student.enrollments[0]?.googleUserId;
      if (!googleUserId) continue;

      // Calculate grade based on score
      const score = attempt.score || 0;
      const grade = Math.round((score / 100) * maxPoints);

      grades.push({
        studentUserId: googleUserId,
        grade,
      });
    }

    // Batch update grades
    const batchResult = await this.googleClassroom.batchUpdateGrades(
      userId,
      courseId,
      assignmentId,
      grades
    );

    // Mark synced attempts
    if (batchResult.succeeded > 0) {
      const syncedStudentIds = completedAttempts
        .slice(0, batchResult.succeeded)
        .map((a) => a.studentId);

      await this.prisma.lessonAttempt.updateMany({
        where: {
          lessonId,
          studentId: { in: syncedStudentIds },
          status: 'COMPLETED',
        },
        data: {
          gradeSyncedAt: new Date(),
        },
      });
    }

    return {
      synced: batchResult.succeeded,
      failed: batchResult.failed,
      errors: batchResult.errors,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Generate assignment description from lesson content
   */
  private generateDescription(lesson: any): string {
    let description = lesson.description || '';

    // Add estimated duration if available
    if (lesson.settings?.estimatedDuration) {
      description += `\n\nEstimated time: ${lesson.settings.estimatedDuration} minutes`;
    }

    // Add subject if available
    if (lesson.subject) {
      description += `\n\nSubject: ${lesson.subject}`;
    }

    // Add skill focus if available
    if (lesson.settings?.skills?.length > 0) {
      description += `\n\nSkills covered: ${lesson.settings.skills.join(', ')}`;
    }

    // Add learning objectives if available
    if (lesson.settings?.objectives?.length > 0) {
      description += '\n\nLearning objectives:';
      lesson.settings.objectives.forEach((obj: string, i: number) => {
        description += `\n${i + 1}. ${obj}`;
      });
    }

    return description.trim();
  }

  /**
   * Calculate max points based on lesson content
   */
  private calculateMaxPoints(lesson: any): number {
    // If lesson has explicit points setting, use it
    if (lesson.settings?.maxPoints) {
      return lesson.settings.maxPoints;
    }

    // Sum up points from assessment blocks
    if (lesson.blocks) {
      let totalPoints = 0;
      for (const block of lesson.blocks) {
        if (block.settings?.scoring?.points) {
          totalPoints += block.settings.scoring.points;
        }
      }
      if (totalPoints > 0) {
        return totalPoints;
      }
    }

    // Default to 100 points
    return DEFAULT_MAX_POINTS;
  }
}
