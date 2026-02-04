/**
 * AIVO SEL Service - Route Registration
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Ensure the FastifyRequest type augmentation is imported
import '../middleware/auth.js';

import {
  // Profile schemas
  profileIdParamsSchema,
  listProfilesQuerySchema,
  createProfileSchema,
  updateProfileSchema,
  // Check-in schemas
  getCheckInsQuerySchema,
  moodTrendsQuerySchema,
  createCheckInSchema,
  // Assessment schemas
  assessmentIdParamsSchema,
  createAssessmentSchema,
  submitResponseSchema,
  // Intervention schemas
  interventionIdParamsSchema,
  createInterventionSchema,
  logSessionSchema,
  // Alert schemas
  alertIdParamsSchema,
  getAlertsQuerySchema,
  resolveAlertSchema,
  // Activity schemas
  listActivitiesQuerySchema,
  recordCompletionSchema,
} from '../schemas/index.js';
import * as selService from '../services/selService.js';

// Helper function to send validation errors
function sendValidationError(reply: FastifyReply, error: { issues: unknown[] }) {
  return reply.status(400).send({
    error: 'Validation Error',
    details: error.issues,
  });
}

export default async function routes(fastify: FastifyInstance): Promise<void> {
  // Dashboard
  fastify.get('/dashboard', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    return reply.send(await selService.getDashboard(tenantId));
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // STUDENT PROFILES
  // ══════════════════════════════════════════════════════════════════════════════

  fastify.get('/profiles', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    const queryResult = listProfilesQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return sendValidationError(reply, queryResult.error);
    }
    return reply.send(await selService.listStudentProfiles(tenantId, queryResult.data));
  });

  fastify.post('/profiles', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    const bodyResult = createProfileSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return sendValidationError(reply, bodyResult.error);
    }
    const profile = await selService.createStudentProfile(tenantId, bodyResult.data);
    return reply.status(201).send(profile);
  });

  fastify.get('/profiles/:profileId', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    const paramsResult = profileIdParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error);
    }
    const profile = await selService.getStudentProfile(tenantId, paramsResult.data.profileId);
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });
    return reply.send(profile);
  });

  fastify.put('/profiles/:profileId', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    const paramsResult = profileIdParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error);
    }
    const bodyResult = updateProfileSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return sendValidationError(reply, bodyResult.error);
    }
    const profile = await selService.updateStudentProfile(
      tenantId,
      paramsResult.data.profileId,
      bodyResult.data
    );
    return reply.send(profile);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // CHECK-INS
  // ══════════════════════════════════════════════════════════════════════════════

  fastify.get(
    '/profiles/:profileId/check-ins',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const tenantId = req.tenantId;
      const paramsResult = profileIdParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error);
      }
      const queryResult = getCheckInsQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return sendValidationError(reply, queryResult.error);
      }
      return reply.send(
        await selService.getCheckIns(tenantId, paramsResult.data.profileId, queryResult.data)
      );
    }
  );

  fastify.post(
    '/profiles/:profileId/check-ins',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const tenantId = req.tenantId;
      const paramsResult = profileIdParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error);
      }
      const bodyResult = createCheckInSchema.safeParse(req.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error);
      }
      const checkIn = await selService.createCheckIn(
        tenantId,
        paramsResult.data.profileId,
        bodyResult.data
      );
      return reply.status(201).send(checkIn);
    }
  );

  fastify.get(
    '/profiles/:profileId/mood-trends',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const tenantId = req.tenantId;
      const paramsResult = profileIdParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error);
      }
      const queryResult = moodTrendsQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return sendValidationError(reply, queryResult.error);
      }
      return reply.send(
        await selService.getMoodTrends(tenantId, paramsResult.data.profileId, queryResult.data.days)
      );
    }
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // ASSESSMENTS
  // ══════════════════════════════════════════════════════════════════════════════

  fastify.post(
    '/profiles/:profileId/assessments',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const tenantId = req.tenantId;
      const paramsResult = profileIdParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error);
      }
      const bodyResult = createAssessmentSchema.safeParse(req.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error);
      }
      const assessment = await selService.createAssessment(
        tenantId,
        paramsResult.data.profileId,
        bodyResult.data
      );
      return reply.status(201).send(assessment);
    }
  );

  fastify.post(
    '/assessments/:assessmentId/responses',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const paramsResult = assessmentIdParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error);
      }
      const bodyResult = submitResponseSchema.safeParse(req.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error);
      }
      const { itemNumber, response, responseTime } = bodyResult.data;
      const result = await selService.submitAssessmentResponse(
        paramsResult.data.assessmentId,
        itemNumber,
        response,
        responseTime
      );
      return reply.send(result);
    }
  );

  fastify.post(
    '/assessments/:assessmentId/complete',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const paramsResult = assessmentIdParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error);
      }
      const assessment = await selService.completeAssessment(paramsResult.data.assessmentId);
      return reply.send(assessment);
    }
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // ACTIVITIES
  // ══════════════════════════════════════════════════════════════════════════════

  fastify.get('/activities', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    const queryResult = listActivitiesQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return sendValidationError(reply, queryResult.error);
    }
    return reply.send(await selService.listActivities(tenantId, queryResult.data));
  });

  fastify.post(
    '/profiles/:profileId/activity-completions',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const paramsResult = profileIdParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error);
      }
      const bodyResult = recordCompletionSchema.safeParse(req.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error);
      }
      const { activityId, ...input } = bodyResult.data;
      const completion = await selService.recordActivityCompletion(
        paramsResult.data.profileId,
        activityId,
        input
      );
      return reply.status(201).send(completion);
    }
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // INTERVENTIONS
  // ══════════════════════════════════════════════════════════════════════════════

  fastify.post(
    '/profiles/:profileId/interventions',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const tenantId = req.tenantId;
      const userId = req.userId;
      const paramsResult = profileIdParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error);
      }
      const bodyResult = createInterventionSchema.safeParse(req.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error);
      }
      const intervention = await selService.createIntervention(
        tenantId,
        paramsResult.data.profileId,
        userId,
        bodyResult.data
      );
      return reply.status(201).send(intervention);
    }
  );

  fastify.post(
    '/interventions/:interventionId/logs',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const paramsResult = interventionIdParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error);
      }
      const bodyResult = logSessionSchema.safeParse(req.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error);
      }
      const log = await selService.logInterventionSession(
        paramsResult.data.interventionId,
        bodyResult.data
      );
      return reply.status(201).send(log);
    }
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // ALERTS
  // ══════════════════════════════════════════════════════════════════════════════

  fastify.get('/alerts', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    const queryResult = getAlertsQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return sendValidationError(reply, queryResult.error);
    }
    return reply.send(await selService.getAlerts(tenantId, queryResult.data));
  });

  fastify.post('/alerts/:alertId/acknowledge', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.userId;
    const paramsResult = alertIdParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error);
    }
    const alert = await selService.acknowledgeAlert(paramsResult.data.alertId, userId);
    return reply.send(alert);
  });

  fastify.post('/alerts/:alertId/resolve', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.userId;
    const paramsResult = alertIdParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error);
    }
    const bodyResult = resolveAlertSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return sendValidationError(reply, bodyResult.error);
    }
    const alert = await selService.resolveAlert(
      paramsResult.data.alertId,
      userId,
      bodyResult.data.resolution
    );
    return reply.send(alert);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // MOBILE CLIENT COMPATIBILITY ROUTES
  // These routes provide backward compatibility for the mobile SEL client
  // which uses a flat API design with query parameters instead of path params
  // ══════════════════════════════════════════════════════════════════════════════

  // Mobile: POST /api/sel/mood-checkins -> internally routes to /profiles/:profileId/check-ins
  fastify.post('/mood-checkins', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    const body = req.body as {
      learnerId?: string;
      mood?: string;
      intensity?: number;
      triggers?: string[];
      notes?: string;
      copingStrategiesUsed?: string[];
    };

    if (!body.learnerId) {
      return reply.status(400).send({ error: 'learnerId is required' });
    }

    const bodyResult = createCheckInSchema.safeParse({
      mood: body.mood,
      intensity: body.intensity,
      triggers: body.triggers,
      notes: body.notes,
      copingStrategiesUsed: body.copingStrategiesUsed,
    });
    if (!bodyResult.success) {
      return sendValidationError(reply, bodyResult.error);
    }

    const checkIn = await selService.createCheckIn(tenantId, body.learnerId, bodyResult.data);
    return reply.status(201).send({ data: checkIn });
  });

  // Mobile: GET /api/sel/mood-checkins?learnerId=xxx&limit=30
  fastify.get('/mood-checkins', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    const query = req.query as { learnerId?: string; limit?: string };

    if (!query.learnerId) {
      return reply.status(400).send({ error: 'learnerId query parameter is required' });
    }

    const queryResult = getCheckInsQuerySchema.safeParse({
      limit: query.limit ? Number.parseInt(query.limit, 10) : 30,
    });
    if (!queryResult.success) {
      return sendValidationError(reply, queryResult.error);
    }

    const checkIns = await selService.getCheckIns(tenantId, query.learnerId, queryResult.data);
    return reply.send({ data: checkIns });
  });

  // Mobile: GET /api/sel/regulation-strategies -> maps to /activities with type filter
  fastify.get('/regulation-strategies', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    const query = req.query as { category?: string; difficulty?: string };

    const queryResult = listActivitiesQuerySchema.safeParse({
      type: 'COPING_STRATEGY',
      category: query.category,
      difficulty: query.difficulty,
    });
    if (!queryResult.success) {
      return sendValidationError(reply, queryResult.error);
    }

    const activities = await selService.listActivities(tenantId, queryResult.data);
    return reply.send({ data: activities });
  });

  // Mobile: GET /api/sel/regulation-strategies/:strategyId
  fastify.get(
    '/regulation-strategies/:strategyId',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const tenantId = req.tenantId;
      const params = req.params as { strategyId: string };

      const activity = await selService.getActivity(tenantId, params.strategyId);
      if (!activity) {
        return reply.status(404).send({ error: 'Strategy not found' });
      }
      return reply.send({ data: activity });
    }
  );

  // Mobile: POST /api/sel/strategy-usage
  fastify.post('/strategy-usage', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as {
      learnerId?: string;
      strategyId?: string;
      effectiveness?: number;
      notes?: string;
    };

    if (!body.learnerId || !body.strategyId) {
      return reply.status(400).send({ error: 'learnerId and strategyId are required' });
    }

    const bodyResult = recordCompletionSchema.safeParse({
      activityId: body.strategyId,
      effectiveness: body.effectiveness,
      notes: body.notes,
    });
    if (!bodyResult.success) {
      return sendValidationError(reply, bodyResult.error);
    }

    const { activityId, ...input } = bodyResult.data;
    const completion = await selService.recordActivityCompletion(body.learnerId, activityId, input);
    return reply.status(201).send({ data: completion });
  });

  // Mobile: POST /api/sel/regulation-strategies/:strategyId/favorite
  fastify.post(
    '/regulation-strategies/:strategyId/favorite',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const params = req.params as { strategyId: string };
      const body = req.body as { learnerId?: string; favorite?: boolean };

      if (!body.learnerId) {
        return reply.status(400).send({ error: 'learnerId is required' });
      }

      await selService.toggleActivityFavorite(
        body.learnerId,
        params.strategyId,
        body.favorite ?? true
      );
      return reply.send({ success: true });
    }
  );

  // Mobile: GET /api/sel/mindfulness
  fastify.get('/mindfulness', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    const query = req.query as { type?: string; maxDuration?: string };

    const queryResult = listActivitiesQuerySchema.safeParse({
      type: 'MINDFULNESS',
      subtype: query.type,
      maxDuration: query.maxDuration ? Number.parseInt(query.maxDuration, 10) : undefined,
    });
    if (!queryResult.success) {
      return sendValidationError(reply, queryResult.error);
    }

    const activities = await selService.listActivities(tenantId, queryResult.data);
    return reply.send({ data: activities });
  });

  // Mobile: POST /api/sel/mindfulness/:exerciseId/complete
  fastify.post(
    '/mindfulness/:exerciseId/complete',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const params = req.params as { exerciseId: string };
      const body = req.body as { learnerId?: string; durationSeconds?: number; rating?: number };

      if (!body.learnerId) {
        return reply.status(400).send({ error: 'learnerId is required' });
      }

      const bodyResult = recordCompletionSchema.safeParse({
        activityId: params.exerciseId,
        duration: body.durationSeconds,
        rating: body.rating,
      });
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error);
      }

      const { activityId, ...input } = bodyResult.data;
      const completion = await selService.recordActivityCompletion(
        body.learnerId,
        activityId,
        input
      );
      return reply.status(201).send({ data: completion });
    }
  );

  // Mobile: GET /api/sel/social-scenarios
  fastify.get('/social-scenarios', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    const query = req.query as { category?: string };

    const queryResult = listActivitiesQuerySchema.safeParse({
      type: 'SOCIAL_SCENARIO',
      category: query.category,
    });
    if (!queryResult.success) {
      return sendValidationError(reply, queryResult.error);
    }

    const activities = await selService.listActivities(tenantId, queryResult.data);
    return reply.send({ data: activities });
  });

  // Mobile: POST /api/sel/social-scenarios/:scenarioId/answer
  fastify.post(
    '/social-scenarios/:scenarioId/answer',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const params = req.params as { scenarioId: string };
      const body = req.body as { learnerId?: string; choiceId?: string };

      if (!body.learnerId || !body.choiceId) {
        return reply.status(400).send({ error: 'learnerId and choiceId are required' });
      }

      const result = await selService.submitScenarioResponse(
        body.learnerId,
        params.scenarioId,
        body.choiceId
      );
      return reply.send(result);
    }
  );

  // Mobile: GET /api/sel/journal?learnerId=xxx&limit=20
  fastify.get('/journal', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    const query = req.query as { learnerId?: string; limit?: string };

    if (!query.learnerId) {
      return reply.status(400).send({ error: 'learnerId query parameter is required' });
    }

    const entries = await selService.getJournalEntries(tenantId, query.learnerId, {
      limit: query.limit ? Number.parseInt(query.limit, 10) : 20,
    });
    return reply.send({ data: entries });
  });

  // Mobile: POST /api/sel/journal
  fastify.post('/journal', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    const body = req.body as {
      learnerId?: string;
      content?: string;
      mood?: string;
      tags?: string[];
    };

    if (!body.learnerId || !body.content) {
      return reply.status(400).send({ error: 'learnerId and content are required' });
    }

    const entry = await selService.createJournalEntry(tenantId, body.learnerId, {
      content: body.content,
      mood: body.mood ?? undefined,
      tags: body.tags ?? undefined,
    });
    return reply.status(201).send({ data: entry });
  });

  // Mobile: DELETE /api/sel/journal/:entryId
  fastify.delete('/journal/:entryId', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = req.params as { entryId: string };

    await selService.deleteJournalEntry(params.entryId);
    return reply.status(204).send();
  });

  // Mobile: GET /api/sel/progress/:learnerId
  fastify.get('/progress/:learnerId', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = req.tenantId;
    const params = req.params as { learnerId: string };

    const progress = await selService.getLearnerProgress(tenantId, params.learnerId);
    return reply.send({ data: progress });
  });
}
