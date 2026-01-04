/**
 * Gradebook Service
 *
 * Handles all gradebook operations including:
 * - Assignment management
 * - Grade calculations
 * - Grade categories
 * - Grade history and audit trail
 * - Bulk import/export
 */

import { PrismaClient } from '../generated/prisma-client/index.js';
import type {
  Assignment,
  Grade,
  GradeCategory,
  GradebookConfig,
  GradeAuditLog,
  AssignmentType,
  GradeStatus,
  GradeCalculationType
} from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

export interface CreateAssignmentInput {
  gradebookConfigId: string;
  categoryId?: string;
  title: string;
  description?: string;
  type: AssignmentType;
  totalPoints: number;
  extraCredit?: boolean;
  dueDate?: Date;
  assignedDate?: Date;
  availableFrom?: Date;
  availableUntil?: Date;
  allowLateSubmissions?: boolean;
  latePenaltyPercent?: number;
  assessmentId?: string;
  createdBy: string;
}

export interface UpdateGradeInput {
  gradeId: string;
  score?: number | null;
  status?: GradeStatus;
  feedback?: string;
  privateNotes?: string;
  rubricScores?: any;
  gradedBy: string;
  overrideReason?: string;
}

export interface BulkGradeImport {
  assignmentId: string;
  grades: Array<{
    studentId: string;
    score: number | null;
    feedback?: string;
  }>;
  importedBy: string;
}

export interface GradebookCalculation {
  studentId: string;
  categoryGrades: Array<{
    categoryId: string;
    categoryName: string;
    score: number;
    weight: number;
  }>;
  overallGrade: number;
  letterGrade: string;
  totalPoints: number;
  earnedPoints: number;
}

export class GradebookService {
  /**
   * Get gradebook configuration for a classroom
   */
  async getGradebookConfig(classroomId: string): Promise<GradebookConfig | null> {
    return prisma.gradebookConfig.findUnique({
      where: { classroomId },
      include: {
        categories: {
          orderBy: { orderIndex: 'asc' }
        },
        assignments: {
          where: { status: 'PUBLISHED' },
          orderBy: { dueDate: 'desc' },
          include: {
            category: true,
            grades: true
          }
        }
      }
    });
  }

  /**
   * Create or update gradebook configuration
   */
  async upsertGradebookConfig(
    classroomId: string,
    teacherId: string,
    tenantId: string,
    config: Partial<GradebookConfig>
  ): Promise<GradebookConfig> {
    return prisma.gradebookConfig.upsert({
      where: { classroomId },
      create: {
        classroomId,
        teacherId,
        tenantId,
        ...config
      },
      update: config,
      include: {
        categories: true
      }
    });
  }

  /**
   * Create grade category
   */
  async createCategory(
    gradebookConfigId: string,
    name: string,
    weight: number,
    options?: {
      color?: string;
      dropLowest?: number;
      orderIndex?: number;
    }
  ): Promise<GradeCategory> {
    return prisma.gradeCategory.create({
      data: {
        gradebookConfigId,
        name,
        weight,
        color: options?.color,
        dropLowest: options?.dropLowest ?? 0,
        orderIndex: options?.orderIndex ?? 0
      }
    });
  }

  /**
   * Update category weights
   */
  async updateCategoryWeights(
    categories: Array<{ id: string; weight: number }>
  ): Promise<void> {
    await prisma.$transaction(
      categories.map(cat =>
        prisma.gradeCategory.update({
          where: { id: cat.id },
          data: { weight: cat.weight }
        })
      )
    );
  }

  /**
   * Create assignment
   */
  async createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
    const config = await prisma.gradebookConfig.findUnique({
      where: { id: input.gradebookConfigId }
    });

    if (!config) {
      throw new Error('Gradebook config not found');
    }

