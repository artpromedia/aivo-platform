/**
 * Crypto Service
 *
 * Cryptographic utilities for password hashing and token generation.
 */

import { randomBytes, randomInt, createHash } from 'node:crypto';

import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export class CryptoService {
  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a cryptographically secure random token
   */
  async generateSecureToken(length = 32): Promise<string> {
    return randomBytes(length).toString('hex');
  }

  /**
   * Generate a cryptographically secure numeric code (for SMS/email verification)
   * Uses crypto.randomInt() instead of Math.random() for security
   */
  generateNumericCode(length = 6): string {
    const max = Math.pow(10, length);
    const min = Math.pow(10, length - 1);
    // Use cryptographically secure randomInt instead of Math.random()
    const code = randomInt(min, max);
    return code.toString();
  }

  /**
   * Create a SHA-256 hash
   */
  sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
}
