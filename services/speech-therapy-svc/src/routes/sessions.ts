/**
 * Speech Therapy Sessions Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { SpeechTherapyService } from '../services/speech.service.js';
import { prisma } from '../db.js';

const service = new SpeechTherapyService(prisma);

// Schemas
const createSessionSchema = z.object({
  learnerId: z.string().uuid(),
  therapistId: z.string().uuid().optional(),
  sessionType: z.enum(['ARTICULATION', 'FLUENCY', 'LANGUAGE', 'VOICE', 'PRAGMATICS', 'PHONOLOGY']),
  goalId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const endSessionSchema = z.object({
  notes: z.string().optional(),
  parentSummary: z.string().optional(),
});

const createActivitySchema = z.object({
  activityType: z.enum([
    'WORD_REPETITION', 'SENTENCE_PRACTICE', 'CONVERSATION', 'PICTURE_NAMING',
    'STORY_RETELL', 'READING_ALOUD', 'GAME_BASED', 'BREATHING_EXERCISE', 'PACING_PRACTICE'
  ]),
  name: z.string().min(1),
  targetSounds: z.array(z.string()),
  stimuliList: z.array(z.string()),
  orderIndex: z.number().int().min(0),
});

const recordResultSchema = z.object({
  stimulusIndex: z.number().int().min(0),
  isCorrect: z.boolean(),
  attempts: z.number().int().min(1),
  notes: z.string().optional(),
});

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const sessionsRoutes: FastifyPluginAsync = async (app) => {
  // Create a new session
  app.post<{ Body: z.infer<typeof createSessionSchema> }>('/', async (request, reply) => {
    const user = getUser(request);
    const body = createSessionSchema.parse(request.body);

    const session = await service.createSession(user.tenantId, {
      ...body,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });

    return reply.code(201).send(session);
  });

  // Get sessions for a learner
  app.get<{ Querystring: { learnerId: string; status?: string; limit?: string } }>(
    '/',
    async (request, reply) => {
      const user = getUser(request);
      const { learnerId, status, limit } = request.query;

      if (!learnerId) {
        return reply.code(400).send({ error: 'learnerId is required' });
      }

      const sessions = await service.getSessions(user.tenantId, learnerId, {
        status: status as any,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return reply.send({ sessions });
    }
  );

  // Get a single session
  app.get<{ Params: { sessionId: string } }>('/:sessionId', async (request, reply) => {
    const user = getUser(request);
    const { sessionId } = request.params;

    const session = await service.getSession(user.tenantId, sessionId);
    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    return reply.send(session);
  });

  // Start a session
  app.post<{ Params: { sessionId: string } }>('/:sessionId/start', async (request, reply) => {
    const user = getUser(request);
    const { sessionId } = request.params;

    try {
      const session = await service.startSession(user.tenantId, sessionId);
      return reply.send(session);
    } catch (error) {
      return reply.code(404).send({ error: 'Session not found' });
    }
  });

  // End a session
  app.post<{ Params: { sessionId: string }; Body: z.infer<typeof endSessionSchema> }>(
    '/:sessionId/end',
    async (request, reply) => {
      const user = getUser(request);
      const { sessionId } = request.params;
      const body = endSessionSchema.parse(request.body);

      try {
        const session = await service.endSession(user.tenantId, sessionId, body);
        return reply.send(session);
      } catch (error) {
        return reply.code(404).send({ error: 'Session not found' });
      }
    }
  );

  // Cancel a session
  app.post<{ Params: { sessionId: string }; Body: { reason?: string } }>(
    '/:sessionId/cancel',
    async (request, reply) => {
      const user = getUser(request);
      const { sessionId } = request.params;
      const { reason } = request.body || {};

      try {
        const session = await service.cancelSession(user.tenantId, sessionId, reason);
        return reply.send(session);
      } catch (error) {
        return reply.code(404).send({ error: 'Session not found' });
      }
    }
  );

  // Add an activity to a session
  app.post<{ Params: { sessionId: string }; Body: z.infer<typeof createActivitySchema> }>(
    '/:sessionId/activities',
    async (request, reply) => {
      const user = getUser(request);
      const { sessionId } = request.params;
      const body = createActivitySchema.parse(request.body);

      try {
        const activity = await service.createActivity(user.tenantId, {
          sessionId,
          ...body,
        });
        return reply.code(201).send(activity);
      } catch (error) {
        return reply.code(404).send({ error: 'Session not found' });
      }
    }
  );

  // Record result for an activity
  app.post<{ Params: { sessionId: string; activityId: string }; Body: z.infer<typeof recordResultSchema> }>(
    '/:sessionId/activities/:activityId/results',
    async (request, reply) => {
      const { activityId } = request.params;
      const body = recordResultSchema.parse(request.body);

      try {
        const activity = await service.recordActivityResult(activityId, body.stimulusIndex, {
          isCorrect: body.isCorrect,
          attempts: body.attempts,
          notes: body.notes,
        });
        return reply.send(activity);
      } catch (error) {
        return reply.code(404).send({ error: 'Activity not found' });
      }
    }
  );

  // Complete an activity
  app.post<{ Params: { sessionId: string; activityId: string }; Body: { durationSec: number } }>(
    '/:sessionId/activities/:activityId/complete',
    async (request, reply) => {
      const { activityId } = request.params;
      const { durationSec } = request.body;

      try {
        const activity = await service.completeActivity(activityId, durationSec);
        return reply.send(activity);
      } catch (error) {
        return reply.code(404).send({ error: 'Activity not found' });
      }
    }
  );

  // Get session recordings
  app.get<{ Params: { sessionId: string } }>(
    '/:sessionId/recordings',
    async (request, reply) => {
      const user = getUser(request);
      const { sessionId } = request.params;

      const recordings = await service.getSessionRecordings(user.tenantId, sessionId);
      return reply.send({ recordings });
    }
  );
};
