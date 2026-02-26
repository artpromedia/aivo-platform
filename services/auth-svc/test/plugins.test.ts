import { describe, expect, it, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import fp from 'fastify-plugin';

describe('cookie.plugin', () => {
  it('registers @fastify/cookie with a secret', async () => {
    process.env.COOKIE_SECRET = 'test-cookie-secret-value-32chars!';
    const { cookiePlugin } = await import('../src/plugins/cookie.plugin');

    const app = Fastify();
    await app.register(cookiePlugin);
    await app.get('/test-cookie', async (request, reply) => {
      reply.setCookie('test', 'value', { path: '/' });
      return { ok: true };
    });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/test-cookie' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();

    await app.close();
    delete process.env.COOKIE_SECRET;
  });

  it('generates a random secret when COOKIE_SECRET is not set', async () => {
    delete process.env.COOKIE_SECRET;
    // Re-import to pick up missing env var
    vi.resetModules();
    const mod = await import('../src/plugins/cookie.plugin');

    const app = Fastify();
    await app.register(mod.cookiePlugin);
    await app.ready();
    await app.close();
  });
});

describe('security-headers.plugin', () => {
  it('sets security headers on responses', async () => {
    const { securityHeadersPlugin } = await import('../src/security/security-headers.plugin');

    const app = Fastify();
    await app.register(securityHeadersPlugin);
    app.get('/test', async () => ({ ok: true }));
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(200);

    // Standard security headers
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-xss-protection']).toBeDefined();
    expect(res.headers['referrer-policy']).toBeDefined();

    // HSTS
    expect(res.headers['strict-transport-security']).toBeDefined();

    await app.close();
  });

  it('sets cache-control headers', async () => {
    const { securityHeadersPlugin } = await import('../src/security/security-headers.plugin');

    const app = Fastify();
    await app.register(securityHeadersPlugin);
    app.get('/cached', async () => ({ ok: true }));
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/cached' });
    expect(res.headers['cache-control']).toBeDefined();

    await app.close();
  });
});
