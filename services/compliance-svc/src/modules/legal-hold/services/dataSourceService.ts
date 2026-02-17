/**
 * AIVO Compliance Service - Legal Hold Module – Data Source Service
 *
 * Manages data sources and preservation.
 */

import { prisma } from '../../../prisma.js';
import type {
  CreateDataSourceInput,
  UpdateDataSourceInput,
  DataSourceType,
} from '../types.js';

/**
 * Create a new data source.
 */
export async function createDataSource(tenantId: string, input: CreateDataSourceInput) {
  return prisma.dataSource.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      sourceType: input.sourceType,
      connectionInfo: input.connectionInfo,
      canPreserve: input.canPreserve ?? true,
      canExport: input.canExport ?? true,
      canSearch: input.canSearch ?? true,
      metadata: input.metadata,
    },
  });
}

/**
 * Get a data source by ID.
 */
export async function getDataSource(tenantId: string, dataSourceId: string) {
  return prisma.dataSource.findFirst({
    where: { id: dataSourceId, tenantId },
    include: {
      _count: {
        select: {
          custodians: true,
          holds: { where: { status: { not: 'RELEASED' } } },
        },
      },
    },
  });
}

/**
 * List data sources.
 */
export async function listDataSources(
  tenantId: string,
  options: { sourceType?: DataSourceType; isActive?: boolean; page?: number; pageSize?: number } = {},
) {
  const { sourceType, isActive, page = 1, pageSize = 20 } = options;

  const where: any = {
    tenantId,
    ...(sourceType && { sourceType }),
    ...(isActive !== undefined && { isActive }),
  };

  const skip = (page - 1) * pageSize;

  const [dataSources, totalItems] = await Promise.all([
    prisma.dataSource.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: pageSize,
      include: {
        _count: {
          select: {
            custodians: true,
            holds: { where: { status: { not: 'RELEASED' } } },
          },
        },
      },
    }),
    prisma.dataSource.count({ where }),
  ]);

  return {
    data: dataSources,
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  };
}

/**
 * Update a data source.
 */
export async function updateDataSource(
  tenantId: string,
  dataSourceId: string,
  input: UpdateDataSourceInput,
) {
  const existing = await prisma.dataSource.findFirst({ where: { id: dataSourceId, tenantId } });
  if (!existing) throw new Error('Data source not found');

  return prisma.dataSource.update({
    where: { id: dataSourceId },
    data: {
      name: input.name,
      description: input.description,
      connectionInfo: input.connectionInfo,
      canPreserve: input.canPreserve,
      canExport: input.canExport,
      canSearch: input.canSearch,
      isActive: input.isActive,
      metadata: input.metadata,
    },
  });
}

/**
 * Delete a data source.
 */
export async function deleteDataSource(tenantId: string, dataSourceId: string) {
  const ds = await prisma.dataSource.findFirst({
    where: { id: dataSourceId, tenantId },
    include: { holds: { where: { status: { not: 'RELEASED' } } } },
  });
  if (!ds) throw new Error('Data source not found');
  if (ds.holds.length > 0) throw new Error('Cannot delete data source with active holds');

  await prisma.dataSource.delete({ where: { id: dataSourceId } });
}

/**
 * Add data source to hold.
 */
export async function addDataSourceToHold(
  tenantId: string,
  holdId: string,
  dataSourceId: string,
  userId: string,
) {
  const [hold, dataSource] = await Promise.all([
    prisma.legalHold.findFirst({ where: { id: holdId, tenantId } }),
    prisma.dataSource.findFirst({ where: { id: dataSourceId, tenantId } }),
  ]);
  if (!hold) throw new Error('Hold not found');
  if (!dataSource) throw new Error('Data source not found');

  const hds = await prisma.holdDataSource.upsert({
    where: { holdId_dataSourceId: { holdId, dataSourceId } },
    create: { holdId, dataSourceId, status: 'PENDING' },
    update: { status: 'PENDING', releasedAt: null, releasedBy: null },
    include: { dataSource: true },
  });

  await prisma.holdAuditLog.create({
    data: { holdId, action: 'DATA_SOURCE_ADDED', description: `Added data source: ${dataSource.name}`, performedBy: userId },
  });

  return hds;
}

