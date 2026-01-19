/**
 * AIVO SEL Service - Route Registration
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as selService from '../services/selService.js';

export default async function routes(fastify: FastifyInstance): Promise<void> {
  // Dashboard
  fastify.get('/dashboard', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await selService.getDashboard(tenantId));
  });

  // Student Profiles
  fastify.get('/profiles', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await selService.listStudentProfiles(tenantId, req.query));
  });

  fastify.post('/profiles', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const profile = await selService.createStudentProfile(tenantId, req.body);
    return reply.status(201).send(profile);
  });

  fastify.get('/profiles/:profileId', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { profileId } = req.params as { profileId: string };
    const profile = await selService.getStudentProfile(tenantId, profileId);
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });
    return reply.send(profile);
  });

  fastify.put('/profiles/:profileId', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { profileId } = req.params as { profileId: string };
    const profile = await selService.updateStudentProfile(tenantId, profileId, req.body);
    return reply.send(profile);
  });

  // Check-ins
  fastify.get('/profiles/:profileId/check-ins', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { profileId } = req.params as { profileId: string };
    return reply.send(await selService.getCheckIns(tenantId, profileId, req.query));
  });

  fastify.post('/profiles/:profileId/check-ins', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { profileId } = req.params as { profileId: string };
    const checkIn = await selService.createCheckIn(tenantId, profileId, req.body);
    return reply.status(201).send(checkIn);
  });

  fastify.get('/profiles/:profileId/mood-trends', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { profileId } = req.params as { profileId: string };
    const { days } = req.query as { days?: string };
    return reply.send(await selService.getMoodTrends(tenantId, profileId, days ? Number.parseInt(days) : 30));
  });

  // Assessments
  fastify.post('/profiles/:profileId/assessments', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const { profileId } = req.params as { profileId: string };
    const assessment = await selService.createAssessment(tenantId, profileId, req.body);
    return reply.status(201).send(assessment);
  });

  fastify.post('/assessments/:assessmentId/responses', async (req: FastifyRequest, reply: FastifyReply) => {
    const { assessmentId } = req.params as { assessmentId: string };
    const { itemNumber, response, responseTime } = req.body as any;
    const result = await selService.submitAssessmentResponse(assessmentId, itemNumber, response, responseTime);
    return reply.send(result);
  });

  fastify.post('/assessments/:assessmentId/complete', async (req: FastifyRequest, reply: FastifyReply) => {
    const { assessmentId } = req.params as { assessmentId: string };
    const assessment = await selService.completeAssessment(assessmentId);
    return reply.send(assessment);
  });

  // Activities
  fastify.get('/activities', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await selService.listActivities(tenantId, req.query));
  });

  fastify.post('/profiles/:profileId/activity-completions', async (req: FastifyRequest, reply: FastifyReply) => {
    const { profileId } = req.params as { profileId: string };
    const { activityId, ...input } = req.body as any;
    const completion = await selService.recordActivityCompletion(profileId, activityId, input);
    return reply.status(201).send(completion);
  });

  // Interventions
  fastify.post('/profiles/:profileId/interventions', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { profileId } = req.params as { profileId: string };
    const intervention = await selService.createIntervention(tenantId, profileId, userId, req.body);
    return reply.status(201).send(intervention);
  });

  fastify.post('/interventions/:interventionId/logs', async (req: FastifyRequest, reply: FastifyReply) => {
    const { interventionId } = req.params as { interventionId: string };
    const log = await selService.logInterventionSession(interventionId, req.body);
    return reply.status(201).send(log);
  });

  // Alerts
  fastify.get('/alerts', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenantId;
    return reply.send(await selService.getAlerts(tenantId, req.query));
  });

  fastify.post('/alerts/:alertId/acknowledge', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId;
    const { alertId } = req.params as { alertId: string };
    const alert = await selService.acknowledgeAlert(alertId, userId);
    return reply.send(alert);
  });

  fastify.post('/alerts/:alertId/resolve', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId;
    const { alertId } = req.params as { alertId: string };
    const { resolution } = req.body as { resolution: string };
    const alert = await selService.resolveAlert(alertId, userId, resolution);
    return reply.send(alert);
  });
}
