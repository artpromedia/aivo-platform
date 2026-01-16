/**
 * AIVO IEP Service - IEP Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as iepService from '../services/iepService.js';

export default async function iepRoutes(fastify: FastifyInstance): Promise<void> {
  // List IEPs
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const result = await iepService.listIEPs(tenantId, request.query);
    return reply.send(result);
  });

  // Create IEP
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    try {
      const iep = await iepService.createIEP(tenantId, userId, request.body);
      return reply.status(201).send(iep);
    } catch (error: any) {
      if (error.code === 'P2002') return reply.status(409).send({ error: 'IEP already exists' });
      throw error;
    }
  });

  // Get IEP
  fastify.get('/:iepId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { iepId } = request.params as { iepId: string };
    const iep = await iepService.getIEP(tenantId, iepId);
    if (!iep) return reply.status(404).send({ error: 'IEP not found' });
    return reply.send(iep);
  });

  // Update IEP
  fastify.put('/:iepId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { iepId } = request.params as { iepId: string };
    try {
      const iep = await iepService.updateIEP(tenantId, iepId, userId, request.body);
      return reply.send(iep);
    } catch (error: any) {
      if (error.message === 'IEP not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });

  // Submit IEP
  fastify.post('/:iepId/submit', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { iepId } = request.params as { iepId: string };
    try {
      const iep = await iepService.submitIEP(tenantId, iepId, userId);
      return reply.send(iep);
    } catch (error: any) {
      if (error.message === 'IEP not found') return reply.status(404).send({ error: error.message });
      return reply.status(400).send({ error: error.message });
    }
  });

  // Approve IEP
  fastify.post('/:iepId/approve', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { iepId } = request.params as { iepId: string };
    try {
      const iep = await iepService.approveIEP(tenantId, iepId, userId);
      return reply.send(iep);
    } catch (error: any) {
      if (error.message === 'IEP not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });

  // Add goal
  fastify.post('/:iepId/goals', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { iepId } = request.params as { iepId: string };
    try {
      const goal = await iepService.addGoal(tenantId, iepId, request.body);
      return reply.status(201).send(goal);
    } catch (error: any) {
      if (error.message === 'IEP not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });

  // Update goal
  fastify.put('/:iepId/goals/:goalId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { goalId } = request.params as { goalId: string };
    try {
      const goal = await iepService.updateGoal(tenantId, goalId, request.body);
      return reply.send(goal);
    } catch (error: any) {
      if (error.message === 'Goal not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });

  // Record progress
  fastify.post('/:iepId/goals/:goalId/progress', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { goalId } = request.params as { goalId: string };
    try {
      const progress = await iepService.recordProgress(tenantId, goalId, request.body);
      return reply.status(201).send(progress);
    } catch (error: any) {
      if (error.message === 'Goal not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });

  // Add accommodation
  fastify.post('/:iepId/accommodations', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { iepId } = request.params as { iepId: string };
    try {
      const accommodation = await iepService.addAccommodation(tenantId, iepId, request.body);
      return reply.status(201).send(accommodation);
    } catch (error: any) {
      if (error.message === 'IEP not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });

  // Add modification
  fastify.post('/:iepId/modifications', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { iepId } = request.params as { iepId: string };
    try {
      const modification = await iepService.addModification(tenantId, iepId, request.body);
      return reply.status(201).send(modification);
    } catch (error: any) {
      if (error.message === 'IEP not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });

  // Add service
  fastify.post('/:iepId/services', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { iepId } = request.params as { iepId: string };
    try {
      const service = await iepService.addService(tenantId, iepId, request.body);
      return reply.status(201).send(service);
    } catch (error: any) {
      if (error.message === 'IEP not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });

  // Log service session
  fastify.post('/:iepId/services/:serviceId/logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { serviceId } = request.params as { serviceId: string };
    try {
      const log = await iepService.logServiceSession(tenantId, serviceId, request.body);
      return reply.status(201).send(log);
    } catch (error: any) {
      if (error.message === 'Service not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });

  // Schedule meeting
  fastify.post('/:iepId/meetings', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { iepId } = request.params as { iepId: string };
    try {
      const meeting = await iepService.scheduleMeeting(tenantId, iepId, userId, request.body);
      return reply.status(201).send(meeting);
    } catch (error: any) {
      if (error.message === 'IEP not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });

  // Complete meeting
  fastify.post('/:iepId/meetings/:meetingId/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { meetingId } = request.params as { meetingId: string };
    try {
      const meeting = await iepService.completeMeeting(tenantId, meetingId, request.body);
      return reply.send(meeting);
    } catch (error: any) {
      if (error.message === 'Meeting not found') return reply.status(404).send({ error: error.message });
      throw error;
    }
  });

  // Dashboard
  fastify.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const dashboard = await iepService.getDashboard(tenantId);
    return reply.send(dashboard);
  });
}
