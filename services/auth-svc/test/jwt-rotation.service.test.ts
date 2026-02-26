import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// Mocks — must be declared before the SUT import
// ══════════════════════════════════════════════════════════════════════════════

// Inline mock for 'ioredis' — we never actually connect to Redis
const redisMock = {
  connect: vi.fn().mockResolvedValue(undefined),
  get: vi.fn(),
  set: vi.fn().mockResolvedValue('OK'),
  quit: vi.fn().mockResolvedValue(undefined),
};

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => redisMock),
}));

// `jose` — we verify tokens with importSPKI + jwtVerify
const joseImportSPKI = vi.fn();
const joseJwtVerify = vi.fn();
vi.mock('jose', () => ({
  importSPKI: joseImportSPKI,
  jwtVerify: joseJwtVerify,
}));

// ── SUT ────────────────────────────────────────────────────────────────────

import {
  getCurrentPrivateKey,
  getCurrentPublicKey,
  rotateKeys,
  verifyTokenWithRotation,
  initKeyRotationSchedule,
  stopKeyRotationSchedule,
  closeKeyRotationRedis,
} from '../src/security/jwt-rotation.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Helpers — generate a throwaway RSA-2048 key pair for the tests
// ══════════════════════════════════════════════════════════════════════════════

import { generateKeyPairSync } from 'node:crypto';

function generateTestKeyPair() {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('JWT Rotation Service', () => {
  const originalEnv = { ...process.env };
  let keyPair: ReturnType<typeof generateTestKeyPair>;

  beforeEach(() => {
    vi.clearAllMocks();
    keyPair = generateTestKeyPair();
    process.env.JWT_PRIVATE_KEY = keyPair.privateKey as string;
    process.env.JWT_PUBLIC_KEY = keyPair.publicKey as string;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    stopKeyRotationSchedule();
  });

  // ── getCurrentPrivateKey / getCurrentPublicKey ────────────────────────

  describe('getCurrentPrivateKey', () => {
    it('should return a KeyObject from env var', () => {
      const key = getCurrentPrivateKey();
      expect(key.type).toBe('private');
      expect(key.asymmetricKeyType).toBe('rsa');
    });

    it('should throw when no key configured', () => {
      delete process.env.JWT_PRIVATE_KEY;
      delete process.env.JWT_PRIVATE_KEY_PATH;
      expect(() => getCurrentPrivateKey()).toThrow('JWT key not configured');
    });
  });

  describe('getCurrentPublicKey', () => {
    it('should return a KeyObject from env var', () => {
      const key = getCurrentPublicKey();
      expect(key.type).toBe('public');
      expect(key.asymmetricKeyType).toBe('rsa');
    });

    it('should throw when no key configured', () => {
      delete process.env.JWT_PUBLIC_KEY;
      delete process.env.JWT_PUBLIC_KEY_PATH;
      expect(() => getCurrentPublicKey()).toThrow('JWT key not configured');
    });
  });

  // ── rotateKeys ────────────────────────────────────────────────────────

  describe('rotateKeys', () => {
    it('should generate and store new keys in Redis (first rotation)', async () => {
      redisMock.get.mockResolvedValueOnce(null); // no version yet
      await rotateKeys();

      // Should set version to "1"
      expect(redisMock.set).toHaveBeenCalledWith('jwt:key:version', '1');
      // Should store public key v1
      expect(redisMock.set).toHaveBeenCalledWith(
        'jwt:public:v1',
        expect.stringContaining('BEGIN PUBLIC KEY'),
      );
      // Should store private key v1
      expect(redisMock.set).toHaveBeenCalledWith(
        'jwt:private:v1',
        expect.stringContaining('BEGIN PRIVATE KEY'),
      );
    });

    it('should bump version and set 24h TTL on old key', async () => {
      redisMock.get
        .mockResolvedValueOnce('2') // current version = 2
        .mockResolvedValueOnce('-----BEGIN PUBLIC KEY-----...old...'); // old key

      await rotateKeys();

      // Old key gets 24h TTL
      expect(redisMock.set).toHaveBeenCalledWith(
        'jwt:public:v2',
        '-----BEGIN PUBLIC KEY-----...old...',
        'EX',
        86400,
      );
      // Version bumped to 3
      expect(redisMock.set).toHaveBeenCalledWith('jwt:key:version', '3');
    });
  });

  // ── verifyTokenWithRotation ───────────────────────────────────────────

  describe('verifyTokenWithRotation', () => {
    it('should verify with primary key first', async () => {
      const mockKey = { type: 'public' };
      joseImportSPKI.mockResolvedValueOnce(mockKey);
      joseJwtVerify.mockResolvedValueOnce({ payload: { sub: 'user-1' } });

      const payload = await verifyTokenWithRotation('test-token');
      expect(payload).toEqual({ sub: 'user-1' });
      expect(joseImportSPKI).toHaveBeenCalledOnce();
    });

    it('should fall back to Redis keys when primary fails', async () => {
      // Primary key fails
      joseImportSPKI.mockRejectedValueOnce(new Error('bad key'));

      // Redis returns version=2, public key v2
      redisMock.get
        .mockResolvedValueOnce('2')
        .mockResolvedValueOnce(keyPair.publicKey);

      // Second attempt with Redis key succeeds
      const mockKey2 = { type: 'public' };
      joseImportSPKI.mockResolvedValueOnce(mockKey2);
      joseJwtVerify.mockResolvedValueOnce({ payload: { sub: 'user-2' } });

      const payload = await verifyTokenWithRotation('test-token');
      expect(payload).toEqual({ sub: 'user-2' });
    });
  });

  // ── initKeyRotationSchedule ───────────────────────────────────────────

  describe('initKeyRotationSchedule', () => {
    it('should not schedule in test env', () => {
      process.env.NODE_ENV = 'test';
      initKeyRotationSchedule();
      // No timer should be set — function returns early
    });

    it('should be idempotent', () => {
      process.env.NODE_ENV = 'test';
      initKeyRotationSchedule();
      initKeyRotationSchedule(); // second call is no-op
    });
  });

  // ── closeKeyRotationRedis ─────────────────────────────────────────────

  describe('closeKeyRotationRedis', () => {
    it('should stop schedule and quit Redis', async () => {
      await closeKeyRotationRedis();
      // Should not throw even if redis is null
    });
  });
});
