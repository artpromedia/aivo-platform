/**
 * AIVO Audit Service - Audit Business Logic
 *
 * Core business logic for audit operations.
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
