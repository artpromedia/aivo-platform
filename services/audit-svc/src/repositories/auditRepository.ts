/**
 * AIVO Audit Service - Audit Repository
 *
 * Data access layer for audit logs. All operations are append-only.
 */

import { prisma } from '../prisma.js';
import { Prisma } from '../../generated/prisma-client/index.js';
import { generateChecksum, generateChainedHash } from '../lib/checksum.js';
import type {
  CreateAuditLog,
  QueryAuditLogs,
  AuditCategory,
  AuditSeverity,
} from '../types/index.js';

// Severity ordering for comparison
const SEVERITY_ORDER: Record<AuditSeverity, number> = {
  DEBUG: 0,
  INFO: 1,
  NOTICE: 2,
  WARNING: 3,
  ERROR: 4,
  CRITICAL: 5,
  ALERT: 6,
  EMERGENCY: 7,
};

/**
 * Creates an immutable audit log entry.
 */
export async function createAuditLog(
  tenantId: string,
  entry: CreateAuditLog
) {
  // Generate unique event ID if not provided
  const eventId = entry.eventId || crypto.randomUUID();
  const occurredAt = entry.occurredAt
    ? new Date(entry.occurredAt)
    : new Date();

  // Get the previous entry's hash for chain integrity
  const lastEntry = await prisma.auditLog.findFirst({
    where: { tenantId },
    orderBy: { receivedAt: 'desc' },
    select: { checksum: true },
  });

  // Generate checksum for integrity
  const entryWithIds = { ...entry, tenantId, eventId, occurredAt: occurredAt.toISOString() };
  const checksum = generateChecksum(entryWithIds);
  const previousHash = lastEntry?.checksum || null;

  // Create the audit log entry
  const auditLog = await prisma.auditLog.create({
    data: {
      eventId,
      eventType: entry.eventType,
      eventVersion: entry.eventVersion || '1.0',
      tenantId,
      category: entry.category,
      severity: entry.severity || 'INFO',
      outcome: entry.outcome,
      actorId: entry.actorId,
      actorType: entry.actorType,
      actorEmail: entry.actorEmail,
      actorRoles: entry.actorRoles || [],
      actorIpAddress: entry.actorIpAddress,
      actorUserAgent: entry.actorUserAgent,
      actorSessionId: entry.actorSessionId,
      targetType: entry.targetType,
      targetId: entry.targetId,
      targetName: entry.targetName,
      action: entry.action,
      description: entry.description,
      requestId: entry.requestId,
      requestMethod: entry.requestMethod,
      requestPath: entry.requestPath,
      sourceService: entry.sourceService,
      sourceVersion: entry.sourceVersion,
      metadata: (entry.metadata || {}) as Prisma.InputJsonValue,
      previousState: entry.previousState as Prisma.InputJsonValue | undefined,
      newState: entry.newState as Prisma.InputJsonValue | undefined,
      dataClassification: entry.dataClassification,
      complianceFlags: entry.complianceFlags || [],
      retentionPolicy: entry.retentionPolicy,
      checksum,
      previousHash,
      occurredAt,
    },
  });

  return auditLog;
}

/**
 * Batch create audit log entries.
 */
export async function createAuditLogsBatch(
  tenantId: string,
  entries: CreateAuditLog[]
) {
  const results = [];

  // Process in order to maintain chain integrity
  for (const entry of entries) {
    const result = await createAuditLog(tenantId, entry);
    results.push(result);
  }

  return results;
}

/**
 * Query audit logs with filters and pagination.
 */
