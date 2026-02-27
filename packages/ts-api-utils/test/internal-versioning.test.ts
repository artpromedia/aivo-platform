import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  internalVersioning,
  INTERNAL_API_VERSION_HEADER,
  INTERNAL_VERSION_LATEST,
  isVersionAtLeast,
  withInternalVersion,
} from '../src/internal-versioning.js';

// ------------------------------------------------------------------
// Helpers – lightweight Fastify fakes
// ------------------------------------------------------------------

function createMockFastify() {
  const hooks: Record<string, Function[]> = {};
  return {
    addHook(name: string, fn: Function) {
      hooks[name] ??= [];
      hooks[name].push(fn);
    },
    getHook(name: string): Function | undefined {
      return hooks[name]?.[0];
    },
  };
}

function createMockRequest(headers: Record<string, string> = {}) {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    lower[k.toLowerCase()] = v;
  }
  return { headers: lower } as any;
}

function createMockReply() {
  const responseHeaders: Record<string, string> = {};
  return {
    header(name: string, value: string) {
      responseHeaders[name] = value;
      return this;
    },
    getHeaders: () => responseHeaders,
  } as any;
}

// ------------------------------------------------------------------
// internalVersioning plugin
// ------------------------------------------------------------------

describe('internalVersioning plugin', () => {
  it('sets internalApiVersion to "latest" when no header present', async () => {
    const fastify = createMockFastify();
    await internalVersioning(fastify as any);

    const onRequest = fastify.getHook('onRequest')!;
    const request = createMockRequest();
    await onRequest(request, createMockReply());

    expect(request.internalApiVersion).toBe('latest');
  });

  it('reads version from Accept-Version header', async () => {
    const fastify = createMockFastify();
    await internalVersioning(fastify as any);

    const onRequest = fastify.getHook('onRequest')!;
    const request = createMockRequest({ 'Accept-Version': '2026-01-15' });
    await onRequest(request, createMockReply());

    expect(request.internalApiVersion).toBe('2026-01-15');
  });

  it('trims whitespace from header value', async () => {
    const fastify = createMockFastify();
    await internalVersioning(fastify as any);

    const onRequest = fastify.getHook('onRequest')!;
    const request = createMockRequest({ 'Accept-Version': '  2026-03-01  ' });
    await onRequest(request, createMockReply());

    expect(request.internalApiVersion).toBe('2026-03-01');
  });

  it('uses custom defaultVersion when header missing', async () => {
    const fastify = createMockFastify();
    await internalVersioning(fastify as any, { defaultVersion: '2025-01-01' });

    const onRequest = fastify.getHook('onRequest')!;
    const request = createMockRequest();
    await onRequest(request, createMockReply());

    expect(request.internalApiVersion).toBe('2025-01-01');
  });

  it('echoes version in X-API-Version header when echoVersion=true', async () => {
    const fastify = createMockFastify();
    await internalVersioning(fastify as any, { echoVersion: true });

    const onRequest = fastify.getHook('onRequest')!;
    const request = createMockRequest({ 'Accept-Version': '2026-06-01' });
    const reply = createMockReply();
    await onRequest(request, reply);

    expect(reply.getHeaders()['X-API-Version']).toBe('2026-06-01');
  });

  it('does not echo version when echoVersion is false (default)', async () => {
    const fastify = createMockFastify();
    await internalVersioning(fastify as any);

    const onRequest = fastify.getHook('onRequest')!;
    const request = createMockRequest({ 'Accept-Version': '2026-06-01' });
    const reply = createMockReply();
    await onRequest(request, reply);

    expect(reply.getHeaders()['X-API-Version']).toBeUndefined();
  });
});

// ------------------------------------------------------------------
// isVersionAtLeast
// ------------------------------------------------------------------

describe('isVersionAtLeast', () => {
  it('returns true for "latest"', () => {
    expect(isVersionAtLeast('latest', '2030-01-01')).toBe(true);
  });

  it('returns true for undefined version', () => {
    expect(isVersionAtLeast(undefined, '2026-01-01')).toBe(true);
  });

  it('returns true when version equals minDate', () => {
    expect(isVersionAtLeast('2026-03-01', '2026-03-01')).toBe(true);
  });

  it('returns true when version is after minDate', () => {
    expect(isVersionAtLeast('2026-06-01', '2026-03-01')).toBe(true);
  });

  it('returns false when version is before minDate', () => {
    expect(isVersionAtLeast('2025-01-01', '2026-03-01')).toBe(false);
  });
});

// ------------------------------------------------------------------
// withInternalVersion
// ------------------------------------------------------------------

describe('withInternalVersion', () => {
  it('creates headers with Accept-Version', () => {
    const headers = withInternalVersion('2026-01-15');
    expect(headers[INTERNAL_API_VERSION_HEADER]).toBe('2026-01-15');
  });

  it('merges additional headers', () => {
    const headers = withInternalVersion('2026-01-15', {
      Authorization: 'Bearer token',
    });
    expect(headers[INTERNAL_API_VERSION_HEADER]).toBe('2026-01-15');
    expect(headers.Authorization).toBe('Bearer token');
  });

  it('additional headers override version header if specified', () => {
    const headers = withInternalVersion('2026-01-15', {
      [INTERNAL_API_VERSION_HEADER]: '2025-01-01',
    });
    // Spread puts additional headers last, so they win
    expect(headers[INTERNAL_API_VERSION_HEADER]).toBe('2025-01-01');
  });
});

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

describe('constants', () => {
  it('INTERNAL_API_VERSION_HEADER is Accept-Version', () => {
    expect(INTERNAL_API_VERSION_HEADER).toBe('Accept-Version');
  });

  it('INTERNAL_VERSION_LATEST is "latest"', () => {
    expect(INTERNAL_VERSION_LATEST).toBe('latest');
  });
});
