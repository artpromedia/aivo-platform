/**
 * xAPI Routes — LRS-compatible REST API for xAPI statements.
 *
 * Implements the xAPI 1.0.3 Statement Resource:
 *  PUT    /xapi/statements/:id   — Store a statement with explicit ID
 *  POST   /xapi/statements       — Store statement(s), server assigns IDs
 *  GET    /xapi/statements/:id   — Retrieve a single statement
 *  GET    /xapi/statements       — Query statements with filters
 *
 * All requests MUST include the X-Experience-API-Version header (≥ 1.0.3).
 * Responses include the same header.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '../../generated/prisma-client/index.js';
import { XapiService } from './xapi.service.js';

const XAPI_VERSION = '1.0.3';

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate X-Experience-API-Version header.
 * Per spec, must be present on all requests and the server must echo it.
 */
function validateVersionHeader(request: FastifyRequest, reply: FastifyReply): boolean {
  const version = request.headers['x-experience-api-version'] as string | undefined;
  if (!version) {
    reply.status(400).send({
      error: 'Missing X-Experience-API-Version header',
      message: 'All xAPI requests must include the X-Experience-API-Version header',
    });
    return false;
  }
  // Accept 1.0.x versions
  if (!version.startsWith('1.0')) {
    reply.status(400).send({
      error: 'Unsupported xAPI version',
      message: `Server supports xAPI 1.0.x. Received: ${version}`,
    });
    return false;
  }
  return true;
}

/**
 * Extract tenantId from either the JWT user object or a query parameter.
 * For LRS integrations, tenantId comes via API key → mapped to tenant.
 */
function extractTenantId(request: FastifyRequest): string | null {
  // From JWT auth
  const user = request.user as { tenantId?: string } | undefined;
  if (user?.tenantId) return user.tenantId;

  // From query param (API key auth sets this)
  const query = request.query as { tenantId?: string };
  if (query?.tenantId) return query.tenantId;

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export function registerXapiRoutes(app: FastifyInstance, prisma: PrismaClient) {
  const xapi = new XapiService(prisma);

  // Add the version header to all xAPI responses
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Experience-API-Version', XAPI_VERSION);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PUT /xapi/statements/:id — Store statement with explicit ID
  // ──────────────────────────────────────────────────────────────────────────
  app.put('/xapi/statements/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!validateVersionHeader(request, reply)) return;
    const tenantId = extractTenantId(request);
    if (!tenantId) return reply.status(401).send({ error: 'Tenant identification required' });

    const { id } = request.params as { id: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statement = request.body as any;
    statement.id = id;

    try {
      const storedId = await xapi.storeStatement(statement, tenantId);
      return reply.status(204).header('X-Experience-API-Statement-Id', storedId).send();
    } catch (err) {
      // If statement already exists with different content → 409
      if ((err as Error).message?.includes('Unique constraint')) {
        return reply.status(409).send({ error: 'Statement already exists with different content' });
      }
      throw err;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /xapi/statements — Store statement(s) with server-generated IDs
  // ──────────────────────────────────────────────────────────────────────────
  app.post('/xapi/statements', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!validateVersionHeader(request, reply)) return;
    const tenantId = extractTenantId(request);
    if (!tenantId) return reply.status(401).send({ error: 'Tenant identification required' });

    const body = request.body;
    const statements = Array.isArray(body) ? body : [body];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ids = await xapi.storeStatements(statements as any[], tenantId);
    return reply.status(200).send(ids);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /xapi/statements/:id — Retrieve a single statement
  // ──────────────────────────────────────────────────────────────────────────
  app.get('/xapi/statements/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!validateVersionHeader(request, reply)) return;
    const tenantId = extractTenantId(request);
    if (!tenantId) return reply.status(401).send({ error: 'Tenant identification required' });

    const { id } = request.params as { id: string };
    const statement = await xapi.getStatement(id, tenantId);
    if (!statement) return reply.status(404).send({ error: 'Statement not found' });
    return reply.send(statement);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /xapi/statements — Query statements
  // ──────────────────────────────────────────────────────────────────────────
  app.get('/xapi/statements', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!validateVersionHeader(request, reply)) return;
    const tenantId = extractTenantId(request);
    if (!tenantId) return reply.status(401).send({ error: 'Tenant identification required' });

    const query = request.query as {
      agent?: string;
      verb?: string;
      activity?: string;
      since?: string;
      until?: string;
      limit?: string;
      offset?: string;
    };

    const result = await xapi.queryStatements(tenantId, {
      agent: query.agent,
      verb: query.verb,
      activity: query.activity,
      since: query.since,
      until: query.until,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });

    return reply.send({
      statements: result.statements,
      more: result.more || undefined,
    });
  });
}
