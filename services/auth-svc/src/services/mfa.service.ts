/**
 * Multi-Factor Authentication (MFA) Service
 *
 * Implements TOTP-based MFA with backup codes.
 * SOC 2 Type II compliant implementation.
 *
 * Features:
 * - TOTP generation and verification (RFC 6238)
 * - Backup code generation and management
 * - MFA challenge flow for login
 * - Encrypted secret storage
 *
 * Created: January 2026 - Enterprise QA Audit requirement
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import type { PrismaClient } from '../generated/prisma-client/index.js';
import type { Redis } from 'ioredis';
import { config } from '../config.js';

// ============================================================================
// TOTP Implementation (RFC 6238)
// ============================================================================

const TOTP_STEP = 30; // 30-second time step
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1; // Allow 1 step before/after current time

/**
 * Generate a random base32 secret for TOTP
 */
function generateTotpSecret(): string {
  const bytes = randomBytes(20); // 160 bits
  return base32Encode(bytes);
}

/**
 * Base32 encoding (RFC 4648)
 */
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

/**
 * Base32 decoding
 */
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

/**
 * Generate TOTP code for a given secret and time
 */
function generateTotpCode(secret: string, time?: number): string {
  const counter = Math.floor((time ?? Date.now() / 1000) / TOTP_STEP);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  // HMAC-SHA1
  const crypto = await import('node:crypto');
  const hmac = crypto.createHmac('sha1', base32Decode(secret));
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1]! & 0x0f;
  const binary =
    ((hash[offset]! & 0x7f) << 24) |
    ((hash[offset + 1]! & 0xff) << 16) |
    ((hash[offset + 2]! & 0xff) << 8) |
    (hash[offset + 3]! & 0xff);

  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Verify a TOTP code (with time window tolerance)
 */
async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  const now = Date.now() / 1000;

  for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
    const time = now + i * TOTP_STEP;
    const expectedCode = await generateTotpCodeAsync(secret, time);
    if (timingSafeEqual(code, expectedCode)) {
      return true;
    }
  }

  return false;
}

async function generateTotpCodeAsync(secret: string, time: number): Promise<string> {
  const counter = Math.floor(time / TOTP_STEP);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const crypto = await import('node:crypto');
  const hmac = crypto.createHmac('sha1', base32Decode(secret));
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1]! & 0x0f;
  const binary =
    ((hash[offset]! & 0x7f) << 24) |
    ((hash[offset + 1]! & 0xff) << 16) |
    ((hash[offset + 2]! & 0xff) << 8) |
    (hash[offset + 3]! & 0xff);

  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================================
// Encryption Utilities
// ============================================================================

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.MFA_ENCRYPTION_KEY || config.mfaEncryptionKey;
  if (!key) {
    throw new Error('MFA_ENCRYPTION_KEY is not configured');
  }
  // Derive a 32-byte key from the configured key
  return createHash('sha256').update(key).digest();
}

function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptSecret(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }

  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex!, 'hex');
  const authTag = Buffer.from(authTagHex!, 'hex');

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext!, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============================================================================
// Backup Codes
// ============================================================================

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    // Generate readable backup codes (e.g., "ABCD-1234")
    const part1 = randomBytes(2).toString('hex').toUpperCase();
    const part2 = randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

function hashBackupCode(code: string): string {
  return createHash('sha256').update(code.replace('-', '').toUpperCase()).digest('hex');
}

// ============================================================================
// Types
// ============================================================================

export interface MfaSetupResult {
  secret: string;
  qrCodeUri: string;
  backupCodes: string[];
}

export interface MfaVerifyResult {
  success: boolean;
  remainingAttempts?: number;
}

export interface MfaStatus {
  enabled: boolean;
  method: string;
  verifiedAt?: Date;
  backupCodesRemaining: number;
}

export interface MfaChallengeResult {
  challengeId: string;
  method: string;
  expiresAt: Date;
}

// ============================================================================
// MFA Service
// ============================================================================

export class MfaService {
  private readonly prisma: PrismaClient;
  private readonly redis: Redis | null;

