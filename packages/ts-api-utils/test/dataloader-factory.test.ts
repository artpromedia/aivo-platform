import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createPrismaLoader,
  createTenantScopedLoader,
  createRelationDataLoader,
  DataLoaderFactory,
  createCommonDataLoaders,
  createDataLoaderPlugin,
} from '../src/dataloader-factory.js';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function makePrismaModel<T extends { id: string }>(rows: T[]) {
  return {
    findMany: vi.fn().mockResolvedValue(rows),
  };
}

// ------------------------------------------------------------------
// createPrismaLoader
// ------------------------------------------------------------------

describe('createPrismaLoader', () => {
  it('batches multiple loads into a single findMany', async () => {
    const users = [
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ];
    const model = makePrismaModel(users);
    const loader = createPrismaLoader(model);

    const [a, b] = await Promise.all([loader.load('u1'), loader.load('u2')]);

    expect(model.findMany).toHaveBeenCalledTimes(1);
    expect(model.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1', 'u2'] } },
    });
    expect(a).toEqual(users[0]);
    expect(b).toEqual(users[1]);
  });

  it('returns null for missing ids', async () => {
    const model = makePrismaModel([{ id: 'u1', name: 'Alice' }]);
    const loader = createPrismaLoader(model);

    const result = await loader.load('missing');
    expect(result).toBeNull();
  });

  it('accepts custom name option', () => {
    const model = makePrismaModel([]);
    const loader = createPrismaLoader(model, { name: 'UserLoader' });
    // Should not throw
    expect(loader).toBeDefined();
  });
});

// ------------------------------------------------------------------
// createTenantScopedLoader
// ------------------------------------------------------------------

describe('createTenantScopedLoader', () => {
  it('includes tenantId in where clause', async () => {
    const items = [{ id: 's1', tenantId: 't1', email: 'a@a.com' }];
    const model = {
      findMany: vi.fn().mockResolvedValue(items),
    };

    const loader = createTenantScopedLoader(model, 't1');
    const result = await loader.load('s1');

    expect(model.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['s1'] }, tenantId: 't1' },
    });
    expect(result).toEqual(items[0]);
  });
});

// ------------------------------------------------------------------
// createRelationDataLoader
// ------------------------------------------------------------------

describe('createRelationDataLoader', () => {
  it('groups results by foreign key', async () => {
    const comments = [
      { id: 'c1', postId: 'p1', text: 'Hello' },
      { id: 'c2', postId: 'p1', text: 'World' },
      { id: 'c3', postId: 'p2', text: 'Foo' },
    ];

    const fetchFn = vi.fn().mockResolvedValue(comments);
    const loader = createRelationDataLoader(
      fetchFn,
      (item: typeof comments[0]) => item.postId,
    );

    const [p1Comments, p2Comments] = await Promise.all([
      loader.load('p1'),
      loader.load('p2'),
    ]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(p1Comments).toHaveLength(2);
    expect(p2Comments).toHaveLength(1);
  });
});

// ------------------------------------------------------------------
// DataLoaderFactory
// ------------------------------------------------------------------

describe('DataLoaderFactory', () => {
  it('register + createLoaders returns all registered loaders', () => {
    const factory = new DataLoaderFactory();
    const fakeLoader1 = { load: vi.fn() };
    const fakeLoader2 = { load: vi.fn() };

    factory
      .register('users' as any, () => fakeLoader1 as any)
      .register('students' as any, () => fakeLoader2 as any);

    const loaders = factory.createLoaders();
    expect((loaders as any).users).toBe(fakeLoader1);
    expect((loaders as any).students).toBe(fakeLoader2);
  });

  it('createLoaders returns fresh instances each time', () => {
    const factory = new DataLoaderFactory();
    let callCount = 0;
    factory.register('items' as any, () => ({ id: ++callCount }) as any);

    const a = factory.createLoaders();
    const b = factory.createLoaders();

    expect((a as any).items.id).toBe(1);
    expect((b as any).items.id).toBe(2);
  });

  it('getCacheFactory returns LRUCache factory when lruCacheSize set', () => {
    const factory = new DataLoaderFactory({ lruCacheSize: 500 });
    const cacheFn = factory.getCacheFactory();
    expect(cacheFn).toBeDefined();
    const cache = cacheFn!();
    expect(cache).toBeDefined();
  });

  it('getCacheFactory returns TTLCache factory when ttlMs set', () => {
    const factory = new DataLoaderFactory({ ttlMs: 60_000 });
    const cacheFn = factory.getCacheFactory();
    expect(cacheFn).toBeDefined();
  });

  it('getCacheFactory returns undefined with default config', () => {
    const factory = new DataLoaderFactory();
    expect(factory.getCacheFactory()).toBeUndefined();
  });
});

// ------------------------------------------------------------------
// createCommonDataLoaders
// ------------------------------------------------------------------

describe('createCommonDataLoaders', () => {
  it('creates userById loader when prisma.user exists', async () => {
    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'u1', email: 'a@a.com', tenantId: 't1' },
        ]),
      },
    };

    const loaders = createCommonDataLoaders(prisma, 't1');
    expect(loaders.userById).toBeDefined();

    const user = await loaders.userById!.load('u1');
    expect(user).toMatchObject({ id: 'u1', email: 'a@a.com' });
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1'] }, tenantId: 't1' },
    });
  });

  it('creates studentById loader from prisma.student', async () => {
    const prisma = {
      student: {
        findMany: vi.fn().mockResolvedValue([
          { id: 's1', tenantId: 't1', firstName: 'Jane' },
        ]),
      },
    };

    const loaders = createCommonDataLoaders(prisma);
    expect(loaders.studentById).toBeDefined();
  });

  it('falls back to prisma.learner for studentById', async () => {
    const prisma = {
      learner: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'l1', tenantId: 't1', firstName: 'John' },
        ]),
      },
    };

    const loaders = createCommonDataLoaders(prisma);
    expect(loaders.studentById).toBeDefined();
  });

  it('returns empty when prisma has no matching models', () => {
    const loaders = createCommonDataLoaders({});
    expect(loaders.userById).toBeUndefined();
    expect(loaders.studentById).toBeUndefined();
  });
});

// ------------------------------------------------------------------
// createDataLoaderPlugin
// ------------------------------------------------------------------

describe('createDataLoaderPlugin', () => {
  it('creates a Fastify plugin that sets request.loaders', async () => {
    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const plugin = createDataLoaderPlugin(prisma);
    const hooks: Record<string, Function[]> = {};
    const fakeFastify = {
      addHook(name: string, fn: Function) {
        hooks[name] ??= [];
        hooks[name].push(fn);
      },
    };

    await plugin(fakeFastify);

    const request: any = { user: { tenantId: 't1' } };
    await hooks.preHandler[0](request);

    expect(request.loaders).toBeDefined();
    expect(request.loaders.userById).toBeDefined();
  });

  it('extracts tenantId from x-tenant-id header', async () => {
    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const plugin = createDataLoaderPlugin(prisma);
    const hooks: Record<string, Function[]> = {};
    const fakeFastify = {
      addHook(name: string, fn: Function) {
        hooks[name] ??= [];
        hooks[name].push(fn);
      },
    };

    await plugin(fakeFastify);

    const request: any = { headers: { 'x-tenant-id': 't2' } };
    await hooks.preHandler[0](request);

    expect(request.loaders).toBeDefined();
  });
});
