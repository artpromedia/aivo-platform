/**
 * AIVO Model Registry Service - Deployment Service
 *
 * Business logic for model deployment tracking.
 */

import { prisma } from '../prisma.js';
import type {
  CreateDeploymentInput,
  UpdateDeploymentInput,
  ListDeploymentsQuery,
  DeploymentStatus,
  PaginatedResponse,
} from '../types/index.js';

/**
 * Create a deployment.
 */
export async function createDeployment(
  tenantId: string,
  modelId: string,
  deployedBy: string,
  input: CreateDeploymentInput
) {
  // Verify version exists and belongs to model
  const version = await prisma.modelVersion.findFirst({
    where: { id: input.versionId, modelId },
    select: { stage: true },
  });

  if (!version) {
    throw new Error('Version not found');
  }

  // Only allow deployment of staging/production versions
  if (input.environment === 'PRODUCTION' && version.stage !== 'PRODUCTION') {
    throw new Error('Only production-approved versions can be deployed to production');
  }

  if (input.environment === 'STAGING' && !['STAGING', 'PRODUCTION'].includes(version.stage)) {
    throw new Error('Only staging or production versions can be deployed to staging');
  }

  return prisma.deployment.create({
    data: {
      tenantId,
      modelId,
      versionId: input.versionId,
      name: input.name,
      environment: input.environment,
      status: 'PENDING',
      instanceType: input.instanceType,
      replicas: input.replicas ?? 1,
      minReplicas: input.minReplicas ?? 1,
      maxReplicas: input.maxReplicas ?? 10,
      config: input.config,
      deployedBy,
    },
    include: {
      model: {
        select: { name: true, displayName: true },
      },
      version: {
        select: { version: true, stage: true },
      },
    },
  });
}

/**
 * Get deployment by ID.
 */
export async function getDeploymentById(tenantId: string, deploymentId: string) {
  return prisma.deployment.findFirst({
    where: { id: deploymentId, tenantId },
    include: {
      model: {
        select: { id: true, name: true, displayName: true },
      },
      version: {
        select: { id: true, version: true, stage: true },
      },
      usageRecords: {
        orderBy: { periodStart: 'desc' },
        take: 24, // Last 24 periods
      },
    },
  });
}

/**
 * List deployments.
 */
