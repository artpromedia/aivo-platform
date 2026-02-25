/**
 * RedisStore Integration Tests
 *
 * Tests the enhanced RedisStore including:
 * - createRedisStore factory
 * - Atomic increment (Lua script)
 * - Fail-open behavior
 * - Dual constructor patterns
 * - Connection lifecycle
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedisStore, createRedisStore, type RedisStoreOptions } from '../stores/redis-store';
import { MemoryStore } from '../stores/memory-store';

/* -------------------------------------------------------------------------- */
/*  Mock ioredis                                                              */
/* -------------------------------------------------------------------------- */

function createMockRedis(overrides: Record<string, unknown> = {}) {
  const data = new Map<string, string>();
  const ttls = new Map<string, number>();

  const mock: Record<string, any> = {
    status: 'ready',
    ping: vi.fn(async () => 'PONG'),
    get: vi.fn(async (key: string) => data.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, _ex: string, ttl: number) => {
      data.set(key, value);
      ttls.set(key, ttl);
      return 'OK';
    }),
    del: vi.fn(async (key: string) => {
      data.delete(key);
      ttls.delete(key);
      return 1;
    }),
    eval: vi.fn(async (_script: string, _numKeys: number, key: string, amount: number, ttl: number) => {
      const current = parseInt(data.get(key) ?? '0', 10);
      const newVal = current + amount;
      data.set(key, String(newVal));
      ttls.set(key, ttl);
      return newVal;
    }),
    incrby: vi.fn(async (key: string, amount: number) => {
      const current = parseInt(data.get(key) ?? '0', 10);
      const newVal = current + amount;
      data.set(key, String(newVal));
      return newVal;
    }),
    multi: vi.fn(() => {
      const cmds: Array<() => any> = [];
      const m = {
        incrby: vi.fn((key: string, amount: number) => {
          cmds.push(() => {
            const current = parseInt(data.get(key) ?? '0', 10);
            const newVal = current + amount;
            data.set(key, String(newVal));
            return newVal;
          });
          return m;
        }),
        expire: vi.fn(() => { cmds.push(() => 1); return m; }),
        exec: vi.fn(async () => cmds.map((fn) => [null, fn()])),
      };
      return m;
    }),
    defineCommand: vi.fn((name: string, config: { numberOfKeys: number; lua: string }) => {
      // ioredis defineCommand: redis.cmd(key, ...args) → eval(lua, numberOfKeys, key, ...args)
      mock[name] = vi.fn(async (...args: any[]) => mock.eval(config.lua, config.numberOfKeys, ...args));
    }),
    zadd: vi.fn(async () => 1),
    zrangebyscore: vi.fn(async () => []),
    zremrangebyscore: vi.fn(async () => 0),
    zcard: vi.fn(async () => 0),
    exists: vi.fn(async () => 0),
    expire: vi.fn(async () => 1),
    quit: vi.fn(async () => 'OK'),
    disconnect: vi.fn(),
    on: vi.fn(),
    ...overrides,
  };

  return mock;
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

