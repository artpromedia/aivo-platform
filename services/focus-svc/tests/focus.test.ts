import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import supertest from 'supertest';

import { buildApp } from '../src/app.js';
import { sessionServiceClient } from '../src/services/sessionServiceClient.js';
import { pingStore } from '../src/routes/focus.js';

describe('Focus API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Clear ping store between tests
    pingStore.clear();
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await supertest(app.server).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok', service: 'focus-svc' });
    });
  });

  describe('POST /focus/ping', () => {
    it('should accept valid focus ping', async () => {
      const ping = {
        sessionId: '11111111-1111-1111-1111-111111111111',
        learnerId: '22222222-2222-2222-2222-222222222222',
        timestamp: new Date().toISOString(),
        activityId: 'activity-123',
        idleMs: 5000,
        appInBackground: false,
      };

      const response = await supertest(app.server).post('/focus/ping').send(ping);

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
      expect(response.body.detection).toBeDefined();
    });

    it('should return detection result with focus loss', async () => {
      // Send multiple pings with frustrated mood
      const sessionId = '11111111-1111-1111-1111-111111111111';
      const basePing = {
        sessionId,
        learnerId: '22222222-2222-2222-2222-222222222222',
        timestamp: new Date().toISOString(),
        activityId: 'activity-123',
        idleMs: 5000,
        appInBackground: false,
      };

      // First two pings to establish baseline
      await supertest(app.server).post('/focus/ping').send(basePing);
      await supertest(app.server).post('/focus/ping').send(basePing);

      // Third ping with frustrated mood
      const response = await supertest(app.server)
        .post('/focus/ping')
        .send({ ...basePing, selfReportedMood: 'frustrated' });

      expect(response.status).toBe(200);
      expect(response.body.detection.focusLossDetected).toBe(true);
      expect(response.body.detection.reasons).toContain('self_reported_frustrated');
    });

    it('should return 400 for invalid ping', async () => {
      const response = await supertest(app.server)
        .post('/focus/ping')
        .send({ sessionId: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
    });
  });

  describe('POST /focus/recommendation', () => {
    it('should return a valid recommendation', async () => {
      const request = {
        sessionId: '11111111-1111-1111-1111-111111111111',
        learnerId: '22222222-2222-2222-2222-222222222222',
        context: {
          gradeBand: 'G6_8',
          mood: 'tired',
        },
      };

      const response = await supertest(app.server).post('/focus/recommendation').send(request);

      expect(response.status).toBe(200);
      expect(response.body.recommendation).toBeDefined();
      expect(response.body.recommendation.activityType).toBeDefined();
      expect(response.body.recommendation.title).toBeDefined();
      expect(response.body.recommendation.description).toBeDefined();
      expect(response.body.recommendation.estimatedDurationSeconds).toBeGreaterThan(0);
    });

    it('should work for K5 grade band', async () => {
      const request = {
        sessionId: '11111111-1111-1111-1111-111111111111',
        learnerId: '22222222-2222-2222-2222-222222222222',
        context: {
          gradeBand: 'K5',
        },
      };

      const response = await supertest(app.server).post('/focus/recommendation').send(request);

      expect(response.status).toBe(200);
      expect(response.body.recommendation).toBeDefined();
    });

    it('should emit FOCUS_INTERVENTION_SHOWN event', async () => {
      const request = {
        sessionId: '11111111-1111-1111-1111-111111111111',
        learnerId: '22222222-2222-2222-2222-222222222222',
        context: {
          gradeBand: 'G6_8',
        },
      };

      await supertest(app.server).post('/focus/recommendation').send(request);

      expect(sessionServiceClient.emitEvent).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        'FOCUS_INTERVENTION_SHOWN',
        expect.objectContaining({
          learnerId: '22222222-2222-2222-2222-222222222222',
          activityType: expect.any(String),
        })
      );
    });
  });

  describe('GET /focus/activities/:gradeBand', () => {
    it('should return activities for valid grade band', async () => {
      const response = await supertest(app.server).get('/focus/activities/K5');

      expect(response.status).toBe(200);
      expect(response.body.gradeBand).toBe('K5');
      expect(response.body.activities).toBeDefined();
      expect(Array.isArray(response.body.activities)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should return 400 for invalid grade band', async () => {
      const response = await supertest(app.server).get('/focus/activities/INVALID');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /focus/break-started', () => {
    it('should log break started event', async () => {
      const request = {
        sessionId: '11111111-1111-1111-1111-111111111111',
        learnerId: '22222222-2222-2222-2222-222222222222',
        activityType: 'breathing',
        activityTitle: 'Box Breathing',
      };

      const response = await supertest(app.server).post('/focus/break-started').send(request);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Break started');

      expect(sessionServiceClient.emitEvent).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        'FOCUS_BREAK_STARTED',
        expect.objectContaining({
          learnerId: '22222222-2222-2222-2222-222222222222',
          activityType: 'breathing',
        })
      );
    });
  });

  describe('POST /focus/break-complete', () => {
    it('should log break completed event with full completion', async () => {
      const request = {
        sessionId: '11111111-1111-1111-1111-111111111111',
        learnerId: '22222222-2222-2222-2222-222222222222',
        activityType: 'breathing',
        completedFully: true,
        helpfulnessRating: 4,
        actualDurationSeconds: 60,
      };

      const response = await supertest(app.server).post('/focus/break-complete').send(request);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Great job');

      expect(sessionServiceClient.emitEvent).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        'FOCUS_BREAK_ENDED',
        expect.objectContaining({
          completedFully: true,
          helpfulnessRating: 4,
          actualDurationSeconds: 60,
        })
      );
    });

    it('should log break completed event with partial completion', async () => {
      const request = {
        sessionId: '11111111-1111-1111-1111-111111111111',
        learnerId: '22222222-2222-2222-2222-222222222222',
        activityType: 'stretching',
        completedFully: false,
      };

      const response = await supertest(app.server).post('/focus/break-complete').send(request);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("That's okay");
    });
  });

  describe('POST /focus/mood-report', () => {
    it('should accept mood report and suggest break for negative moods', async () => {
      const request = {
        sessionId: '11111111-1111-1111-1111-111111111111',
        learnerId: '22222222-2222-2222-2222-222222222222',
        mood: 'frustrated',
      };

      const response = await supertest(app.server).post('/focus/mood-report').send(request);

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
      expect(response.body.mood).toBe('frustrated');
      expect(response.body.shouldOfferBreak).toBe(true);
    });

    it('should not suggest break for positive moods', async () => {
      const request = {
        sessionId: '11111111-1111-1111-1111-111111111111',
        learnerId: '22222222-2222-2222-2222-222222222222',
        mood: 'happy',
      };

      const response = await supertest(app.server).post('/focus/mood-report').send(request);

      expect(response.status).toBe(200);
      expect(response.body.shouldOfferBreak).toBe(false);
    });
  });

  describe('POST /focus/analyze', () => {
    it('should analyze focus state for session', async () => {
      const sessionId = '11111111-1111-1111-1111-111111111111';

      // Send some pings first
      const basePing = {
        sessionId,
        learnerId: '22222222-2222-2222-2222-222222222222',
        timestamp: new Date().toISOString(),
        activityId: 'activity-123',
        idleMs: 5000,
        appInBackground: false,
      };

      await supertest(app.server).post('/focus/ping').send(basePing);
      await supertest(app.server).post('/focus/ping').send(basePing);
      await supertest(app.server).post('/focus/ping').send(basePing);

      const response = await supertest(app.server).post('/focus/analyze').send({ sessionId });

      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBe(sessionId);
      expect(response.body.pingSampleCount).toBe(3);
      expect(response.body.detection).toBeDefined();
    });
  });
});
