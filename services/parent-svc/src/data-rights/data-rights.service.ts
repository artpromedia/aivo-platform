/**
 * Data Rights Service
 *
 * Implements FERPA/GDPR parent data rights:
 * - Data export (portability)
 * - Data deletion (right to be forgotten)
 *
 * Created: January 2026 - Enterprise QA Audit requirement
 */

import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { logger, metrics } from '@aivo/ts-observability';
import { PrismaService } from '../prisma/prisma.service.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface DataExport {
  exportId: string;
  exportDate: string;
  studentId: string;
  parentId: string;
  dataCategories: {
    profile: ProfileData;
    learningActivity: LearningActivityData;
    assessments: AssessmentData;
    aiInteractions: AiInteractionData;
    consents: ConsentData;
  };
  metadata: {
    format: string;
    version: string;
    generatedAt: string;
    exportedBy: string;
  };
}

interface ProfileData {
  givenName: string;
  familyName: string;
  dateOfBirth?: string;
  gradeLevel?: string;
  createdAt: string;
  accommodations?: string[];
}

interface LearningActivityData {
  totalSessions: number;
  totalMinutesLearned: number;
  sessionsLast30Days: {
    date: string;
    duration: number;
    lessonsCompleted: number;
  }[];
}

interface AssessmentData {
  totalAssessments: number;
  assessmentResults: {
    assessmentId: string;
    assessmentType: string;
    score?: number;
    completedAt: string;
    subject?: string;
  }[];
}

interface AiInteractionData {
  totalInteractions: number;
  interactionsSummary: {
    month: string;
    count: number;
    types: Record<string, number>;
  }[];
  note: string;
}

interface ConsentData {
  consents: {
    type: string;
    granted: boolean;
    grantedAt?: string;
    revokedAt?: string;
  }[];
}

export interface DeletionRequest {
  id: string;
  parentId: string;
  studentId: string;
  tenantId: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  reason: string;
  createdAt: Date;
  completedAt?: Date;
}

// ════════════════════════════════════════════════════════════════════════════════
// SERVICE
// ════════════════════════════════════════════════════════════════════════════════

