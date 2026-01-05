/**
 * SCIM 2.0 API Routes
 *
 * Implements RFC 7644 (SCIM Protocol) endpoints.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';

import { ScimService, type UserRepository } from './scim-service';
import type { ScimUser, ScimPatchRequest, ScimBulkRequest } from './types';

interface ScimQueryParams {
  filter?: string;
  startIndex?: string;
  count?: string;
  sortBy?: string;
  sortOrder?: 'ascending' | 'descending';
}

interface UserParams {
  id: string;
}

/**
 * Register SCIM routes
 */
export async function registerScimRoutes(
  app: FastifyInstance,
  userRepository: UserRepository,
  options?: { baseUrl?: string }
): Promise<void> {
  const baseUrl = options?.baseUrl || '/scim/v2';
  const scimService = new ScimService(userRepository, { baseUrl });

  // Set SCIM content type for all responses
  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith(baseUrl)) {
      reply.header('Content-Type', 'application/scim+json');
    }
    return payload;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SERVICE PROVIDER CONFIG
  // ══════════════════════════════════════════════════════════════════════════

  app.get(`${baseUrl}/ServiceProviderConfig`, async (_request, reply) => {
    return reply.send(scimService.getServiceProviderConfig());
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCHEMAS
  // ══════════════════════════════════════════════════════════════════════════

  app.get(`${baseUrl}/Schemas`, async (_request, reply) => {
    // Return supported schemas
    return reply.send({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 3,
      startIndex: 1,
      itemsPerPage: 3,
      Resources: [
        {
          id: 'urn:ietf:params:scim:schemas:core:2.0:User',
          name: 'User',
          description: 'User Account',
        },
        {
          id: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
          name: 'Enterprise User',
          description: 'Enterprise User Extension',
        },
        {
          id: 'urn:aivo:scim:schemas:extension:1.0:User',
          name: 'Aivo User',
          description: 'Aivo User Extension',
        },
      ],
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // RESOURCE TYPES
  // ══════════════════════════════════════════════════════════════════════════

  app.get(`${baseUrl}/ResourceTypes`, async (_request, reply) => {
    return reply.send({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 1,
      startIndex: 1,
      itemsPerPage: 1,
      Resources: [
        {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
          id: 'User',
          name: 'User',
          endpoint: `${baseUrl}/Users`,
          description: 'User Account',
          schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
          schemaExtensions: [
            {
              schema: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
              required: false,
            },
            {
              schema: 'urn:aivo:scim:schemas:extension:1.0:User',
              required: false,
            },
          ],
          meta: {
            resourceType: 'ResourceType',
            location: `${baseUrl}/ResourceTypes/User`,
          },
        },
      ],
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // USERS
  // ══════════════════════════════════════════════════════════════════════════

  // List Users
  app.get<{ Querystring: ScimQueryParams }>(`${baseUrl}/Users`, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { filter, startIndex, count, sortBy, sortOrder } = request.query;

    const result = await scimService.listUsers(tenantId, {
      filter,
      startIndex: startIndex ? parseInt(startIndex, 10) : undefined,
      count: count ? parseInt(count, 10) : undefined,
      sortBy,
      sortOrder,
    });

    return reply.send(result);
  });

  // Get User
  app.get<{ Params: UserParams }>(`${baseUrl}/Users/:id`, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params;

    const result = await scimService.getUser(tenantId, id);

    if ('status' in result) {
      return reply.code(parseInt(result.status, 10)).send(result);
    }

    return reply.send(result);
  });

  // Create User
  app.post<{ Body: ScimUser }>(`${baseUrl}/Users`, async (request, reply) => {
    const tenantId = getTenantId(request);
    const scimUser = request.body;

    const result = await scimService.createUser(tenantId, scimUser);

    if ('status' in result) {
      return reply.code(parseInt(result.status, 10)).send(result);
    }

    return reply.code(201).header('Location', `${baseUrl}/Users/${result.id}`).send(result);
  });

  // Replace User (PUT)
  app.put<{ Params: UserParams; Body: ScimUser }>(
    `${baseUrl}/Users/:id`,
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params;
      const scimUser = request.body;

      const result = await scimService.replaceUser(tenantId, id, scimUser);

      if ('status' in result) {
        return reply.code(parseInt(result.status, 10)).send(result);
      }

      return reply.send(result);
    }
  );

  // Patch User
  app.patch<{ Params: UserParams; Body: ScimPatchRequest }>(
    `${baseUrl}/Users/:id`,
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params;
      const patchRequest = request.body;

      const result = await scimService.patchUser(tenantId, id, patchRequest);

      if ('status' in result) {
        return reply.code(parseInt(result.status, 10)).send(result);
      }

      return reply.send(result);
    }
  );

  // Delete User
  app.delete<{ Params: UserParams }>(`${baseUrl}/Users/:id`, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params;

    const result = await scimService.deleteUser(tenantId, id);

    if (result && 'status' in result) {
      return reply.code(parseInt(result.status, 10)).send(result);
    }

    return reply.code(204).send();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // BULK OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  app.post<{ Body: ScimBulkRequest }>(`${baseUrl}/Bulk`, async (request, reply) => {
    const tenantId = getTenantId(request);
    const bulkRequest = request.body;

    const result = await scimService.processBulkRequest(tenantId, bulkRequest);

    return reply.send(result);
  });
}

/**
 * Extract tenant ID from request
 * Assumes tenant ID is in JWT claims or header
 */
function getTenantId(request: FastifyRequest): string {
  // Try to get from JWT claims first
  const claims = (request as any).user;
  if (claims?.tenantId) {
    return claims.tenantId;
  }

  // Fall back to header
  const tenantHeader = request.headers['x-tenant-id'];
  if (typeof tenantHeader === 'string') {
    return tenantHeader;
  }

  throw new Error('Tenant ID not found in request');
}

export default registerScimRoutes;
