/**
 * AIVO Audit Service - Policy Routes
 *
 * API endpoints for managing audit policies.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import * as policyService from '../services/policyService.js';
import { CreatePolicySchema } from '../types/index.js';

export async function registerPolicyRoutes(fastify: FastifyInstance) {
  /**
   * POST /audit/policies
   * Create a new audit policy.
   */
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const parseResult = CreatePolicySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid policy',
        details: parseResult.error.errors,
      });
    }

    try {
      const policy = await policyService.createPolicy(
        request.tenantId,
        request.user.sub,
        parseResult.data
      );

      return reply.status(201).send(policy);
    } catch (error) {
      request.log.error({ error }, 'Failed to create policy');

      // Handle unique constraint violation
      if ((error as any).code === 'P2002') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'A policy with this name already exists',
        });
      }

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create policy',
      });
    }
  });

  /**
   * GET /audit/policies
   * List all policies for the tenant.
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Tenant ID required',
      });
    }

    try {
      const policies = await policyService.getPolicies(request.tenantId);

      return reply.status(200).send({ data: policies });
    } catch (error) {
      request.log.error({ error }, 'Failed to list policies');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list policies',
      });
    }
  });

  /**
   * GET /audit/policies/:id
   * Get a single policy by ID.
   */
  fastify.get('/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Tenant ID required',
      });
    }

    try {
      const policy = await policyService.getPolicyById(
        request.tenantId,
        request.params.id
      );

      if (!policy) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Policy not found',
        });
      }

      return reply.status(200).send(policy);
    } catch (error) {
      request.log.error({ error }, 'Failed to get policy');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get policy',
      });
    }
  });

  /**
   * PUT /audit/policies/:id
   * Update a policy.
   */
  fastify.put('/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const parseResult = CreatePolicySchema.partial().safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid policy update',
        details: parseResult.error.errors,
      });
    }

    try {
      const policy = await policyService.updatePolicy(
        request.tenantId,
        request.params.id,
        parseResult.data
      );

      return reply.status(200).send(policy);
    } catch (error) {
      request.log.error({ error }, 'Failed to update policy');

      if ((error as any).code === 'P2025') {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Policy not found',
        });
      }

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update policy',
      });
    }
  });

  /**
   * DELETE /audit/policies/:id
   * Delete a policy.
   */
  fastify.delete('/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    try {
      await policyService.deletePolicy(request.tenantId, request.params.id);

      return reply.status(204).send();
    } catch (error) {
      request.log.error({ error }, 'Failed to delete policy');

      if ((error as any).code === 'P2025') {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Policy not found',
        });
      }

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete policy',
      });
    }
  });
}
