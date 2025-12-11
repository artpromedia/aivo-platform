/**
 * Compliance Repository
 *
 * Data access layer for SkillPod compliance records
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type {
  ComplianceRecordEntity,
  ComplianceEventType,
  ComplianceSeverity,
  CreateComplianceRecordInput,
  ResolveComplianceRecordInput,
} from '../types/trust-score.types.js';

export interface FindComplianceOptions {
  userId?: string;
  sessionId?: string;
  eventType?: ComplianceEventType;
  severity?: ComplianceSeverity;
  isResolved?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  skip?: number;
  take?: number;
  orderBy?: 'createdAt' | 'severity' | 'scoreImpact';
  orderDir?: 'asc' | 'desc';
}

export interface ComplianceStats {
  totalRecords: number;
  unresolvedCount: number;
  totalScoreImpact: number;
  bySeverity: Record<ComplianceSeverity, number>;
  byEventType: Record<ComplianceEventType, number>;
}

export class ComplianceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find compliance record by ID
   */
  async findById(id: string): Promise<ComplianceRecordEntity | null> {
    const record = await this.prisma.skillPodComplianceRecord.findUnique({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return this.mapToEntity(record);
  }

  /**
   * Find compliance records with filters
   */
  async findMany(
    options: FindComplianceOptions = {},
    pagination: PaginationOptions = {}
  ): Promise<ComplianceRecordEntity[]> {
    const { userId, sessionId, eventType, severity, isResolved, startDate, endDate } = options;
    const { skip = 0, take = 50, orderBy = 'createdAt', orderDir = 'desc' } = pagination;

    const where: Prisma.SkillPodComplianceRecordWhereInput = {};

    if (userId) where.userId = userId;
    if (sessionId) where.sessionId = sessionId;
    if (eventType) where.eventType = eventType;
    if (severity) where.severity = severity;
    if (isResolved !== undefined) where.isResolved = isResolved;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const records = await this.prisma.skillPodComplianceRecord.findMany({
      where,
      skip,
      take,
      orderBy: { [orderBy]: orderDir },
    });

    return records.map(this.mapToEntity);
  }

  /**
   * Find unresolved violations for a user
   */
  async findUnresolvedByUserId(userId: string): Promise<ComplianceRecordEntity[]> {
    const records = await this.prisma.skillPodComplianceRecord.findMany({
      where: {
        userId,
        isResolved: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(this.mapToEntity);
  }

  /**
   * Count violations for a user
   */
  async countByUserId(
    userId: string,
    options: { isResolved?: boolean; startDate?: Date; endDate?: Date } = {}
  ): Promise<number> {
    const { isResolved, startDate, endDate } = options;

    const where: Prisma.SkillPodComplianceRecordWhereInput = { userId };

    if (isResolved !== undefined) where.isResolved = isResolved;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return this.prisma.skillPodComplianceRecord.count({ where });
  }

  /**
   * Create a new compliance record
   */
  async create(input: CreateComplianceRecordInput): Promise<ComplianceRecordEntity> {
    const record = await this.prisma.skillPodComplianceRecord.create({
      data: {
        userId: input.userId,
        sessionId: input.sessionId,
        eventType: input.eventType,
        severity: input.severity,
        description: input.description,
        metadata: input.metadata as Prisma.InputJsonValue,
        scoreImpact: input.scoreImpact,
        isResolved: false,
      },
    });

    return this.mapToEntity(record);
  }

  /**
   * Resolve a compliance violation
   */
  async resolve(id: string, input: ResolveComplianceRecordInput): Promise<ComplianceRecordEntity> {
    const record = await this.prisma.skillPodComplianceRecord.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: input.resolvedBy,
        resolutionNotes: input.resolutionNotes,
      },
    });

    return this.mapToEntity(record);
  }

  /**
   * Delete a compliance record (admin only)
   */
  async delete(id: string): Promise<void> {
    await this.prisma.skillPodComplianceRecord.delete({
      where: { id },
    });
  }

  /**
   * Get statistics for a user
   */
  async getUserStats(userId: string, options: { startDate?: Date; endDate?: Date } = {}): Promise<ComplianceStats> {
    const { startDate, endDate } = options;

    const where: Prisma.SkillPodComplianceRecordWhereInput = { userId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalAndImpact, unresolvedCount, severityCounts, eventTypeCounts] = await Promise.all([
      this.prisma.skillPodComplianceRecord.aggregate({
        where,
        _count: true,
        _sum: { scoreImpact: true },
      }),
      this.prisma.skillPodComplianceRecord.count({
        where: { ...where, isResolved: false },
      }),
      this.prisma.skillPodComplianceRecord.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),
      this.prisma.skillPodComplianceRecord.groupBy({
        by: ['eventType'],
        where,
        _count: true,
      }),
    ]);

    const bySeverity: Record<ComplianceSeverity, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    for (const sc of severityCounts) {
      bySeverity[sc.severity as ComplianceSeverity] = sc._count;
    }

    const byEventType: Record<ComplianceEventType, number> = {
      DATA_TRANSFER_ATTEMPT: 0,
      UNAUTHORIZED_APP: 0,
      POLICY_VIOLATION: 0,
      SESSION_ANOMALY: 0,
      SCREENSHOT_ATTEMPT: 0,
      SCREEN_SHARE_ATTEMPT: 0,
    };
    for (const et of eventTypeCounts) {
      byEventType[et.eventType as ComplianceEventType] = et._count;
    }

    return {
      totalRecords: totalAndImpact._count,
      unresolvedCount,
      totalScoreImpact: Math.abs(totalAndImpact._sum.scoreImpact ?? 0),
      bySeverity,
      byEventType,
    };
  }

  /**
   * Get global compliance statistics
   */
  async getGlobalStats(options: { startDate?: Date; endDate?: Date } = {}): Promise<
    ComplianceStats & {
      uniqueUsers: number;
      avgImpactPerViolation: number;
    }
  > {
    const { startDate, endDate } = options;

    const where: Prisma.SkillPodComplianceRecordWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalAndImpact, unresolvedCount, severityCounts, eventTypeCounts, uniqueUsers] = await Promise.all([
      this.prisma.skillPodComplianceRecord.aggregate({
        where,
        _count: true,
        _sum: { scoreImpact: true },
        _avg: { scoreImpact: true },
      }),
      this.prisma.skillPodComplianceRecord.count({
        where: { ...where, isResolved: false },
      }),
      this.prisma.skillPodComplianceRecord.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),
      this.prisma.skillPodComplianceRecord.groupBy({
        by: ['eventType'],
        where,
        _count: true,
      }),
      this.prisma.skillPodComplianceRecord.groupBy({
        by: ['userId'],
        where,
      }),
    ]);

    const bySeverity: Record<ComplianceSeverity, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    for (const sc of severityCounts) {
      bySeverity[sc.severity as ComplianceSeverity] = sc._count;
    }

    const byEventType: Record<ComplianceEventType, number> = {
      DATA_TRANSFER_ATTEMPT: 0,
      UNAUTHORIZED_APP: 0,
      POLICY_VIOLATION: 0,
      SESSION_ANOMALY: 0,
      SCREENSHOT_ATTEMPT: 0,
      SCREEN_SHARE_ATTEMPT: 0,
    };
    for (const et of eventTypeCounts) {
      byEventType[et.eventType as ComplianceEventType] = et._count;
    }

    return {
      totalRecords: totalAndImpact._count,
      unresolvedCount,
      totalScoreImpact: Math.abs(totalAndImpact._sum.scoreImpact ?? 0),
      bySeverity,
      byEventType,
      uniqueUsers: uniqueUsers.length,
      avgImpactPerViolation: Math.abs(totalAndImpact._avg.scoreImpact ?? 0),
    };
  }

  /**
   * Find recent violations (for recalculation checks)
   */
  async findRecentViolations(userId: string, withinDays: number = 90): Promise<ComplianceRecordEntity[]> {
    const since = new Date();
    since.setDate(since.getDate() - withinDays);

    const records = await this.prisma.skillPodComplianceRecord.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(this.mapToEntity);
  }

  /**
   * Get the date of the most recent violation for a user
   */
  async getLastViolationDate(userId: string): Promise<Date | null> {
    const record = await this.prisma.skillPodComplianceRecord.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return record?.createdAt ?? null;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapToEntity(
    record: Awaited<ReturnType<typeof this.prisma.skillPodComplianceRecord.findUnique>>
  ): ComplianceRecordEntity {
    if (!record) {
      throw new Error('Compliance record not found');
    }

    return {
      id: record.id,
      userId: record.userId,
      sessionId: record.sessionId,
      eventType: record.eventType as ComplianceEventType,
      severity: record.severity as ComplianceSeverity,
      description: record.description,
      metadata: record.metadata as Record<string, unknown>,
      isResolved: record.isResolved,
      resolvedAt: record.resolvedAt,
      resolvedBy: record.resolvedBy,
      resolutionNotes: record.resolutionNotes,
      scoreImpact: record.scoreImpact,
      createdAt: record.createdAt,
    };
  }
}