export async function queryAuditLogs(tenantId: string, query: QueryAuditLogs) {
  const {
    eventType,
    eventTypes,
    category,
    categories,
    severity,
    minSeverity,
    outcome,
    actorId,
    actorType,
    targetType,
    targetId,
    sourceService,
    fromDate,
    toDate,
    search,
    page,
    pageSize,
    sortBy,
    sortOrder,
  } = query;

  // Build where clause
  const where: any = { tenantId };

  if (eventType) {
    where.eventType = eventType;
  }

  if (eventTypes && eventTypes.length > 0) {
    where.eventType = { in: eventTypes };
  }

  if (category) {
    where.category = category;
  }

  if (categories && categories.length > 0) {
    where.category = { in: categories };
  }

  if (severity) {
    where.severity = severity;
  }

  if (minSeverity) {
    // Filter by minimum severity
    const minOrder = SEVERITY_ORDER[minSeverity];
    const validSeverities = Object.entries(SEVERITY_ORDER)
      .filter(([_, order]) => order >= minOrder)
      .map(([sev]) => sev);
    where.severity = { in: validSeverities };
  }

  if (outcome) {
    where.outcome = outcome;
  }

  if (actorId) {
    where.actorId = actorId;
  }

  if (actorType) {
    where.actorType = actorType;
  }

  if (targetType) {
    where.targetType = targetType;
  }

  if (targetId) {
    where.targetId = targetId;
  }

  if (sourceService) {
    where.sourceService = sourceService;
  }

  if (fromDate || toDate) {
    where.occurredAt = {};
    if (fromDate) {
      where.occurredAt.gte = new Date(fromDate);
    }
    if (toDate) {
      where.occurredAt.lte = new Date(toDate);
    }
  }

  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { eventType: { contains: search, mode: 'insensitive' } },
      { targetName: { contains: search, mode: 'insensitive' } },
      { actorEmail: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Execute query with pagination
  const [data, totalItems] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

/**
 * Get a single audit log entry by ID.
 */
export async function getAuditLogById(tenantId: string, id: string) {
  return prisma.auditLog.findFirst({
    where: { id, tenantId },
  });
}

/**
 * Get audit logs by event IDs (for deduplication).
 */
export async function getAuditLogsByEventIds(
  tenantId: string,
  eventIds: string[]
) {
  return prisma.auditLog.findMany({
    where: {
      tenantId,
      eventId: { in: eventIds },
    },
  });
}

/**
 * Get audit statistics for a tenant.
 */
export async function getAuditStats(
  tenantId: string,
  fromDate?: Date,
  toDate?: Date
) {
  const where: any = { tenantId };

  if (fromDate || toDate) {
    where.occurredAt = {};
    if (fromDate) where.occurredAt.gte = fromDate;
    if (toDate) where.occurredAt.lte = toDate;
  }

  const [
    totalCount,
    byCategory,
    bySeverity,
    byOutcome,
    topEventTypes,
    topActors,
  ] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({
      by: ['category'],
      where,
      _count: { category: true },
    }),
    prisma.auditLog.groupBy({
      by: ['severity'],
      where,
      _count: { severity: true },
    }),
    prisma.auditLog.groupBy({
      by: ['outcome'],
      where,
      _count: { outcome: true },
    }),
    prisma.auditLog.groupBy({
      by: ['eventType'],
      where,
      _count: { eventType: true },
      orderBy: { _count: { eventType: 'desc' } },
      take: 10,
    }),
    prisma.auditLog.groupBy({
      by: ['actorId', 'actorEmail'],
      where: { ...where, actorId: { not: null } },
      _count: { actorId: true },
      orderBy: { _count: { actorId: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    totalCount,
    byCategory: Object.fromEntries(
      byCategory.map((c) => [c.category, c._count.category])
    ),
    bySeverity: Object.fromEntries(
      bySeverity.map((s) => [s.severity, s._count.severity])
    ),
    byOutcome: Object.fromEntries(
      byOutcome.map((o) => [o.outcome, o._count.outcome])
    ),
    topEventTypes: topEventTypes.map((e) => ({
      eventType: e.eventType,
      count: e._count.eventType,
    })),
    topActors: topActors.map((a) => ({
      actorId: a.actorId,
      actorEmail: a.actorEmail,
      count: a._count.actorId,
    })),
  };
}

/**
 * Verify the integrity of audit logs in a range.
 */
export async function verifyIntegrity(
  tenantId: string,
  fromId?: string,
  toId?: string
) {
  const where: any = { tenantId };

  // Get logs in order
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { receivedAt: 'asc' },
    select: {
      id: true,
      checksum: true,
      previousHash: true,
    },
  });

  const violations: Array<{ id: string; issue: string }> = [];
  let previousChecksum: string | null = null;

  for (const log of logs) {
    // Verify chain integrity
    if (log.previousHash !== previousChecksum) {
      violations.push({
        id: log.id,
        issue: 'Chain integrity violation: previousHash mismatch',
      });
    }
    previousChecksum = log.checksum;
  }

  return {
    verified: violations.length === 0,
    totalChecked: logs.length,
    violations,
  };
}
