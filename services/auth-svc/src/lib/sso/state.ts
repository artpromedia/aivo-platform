/**
 * SSO State Management
 *
 * Manages SSO flow state (CSRF protection, nonce, relay state).
 * Uses short-lived encrypted tokens stored in memory or Redis.
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';

import type { SsoState } from './types.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const ALGORITHM = 'aes-256-gcm';

// In production, this should come from env/secrets
const STATE_ENCRYPTION_KEY =
  process.env.SSO_STATE_ENCRYPTION_KEY || 'default-dev-key-change-in-production-32';

// Derive a 32-byte key from the config
const encryptionKey = createHash('sha256').update(STATE_ENCRYPTION_KEY).digest();

// In-memory store (use Redis in production for multi-instance)
const stateStore = new Map<string, { encrypted: string; expiresAt: number }>();

// ============================================================================
// STATE CREATION & VALIDATION
// ============================================================================

/**
 * Generate a new SSO state token.
 */
export function generateSsoState(params: Omit<SsoState, 'nonce' | 'initiatedAt'>): string {
  const nonce = randomBytes(16).toString('hex');
  const state: SsoState = {
    ...params,
    nonce,
    initiatedAt: Date.now(),
  };

  const stateId = randomBytes(16).toString('hex');
  const encrypted = encryptState(state);

  stateStore.set(stateId, {
    encrypted,
    expiresAt: Date.now() + STATE_TTL_MS,
  });

  // Cleanup expired states periodically
  cleanupExpiredStates();

  return stateId;
}

/**
 * Validate and consume an SSO state token.
 * Returns the state if valid, throws if invalid or expired.
 */
export function validateSsoState(stateId: string): SsoState {
  const entry = stateStore.get(stateId);

  if (!entry) {
    throw new SsoStateError('STATE_NOT_FOUND', 'SSO state not found');
  }

  // Remove the state (single-use)
  stateStore.delete(stateId);

  if (Date.now() > entry.expiresAt) {
    throw new SsoStateError('STATE_EXPIRED', 'SSO state has expired');
  }

  try {
    return decryptState(entry.encrypted);
  } catch {
    throw new SsoStateError('STATE_INVALID', 'Failed to decrypt SSO state');
  }
}

/**
 * Get state without consuming it (for debugging/logging).
 */
export function peekSsoState(stateId: string): SsoState | null {
  const entry = stateStore.get(stateId);
  if (!entry || Date.now() > entry.expiresAt) {
    return null;
  }
  try {
    return decryptState(entry.encrypted);
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