export async function listDeployments(
  tenantId: string,
  query: ListDeploymentsQuery
): Promise<PaginatedResponse<any>> {
  const {
    modelId,
    versionId,
    environment,
    status,
    page = 1,
    pageSize = 20,
  } = query;

  const where: any = { tenantId };

  if (modelId) {
    where.modelId = modelId;
  }

  if (versionId) {
    where.versionId = versionId;
  }

  if (environment) {
    where.environment = environment;
  }

  if (status) {
    where.status = status;
  }

  const [data, totalItems] = await Promise.all([
    prisma.deployment.findMany({
      where,
      include: {
        model: {
          select: { name: true, displayName: true },
        },
        version: {
          select: { version: true, stage: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.deployment.count({ where }),
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
 * Update deployment configuration.
 */
export async function updateDeployment(
  tenantId: string,
  deploymentId: string,
  input: UpdateDeploymentInput
) {
  return prisma.deployment.update({
    where: { id: deploymentId, tenantId },
    data: {
      replicas: input.replicas,
      minReplicas: input.minReplicas,
      maxReplicas: input.maxReplicas,
      config: input.config,
    },
    include: {
      model: {
        select: { name: true, displayName: true },
      },
      version: {
        select: { version: true, stage: true },
      },
    },
  });
}

/**
 * Update deployment status.
 */
export async function updateDeploymentStatus(
  deploymentId: string,
  status: DeploymentStatus,
  details?: {
    endpointUrl?: string;
    resourceId?: string;
    region?: string;
    healthStatus?: string;
    errorMessage?: string;
  }
) {
  const updateData: any = { status };

  if (status === 'RUNNING') {
    updateData.deployedAt = new Date();
    updateData.lastHealthCheck = new Date();
  }

  if (status === 'STOPPED' || status === 'FAILED') {
    updateData.stoppedAt = new Date();
  }

  if (details) {
    if (details.endpointUrl) updateData.endpointUrl = details.endpointUrl;
    if (details.resourceId) updateData.resourceId = details.resourceId;
    if (details.region) updateData.region = details.region;
    if (details.healthStatus) updateData.healthStatus = details.healthStatus;
  }

  return prisma.deployment.update({
    where: { id: deploymentId },
    data: updateData,
  });
}

/**
 * Stop a deployment.
 */
export async function stopDeployment(
  tenantId: string,
  deploymentId: string,
  stoppedBy: string
) {
  return prisma.deployment.update({
    where: { id: deploymentId, tenantId },
    data: {
      status: 'STOPPED',
      stoppedAt: new Date(),
      stoppedBy,
    },
    include: {
      model: {
        select: { name: true, displayName: true },
      },
      version: {
        select: { version: true, stage: true },
      },
    },
  });
}

/**
 * Delete a deployment.
 */
export async function deleteDeployment(tenantId: string, deploymentId: string) {
  const deployment = await prisma.deployment.findFirst({
    where: { id: deploymentId, tenantId },
    select: { status: true },
  });

  if (!deployment) {
    throw new Error('Deployment not found');
  }

  if (deployment.status === 'RUNNING' || deployment.status === 'DEPLOYING') {
    throw new Error('Cannot delete active deployment. Stop it first.');
  }

  return prisma.deployment.delete({
    where: { id: deploymentId, tenantId },
  });
}

/**
 * Record usage metrics for a deployment.
 */
export async function recordUsage(
  deploymentId: string,
  periodStart: Date,
  periodEnd: Date,
  metrics: {
    requestCount: number;
    successCount: number;
    errorCount: number;
    latencyP50?: number;
    latencyP90?: number;
    latencyP99?: number;
    latencyAvg?: number;
    tokensIn?: number;
    tokensOut?: number;
  }
) {
  return prisma.deploymentUsage.upsert({
    where: {
      deploymentId_periodStart: {
        deploymentId,
        periodStart,
      },
    },
    create: {
      deploymentId,
      periodStart,
      periodEnd,
      requestCount: metrics.requestCount,
      successCount: metrics.successCount,
      errorCount: metrics.errorCount,
      latencyP50: metrics.latencyP50,
      latencyP90: metrics.latencyP90,
      latencyP99: metrics.latencyP99,
      latencyAvg: metrics.latencyAvg,
      tokensIn: metrics.tokensIn ? BigInt(metrics.tokensIn) : null,
      tokensOut: metrics.tokensOut ? BigInt(metrics.tokensOut) : null,
    },
    update: {
      requestCount: { increment: metrics.requestCount },
      successCount: { increment: metrics.successCount },
      errorCount: { increment: metrics.errorCount },
      latencyP50: metrics.latencyP50,
      latencyP90: metrics.latencyP90,
      latencyP99: metrics.latencyP99,
      latencyAvg: metrics.latencyAvg,
    },
  });
}

/**
 * Get deployment statistics.
 */
export async function getDeploymentStats(tenantId: string) {
  const [
    total,
    byStatus,
    byEnvironment,
    activeCount,
  ] = await Promise.all([
    prisma.deployment.count({ where: { tenantId } }),
    prisma.deployment.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    }),
    prisma.deployment.groupBy({
      by: ['environment'],
      where: { tenantId },
      _count: { environment: true },
    }),
    prisma.deployment.count({
      where: {
        tenantId,
        status: { in: ['RUNNING', 'DEPLOYING', 'SCALING'] },
      },
    }),
  ]);

  return {
    total,
    active: activeCount,
    byStatus: Object.fromEntries(
      byStatus.map((s) => [s.status, s._count.status])
    ),
    byEnvironment: Object.fromEntries(
      byEnvironment.map((e) => [e.environment, e._count.environment])
    ),
  };
}
