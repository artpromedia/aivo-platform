/**
 * Crypto Service
 *
 * Cryptographic utilities for password hashing and token generation.
 */

import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

@Injectable()
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
  async generateSecureToken(length: number = 32): Promise<string> {
    return randomBytes(length).toString('hex');
  }

  /**
   * Generate a short numeric code (for SMS/email verification)
   */
  generateNumericCode(length: number = 6): string {
    const max = Math.pow(10, length);
    const min = Math.pow(10, length - 1);
    const code = Math.floor(Math.random() * (max - min)) + min;
    return code.toString();
  }

  /**
   * Create a SHA-256 hash
   */
  sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
}
