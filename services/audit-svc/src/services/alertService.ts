/**
 * AIVO Audit Service - Alert Business Logic
 *
 * Manages audit alerts.
 */

import { prisma } from '../prisma.js';
import type { AuditCategory, AuditSeverity } from '../types/index.js';

/**
 * Create an alert from an audit event.
 */
export async function createAlert(
  tenantId: string,
  title: string,
  description: string,
  severity: AuditSeverity,
  eventType: string,
  category: AuditCategory,
  sourceEventIds: string[]
) {
  return prisma.auditAlert.create({
    data: {
      tenantId,
      title,
      description,
      severity,
      eventType,
      category,
      sourceEventIds,
    },
  });
}

/**
 * Get alerts for a tenant.
 */
export async function getAlerts(
  tenantId: string,
  page: number = 1,
  pageSize: number = 20,
  includeResolved: boolean = false
) {
  const where: any = { tenantId };

  if (!includeResolved) {
    where.isResolved = false;
  }

  const [data, totalItems] = await Promise.all([
    prisma.auditAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditAlert.count({ where }),
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
 * Get an alert by ID.
 */
export async function getAlertById(tenantId: string, id: string) {
  return prisma.auditAlert.findFirst({
    where: { id, tenantId },
  });
}

/**
 * Acknowledge an alert.
 */
export async function acknowledgeAlert(
  tenantId: string,
  id: string,
  acknowledgedById: string
) {
  return prisma.auditAlert.update({
    where: { id, tenantId },
    data: {
      isAcknowledged: true,
      acknowledgedAt: new Date(),
      acknowledgedById,
    },
  });
}

/**
 * Resolve an alert.
 */
export async function resolveAlert(
  tenantId: string,
  id: string,
  resolvedById: string,
  resolution: string
) {
  return prisma.auditAlert.update({
    where: { id, tenantId },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
      resolvedById,
      resolution,
    },
  });
}

/**
 * Get alert counts by status.
 */
export async function getAlertCounts(tenantId: string) {
  const [total, unacknowledged, acknowledged, resolved] = await Promise.all([
    prisma.auditAlert.count({ where: { tenantId } }),
    prisma.auditAlert.count({
      where: { tenantId, isAcknowledged: false },
    }),
    prisma.auditAlert.count({
      where: { tenantId, isAcknowledged: true, isResolved: false },
    }),
    prisma.auditAlert.count({
      where: { tenantId, isResolved: true },
    }),
  ]);

  return {
    total,
    unacknowledged,
    acknowledged,
    resolved,
  };
}