  constructor(prisma: PrismaClient, redis?: Redis) {
    this.prisma = prisma;
    this.redis = redis ?? null;
  }

  /**
   * Initialize MFA setup for a user
   * Returns the TOTP secret and backup codes (displayed once)
   */
  async initializeSetup(userId: string, tenantId: string): Promise<MfaSetupResult> {
    // Check if MFA is already enabled
    const existing = await this.prisma.mfaConfig.findFirst({
      where: { userId, tenantId },
    });

    if (existing?.enabled) {
      throw new Error('MFA is already enabled. Disable it first to set up again.');
    }

    // Generate new TOTP secret
    const secret = generateTotpSecret();
    const encryptedSecret = encryptSecret(secret);

    // Generate backup codes
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    // Get user email for QR code
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create or update MFA config (not enabled yet, requires verification)
    await this.prisma.mfaConfig.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      create: {
        userId,
        tenantId,
        enabled: false,
        method: 'totp',
        totpSecretEncrypted: encryptedSecret,
        backupCodes: hashedBackupCodes,
        backupCodesGeneratedAt: new Date(),
      },
      update: {
        totpSecretEncrypted: encryptedSecret,
        backupCodes: hashedBackupCodes,
        backupCodesGeneratedAt: new Date(),
        totpVerifiedAt: null,
        enabled: false,
      },
    });

    // Generate QR code URI (otpauth://)
    const issuer = encodeURIComponent('AIVO');
    const account = encodeURIComponent(user.email);
    const qrCodeUri = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP}`;

    return {
      secret,
      qrCodeUri,
      backupCodes,
    };
  }

  /**
   * Verify and enable MFA
   * User must verify their TOTP code before MFA is active
   */
  async verifyAndEnable(userId: string, tenantId: string, code: string): Promise<boolean> {
    const mfaConfig = await this.prisma.mfaConfig.findFirst({
      where: { userId, tenantId },
    });

    if (!mfaConfig || !mfaConfig.totpSecretEncrypted) {
      throw new Error('MFA setup not initialized. Please start setup first.');
    }

    if (mfaConfig.enabled) {
      throw new Error('MFA is already enabled.');
    }

    // Decrypt and verify the TOTP code
    const secret = decryptSecret(mfaConfig.totpSecretEncrypted);
    const isValid = await verifyTotpCode(secret, code);

    if (!isValid) {
      throw new Error('Invalid verification code. Please try again.');
    }

    // Enable MFA
    await this.prisma.mfaConfig.update({
      where: { id: mfaConfig.id },
      data: {
        enabled: true,
        totpVerifiedAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Disable MFA for a user
   */
  async disable(userId: string, tenantId: string, code: string): Promise<boolean> {
    const mfaConfig = await this.prisma.mfaConfig.findFirst({
      where: { userId, tenantId, enabled: true },
    });

    if (!mfaConfig) {
      throw new Error('MFA is not enabled.');
    }

    // Verify current code before disabling
    const secret = decryptSecret(mfaConfig.totpSecretEncrypted!);
    const isValid = await verifyTotpCode(secret, code);

    if (!isValid) {
      throw new Error('Invalid verification code.');
    }

    // Disable MFA
    await this.prisma.mfaConfig.update({
      where: { id: mfaConfig.id },
      data: {
        enabled: false,
        totpSecretEncrypted: null,
        backupCodes: [],
      },
    });

    return true;
  }

  /**
   * Get MFA status for a user
   */
  async getStatus(userId: string, tenantId: string): Promise<MfaStatus> {
    const mfaConfig = await this.prisma.mfaConfig.findFirst({
      where: { userId, tenantId },
    });

    if (!mfaConfig) {
      return {
        enabled: false,
        method: 'none',
        backupCodesRemaining: 0,
      };
    }

    return {
      enabled: mfaConfig.enabled,
      method: mfaConfig.method,
      verifiedAt: mfaConfig.totpVerifiedAt ?? undefined,
      backupCodesRemaining: mfaConfig.backupCodes.length,
    };
  }

  /**
   * Create an MFA challenge for login verification
   */
  async createChallenge(
    userId: string,
    sessionId: string,
    method: string = 'totp'
  ): Promise<MfaChallengeResult> {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const challenge = await this.prisma.mfaChallenge.create({
      data: {
        userId,
        sessionId,
        method,
        attempts: 0,
        maxAttempts: 3,
        expiresAt,
      },
    });

    return {
      challengeId: challenge.id,
      method,
      expiresAt,
    };
  }

  /**
   * Verify an MFA challenge during login
   */
  async verifyChallenge(
    challengeId: string,
    userId: string,
    code: string
  ): Promise<MfaVerifyResult> {
    // Get the challenge
    const challenge = await this.prisma.mfaChallenge.findFirst({
      where: {
        id: challengeId,
        userId,
        verified: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!challenge) {
      throw new Error('Challenge not found or expired.');
    }

    // Check attempt limit
    if (challenge.attempts >= challenge.maxAttempts) {
      throw new Error('Maximum attempts exceeded. Please try logging in again.');
    }

    // Get MFA config
    const mfaConfig = await this.prisma.mfaConfig.findFirst({
      where: { userId, enabled: true },
    });

    if (!mfaConfig) {
      throw new Error('MFA is not configured for this user.');
    }

    // Try TOTP first
    let isValid = false;

    if (mfaConfig.totpSecretEncrypted) {
      const secret = decryptSecret(mfaConfig.totpSecretEncrypted);
      isValid = await verifyTotpCode(secret, code);
    }

    // If TOTP fails, try backup code
    if (!isValid) {
      const backupResult = await this.verifyBackupCode(mfaConfig.id, code);
      isValid = backupResult;
    }

    if (!isValid) {
      // Increment attempts
      await this.prisma.mfaChallenge.update({
        where: { id: challengeId },
        data: { attempts: challenge.attempts + 1 },
      });

      return {
        success: false,
        remainingAttempts: challenge.maxAttempts - challenge.attempts - 1,
      };
    }

    // Mark challenge as verified
    await this.prisma.mfaChallenge.update({
      where: { id: challengeId },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Verify and consume a backup code
   */
  private async verifyBackupCode(mfaConfigId: string, code: string): Promise<boolean> {
    const mfaConfig = await this.prisma.mfaConfig.findUnique({
      where: { id: mfaConfigId },
    });

    if (!mfaConfig) return false;

    const codeHash = hashBackupCode(code);
    const codeIndex = mfaConfig.backupCodes.indexOf(codeHash);

    if (codeIndex === -1) return false;

    // Remove the used backup code
    const updatedCodes = [...mfaConfig.backupCodes];
    updatedCodes.splice(codeIndex, 1);

    await this.prisma.mfaConfig.update({
      where: { id: mfaConfigId },
      data: { backupCodes: updatedCodes },
    });

    return true;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(
    userId: string,
    tenantId: string,
    currentCode: string
  ): Promise<string[]> {
    const mfaConfig = await this.prisma.mfaConfig.findFirst({
      where: { userId, tenantId, enabled: true },
    });

    if (!mfaConfig) {
      throw new Error('MFA is not enabled.');
    }

    // Verify current TOTP code
    const secret = decryptSecret(mfaConfig.totpSecretEncrypted!);
    const isValid = await verifyTotpCode(secret, currentCode);

    if (!isValid) {
      throw new Error('Invalid verification code.');
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    await this.prisma.mfaConfig.update({
      where: { id: mfaConfig.id },
      data: {
        backupCodes: hashedBackupCodes,
        backupCodesGeneratedAt: new Date(),
      },
    });

    return backupCodes;
  }

  /**
   * Check if a user has MFA enabled
   */
  async isEnabled(userId: string, tenantId: string): Promise<boolean> {
    const mfaConfig = await this.prisma.mfaConfig.findFirst({
      where: { userId, tenantId, enabled: true },
    });

    return mfaConfig !== null;
  }
}

// Factory function
export function createMfaService(prisma: PrismaClient, redis?: Redis): MfaService {
  return new MfaService(prisma, redis);
}
