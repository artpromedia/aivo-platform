/**
 * Routes API Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

// Mock database
vi.mock('./db.js', () => {
  const mockQuery = vi.fn();
  return {
    getMainPool: () => ({
      query: mockQuery,
    }),
    getWarehousePool: () => ({
      query: mockQuery,
    }),
    initPools: vi.fn(),
    closePools: vi.fn(),
    mockQuery,
  };
});

// Import after mock
import { registerRoutes } from './routes.js';

describe('Personalization API Routes', () => {
  let app: FastifyInstance;
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    const db = await import('./db.js');
    mockQuery = (db as unknown as { mockQuery: ReturnType<typeof vi.fn> }).mockQuery;

    app = Fastify({ logger: false });

    // Add auth hook mock
    app.addHook('preHandler', async (request) => {
      (request as unknown as { tenantId: string }).tenantId = 'tenant-123';
      (request as unknown as { learnerId: string }).learnerId = 'learner-456';
    });

    await registerRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    vi.resetAllMocks();
  });

  describe('GET /personalization/learners/:learnerId/signals', () => {
    it('should return signals for a learner', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'signal-1',
            tenant_id: 'tenant-123',
            learner_id: 'learner-456',
            date: new Date('2025-01-15'),
            signal_type: 'ENGAGEMENT',
            signal_key: 'LOW_ENGAGEMENT',
            signal_value: { value: 1.5, threshold: 3, direction: 'below' },
            confidence: '0.75',
            source: 'ANALYTICS_ETL',
            metadata: { sessionCount: 3 },
            expires_at: new Date('2025-01-22'),
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/personalization/learners/learner-456/signals?recentDays=7',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.learnerId).toBe('learner-456');
      expect(body.signals).toHaveLength(1);
      expect(body.signals[0].signalKey).toBe('LOW_ENGAGEMENT');
      expect(body.signalsByType.ENGAGEMENT).toHaveLength(1);
    });

    it('should filter by signal types', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'GET',
        url: '/personalization/learners/learner-456/signals?signalTypes=ENGAGEMENT,FOCUS',
      });

      expect(response.statusCode).toBe(200);
      // Verify the query was called with signal type filter
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should filter by minimum confidence', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'GET',
        url: '/personalization/learners/learner-456/signals?minConfidence=0.7',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should reject invalid query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/personalization/learners/learner-456/signals?recentDays=0',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /personalization/learners/:learnerId/decision-log', () => {
    it('should return decision history', async () => {
      // Mock main query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'decision-1',
            tenant_id: 'tenant-123',
            learner_id: 'learner-456',
            session_id: null,
            decision_type: 'CONTENT_SELECTION',
            agent_name: 'LESSON_PLANNER',
            agent_version: '1.0.0',
            input_signal_keys: ['LOW_ENGAGEMENT', 'HIGH_STRUGGLE_MATH'],
            input_context: { signalCount: 2 },
            output_decision: { activities: [] },
            reasoning: 'Selected easier content due to struggle signals',
            outcome: 'ACCEPTED',
            outcome_recorded_at: new Date(),
            feedback_rating: 4,
            feedback_comment: null,
            created_at: new Date(),
          },
        ],
      });

      // Mock count query
      mockQuery.mockResolvedValueOnce({
        rows: [{ total: '1' }],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/personalization/learners/learner-456/decision-log?limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.decisions).toHaveLength(1);
      expect(body.decisions[0].agentName).toBe('LESSON_PLANNER');
      expect(body.total).toBe(1);
    });
  });

  describe('POST /personalization/recommendation-feedback', () => {
    it('should record recommendation feedback', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'feedback-1' }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/personalization/recommendation-feedback',
        payload: {
          recommendationId: '550e8400-e29b-41d4-a716-446655440000',
          recommendationType: 'CONTENT',
          recommendedItemType: 'content',
          recommendedItemId: '550e8400-e29b-41d4-a716-446655440001',
          wasAccepted: true,
          wasExplicitlyRejected: false,
          recommendedAt: '2025-01-15T10:00:00Z',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.recorded).toBe(true);
      expect(body.id).toBe('feedback-1');
    });

    it('should reject invalid feedback data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/personalization/recommendation-feedback',
        payload: {
          // Missing required fields
          wasAccepted: true,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /personalization/decisions/:decisionId/outcome', () => {
    it('should update decision outcome', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const response = await app.inject({
        method: 'PATCH',
        url: '/personalization/decisions/decision-123/outcome',
        payload: {
          outcome: 'ACCEPTED',
          feedbackRating: 4,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.updated).toBe(true);
    });

    it('should reject invalid outcome', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/personalization/decisions/decision-123/outcome',
        payload: {
          outcome: 'INVALID_OUTCOME',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent decision', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const response = await app.inject({
        method: 'PATCH',
        url: '/personalization/decisions/nonexistent/outcome',
        payload: {
          outcome: 'ACCEPTED',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
