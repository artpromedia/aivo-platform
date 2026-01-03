/**
 * SSO State Management
 *
 * Manages SSO flow state (CSRF protection, nonce, relay state).
 * Uses Redis for multi-instance support (with in-memory fallback for development).
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';

import type { SsoState } from './types.js';
import { getRedisClient, RedisKeys } from '../redis/client.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const STATE_TTL_SECONDS = Math.floor(STATE_TTL_MS / 1000); // 600 seconds
const ALGORITHM = 'aes-256-gcm';

/**
 * Get the SSO state encryption key from environment.
 * SECURITY: This key MUST be set in production - no fallback allowed.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.SSO_STATE_ENCRYPTION_KEY;

  if (!key) {
    // SECURITY FIX: Fail fast if encryption key is not configured
    throw new Error(
      'SECURITY ERROR: SSO_STATE_ENCRYPTION_KEY environment variable is required.\n' +
        'Generate a secure key with: openssl rand -base64 32\n' +
        'This is required for SSO state protection against CSRF and tampering attacks.'
    );
  }

  // Reject obvious placeholder values
  const placeholderPatterns = [
    /default/i,
    /change.*in.*prod/i,
    /fallback/i,
    /example/i,
    /placeholder/i,
    /^test$/i,
    /^dev$/i,
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(key)) {
      throw new Error(
        'SECURITY ERROR: SSO_STATE_ENCRYPTION_KEY appears to be a placeholder value.\n' +
          'Generate a secure key with: openssl rand -base64 32'
      );
    }
  }

  // Require minimum key length (at least 32 characters before hashing)
  if (key.length < 32) {
    throw new Error(
      'SECURITY ERROR: SSO_STATE_ENCRYPTION_KEY must be at least 32 characters.\n' +
        'Generate a secure key with: openssl rand -base64 32'
    );
  }

  // Derive a 32-byte key from the config
  return createHash('sha256').update(key).digest();
}

// Initialize encryption key (will throw on startup if not configured)
let encryptionKey: Buffer;
try {
  encryptionKey = getEncryptionKey();
} catch (error) {
  // In development, allow a dev-only key with warning
  if (process.env.NODE_ENV === 'development' && process.env.SSO_DEV_INSECURE_MODE === 'true') {
    console.warn('[SSO] WARNING: Using insecure development key. Never use in production!');
    encryptionKey = createHash('sha256').update('insecure-dev-only-key').digest();
  } else {
    throw error;
  }
}

// In-memory fallback store (only used in development when Redis is unavailable)
const memoryStore = new Map<string, { encrypted: string; expiresAt: number }>();

// ============================================================================
// STORAGE ABSTRACTION
// ============================================================================

interface StateStore {
  set(stateId: string, encrypted: string, ttlMs: number): Promise<void>;
  get(stateId: string): Promise<string | null>;
  delete(stateId: string): Promise<void>;
}

/**
 * Redis-backed state store for production use
 */
class RedisStateStore implements StateStore {
  async set(stateId: string, encrypted: string, _ttlMs: number): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error('Redis client not available');
    }
    await redis.setex(RedisKeys.ssoState(stateId), STATE_TTL_SECONDS, encrypted);
  }

  async get(stateId: string): Promise<string | null> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error('Redis client not available');
    }
    return redis.get(RedisKeys.ssoState(stateId));
  }

  async delete(stateId: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error('Redis client not available');
    }
    await redis.del(RedisKeys.ssoState(stateId));
  }
}

/**
 * In-memory state store for development fallback
 */
class MemoryStateStore implements StateStore {
  async set(stateId: string, encrypted: string, ttlMs: number): Promise<void> {
    memoryStore.set(stateId, {
      encrypted,
      expiresAt: Date.now() + ttlMs,
    });
    cleanupExpiredStates();
  }

  async get(stateId: string): Promise<string | null> {
    const entry = memoryStore.get(stateId);
    if (!entry || Date.now() > entry.expiresAt) {
      return null;
    }
    return entry.encrypted;
  }

  async delete(stateId: string): Promise<void> {
    memoryStore.delete(stateId);
  }
}

/**
 * Get the appropriate state store based on environment
 */
function getStateStore(): StateStore {
  const redis = getRedisClient();
  if (redis) {
    return new RedisStateStore();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Redis is required for SSO state storage in production');
  }

  console.warn('[SSO] Using in-memory state store - not suitable for multi-instance deployment');
  return new MemoryStateStore();
}

// ============================================================================
// STATE CREATION & VALIDATION
// ============================================================================

/**
 * Generate a new SSO state token.
 */
export async function generateSsoState(params: Omit<SsoState, 'nonce' | 'initiatedAt'>): Promise<string> {
  const nonce = randomBytes(16).toString('hex');
  const state: SsoState = {
    ...params,
    nonce,
    initiatedAt: Date.now(),
  };

  const stateId = randomBytes(16).toString('hex');
  const encrypted = encryptState(state);

  const store = getStateStore();
  await store.set(stateId, encrypted, STATE_TTL_MS);

  return stateId;
}

/**
 * Validate and consume an SSO state token.
 * Returns the state if valid, throws if invalid or expired.
 */
export async function validateSsoState(stateId: string): Promise<SsoState> {
  const store = getStateStore();
  const encrypted = await store.get(stateId);

  if (!encrypted) {
    throw new SsoStateError('STATE_NOT_FOUND', 'SSO state not found or expired');
  }

  // Remove the state (single-use) - do this before decryption to prevent replay
  await store.delete(stateId);

  try {
    return decryptState(encrypted);
  } catch {
    throw new SsoStateError('STATE_INVALID', 'Failed to decrypt SSO state');
  }
}

/**
 * Get state without consuming it (for debugging/logging).
 */
export async function peekSsoState(stateId: string): Promise<SsoState | null> {
  const store = getStateStore();
  const encrypted = await store.get(stateId);

  if (!encrypted) {
    return null;
  }

  try {
    return decryptState(encrypted);
  } catch {
    return null;
  }
}

// ============================================================================
// ENCRYPTION HELPERS
// ============================================================================

function encryptState(state: SsoState): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv);

  const plaintext = JSON.stringify(state);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine: iv (12) + authTag (16) + encrypted
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64url');
}

function decryptState(encrypted: string): SsoState {
  const combined = Buffer.from(encrypted, 'base64url');

  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(12, 28);
  const ciphertext = combined.subarray(28);

  const decipher = createDecipheriv(ALGORITHM, encryptionKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as SsoState;
}

// ============================================================================
// CLEANUP
// ============================================================================

let lastCleanup = 0;
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute

function cleanupExpiredStates(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }
  lastCleanup = now;

  for (const [key, entry] of stateStore.entries()) {
    if (now > entry.expiresAt) {
      stateStore.delete(key);
    }
  }
}

// ============================================================================
// ERRORS
// ============================================================================

export class SsoStateError extends Error {
  constructor(
    public readonly code: 'STATE_NOT_FOUND' | 'STATE_EXPIRED' | 'STATE_INVALID',
    message: string
  ) {
    super(message);
    this.name = 'SsoStateError';
  }
}
