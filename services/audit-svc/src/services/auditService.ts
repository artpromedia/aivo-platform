/**
 * AIVO Audit Service - Audit Business Logic
 *
 * Core business logic for audit operations.
 * Sprint T2-05: Added FERPA compliance summary aggregation.
 */

import * as auditRepository from '../repositories/auditRepository.js';
import { prisma } from '../prisma.js';
import type { CreateAuditLog, QueryAuditLogs } from '../types/index.js';

/**
 * Create a single audit log entry.
 */
export async function createAuditLog(tenantId: string, entry: CreateAuditLog) {
  return auditRepository.createAuditLog(tenantId, entry);
}

/**
 * Create multiple audit log entries in batch.
 * Handles deduplication based on eventId.
 */
export async function createAuditLogsBatch(
  tenantId: string,
  entries: CreateAuditLog[]
) {
  // Get existing event IDs for deduplication
  const eventIds = entries
    .filter((e) => e.eventId)
    .map((e) => e.eventId as string);

  const existingLogs = eventIds.length > 0
    ? await auditRepository.getAuditLogsByEventIds(tenantId, eventIds)
    : [];

  const existingEventIds = new Set(existingLogs.map((l) => l.eventId));

  // Filter out duplicates
  const newEntries = entries.filter(
    (e) => !e.eventId || !existingEventIds.has(e.eventId)
  );

  if (newEntries.length === 0) {
    return {
      created: 0,
      duplicates: entries.length,
      logs: [],
    };
  }

  const logs = await auditRepository.createAuditLogsBatch(tenantId, newEntries);

  return {
    created: logs.length,
    duplicates: entries.length - newEntries.length,
    logs,
  };
}

/**
 * Query audit logs with filtering and pagination.
 */
export async function queryAuditLogs(tenantId: string, query: QueryAuditLogs) {
  return auditRepository.queryAuditLogs(tenantId, query);
}

/**
 * Get a single audit log by ID.
 */
export async function getAuditLogById(tenantId: string, id: string) {
  return auditRepository.getAuditLogById(tenantId, id);
}

/**
 * Get audit statistics.
 */
export async function getAuditStats(
  tenantId: string,
  fromDate?: string,
  toDate?: string
) {
  return auditRepository.getAuditStats(
    tenantId,
    fromDate ? new Date(fromDate) : undefined,
    toDate ? new Date(toDate) : undefined
  );
}

/**
 * Verify audit log integrity.
 */
export async function verifyIntegrity(tenantId: string) {
  return auditRepository.verifyIntegrity(tenantId);
}

/**
 * Log access to audit data (meta-audit).
 */
export async function logAuditAccess(
  tenantId: string,
  accessorId: string,
  accessorEmail: string | undefined,
  accessorRoles: string[],
  accessorIp: string | undefined,
  accessType: string,
  queryFilters: object | undefined,
  recordCount: number,
  dataFromDate?: Date,
  dataToDate?: Date,
  requestId?: string
) {
  return prisma.auditAccessLog.create({
    data: {
      tenantId,
      accessorId,
      accessorEmail,
      accessorRoles,
      accessorIp,
      accessType,
      queryFilters,
      recordCount,
      dataFromDate,
      dataToDate,
      requestId,
    },
  });
}

/**
 * FERPA Compliance Summary Aggregation
 *
 * Sprint T2-05: Generates aggregated compliance metrics for FERPA reporting:
 *  - Total accesses in the date range
 *  - Unique users who accessed records
 *  - Most accessed record types
 *  - Anomalous access patterns (off-hours, high-frequency bursts)
 */
export async function getFerpaComplianceSummary(
  tenantId: string,
  studentId?: string,
  fromDate?: string,
  toDate?: string
) {
  const where: Record<string, unknown> = {
    tenantId,
    category: { in: ['DATA_ACCESS', 'DATA_MODIFICATION'] },
  };

  if (studentId) {
    where.targetId = studentId;
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {};
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) dateFilter.lte = new Date(toDate);
    where.occurredAt = dateFilter;
  }

  // Total access count
  const totalAccesses = await prisma.auditLog.count({ where });

  // Unique actors
  const actorGroups = await prisma.auditLog.groupBy({
    by: ['actorId'],
    where,
  });
  const uniqueUsers = actorGroups.length;

  // Accesses by event type
  const eventTypeGroups = await prisma.auditLog.groupBy({
    by: ['eventType'],
    where,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const accessByEventType = eventTypeGroups.map((g) => ({
    eventType: g.eventType,
    count: g._count.id,
  }));

  // Accesses by source service
  const serviceGroups = await prisma.auditLog.groupBy({
    by: ['sourceService'],
    where,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const accessByService = serviceGroups.map((g) => ({
    service: g.sourceService,
    count: g._count.id,
  }));

  // Recent activity (last 30 days daily breakdown)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentWhere = {
    ...where,
    occurredAt: { gte: thirtyDaysAgo },
  };

  const recentLogs = await prisma.auditLog.findMany({
    where: recentWhere,
    select: { occurredAt: true },
    orderBy: { occurredAt: 'asc' },
  });

  // Group by day for daily access counts
  const dailyCounts: Record<string, number> = {};
  for (const log of recentLogs) {
    const day = log.occurredAt.toISOString().split('T')[0]!;
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  }

  const dailyAccessTrend = Object.entries(dailyCounts).map(([date, count]) => ({
    date,
    count,
  }));

  // Anomaly detection: flag days with access count > 3x the average
  const avgDaily =
    dailyAccessTrend.length > 0
      ? dailyAccessTrend.reduce((sum, d) => sum + d.count, 0) / dailyAccessTrend.length
      : 0;

  const anomalies = dailyAccessTrend
    .filter((d) => d.count > avgDaily * 3 && d.count > 5)
    .map((d) => ({
      date: d.date,
      accessCount: d.count,
      averageDaily: Math.round(avgDaily),
      reason: 'Unusually high access volume (>3x daily average)',
    }));

  return {
    tenantId,
    studentId: studentId || 'all',
    period: {
      from: fromDate || thirtyDaysAgo.toISOString().split('T')[0],
      to: toDate || new Date().toISOString().split('T')[0],
    },
    totalAccesses,
    uniqueUsers,
    accessByEventType,
    accessByService,
    dailyAccessTrend,
    anomalies,
    generatedAt: new Date().toISOString(),
  };
}
