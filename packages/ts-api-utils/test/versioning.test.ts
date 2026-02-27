import { describe, it, expect, vi } from 'vitest';

import { apiVersioning, type ApiVersion, type VersioningOptions } from '../src/versioning.js';

// ── Minimal Fastify mock ───────────────────────────────────────

function createMockFastify() {
  const hooks: Record<string, Function[]> = {};

  return {
    addHook(name: string, fn: Function) {
      if (!hooks[name]) hooks[name] = [];
      hooks[name].push(fn);
    },
    getHook(name: string): Function | undefined {
      return hooks[name]?.[0];
    },
  };
}

function createMockRequest(url: string, headers: Record<string, string> = {}) {
  return { url, headers, apiVersion: undefined as string | undefined, apiVersionConfig: undefined };
}

function createMockReply() {
  const hdrs: Record<string, string> = {};
  let statusCode = 200;
  let body: unknown = undefined;

  return {
    header(key: string, value: string) {
      hdrs[key] = value;
      return this;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    send(data: unknown) {
      body = data;
      return this;
    },
    getHeaders: () => hdrs,
    getStatus: () => statusCode,
    getBody: () => body,
  };
}

const testVersions: ApiVersion[] = [
  { version: 'v1', major: 1, status: 'current' },
  { version: 'v2', major: 2, status: 'supported' },
  { version: 'v3', major: 3, status: 'deprecated', sunsetDate: '2027-06-01', successor: 'v4' },
  { version: 'v4', major: 4, status: 'sunset', successor: 'v5' },
];

const defaultOptions: VersioningOptions = {
  versions: testVersions,
  currentVersion: 'v1',
  basePath: '/public',
};

async function setupPlugin(options: VersioningOptions = defaultOptions) {
  const fastify = createMockFastify();
  await apiVersioning(fastify as any, options);
  return fastify;
}

describe('apiVersioning', () => {
  it('sets API-Version and API-Current-Version for valid version', async () => {
    const fastify = await setupPlugin();
    const hook = fastify.getHook('onRequest')!;
    const req = createMockRequest('/public/v1/learners');
    const reply = createMockReply();

    await hook(req, reply);

    expect(reply.getHeaders()['API-Version']).toBe('v1');
    expect(reply.getHeaders()['API-Current-Version']).toBe('v1');
    expect(req.apiVersion).toBe('v1');
    expect(req.apiVersionConfig).toEqual(testVersions[0]);
  });

  it('skips non-versioned URLs', async () => {
    const fastify = await setupPlugin();
    const hook = fastify.getHook('onRequest')!;
    const req = createMockRequest('/health');
    const reply = createMockReply();

    await hook(req, reply);

    expect(reply.getHeaders()).toEqual({});
    expect(req.apiVersion).toBeUndefined();
  });

  it('returns 400 for unknown version', async () => {
    const fastify = await setupPlugin();
    const hook = fastify.getHook('onRequest')!;
    const req = createMockRequest('/public/v99/users');
    const reply = createMockReply();

    await hook(req, reply);

    expect(reply.getStatus()).toBe(400);
    expect((reply.getBody() as any).error).toBe('INVALID_API_VERSION');
  });

  it('returns 410 Gone for sunset versions', async () => {
    const fastify = await setupPlugin();
    const hook = fastify.getHook('onRequest')!;
    const req = createMockRequest('/public/v4/data');
    const reply = createMockReply();

    await hook(req, reply);

    expect(reply.getStatus()).toBe(410);
    expect((reply.getBody() as any).error).toBe('API_VERSION_SUNSET');
    expect((reply.getBody() as any).successor).toBe('v5');
  });

  it('adds deprecation headers for deprecated versions', async () => {
    const fastify = await setupPlugin();
    const hook = fastify.getHook('onRequest')!;
    const req = createMockRequest('/public/v3/items');
    const reply = createMockReply();

    await hook(req, reply);

    const headers = reply.getHeaders();
    expect(headers['API-Deprecation']).toBe('true');
    expect(headers['API-Sunset']).toBe('2027-06-01');
    expect(headers['API-Successor']).toBe('v4');
    expect(headers['Deprecation']).toBe('2027-06-01');
    expect(headers['Link']).toContain('rel="deprecation"');
    expect(headers['Link']).toContain('v3-to-v4');
  });

  it('adds API-Latest hint for supported non-current versions', async () => {
    const fastify = await setupPlugin();
    const hook = fastify.getHook('onRequest')!;
    const req = createMockRequest('/public/v2/items');
    const reply = createMockReply();

    await hook(req, reply);

    expect(reply.getHeaders()['API-Latest']).toBe('v1');
  });

  it('uses custom basePath', async () => {
    const fastify = await setupPlugin({
      ...defaultOptions,
      basePath: '/api',
    });
    const hook = fastify.getHook('onRequest')!;
    const req = createMockRequest('/api/v1/data');
    const reply = createMockReply();

    await hook(req, reply);
    expect(req.apiVersion).toBe('v1');
  });
});
