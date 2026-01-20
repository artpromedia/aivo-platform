/**
 * AIVO SEL Service - Route Registration
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as selService from '../services/selService.js';
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
    const tenantId = (req as any).tenantId;
    return reply.send(await selService.getDashboard(tenantId));
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // STUDENT PROFILES
  // ══════════════════════════════════════════════════════════════════════════════

  fastify.get('/profiles', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const queryResult = listProfilesQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return sendValidationError(reply, queryResult.error);
    }
    return reply.send(await selService.listStudentProfiles(tenantId, queryResult.data));
  });

  fastify.post('/profiles', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const bodyResult = createProfileSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return sendValidationError(reply, bodyResult.error);
    }
    const profile = await selService.createStudentProfile(tenantId, bodyResult.data);
    return reply.status(201).send(profile);
  });

  fastify.get('/profiles/:profileId', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const paramsResult = profileIdParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error);
    }
    const profile = await selService.getStudentProfile(tenantId, paramsResult.data.profileId);
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });
    return reply.send(profile);
  });

  fastify.put('/profiles/:profileId', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
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

  fastify.get('/profiles/:profileId/check-ins', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
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
  });

  fastify.post('/profiles/:profileId/check-ins', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
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
  });

  fastify.get('/profiles/:profileId/mood-trends', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
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
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ASSESSMENTS
  // ══════════════════════════════════════════════════════════════════════════════

  fastify.post('/profiles/:profileId/assessments', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
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
  });

  fastify.post('/assessments/:assessmentId/responses', async (req: FastifyRequest, reply: FastifyReply) => {
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
  });

  fastify.post('/assessments/:assessmentId/complete', async (req: FastifyRequest, reply: FastifyReply) => {
    const paramsResult = assessmentIdParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error);
    }
    const assessment = await selService.completeAssessment(paramsResult.data.assessmentId);
    return reply.send(assessment);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ACTIVITIES
  // ══════════════════════════════════════════════════════════════════════════════

  fastify.get('/activities', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const queryResult = listActivitiesQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return sendValidationError(reply, queryResult.error);
    }
    return reply.send(await selService.listActivities(tenantId, queryResult.data));
  });

  fastify.post('/profiles/:profileId/activity-completions', async (req: FastifyRequest, reply: FastifyReply) => {
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
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // INTERVENTIONS
  // ══════════════════════════════════════════════════════════════════════════════

  fastify.post('/profiles/:profileId/interventions', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
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
  });

  fastify.post('/interventions/:interventionId/logs', async (req: FastifyRequest, reply: FastifyReply) => {
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
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ALERTS
  // ══════════════════════════════════════════════════════════════════════════════

  fastify.get('/alerts', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const queryResult = getAlertsQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return sendValidationError(reply, queryResult.error);
    }
    return reply.send(await selService.getAlerts(tenantId, queryResult.data));
  });

  fastify.post('/alerts/:alertId/acknowledge', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId;
    const paramsResult = alertIdParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error);
    }
    const alert = await selService.acknowledgeAlert(paramsResult.data.alertId, userId);
    return reply.send(alert);
  });

  fastify.post('/alerts/:alertId/resolve', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId;
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
}
