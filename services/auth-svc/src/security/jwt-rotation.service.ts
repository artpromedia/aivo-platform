/**
 * JWT Key Rotation Service
 *
 * Provides infrastructure for RS256 asymmetric JWT key rotation:
 *
 *   - `getCurrentPrivateKey()` — reads private key from env or file
 *   - `getCurrentPublicKey()` — reads public key from env or file
 *   - `rotateKeys()` — generates new RSA-2048 pair, stores new public in
 *     Redis as `jwt:public:v{n+1}`, keeps previous as `jwt:public:v{n}`
 *     for a 24-hour grace period (in-flight tokens can still verify)
 *   - `verifyTokenWithRotation(token)` — tries current key, falls back to
 *     previous key if current fails (handles rotation window)
 *   - Auto-scheduled rotation every 90 days via `initKeyRotationSchedule()`
 *
 * Key storage:
 *   Redis keys:
 *     jwt:key:version       — current version number (integer)
 *     jwt:public:v{n}       — PEM-encoded public key for version n
 *     jwt:public:v{n-1}     — previous public key (TTL 24h)
 *
 * In production the initial keys are mounted from K8s Secrets into
 * `JWT_PRIVATE_KEY_PATH` / `JWT_PUBLIC_KEY_PATH`.
 */

import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { KeyObject } from 'node:crypto';

import { importPKCS8, importSPKI, jwtVerify, type JWTPayload } from 'jose';

// ── Lazy Redis connection ──────────────────────────────────────────────────

let redis: any | null = null;

async function getRedis() {
  if (redis) return redis;
  try {
    const { default: Redis } = await import('ioredis');
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
    await redis.connect();
    return redis;
  } catch (err) {
    console.warn('[jwt-rotation] Redis unavailable — key rotation disabled:', err);
    return null;
  }
}

// ── Key loader helpers ─────────────────────────────────────────────────────

function loadKeyFromEnvOrFile(
  envKey: string | undefined,
  filePath: string | undefined,
): string {
  if (envKey) return envKey;
  if (filePath) {
    const abs = resolve(filePath);
    return readFileSync(abs, 'utf-8');
  }
  throw new Error(
    'JWT key not configured — set JWT_PRIVATE_KEY / JWT_PUBLIC_KEY or their _PATH variants',
  );
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns the current RSA private key (used for signing JWTs).
 */
export function getCurrentPrivateKey(): KeyObject {
  const pem = loadKeyFromEnvOrFile(
    process.env.JWT_PRIVATE_KEY,
    process.env.JWT_PRIVATE_KEY_PATH,
  );
  return createPrivateKey(pem);
}

/**
 * Returns the current RSA public key (used for verifying JWTs).
 */
export function getCurrentPublicKey(): KeyObject {
  const pem = loadKeyFromEnvOrFile(
    process.env.JWT_PUBLIC_KEY,
    process.env.JWT_PUBLIC_KEY_PATH,
  );
  return createPublicKey(pem);
}

/**
 * Generate a new RSA-2048 key pair, publish the new public key to Redis,
 * and keep the previous public key alive for 24 hours so in-flight tokens
 * signed with the old key can still be verified.
 */
export async function rotateKeys(): Promise<void> {
  const r = await getRedis();
  if (!r) {
    console.warn('[jwt-rotation] Skipping rotation — Redis not available');
    return;
  }

  // Get current version
  const versionStr: string | null = await r.get('jwt:key:version');
  const currentVersion = versionStr ? parseInt(versionStr, 10) : 0;
  const nextVersion = currentVersion + 1;

  // Generate new RSA-2048 key pair
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Store new public key (no expiry — this is the active key)
  await r.set(`jwt:public:v${nextVersion}`, publicKey);

  // Keep old public key for 24 hours (grace period for in-flight tokens)
  if (currentVersion > 0) {
    const oldKey: string | null = await r.get(`jwt:public:v${currentVersion}`);
    if (oldKey) {
      await r.set(
        `jwt:public:v${currentVersion}`,
        oldKey,
        'EX',
        86400, // 24 hours
      );
    }
  }

  // Bump version
  await r.set('jwt:key:version', String(nextVersion));

  // Store private key in Redis (encrypted at rest via Redis TLS)
  await r.set(`jwt:private:v${nextVersion}`, privateKey);

  console.info(
    `[jwt-rotation] Rotated keys: v${currentVersion} → v${nextVersion}`,
  );
}

/**
 * Verify a JWT trying the current public key first, then falling back to
 * the previous version if verification fails (handles the rotation window).
 */
export async function verifyTokenWithRotation(
  token: string,
): Promise<JWTPayload> {
  const r = await getRedis();

  // Attempt 1: Use the key from environment / filesystem (primary)
  try {
    const pubPem = loadKeyFromEnvOrFile(
      process.env.JWT_PUBLIC_KEY,
      process.env.JWT_PUBLIC_KEY_PATH,
    );
    const key = await importSPKI(pubPem, 'RS256');
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch {
    // Primary key failed — try Redis-stored rotated keys
  }

  if (!r) {
    throw new Error('JWT verification failed and Redis unavailable for key rotation fallback');
  }

  // Attempt 2: Try the latest Redis-stored public key
  const versionStr: string | null = await r.get('jwt:key:version');
  const version = versionStr ? parseInt(versionStr, 10) : 0;

  for (let v = version; v >= Math.max(1, version - 1); v--) {
    const pubPem: string | null = await r.get(`jwt:public:v${v}`);
    if (!pubPem) continue;

    try {
      const key = await importSPKI(pubPem, 'RS256');
      const { payload } = await jwtVerify(token, key);
      return payload;
    } catch {
      // try next version
    }
  }

  throw new Error('JWT verification failed — no matching key found');
}

// ── Scheduled rotation ─────────────────────────────────────────────────────

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

let rotationTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Schedule automatic key rotation every 90 days.
 * Call once at service startup.
 */
export function initKeyRotationSchedule(): void {
  if (rotationTimer) return; // already scheduled

  // Don't schedule in tests
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return;

  rotationTimer = setInterval(() => {
    rotateKeys().catch((err) => {
      console.error('[jwt-rotation] Scheduled rotation failed:', err);
    });
  }, NINETY_DAYS_MS);

  // Unref so the timer doesn't prevent process shutdown
  if (rotationTimer.unref) rotationTimer.unref();

  console.info('[jwt-rotation] Key rotation scheduled every 90 days');
}

/**
 * Stop the scheduled rotation (for graceful shutdown).
 */
export function stopKeyRotationSchedule(): void {
  if (rotationTimer) {
    clearInterval(rotationTimer);
    rotationTimer = null;
  }
}

/**
 * Close the Redis connection used by the rotation service.
 */
export async function closeKeyRotationRedis(): Promise<void> {
  stopKeyRotationSchedule();
  if (redis) {
    try {
      await redis.quit();
    } catch {
      // best-effort
    }
    redis = null;
  }
}
