/**
 * LTI State Store
 *
 * Provides state storage for OIDC login flow with support for:
 * - In-memory storage (development)
 * - Redis storage (production)
 */

import { createClient, type RedisClientType } from 'redis';

export interface OidcState {
  toolId: string;
  nonce: string;
  targetLinkUri: string;
  createdAt: Date;
}

export interface StateStore {
  set(state: string, data: OidcState): Promise<void>;
  get(state: string): Promise<OidcState | null>;
  delete(state: string): Promise<void>;
  cleanup(): Promise<void>;
  close(): Promise<void>;
}

const STATE_TTL = 10 * 60; // 10 minutes in seconds
const STATE_TTL_MS = STATE_TTL * 1000;

// ══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE (Development)
// ══════════════════════════════════════════════════════════════════════════════

export class InMemoryStateStore implements StateStore {
  private store = new Map<string, OidcState>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async set(state: string, data: OidcState): Promise<void> {
    this.store.set(state, data);
  }

  async get(state: string): Promise<OidcState | null> {
    const data = this.store.get(state);
    if (!data) return null;

    // Check if expired
    if (Date.now() - data.createdAt.getTime() > STATE_TTL_MS) {
      this.store.delete(state);
      return null;
    }

    return data;
  }

  async delete(state: string): Promise<void> {
    this.store.delete(state);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [state, data] of this.store.entries()) {
      if (now - data.createdAt.getTime() > STATE_TTL_MS) {
        this.store.delete(state);
      }
    }
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REDIS STORE (Production)
// ══════════════════════════════════════════════════════════════════════════════

export class RedisStateStore implements StateStore {
  private client: RedisClientType;
  private prefix: string;
  private connected = false;

  constructor(redisUrl: string, prefix = 'lti:state:') {
    this.client = createClient({ url: redisUrl });
    this.prefix = prefix;

    this.client.on('error', (err) => {
      console.error('[LTI] Redis state store error:', err.message);
    });

    this.client.on('connect', () => {
      console.log('[LTI] Redis state store connected');
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async set(state: string, data: OidcState): Promise<void> {
    await this.connect();
    const key = this.prefix + state;
    const value = JSON.stringify({
      ...data,
      createdAt: data.createdAt.toISOString(),
    });
    await this.client.setEx(key, STATE_TTL, value);
  }

  async get(state: string): Promise<OidcState | null> {
    await this.connect();
    const key = this.prefix + state;
    const value = await this.client.get(key);
    if (!value) return null;

    try {
      const data = JSON.parse(value);
      return {
        ...data,
        createdAt: new Date(data.createdAt),
      };
    } catch {
      return null;
    }
  }

  async delete(state: string): Promise<void> {
    await this.connect();
    const key = this.prefix + state;
    await this.client.del(key);
  }

  async cleanup(): Promise<void> {
    // Redis handles TTL automatically, no cleanup needed
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ══════════════════════════════════════════════════════════════════════════════

let globalStateStore: StateStore | null = null;

/**
 * Get or create the state store singleton.
 * Uses Redis if REDIS_URL is set, otherwise falls back to in-memory.
 */
export function getStateStore(): StateStore {
  if (globalStateStore) {
    return globalStateStore;
  }

  const redisUrl = process.env.REDIS_URL;
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (redisUrl) {
    console.log('[LTI] Using Redis state store for OIDC state management');
    globalStateStore = new RedisStateStore(redisUrl);
  } else {
    if (nodeEnv === 'production') {
      console.warn(
        '[LTI] WARNING: Using in-memory state store in production. ' +
          'This will not work correctly with multiple instances. ' +
          'Set REDIS_URL for production deployments.'
      );
    } else {
      console.log('[LTI] Using in-memory state store (development mode)');
    }
    globalStateStore = new InMemoryStateStore();
  }

  return globalStateStore;
}

/**
 * Reset the state store singleton (for testing).
 */
export async function resetStateStore(): Promise<void> {
  if (globalStateStore) {
    await globalStateStore.close();
    globalStateStore = null;
  }
}
