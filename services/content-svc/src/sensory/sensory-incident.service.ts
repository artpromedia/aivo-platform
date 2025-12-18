/**
 * Sensory Incident Service - ND-2.1
 *
 * Tracking and management of sensory-related incidents.
 */

import type { Prisma, SensoryIncident as PrismaSensoryIncident } from '@prisma/client';
import { prisma } from '../prisma.js';
import type {
  CreateSensoryIncidentInput,
  ResolveSensoryIncidentInput,
} from './sensory.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ListIncidentsOptions {
  learnerId?: string;
  tenantId?: string;
  contentId?: string;
  incidentType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'reported' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed';
  triggerCategory?: string;
  systemDetected?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface IncidentStats {
  total: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byTriggerCategory: Record<string, number>;
  byIncidentType: Record<string, number>;
  avgResolutionTimeHours: number | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// CREATE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Report a new sensory incident.
 */
export async function createSensoryIncident(
  input: CreateSensoryIncidentInput
): Promise<PrismaSensoryIncident> {
  const { severity, behavioralSignals, ...rest } = input;

  return prisma.sensoryIncident.create({
    data: {
      ...rest,
      severity: severity ? (severity.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') : 'MEDIUM',
      behavioralSignals: behavioralSignals ?? [],
      actionsTaken: [],
    },
  });
}

/**
 * Report a system-detected incident.
 */
export async function createSystemDetectedIncident(
  learnerId: string,
  tenantId: string,
  data: {
    contentId?: string;
    contentType?: string;
    contentTitle?: string;
    sessionId?: string;
    activityId?: string;
    incidentType: string;
    triggerCategory: 'audio' | 'visual' | 'motion' | 'tactile' | 'cognitive';
    detectionMethod: string;
    detectionConfidence: number;
    behavioralSignals: Array<{ type: string; value: unknown; timestamp: Date; source: string }>;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }
): Promise<PrismaSensoryIncident> {
  // Look up the learner's sensory profile
  const profile = await prisma.learnerSensoryProfile.findUnique({
    where: { learnerId },
    select: { id: true },
  });

  return prisma.sensoryIncident.create({
    data: {
      learnerId,
      tenantId,
      profileId: profile?.id ?? null,
      contentId: data.contentId ?? null,
      contentType: data.contentType ?? null,
      contentTitle: data.contentTitle ?? null,
      sessionId: data.sessionId ?? null,
      activityId: data.activityId ?? null,
      incidentType: data.incidentType,
      triggerCategory: data.triggerCategory,
      triggerTimestamp: new Date(),
      systemDetected: true,
      detectionMethod: data.detectionMethod,
      detectionConfidence: data.detectionConfidence,
      behavioralSignals: data.behavioralSignals,
      severity: data.severity
        ? (data.severity.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')
        : 'MEDIUM',
      actionsTaken: [],
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// READ
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get incident by ID.
 */
export async function getIncidentById(id: string): Promise<PrismaSensoryIncident | null> {
  return prisma.sensoryIncident.findUnique({
    where: { id },
    include: {
      profile: true,
    },
  });
}

/**
 * List incidents with filters.
 */
export async function listIncidents(
  options: ListIncidentsOptions = {}
): Promise<{ items: PrismaSensoryIncident[]; total: number }> {
  const {
    learnerId,
    tenantId,
    contentId,
    incidentType,
    severity,
    status,
    triggerCategory,
    systemDetected,
    startDate,
    endDate,
    page = 1,
    pageSize = 50,
  } = options;

  const where: Prisma.SensoryIncidentWhereInput = {};

  if (learnerId) where.learnerId = learnerId;
  if (tenantId) where.tenantId = tenantId;
  if (contentId) where.contentId = contentId;
  if (incidentType) where.incidentType = incidentType;
  if (severity) where.severity = severity.toUpperCase() as any;
  if (status) where.status = status.toUpperCase() as any;
  if (triggerCategory) where.triggerCategory = triggerCategory;
  if (systemDetected !== undefined) where.systemDetected = systemDetected;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [items, total] = await Promise.all([
    prisma.sensoryIncident.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        profile: {
          select: {
            id: true,
            audioCategory: true,
            visualCategory: true,
            motionCategory: true,
          },
        },
      },
    }),
    prisma.sensoryIncident.count({ where }),
  ]);

  return { items, total };
}

/**
 * Get recent incidents for a learner.
 */
export async function getRecentIncidentsForLearner(
  learnerId: string,
  limit: number = 10
): Promise<PrismaSensoryIncident[]> {
  return prisma.sensoryIncident.findMany({
    where: { learnerId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get incidents related to specific content.
 */
export async function getIncidentsForContent(
  contentId: string,
  limit: number = 50
): Promise<PrismaSensoryIncident[]> {
  return prisma.sensoryIncident.findMany({
    where: { contentId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Acknowledge an incident.
 */
export async function acknowledgeIncident(id: string): Promise<PrismaSensoryIncident> {
  return prisma.sensoryIncident.update({
    where: { id },
    data: {
      status: 'ACKNOWLEDGED',
    },
  });
}

/**
 * Start investigating an incident.
 */
export async function startInvestigating(id: string): Promise<PrismaSensoryIncident> {
  return prisma.sensoryIncident.update({
    where: { id },
    data: {
      status: 'INVESTIGATING',
    },
  });
}

/**
 * Resolve an incident.
 */
export async function resolveIncident(
  id: string,
  input: ResolveSensoryIncidentInput
): Promise<PrismaSensoryIncident> {
  const current = await prisma.sensoryIncident.findUnique({
    where: { id },
    select: { actionsTaken: true },
  });

  const actionsTaken = [
    ...((current?.actionsTaken as any[]) ?? []),
    ...(input.actionsTaken ?? []),
  ];

  return prisma.sensoryIncident.update({
    where: { id },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedByUserId: input.resolvedByUserId,
      resolutionNotes: input.resolutionNotes,
      actionsTaken,
      profileUpdated: input.profileUpdated ?? false,
      contentFlagged: input.contentFlagged ?? false,
    },
  });
}

/**
 * Dismiss an incident.
 */
export async function dismissIncident(
  id: string,
  resolvedByUserId: string,
  notes?: string
): Promise<PrismaSensoryIncident> {
  return prisma.sensoryIncident.update({
    where: { id },
    data: {
      status: 'DISMISSED',
      resolvedAt: new Date(),
      resolvedByUserId,
      resolutionNotes: notes,
    },
  });
}

/**
 * Add an action to an incident.
 */
export async function addActionToIncident(
  id: string,
  action: { type: string; description: string; performedAt: Date; performedByUserId?: string }
): Promise<PrismaSensoryIncident> {
  const current = await prisma.sensoryIncident.findUnique({
    where: { id },
    select: { actionsTaken: true },
  });

  const actionsTaken = [...((current?.actionsTaken as any[]) ?? []), action];

  return prisma.sensoryIncident.update({
    where: { id },
    data: { actionsTaken },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get incident statistics for a tenant.
 */
export async function getIncidentStats(tenantId: string): Promise<IncidentStats> {
  const [total, byStatus, bySeverity, byTriggerCategory, byIncidentType, avgResolution] =
    await Promise.all([
      // Total
      prisma.sensoryIncident.count({ where: { tenantId } }),

      // By status
      prisma.sensoryIncident.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
      }),

      // By severity
      prisma.sensoryIncident.groupBy({
        by: ['severity'],
        where: { tenantId },
        _count: { severity: true },
      }),

      // By trigger category
      prisma.sensoryIncident.groupBy({
        by: ['triggerCategory'],
        where: { tenantId },
        _count: { triggerCategory: true },
      }),

      // By incident type
      prisma.sensoryIncident.groupBy({
        by: ['incidentType'],
        where: { tenantId },
        _count: { incidentType: true },
      }),

      // Average resolution time
      prisma.$queryRaw<Array<{ avg_hours: number | null }>>`
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_hours
        FROM sensory_incidents
        WHERE tenant_id = ${tenantId}::uuid
        AND resolved_at IS NOT NULL
      `,
    ]);

  return {
    total,
    byStatus: Object.fromEntries(
      byStatus.map((s) => [s.status.toLowerCase(), s._count.status])
    ),
    bySeverity: Object.fromEntries(
      bySeverity.map((s) => [s.severity.toLowerCase(), s._count.severity])
    ),
    byTriggerCategory: Object.fromEntries(
      byTriggerCategory.map((t) => [t.triggerCategory, t._count.triggerCategory])
    ),
    byIncidentType: Object.fromEntries(
      byIncidentType.map((i) => [i.incidentType, i._count.incidentType])
    ),
    avgResolutionTimeHours: avgResolution[0]?.avg_hours ?? null,
  };
}

/**
 * Get incident statistics for a learner.
 */
export async function getLearnerIncidentStats(learnerId: string): Promise<{
  total: number;
  unresolved: number;
  byTriggerCategory: Record<string, number>;
  recentIncidents: PrismaSensoryIncident[];
}> {
  const [total, unresolved, byTriggerCategory, recentIncidents] = await Promise.all([
    prisma.sensoryIncident.count({ where: { learnerId } }),
    prisma.sensoryIncident.count({
      where: { learnerId, status: { notIn: ['RESOLVED', 'DISMISSED'] } },
    }),
    prisma.sensoryIncident.groupBy({
      by: ['triggerCategory'],
      where: { learnerId },
      _count: { triggerCategory: true },
    }),
    prisma.sensoryIncident.findMany({
      where: { learnerId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    total,
    unresolved,
    byTriggerCategory: Object.fromEntries(
      byTriggerCategory.map((t) => [t.triggerCategory, t._count.triggerCategory])
    ),
    recentIncidents,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT FLAGGING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if content has been flagged for sensory issues.
 */
export async function isContentFlagged(contentId: string): Promise<boolean> {
  const flaggedCount = await prisma.sensoryIncident.count({
    where: {
      contentId,
      contentFlagged: true,
      status: { notIn: ['DISMISSED'] },
    },
  });
  return flaggedCount > 0;
}

/**
 * Get content items with high incident rates.
 */
export async function getContentWithHighIncidentRate(
  tenantId: string,
  threshold: number = 5
): Promise<Array<{ contentId: string; incidentCount: number }>> {
  const results = await prisma.sensoryIncident.groupBy({
    by: ['contentId'],
    where: {
      tenantId,
      contentId: { not: null },
    },
    _count: { contentId: true },
    having: {
      contentId: { _count: { gte: threshold } },
    },
  });

  return results
    .filter((r) => r.contentId !== null)
    .map((r) => ({
      contentId: r.contentId!,
      incidentCount: r._count.contentId,
    }))
    .sort((a, b) => b.incidentCount - a.incidentCount);
}
