/**
 * SCIM 2.0 API Routes
 *
 * Implements RFC 7644 (SCIM Protocol) endpoints with bearer token auth.
 * Bearer tokens are validated against the ScimToken table (SHA-256 hash lookup).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { validateToken } from './scim-token.service.js';
import {
  getUser,
  listUsers,
  createUser,
  replaceUser,
  patchUser,
  deactivateUser,
  getGroup,
  listGroups,
  patchGroup,
  getServiceProviderConfig,
} from './scim-service.js';
import { ScimUserSchema, ScimPatchOpSchema, SCIM_SCHEMAS } from './scim.types.js';
import type { ScimUser, ScimPatchOp, ScimError } from './scim.types.js';

const BASE = '/scim/v2';

interface QueryParams {
  filter?: string;
  startIndex?: string;
  count?: string;
}
interface IdParams {
  id: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export async function registerScimRoutes(app: FastifyInstance): Promise<void> {
  // Bail out early if SCIM is explicitly disabled
  if (process.env.SCIM_ENABLED === 'false') return;

  // ── Content-Type hook ────────────────────────────────────────────────────
  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith(BASE)) {
      void reply.header('Content-Type', 'application/scim+json');
    }
    return payload;
  });

  // ── Bearer token auth hook (runs for all /scim/v2/* routes) ──────────────
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.url.startsWith(BASE)) return;

    // ServiceProviderConfig / Schemas / ResourceTypes are publicly readable (per RFC 7644 §4)
    const publicPaths = ['/ServiceProviderConfig', '/Schemas', '/ResourceTypes'];
    if (publicPaths.some((p) => request.url.startsWith(`${BASE}${p}`))) return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply
        .code(401)
        .send(errorResponse('401', 'Bearer token required'));
    }

    const rawToken = authHeader.slice(7);
    const tenantId = await validateToken(rawToken);

    if (!tenantId) {
      return reply
        .code(401)
        .send(errorResponse('401', 'Invalid or revoked bearer token'));
    }

    // Attach tenantId to request for downstream handlers
    (request as any).scimTenantId = tenantId;
  });

  // ── Discovery endpoints ──────────────────────────────────────────────────

  app.get(`${BASE}/ServiceProviderConfig`, async (_req, reply) => {
    return reply.send(getServiceProviderConfig(BASE));
  });

  app.get(`${BASE}/Schemas`, async (_req, reply) => {
    return reply.send({
      schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
      totalResults: 3,
      startIndex: 1,
      itemsPerPage: 3,
      Resources: [
        { id: SCIM_SCHEMAS.USER, name: 'User', description: 'User Account' },
        { id: SCIM_SCHEMAS.ENTERPRISE_USER, name: 'Enterprise User', description: 'Enterprise User Extension' },
        { id: SCIM_SCHEMAS.AIVO_USER, name: 'Aivo User', description: 'Aivo User Extension' },
      ],
    });
  });

  app.get(`${BASE}/ResourceTypes`, async (_req, reply) => {
    return reply.send({
      schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
      totalResults: 2,
      startIndex: 1,
      itemsPerPage: 2,
      Resources: [
        {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
          id: 'User',
          name: 'User',
          endpoint: `${BASE}/Users`,
          description: 'User Account',
          schema: SCIM_SCHEMAS.USER,
          schemaExtensions: [
            { schema: SCIM_SCHEMAS.ENTERPRISE_USER, required: false },
            { schema: SCIM_SCHEMAS.AIVO_USER, required: false },
          ],
          meta: { resourceType: 'ResourceType', location: `${BASE}/ResourceTypes/User` },
        },
        {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
          id: 'Group',
          name: 'Group',
          endpoint: `${BASE}/Groups`,
          description: 'Group (Role-mapped)',
          schema: SCIM_SCHEMAS.GROUP,
          meta: { resourceType: 'ResourceType', location: `${BASE}/ResourceTypes/Group` },
        },
      ],
    });
  });

  // ── Users ────────────────────────────────────────────────────────────────

  app.get<{ Querystring: QueryParams }>(`${BASE}/Users`, async (request, reply) => {
    const tenantId = tid(request);
    const { filter, startIndex, count } = request.query;

    const result = await listUsers(
      tenantId,
      {
        filter,
        startIndex: startIndex ? Number.parseInt(startIndex, 10) : undefined,
        count: count ? Number.parseInt(count, 10) : undefined,
      },
      BASE
    );

    return reply.send(result);
  });

  app.get<{ Params: IdParams }>(`${BASE}/Users/:id`, async (request, reply) => {
    const result = await getUser(tid(request), request.params.id, BASE);
    return sendResult(reply, result);
  });

  app.post<{ Body: ScimUser }>(`${BASE}/Users`, async (request, reply) => {
    const parsed = ScimUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('400', parsed.error.message, 'invalidSyntax'));
    }

    const result = await createUser(tid(request), parsed.data, BASE);
    if ('status' in result && result.schemas?.[0] === SCIM_SCHEMAS.ERROR) {
      return reply.code(Number.parseInt(result.status, 10)).send(result);
    }
    return reply
      .code(201)
      .header('Location', `${BASE}/Users/${(result as ScimUser).id}`)
      .send(result);
  });

  app.put<{ Params: IdParams; Body: ScimUser }>(`${BASE}/Users/:id`, async (request, reply) => {
    const parsed = ScimUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('400', parsed.error.message, 'invalidSyntax'));
    }

    const result = await replaceUser(tid(request), request.params.id, parsed.data, BASE);
    return sendResult(reply, result);
  });

  app.patch<{ Params: IdParams; Body: ScimPatchOp }>(
    `${BASE}/Users/:id`,
    async (request, reply) => {
      const parsed = ScimPatchOpSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(errorResponse('400', parsed.error.message, 'invalidSyntax'));
      }

      const result = await patchUser(tid(request), request.params.id, parsed.data, BASE);
      return sendResult(reply, result);
    }
  );

  app.delete<{ Params: IdParams }>(`${BASE}/Users/:id`, async (request, reply) => {
    const result = await deactivateUser(tid(request), request.params.id);
    if (result && 'status' in result) {
      return reply.code(Number.parseInt(result.status, 10)).send(result);
    }
    return reply.code(204).send();
  });

  // ── Groups ───────────────────────────────────────────────────────────────

  app.get<{ Querystring: QueryParams }>(`${BASE}/Groups`, async (request, reply) => {
    const tenantId = tid(request);
    const { filter, startIndex, count } = request.query;

    const result = await listGroups(
      tenantId,
      {
        filter,
        startIndex: startIndex ? Number.parseInt(startIndex, 10) : undefined,
        count: count ? Number.parseInt(count, 10) : undefined,
      },
      BASE
    );
    return reply.send(result);
  });

  app.get<{ Params: IdParams }>(`${BASE}/Groups/:id`, async (request, reply) => {
    const result = await getGroup(tid(request), request.params.id, BASE);
    return sendResult(reply, result);
  });

  app.patch<{ Params: IdParams; Body: ScimPatchOp }>(
    `${BASE}/Groups/:id`,
    async (request, reply) => {
      const parsed = ScimPatchOpSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(errorResponse('400', parsed.error.message, 'invalidSyntax'));
      }
      const result = await patchGroup(tid(request), request.params.id, parsed.data, BASE);
      return sendResult(reply, result);
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function tid(request: FastifyRequest): string {
  const tenantId = (request as any).scimTenantId;
  if (!tenantId) throw new Error('Tenant ID not resolved from SCIM token');
  return tenantId;
}

function sendResult(reply: FastifyReply, result: ScimUser | ScimError | any) {
  if (result && 'status' in result && result.schemas?.[0] === SCIM_SCHEMAS.ERROR) {
    return reply.code(Number.parseInt(result.status, 10)).send(result);
  }
  return reply.send(result);
}

function errorResponse(status: string, detail: string, scimType?: string): ScimError {
  return { schemas: [SCIM_SCHEMAS.ERROR], detail, status, scimType };
}

export default registerScimRoutes;
