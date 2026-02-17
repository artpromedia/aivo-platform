/**
 * AIVO Compliance Service - Legal Hold Module – Hold Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as holdService from '../services/holdService.js';
import * as notificationService from '../services/notificationService.js';

const CreateHoldSchema = z.object({
  matterId: z.string().uuid(),
  holdNumber: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  scopeDescription: z.string().optional(),
  dataTypes: z.array(z.string()).optional(),
  dateRangeStart: z.string().optional(),
  dateRangeEnd: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  notificationSubject: z.string().optional(),
  notificationBody: z.string().optional(),
  reminderFrequency: z.number().int().min(1).optional(),
  escalationAfter: z.number().int().min(1).optional(),
  acknowledgmentDue: z.string().optional(),
  complianceDeadline: z.string().optional(),
  isConfidential: z.boolean().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateHoldSchema = CreateHoldSchema.partial().omit({ matterId: true, holdNumber: true }).extend({
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ISSUED', 'ACTIVE', 'SUSPENDED', 'RELEASED', 'ARCHIVED']).optional(),
});

const IssueHoldSchema = z.object({
  effectiveAt: z.string().optional(),
  custodianIds: z.array(z.string().uuid()).min(1),
  dataSourceIds: z.array(z.string().uuid()).optional(),
  sendNotifications: z.boolean().optional().default(true),
});

const ReleaseHoldSchema = z.object({
  releaseType: z.enum(['FULL', 'PARTIAL_CUSTODIAN', 'PARTIAL_SOURCE', 'PARTIAL_DATE_RANGE']),
  reason: z.string().min(1),
  notes: z.string().optional(),
  custodianIds: z.array(z.string().uuid()).optional(),
  dataSourceIds: z.array(z.string().uuid()).optional(),
});

export default async function holdRoutes(fastify: FastifyInstance): Promise<void> {
  // List holds
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const query = request.query as any;
    const result = await holdService.listHolds(tenantId, query);
    return reply.send(result);
  });

  // Get dashboard
  fastify.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const dashboard = await holdService.getHoldsDashboard(tenantId);
    return reply.send(dashboard);
  });

  // Create hold
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;

    const parsed = CreateHoldSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    try {
      const hold = await holdService.createHold(tenantId, userId, parsed.data);
      return reply.status(201).send(hold);
    } catch (error: any) {
      if (error.message === 'Matter not found') {
        return reply.status(404).send({ error: error.message });
      }
      if (error.code === 'P2002') {
        return reply.status(409).send({ error: 'Hold number already exists' });
      }
      throw error;
    }
  });

  // Get hold
  fastify.get('/:holdId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { holdId } = request.params as { holdId: string };

    const hold = await holdService.getHold(tenantId, holdId);
    if (!hold) {
      return reply.status(404).send({ error: 'Hold not found' });
    }
    return reply.send(hold);
  });

  // Update hold
  fastify.put('/:holdId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { holdId } = request.params as { holdId: string };

    const parsed = UpdateHoldSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    try {
      const hold = await holdService.updateHold(tenantId, holdId, userId, parsed.data);
      return reply.send(hold);
    } catch (error: any) {
      if (error.message === 'Hold not found') {
        return reply.status(404).send({ error: error.message });
      }
      if (error.message.includes('Cannot modify')) {
        return reply.status(409).send({ error: error.message });
      }
      throw error;
    }
  });

  // Issue hold
  fastify.post('/:holdId/issue', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { holdId } = request.params as { holdId: string };

    const parsed = IssueHoldSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    try {
      const hold = await holdService.issueHold(tenantId, holdId, userId, parsed.data);

      // Send notifications if requested
      if (parsed.data.sendNotifications) {
        await notificationService.sendBulkNotifications(
          holdId,
          parsed.data.custodianIds,
          'INITIAL_NOTICE'
        );
      }

      return reply.send(hold);
    } catch (error: any) {
      if (error.message === 'Hold not found') {
        return reply.status(404).send({ error: error.message });
      }
      if (error.message.includes('Cannot issue')) {
        return reply.status(409).send({ error: error.message });
      }
      throw error;
    }
  });

  // Release hold
  fastify.post('/:holdId/release', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { holdId } = request.params as { holdId: string };

    const parsed = ReleaseHoldSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    try {
      const release = await holdService.releaseHold(tenantId, holdId, userId, parsed.data);
      return reply.send(release);
    } catch (error: any) {
      if (error.message === 'Hold not found') {
        return reply.status(404).send({ error: error.message });
      }
      if (error.message.includes('Cannot release')) {
        return reply.status(409).send({ error: error.message });
      }
      throw error;
    }
  });

  // Get compliance summary
  fastify.get('/:holdId/compliance', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { holdId } = request.params as { holdId: string };

    const compliance = await holdService.getHoldCompliance(tenantId, holdId);
    if (!compliance) {
      return reply.status(404).send({ error: 'Hold not found' });
    }
    return reply.send(compliance);
  });

  // Get audit log
  fastify.get('/:holdId/audit', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { holdId } = request.params as { holdId: string };
    const { page, pageSize } = request.query as any;

    try {
      const audit = await holdService.getHoldAuditLog(tenantId, holdId, { page, pageSize });
      return reply.send(audit);
    } catch (error: any) {
      if (error.message === 'Hold not found') {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  // Add custodian to hold
  fastify.post('/:holdId/custodians', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { holdId } = request.params as { holdId: string };
    const { custodianId, notes, sendNotification } = request.body as any;

    if (!custodianId) {
      return reply.status(400).send({ error: 'custodianId is required' });
    }

    try {
      const result = await holdService.addCustodianToHold(tenantId, holdId, custodianId, userId, {
        notes,
        sendNotification,
      });

      if (sendNotification) {
        await notificationService.sendHoldNotification(holdId, custodianId, 'INITIAL_NOTICE');
      }

      return reply.status(201).send(result);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  // Remove custodian from hold
  fastify.delete('/:holdId/custodians/:custodianId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { holdId, custodianId } = request.params as { holdId: string; custodianId: string };
    const { reason } = request.query as any;

    try {
      await holdService.removeCustodianFromHold(tenantId, holdId, custodianId, userId, reason || 'Released');
      return reply.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  // Send notifications
  fastify.post('/:holdId/notify', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { holdId } = request.params as { holdId: string };
    const { notificationType, custodianIds, customSubject, customBody } = request.body as any;

    // Verify hold exists
    const hold = await holdService.getHold(tenantId, holdId);
    if (!hold) {
      return reply.status(404).send({ error: 'Hold not found' });
    }

    const targetCustodians = custodianIds || hold.custodians.map((c: any) => c.custodianId);
    const result = await notificationService.sendBulkNotifications(
      holdId,
      targetCustodians,
      notificationType || 'REMINDER',
      { customSubject, customBody }
    );

    return reply.send(result);
  });

  // Get notifications
  fastify.get('/:holdId/notifications', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { holdId } = request.params as { holdId: string };
    const { page, pageSize } = request.query as any;

    try {
      const notifications = await notificationService.getNotificationHistory(tenantId, holdId, { page, pageSize });
      return reply.send(notifications);
    } catch (error: any) {
      if (error.message === 'Hold not found') {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  // Get acknowledgments
  fastify.get('/:holdId/acknowledgments', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { holdId } = request.params as { holdId: string };
    const { page, pageSize } = request.query as any;

    try {
      const acknowledgments = await notificationService.getAcknowledgments(tenantId, holdId, { page, pageSize });
      return reply.send(acknowledgments);
    } catch (error: any) {
      if (error.message === 'Hold not found') {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });
}
