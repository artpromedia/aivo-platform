/**
 * Data Rights Service
 *
 * Implements FERPA/GDPR parent data rights:
 * - Data export (portability)
 * - Data deletion (right to be forgotten)
 *
 * Created: January 2026 - Enterprise QA Audit requirement
 */

import { logger } from '@aivo/ts-observability';

import { ForbiddenException, NotFoundException } from '../errors.js';
import type { eventBus } from '../event-bus.js';
import type { PrismaService } from '../prisma/prisma.service.js';

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
    iepRecords: IEPRecordData;
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

interface IEPRecordData {
  totalIEPs: number;
  ieps: {
    iepId: string;
    iepNumber: string;
    status: string;
    effectiveDate?: string;
    annualReviewDate?: string;
    goals: {
      goalNumber: number;
      description: string;
      status: string;
      targetDate?: string;
      currentProgress?: number;
    }[];
    accommodations: string[];
    services: string[];
  }[];
  note: string;
}

export interface CorrectionRequest {
  id: string;
  parentId: string;
  studentId: string;
  tenantId: string;
  recordType: string;
  recordId: string;
  currentValue: string;
  requestedValue: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: Date;
  reviewedAt?: Date;
  reviewNote?: string;
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

export class DataRightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: typeof eventBus
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
    const exportId = `export-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const exportDate = new Date().toISOString();

    // Fetch all data categories in parallel
    const [profile, learningActivity, assessments, aiInteractions, consents, iepRecords] =
      await Promise.all([
        this.getProfileData(studentId, tenantId),
        this.getLearningActivityData(studentId, tenantId),
        this.getAssessmentData(studentId, tenantId),
        this.getAiInteractionData(studentId, tenantId),
        this.getConsentData(studentId, parentId),
        this.getIEPRecordData(studentId, tenantId),
      ]);

    // Log the export for audit
    await this.logDataExport(studentId, parentId, exportId);

    logger.info({ studentId, parentId, exportId }, 'Data export generated');

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
        iepRecords,
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
      where: { id: studentId },
      select: {
        givenName: true,
        familyName: true,
        dateOfBirth: true,
        grade: true,
        createdAt: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    return {
      givenName: profile.givenName || '',
      familyName: profile.familyName || '',
      dateOfBirth: profile.dateOfBirth?.toISOString().split('T')[0],
      gradeLevel: profile.grade || undefined,
      createdAt: profile.createdAt.toISOString(),
      accommodations: undefined,
    };
  }

  private async getLearningActivityData(
    studentId: string,
    tenantId: string
  ): Promise<LearningActivityData> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const prismaAny = this.prisma as any;
    const sessions = await prismaAny.session.findMany({
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

    const totalSessions = await prismaAny.session.count({
      where: { learnerId: studentId, tenantId },
    });

    const totalMinutesResult = await prismaAny.session.aggregate({
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
    const prismaAny = this.prisma as any;
    const assessments = await prismaAny.assessmentResult.findMany({
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

    const totalAssessments = await prismaAny.assessmentResult.count({
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
    await (this.prisma as any).dataExportLog.create({
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
   * Fetch IEP records from iep-svc
   *
   * Sprint T2-05: Include IEP data in FERPA data export
   */
  private async getIEPRecordData(studentId: string, tenantId: string): Promise<IEPRecordData> {
    const iepSvcUrl = process.env.IEP_SVC_URL || 'http://localhost:4070';
    try {
      const response = await fetch(`${iepSvcUrl}/ieps?studentId=${encodeURIComponent(studentId)}`, {
        headers: {
          'x-tenant-id': tenantId,
          'content-type': 'application/json',
        },
      });

      if (!response.ok) {
        logger.warn({ studentId, status: response.status }, 'IEP service returned non-OK status');
        return { totalIEPs: 0, ieps: [], note: 'IEP records temporarily unavailable.' };
      }

      const data = await response.json();
      const ieps = Array.isArray(data) ? data : (data.data ?? []);

      return {
        totalIEPs: ieps.length,
        ieps: ieps.map((iep: any) => ({
          iepId: iep.id,
          iepNumber: iep.iepNumber || '',
          status: iep.status || 'UNKNOWN',
          effectiveDate: iep.effectiveDate
            ? new Date(iep.effectiveDate).toISOString().split('T')[0]
            : undefined,
          annualReviewDate: iep.annualReviewDate
            ? new Date(iep.annualReviewDate).toISOString().split('T')[0]
            : undefined,
          goals: (iep.goals ?? []).map((g: any) => ({
            goalNumber: g.goalNumber ?? 0,
            description: g.description ?? '',
            status: g.status ?? 'UNKNOWN',
            targetDate: g.targetDate
              ? new Date(g.targetDate).toISOString().split('T')[0]
              : undefined,
            currentProgress: g.currentProgress ?? undefined,
          })),
          accommodations: iep.accommodations ?? [],
          services: iep.services ?? [],
        })),
        note: 'IEP records retrieved from the Individualized Education Program service.',
      };
    } catch (err) {
      logger.error({ studentId, err }, 'Failed to fetch IEP records from iep-svc');
      return {
        totalIEPs: 0,
        ieps: [],
        note: 'IEP records could not be fetched at this time. Contact support@aivo.ai for a complete copy.',
      };
    }
  }

  /**
   * Submit a FERPA correction request
   *
   * FERPA 34 CFR § 99.20: Parents have the right to request amendment
   * of education records they believe are inaccurate or misleading.
   *
   * Sprint T2-05: Forwarded to audit-svc correction endpoint.
   */
  async submitCorrectionRequest(params: {
    parentId: string;
    studentId: string;
    tenantId: string;
    recordType: string;
    recordId: string;
    currentValue: string;
    requestedValue: string;
    reason: string;
  }): Promise<CorrectionRequest> {
    await this.verifyParentStudentAccess(params.parentId, params.studentId);

    const auditSvcUrl = process.env.AUDIT_SVC_URL || 'http://localhost:4050';

    try {
      const response = await fetch(`${auditSvcUrl}/corrections`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': params.tenantId,
          'x-user-id': params.parentId,
          'x-user-email': '', // filled by controller
        },
        body: JSON.stringify({
          studentId: params.studentId,
          recordType: params.recordType,
          recordId: params.recordId,
          currentValue: params.currentValue,
          requestedValue: params.requestedValue,
          reason: params.reason,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.error(
          { status: response.status, body: errText },
          'Audit svc correction request failed'
        );
        throw new Error('Failed to submit correction request');
      }

      const result = await response.json();

      // Emit event for notification
      this.eventEmitter.emit('data.correction.requested', {
        requestId: result.id,
        parentId: params.parentId,
        studentId: params.studentId,
        tenantId: params.tenantId,
        recordType: params.recordType,
      });

      logger.info(
        { requestId: result.id, studentId: params.studentId, parentId: params.parentId },
        'FERPA correction request submitted'
      );

      return {
        id: result.id,
        parentId: params.parentId,
        studentId: params.studentId,
        tenantId: params.tenantId,
        recordType: params.recordType,
        recordId: params.recordId,
        currentValue: params.currentValue,
        requestedValue: params.requestedValue,
        reason: params.reason,
        status: 'pending',
        createdAt: new Date(result.createdAt ?? Date.now()),
      };
    } catch (err) {
      logger.error({ err, studentId: params.studentId }, 'Failed to submit correction request');
      throw err;
    }
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
    const existing = await (this.prisma as any).dataDeletionRequest.findFirst({
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
    const request = await (this.prisma as any).dataDeletionRequest.create({
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

    logger.info(
      {
        requestId: request.id,
        studentId: params.studentId,
        parentId: params.parentId,
      },
      'Data deletion request created'
    );

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
    const request = await (this.prisma as any).dataDeletionRequest.findFirst({
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
