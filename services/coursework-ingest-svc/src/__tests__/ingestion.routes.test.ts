import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createApp } from '../app.js';

// Mock the Prisma client
vi.mock('../prisma.js', () => ({
  prisma: {
    ingestJob: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    ingestItem: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    ingestLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    ingestQuota: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    contentTemplate: {
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    importMapping: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    webhookEndpoint: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    contentChunk: {
      create: vi.fn(),
    },
  },
}));

// Mock the auth middleware to allow requests through
vi.mock('../middleware/auth.js', () => ({
  authenticate: vi.fn(async (request: any) => {
    request.user = { sub: 'test-user-id', tenantId: 'test-tenant-id', roles: ['admin'] };
    request.tenantId = 'test-tenant-id';
  }),
}));

// Mock config
vi.mock('../config.js', () => ({
  config: {
    port: 4078,
    host: '0.0.0.0',
    jwtPublicKey: 'test-key',
    internalApiKey: 'test-api-key',
    natsUrl: 'nats://localhost:4222',
    storageUrl: '',
    storageBucket: 'test-bucket',
    maxFileSize: 104857600,
    workerConcurrency: 5,
    contentServiceUrl: '',
  },
}));

describe('Ingestion Routes', () => {
  let app: FastifyInstance;

  const mockJob = {
    id: 'job-123',
    tenantId: 'test-tenant-id',
    name: 'Test Ingestion Job',
    description: 'Test description',
    status: 'PENDING',
    sourceType: 'UPLOAD',
    sourceUrl: null,
    sourceConfig: null,
    targetCourseId: 'course-123',
    targetModuleId: null,
    options: null,
    progress: 0,
    totalItems: 0,
    processedItems: 0,
    failedItems: 0,
    error: null,
    startedAt: null,
    completedAt: null,
    createdBy: 'test-user-id',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockItem = {
    id: 'item-123',
    tenantId: 'test-tenant-id',
    jobId: 'job-123',
    originalName: 'document.pdf',
    contentType: 'DOCUMENT',
    mimeType: 'application/pdf',
    fileSize: 1024000,
    status: 'PENDING',
    sourceUrl: null,
    storagePath: '/uploads/document.pdf',
    extractedText: null,
    metadata: null,
    structure: null,
    topics: [],
    keywords: [],
    difficulty: null,
    estimatedTime: null,
    contentId: null,
    error: null,
    processingTime: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockQuota = {
    id: 'quota-123',
    tenantId: 'test-tenant-id',
    dailyLimit: 100,
    monthlyLimit: 1000,
    maxFileSize: 104857600,
    allowedTypes: [],
    usedToday: 5,
    usedThisMonth: 50,
    lastResetDaily: new Date(),
    lastResetMonthly: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    app = createApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('GET /health should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({
        status: 'healthy',
        service: 'coursework-ingest-svc',
      });
    });
  });

  describe('Job Management', () => {
    describe('POST /jobs', () => {
      it('should create a new ingestion job', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestQuota.findUnique).mockResolvedValue(mockQuota);
        vi.mocked(prisma.ingestQuota.update).mockResolvedValue(mockQuota);
        vi.mocked(prisma.ingestJob.create).mockResolvedValue(mockJob);

        const response = await app.inject({
          method: 'POST',
          url: '/jobs',
          headers: {
            authorization: 'Bearer test-token',
          },
          payload: {
            name: 'Test Ingestion Job',
            description: 'Test description',
            sourceType: 'UPLOAD',
            targetCourseId: 'course-123',
          },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.id).toBe('job-123');
        expect(body.name).toBe('Test Ingestion Job');
        expect(body.status).toBe('PENDING');
      });

      it('should fail when daily quota is exceeded', async () => {
        const { prisma } = await import('../prisma.js');
        const exceededQuota = { ...mockQuota, usedToday: 100, dailyLimit: 100 };
        vi.mocked(prisma.ingestQuota.findUnique).mockResolvedValue(exceededQuota);

        const response = await app.inject({
          method: 'POST',
          url: '/jobs',
          headers: {
            authorization: 'Bearer test-token',
          },
          payload: {
            name: 'Test Ingestion Job',
            sourceType: 'UPLOAD',
          },
        });

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.payload)).toHaveProperty('error');
      });

      it('should fail when monthly quota is exceeded', async () => {
        const { prisma } = await import('../prisma.js');
        const exceededQuota = { ...mockQuota, usedThisMonth: 1000, monthlyLimit: 1000 };
        vi.mocked(prisma.ingestQuota.findUnique).mockResolvedValue(exceededQuota);

        const response = await app.inject({
          method: 'POST',
          url: '/jobs',
          headers: {
            authorization: 'Bearer test-token',
          },
          payload: {
            name: 'Test Ingestion Job',
            sourceType: 'UPLOAD',
          },
        });

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.payload)).toHaveProperty('error');
      });

      it('should create quota if not exists', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestQuota.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.ingestQuota.create).mockResolvedValue(mockQuota);
        vi.mocked(prisma.ingestQuota.update).mockResolvedValue(mockQuota);
        vi.mocked(prisma.ingestJob.create).mockResolvedValue(mockJob);

        const response = await app.inject({
          method: 'POST',
          url: '/jobs',
          headers: {
            authorization: 'Bearer test-token',
          },
          payload: {
            name: 'Test Ingestion Job',
            sourceType: 'UPLOAD',
          },
        });

        expect(response.statusCode).toBe(201);
        expect(prisma.ingestQuota.create).toHaveBeenCalled();
      });
    });

    describe('GET /jobs', () => {
      it('should list all jobs for a tenant', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestJob.findMany).mockResolvedValue([
          { ...mockJob, _count: { items: 5 } },
        ] as any);

        const response = await app.inject({
          method: 'GET',
          url: '/jobs',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body)).toBe(true);
        expect(body[0].id).toBe('job-123');
      });

      it('should filter jobs by status', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestJob.findMany).mockResolvedValue([]);

        await app.inject({
          method: 'GET',
          url: '/jobs?status=PROCESSING',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(prisma.ingestJob.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: 'PROCESSING',
            }),
          })
        );
      });

      it('should filter jobs by createdBy', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestJob.findMany).mockResolvedValue([]);

        await app.inject({
          method: 'GET',
          url: '/jobs?createdBy=user-456',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(prisma.ingestJob.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              createdBy: 'user-456',
            }),
          })
        );
      });

      it('should respect limit parameter', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestJob.findMany).mockResolvedValue([]);

        await app.inject({
          method: 'GET',
          url: '/jobs?limit=25',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(prisma.ingestJob.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 25,
          })
        );
      });
    });

    describe('GET /jobs/:jobId', () => {
      it('should return a specific job with items and logs', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
          ...mockJob,
          items: [mockItem],
          logs: [],
        } as any);

        const response = await app.inject({
          method: 'GET',
          url: '/jobs/job-123',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.id).toBe('job-123');
        expect(body.items).toHaveLength(1);
      });

      it('should return 404 for non-existent job', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue(null);

        const response = await app.inject({
          method: 'GET',
          url: '/jobs/non-existent',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.payload)).toHaveProperty('message', 'Job not found');
      });
    });

    describe('POST /jobs/:jobId/cancel', () => {
      it('should cancel a job', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestJob.update).mockResolvedValue({
          ...mockJob,
          status: 'CANCELLED',
        });

        const response = await app.inject({
          method: 'POST',
          url: '/jobs/job-123/cancel',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.status).toBe('CANCELLED');
      });
    });

    describe('POST /jobs/:jobId/start', () => {
      it('should start processing a job', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestJob.update).mockResolvedValue({
          ...mockJob,
          status: 'PROCESSING',
        });
        vi.mocked(prisma.ingestItem.findMany).mockResolvedValue([]);
        vi.mocked(prisma.ingestItem.count).mockResolvedValue(0);

        const response = await app.inject({
          method: 'POST',
          url: '/jobs/job-123/start',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(202);
        expect(JSON.parse(response.payload)).toEqual({ message: 'Processing started' });
      });
    });

    describe('GET /jobs/:jobId/logs', () => {
      it('should return job logs', async () => {
        const { prisma } = await import('../prisma.js');
        const mockLogs = [
          {
            id: 'log-1',
            jobId: 'job-123',
            level: 'info',
            message: 'Processing started',
            timestamp: new Date(),
          },
        ];
        vi.mocked(prisma.ingestLog.findMany).mockResolvedValue(mockLogs as any);

        const response = await app.inject({
          method: 'GET',
          url: '/jobs/job-123/logs',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body)).toBe(true);
        expect(body[0].message).toBe('Processing started');
      });

      it('should respect limit parameter for logs', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestLog.findMany).mockResolvedValue([]);

        await app.inject({
          method: 'GET',
          url: '/jobs/job-123/logs?limit=50',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(prisma.ingestLog.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 50,
          })
        );
      });
    });
  });

  describe('Item Management', () => {
    describe('POST /jobs/:jobId/items', () => {
      it('should add an item to a job', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestJob.update).mockResolvedValue(mockJob);
        vi.mocked(prisma.ingestItem.create).mockResolvedValue(mockItem);

        const response = await app.inject({
          method: 'POST',
          url: '/jobs/job-123/items',
          headers: {
            authorization: 'Bearer test-token',
          },
          payload: {
            originalName: 'document.pdf',
            contentType: 'DOCUMENT',
            mimeType: 'application/pdf',
            fileSize: 1024000,
            storagePath: '/uploads/document.pdf',
          },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.id).toBe('item-123');
        expect(body.originalName).toBe('document.pdf');
      });

      it('should increment totalItems on job', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestJob.update).mockResolvedValue(mockJob);
        vi.mocked(prisma.ingestItem.create).mockResolvedValue(mockItem);

        await app.inject({
          method: 'POST',
          url: '/jobs/job-123/items',
          headers: {
            authorization: 'Bearer test-token',
          },
          payload: {
            originalName: 'document.pdf',
            contentType: 'DOCUMENT',
          },
        });

        expect(prisma.ingestJob.update).toHaveBeenCalledWith({
          where: { id: 'job-123' },
          data: { totalItems: { increment: 1 } },
        });
      });
    });

    describe('GET /items/:itemId', () => {
      it('should return a specific item with chunks', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestItem.findFirst).mockResolvedValue({
          ...mockItem,
          chunks: [],
        } as any);

        const response = await app.inject({
          method: 'GET',
          url: '/items/item-123',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.id).toBe('item-123');
        expect(body.chunks).toEqual([]);
      });

      it('should return 404 for non-existent item', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestItem.findFirst).mockResolvedValue(null);

        const response = await app.inject({
          method: 'GET',
          url: '/items/non-existent',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.payload)).toHaveProperty('message', 'Item not found');
      });
    });
  });

  describe('Templates', () => {
    const mockTemplate = {
      id: 'template-123',
      tenantId: 'test-tenant-id',
      name: 'Document Template',
      description: 'Template for documents',
      contentType: 'DOCUMENT',
      mappingRules: { title: 'heading1', body: 'paragraphs' },
      transformers: null,
      validators: null,
      isDefault: true,
      createdBy: 'test-user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('POST /templates', () => {
      it('should create a new template', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.contentTemplate.updateMany).mockResolvedValue({ count: 0 });
        vi.mocked(prisma.contentTemplate.create).mockResolvedValue(mockTemplate);

        const response = await app.inject({
          method: 'POST',
          url: '/templates',
          headers: {
            authorization: 'Bearer test-token',
          },
          payload: {
            name: 'Document Template',
            description: 'Template for documents',
            contentType: 'DOCUMENT',
            mappingRules: { title: 'heading1', body: 'paragraphs' },
            isDefault: true,
          },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.name).toBe('Document Template');
        expect(body.isDefault).toBe(true);
      });

      it('should unset other defaults when creating default template', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.contentTemplate.updateMany).mockResolvedValue({ count: 1 });
        vi.mocked(prisma.contentTemplate.create).mockResolvedValue(mockTemplate);

        await app.inject({
          method: 'POST',
          url: '/templates',
          headers: {
            authorization: 'Bearer test-token',
          },
          payload: {
            name: 'Document Template',
            contentType: 'DOCUMENT',
            mappingRules: {},
            isDefault: true,
          },
        });

        expect(prisma.contentTemplate.updateMany).toHaveBeenCalledWith({
          where: { tenantId: 'test-tenant-id', contentType: 'DOCUMENT', isDefault: true },
          data: { isDefault: false },
        });
      });
    });

    describe('GET /templates', () => {
      it('should list all templates', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.contentTemplate.findMany).mockResolvedValue([mockTemplate]);

        const response = await app.inject({
          method: 'GET',
          url: '/templates',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body)).toBe(true);
        expect(body[0].name).toBe('Document Template');
      });

      it('should filter templates by contentType', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.contentTemplate.findMany).mockResolvedValue([]);

        await app.inject({
          method: 'GET',
          url: '/templates?contentType=PRESENTATION',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(prisma.contentTemplate.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              contentType: 'PRESENTATION',
            }),
          })
        );
      });
    });
  });

  describe('Import Mappings', () => {
    const mockMapping = {
      id: 'mapping-123',
      tenantId: 'test-tenant-id',
      name: 'Canvas Import',
      sourceSystem: 'canvas',
      contentType: 'DOCUMENT',
      fieldMappings: { title: 'name', description: 'description' },
      transformers: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('POST /import-mappings', () => {
      it('should create a new import mapping', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.importMapping.create).mockResolvedValue(mockMapping);

        const response = await app.inject({
          method: 'POST',
          url: '/import-mappings',
          headers: {
            authorization: 'Bearer test-token',
          },
          payload: {
            name: 'Canvas Import',
            sourceSystem: 'canvas',
            contentType: 'DOCUMENT',
            fieldMappings: { title: 'name', description: 'description' },
          },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.name).toBe('Canvas Import');
        expect(body.sourceSystem).toBe('canvas');
      });
    });

    describe('GET /import-mappings', () => {
      it('should list all import mappings', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.importMapping.findMany).mockResolvedValue([mockMapping]);

        const response = await app.inject({
          method: 'GET',
          url: '/import-mappings',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body)).toBe(true);
        expect(body[0].sourceSystem).toBe('canvas');
      });

      it('should filter by sourceSystem', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.importMapping.findMany).mockResolvedValue([]);

        await app.inject({
          method: 'GET',
          url: '/import-mappings?sourceSystem=moodle',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(prisma.importMapping.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              sourceSystem: 'moodle',
            }),
          })
        );
      });
    });
  });

  describe('Quota Management', () => {
    describe('GET /quota', () => {
      it('should return current quota', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestQuota.findUnique).mockResolvedValue(mockQuota);

        const response = await app.inject({
          method: 'GET',
          url: '/quota',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.dailyLimit).toBe(100);
        expect(body.monthlyLimit).toBe(1000);
        expect(body.usedToday).toBe(5);
      });

      it('should create quota if not exists', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestQuota.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.ingestQuota.create).mockResolvedValue(mockQuota);

        const response = await app.inject({
          method: 'GET',
          url: '/quota',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(200);
        expect(prisma.ingestQuota.create).toHaveBeenCalled();
      });
    });

    describe('PATCH /quota', () => {
      it('should update quota limits', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestQuota.update).mockResolvedValue({
          ...mockQuota,
          dailyLimit: 200,
          monthlyLimit: 2000,
        });

        const response = await app.inject({
          method: 'PATCH',
          url: '/quota',
          headers: {
            authorization: 'Bearer test-token',
          },
          payload: {
            dailyLimit: 200,
            monthlyLimit: 2000,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.dailyLimit).toBe(200);
        expect(body.monthlyLimit).toBe(2000);
      });

      it('should update allowed types', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.ingestQuota.update).mockResolvedValue({
          ...mockQuota,
          allowedTypes: ['pdf', 'docx', 'xlsx'],
        });

        const response = await app.inject({
          method: 'PATCH',
          url: '/quota',
          headers: {
            authorization: 'Bearer test-token',
          },
          payload: {
            allowedTypes: ['pdf', 'docx', 'xlsx'],
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.allowedTypes).toEqual(['pdf', 'docx', 'xlsx']);
      });
    });
  });

  describe('Webhooks', () => {
    const mockWebhook = {
      id: 'webhook-123',
      tenantId: 'test-tenant-id',
      name: 'Processing Complete',
      url: 'https://example.com/webhook',
      events: ['job.completed', 'job.failed'],
      secret: 'generated-secret',
      isActive: true,
      lastCalledAt: null,
      failureCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('POST /webhooks', () => {
      it('should create a new webhook', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.webhookEndpoint.create).mockResolvedValue(mockWebhook);

        const response = await app.inject({
          method: 'POST',
          url: '/webhooks',
          headers: {
            authorization: 'Bearer test-token',
          },
          payload: {
            name: 'Processing Complete',
            url: 'https://example.com/webhook',
            events: ['job.completed', 'job.failed'],
          },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.name).toBe('Processing Complete');
        expect(body.events).toEqual(['job.completed', 'job.failed']);
        expect(body.secret).toBeDefined();
      });
    });

    describe('GET /webhooks', () => {
      it('should list all webhooks', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.webhookEndpoint.findMany).mockResolvedValue([mockWebhook]);

        const response = await app.inject({
          method: 'GET',
          url: '/webhooks',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body)).toBe(true);
        expect(body[0].name).toBe('Processing Complete');
      });

      it('should only return active webhooks', async () => {
        const { prisma } = await import('../prisma.js');
        vi.mocked(prisma.webhookEndpoint.findMany).mockResolvedValue([]);

        await app.inject({
          method: 'GET',
          url: '/webhooks',
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(prisma.webhookEndpoint.findMany).toHaveBeenCalledWith({
          where: { tenantId: 'test-tenant-id', isActive: true },
        });
      });
    });
  });
});
