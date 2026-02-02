/**
 * Model Monitoring Service - Drift Detection Unit Tests
 *
 * Tests for data drift routes: drift reports listing, details, and detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

// Mock Prisma
const mockPrisma = {
  dataDriftReport: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { registerDriftRoutes } from '../src/routes/drift.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createMockDriftReport(id: string, overrides = {}) {
  return {
    id,
    tenantId: 'tenant-001',
    modelId: 'model-001',
    modelVersionId: 'version-001',
    referenceStart: new Date('2024-01-01T00:00:00Z'),
    referenceEnd: new Date('2024-01-15T00:00:00Z'),
    currentStart: new Date('2024-01-15T00:00:00Z'),
    currentEnd: new Date('2024-01-20T00:00:00Z'),
    overallDriftScore: 0.15,
    driftSeverity: 'LOW',
    driftDetected: false,
    testMethod: 'ks_test',
    featureDrift: {
      feature1: { score: 0.12, drifted: false },
      feature2: { score: 0.18, drifted: false },
    },
    referenceStats: { mean: 0.5, std: 0.1 },
    currentStats: { mean: 0.52, std: 0.11 },
    referenceSamples: 1000,
    currentSamples: 800,
    createdAt: new Date('2024-01-20T12:00:00Z'),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRIFT ROUTES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Drift Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-20T12:00:00Z'));

    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => {
      (request as any).user = {
        tenantId: 'tenant-001',
        userId: 'user-001',
      };
    });
    await app.register(registerDriftRoutes);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST DRIFT REPORTS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /drift/reports', () => {
    it('should list drift reports with pagination', async () => {
      const reports = [
        createMockDriftReport('report-001'),
        createMockDriftReport('report-002', { driftDetected: true, driftSeverity: 'HIGH' }),
      ];

      mockPrisma.dataDriftReport.findMany.mockResolvedValue(reports);
      mockPrisma.dataDriftReport.count.mockResolvedValue(2);

      const response = await app.inject({
        method: 'GET',
        url: '/drift/reports',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.reports).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('should filter by modelId', async () => {
      mockPrisma.dataDriftReport.findMany.mockResolvedValue([]);
      mockPrisma.dataDriftReport.count.mockResolvedValue(0);

      await app.inject({
        method: 'GET',
        url: '/drift/reports?modelId=550e8400-e29b-41d4-a716-446655440000',
      });

      expect(mockPrisma.dataDriftReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            modelId: '550e8400-e29b-41d4-a716-446655440000',
          }),
        })
      );
    });

    it('should filter by driftDetected=true', async () => {
      mockPrisma.dataDriftReport.findMany.mockResolvedValue([]);
      mockPrisma.dataDriftReport.count.mockResolvedValue(0);

      await app.inject({
        method: 'GET',
        url: '/drift/reports?driftDetected=true',
      });

      expect(mockPrisma.dataDriftReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            driftDetected: true,
          }),
        })
      );
    });

    it('should filter by driftDetected=false', async () => {
      mockPrisma.dataDriftReport.findMany.mockResolvedValue([]);
      mockPrisma.dataDriftReport.count.mockResolvedValue(0);

      await app.inject({
        method: 'GET',
        url: '/drift/reports?driftDetected=false',
      });

      expect(mockPrisma.dataDriftReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            driftDetected: false,
          }),
        })
      );
    });

    it('should filter by severity', async () => {
      mockPrisma.dataDriftReport.findMany.mockResolvedValue([]);
      mockPrisma.dataDriftReport.count.mockResolvedValue(0);

      await app.inject({
        method: 'GET',
        url: '/drift/reports?severity=CRITICAL',
      });

      expect(mockPrisma.dataDriftReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            driftSeverity: 'CRITICAL',
          }),
        })
      );
    });

    it('should apply pagination parameters', async () => {
      mockPrisma.dataDriftReport.findMany.mockResolvedValue([]);
      mockPrisma.dataDriftReport.count.mockResolvedValue(0);

      await app.inject({
        method: 'GET',
        url: '/drift/reports?limit=5&offset=10',
      });

      expect(mockPrisma.dataDriftReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          skip: 10,
        })
      );
    });

    it('should order by createdAt descending', async () => {
      mockPrisma.dataDriftReport.findMany.mockResolvedValue([]);
      mockPrisma.dataDriftReport.count.mockResolvedValue(0);

      await app.inject({
        method: 'GET',
        url: '/drift/reports',
      });

      expect(mockPrisma.dataDriftReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should reject invalid limit value', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/drift/reports?limit=0',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject limit exceeding maximum', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/drift/reports?limit=200',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET DRIFT REPORT DETAILS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /drift/reports/:id', () => {
    it('should return drift report details', async () => {
      const report = createMockDriftReport('report-001');
      mockPrisma.dataDriftReport.findUnique.mockResolvedValue(report);

      const response = await app.inject({
        method: 'GET',
        url: '/drift/reports/550e8400-e29b-41d4-a716-446655440000',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('report-001');
      expect(body).toHaveProperty('featureDrift');
      expect(body).toHaveProperty('referenceStats');
      expect(body).toHaveProperty('currentStats');
    });

    it('should return 404 for non-existent report', async () => {
      mockPrisma.dataDriftReport.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/drift/reports/550e8400-e29b-41d4-a716-446655440000',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for report belonging to different tenant', async () => {
      const report = createMockDriftReport('report-001', { tenantId: 'different-tenant' });
      mockPrisma.dataDriftReport.findUnique.mockResolvedValue(report);

      const response = await app.inject({
        method: 'GET',
        url: '/drift/reports/550e8400-e29b-41d4-a716-446655440000',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should validate UUID format for id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/drift/reports/not-a-uuid',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TRIGGER DRIFT DETECTION TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /drift/detect', () => {
    it('should trigger drift detection', async () => {
      mockPrisma.dataDriftReport.create.mockResolvedValue(
        createMockDriftReport('new-report-001')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/drift/detect',
        payload: {
          modelId: '550e8400-e29b-41d4-a716-446655440000',
          modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
          referenceStart: '2024-01-01T00:00:00Z',
          referenceEnd: '2024-01-15T00:00:00Z',
          currentStart: '2024-01-15T00:00:00Z',
          currentEnd: '2024-01-20T00:00:00Z',
        },
      });

      expect(response.statusCode).toBe(201);
      expect(mockPrisma.dataDriftReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-001',
          modelId: '550e8400-e29b-41d4-a716-446655440000',
          modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
          testMethod: 'ks_test',
        }),
      });
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/drift/detect',
        payload: {
          modelId: '550e8400-e29b-41d4-a716-446655440000',
          // Missing other required fields
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate datetime format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/drift/detect',
        payload: {
          modelId: '550e8400-e29b-41d4-a716-446655440000',
          modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
          referenceStart: 'invalid-date',
          referenceEnd: '2024-01-15T00:00:00Z',
          currentStart: '2024-01-15T00:00:00Z',
          currentEnd: '2024-01-20T00:00:00Z',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate UUID format for modelId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/drift/detect',
        payload: {
          modelId: 'not-a-uuid',
          modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
          referenceStart: '2024-01-01T00:00:00Z',
          referenceEnd: '2024-01-15T00:00:00Z',
          currentStart: '2024-01-15T00:00:00Z',
          currentEnd: '2024-01-20T00:00:00Z',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DRIFT DETECTION SEVERITY SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Drift Detection Severity Scenarios', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => {
      (request as any).user = {
        tenantId: 'tenant-001',
        userId: 'user-001',
      };
    });
    await app.register(registerDriftRoutes);
  });

  it('should handle NONE severity reports', async () => {
    mockPrisma.dataDriftReport.findMany.mockResolvedValue([
      createMockDriftReport('report-001', { driftSeverity: 'NONE', overallDriftScore: 0.02 }),
    ]);
    mockPrisma.dataDriftReport.count.mockResolvedValue(1);

    const response = await app.inject({
      method: 'GET',
      url: '/drift/reports?severity=NONE',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.reports[0].driftSeverity).toBe('NONE');
  });

  it('should handle LOW severity reports', async () => {
    mockPrisma.dataDriftReport.findMany.mockResolvedValue([
      createMockDriftReport('report-001', { driftSeverity: 'LOW', overallDriftScore: 0.15 }),
    ]);
    mockPrisma.dataDriftReport.count.mockResolvedValue(1);

    const response = await app.inject({
      method: 'GET',
      url: '/drift/reports?severity=LOW',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.reports[0].driftSeverity).toBe('LOW');
  });

  it('should handle MEDIUM severity reports', async () => {
    mockPrisma.dataDriftReport.findMany.mockResolvedValue([
      createMockDriftReport('report-001', { driftSeverity: 'MEDIUM', overallDriftScore: 0.35 }),
    ]);
    mockPrisma.dataDriftReport.count.mockResolvedValue(1);

    const response = await app.inject({
      method: 'GET',
      url: '/drift/reports?severity=MEDIUM',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.reports[0].driftSeverity).toBe('MEDIUM');
  });

  it('should handle HIGH severity reports', async () => {
    mockPrisma.dataDriftReport.findMany.mockResolvedValue([
      createMockDriftReport('report-001', { driftSeverity: 'HIGH', overallDriftScore: 0.55, driftDetected: true }),
    ]);
    mockPrisma.dataDriftReport.count.mockResolvedValue(1);

    const response = await app.inject({
      method: 'GET',
      url: '/drift/reports?severity=HIGH',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.reports[0].driftSeverity).toBe('HIGH');
    expect(body.reports[0].driftDetected).toBe(true);
  });

  it('should handle CRITICAL severity reports', async () => {
    mockPrisma.dataDriftReport.findMany.mockResolvedValue([
      createMockDriftReport('report-001', { driftSeverity: 'CRITICAL', overallDriftScore: 0.85, driftDetected: true }),
    ]);
    mockPrisma.dataDriftReport.count.mockResolvedValue(1);

    const response = await app.inject({
      method: 'GET',
      url: '/drift/reports?severity=CRITICAL',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.reports[0].driftSeverity).toBe('CRITICAL');
    expect(body.reports[0].driftDetected).toBe(true);
  });
});
