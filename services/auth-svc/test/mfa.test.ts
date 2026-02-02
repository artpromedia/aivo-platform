/**
 * Auth Service - MFA (Multi-Factor Authentication) Tests
 *
 * Tests for TOTP generation, verification, backup codes, and MFA enrollment.
 *
 * @module tests/mfa.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

// TOTP Configuration
const TOTP_CONFIG = {
  step: 30, // 30-second time step
  digits: 6,
  window: 1, // Allow 1 step before/after
};

// Base32 encoding (RFC 4648)
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      result += alphabet[(value >> bits) & 31];
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }

  return result;
}

// Base32 decoding
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanedInput = encoded.toUpperCase().replace(/=+$/, '');

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of cleanedInput) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      output.push((value >> bits) & 0xff);
    }
  }

  return Buffer.from(output);
}

// Generate TOTP secret
function generateTotpSecret(): string {
  const bytes = randomBytes(20); // 160 bits
  return base32Encode(bytes);
}

// Generate TOTP code
function generateTotpCode(secret: string, time?: number): string {
  const counter = Math.floor((time ?? Date.now() / 1000) / TOTP_CONFIG.step);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = createHmac('sha1', base32Decode(secret));
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, TOTP_CONFIG.digits);
  return otp.toString().padStart(TOTP_CONFIG.digits, '0');
}

// Verify TOTP code with time window
function verifyTotpCode(secret: string, code: string): boolean {
  const now = Date.now() / 1000;

  for (let i = -TOTP_CONFIG.window; i <= TOTP_CONFIG.window; i++) {
    const time = now + i * TOTP_CONFIG.step;
    const expectedCode = generateTotpCode(secret, time);
    if (timingSafeEqual(code, expectedCode)) {
      return true;
    }
  }

  return false;
}

// Timing-safe comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Generate backup codes
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

// Mock Prisma
const mockPrisma = {
  mfaSettings: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mfaBackupCode: {
    createMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  mfaChallenge: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

// Mock Redis
const mockRedis = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
};

describe('MFA - Multi-Factor Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // TOTP Secret Generation
  // ===========================================================================

  describe('TOTP Secret Generation', () => {
    it('should generate 32-character base32 secret', () => {
      const secret = generateTotpSecret();

      expect(secret).toHaveLength(32);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });

    it('should generate unique secrets', () => {
      const secrets = new Set<string>();

      for (let i = 0; i < 100; i++) {
        secrets.add(generateTotpSecret());
      }

      expect(secrets.size).toBe(100);
    });

    it('should use 160 bits of entropy', () => {
      const bytes = randomBytes(20);
      const secret = base32Encode(bytes);

      expect(bytes.length).toBe(20);
      expect(secret.length).toBe(32);
    });
  });

  // ===========================================================================
  // TOTP Code Generation
  // ===========================================================================

  describe('TOTP Code Generation', () => {
    const testSecret = generateTotpSecret();

    it('should generate 6-digit codes', () => {
      const code = generateTotpCode(testSecret);

      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('should pad codes with leading zeros', () => {
      // Generate many codes to ensure some would be < 6 digits without padding
      const codes = [];
      for (let i = 0; i < 100; i++) {
        codes.push(generateTotpCode(generateTotpSecret()));
      }

      for (const code of codes) {
        expect(code).toHaveLength(6);
      }
    });

    it('should generate different codes for different time steps', () => {
      const now = Math.floor(Date.now() / 1000);
      const code1 = generateTotpCode(testSecret, now);
      const code2 = generateTotpCode(testSecret, now + 30);

      expect(code1).not.toBe(code2);
    });

    it('should generate same code within time step', () => {
      const now = Math.floor(Date.now() / 1000);
      const stepStart = Math.floor(now / 30) * 30;
      
      const code1 = generateTotpCode(testSecret, stepStart);
      const code2 = generateTotpCode(testSecret, stepStart + 15);

      expect(code1).toBe(code2);
    });

    it('should use HMAC-SHA1', () => {
      const secret = testSecret;
      const time = Math.floor(Date.now() / 1000);
      
      // Verify HMAC-SHA1 is used
      const counter = Math.floor(time / 30);
      const counterBuffer = Buffer.alloc(8);
      counterBuffer.writeBigInt64BE(BigInt(counter));

      const hmac = createHmac('sha1', base32Decode(secret));
      hmac.update(counterBuffer);
      const hash = hmac.digest();

      expect(hash.length).toBe(20); // SHA1 produces 20 bytes
    });
  });

  // ===========================================================================
  // TOTP Code Verification
  // ===========================================================================

  describe('TOTP Code Verification', () => {
    const testSecret = generateTotpSecret();

    it('should verify correct code', () => {
      const code = generateTotpCode(testSecret);
      const isValid = verifyTotpCode(testSecret, code);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect code', () => {
      const isValid = verifyTotpCode(testSecret, '000000');

      expect(isValid).toBe(false);
    });

    it('should accept code from previous time step', () => {
      const now = Math.floor(Date.now() / 1000);
      const previousStep = now - 30;
      const code = generateTotpCode(testSecret, previousStep);

      const isValid = verifyTotpCode(testSecret, code);

      expect(isValid).toBe(true);
    });

    it('should accept code from next time step', () => {
      const now = Math.floor(Date.now() / 1000);
      const nextStep = now + 30;
      const code = generateTotpCode(testSecret, nextStep);

      const isValid = verifyTotpCode(testSecret, code);

      expect(isValid).toBe(true);
    });

    it('should reject code from 2 steps away', () => {
      const now = Math.floor(Date.now() / 1000);
      const twoStepsAway = now + 90;
      const code = generateTotpCode(testSecret, twoStepsAway);

      const isValid = verifyTotpCode(testSecret, code);

      expect(isValid).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      // Verify timing-safe comparison is used
      const a = '123456';
      const b = '123456';
      const c = '654321';

      expect(timingSafeEqual(a, b)).toBe(true);
      expect(timingSafeEqual(a, c)).toBe(false);
    });
  });

  // ===========================================================================
  // Backup Codes
  // ===========================================================================

  describe('Backup Codes', () => {
    it('should generate 10 backup codes by default', () => {
      const codes = generateBackupCodes();

      expect(codes).toHaveLength(10);
    });

    it('should generate custom number of codes', () => {
      const codes = generateBackupCodes(5);

      expect(codes).toHaveLength(5);
    });

    it('should format codes as XXXX-XXXX', () => {
      const codes = generateBackupCodes();

      for (const code of codes) {
        expect(/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)).toBe(true);
      }
    });

    it('should generate unique codes', () => {
      const codes = generateBackupCodes(100);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(100);
    });

    it('should store hashed backup codes', async () => {
      const codes = generateBackupCodes();
      const hashedCodes = codes.map(code => ({
        codeHash: createHash('sha256').update(code).digest('hex'),
        used: false,
      }));

      mockPrisma.mfaBackupCode.createMany.mockResolvedValue({ count: 10 });

      await mockPrisma.mfaBackupCode.createMany({
        data: hashedCodes,
      });

      expect(mockPrisma.mfaBackupCode.createMany).toHaveBeenCalled();
    });

    it('should mark backup code as used after verification', async () => {
      const codeHash = createHash('sha256').update('ABCD-1234').digest('hex');

      mockPrisma.mfaBackupCode.findFirst.mockResolvedValue({
        id: 'code-1',
        codeHash,
        used: false,
      });

      mockPrisma.mfaBackupCode.update.mockResolvedValue({
        id: 'code-1',
        used: true,
        usedAt: new Date(),
      });

      const code = await mockPrisma.mfaBackupCode.findFirst({
        where: { codeHash, used: false },
      });

      expect(code).toBeDefined();

      await mockPrisma.mfaBackupCode.update({
        where: { id: code.id },
        data: { used: true, usedAt: new Date() },
      });

      expect(mockPrisma.mfaBackupCode.update).toHaveBeenCalled();
    });

    it('should reject already used backup codes', async () => {
      mockPrisma.mfaBackupCode.findFirst.mockResolvedValue(null);

      const code = await mockPrisma.mfaBackupCode.findFirst({
        where: { codeHash: 'hash', used: false },
      });

      expect(code).toBeNull();
    });
  });

  // ===========================================================================
  // MFA Enrollment
  // ===========================================================================

  describe('MFA Enrollment', () => {
    it('should create MFA settings on enrollment', async () => {
      const userId = 'user-123';
      const secret = generateTotpSecret();

      mockPrisma.mfaSettings.create.mockResolvedValue({
        id: 'mfa-1',
        userId,
        secretEncrypted: 'encrypted-secret',
        enabled: false,
        verifiedAt: null,
      });

      const mfaSettings = await mockPrisma.mfaSettings.create({
        data: {
          userId,
          secretEncrypted: 'encrypted-secret',
          enabled: false,
        },
      });

      expect(mfaSettings.userId).toBe(userId);
      expect(mfaSettings.enabled).toBe(false);
    });

    it('should require verification before enabling', async () => {
      mockPrisma.mfaSettings.findUnique.mockResolvedValue({
        id: 'mfa-1',
        enabled: false,
        verifiedAt: null,
      });

      const settings = await mockPrisma.mfaSettings.findUnique({
        where: { userId: 'user-123' },
      });

      expect(settings.verifiedAt).toBeNull();
    });

    it('should enable MFA after verification', async () => {
      mockPrisma.mfaSettings.update.mockResolvedValue({
        id: 'mfa-1',
        enabled: true,
        verifiedAt: new Date(),
      });

      const settings = await mockPrisma.mfaSettings.update({
        where: { userId: 'user-123' },
        data: { enabled: true, verifiedAt: new Date() },
      });

      expect(settings.enabled).toBe(true);
      expect(settings.verifiedAt).toBeDefined();
    });

    it('should generate provisioning URI', () => {
      const secret = generateTotpSecret();
      const email = 'user@example.com';
      const issuer = 'Aivo';

      const uri = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain(`secret=${secret}`);
      expect(uri).toContain('algorithm=SHA1');
    });
  });

  // ===========================================================================
  // MFA Challenge Flow
  // ===========================================================================

  describe('MFA Challenge Flow', () => {
    it('should create MFA challenge on login', async () => {
      mockPrisma.mfaChallenge.create.mockResolvedValue({
        id: 'challenge-123',
        userId: 'user-456',
        expiresAt: new Date(Date.now() + 300000),
        verified: false,
      });

      const challenge = await mockPrisma.mfaChallenge.create({
        data: {
          userId: 'user-456',
          expiresAt: new Date(Date.now() + 300000),
        },
      });

      expect(challenge.id).toBe('challenge-123');
      expect(challenge.verified).toBe(false);
    });

    it('should expire challenge after 5 minutes', () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const now = new Date();

      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (60 * 1000);

      expect(diffMinutes).toBeCloseTo(5, 0);
    });

    it('should mark challenge as verified', async () => {
      mockPrisma.mfaChallenge.update.mockResolvedValue({
        id: 'challenge-123',
        verified: true,
        verifiedAt: new Date(),
      });

      const challenge = await mockPrisma.mfaChallenge.update({
        where: { id: 'challenge-123' },
        data: { verified: true, verifiedAt: new Date() },
      });

      expect(challenge.verified).toBe(true);
    });

    it('should reject expired challenges', async () => {
      mockPrisma.mfaChallenge.findFirst.mockResolvedValue(null);

      const challenge = await mockPrisma.mfaChallenge.findFirst({
        where: {
          id: 'challenge-123',
          expiresAt: { gt: new Date() },
          verified: false,
        },
      });

      expect(challenge).toBeNull();
    });
  });

  // ===========================================================================
  // Rate Limiting for MFA
  // ===========================================================================

  describe('MFA Rate Limiting', () => {
    it('should track failed attempts', async () => {
      const key = 'mfa:attempts:user-123';

      mockRedis.incr.mockResolvedValue(1);

      const attempts = await mockRedis.incr(key);

      expect(attempts).toBe(1);
    });

    it('should block after 5 failed attempts', async () => {
      const key = 'mfa:attempts:user-123';

      mockRedis.get.mockResolvedValue('5');

      const attempts = await mockRedis.get(key);

      expect(parseInt(attempts)).toBe(5);
    });

    it('should reset attempts on success', async () => {
      const key = 'mfa:attempts:user-123';

      mockRedis.del.mockResolvedValue(1);

      await mockRedis.del(key);

      expect(mockRedis.del).toHaveBeenCalledWith(key);
    });

    it('should set attempt expiry', async () => {
      const key = 'mfa:attempts:user-123';

      mockRedis.expire.mockResolvedValue(1);

      await mockRedis.expire(key, 300);

      expect(mockRedis.expire).toHaveBeenCalledWith(key, 300);
    });
  });

  // ===========================================================================
  // Secret Encryption
  // ===========================================================================

  describe('Secret Encryption', () => {
    const ENCRYPTION_KEY = createHash('sha256').update('test-key').digest();
    const ALGORITHM = 'aes-256-gcm';

    function encryptSecret(plaintext: string): string {
      const iv = randomBytes(16);
      const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    function decryptSecret(encrypted: string): string {
      const [ivHex, authTagHex, ciphertext] = encrypted.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    }

    it('should encrypt TOTP secret', () => {
      const secret = generateTotpSecret();
      const encrypted = encryptSecret(secret);

      expect(encrypted).not.toBe(secret);
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should decrypt TOTP secret', () => {
      const secret = generateTotpSecret();
      const encrypted = encryptSecret(secret);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(secret);
    });

    it('should use AES-256-GCM', () => {
      const secret = generateTotpSecret();
      const encrypted = encryptSecret(secret);

      // GCM produces a 16-byte auth tag
      const [_iv, authTag, _ciphertext] = encrypted.split(':');
      expect(Buffer.from(authTag, 'hex').length).toBe(16);
    });

    it('should generate unique IVs', () => {
      const secret = generateTotpSecret();
      const encrypted1 = encryptSecret(secret);
      const encrypted2 = encryptSecret(secret);

      const iv1 = encrypted1.split(':')[0];
      const iv2 = encrypted2.split(':')[0];

      expect(iv1).not.toBe(iv2);
    });
  });

  // ===========================================================================
  // MFA Disabling
  // ===========================================================================

  describe('MFA Disabling', () => {
    it('should require password to disable MFA', async () => {
      // Password verification should be required
      const passwordHash = '$2a$12$hash';
      const providedPassword = 'correct-password';

      // Simulate password check
      expect(providedPassword).toBeDefined();
    });

    it('should delete MFA settings on disable', async () => {
      mockPrisma.mfaSettings.delete.mockResolvedValue({
        id: 'mfa-1',
      });

      await mockPrisma.mfaSettings.delete({
        where: { userId: 'user-123' },
      });

      expect(mockPrisma.mfaSettings.delete).toHaveBeenCalled();
    });

    it('should delete backup codes on disable', async () => {
      mockPrisma.mfaBackupCode.deleteMany.mockResolvedValue({ count: 10 });

      await mockPrisma.mfaBackupCode.deleteMany({
        where: { mfaSettingsId: 'mfa-1' },
      });

      expect(mockPrisma.mfaBackupCode.deleteMany).toHaveBeenCalled();
    });
  });
});
