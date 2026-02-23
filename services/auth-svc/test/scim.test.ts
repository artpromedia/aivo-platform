import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import Fastify from 'fastify';

// Environment setup
process.env.AUDIT_SVC_URL = 'http://localhost:9999';

const TENANT_ID = '22222222-2222-2222-2222-222222222222';
const SCIM_RAW_TOKEN = 'test-scim-token-' + crypto.randomBytes(16).toString('hex');
const SCIM_TOKEN_HASH = crypto.createHash('sha256').update(SCIM_RAW_TOKEN).digest('hex');

// In-memory stores
const users = new Map<string, any>();
const scimTokens = new Map<string, any>();
const scimSyncLogs: any[] = [];

// Seed SCIM token
scimTokens.set(SCIM_TOKEN_HASH, {
  id: 'scim-token-1',
  tenantId: TENANT_ID,
  label: 'Test Token',
  tokenHash: SCIM_TOKEN_HASH,
  active: true,
  lastUsedAt: null,
  createdAt: new Date(),
});

// Mock global fetch for audit-svc
vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));

const sessionUpdateMany = vi.fn(async () => ({ count: 0 }));

// Mock prisma
vi.mock('../src/prisma', () => {
  return {
    prisma: {
      scimToken: {
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.tokenHash && where.active === true) {
            return scimTokens.get(where.tokenHash) || null;
          }
          return null;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const token = Array.from(scimTokens.values()).find((t) => t.id === where.id);
          if (token) Object.assign(token, data);
          return token;
        }),
      },
      user: {
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.id && where.tenantId) {
            const user = users.get(where.id);
            if (user && user.tenantId === where.tenantId) return user;
            return null;
          }
          if (where.tenantId && where.email) {
            return (
              Array.from(users.values()).find(
                (u) => u.tenantId === where.tenantId && u.email === where.email
              ) || null
            );
          }
          return null;
        }),
        findMany: vi.fn(async ({ where, skip, take }: any) => {
          let results = Array.from(users.values()).filter((u) => u.tenantId === where.tenantId);
          if (where.email) results = results.filter((u) => u.email === where.email);
          if (where.externalId) results = results.filter((u) => u.externalId === where.externalId);
          if (where.status) results = results.filter((u) => u.status === where.status);
          return results.slice(skip || 0, (skip || 0) + (take || 100));
        }),
        count: vi.fn(async ({ where }: any) => {
          let results = Array.from(users.values()).filter((u) => u.tenantId === where.tenantId);
          if (where.email) results = results.filter((u) => u.email === where.email);
          if (where.externalId) results = results.filter((u) => u.externalId === where.externalId);
          if (where.status) results = results.filter((u) => u.status === where.status);
          return results.length;
        }),
        create: vi.fn(async ({ data }: any) => {
          const id = `user-${crypto.randomUUID().slice(0, 8)}`;
          const roles = data.roles?.create
            ? (Array.isArray(data.roles.create) ? data.roles.create : [data.roles.create]).map(
                (r: any, idx: number) => ({
                  id: `role-${id}-${idx}`,
                  role: r.role,
                  userId: id,
                  createdAt: new Date(),
                })
              )
            : [];
          const user = {
            id,
            tenantId: data.tenantId,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            externalId: data.externalId,
            passwordHash: data.passwordHash,
            status: data.status || 'ACTIVE',
            emailVerified: data.emailVerified ?? false,
            createdAt: new Date(),
            updatedAt: new Date(),
            roles,
          };
          users.set(id, user);
          return user;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const user = users.get(where.id);
          if (!user) throw new Error('User not found');
          Object.assign(user, data, { updatedAt: new Date() });
          return user;
        }),
      },
      userRole: {
        count: vi.fn(async ({ where }: any) => {
          return Array.from(users.values())
            .flatMap((u) => u.roles || [])
            .filter((r: any) => r.role === where.role).length;
        }),
        findMany: vi.fn(async ({ where }: any) => {
          return Array.from(users.values()).flatMap((u) =>
            (u.roles || [])
              .filter((r: any) => r.role === where.role)
              .map((r: any) => ({
                ...r,
                user: { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName },
              }))
          );
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          const user = users.get(where.userId);
          if (!user) return null;
          return (user.roles || []).find((r: any) => r.role === where.role) || null;
        }),
        create: vi.fn(async ({ data }: any) => {
          const role = { id: `role-${crypto.randomUUID().slice(0, 8)}`, ...data, createdAt: new Date() };
          const user = users.get(data.userId);
          if (user) user.roles = [...(user.roles || []), role];
          return role;
        }),
        deleteMany: vi.fn(async ({ where }: any) => {
          const user = users.get(where.userId);
          if (user) user.roles = (user.roles || []).filter((r: any) => r.role !== where.role);
          return { count: 1 };
        }),
      },
      session: {
        updateMany: sessionUpdateMany,
      },
      mfaChallenge: {
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
      scimSyncLog: {
        create: vi.fn(async ({ data }: any) => {
          const log = { id: `log-${scimSyncLogs.length + 1}`, ...data };
          scimSyncLogs.push(log);
          return log;
        }),
      },
    },
    UserRoleEnum: {
      LEARNER: 'LEARNER',
      TEACHER: 'TEACHER',
      PARENT: 'PARENT',
      THERAPIST: 'THERAPIST',
      SCHOOL_ADMIN: 'SCHOOL_ADMIN',
      DISTRICT_ADMIN: 'DISTRICT_ADMIN',
      PLATFORM_ADMIN: 'PLATFORM_ADMIN',
      SUPPORT: 'SUPPORT',
    },
  };
});

