import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { cookiePlugin } from '../src/plugins/cookie.plugin.js';
import { csrfPlugin } from '../src/plugins/csrf.plugin.js';

describe('CSRF Protection', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();

    // Register cookie + CSRF plugins
    await app.register(cookiePlugin);
    await app.register(csrfPlugin);

    // Test routes
    app.get('/health', async () => ({ status: 'ok' }));
    app.post('/auth/test', async () => ({ success: true }));
    app.post('/scim/v2/Users', async () => ({ scim: true }));

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 403 for POST without CSRF token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/test',
      payload: { data: 'test' },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('CSRF_TOKEN_MISSING');
  });

  it('should return CSRF token from GET /auth/csrf-token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/csrf-token',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.csrfToken).toBeDefined();
    expect(typeof body.csrfToken).toBe('string');
    expect(body.csrfToken.length).toBe(64); // 32 bytes hex

    // Verify cookie is set
    const cookies = response.cookies;
    const csrfCookie = cookies.find(
      (c: { name: string }) => c.name === '__csrf'
    );
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie!.value).toBe(body.csrfToken);
  });

  it('should allow POST with valid CSRF token', async () => {
    // First, get a CSRF token
    const tokenResponse = await app.inject({
      method: 'GET',
      url: '/auth/csrf-token',
    });
    const { csrfToken } = JSON.parse(tokenResponse.body);

    // Then POST with the token
    const response = await app.inject({
      method: 'POST',
      url: '/auth/test',
      headers: {
        'x-csrf-token': csrfToken,
        cookie: `__csrf=${csrfToken}`,
      },
      payload: { data: 'test' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });

  it('should return 403 for mismatched CSRF tokens', async () => {
    const tokenResponse = await app.inject({
      method: 'GET',
      url: '/auth/csrf-token',
    });
    const { csrfToken } = JSON.parse(tokenResponse.body);

    const response = await app.inject({
      method: 'POST',
      url: '/auth/test',
      headers: {
        'x-csrf-token': 'wrong-token-value-that-does-not-match',
        cookie: `__csrf=${csrfToken}`,
      },
      payload: { data: 'test' },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('CSRF_TOKEN_INVALID');
  });

  it('should allow GET /health without CSRF token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
  });

  it('should skip CSRF for SCIM endpoints', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/scim/v2/Users',
      payload: { userName: 'test@example.com' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.scim).toBe(true);
  });
});
