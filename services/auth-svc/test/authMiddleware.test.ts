import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

// Mock the shared auth middleware
vi.mock('@aivo/ts-rbac', () => ({
  authMiddleware: vi.fn(() => {
    return async (request: any, reply: any) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Missing or invalid authorization header' });
      }
      const token = authHeader.slice(7);
      if (token === 'valid-token') {
        (request as any).user = {
          id: 'user-1',
          tenantId: 'tenant-1',
          roles: ['TEACHER'],
          email: 'teacher@example.com',
        };
      } else if (token === 'admin-token') {
        (request as any).user = {
          id: 'admin-1',
          tenantId: 'tenant-1',
          roles: ['PLATFORM_ADMIN'],
          email: 'admin@example.com',
        };
      } else {
        return reply.code(401).send({ error: 'Invalid token' });
      }
    };
  }),
}));

// Mock config
vi.mock('../src/config.js', () => ({
  config: { jwtPublicKey: 'mock-public-key' },
}));

describe('Auth Middleware', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Dynamic import after mocks are set up
    const { authMiddleware } = await import('../src/middleware/authMiddleware.js');

    app = Fastify();
    await app.register(authMiddleware);

    // Public routes
    app.get('/auth/login', async () => ({ status: 'login' }));
    app.get('/health', async () => ({ status: 'ok' }));

    // Protected route
    app.get('/api/data', async (request) => ({
      user: (request as any).user,
    }));

    // Route using authenticate decorator
    app.get(
      '/api/protected',
      { preHandler: [app.authenticate] },
      async (request) => ({
        user: (request as any).user,
      }),
    );

    // Route using authorize decorator
    app.get(
      '/api/admin',
      { preHandler: [app.authenticate, app.authorize(['PLATFORM_ADMIN'])] },
      async () => ({ admin: true }),
    );

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Public routes ──────────────────────────────────────────────────────

  it('should allow /auth/* without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/login' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'login' });
  });

  it('should allow /health without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'ok' });
  });

  // ── Protected routes ──────────────────────────────────────────────────

  it('should reject /api/data without authorization header', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/data' });
    expect(res.statusCode).toBe(401);
  });

  it('should reject /api/data with invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/data',
      headers: { authorization: 'Bearer bad-token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('should allow /api/data with valid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/data',
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.user).toBeDefined();
    expect(body.user.id).toBe('user-1');
  });

  // ── authenticate decorator ────────────────────────────────────────────

  it('authenticate should reject missing token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/protected' });
    expect(res.statusCode).toBe(401);
  });

  it('authenticate should accept valid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/protected',
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(res.statusCode).toBe(200);
  });

  // ── authorize decorator ───────────────────────────────────────────────

  it('authorize should reject user without required role', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin',
      headers: { authorization: 'Bearer valid-token' }, // TEACHER role
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe('Forbidden');
  });

  it('authorize should allow user with required role', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin',
      headers: { authorization: 'Bearer admin-token' }, // PLATFORM_ADMIN role
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).admin).toBe(true);
  });
});
