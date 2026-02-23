/**
 * SCIM 2.0 API Routes
 *
 * Implements RFC 7644 (SCIM Protocol) endpoints.
 * All routes are authenticated via SCIM Bearer tokens.
 * All responses use application/scim+json content type.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { prisma } from '../prisma.js';

import { ScimService, ScimNotFoundError, ScimConflictError } from './scim.service.js';
import { ScimTokenService } from './scim-token.service.js';
import { SCIM_SCHEMAS, ScimPatchOpSchema, type ScimUser, type ScimPatchOp } from './scim.types.js';

interface ScimQueryParams {
  filter?: string;
  startIndex?: string;
  count?: string;
}

interface IdParams {
  id: string;
}

function createScimError(status: number, detail: string, scimType?: string) {
  return {
    schemas: [SCIM_SCHEMAS.ERROR],
    detail,
    status: String(status),
    ...(scimType && { scimType }),
  };
}

/**
 * Register SCIM 2.0 routes as a Fastify plugin.
 */
export async function registerScimRoutes(app: FastifyInstance): Promise<void> {
  const scimService = new ScimService(prisma);
  const tokenService = new ScimTokenService(prisma);

  // ══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION HOOK
  // ══════════════════════════════════════════════════════════════════════════

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Set SCIM content type for all responses
    reply.header('Content-Type', 'application/scim+json');

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send(createScimError(401, 'Missing or invalid Authorization header'));
      return;
    }

    const rawToken = authHeader.slice(7);
    const result = await tokenService.validateToken(rawToken);

    if (!result) {
      reply.code(401).send(createScimError(401, 'Invalid or revoked SCIM token'));
      return;
    }

    // Attach tenantId to request for use by route handlers
    (request as any).scimTenantId = result.tenantId;
  });

  // Helper to extract tenantId
  function getTenantId(request: FastifyRequest): string {
    return (request as any).scimTenantId;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DISCOVERY ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════════

  app.get('/ServiceProviderConfig', async (_request, reply) => {
    return reply.send({
      schemas: [SCIM_SCHEMAS.SERVICE_PROVIDER_CONFIG],
      documentationUri: 'https://docs.aivolearning.com/scim',
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 100 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
      authenticationSchemes: [
        {
          type: 'oauthbearertoken',
          name: 'OAuth Bearer Token',
          description: 'Authentication using OAuth 2.0 Bearer Token',
          specUri: 'https://tools.ietf.org/html/rfc6750',
          primary: true,
        },
      ],
      meta: {
        resourceType: 'ServiceProviderConfig',
        location: '/scim/v2/ServiceProviderConfig',
      },
    });
  });

  app.get('/ResourceTypes', async (_request, reply) => {
    return reply.send({
      schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
      totalResults: 2,
      startIndex: 1,
      itemsPerPage: 2,
      Resources: [
        {
          schemas: [SCIM_SCHEMAS.RESOURCE_TYPE],
          id: 'User',
          name: 'User',
          endpoint: '/scim/v2/Users',
          description: 'User Account',
          schema: SCIM_SCHEMAS.USER,
          meta: {
            resourceType: 'ResourceType',
            location: '/scim/v2/ResourceTypes/User',
          },
        },
        {
          schemas: [SCIM_SCHEMAS.RESOURCE_TYPE],
          id: 'Group',
          name: 'Group',
          endpoint: '/scim/v2/Groups',
          description: 'Group',
          schema: SCIM_SCHEMAS.GROUP,
          meta: {
            resourceType: 'ResourceType',
            location: '/scim/v2/ResourceTypes/Group',
          },
        },
      ],
    });
  });

  app.get('/Schemas', async (_request, reply) => {
    return reply.send({
      schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
      totalResults: 2,
      startIndex: 1,
      itemsPerPage: 2,
      Resources: [
        {
          id: SCIM_SCHEMAS.USER,
          name: 'User',
          description: 'User Account',
          attributes: [],
          meta: {
            resourceType: 'Schema',
            location: `/scim/v2/Schemas/${SCIM_SCHEMAS.USER}`,
          },
        },
        {
          id: SCIM_SCHEMAS.GROUP,
          name: 'Group',
          description: 'Group',
          attributes: [],
          meta: {
            resourceType: 'Schema',
            location: `/scim/v2/Schemas/${SCIM_SCHEMAS.GROUP}`,
          },
        },
      ],
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // USER ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════════

  app.get<{ Querystring: ScimQueryParams }>('/Users', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { filter, startIndex, count } = request.query;

    try {
      const result = await scimService.listUsers(
        tenantId,
        filter,
        startIndex ? parseInt(startIndex, 10) : 1,
        count ? parseInt(count, 10) : 100
      );
      return reply.send(result);
    } catch (error) {
      return handleScimError(reply, error);
    }
  });

  app.post<{ Body: ScimUser }>('/Users', async (request, reply) => {
    const tenantId = getTenantId(request);

    try {
      const result = await scimService.createUser(tenantId, request.body as ScimUser);
      return reply
        .code(201)
        .header('Location', `/scim/v2/Users/${result.id}`)
        .send(result);
    } catch (error) {
      return handleScimError(reply, error);
    }
  });

  app.get<{ Params: IdParams }>('/Users/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params;

    try {
      const result = await scimService.getUser(tenantId, id);
      if (!result) {
        return reply.code(404).send(createScimError(404, 'User not found'));
      }
      return reply.send(result);
    } catch (error) {
      return handleScimError(reply, error);
    }
  });

  app.put<{ Params: IdParams; Body: ScimUser }>('/Users/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params;

    try {
      const result = await scimService.updateUser(tenantId, id, request.body as ScimUser);
      return reply.send(result);
    } catch (error) {
      return handleScimError(reply, error);
    }
  });

  app.patch<{ Params: IdParams; Body: ScimPatchOp }>('/Users/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params;

    try {
      const parsed = ScimPatchOpSchema.parse(request.body);
      const result = await scimService.patchUser(tenantId, id, parsed);
      return reply.send(result);
    } catch (error) {
      return handleScimError(reply, error);
    }
  });

  app.delete<{ Params: IdParams }>('/Users/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params;

    try {
      await scimService.deleteUser(tenantId, id);
      return reply.code(204).send();
    } catch (error) {
      return handleScimError(reply, error);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════════

  app.get<{ Querystring: ScimQueryParams }>('/Groups', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { startIndex, count } = request.query;

    try {
      const result = await scimService.listGroups(
        tenantId,
        startIndex ? parseInt(startIndex, 10) : 1,
        count ? parseInt(count, 10) : 100
      );
      return reply.send(result);
    } catch (error) {
      return handleScimError(reply, error);
    }
  });

  app.get<{ Params: IdParams }>('/Groups/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params;

    try {
      const result = await scimService.getGroup(tenantId, id);
      if (!result) {
        return reply.code(404).send(createScimError(404, 'Group not found'));
      }
      return reply.send(result);
    } catch (error) {
      return handleScimError(reply, error);
    }
  });

  app.patch<{ Params: IdParams; Body: ScimPatchOp }>('/Groups/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params;

    try {
      const parsed = ScimPatchOpSchema.parse(request.body);
      const result = await scimService.patchGroup(tenantId, id, parsed);
      return reply.send(result);
    } catch (error) {
      return handleScimError(reply, error);
    }
  });
}

function handleScimError(reply: FastifyReply, error: unknown): void {
  if (error instanceof ScimNotFoundError) {
    reply.code(404).send(createScimError(404, error.message));
    return;
  }
  if (error instanceof ScimConflictError) {
    reply.code(409).send(createScimError(409, error.message, 'uniqueness'));
    return;
  }
  if (error instanceof Error && error.name === 'ZodError') {
    reply.code(400).send(createScimError(400, 'Invalid request body', 'invalidSyntax'));
    return;
  }

  console.error('[scim] Unhandled error:', error);
  reply.code(500).send(
    createScimError(500, error instanceof Error ? error.message : 'Internal server error')
  );
}
