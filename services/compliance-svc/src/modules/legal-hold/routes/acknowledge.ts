/**
 * AIVO Compliance Service - Legal Hold Module – Acknowledgment Routes
 *
 * Public routes for custodians to acknowledge holds (no auth required).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../../prisma.js';
import * as notificationService from '../services/notificationService.js';

const AcknowledgeSchema = z.object({
  certificationText: z.string().min(10),
  signature: z.string().optional(),
  hasQuestions: z.boolean().optional(),
  questions: z.string().optional(),
});

export default async function acknowledgeRoutes(fastify: FastifyInstance): Promise<void> {
  // Get hold info for acknowledgment (public)
  fastify.get('/:holdId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { holdId } = request.params as { holdId: string };
    const { email } = request.query as { email?: string };

    if (!email) {
      return reply.status(400).send({ error: 'Email is required' });
    }

    // Find the hold custodian
    const holdCustodian = await prisma.holdCustodian.findFirst({
      where: {
        holdId,
        custodian: { email: email.toLowerCase() },
      },
      include: {
        hold: {
          select: {
            id: true,
            holdNumber: true,
            name: true,
            description: true,
            scopeDescription: true,
            dataTypes: true,
            dateRangeStart: true,
            dateRangeEnd: true,
            keywords: true,
            acknowledgmentDue: true,
            matter: {
              select: {
                name: true,
              },
            },
          },
        },
        custodian: {
          select: {
            displayName: true,
            email: true,
          },
        },
      },
    });

    if (!holdCustodian) {
      return reply.status(404).send({ error: 'Hold not found for this email' });
    }

    if (holdCustodian.status === 'ACKNOWLEDGED') {
      return reply.send({
        alreadyAcknowledged: true,
        acknowledgedAt: holdCustodian.acknowledgedAt,
        hold: {
          name: holdCustodian.hold.name,
        },
      });
    }

    if (holdCustodian.status === 'RELEASED') {
      return reply.send({
        released: true,
        releasedAt: holdCustodian.releasedAt,
        hold: {
          name: holdCustodian.hold.name,
        },
      });
    }

    return reply.send({
      holdId: holdCustodian.hold.id,
      holdNumber: holdCustodian.hold.holdNumber,
      holdName: holdCustodian.hold.name,
      description: holdCustodian.hold.description,
      scopeDescription: holdCustodian.hold.scopeDescription,
      dataTypes: holdCustodian.hold.dataTypes,
      dateRange: {
        start: holdCustodian.hold.dateRangeStart,
        end: holdCustodian.hold.dateRangeEnd,
      },
      keywords: holdCustodian.hold.keywords,
      acknowledgmentDue: holdCustodian.hold.acknowledgmentDue,
      matterName: holdCustodian.hold.matter.name,
      custodian: {
        name: holdCustodian.custodian.displayName,
        email: holdCustodian.custodian.email,
      },
      status: holdCustodian.status,
    });
  });

  // Submit acknowledgment (public)
  fastify.post('/:holdId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { holdId } = request.params as { holdId: string };
    const { email } = request.query as { email?: string };

    if (!email) {
      return reply.status(400).send({ error: 'Email is required' });
    }

    const parsed = AcknowledgeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    const metadata = {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };

    const result = await notificationService.acknowledgeHold(
      holdId,
      email,
      parsed.data,
      metadata
    );

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({
      success: true,
      acknowledgmentId: result.acknowledgmentId,
      message: 'Thank you for acknowledging this legal hold.',
    });
  });

  // Get acknowledgment certificate (public)
  fastify.get('/:holdId/certificate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { holdId } = request.params as { holdId: string };
    const { email } = request.query as { email?: string };

    if (!email) {
      return reply.status(400).send({ error: 'Email is required' });
    }

    const acknowledgment = await prisma.holdAcknowledgment.findFirst({
      where: {
        holdId,
        custodianEmail: email.toLowerCase(),
      },
      include: {
        hold: {
          select: {
            holdNumber: true,
            name: true,
            matter: { select: { matterNumber: true, name: true } },
          },
        },
      },
    });

    if (!acknowledgment) {
      return reply.status(404).send({ error: 'Acknowledgment not found' });
    }

    return reply.send({
      certificate: {
        holdNumber: acknowledgment.hold.holdNumber,
        holdName: acknowledgment.hold.name,
        matterNumber: acknowledgment.hold.matter.matterNumber,
        matterName: acknowledgment.hold.matter.name,
        custodianName: acknowledgment.custodianName,
        custodianEmail: acknowledgment.custodianEmail,
        acknowledgedAt: acknowledgment.acknowledgedAt,
        certificationText: acknowledgment.certificationText,
        signature: acknowledgment.signature,
      },
    });
  });
}