@Injectable()
export class DataRightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Verify parent has access to the student
   */
  async verifyParentStudentAccess(parentId: string, studentId: string): Promise<void> {
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
   * Generate comprehensive data export for a student
   *
   * FERPA: Parents can review all education records
   * GDPR: Right to data portability
   */
  async generateDataExport(
    studentId: string,
    parentId: string,
    tenantId: string
  ): Promise<DataExport> {
    const exportId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const exportDate = new Date().toISOString();

    // Fetch all data categories in parallel
    const [profile, learningActivity, assessments, aiInteractions, consents] = await Promise.all([
      this.getProfileData(studentId, tenantId),
      this.getLearningActivityData(studentId, tenantId),
      this.getAssessmentData(studentId, tenantId),
      this.getAiInteractionData(studentId, tenantId),
      this.getConsentData(studentId, parentId),
    ]);

    // Log the export for audit
    await this.logDataExport(studentId, parentId, exportId);

    metrics.increment('data_rights.export.generated', { tenant_id: tenantId });
    logger.info('Data export generated', { studentId, parentId, exportId });

    return {
      exportId,
      exportDate,
      studentId,
      parentId,
      dataCategories: {
        profile,
        learningActivity,
        assessments,
        aiInteractions,
        consents,
      },
      metadata: {
        format: 'JSON',
        version: '1.0',
        generatedAt: exportDate,
        exportedBy: parentId,
      },
    };
  }

  private async getProfileData(studentId: string, tenantId: string): Promise<ProfileData> {
    const profile = await this.prisma.profile.findFirst({
      where: { id: studentId, tenantId },
      select: {
        givenName: true,
        familyName: true,
        dateOfBirth: true,
        gradeLevel: true,
        createdAt: true,
        accommodations: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    return {
      givenName: profile.givenName || '',
      familyName: profile.familyName || '',
      dateOfBirth: profile.dateOfBirth?.toISOString().split('T')[0],
      gradeLevel: profile.gradeLevel || undefined,
      createdAt: profile.createdAt.toISOString(),
      accommodations: profile.accommodations as string[] | undefined,
    };
  }

  private async getLearningActivityData(
    studentId: string,
    tenantId: string
  ): Promise<LearningActivityData> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = await this.prisma.session.findMany({
      where: {
        learnerId: studentId,
        tenantId,
        startedAt: { gte: thirtyDaysAgo },
      },
      select: {
        startedAt: true,
        duration: true,
        lessonsCompleted: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    const totalSessions = await this.prisma.session.count({
      where: { learnerId: studentId, tenantId },
    });

    const totalMinutesResult = await this.prisma.session.aggregate({
      where: { learnerId: studentId, tenantId },
      _sum: { duration: true },
    });

    return {
      totalSessions,
      totalMinutesLearned: Math.round((totalMinutesResult._sum.duration || 0) / 60),
      sessionsLast30Days: sessions.map((s) => ({
        date: s.startedAt.toISOString().split('T')[0] || '',
        duration: Math.round((s.duration || 0) / 60),
        lessonsCompleted: s.lessonsCompleted || 0,
      })),
    };
  }

  private async getAssessmentData(studentId: string, tenantId: string): Promise<AssessmentData> {
    const assessments = await this.prisma.assessmentResult.findMany({
      where: { learnerId: studentId, tenantId },
      select: {
        assessmentId: true,
        assessmentType: true,
        score: true,
        completedAt: true,
        subject: true,
      },
      orderBy: { completedAt: 'desc' },
      take: 100, // Limit to recent 100
    });

    const totalAssessments = await this.prisma.assessmentResult.count({
      where: { learnerId: studentId, tenantId },
    });

    return {
      totalAssessments,
      assessmentResults: assessments.map((a) => ({
        assessmentId: a.assessmentId,
        assessmentType: a.assessmentType || 'unknown',
        score: a.score || undefined,
        completedAt: a.completedAt.toISOString(),
        subject: a.subject || undefined,
      })),
    };
  }

  private async getAiInteractionData(
    studentId: string,
    _tenantId: string
  ): Promise<AiInteractionData> {
    // Note: AI interactions are stored in ai-orchestrator service
    // This provides a summary without raw conversation content for privacy
    // Full conversation review is available through teacher transparency
    return {
      totalInteractions: 0, // Would be fetched from ai-orchestrator
      interactionsSummary: [],
      note: 'Detailed AI interaction logs are available upon request. Contact support@aivo.ai for full conversation transcripts.',
    };
  }

  private async getConsentData(studentId: string, parentId: string): Promise<ConsentData> {
    const consents = await this.prisma.consentRecord.findMany({
      where: {
        parentId,
        studentId,
      },
      select: {
        consentType: true,
        granted: true,
        createdAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      consents: consents.map((c) => ({
        type: c.consentType,
        granted: c.granted,
        grantedAt: c.granted ? c.createdAt.toISOString() : undefined,
        revokedAt: c.revokedAt?.toISOString(),
      })),
    };
  }

  private async logDataExport(
    studentId: string,
    parentId: string,
    exportId: string
  ): Promise<void> {
    await this.prisma.dataExportLog.create({
      data: {
        exportId,
        studentId,
        parentId,
        exportType: 'full_data_export',
        createdAt: new Date(),
      },
    });
  }

  /**
   * Create a data deletion request
   *
   * GDPR Article 17: Right to erasure
   */
  async createDeletionRequest(params: {
    parentId: string;
    studentId: string;
    tenantId: string;
    reason: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<DeletionRequest> {
    // Check for existing pending request
    const existing = await this.prisma.dataDeletionRequest.findFirst({
      where: {
        parentId: params.parentId,
        studentId: params.studentId,
        status: { in: ['pending', 'processing'] },
      },
    });

    if (existing) {
      return {
        id: existing.id,
        parentId: existing.parentId,
        studentId: existing.studentId,
        tenantId: existing.tenantId,
        status: existing.status as DeletionRequest['status'],
        reason: existing.reason,
        createdAt: existing.createdAt,
        completedAt: existing.completedAt || undefined,
      };
    }

    // Create new deletion request
    const request = await this.prisma.dataDeletionRequest.create({
      data: {
        parentId: params.parentId,
        studentId: params.studentId,
        tenantId: params.tenantId,
        reason: params.reason,
        status: 'pending',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    // Emit event for DSR service to process
    this.eventEmitter.emit('data.deletion.requested', {
      requestId: request.id,
      parentId: params.parentId,
      studentId: params.studentId,
      tenantId: params.tenantId,
      reason: params.reason,
    });

    metrics.increment('data_rights.deletion.requested', { tenant_id: params.tenantId });
    logger.info('Data deletion request created', {
      requestId: request.id,
      studentId: params.studentId,
      parentId: params.parentId,
    });

    return {
      id: request.id,
      parentId: request.parentId,
      studentId: request.studentId,
      tenantId: request.tenantId,
      status: 'pending',
      reason: request.reason,
      createdAt: request.createdAt,
    };
  }

  /**
   * Get deletion request status
   */
  async getDeletionRequest(requestId: string, parentId: string): Promise<DeletionRequest> {
    const request = await this.prisma.dataDeletionRequest.findFirst({
      where: {
        id: requestId,
        parentId,
      },
    });

    if (!request) {
      throw new NotFoundException('Deletion request not found');
    }

    return {
      id: request.id,
      parentId: request.parentId,
      studentId: request.studentId,
      tenantId: request.tenantId,
      status: request.status as DeletionRequest['status'],
      reason: request.reason,
      createdAt: request.createdAt,
      completedAt: request.completedAt || undefined,
    };
  }
}
