/**
 * AIVO Audit Service - Export Business Logic
 *
 * Handles audit log export operations.
 */

import { prisma } from '../prisma.js';
import { config } from '../config.js';
import type { CreateExport, QueryAuditLogs } from '../types/index.js';

/**
 * Create an export request.
 */
export async function createExport(
  tenantId: string,
  requestedById: string,
  requestedByEmail: string | undefined,
  params: CreateExport
) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.exportRetentionDays);

  const exportRequest = await prisma.auditExport.create({
    data: {
      tenantId,
      requestedById,
      requestedByEmail,
      filters: params.filters || {},
      fromDate: new Date(params.fromDate),
      toDate: new Date(params.toDate),
      format: params.format,
      status: 'PENDING',
      expiresAt,
    },
  });

  // In a production system, this would trigger an async job
  // For now, we'll process it synchronously
  await processExport(exportRequest.id);

  return prisma.auditExport.findUnique({
    where: { id: exportRequest.id },
  });
}

/**
 * Process an export request.
 */
export async function processExport(exportId: string) {
  const exportRequest = await prisma.auditExport.findUnique({
    where: { id: exportId },
  });

  if (!exportRequest) {
    throw new Error('Export request not found');
  }

  try {
    await prisma.auditExport.update({
      where: { id: exportId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    // Build query from filters
    const filters = exportRequest.filters as QueryAuditLogs | null;
    const where: any = {
      tenantId: exportRequest.tenantId,
      occurredAt: {
        gte: exportRequest.fromDate,
        lte: exportRequest.toDate,
      },
    };

    if (filters) {
      if (filters.eventType) where.eventType = filters.eventType;
      if (filters.category) where.category = filters.category;
      if (filters.severity) where.severity = filters.severity;
      if (filters.outcome) where.outcome = filters.outcome;
      if (filters.actorId) where.actorId = filters.actorId;
      if (filters.targetType) where.targetType = filters.targetType;
      if (filters.targetId) where.targetId = filters.targetId;
      if (filters.sourceService) where.sourceService = filters.sourceService;
    }

    // Get all matching records
    const records = await prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: 'asc' },
    });

    // In production, this would:
    // 1. Stream records to S3/storage
    // 2. Generate the file in the requested format
    // 3. Update the export record with the file URL

    // For now, we just update the status
    await prisma.auditExport.update({
      where: { id: exportId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        recordCount: records.length,
        // fileUrl would be set here in production
      },
    });
  } catch (error) {
    await prisma.auditExport.update({
      where: { id: exportId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        retryCount: { increment: 1 },
      },
    });
    throw error;
  }
}

/**
 * Get exports for a tenant.
 */
export async function getExports(
  tenantId: string,
  page: number = 1,
  pageSize: number = 20
) {
  const [data, totalItems] = await Promise.all([
    prisma.auditExport.findMany({
      where: { tenantId },
      orderBy: { requestedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditExport.count({ where: { tenantId } }),
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
 * Get a single export by ID.
 */
export async function getExportById(tenantId: string, id: string) {
  return prisma.auditExport.findFirst({
    where: { id, tenantId },
  });
}

/**
 * Clean up expired exports.
 */
export async function cleanupExpiredExports() {
  const result = await prisma.auditExport.updateMany({
    where: {
      status: 'COMPLETED',
      expiresAt: { lt: new Date() },
    },
    data: {
      status: 'EXPIRED',
      fileUrl: null,
    },
  });

  return result.count;
}
