/**
 * AIVO Model Registry Service - Version Service
 *
 * Business logic for model version management.
 */

import * as semver from 'semver';
import { Prisma } from '@prisma/client';

import { prisma } from '../prisma.js';
import type {
  CreateVersionInput,
  UpdateVersionInput,
  TransitionStageInput,
  ListVersionsQuery,
  ModelStage,
  PaginatedResponse,
} from '../types/index.js';

// Valid stage transitions
const VALID_TRANSITIONS: Record<ModelStage, ModelStage[]> = {
  DRAFT: ['VALIDATION', 'ARCHIVED'],
  VALIDATION: ['DRAFT', 'STAGING', 'ARCHIVED'],
  STAGING: ['VALIDATION', 'PRODUCTION', 'ARCHIVED'],
  PRODUCTION: ['STAGING', 'DEPRECATED'],
  ARCHIVED: ['DRAFT'],
  DEPRECATED: ['ARCHIVED'],
};

/**
 * Create a new model version.
 */
export async function createVersion(
  modelId: string,
  createdBy: string,
  input: CreateVersionInput
) {
  // Get the latest version number
  const latestVersion = await prisma.modelVersion.findFirst({
    where: { modelId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true, version: true },
  });

  const versionNumber = (latestVersion?.versionNumber || 0) + 1;

  // Determine semantic version
  let version = input.version;
  if (!version) {
    if (latestVersion?.version) {
      // Auto-increment patch version
      const parsed = semver.parse(latestVersion.version);
      if (parsed) {
        version = `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
      } else {
        version = `1.0.${versionNumber - 1}`;
      }
    } else {
      version = '1.0.0';
    }
  }

  // Validate semver format
  if (!semver.valid(version)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  return prisma.modelVersion.create({
    data: {
      modelId,
      version,
      versionNumber,
      description: input.description,
      changelog: input.changelog,
      stage: 'DRAFT',
      parentVersionId: input.parentVersionId,
      sourceType: input.sourceType,
      trainingJobId: input.trainingJobId,
      inputSchema: input.inputSchema,
      outputSchema: input.outputSchema,
      hyperparameters: input.hyperparameters,
      modelConfig: input.modelConfig,
      createdBy,
    },
    include: {
      model: {
        select: { name: true, displayName: true },
      },
      artifacts: {
        select: { id: true, type: true, name: true, sizeBytes: true },
      },
      _count: {
        select: { artifacts: true, metrics: true },
      },
    },
  });
}

/**
 * Get a version by ID.
 */
export async function getVersionById(modelId: string, versionId: string) {
  return prisma.modelVersion.findFirst({
    where: { id: versionId, modelId },
    include: {
      model: {
        select: { id: true, name: true, displayName: true, tenantId: true },
      },
      parentVersion: {
        select: { id: true, version: true },
      },
      artifacts: {
        orderBy: { uploadedAt: 'desc' },
      },
      metrics: {
        orderBy: { recordedAt: 'desc' },
      },
      _count: {
        select: { artifacts: true, metrics: true, deployments: true },
      },
    },
  });
}

/**
 * Get a version by semantic version string.
 */
export async function getVersionByTag(modelId: string, versionTag: string) {
  // Handle special tags
  if (versionTag === 'latest') {
    return prisma.modelVersion.findFirst({
      where: { modelId },
      orderBy: { versionNumber: 'desc' },
      include: {
        model: {
          select: { id: true, name: true, displayName: true, tenantId: true },
        },
        artifacts: true,
        _count: {
          select: { artifacts: true, metrics: true, deployments: true },
        },
      },
    });
  }

  if (versionTag === 'production') {
    return prisma.modelVersion.findFirst({
      where: { modelId, stage: 'PRODUCTION' },
      orderBy: { versionNumber: 'desc' },
      include: {
        model: {
          select: { id: true, name: true, displayName: true, tenantId: true },
        },
        artifacts: true,
        _count: {
          select: { artifacts: true, metrics: true, deployments: true },
        },
      },
    });
  }

  if (versionTag === 'staging') {
    return prisma.modelVersion.findFirst({
      where: { modelId, stage: 'STAGING' },
      orderBy: { versionNumber: 'desc' },
      include: {
        model: {
          select: { id: true, name: true, displayName: true, tenantId: true },
        },
        artifacts: true,
        _count: {
          select: { artifacts: true, metrics: true, deployments: true },
        },
      },
    });
  }

  // Find by exact version
  return prisma.modelVersion.findFirst({
    where: { modelId, version: versionTag },
    include: {
      model: {
        select: { id: true, name: true, displayName: true, tenantId: true },
      },
      artifacts: true,
      _count: {
        select: { artifacts: true, metrics: true, deployments: true },
      },
    },
  });
}

/**
 * List versions for a model.
 */
export async function listVersions(
  modelId: string,
  query: ListVersionsQuery
): Promise<PaginatedResponse<any>> {
  const {
    stage,
    page = 1,
    pageSize = 20,
  } = query;

  const where: any = { modelId };

  if (stage) {
    where.stage = stage;
  }

  const [data, totalItems] = await Promise.all([
    prisma.modelVersion.findMany({
      where,
      include: {
        _count: {
          select: { artifacts: true, metrics: true, deployments: true },
        },
      },
      orderBy: { versionNumber: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.modelVersion.count({ where }),
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
 * Update a version.
 */
export async function updateVersion(
  modelId: string,
  versionId: string,
  input: UpdateVersionInput
) {
  return prisma.modelVersion.update({
    where: { id: versionId, modelId },
    data: {
      description: input.description,
      changelog: input.changelog,
      inputSchema: input.inputSchema as Prisma.InputJsonValue,
      outputSchema: input.outputSchema as Prisma.InputJsonValue,
    },
    include: {
      _count: {
        select: { artifacts: true, metrics: true },
      },
    },
  });
}

/**
 * Transition a version to a new stage.
 */
export async function transitionStage(
  modelId: string,
  versionId: string,
  userId: string,
  input: TransitionStageInput
) {
  const version = await prisma.modelVersion.findFirst({
    where: { id: versionId, modelId },
    select: { stage: true },
  });

  if (!version) {
    throw new Error('Version not found');
  }

  const currentStage = version.stage as ModelStage;
  const targetStage = input.targetStage;

  // Validate transition
  const validTargets = VALID_TRANSITIONS[currentStage];
  if (!validTargets?.includes(targetStage)) {
    throw new Error(
      `Invalid stage transition from ${currentStage} to ${targetStage}. ` +
      `Valid transitions: ${validTargets?.join(', ') || 'none'}`
    );
  }

  // Check for required artifacts before promoting to staging/production
  if (targetStage === 'STAGING' || targetStage === 'PRODUCTION') {
    const artifactCount = await prisma.artifact.count({
      where: { versionId, type: 'MODEL_WEIGHTS' },
    });

    if (artifactCount === 0) {
      throw new Error('Cannot promote to staging/production without model weights artifact');
    }
  }

  // If transitioning to production, record approval
  const approvalData = targetStage === 'PRODUCTION'
    ? {
        approvedAt: new Date(),
        approvedBy: userId,
        approvalNotes: input.notes,
      }
    : {};

  return prisma.modelVersion.update({
    where: { id: versionId, modelId },
    data: {
      stage: targetStage,
      stageChangedAt: new Date(),
      stageChangedBy: userId,
      ...approvalData,
    },
    include: {
      model: {
        select: { name: true, displayName: true },
      },
      _count: {
        select: { artifacts: true, metrics: true },
      },
    },
  });
}

/**
 * Delete a version.
 */
export async function deleteVersion(modelId: string, versionId: string) {
  // Check for active deployments
  const activeDeployments = await prisma.deployment.count({
    where: {
      versionId,
      status: { in: ['PENDING', 'DEPLOYING', 'RUNNING', 'SCALING'] },
    },
  });

  if (activeDeployments > 0) {
    throw new Error('Cannot delete version with active deployments');
  }

  // Check stage - cannot delete production versions
  const version = await prisma.modelVersion.findFirst({
    where: { id: versionId, modelId },
    select: { stage: true },
  });

  if (version?.stage === 'PRODUCTION') {
    throw new Error('Cannot delete production version. Deprecate it first.');
  }

  return prisma.modelVersion.delete({
    where: { id: versionId, modelId },
  });
}

/**
 * Compare two versions.
 */
export async function compareVersions(
  modelId: string,
  versionId1: string,
  versionId2: string
) {
  const [v1, v2] = await Promise.all([
    prisma.modelVersion.findFirst({
      where: { id: versionId1, modelId },
      include: {
        metrics: true,
        artifacts: { select: { type: true, name: true, sizeBytes: true } },
      },
    }),
    prisma.modelVersion.findFirst({
      where: { id: versionId2, modelId },
      include: {
        metrics: true,
        artifacts: { select: { type: true, name: true, sizeBytes: true } },
      },
    }),
  ]);

  if (!v1 || !v2) {
    throw new Error('One or both versions not found');
  }

  // Compare metrics
  const metricsComparison: Record<string, { v1: number | null; v2: number | null; diff: number | null }> = {};

  const allMetricNames = new Set([
    ...v1.metrics.map((m) => m.name),
    ...v2.metrics.map((m) => m.name),
  ]);

  for (const name of allMetricNames) {
    const m1 = v1.metrics.find((m) => m.name === name);
    const m2 = v2.metrics.find((m) => m.name === name);

    metricsComparison[name] = {
      v1: m1?.value ?? null,
      v2: m2?.value ?? null,
      diff: m1 && m2 ? m2.value - m1.value : null,
    };
  }

  return {
    version1: {
      id: v1.id,
      version: v1.version,
      stage: v1.stage,
      createdAt: v1.createdAt,
      artifactCount: v1.artifacts.length,
      totalArtifactSize: v1.artifacts.reduce((sum, a) => sum + Number(a.sizeBytes), 0),
    },
    version2: {
      id: v2.id,
      version: v2.version,
      stage: v2.stage,
      createdAt: v2.createdAt,
      artifactCount: v2.artifacts.length,
      totalArtifactSize: v2.artifacts.reduce((sum, a) => sum + Number(a.sizeBytes), 0),
    },
    metricsComparison,
    configDiff: {
      hyperparameters: {
        v1: v1.hyperparameters,
        v2: v2.hyperparameters,
      },
      modelConfig: {
        v1: v1.modelConfig,
        v2: v2.modelConfig,
      },
    },
  };
}