/**
 * Remove data source from hold.
 */
export async function removeDataSourceFromHold(
  tenantId: string,
  holdId: string,
  dataSourceId: string,
  userId: string,
) {
  const hds = await prisma.holdDataSource.findFirst({
    where: { holdId, dataSourceId },
    include: { hold: { select: { tenantId: true } }, dataSource: true },
  });
  if (hds?.hold.tenantId !== tenantId) throw new Error('Hold data source not found');

  await prisma.holdDataSource.update({
    where: { id: hds.id },
    data: { status: 'RELEASED', releasedAt: new Date(), releasedBy: userId },
  });

  await prisma.holdAuditLog.create({
    data: { holdId, action: 'DATA_SOURCE_RELEASED', description: `Released data source: ${hds.dataSource.name}`, performedBy: userId },
  });
}

/**
 * Update preservation status.
 */
export async function updatePreservationStatus(
  tenantId: string,
  holdId: string,
  dataSourceId: string,
  status: string,
  userId: string,
  metrics?: { itemsPreserved?: number; sizePreserved?: number; preservationId?: string },
) {
  const hds = await prisma.holdDataSource.findFirst({
    where: { holdId, dataSourceId },
    include: { hold: { select: { tenantId: true } } },
  });
  if (hds?.hold.tenantId !== tenantId) throw new Error('Hold data source not found');

  return prisma.holdDataSource.update({
    where: { id: hds.id },
    data: {
      status: status as any,
      preservedAt: status === 'PRESERVED' ? new Date() : undefined,
      preservedBy: status === 'PRESERVED' ? userId : undefined,
      preservationId: metrics?.preservationId,
      itemsPreserved: metrics?.itemsPreserved,
      sizePreserved: metrics?.sizePreserved ? BigInt(metrics.sizePreserved) : undefined,
    },
  });
}

/**
 * Get preservation summary for a hold.
 */
export async function getPreservationSummary(tenantId: string, holdId: string) {
  const hold = await prisma.legalHold.findFirst({
    where: { id: holdId, tenantId },
    include: { dataSources: { include: { dataSource: true } } },
  });
  if (!hold) throw new Error('Hold not found');

  const summary = {
    totalSources: hold.dataSources.length,
    byStatus: {} as Record<string, number>,
    totalItemsPreserved: 0,
    totalSizePreserved: BigInt(0),
    sources: [] as any[],
  };

  for (const hds of hold.dataSources) {
    summary.byStatus[hds.status] = (summary.byStatus[hds.status] || 0) + 1;
    if (hds.itemsPreserved) summary.totalItemsPreserved += hds.itemsPreserved;
    if (hds.sizePreserved) summary.totalSizePreserved += hds.sizePreserved;

    summary.sources.push({
      id: hds.id,
      dataSource: { id: hds.dataSource.id, name: hds.dataSource.name, type: hds.dataSource.sourceType },
      status: hds.status,
      preservedAt: hds.preservedAt,
      itemsPreserved: hds.itemsPreserved,
      sizePreserved: hds.sizePreserved?.toString(),
    });
  }

  return { ...summary, totalSizePreserved: summary.totalSizePreserved.toString() };
}

/**
 * Get data source types.
 */
export function getDataSourceTypes() {
  return [
    { value: 'EMAIL', label: 'Email', icon: 'mail' },
    { value: 'FILE_SHARE', label: 'File Share', icon: 'folder' },
    { value: 'SHAREPOINT', label: 'SharePoint', icon: 'cloud' },
    { value: 'ONEDRIVE', label: 'OneDrive', icon: 'cloud' },
    { value: 'GOOGLE_DRIVE', label: 'Google Drive', icon: 'cloud' },
    { value: 'SLACK', label: 'Slack', icon: 'message' },
    { value: 'TEAMS', label: 'Microsoft Teams', icon: 'message' },
    { value: 'DATABASE', label: 'Database', icon: 'database' },
    { value: 'APPLICATION', label: 'Application', icon: 'app' },
    { value: 'ARCHIVE', label: 'Archive', icon: 'archive' },
    { value: 'BACKUP', label: 'Backup', icon: 'backup' },
    { value: 'OTHER', label: 'Other', icon: 'file' },
  ];
}