// Build a minimal Fastify app with only the SCIM routes (avoids broken deps in full app)
async function buildApp() {
  const { registerScimRoutes } = await import('../src/scim/scim.routes.js');
  const app = Fastify({ logger: false });
  await app.register(registerScimRoutes as any, { prefix: '/scim/v2' });
  return app;
}

describe('SCIM 2.0 Endpoints', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const authHeader = `Bearer ${SCIM_RAW_TOKEN}`;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    users.clear();
    scimSyncLogs.length = 0;
    sessionUpdateMany.mockClear();
  });

  // ════════════════════════════════════════════════════════════════════════
  // TEST 1: Create user with valid token → 201
  // ════════════════════════════════════════════════════════════════════════

  it('POST /scim/v2/Users with valid Bearer token → 201 with ScimUser response', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/scim/v2/Users',
      headers: { authorization: authHeader },
      payload: {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'teacher@district.edu',
        name: { givenName: 'Jane', familyName: 'Doe' },
        active: true,
        externalId: 'ext-001',
        groups: [{ value: 'TEACHER', display: 'TEACHER' }],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.userName).toBe('teacher@district.edu');
    expect(body.name.givenName).toBe('Jane');
    expect(body.name.familyName).toBe('Doe');
    expect(body.active).toBe(true);
    expect(body.id).toBeDefined();
    expect(body.meta.resourceType).toBe('User');
    expect(body.schemas).toContain('urn:ietf:params:scim:schemas:core:2.0:User');
    expect(res.headers['content-type']).toContain('application/scim+json');
  });

  // ════════════════════════════════════════════════════════════════════════
  // TEST 2: Missing Authorization → 401
  // ════════════════════════════════════════════════════════════════════════

  it('POST /scim/v2/Users with missing Authorization → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/scim/v2/Users',
      payload: {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'noauth@district.edu',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('401');
    expect(body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:Error');
  });

  // ════════════════════════════════════════════════════════════════════════
  // TEST 3: Duplicate userName → 409
  // ════════════════════════════════════════════════════════════════════════

  it('POST /scim/v2/Users with duplicate userName → 409', async () => {
    // Create first user
    await app.inject({
      method: 'POST',
      url: '/scim/v2/Users',
      headers: { authorization: authHeader },
      payload: {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'duplicate@district.edu',
        active: true,
      },
    });

    // Attempt duplicate
    const res = await app.inject({
      method: 'POST',
      url: '/scim/v2/Users',
      headers: { authorization: authHeader },
      payload: {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'duplicate@district.edu',
        active: true,
      },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.scimType).toBe('uniqueness');
  });

  // ════════════════════════════════════════════════════════════════════════
  // TEST 4: Filter by userName → 200 list
  // ════════════════════════════════════════════════════════════════════════

  it('GET /scim/v2/Users?filter=userName eq "test@example.com" → 200 with filtered results', async () => {
    // Create a user first
    await app.inject({
      method: 'POST',
      url: '/scim/v2/Users',
      headers: { authorization: authHeader },
      payload: {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'test@example.com',
        active: true,
      },
    });

    // Create another user
    await app.inject({
      method: 'POST',
      url: '/scim/v2/Users',
      headers: { authorization: authHeader },
      payload: {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'other@example.com',
        active: true,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/scim/v2/Users?filter=userName eq "test@example.com"',
      headers: { authorization: authHeader },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse');
    expect(body.totalResults).toBe(1);
    expect(body.Resources).toHaveLength(1);
    expect(body.Resources[0].userName).toBe('test@example.com');
  });

  // ════════════════════════════════════════════════════════════════════════
  // TEST 5: PATCH user active → false, sessions revoked
  // ════════════════════════════════════════════════════════════════════════

  it('PATCH /scim/v2/Users/:id with active=false → user disabled, sessions revoked', async () => {
    // Create user
    const createRes = await app.inject({
      method: 'POST',
      url: '/scim/v2/Users',
      headers: { authorization: authHeader },
      payload: {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'deactivate@district.edu',
        active: true,
      },
    });
    const userId = JSON.parse(createRes.body).id;

    // Patch to deactivate
    const res = await app.inject({
      method: 'PATCH',
      url: `/scim/v2/Users/${userId}`,
      headers: { authorization: authHeader },
      payload: {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [{ op: 'replace', path: 'active', value: false }],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.active).toBe(false);

    // Verify sessions were revoked
    expect(sessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId }),
        data: expect.objectContaining({ revokeReason: 'scim_deprovisioned' }),
      })
    );
  });

  // ════════════════════════════════════════════════════════════════════════
  // TEST 6: DELETE user → 204, soft-deleted
  // ════════════════════════════════════════════════════════════════════════

  it('DELETE /scim/v2/Users/:id → 204, user soft-deleted and sessions revoked', async () => {
    // Create user
    const createRes = await app.inject({
      method: 'POST',
      url: '/scim/v2/Users',
      headers: { authorization: authHeader },
      payload: {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'todelete@district.edu',
        active: true,
      },
    });
    const userId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/scim/v2/Users/${userId}`,
      headers: { authorization: authHeader },
    });

    expect(res.statusCode).toBe(204);

    // Verify user was soft-deleted (status = DISABLED)
    const user = users.get(userId);
    expect(user.status).toBe('DISABLED');

    // Verify sessions were revoked
    expect(sessionUpdateMany).toHaveBeenCalled();
  });

  // ════════════════════════════════════════════════════════════════════════
  // TEST 7: ServiceProviderConfig → 200 with capabilities
  // ════════════════════════════════════════════════════════════════════════

  it('GET /scim/v2/ServiceProviderConfig → 200 with capabilities', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/scim/v2/ServiceProviderConfig',
      headers: { authorization: authHeader },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.filter.supported).toBe(true);
    expect(body.patch.supported).toBe(true);
    expect(body.bulk.supported).toBe(false);
    expect(body.bulk.maxOperations).toBe(0);
    expect(body.authenticationSchemes).toHaveLength(1);
    expect(body.authenticationSchemes[0].type).toBe('oauthbearertoken');
    expect(res.headers['content-type']).toContain('application/scim+json');
  });
});
