/**
 * Research Audit Service
 *
 * Records all research-related actions to an immutable audit log.
 */

import type { AuditAction, Prisma } from '@prisma/client';

import { prisma } from '../prisma.js';

export interface AuditContext {
  tenantId: string;
  userId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditMetadata = Record<string, unknown>;

export interface RecordAuditLogInput {
  projectId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}

/**
 * Record an action to the audit log
 * Supports both new interface (input, context) and legacy interface (context, action, projectId?, metadata?)
 */
export async function recordAuditLog(
  contextOrInput: AuditContext | RecordAuditLogInput,
  actionOrContext: AuditAction | AuditContext,
  researchProjectId?: string,
  metadata?: AuditMetadata
): Promise<void> {
  // Detect which interface is being used
  if (typeof actionOrContext !== 'object' || !('tenantId' in actionOrContext)) {
    // Legacy interface: (context, action, projectId?, metadata?)
    const context = contextOrInput as AuditContext;
    const action = actionOrContext;
    await prisma.researchAuditLog.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        userEmail: context.userEmail,
        action,
        researchProjectId: researchProjectId ?? null,
        metadataJson: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
    });
  } else {
    // New interface: (input, context)
    const input = contextOrInput as RecordAuditLogInput;
    const context = actionOrContext;
    await prisma.researchAuditLog.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        userEmail: context.userEmail,
        action: input.action,
        researchProjectId: input.projectId ?? null,
        metadataJson: {
          entityType: input.entityType,
          entityId: input.entityId,
          ...input.details,
        },
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
    });
  }
}

/**
 * Get audit logs for a project
 */
export async function getProjectAuditLogs(
  projectId: string,
  tenantId: string,
  options: {
    action?: string[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { limit = 50, offset = 0 } = options;

  const where = {
    researchProjectId: projectId,
    tenantId,
    ...(options.action?.length ? { action: { in: options.action as AuditAction[] } } : {}),
    ...(options.startDate || options.endDate
      ? {
          createdAt: {
            ...(options.startDate ? { gte: options.startDate } : {}),
            ...(options.endDate ? { lte: options.endDate } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.researchAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.researchAuditLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: { total, limit, offset },
  };
}

/**
 * Get export-related audit logs across all projects.
 */
export async function getExportAuditLogs(
  tenantId: string,
  options: {
    action?: string[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { limit = 50, offset = 0 } = options;

  const exportActions: AuditAction[] = [
    'EXPORT_REQUESTED',
    'EXPORT_COMPLETED',
    'EXPORT_FAILED',
    'EXPORT_DOWNLOADED',
  ];

  const where = {
    tenantId,
    action: { in: options.action?.length ? (options.action as AuditAction[]) : exportActions },
    ...(options.startDate || options.endDate
      ? {
          createdAt: {
            ...(options.startDate ? { gte: options.startDate } : {}),
            ...(options.endDate ? { lte: options.endDate } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.researchAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.researchAuditLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: { total, limit, offset },
  };
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  tenantId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
) {
  const { limit = 50, offset = 0 } = options;

  return prisma.researchAuditLog.findMany({
    where: {
      userId,
      tenantId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
