/**
 * AIVO Audit Service - Correction Request Routes
 *
 * PRD: FERPA right-to-correction request/review endpoints.
 */

import type { FastifyInstance } from 'fastify';

import {
  createCorrectionRequest,
  listCorrectionRequests,
  getCorrectionRequest,
  reviewCorrectionRequest,
} from '../services/correctionService.js';

export async function registerCorrectionRoutes(app: FastifyInstance) {
  // Create a correction request (parent/student)
  app.post('/', async (request, reply) => {
    const { tenantId, userId, email } = (request as any).authContext;
    const body = request.body as any;

    const result = await createCorrectionRequest(tenantId, userId, email, body);
    return reply.status(201).send(result);
  });

  // List correction requests
  app.get('/', async (request, reply) => {
    const { tenantId } = (request as any).authContext;
    const query = request.query as any;

    const result = await listCorrectionRequests(tenantId, {
      status: query.status,
      requestedById: query.requestedById,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });

    return reply.send(result);
  });

  // Get a single correction request
  app.get('/:id', async (request, reply) => {
    const { tenantId } = (request as any).authContext;
    const { id } = request.params as any;

    const result = await getCorrectionRequest(tenantId, id);
    if (!result) {
      return reply.status(404).send({ error: 'Correction request not found' });
    }

    return reply.send(result);
  });

  // Review (approve/deny) a correction request (admin only)
  app.post('/:id/review', async (request, reply) => {
    const { tenantId, userId, email } = (request as any).authContext;
    const { id } = request.params as any;
    const body = request.body as any;

    const result = await reviewCorrectionRequest(tenantId, id, userId, email, body);
    return reply.send(result);
  });
}
