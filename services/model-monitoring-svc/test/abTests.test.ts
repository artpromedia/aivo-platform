/**
 * Model Monitoring Service - A/B Test Unit Tests
 *
 * Tests for A/B test routes: listing, creation, management, and results.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

// Mock Prisma
const mockPrisma = {
  aBTest: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { registerABTestRoutes } from '../src/routes/abTests.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createMockVariant(id: string, overrides = {}) {
  return {
    id,
    tenantId: 'tenant-001',
    testId: 'test-001',
    name: `Variant ${id}`,
    description: 'Test variant',
    isControl: false,
    modelVersionId: 'version-001',
    deploymentId: null,
    trafficPercent: 50,
    predictions: 500,
    conversions: 45,
    conversionRate: 0.09,
    avgLatencyMs: 145,
    errorRate: 0.02,
    createdAt: new Date('2024-01-20T12:00:00Z'),
    ...overrides,
  };
}

function createMockABTest(id: string, overrides = {}) {
  return {
    id,
    tenantId: 'tenant-001',
    name: 'Test A/B Experiment',
    description: 'Testing model performance',
    hypothesis: 'New model will improve conversion rate by 5%',
    status: 'draft',
    primaryMetric: 'conversion_rate',
    secondaryMetrics: ['latency_p99', 'error_rate'],
    trafficSplit: { control: 50, treatment: 50 },
    confidenceLevel: 0.95,
    minSampleSize: 1000,
    startedAt: null,
    endedAt: null,
    createdBy: 'user-001',
    createdAt: new Date('2024-01-15T12:00:00Z'),
    variants: [
      createMockVariant('variant-001', { isControl: true, name: 'Control' }),
      createMockVariant('variant-002', { name: 'Treatment' }),
    ],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// A/B TEST ROUTES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('A/B Test Routes', () => {
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
    await app.register(registerABTestRoutes);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST A/B TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /ab-tests', () => {
    it('should list A/B tests with variants', async () => {
      const tests = [
        createMockABTest('test-001'),
        createMockABTest('test-002', { name: 'Second Test' }),
      ];

      mockPrisma.aBTest.findMany.mockResolvedValue(tests);

      const response = await app.inject({
        method: 'GET',
        url: '/ab-tests',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tests).toHaveLength(2);
      expect(body.count).toBe(2);
      expect(body.tests[0]).toHaveProperty('variants');
    });

    it('should filter by status', async () => {
      mockPrisma.aBTest.findMany.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/ab-tests?status=running',
      });

      expect(mockPrisma.aBTest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'running',
          }),
        })
      );
    });

    it('should filter by draft status', async () => {
      mockPrisma.aBTest.findMany.mockResolvedValue([createMockABTest('test-001')]);

      const response = await app.inject({
        method: 'GET',
        url: '/ab-tests?status=draft',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter by completed status', async () => {
      mockPrisma.aBTest.findMany.mockResolvedValue([
        createMockABTest('test-001', { status: 'completed' }),
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/ab-tests?status=completed',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter by paused status', async () => {
      mockPrisma.aBTest.findMany.mockResolvedValue([
        createMockABTest('test-001', { status: 'paused' }),
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/ab-tests?status=paused',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should order by createdAt descending', async () => {
      mockPrisma.aBTest.findMany.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/ab-tests',
      });

      expect(mockPrisma.aBTest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE A/B TEST
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /ab-tests', () => {
    it('should create an A/B test with two variants', async () => {
      const testData = {
        name: 'Model Performance Test',
        primaryMetric: 'conversion_rate',
        variants: [
          {
            name: 'Control',
            isControl: true,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440000',
            trafficPercent: 50,
          },
          {
            name: 'Treatment',
            isControl: false,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
            trafficPercent: 50,
          },
        ],
      };

      mockPrisma.aBTest.create.mockResolvedValue(createMockABTest('new-test-001'));

      const response = await app.inject({
        method: 'POST',
        url: '/ab-tests',
        payload: testData,
      });

      expect(response.statusCode).toBe(201);
      expect(mockPrisma.aBTest.create).toHaveBeenCalled();
    });

    it('should accept optional fields', async () => {
      const testData = {
        name: 'Full Config Test',
        description: 'Testing with all options',
        hypothesis: 'New model improves metrics by 10%',
        primaryMetric: 'conversion_rate',
        secondaryMetrics: ['latency_p99', 'error_rate', 'accuracy'],
        confidenceLevel: 0.99,
        minSampleSize: 5000,
        variants: [
          {
            name: 'Control',
            description: 'Current production model',
            isControl: true,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440000',
            deploymentId: '550e8400-e29b-41d4-a716-446655440002',
            trafficPercent: 50,
          },
          {
            name: 'Treatment',
            description: 'New experimental model',
            isControl: false,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
            deploymentId: '550e8400-e29b-41d4-a716-446655440003',
            trafficPercent: 50,
          },
        ],
      };

      mockPrisma.aBTest.create.mockResolvedValue(createMockABTest('new-test-001'));

      const response = await app.inject({
        method: 'POST',
        url: '/ab-tests',
        payload: testData,
      });

      expect(response.statusCode).toBe(201);
    });

    it('should reject when traffic split does not equal 100%', async () => {
      const testData = {
        name: 'Invalid Traffic Test',
        primaryMetric: 'conversion_rate',
        variants: [
          {
            name: 'Control',
            isControl: true,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440000',
            trafficPercent: 40, // Only 90% total
          },
          {
            name: 'Treatment',
            isControl: false,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
            trafficPercent: 50,
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/ab-tests',
        payload: testData,
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('100%');
    });

    it('should reject traffic split exceeding 100%', async () => {
      const testData = {
        name: 'Overflow Traffic Test',
        primaryMetric: 'conversion_rate',
        variants: [
          {
            name: 'Control',
            isControl: true,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440000',
            trafficPercent: 60,
          },
          {
            name: 'Treatment',
            isControl: false,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
            trafficPercent: 60,
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/ab-tests',
        payload: testData,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject fewer than 2 variants', async () => {
      const testData = {
        name: 'Single Variant Test',
        primaryMetric: 'conversion_rate',
        variants: [
          {
            name: 'Only One',
            isControl: true,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440000',
            trafficPercent: 100,
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/ab-tests',
        payload: testData,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate name length constraints', async () => {
      const testData = {
        name: '', // Empty name
        primaryMetric: 'conversion_rate',
        variants: [
          {
            name: 'Control',
            isControl: true,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440000',
            trafficPercent: 50,
          },
          {
            name: 'Treatment',
            isControl: false,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
            trafficPercent: 50,
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/ab-tests',
        payload: testData,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate confidence level range', async () => {
      const testData = {
        name: 'Invalid Confidence',
        primaryMetric: 'conversion_rate',
        confidenceLevel: 1.5, // Invalid - must be between 0.8 and 0.99
        variants: [
          {
            name: 'Control',
            isControl: true,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440000',
            trafficPercent: 50,
          },
          {
            name: 'Treatment',
            isControl: false,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
            trafficPercent: 50,
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/ab-tests',
        payload: testData,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should support multi-variant tests', async () => {
      const testData = {
        name: 'Multi-Variant Test',
        primaryMetric: 'conversion_rate',
        variants: [
          {
            name: 'Control',
            isControl: true,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440000',
            trafficPercent: 40,
          },
          {
            name: 'Treatment A',
            isControl: false,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
            trafficPercent: 30,
          },
          {
            name: 'Treatment B',
            isControl: false,
            modelVersionId: '550e8400-e29b-41d4-a716-446655440002',
            trafficPercent: 30,
          },
        ],
      };

      mockPrisma.aBTest.create.mockResolvedValue(createMockABTest('new-test-001'));

      const response = await app.inject({
        method: 'POST',
        url: '/ab-tests',
        payload: testData,
      });

      expect(response.statusCode).toBe(201);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET A/B TEST RESULTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /ab-tests/:id/results', () => {
    it('should return test results with variant data', async () => {
      const test = createMockABTest('test-001', { status: 'running' });
      mockPrisma.aBTest.findUnique.mockResolvedValue(test);

      const response = await app.inject({
        method: 'GET',
        url: '/ab-tests/550e8400-e29b-41d4-a716-446655440000/results',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('variants');
      expect(body.variants).toHaveLength(2);
    });

    it('should return 404 for non-existent test', async () => {
      mockPrisma.aBTest.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/ab-tests/550e8400-e29b-41d4-a716-446655440000/results',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should validate UUID format for test id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ab-tests/invalid-uuid/results',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // START A/B TEST
  // ─────────────────────────────────────────────────────────────────────────────

  describe('PATCH /ab-tests/:id/start', () => {
    it('should start a draft test', async () => {
      const updatedTest = createMockABTest('test-001', {
        status: 'running',
        startedAt: new Date('2024-01-20T12:00:00Z'),
      });
      mockPrisma.aBTest.update.mockResolvedValue(updatedTest);

      const response = await app.inject({
        method: 'PATCH',
        url: '/ab-tests/550e8400-e29b-41d4-a716-446655440000/start',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('running');
      expect(body.startedAt).toBeTruthy();
    });

    it('should set startedAt timestamp', async () => {
      mockPrisma.aBTest.update.mockResolvedValue(
        createMockABTest('test-001', { status: 'running' })
      );

      await app.inject({
        method: 'PATCH',
        url: '/ab-tests/550e8400-e29b-41d4-a716-446655440000/start',
      });

      expect(mockPrisma.aBTest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'running',
            startedAt: expect.any(Date),
          }),
        })
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// A/B TEST STATISTICAL SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('A/B Test Statistical Scenarios', () => {
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
    await app.register(registerABTestRoutes);
  });

  it('should handle test with significant results', async () => {
    const test = createMockABTest('test-001', {
      status: 'completed',
      variants: [
        createMockVariant('variant-001', {
          isControl: true,
          name: 'Control',
          predictions: 10000,
          conversions: 900,
          conversionRate: 0.09,
        }),
        createMockVariant('variant-002', {
          isControl: false,
          name: 'Treatment',
          predictions: 10000,
          conversions: 1050,
          conversionRate: 0.105,
        }),
      ],
    });

    mockPrisma.aBTest.findUnique.mockResolvedValue(test);

    const response = await app.inject({
      method: 'GET',
      url: '/ab-tests/550e8400-e29b-41d4-a716-446655440000/results',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.variants[1].conversionRate).toBeGreaterThan(body.variants[0].conversionRate);
  });

  it('should handle test with insufficient sample size', async () => {
    const test = createMockABTest('test-001', {
      status: 'running',
      minSampleSize: 10000,
      variants: [
        createMockVariant('variant-001', {
          isControl: true,
          predictions: 500, // Less than min sample
        }),
        createMockVariant('variant-002', {
          isControl: false,
          predictions: 500,
        }),
      ],
    });

    mockPrisma.aBTest.findUnique.mockResolvedValue(test);

    const response = await app.inject({
      method: 'GET',
      url: '/ab-tests/550e8400-e29b-41d4-a716-446655440000/results',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.variants[0].predictions + body.variants[1].predictions).toBeLessThan(body.minSampleSize);
  });

  it('should handle test at various confidence levels', async () => {
    const confidenceLevels = [0.80, 0.90, 0.95, 0.99];

    for (const confidence of confidenceLevels) {
      mockPrisma.aBTest.create.mockResolvedValue(
        createMockABTest('test-001', { confidenceLevel: confidence })
      );

      const response = await app.inject({
        method: 'POST',
        url: '/ab-tests',
        payload: {
          name: `Test at ${confidence * 100}% confidence`,
          primaryMetric: 'conversion_rate',
          confidenceLevel: confidence,
          variants: [
            {
              name: 'Control',
              isControl: true,
              modelVersionId: '550e8400-e29b-41d4-a716-446655440000',
              trafficPercent: 50,
            },
            {
              name: 'Treatment',
              isControl: false,
              modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
              trafficPercent: 50,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
    }
  });
});
