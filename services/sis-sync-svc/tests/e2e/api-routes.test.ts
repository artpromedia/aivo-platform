/**
 * SIS Sync Service — API Route Integration Tests
 *
 * Validates HTTP endpoints via supertest against the real Fastify app.
 * Uses mocked Prisma so no database is needed.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

// ── Mock Prisma before any import that uses it ──────────────

const mockPrisma = {
  sisProvider: {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  sisSyncRun: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
  },
  sisRawSchool: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  sisRawClass: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  sisRawUser: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  sisRawEnrollment: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  deltaSyncState: {
    findUnique: vi.fn().mockResolvedValue(null),
    upsert: vi.fn(),
  },
  webhookConfig: {
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
  },
  webhookLog: {
    create: vi.fn(),
  },
  webhookDeadLetter: {
    create: vi.fn(),
  },
  syncHistory: {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
  $transaction: vi.fn().mockImplementation((fn: any) => fn(mockPrisma)),
  $disconnect: vi.fn().mockResolvedValue(undefined),
};

// Mock the Prisma import used by server.ts
vi.mock('../../prisma.js', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

import type { FastifyInstance } from 'fastify';

// We'll call app.inject() directly instead of supertest to avoid port binding

describe('SIS Sync Service — API Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const { createServer } = await import('../../src/api/server');
    const server = await createServer();
    app = server.app;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Health ────────────────────────────────────────────────

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('ok');
    });
  });

  describe('GET /ready', () => {
    it('should return 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/ready' });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── Provider CRUD ─────────────────────────────────────────

  describe('GET /api/v1/tenants/:tenantId/providers', () => {
    it('should return empty array when no providers exist', async () => {
      mockPrisma.sisProvider.findMany.mockResolvedValue([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tenants/tenant-001/providers',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body.providers ?? body)).toBe(true);
    });

    it('should return providers for a tenant', async () => {
      const mockProviders = [
        {
          id: 'prov-1',
          tenantId: 'tenant-001',
          name: 'Clever Sandbox',
          type: 'CLEVER',
          status: 'ACTIVE',
          config: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrisma.sisProvider.findMany.mockResolvedValue(mockProviders);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tenants/tenant-001/providers',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const providers = body.providers ?? body;
      expect(providers.length).toBe(1);
      expect(providers[0].type).toBe('CLEVER');
    });
  });

  describe('POST /api/v1/providers', () => {
    it('should create a new provider', async () => {
      const newProvider = {
        tenantId: 'tenant-001',
        name: 'Clever E2E',
        type: 'CLEVER',
        config: { clientId: 'cid', clientSecret: 'csec', districtId: 'did' },
      };

      mockPrisma.sisProvider.create.mockResolvedValue({
        id: 'prov-new',
        ...newProvider,
        status: 'CONFIGURED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/providers',
        payload: newProvider,
      });

      expect(res.statusCode).toBeLessThan(300);
      const body = JSON.parse(res.body);
      expect(body.id || body.provider?.id).toBeTruthy();
    });
  });

  // ── Sync Status ───────────────────────────────────────────

  describe('GET /api/v1/providers/:providerId/sync/status', () => {
    it('should return sync status for a provider', async () => {
      mockPrisma.sisProvider.findUnique.mockResolvedValue({
        id: 'prov-1',
        tenantId: 'tenant-001',
        name: 'Clever',
        type: 'CLEVER',
        status: 'ACTIVE',
        lastSyncAt: new Date(),
        lastSyncStatus: 'SUCCESS',
        config: {},
      });

      mockPrisma.sisSyncRun.findFirst.mockResolvedValue({
        id: 'run-1',
        providerId: 'prov-1',
        status: 'SUCCESS',
        startedAt: new Date(),
        completedAt: new Date(),
        schoolsProcessed: 2,
        classesProcessed: 3,
        usersProcessed: 6,
        enrollmentsProcessed: 7,
        errors: [],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/providers/prov-1/sync/status',
      });

      expect(res.statusCode).toBe(200);
    });
  });

  // ── Sync History ──────────────────────────────────────────

  describe('GET /api/v1/providers/:providerId/runs', () => {
    it('should return an array of sync runs', async () => {
      mockPrisma.sisProvider.findUnique.mockResolvedValue({
        id: 'prov-1',
        tenantId: 'tenant-001',
        type: 'CLEVER',
        status: 'ACTIVE',
        config: {},
      });

      mockPrisma.sisSyncRun.findMany.mockResolvedValue([
        {
          id: 'run-1',
          providerId: 'prov-1',
          status: 'SUCCESS',
          startedAt: new Date(),
          completedAt: new Date(),
          schoolsProcessed: 2,
        },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/providers/prov-1/runs?limit=10',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const runs = body.runs ?? body;
      expect(Array.isArray(runs)).toBe(true);
    });
  });
});
