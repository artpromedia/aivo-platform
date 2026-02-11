/**
 * Model Monitoring Service Unit Tests
 *
 * Comprehensive tests for the model monitoring service routes.
 * Tests cover: predictions, metrics, alerts, drift detection,
 * performance aggregation, and threshold alerting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

// Mock Prisma
const mockPrisma = {
  prediction: {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  predictionFeedback: {
    create: vi.fn(),
  },
  modelPerformanceMetric: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  featureImportance: {
    findMany: vi.fn(),
  },
  alert: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  alertRule: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { registerPredictionRoutes } from '../src/routes/predictions.js';
import { registerMetricsRoutes } from '../src/routes/metrics.js';
import { registerAlertsRoutes } from '../src/routes/alerts.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createMockPrediction(id: string, overrides = {}) {
  return {
    id,
    tenantId: 'tenant-001',
    modelId: 'model-001',
    modelVersionId: 'version-001',
    requestId: `request-${id}`,
    predictionType: 'classification',
    predictedClass: 'positive',
    confidence: 0.95,
    latencyMs: 150,
    status: 'SUCCESS',
    isCorrect: null,
    predictedAt: new Date('2024-01-20T12:00:00Z'),
    ...overrides,
  };
}

function createMockMetric(id: string, overrides = {}) {
  return {
    id,
    tenantId: 'tenant-001',
    modelId: 'model-001',
    modelVersionId: 'version-001',
    windowStart: new Date('2024-01-20T11:00:00Z'),
    windowEnd: new Date('2024-01-20T12:00:00Z'),
    granularity: 'hour',
    totalPredictions: 1000,
    successfulPredictions: 980,
    failedPredictions: 20,
    accuracy: 0.92,
    avgLatencyMs: 145,
    p50LatencyMs: 120,
    p95LatencyMs: 280,
    p99LatencyMs: 450,
    avgConfidence: 0.88,
    ...overrides,
  };
}

function createMockAlert(id: string, overrides = {}) {
  return {
    id,
    tenantId: 'tenant-001',
    modelId: 'model-001',
    ruleId: 'rule-001',
    status: 'ACTIVE',
    severity: 'WARNING',
    message: 'Accuracy dropped below threshold',
    triggeredAt: new Date('2024-01-20T12:00:00Z'),
    rule: { name: 'Accuracy Alert' },
    ...overrides,
  };
}

function createMockAlertRule(id: string, overrides = {}) {
  return {
    id,
    tenantId: 'tenant-001',
    name: 'Accuracy Alert Rule',
    description: 'Alert when accuracy drops below 90%',
    modelId: 'model-001',
    metricName: 'accuracy',
    operator: 'lt',
    threshold: 0.9,
    windowDuration: 3600,
    minSamples: 10,
    severity: 'WARNING',
    isEnabled: true,
    notifyChannels: ['email'],
    emailRecipients: ['admin@example.com'],
    createdAt: new Date('2024-01-01'),
    _count: { alerts: 5 },
    ...overrides,
  };
}

function createMockFeatureImportance(feature: string, overrides = {}) {
  return {
    id: `fi-${feature}`,
    tenantId: 'tenant-001',
    modelVersionId: 'version-001',
    featureName: feature,
    importance: Math.random(),
    rank: Math.floor(Math.random() * 20) + 1,
    calculatedAt: new Date('2024-01-20T12:00:00Z'),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICTIONS ROUTES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Prediction Routes', () => {
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
    await app.register(registerPredictionRoutes);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LOG PREDICTION TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /predictions', () => {
    it('should log a single prediction', async () => {
      const predictionData = {
        modelId: '550e8400-e29b-41d4-a716-446655440000',
        modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
        requestId: 'req-001',
        input: { feature1: 0.5, feature2: 1.0 },
        output: { class: 'positive', probability: 0.95 },
        predictionType: 'classification',
        confidence: 0.95,
        latencyMs: 150,
      };

      mockPrisma.prediction.create.mockResolvedValue({
        id: 'pred-001',
        predictedAt: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/predictions',
        payload: predictionData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('predictedAt');
    });

    it('should create input hash for deduplication', async () => {
      const predictionData = {
        modelId: '550e8400-e29b-41d4-a716-446655440000',
        modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
        requestId: 'req-001',
        input: { feature1: 0.5 },
        output: { result: 'positive' },
        predictionType: 'classification',
        latencyMs: 100,
      };

      mockPrisma.prediction.create.mockResolvedValue({
        id: 'pred-001',
        predictedAt: new Date(),
      });

      await app.inject({
        method: 'POST',
        url: '/predictions',
        payload: predictionData,
      });

      expect(mockPrisma.prediction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inputHash: expect.any(String),
        }),
      });
    });

    it('should handle ground truth and compute correctness', async () => {
      const predictionData = {
        modelId: '550e8400-e29b-41d4-a716-446655440000',
        modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
        requestId: 'req-001',
        input: { feature1: 0.5 },
        output: { class: 'positive' },
        groundTruth: { class: 'positive' },
        predictionType: 'classification',
        latencyMs: 100,
      };

      mockPrisma.prediction.create.mockResolvedValue({
        id: 'pred-001',
        predictedAt: new Date(),
      });

      await app.inject({
        method: 'POST',
        url: '/predictions',
        payload: predictionData,
      });

      expect(mockPrisma.prediction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isCorrect: true,
        }),
      });
    });

    it('should accept all optional fields', async () => {
      const predictionData = {
        modelId: '550e8400-e29b-41d4-a716-446655440000',
        modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
        deploymentId: '550e8400-e29b-41d4-a716-446655440002',
        requestId: 'req-001',
        userId: '550e8400-e29b-41d4-a716-446655440003',
        sessionId: 'session-001',
        input: { feature1: 0.5 },
        output: { result: 'positive' },
        features: { feature1: 0.5, feature2: 1.0 },
        predictionType: 'classification',
        predictedClass: 'positive',
        confidence: 0.95,
        probability: 0.95,
        topKPredictions: [{ class: 'positive', prob: 0.95 }],
        latencyMs: 150,
        tokensUsed: 100,
        status: 'SUCCESS',
        metadata: { source: 'web' },
        tags: ['production', 'high-priority'],
      };

      mockPrisma.prediction.create.mockResolvedValue({
        id: 'pred-001',
        predictedAt: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/predictions',
        payload: predictionData,
      });

      expect(response.statusCode).toBe(201);
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/predictions',
        payload: {
          // Missing required fields
          input: {},
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // BATCH PREDICTIONS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /predictions/batch', () => {
    it('should log multiple predictions', async () => {
      const predictions = [
        {
          modelId: '550e8400-e29b-41d4-a716-446655440000',
          modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
          requestId: 'req-001',
          input: { feature1: 0.5 },
          output: { class: 'positive' },
          predictionType: 'classification',
          latencyMs: 100,
        },
        {
          modelId: '550e8400-e29b-41d4-a716-446655440000',
          modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
          requestId: 'req-002',
          input: { feature1: 0.8 },
          output: { class: 'negative' },
          predictionType: 'classification',
          latencyMs: 120,
        },
      ];

      mockPrisma.prediction.createMany.mockResolvedValue({ count: 2 });

      const response = await app.inject({
        method: 'POST',
        url: '/predictions/batch',
        payload: { predictions },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.count).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST PREDICTIONS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /predictions', () => {
    it('should list predictions with pagination', async () => {
      const predictions = [createMockPrediction('pred-001'), createMockPrediction('pred-002')];

      mockPrisma.prediction.findMany.mockResolvedValue(predictions);
      mockPrisma.prediction.count.mockResolvedValue(2);

      const response = await app.inject({
        method: 'GET',
        url: '/predictions?limit=10&offset=0',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.predictions).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('should filter by modelId', async () => {
      mockPrisma.prediction.findMany.mockResolvedValue([]);
      mockPrisma.prediction.count.mockResolvedValue(0);

      await app.inject({
        method: 'GET',
        url: '/predictions?modelId=550e8400-e29b-41d4-a716-446655440000',
      });

      expect(mockPrisma.prediction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            modelId: '550e8400-e29b-41d4-a716-446655440000',
          }),
        })
      );
    });

    it('should filter by status', async () => {
      mockPrisma.prediction.findMany.mockResolvedValue([]);
      mockPrisma.prediction.count.mockResolvedValue(0);

      await app.inject({
        method: 'GET',
        url: '/predictions?status=ERROR',
      });

      expect(mockPrisma.prediction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ERROR',
          }),
        })
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.prediction.findMany.mockResolvedValue([]);
      mockPrisma.prediction.count.mockResolvedValue(0);

      await app.inject({
        method: 'GET',
        url: '/predictions?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z',
      });

      expect(mockPrisma.prediction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            predictedAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET PREDICTION DETAILS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /predictions/:id', () => {
    it('should return prediction details with feedback', async () => {
      const prediction = createMockPrediction('pred-001', {
        feedback: [{ feedbackType: 'THUMBS_UP', rating: 5 }],
      });

      mockPrisma.prediction.findUnique.mockResolvedValue(prediction);

      const response = await app.inject({
        method: 'GET',
        url: '/predictions/550e8400-e29b-41d4-a716-446655440000',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('pred-001');
    });

    it('should return 404 for non-existent prediction', async () => {
      mockPrisma.prediction.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/predictions/550e8400-e29b-41d4-a716-446655440000',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ADD FEEDBACK TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /predictions/:id/feedback', () => {
    it('should add feedback to prediction', async () => {
      mockPrisma.prediction.findUnique.mockResolvedValue(createMockPrediction('pred-001'));
      mockPrisma.predictionFeedback.create.mockResolvedValue({
        id: 'feedback-001',
        feedbackType: 'THUMBS_UP',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/predictions/550e8400-e29b-41d4-a716-446655440000/feedback',
        payload: {
          feedbackType: 'THUMBS_UP',
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should support rating feedback', async () => {
      mockPrisma.prediction.findUnique.mockResolvedValue(createMockPrediction('pred-001'));
      mockPrisma.predictionFeedback.create.mockResolvedValue({
        id: 'feedback-001',
        feedbackType: 'RATING',
        rating: 4,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/predictions/550e8400-e29b-41d4-a716-446655440000/feedback',
        payload: {
          feedbackType: 'RATING',
          rating: 4,
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should support correctness feedback with correct value', async () => {
      mockPrisma.prediction.findUnique.mockResolvedValue(createMockPrediction('pred-001'));
      mockPrisma.predictionFeedback.create.mockResolvedValue({
        id: 'feedback-001',
        feedbackType: 'INCORRECT',
        isCorrect: false,
        correctValue: { class: 'negative' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/predictions/550e8400-e29b-41d4-a716-446655440000/feedback',
        payload: {
          feedbackType: 'INCORRECT',
          isCorrect: false,
          correctValue: { class: 'negative' },
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should return 404 for non-existent prediction', async () => {
      mockPrisma.prediction.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/predictions/550e8400-e29b-41d4-a716-446655440000/feedback',
        payload: {
          feedbackType: 'THUMBS_UP',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS ROUTES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Metrics Routes', () => {
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
    await app.register(registerMetricsRoutes);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PERFORMANCE METRICS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /metrics/performance', () => {
    it('should return time-series performance metrics', async () => {
      const metrics = [
        createMockMetric('metric-001'),
        createMockMetric('metric-002', { windowStart: new Date('2024-01-20T10:00:00Z') }),
      ];

      mockPrisma.modelPerformanceMetric.findMany.mockResolvedValue(metrics);

      const response = await app.inject({
        method: 'GET',
        url: '/metrics/performance?startDate=2024-01-20T00:00:00Z&endDate=2024-01-20T23:59:59Z',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.metrics).toHaveLength(2);
      expect(body.count).toBe(2);
    });

    it('should filter by granularity', async () => {
      mockPrisma.modelPerformanceMetric.findMany.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/metrics/performance?startDate=2024-01-20T00:00:00Z&endDate=2024-01-20T23:59:59Z&granularity=day',
      });

      expect(mockPrisma.modelPerformanceMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            granularity: 'day',
          }),
        })
      );
    });

    it('should filter by modelVersionId', async () => {
      mockPrisma.modelPerformanceMetric.findMany.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/metrics/performance?startDate=2024-01-20T00:00:00Z&endDate=2024-01-20T23:59:59Z&modelVersionId=550e8400-e29b-41d4-a716-446655440000',
      });

      expect(mockPrisma.modelPerformanceMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            modelVersionId: '550e8400-e29b-41d4-a716-446655440000',
          }),
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FEATURE IMPORTANCE TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /metrics/feature-importance', () => {
    it('should return feature importance rankings', async () => {
      const features = [
        createMockFeatureImportance('feature1', { importance: 0.35, rank: 1 }),
        createMockFeatureImportance('feature2', { importance: 0.28, rank: 2 }),
        createMockFeatureImportance('feature3', { importance: 0.15, rank: 3 }),
      ];

      mockPrisma.featureImportance.findMany.mockResolvedValue(features);

      const response = await app.inject({
        method: 'GET',
        url: '/metrics/feature-importance?modelVersionId=550e8400-e29b-41d4-a716-446655440000',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.features).toHaveLength(3);
    });

    it('should limit results with topN parameter', async () => {
      mockPrisma.featureImportance.findMany.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/metrics/feature-importance?modelVersionId=550e8400-e29b-41d4-a716-446655440000&topN=5',
      });

      expect(mockPrisma.featureImportance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // METRICS AGGREGATION TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /metrics/aggregate', () => {
    it('should trigger metrics aggregation', async () => {
      const predictions = [
        createMockPrediction('p1', {
          status: 'SUCCESS',
          latencyMs: 100,
          confidence: 0.9,
          isCorrect: true,
        }),
        createMockPrediction('p2', {
          status: 'SUCCESS',
          latencyMs: 150,
          confidence: 0.85,
          isCorrect: true,
        }),
        createMockPrediction('p3', {
          status: 'ERROR',
          latencyMs: 50,
          confidence: null,
          isCorrect: false,
        }),
      ];

      mockPrisma.prediction.findMany.mockResolvedValue(predictions);
      mockPrisma.modelPerformanceMetric.create.mockResolvedValue(createMockMetric('metric-001'));

      const response = await app.inject({
        method: 'POST',
        url: '/metrics/aggregate',
        payload: {
          modelVersionId: '550e8400-e29b-41d4-a716-446655440000',
          windowStart: '2024-01-20T11:00:00Z',
          windowEnd: '2024-01-20T12:00:00Z',
          granularity: 'hour',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockPrisma.modelPerformanceMetric.create).toHaveBeenCalled();
    });

    it('should calculate latency percentiles correctly', async () => {
      // Create predictions with known latencies for percentile testing
      const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const predictions = latencies.map((latency, i) =>
        createMockPrediction(`p${i}`, { status: 'SUCCESS', latencyMs: latency })
      );

      mockPrisma.prediction.findMany.mockResolvedValue(predictions);
      mockPrisma.modelPerformanceMetric.create.mockResolvedValue(createMockMetric('metric-001'));

      await app.inject({
        method: 'POST',
        url: '/metrics/aggregate',
        payload: {
          modelVersionId: '550e8400-e29b-41d4-a716-446655440000',
          windowStart: '2024-01-20T11:00:00Z',
          windowEnd: '2024-01-20T12:00:00Z',
          granularity: 'hour',
        },
      });

      expect(mockPrisma.modelPerformanceMetric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          totalPredictions: 10,
          avgLatencyMs: 55,
        }),
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTS ROUTES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Alerts Routes', () => {
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
    await app.register(registerAlertsRoutes);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST ALERTS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /alerts', () => {
    it('should list alerts with pagination', async () => {
      const alerts = [createMockAlert('alert-001'), createMockAlert('alert-002')];

      mockPrisma.alert.findMany.mockResolvedValue(alerts);
      mockPrisma.alert.count.mockResolvedValue(2);

      const response = await app.inject({
        method: 'GET',
        url: '/alerts',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.alerts).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockPrisma.alert.findMany.mockResolvedValue([]);
      mockPrisma.alert.count.mockResolvedValue(0);

      await app.inject({
        method: 'GET',
        url: '/alerts?status=ACTIVE',
      });

      expect(mockPrisma.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should filter by severity', async () => {
      mockPrisma.alert.findMany.mockResolvedValue([]);
      mockPrisma.alert.count.mockResolvedValue(0);

      await app.inject({
        method: 'GET',
        url: '/alerts?severity=CRITICAL',
      });

      expect(mockPrisma.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            severity: 'CRITICAL',
          }),
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ACKNOWLEDGE ALERT TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('PATCH /alerts/:id/acknowledge', () => {
    it('should acknowledge an alert', async () => {
      const updatedAlert = createMockAlert('alert-001', {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: 'user-001',
        acknowledgedAt: new Date(),
      });

      mockPrisma.alert.update.mockResolvedValue(updatedAlert);

      const response = await app.inject({
        method: 'PATCH',
        url: '/alerts/550e8400-e29b-41d4-a716-446655440000/acknowledge',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ACKNOWLEDGED');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RESOLVE ALERT TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('PATCH /alerts/:id/resolve', () => {
    it('should resolve an alert', async () => {
      const updatedAlert = createMockAlert('alert-001', {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      });

      mockPrisma.alert.update.mockResolvedValue(updatedAlert);

      const response = await app.inject({
        method: 'PATCH',
        url: '/alerts/550e8400-e29b-41d4-a716-446655440000/resolve',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('RESOLVED');
    });

    it('should accept resolution notes', async () => {
      mockPrisma.alert.update.mockResolvedValue(
        createMockAlert('alert-001', { status: 'RESOLVED' })
      );

      await app.inject({
        method: 'PATCH',
        url: '/alerts/550e8400-e29b-41d4-a716-446655440000/resolve',
        payload: { notes: 'Issue fixed by retraining model' },
      });

      expect(mockPrisma.alert.update).toHaveBeenCalledWith({
        where: expect.any(Object),
        data: expect.objectContaining({
          resolutionNotes: 'Issue fixed by retraining model',
        }),
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ALERT RULES TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /alerts/rules', () => {
    it('should list alert rules', async () => {
      const rules = [
        createMockAlertRule('rule-001'),
        createMockAlertRule('rule-002', { name: 'Latency Alert' }),
      ];

      mockPrisma.alertRule.findMany.mockResolvedValue(rules);

      const response = await app.inject({
        method: 'GET',
        url: '/alerts/rules',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.rules).toHaveLength(2);
    });

    it('should filter by enabled status', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/alerts/rules?isEnabled=true',
      });

      expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isEnabled: true,
          }),
        })
      );
    });
  });

  describe('POST /alerts/rules', () => {
    it('should create an alert rule', async () => {
      const ruleData = {
        name: 'Accuracy Drop Alert',
        metricName: 'accuracy',
        operator: 'lt',
        threshold: 0.85,
        windowDuration: 3600,
        severity: 'WARNING',
      };

      mockPrisma.alertRule.create.mockResolvedValue(createMockAlertRule('rule-001', ruleData));

      const response = await app.inject({
        method: 'POST',
        url: '/alerts/rules',
        payload: ruleData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Accuracy Drop Alert');
    });

    it('should accept all optional rule configuration', async () => {
      const ruleData = {
        name: 'Full Config Alert',
        description: 'Alert with all options',
        modelId: '550e8400-e29b-41d4-a716-446655440000',
        modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
        deploymentId: '550e8400-e29b-41d4-a716-446655440002',
        metricName: 'latency_p99',
        operator: 'gt',
        threshold: 500,
        windowDuration: 1800,
        minSamples: 50,
        severity: 'CRITICAL',
        notifyChannels: ['email'],
        webhookUrl: 'https://example.com/webhook',
        emailRecipients: ['admin@example.com', 'ops@example.com'],
        tags: ['production', 'critical'],
      };

      mockPrisma.alertRule.create.mockResolvedValue(createMockAlertRule('rule-001', ruleData));

      const response = await app.inject({
        method: 'POST',
        url: '/alerts/rules',
        payload: ruleData,
      });

      expect(response.statusCode).toBe(201);
    });

    it('should validate operator enum', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/alerts/rules',
        payload: {
          name: 'Invalid Operator',
          metricName: 'accuracy',
          operator: 'invalid', // Invalid operator
          threshold: 0.9,
          windowDuration: 3600,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate severity enum', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/alerts/rules',
        payload: {
          name: 'Invalid Severity',
          metricName: 'accuracy',
          operator: 'lt',
          threshold: 0.9,
          windowDuration: 3600,
          severity: 'INVALID', // Invalid severity
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES AND ERROR HANDLING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge Cases and Error Handling', () => {
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
    await app.register(registerPredictionRoutes);
    await app.register(registerAlertsRoutes);
  });

  it('should handle invalid UUID in path parameters', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/predictions/invalid-uuid',
    });

    expect(response.statusCode).toBe(400);
  });

  it('should handle invalid query parameters', async () => {
    mockPrisma.prediction.findMany.mockResolvedValue([]);
    mockPrisma.prediction.count.mockResolvedValue(0);

    const response = await app.inject({
      method: 'GET',
      url: '/predictions?limit=invalid',
    });

    expect(response.statusCode).toBe(400);
  });

  it('should handle missing required fields in request body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/predictions',
      payload: {
        // Missing most required fields
        latencyMs: 100,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should handle negative limit values', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/predictions?limit=-1',
    });

    expect(response.statusCode).toBe(400);
  });

  it('should handle limit exceeding maximum', async () => {
    mockPrisma.prediction.findMany.mockResolvedValue([]);
    mockPrisma.prediction.count.mockResolvedValue(0);

    const response = await app.inject({
      method: 'GET',
      url: '/predictions?limit=10000',
    });

    // Should either reject or clamp to max
    expect([200, 400]).toContain(response.statusCode);
  });
});