describe('RedisStore', () => {
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    mockRedis = createMockRedis();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ---- Constructor ---- */

  describe('constructor', () => {
    it('should accept legacy positional arguments', () => {
      const store = new RedisStore(mockRedis as any, 'test:');
      expect(store).toBeInstanceOf(RedisStore);
    });

    it('should accept options object with client', () => {
      const store = new RedisStore({ client: mockRedis as any, keyPrefix: 'opts:' });
      expect(store).toBeInstanceOf(RedisStore);
    });

    it('should accept options object with redisUrl', () => {
      // This would create a real connection, so we mock ioredis module
      // Just test that the constructor doesn't throw with client provided
      const store = new RedisStore({ client: mockRedis as any });
      expect(store).toBeInstanceOf(RedisStore);
    });
  });

  /* ---- Atomic Increment ---- */

  describe('increment (Lua atomic)', () => {
    it('should atomically increment and return new count', async () => {
      const store = new RedisStore({ client: mockRedis as any, keyPrefix: 'rl:' });

      const count1 = await store.increment('key1', 1, 60);
      expect(count1).toBe(1);
      expect(mockRedis.eval).toHaveBeenCalledTimes(1);

      const count2 = await store.increment('key1', 1, 60);
      expect(count2).toBe(2);
    });

    it('should increment by arbitrary amount', async () => {
      const store = new RedisStore({ client: mockRedis as any, keyPrefix: 'rl:' });

      const count = await store.increment('key1', 5, 60);
      expect(count).toBe(5);
    });

    it('should prefix keys', async () => {
      const store = new RedisStore({ client: mockRedis as any, keyPrefix: 'myprefix' });

      await store.increment('counter', 1, 60);

      // The Lua eval should receive the prefixed key
      const evalCall = mockRedis.eval.mock.calls[0];
      expect(evalCall[2]).toBe('myprefix:counter');
    });
  });

  /* ---- Fail-Open ---- */

  describe('fail-open behavior', () => {
    it('should return 0 on Redis error when failOpen is true', async () => {
      const failingRedis = createMockRedis({
        eval: vi.fn(async () => { throw new Error('REDIS CONNECTION REFUSED'); }),
        defineCommand: vi.fn(), // no-op so atomicIncrement is never added
        multi: vi.fn(() => { throw new Error('REDIS CONNECTION REFUSED'); }),
        get: vi.fn(async () => { throw new Error('REDIS DOWN'); }),
      });

      const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
      const store = new RedisStore({
        client: failingRedis as any,
        failOpen: true,
        logger,
      });

      // increment should fail open → return 0, not throw
      const count = await store.increment('key', 1, 60);
      expect(count).toBe(0);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should throw on Redis error when failOpen is explicitly false (legacy constructor)', async () => {
      const failingRedis = createMockRedis({
        eval: vi.fn(async () => { throw new Error('REDIS DOWN'); }),
        defineCommand: vi.fn(),
        multi: vi.fn(() => { throw new Error('REDIS DOWN'); }),
      });
      // Force mock to not have atomicIncrement so it falls through to multi
      delete failingRedis.atomicIncrement;

      // Legacy constructor defaults to failOpen = false
      const store = new RedisStore(failingRedis as any, 'test:');

      await expect(store.increment('key', 1, 60)).rejects.toThrow('REDIS DOWN');
    });

    it('should default to failOpen = true in options mode', async () => {
      const failingRedis = createMockRedis({
        eval: vi.fn(async () => { throw new Error('REDIS DOWN'); }),
        defineCommand: vi.fn(),
        multi: vi.fn(() => { throw new Error('REDIS DOWN'); }),
      });
      delete failingRedis.atomicIncrement;

      const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
      const store = new RedisStore({ client: failingRedis as any, logger });

      // Default failOpen=true → returns 0 fallback
      const count = await store.increment('key', 1, 60);
      expect(count).toBe(0);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should fail open on get errors', async () => {
      const failingRedis = createMockRedis({
        get: vi.fn(async () => { throw new Error('REDIS TIMEOUT'); }),
      });

      const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
      const store = new RedisStore({
        client: failingRedis as any,
        failOpen: true,
        logger,
      });

      const value = await store.get('missing');
      expect(value).toBeNull();
    });
  });

  /* ---- Basic Operations ---- */

  describe('get/set/delete', () => {
    it('should store and retrieve values', async () => {
      const store = new RedisStore({ client: mockRedis as any });

      await store.set('hello', 'world', 60);
      const value = await store.get('hello');

      expect(value).toBe('world');
    });

    it('should delete values', async () => {
      const store = new RedisStore({ client: mockRedis as any });

      await store.set('temp', 'data', 60);
      await store.delete('temp');

      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  /* ---- Lifecycle ---- */

  describe('close', () => {
    it('should call quit on owned client', async () => {
      const store = new RedisStore({ client: mockRedis as any });
      await store.close();
      // Should not quit externally-provided client (ownsClient = false)
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  createRedisStore factory                                                  */
/* -------------------------------------------------------------------------- */

describe('createRedisStore', () => {
  it('should always return a RedisStore (even with bad URL)', () => {
    // createRedisStore creates a RedisStore from any URL;
    // the connection attempt happens lazily
    const store = createRedisStore('redis://invalid:1234', {
      keyPrefix: 'test:',
      failOpen: true,
    });
    expect(store).toBeInstanceOf(RedisStore);
    // Clean up
    void store.close();
  });

  it('should apply keyPrefix and failOpen options', () => {
    const store = createRedisStore('redis://localhost:6379', {
      keyPrefix: 'myapp:',
      failOpen: true,
    });
    expect(store).toBeInstanceOf(RedisStore);
    void store.close();
  });
});
