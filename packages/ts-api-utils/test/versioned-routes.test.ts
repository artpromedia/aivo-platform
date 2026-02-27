import { describe, it, expect, vi } from 'vitest';

import { registerVersionedRoutes, versionedRoute, type VersionedRoute } from '../src/versioned-routes.js';

function createMockFastify() {
  const routes: { method: string; url: string; handler: Function; schema?: any; preHandler?: any }[] = [];
  return {
    route(opts: any) {
      routes.push(opts);
    },
    getRoutes: () => routes,
  };
}

describe('registerVersionedRoutes', () => {
  it('registers routes for each version', () => {
    const fastify = createMockFastify();
    const handlerV1 = vi.fn();
    const handlerV2 = vi.fn();

    const routes: VersionedRoute[] = [
      {
        method: 'GET',
        path: '/learners',
        versions: { v1: handlerV1, v2: handlerV2 },
      },
    ];

    registerVersionedRoutes(fastify as any, '/public', routes);

    const registered = fastify.getRoutes();
    expect(registered).toHaveLength(2);
    expect(registered[0].url).toBe('/public/v1/learners');
    expect(registered[0].handler).toBe(handlerV1);
    expect(registered[1].url).toBe('/public/v2/learners');
    expect(registered[1].handler).toBe(handlerV2);
  });

  it('applies shared schema to all versions', () => {
    const fastify = createMockFastify();
    const schema = { querystring: { type: 'object' } };

    registerVersionedRoutes(fastify as any, '/api', [
      {
        method: 'POST',
        path: '/users',
        versions: { v1: vi.fn() },
        schema,
      },
    ]);

    expect(fastify.getRoutes()[0].schema).toBe(schema);
  });

  it('applies version-specific schema override', () => {
    const fastify = createMockFastify();
    const baseSchema = { querystring: { type: 'object' } };
    const v2Schema = { querystring: { type: 'object', properties: { limit: {} } } };

    registerVersionedRoutes(fastify as any, '/api', [
      {
        method: 'GET',
        path: '/items',
        versions: { v1: vi.fn(), v2: vi.fn() },
        schema: baseSchema,
        versionSchemas: { v2: v2Schema },
      },
    ]);

    const routes = fastify.getRoutes();
    expect(routes[0].schema).toBe(baseSchema); // v1 uses base
    expect(routes[1].schema).toBe(v2Schema); // v2 uses override
  });

  it('attaches preHandler hooks', () => {
    const fastify = createMockFastify();
    const preHandler = vi.fn();

    registerVersionedRoutes(fastify as any, '/api', [
      {
        method: 'GET',
        path: '/data',
        versions: { v1: vi.fn() },
        preHandler,
      },
    ]);

    expect(fastify.getRoutes()[0].preHandler).toBe(preHandler);
  });

  it('applies version-specific preHandler override', () => {
    const fastify = createMockFastify();
    const baseHandler = vi.fn();
    const v2Handler = vi.fn();

    registerVersionedRoutes(fastify as any, '/api', [
      {
        method: 'GET',
        path: '/data',
        versions: { v1: vi.fn(), v2: vi.fn() },
        preHandler: baseHandler,
        versionPreHandlers: { v2: v2Handler },
      },
    ]);

    const routes = fastify.getRoutes();
    expect(routes[0].preHandler).toBe(baseHandler);
    expect(routes[1].preHandler).toBe(v2Handler);
  });
});

describe('versionedRoute helper', () => {
  it('creates a VersionedRoute object', () => {
    const handler = vi.fn();
    const route = versionedRoute('GET', '/users', { v1: handler });

    expect(route.method).toBe('GET');
    expect(route.path).toBe('/users');
    expect(route.versions.v1).toBe(handler);
  });

  it('includes schema and preHandler from options', () => {
    const schema = { querystring: {} };
    const preHandler = vi.fn();

    const route = versionedRoute('POST', '/items', { v1: vi.fn() }, { schema, preHandler });

    expect(route.schema).toBe(schema);
    expect(route.preHandler).toBe(preHandler);
  });
});
