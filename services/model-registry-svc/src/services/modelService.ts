/**
 * AIVO Model Registry Service - Model Service
 *
 * Business logic for model management.
 */

import { prisma } from '../prisma.js';
import type {
  CreateModelInput,
  UpdateModelInput,
  ListModelsQuery,
  PaginatedResponse,
} from '../types/index.js';

/**
 * Create a new model.
 */
export async function createModel(
  tenantId: string,
  ownerId: string,
  ownerEmail: string | undefined,
  input: CreateModelInput
) {
  return prisma.model.create({
    data: {
      tenantId,
      name: input.name,
      displayName: input.displayName,
      description: input.description,
      framework: input.framework,
      task: input.task,
      tags: input.tags || [],
      ownerId,
      ownerEmail,
      teamId: input.teamId,
      isPublic: input.isPublic ?? false,
      allowFineTune: input.allowFineTune ?? false,
    },
    include: {
      versions: {
        select: { id: true, version: true, stage: true },
        orderBy: { versionNumber: 'desc' },
        take: 5,
      },
      _count: {
        select: { versions: true, deployments: true },
      },
    },
  });
}

/**
 * Get a model by ID.
 */
export async function getModelById(tenantId: string, modelId: string) {
  return prisma.model.findFirst({
    where: { id: modelId, tenantId },
    include: {
      versions: {
        select: {
          id: true,
          version: true,
          versionNumber: true,
          stage: true,
          createdAt: true,
        },
        orderBy: { versionNumber: 'desc' },
      },
      _count: {
        select: { versions: true, deployments: true },
      },
    },
  });
}

/**
 * Get a model by name.
 */
export async function getModelByName(tenantId: string, name: string) {
  return prisma.model.findFirst({
    where: { tenantId, name },
    include: {
      versions: {
        select: {
          id: true,
          version: true,
          versionNumber: true,
          stage: true,
          createdAt: true,
        },
        orderBy: { versionNumber: 'desc' },
      },
      _count: {
        select: { versions: true, deployments: true },
      },
    },
  });
}

/**
 * List models with filtering and pagination.
 */
export async function listModels(
  tenantId: string,
  query: ListModelsQuery
): Promise<PaginatedResponse<any>> {
  const {
    framework,
    task,
    tags,
    ownerId,
    search,
    page = 1,
    pageSize = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const where: any = { tenantId };

  if (framework) {
    where.framework = framework;
  }

  if (task) {
    where.task = task;
  }

  if (tags && tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  if (ownerId) {
    where.ownerId = ownerId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, totalItems] = await Promise.all([
    prisma.model.findMany({
      where,
      include: {
        _count: {
          select: { versions: true, deployments: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.model.count({ where }),
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
 * Update a model.
 */
export async function updateModel(
  tenantId: string,
  modelId: string,
  input: UpdateModelInput
) {
  return prisma.model.update({
    where: { id: modelId, tenantId },
    data: {
      displayName: input.displayName,
      description: input.description,
      tags: input.tags,
      isPublic: input.isPublic,
      allowFineTune: input.allowFineTune,
    },
    include: {
      _count: {
        select: { versions: true, deployments: true },
      },
    },
  });
}

/**
 * Delete a model (and all versions/artifacts).
 */
export async function deleteModel(tenantId: string, modelId: string) {
  // Check for active deployments
  const activeDeployments = await prisma.deployment.count({
    where: {
      modelId,
      status: { in: ['PENDING', 'DEPLOYING', 'RUNNING', 'SCALING'] },
    },
  });

  if (activeDeployments > 0) {
    throw new Error('Cannot delete model with active deployments');
  }

  return prisma.model.delete({
    where: { id: modelId, tenantId },
  });
}

/**
 * Get model statistics.
 */
export async function getModelStats(tenantId: string) {
  const [
    totalModels,
    byFramework,
    byTask,
    byStage,
    recentModels,
  ] = await Promise.all([
    prisma.model.count({ where: { tenantId } }),
    prisma.model.groupBy({
      by: ['framework'],
      where: { tenantId },
      _count: { framework: true },
    }),
    prisma.model.groupBy({
      by: ['task'],
      where: { tenantId },
      _count: { task: true },
    }),
    prisma.modelVersion.groupBy({
      by: ['stage'],
      where: { model: { tenantId } },
      _count: { stage: true },
    }),
    prisma.model.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        displayName: true,
        framework: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    totalModels,
    byFramework: Object.fromEntries(
      byFramework.map((f) => [f.framework, f._count.framework])
    ),
    byTask: Object.fromEntries(
      byTask.map((t) => [t.task, t._count.task])
    ),
    versionsByStage: Object.fromEntries(
      byStage.map((s) => [s.stage, s._count.stage])
    ),
    recentModels,
  };
}
