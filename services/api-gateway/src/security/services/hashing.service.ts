/**
 * Hashing Service
 * Provides secure password hashing using Argon2id
 */

import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { ENCRYPTION, AUTH } from '../constants';

@Injectable()
export class HashingService {
  private readonly logger = new Logger(HashingService.name);
  
  /**
   * Hash a password using Argon2id
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: ENCRYPTION.ARGON2.MEMORY_COST,
        timeCost: ENCRYPTION.ARGON2.TIME_COST,
        parallelism: ENCRYPTION.ARGON2.PARALLELISM,
        hashLength: ENCRYPTION.ARGON2.HASH_LENGTH,
      });
      
      return hash;
    } catch (error) {
      this.logger.error('Password hashing failed', { error: error.message });
      throw new Error('Password hashing failed');
    }
  }
  
  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      this.logger.error('Password verification failed', { error: error.message });
      return false;
    }
  }
  
  /**
   * Check if a password hash needs rehashing (parameters changed)
   */
  async needsRehash(hash: string): Promise<boolean> {
    try {
      return argon2.needsRehash(hash, {
        type: argon2.argon2id,
        memoryCost: ENCRYPTION.ARGON2.MEMORY_COST,
        timeCost: ENCRYPTION.ARGON2.TIME_COST,
        parallelism: ENCRYPTION.ARGON2.PARALLELISM,
      });
    } catch {
      return true;
    }
  }
  
  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < AUTH.PASSWORD.MIN_LENGTH) {
      errors.push(`Password must be at least ${AUTH.PASSWORD.MIN_LENGTH} characters`);
    }
    
    if (password.length > AUTH.PASSWORD.MAX_LENGTH) {
      errors.push(`Password must be at most ${AUTH.PASSWORD.MAX_LENGTH} characters`);
    }
    
    if (AUTH.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (AUTH.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (AUTH.PASSWORD.REQUIRE_NUMBER && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (AUTH.PASSWORD.REQUIRE_SPECIAL) {
      const specialRegex = new RegExp(`[${AUTH.PASSWORD.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
      if (!specialRegex.test(password)) {
        errors.push('Password must contain at least one special character');
      }
    }
    
    // Check for common patterns
    if (this.isCommonPassword(password)) {
      errors.push('Password is too common');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Hash a value using SHA-256 (for non-password data)
   */
  sha256(value: string | Buffer): string {
    return createHash('sha256')
      .update(value)
      .digest('hex');
  }
  
  /**
   * Hash a value using SHA-512
   */
  sha512(value: string | Buffer): string {
    return createHash('sha512')
      .update(value)
      .digest('hex');
  }
  
  /**
   * Generate a secure random salt
   */
  generateSalt(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }
  
  /**
   * HMAC-SHA256 for message authentication
   */
  hmacSha256(value: string, secret: string): string {
    return createHash('sha256')
      .update(`${secret}${value}`)
      .digest('hex');
  }
  
  /**
   * Constant-time string comparison to prevent timing attacks
   */
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    
    return timingSafeEqual(bufA, bufB);
  }
  
  /**
   * Check if password is in common password list
   */
  private isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', 'password123', '123456', '12345678', 'qwerty',
      'letmein', 'welcome', 'admin', 'login', 'passw0rd',
      'abc123', 'iloveyou', 'master', 'monkey', 'dragon',
      'football', 'baseball', 'soccer', 'hockey', 'batman',
      'trustno1', 'sunshine', 'princess', 'starwars', 'shadow',
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }
}
