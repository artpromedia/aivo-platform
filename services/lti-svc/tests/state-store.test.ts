import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// Mocks  — redis
// ══════════════════════════════════════════════════════════════════════════════

const mockRedisClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  get: vi.fn(),
  setEx: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  quit: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
};

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedisClient),
}));

import {
  InMemoryStateStore,
  RedisStateStore,
  getStateStore,
  resetStateStore,
  type OidcState,
} from '../src/state-store.js';

// ══════════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════════

function makeState(overrides: Partial<OidcState> = {}): OidcState {
  return {
    toolId: 'tool-1',
    nonce: 'nonce-abc',
    targetLinkUri: 'https://lms.test/launch',
    createdAt: new Date(),
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// InMemoryStateStore
// ══════════════════════════════════════════════════════════════════════════════

describe('InMemoryStateStore', () => {
  let store: InMemoryStateStore;

  beforeEach(() => {
    store = new InMemoryStateStore();
  });

  afterEach(async () => {
    await store.close();
  });

  it('should set and get state', async () => {
    const data = makeState();
    await store.set('s-1', data);

    const result = await store.get('s-1');
    expect(result).toEqual(data);
  });

  it('should return null for missing state', async () => {
    expect(await store.get('nope')).toBeNull();
  });

  it('should return null for expired state', async () => {
    const expired = makeState({
      createdAt: new Date(Date.now() - 11 * 60 * 1000), // 11 minutes ago (TTL = 10 min)
    });
    await store.set('old', expired);

    expect(await store.get('old')).toBeNull();
  });

  it('should delete state', async () => {
    await store.set('d-1', makeState());
    await store.delete('d-1');

    expect(await store.get('d-1')).toBeNull();
  });

  it('cleanup should remove expired entries', async () => {
    await store.set('fresh', makeState());
    await store.set('stale', makeState({
      createdAt: new Date(Date.now() - 11 * 60 * 1000),
    }));

    await store.cleanup();

    expect(await store.get('fresh')).not.toBeNull();
    // 'stale' was expired, cleanup removed it (or get returns null due to TTL check either way)
  });

  it('close should clear store', async () => {
    await store.set('k', makeState());
    await store.close();

    // After close the internal map is cleared
    expect(await store.get('k')).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// RedisStateStore
// ══════════════════════════════════════════════════════════════════════════════

describe('RedisStateStore', () => {
  let store: RedisStateStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new RedisStateStore('redis://localhost:6379');
  });

  afterEach(async () => {
    // Avoid quit errors
    try { await store.close(); } catch { /* */ }
  });

  it('should set state with TTL', async () => {
    const data = makeState();
    await store.set('s-1', data);

    expect(mockRedisClient.setEx).toHaveBeenCalledWith(
      'lti:state:s-1',
      600, // 10 min TTL
      expect.any(String)
    );
  });

  it('should get and deserialize state', async () => {
    const data = makeState();
    mockRedisClient.get.mockResolvedValue(
      JSON.stringify({ ...data, createdAt: data.createdAt.toISOString() })
    );

    const result = await store.get('s-1');
    expect(result?.toolId).toBe('tool-1');
    expect(result?.createdAt).toBeInstanceOf(Date);
  });

  it('should return null when key not found', async () => {
    mockRedisClient.get.mockResolvedValue(null);
    expect(await store.get('nope')).toBeNull();
  });

  it('should return null for invalid JSON', async () => {
    mockRedisClient.get.mockResolvedValue('NOT_JSON');
    expect(await store.get('bad')).toBeNull();
  });

  it('should delete key', async () => {
    await store.delete('d-1');
    expect(mockRedisClient.del).toHaveBeenCalledWith('lti:state:d-1');
  });

  it('cleanup should be no-op (Redis handles TTL)', async () => {
    await expect(store.cleanup()).resolves.toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Factory
// ══════════════════════════════════════════════════════════════════════════════

describe('getStateStore / resetStateStore', () => {
  afterEach(async () => {
    await resetStateStore();
  });

  it('should return InMemoryStateStore when REDIS_URL is not set', () => {
    delete process.env.REDIS_URL;
    const store = getStateStore();
    expect(store).toBeInstanceOf(InMemoryStateStore);
  });

  it('should return the same singleton on repeated calls', () => {
    delete process.env.REDIS_URL;
    const s1 = getStateStore();
    const s2 = getStateStore();
    expect(s1).toBe(s2);
  });

  it('should return RedisStateStore when REDIS_URL is set', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const store = getStateStore();
    expect(store).toBeInstanceOf(RedisStateStore);
    delete process.env.REDIS_URL;
  });

  it('resetStateStore should clear the singleton', async () => {
    delete process.env.REDIS_URL;
    const s1 = getStateStore();
    await resetStateStore();
    const s2 = getStateStore();
    expect(s1).not.toBe(s2);
  });
});