    return prisma.assignment.create({
      data: {
        tenantId: config.tenantId,
        gradebookConfigId: input.gradebookConfigId,
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        type: input.type,
        totalPoints: input.totalPoints,
        extraCredit: input.extraCredit ?? false,
        dueDate: input.dueDate,
        assignedDate: input.assignedDate,
        availableFrom: input.availableFrom,
        availableUntil: input.availableUntil,
        allowLateSubmissions: input.allowLateSubmissions ?? true,
        latePenaltyPercent: input.latePenaltyPercent,
        assessmentId: input.assessmentId,
        createdBy: input.createdBy,
        status: 'DRAFT'
      },
      include: {
        category: true
      }
    });
  }

  /**
   * Update assignment
   */
  async updateAssignment(
    assignmentId: string,
    updates: Partial<Assignment>
  ): Promise<Assignment> {
    return prisma.assignment.update({
      where: { id: assignmentId },
      data: updates,
      include: {
        category: true,
        grades: true
      }
    });
  }

  /**
   * Publish assignment
   */
  async publishAssignment(assignmentId: string): Promise<Assignment> {
    return prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date()
      }
    });
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(assignmentId: string): Promise<void> {
    await prisma.assignment.delete({
      where: { id: assignmentId }
    });
  }

  /**
   * Submit or update a grade
   */
  async submitGrade(input: UpdateGradeInput): Promise<Grade> {
    const { gradeId, score, status, feedback, privateNotes, rubricScores, gradedBy, overrideReason } = input;

    // Get existing grade
    const existingGrade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: { assignment: true }
    });

    if (!existingGrade) {
      throw new Error('Grade not found');
    }

    // Calculate percentage
    const maxPoints = existingGrade.assignment.totalPoints;
    const percentage = score !== null && score !== undefined ? (score / maxPoints) * 100 : null;

    // Determine if this is an override
    const isOverride = overrideReason !== undefined && overrideReason !== null;
    const originalScore = isOverride ? existingGrade.score : existingGrade.originalScore;

    // Update grade
    const updatedGrade = await prisma.grade.update({
      where: { id: gradeId },
      data: {
        score,
        maxPoints,
        percentage,
        status: status ?? (score !== null ? 'GRADED' : existingGrade.status),
        feedback,
        privateNotes,
        rubricScores,
        gradedBy,
        gradedAt: new Date(),
        isOverride,
        overrideReason,
        originalScore
      }
    });

    // Create audit log entry
    await this.createAuditLog({
      gradeId,
      assignmentId: existingGrade.assignmentId,
      studentId: existingGrade.studentId,
      action: isOverride ? 'override_applied' : 'updated',
      fieldChanged: 'score',
      oldValue: existingGrade.score?.toString(),
      newValue: score?.toString(),
      reason: overrideReason,
      changedBy: gradedBy
    });

    return updatedGrade;
  }

  /**
   * Create grade for student (if not exists)
   */
  async getOrCreateGrade(
    assignmentId: string,
    studentId: string,
    tenantId: string
  ): Promise<Grade> {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId }
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    return prisma.grade.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId
        }
      },
      create: {
        assignmentId,
        studentId,
        tenantId,
        maxPoints: assignment.totalPoints,
        status: 'NOT_SUBMITTED'
      },
      update: {}
    });
  }

  /**
   * Bulk import grades
   */
  async bulkImportGrades(input: BulkGradeImport): Promise<{
    success: number;
    failed: number;
    errors: Array<{ studentId: string; error: string }>
  }> {
    const { assignmentId, grades, importedBy } = input;
    let success = 0;
    let failed = 0;
    const errors: Array<{ studentId: string; error: string }> = [];

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId }
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    for (const gradeData of grades) {
      try {
        const grade = await this.getOrCreateGrade(
          assignmentId,
          gradeData.studentId,
          assignment.tenantId
        );

        await this.submitGrade({
          gradeId: grade.id,
          score: gradeData.score,
          feedback: gradeData.feedback,
          gradedBy: importedBy
        });

        success++;
      } catch (error) {
        failed++;
        errors.push({
          studentId: gradeData.studentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { success, failed, errors };
  }

  /**
   * Calculate grades for a student
   */
  async calculateStudentGrades(
    gradebookConfigId: string,
    studentId: string
  ): Promise<GradebookCalculation> {
    const config = await prisma.gradebookConfig.findUnique({
      where: { id: gradebookConfigId },
      include: {
        categories: true,
        assignments: {
          where: {
            status: 'PUBLISHED',
            extraCredit: false
          },
          include: {
            category: true,
            grades: {
              where: { studentId }
            }
          }
        }
      }
    });

    if (!config) {
      throw new Error('Gradebook config not found');
    }

    const categoryGrades: Array<{
      categoryId: string;
      categoryName: string;
      score: number;
      weight: number;
    }> = [];

    let totalPoints = 0;
    let earnedPoints = 0;

    if (config.calculationType === 'WEIGHTED_CATEGORIES') {
      // Calculate weighted category grades
      for (const category of config.categories) {
        const categoryAssignments = config.assignments.filter(
          a => a.categoryId === category.id
        );

        if (categoryAssignments.length === 0) continue;

        let categoryTotal = 0;
        let categoryEarned = 0;
        let validGrades = 0;

        for (const assignment of categoryAssignments) {
          const grade = assignment.grades[0];
          if (grade?.score !== null && grade?.score !== undefined) {
            categoryTotal += assignment.totalPoints;
            categoryEarned += grade.score;
            validGrades++;
          }
        }

        if (validGrades > 0) {
          const categoryScore = (categoryEarned / categoryTotal) * 100;
          categoryGrades.push({
            categoryId: category.id,
            categoryName: category.name,
            score: categoryScore,
            weight: category.weight
          });
        }
      }

      // Calculate weighted overall grade
      const totalWeight = categoryGrades.reduce((sum, cat) => sum + cat.weight, 0);
      const weightedScore = categoryGrades.reduce(
        (sum, cat) => sum + (cat.score * cat.weight),
        0
      );
      const overallGrade = totalWeight > 0 ? weightedScore / totalWeight : 0;

      return {
        studentId,
        categoryGrades,
        overallGrade,
        letterGrade: this.getLetterGrade(overallGrade, config.letterGradeScale as any),
        totalPoints,
        earnedPoints
      };
    } else {
      // TOTAL_POINTS calculation
      for (const assignment of config.assignments) {
        const grade = assignment.grades[0];
        totalPoints += assignment.totalPoints;
        if (grade?.score !== null && grade?.score !== undefined) {
          earnedPoints += grade.score;
        }
      }

      const overallGrade = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

      return {
        studentId,
        categoryGrades: [],
        overallGrade,
        letterGrade: this.getLetterGrade(overallGrade, config.letterGradeScale as any),
        totalPoints,
        earnedPoints
      };
    }
  }

  /**
   * Get student grades
   */
  async getStudentGrades(
    classroomId: string,
    studentId: string
  ): Promise<{
    grades: Grade[];
    calculation: GradebookCalculation;
  }> {
    const config = await this.getGradebookConfig(classroomId);
    if (!config) {
      throw new Error('Gradebook config not found');
    }

    const grades = await prisma.grade.findMany({
      where: {
        studentId,
        assignment: {
          gradebookConfigId: config.id,
          status: 'PUBLISHED'
        }
      },
      include: {
        assignment: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        assignment: {
          dueDate: 'desc'
        }
      }
    });

    const calculation = await this.calculateStudentGrades(config.id, studentId);

    return { grades, calculation };
  }

  /**
   * Get classroom gradebook
   */
  async getClassroomGradebook(classroomId: string): Promise<{
    config: GradebookConfig;
    students: Array<{
      studentId: string;
      calculation: GradebookCalculation;
    }>;
  }> {
    const config = await this.getGradebookConfig(classroomId);
    if (!config) {
      throw new Error('Gradebook config not found');
    }

    // Get all student IDs from grades
    const studentIds = await prisma.grade.findMany({
      where: {
        assignment: {
          gradebookConfigId: config.id
        }
      },
      select: {
        studentId: true
      },
      distinct: ['studentId']
    });

    const students = await Promise.all(
      studentIds.map(async ({ studentId }) => ({
        studentId,
        calculation: await this.calculateStudentGrades(config.id, studentId)
      }))
    );

    return { config, students };
  }

  /**
   * Export gradebook to CSV
   */
  async exportGradebook(classroomId: string): Promise<string> {
    const { config, students } = await this.getClassroomGradebook(classroomId);

    // Generate CSV headers
    const headers = ['Student ID', 'Overall Grade', 'Letter Grade'];
    config.assignments.forEach(assignment => {
      headers.push(`${assignment.title} (${assignment.totalPoints}pts)`);
    });

    // Generate CSV rows
    const rows = students.map(student => {
      const row = [
        student.studentId,
        student.calculation.overallGrade.toFixed(2),
        student.calculation.letterGrade
      ];

      config.assignments.forEach(assignment => {
        const grade = assignment.grades.find(g => g.studentId === student.studentId);
        row.push(grade?.score?.toString() ?? '');
      });

      return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Get grade history (audit log)
   */
  async getGradeHistory(gradeId: string): Promise<GradeAuditLog[]> {
    return prisma.gradeAuditLog.findMany({
      where: { gradeId },
      orderBy: { changedAt: 'desc' }
    });
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(data: {
    gradeId: string;
    assignmentId: string;
    studentId: string;
    action: string;
    fieldChanged?: string;
    oldValue?: string;
    newValue?: string;
    reason?: string;
    changedBy: string;
  }): Promise<GradeAuditLog> {
    return prisma.gradeAuditLog.create({
      data: {
        gradeId: data.gradeId,
        assignmentId: data.assignmentId,
        studentId: data.studentId,
        action: data.action,
        fieldChanged: data.fieldChanged,
        oldValue: data.oldValue,
        newValue: data.newValue,
        reason: data.reason,
        changedBy: data.changedBy
      }
    });
  }

  /**
   * Get letter grade from percentage
   */
  private getLetterGrade(
    percentage: number,
    scale: Record<string, number>
  ): string {
    const grades = Object.entries(scale).sort((a, b) => b[1] - a[1]);
    for (const [grade, threshold] of grades) {
      if (percentage >= threshold) {
        return grade;
      }
    }
    return 'F';
  }
}

export const gradebookService = new GradebookService();
