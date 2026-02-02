/**
 * Deployment Service Unit Tests
 *
 * Tests for ML model deployment management with Prisma mocking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma client
const mockPrisma = {
  deployment: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  modelVersion: {
    findFirst: vi.fn(),
  },
  deploymentUsage: {
    create: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import after mocking
import {
  createDeployment,
  getDeploymentById,
  listDeployments,
  updateDeployment,
  updateDeploymentStatus,
  deleteDeployment,
  recordDeploymentUsage,
} from '../src/services/deploymentService.js';

describe('DeploymentService', () => {
  const tenantId = 'tenant-123';
  const modelId = 'model-456';
  const deployedBy = 'user-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CREATE DEPLOYMENT
  // ════════════════════════════════════════════════════════════════════════════

  describe('createDeployment', () => {
    it('should create deployment for production version to production env', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        stage: 'PRODUCTION',
      });

      const createdDeployment = {
        id: 'deployment-1',
        tenantId,
        modelId,
        versionId: 'version-1',
        name: 'reading-model-prod',
        environment: 'PRODUCTION',
        status: 'PENDING',
        instanceType: 'gpu-medium',
        replicas: 3,
        model: { name: 'reading-model', displayName: 'Reading Model' },
        version: { version: '1.0.0', stage: 'PRODUCTION' },
      };

      mockPrisma.deployment.create.mockResolvedValue(createdDeployment);

      const result = await createDeployment(tenantId, modelId, deployedBy, {
        versionId: 'version-1',
        name: 'reading-model-prod',
        environment: 'PRODUCTION',
        instanceType: 'gpu-medium',
        replicas: 3,
      });

      expect(result.id).toBe('deployment-1');
      expect(result.environment).toBe('PRODUCTION');
      expect(result.status).toBe('PENDING');
    });

    it('should reject deploying non-production version to production', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        stage: 'STAGING', // Not production approved
      });

      await expect(
        createDeployment(tenantId, modelId, deployedBy, {
          versionId: 'version-1',
          name: 'bad-deploy',
          environment: 'PRODUCTION',
          instanceType: 'gpu-small',
        })
      ).rejects.toThrow('Only production-approved versions can be deployed to production');
    });

    it('should allow staging version to staging env', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        stage: 'STAGING',
      });

      mockPrisma.deployment.create.mockResolvedValue({
        id: 'deployment-1',
        environment: 'STAGING',
        model: {},
        version: {},
      });

      const result = await createDeployment(tenantId, modelId, deployedBy, {
        versionId: 'version-1',
        name: 'staging-deploy',
        environment: 'STAGING',
        instanceType: 'cpu-medium',
      });

      expect(result.environment).toBe('STAGING');
    });

    it('should reject draft version to staging env', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        stage: 'DRAFT',
      });

      await expect(
        createDeployment(tenantId, modelId, deployedBy, {
          versionId: 'version-1',
          name: 'bad-deploy',
          environment: 'STAGING',
          instanceType: 'cpu-small',
        })
      ).rejects.toThrow('Only staging or production versions can be deployed to staging');
    });

    it('should throw error for nonexistent version', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue(null);

      await expect(
        createDeployment(tenantId, modelId, deployedBy, {
          versionId: 'nonexistent-version',
          name: 'deploy',
          environment: 'STAGING',
          instanceType: 'cpu-small',
        })
      ).rejects.toThrow('Version not found');
    });

    it('should set default replica counts', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        stage: 'PRODUCTION',
      });

      mockPrisma.deployment.create.mockResolvedValue({
        id: 'deployment-1',
        replicas: 1,
        minReplicas: 1,
        maxReplicas: 10,
        model: {},
        version: {},
      });

      await createDeployment(tenantId, modelId, deployedBy, {
        versionId: 'version-1',
        name: 'default-replicas',
        environment: 'PRODUCTION',
        instanceType: 'gpu-small',
      });

      expect(mockPrisma.deployment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          replicas: 1,
          minReplicas: 1,
          maxReplicas: 10,
        }),
        include: expect.any(Object),
      });
    });

    it('should use custom replica counts when provided', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        stage: 'PRODUCTION',
      });

      mockPrisma.deployment.create.mockResolvedValue({
        id: 'deployment-1',
        replicas: 5,
        minReplicas: 2,
        maxReplicas: 20,
        model: {},
        version: {},
      });

      await createDeployment(tenantId, modelId, deployedBy, {
        versionId: 'version-1',
        name: 'scaled-deploy',
        environment: 'PRODUCTION',
        instanceType: 'gpu-large',
        replicas: 5,
        minReplicas: 2,
        maxReplicas: 20,
      });

      expect(mockPrisma.deployment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          replicas: 5,
          minReplicas: 2,
          maxReplicas: 20,
        }),
        include: expect.any(Object),
      });
    });

    it('should include deployment config', async () => {
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        stage: 'PRODUCTION',
      });

      const config = {
        gpu: true,
        memory: '16Gi',
        timeout: 60,
        batchSize: 32,
      };

      mockPrisma.deployment.create.mockResolvedValue({
        id: 'deployment-1',
        config,
        model: {},
        version: {},
      });

      await createDeployment(tenantId, modelId, deployedBy, {
        versionId: 'version-1',
        name: 'config-deploy',
        environment: 'PRODUCTION',
        instanceType: 'gpu-xlarge',
        config,
      });

      expect(mockPrisma.deployment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          config,
        }),
        include: expect.any(Object),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET DEPLOYMENT BY ID
  // ════════════════════════════════════════════════════════════════════════════

  describe('getDeploymentById', () => {
    it('should return null for nonexistent deployment', async () => {
      mockPrisma.deployment.findFirst.mockResolvedValue(null);

      const result = await getDeploymentById(tenantId, 'nonexistent-id');

      expect(result).toBeNull();
    });

    it('should return deployment with usage records', async () => {
      const mockDeployment = {
        id: 'deployment-1',
        tenantId,
        modelId,
        versionId: 'version-1',
        name: 'prod-deployment',
        environment: 'PRODUCTION',
        status: 'RUNNING',
        endpointUrl: 'https://api.aivo.com/models/reading/v1',
        model: { id: modelId, name: 'reading-model', displayName: 'Reading Model' },
        version: { id: 'version-1', version: '1.0.0', stage: 'PRODUCTION' },
        usageRecords: [
          { periodStart: new Date(), requestCount: 1000, inferenceMs: 50000 },
          { periodStart: new Date(), requestCount: 950, inferenceMs: 48000 },
        ],
      };

      mockPrisma.deployment.findFirst.mockResolvedValue(mockDeployment);

      const result = await getDeploymentById(tenantId, 'deployment-1');

      expect(result?.id).toBe('deployment-1');
      expect(result?.usageRecords).toHaveLength(2);
    });

    it('should enforce tenant isolation', async () => {
      mockPrisma.deployment.findFirst.mockResolvedValue(null);

      await getDeploymentById('tenant-A', 'deployment-1');

      expect(mockPrisma.deployment.findFirst).toHaveBeenCalledWith({
        where: { id: 'deployment-1', tenantId: 'tenant-A' },
        include: expect.any(Object),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // LIST DEPLOYMENTS
  // ════════════════════════════════════════════════════════════════════════════

  describe('listDeployments', () => {
    it('should return paginated deployments', async () => {
      const mockDeployments = [
        { id: 'd1', name: 'deploy-1', status: 'RUNNING', model: {}, version: {} },
        { id: 'd2', name: 'deploy-2', status: 'PENDING', model: {}, version: {} },
      ];

      mockPrisma.deployment.findMany.mockResolvedValue(mockDeployments);
      mockPrisma.deployment.count.mockResolvedValue(2);

      const result = await listDeployments(tenantId, {});

      expect(result.data).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(2);
    });

    it('should filter by modelId', async () => {
      mockPrisma.deployment.findMany.mockResolvedValue([]);
      mockPrisma.deployment.count.mockResolvedValue(0);

      await listDeployments(tenantId, { modelId: 'model-1' });

      expect(mockPrisma.deployment.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId,
          modelId: 'model-1',
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number),
      });
    });

    it('should filter by versionId', async () => {
      mockPrisma.deployment.findMany.mockResolvedValue([]);
      mockPrisma.deployment.count.mockResolvedValue(0);

      await listDeployments(tenantId, { versionId: 'version-1' });

      expect(mockPrisma.deployment.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          versionId: 'version-1',
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number),
      });
    });

    it('should filter by environment', async () => {
      mockPrisma.deployment.findMany.mockResolvedValue([]);
      mockPrisma.deployment.count.mockResolvedValue(0);

      await listDeployments(tenantId, { environment: 'PRODUCTION' });

      expect(mockPrisma.deployment.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          environment: 'PRODUCTION',
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number),
      });
    });

    it('should filter by status', async () => {
      mockPrisma.deployment.findMany.mockResolvedValue([]);
      mockPrisma.deployment.count.mockResolvedValue(0);

      await listDeployments(tenantId, { status: 'RUNNING' });

      expect(mockPrisma.deployment.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'RUNNING',
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number),
      });
    });

    it('should handle pagination', async () => {
      mockPrisma.deployment.findMany.mockResolvedValue([]);
      mockPrisma.deployment.count.mockResolvedValue(100);

      const result = await listDeployments(tenantId, { page: 3, pageSize: 10 });

      expect(mockPrisma.deployment.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 20,
        take: 10,
      });
      expect(result.pagination.totalPages).toBe(10);
    });

    it('should combine multiple filters', async () => {
      mockPrisma.deployment.findMany.mockResolvedValue([]);
      mockPrisma.deployment.count.mockResolvedValue(0);

      await listDeployments(tenantId, {
        modelId: 'model-1',
        environment: 'PRODUCTION',
        status: 'RUNNING',
      });

      expect(mockPrisma.deployment.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          modelId: 'model-1',
          environment: 'PRODUCTION',
          status: 'RUNNING',
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // UPDATE DEPLOYMENT
  // ════════════════════════════════════════════════════════════════════════════

  describe('updateDeployment', () => {
    it('should update replica count', async () => {
      mockPrisma.deployment.update.mockResolvedValue({
        id: 'deployment-1',
        replicas: 5,
        model: {},
        version: {},
      });

      const result = await updateDeployment(tenantId, 'deployment-1', {
        replicas: 5,
      });

      expect(result.replicas).toBe(5);
      expect(mockPrisma.deployment.update).toHaveBeenCalledWith({
        where: { id: 'deployment-1', tenantId },
        data: {
          replicas: 5,
          minReplicas: undefined,
          maxReplicas: undefined,
          config: undefined,
        },
        include: expect.any(Object),
      });
    });

    it('should update autoscaling bounds', async () => {
      mockPrisma.deployment.update.mockResolvedValue({
        id: 'deployment-1',
        minReplicas: 2,
        maxReplicas: 15,
        model: {},
        version: {},
      });

      await updateDeployment(tenantId, 'deployment-1', {
        minReplicas: 2,
        maxReplicas: 15,
      });

      expect(mockPrisma.deployment.update).toHaveBeenCalledWith({
        where: { id: 'deployment-1', tenantId },
        data: expect.objectContaining({
          minReplicas: 2,
          maxReplicas: 15,
        }),
        include: expect.any(Object),
      });
    });

    it('should update config', async () => {
      const newConfig = { timeout: 120, batchSize: 64 };

      mockPrisma.deployment.update.mockResolvedValue({
        id: 'deployment-1',
        config: newConfig,
        model: {},
        version: {},
      });

      await updateDeployment(tenantId, 'deployment-1', {
        config: newConfig,
      });

      expect(mockPrisma.deployment.update).toHaveBeenCalledWith({
        where: { id: 'deployment-1', tenantId },
        data: expect.objectContaining({
          config: newConfig,
        }),
        include: expect.any(Object),
      });
    });

    it('should enforce tenant isolation', async () => {
      mockPrisma.deployment.update.mockResolvedValue({
        id: 'deployment-1',
        model: {},
        version: {},
      });

      await updateDeployment('tenant-B', 'deployment-1', { replicas: 3 });

      expect(mockPrisma.deployment.update).toHaveBeenCalledWith({
        where: { id: 'deployment-1', tenantId: 'tenant-B' },
        data: expect.any(Object),
        include: expect.any(Object),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // UPDATE DEPLOYMENT STATUS
  // ════════════════════════════════════════════════════════════════════════════

  describe('updateDeploymentStatus', () => {
    it('should update status to RUNNING with endpoint details', async () => {
      mockPrisma.deployment.update.mockResolvedValue({
        id: 'deployment-1',
        status: 'RUNNING',
        endpointUrl: 'https://api.aivo.com/models/v1',
        deployedAt: new Date(),
      });

      await updateDeploymentStatus('deployment-1', 'RUNNING', {
        endpointUrl: 'https://api.aivo.com/models/v1',
        resourceId: 'k8s-deploy-123',
        region: 'us-central1',
      });

      expect(mockPrisma.deployment.update).toHaveBeenCalledWith({
        where: { id: 'deployment-1' },
        data: expect.objectContaining({
          status: 'RUNNING',
          deployedAt: expect.any(Date),
          lastHealthCheck: expect.any(Date),
        }),
      });
    });

    it('should update status to FAILED with error message', async () => {
      mockPrisma.deployment.update.mockResolvedValue({
        id: 'deployment-1',
        status: 'FAILED',
      });

      await updateDeploymentStatus('deployment-1', 'FAILED', {
        errorMessage: 'Insufficient GPU resources',
      });

      expect(mockPrisma.deployment.update).toHaveBeenCalledWith({
        where: { id: 'deployment-1' },
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      });
    });

    it('should update health status', async () => {
      mockPrisma.deployment.update.mockResolvedValue({
        id: 'deployment-1',
        status: 'RUNNING',
      });

      await updateDeploymentStatus('deployment-1', 'RUNNING', {
        healthStatus: 'HEALTHY',
      });

      expect(mockPrisma.deployment.update).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // DELETE DEPLOYMENT
  // ════════════════════════════════════════════════════════════════════════════

  describe('deleteDeployment', () => {
    it('should delete deployment', async () => {
      mockPrisma.deployment.delete.mockResolvedValue({ id: 'deployment-1' });

      await deleteDeployment(tenantId, 'deployment-1');

      expect(mockPrisma.deployment.delete).toHaveBeenCalledWith({
        where: { id: 'deployment-1', tenantId },
      });
    });

    it('should enforce tenant isolation on delete', async () => {
      mockPrisma.deployment.delete.mockResolvedValue({ id: 'deployment-1' });

      await deleteDeployment('tenant-C', 'deployment-1');

      expect(mockPrisma.deployment.delete).toHaveBeenCalledWith({
        where: { id: 'deployment-1', tenantId: 'tenant-C' },
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // RECORD DEPLOYMENT USAGE
  // ════════════════════════════════════════════════════════════════════════════

  describe('recordDeploymentUsage', () => {
    it('should record usage metrics', async () => {
      mockPrisma.deploymentUsage.create.mockResolvedValue({
        id: 'usage-1',
        deploymentId: 'deployment-1',
        periodStart: new Date(),
        periodEnd: new Date(),
        requestCount: 1000,
        errorCount: 5,
        inferenceMs: 50000,
        tokenCount: 100000,
      });

      await recordDeploymentUsage('deployment-1', {
        periodStart: new Date(),
        periodEnd: new Date(),
        requestCount: 1000,
        errorCount: 5,
        inferenceMs: 50000,
        tokenCount: 100000,
      });

      expect(mockPrisma.deploymentUsage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deploymentId: 'deployment-1',
          requestCount: 1000,
          errorCount: 5,
          inferenceMs: 50000,
          tokenCount: 100000,
        }),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT LIFECYCLE
  // ════════════════════════════════════════════════════════════════════════════

  describe('deployment lifecycle', () => {
    it('should transition through deployment states', async () => {
      // Create deployment (PENDING)
      mockPrisma.modelVersion.findFirst.mockResolvedValue({
        id: 'v1',
        stage: 'PRODUCTION',
      });
      mockPrisma.deployment.create.mockResolvedValue({
        id: 'd1',
        status: 'PENDING',
        model: {},
        version: {},
      });

      const created = await createDeployment(tenantId, modelId, deployedBy, {
        versionId: 'v1',
        name: 'lifecycle-test',
        environment: 'PRODUCTION',
        instanceType: 'gpu-medium',
      });

      expect(created.status).toBe('PENDING');

      // Simulate transition to DEPLOYING
      mockPrisma.deployment.update.mockResolvedValue({
        id: 'd1',
        status: 'DEPLOYING',
      });

      await updateDeploymentStatus('d1', 'DEPLOYING');

      // Simulate transition to RUNNING
      mockPrisma.deployment.update.mockResolvedValue({
        id: 'd1',
        status: 'RUNNING',
        endpointUrl: 'https://api.aivo.com/inference/d1',
        deployedAt: new Date(),
      });

      await updateDeploymentStatus('d1', 'RUNNING', {
        endpointUrl: 'https://api.aivo.com/inference/d1',
      });

      // Verify final state
      expect(mockPrisma.deployment.update).toHaveBeenLastCalledWith({
        where: { id: 'd1' },
        data: expect.objectContaining({
          status: 'RUNNING',
          deployedAt: expect.any(Date),
        }),
      });
    });
  });
});
