/**
 * Security Utilities
 * Helper functions for security operations
 */

import * as crypto from 'crypto';
import { Request } from 'express';
import { PII_PATTERNS } from '../constants';

// ============================================================================
// TOKEN UTILITIES
// ============================================================================

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random ID (UUID v4 format)
 */
export function generateSecureId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a numeric OTP code
 */
export function generateOtpCode(length: number = 6): string {
  const max = Math.pow(10, length);
  const code = crypto.randomInt(0, max);
  return code.toString().padStart(length, '0');
}

/**
 * Generate backup codes for MFA
 */
export function generateBackupCodes(count: number = 10): string[] {
  return Array.from({ length: count }, () => 
    generateSecureToken(4).toUpperCase()
  );
}

// ============================================================================
// HASHING UTILITIES
// ============================================================================

/**
 * Create SHA-256 hash of data
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create HMAC signature
 */
export function hmacSign(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function hmacVerify(data: string, signature: string, secret: string): boolean {
  const expected = hmacSign(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

// ============================================================================
// REQUEST UTILITIES
// ============================================================================

/**
 * Extract client IP from request (handles proxies)
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) 
      ? forwardedFor[0] 
      : forwardedFor.split(',')[0];
    return ips.trim();
  }
  
  return (
    request.headers['x-real-ip'] as string ||
    request.socket?.remoteAddress ||
    request.ip ||
    'unknown'
  );
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: Request): string {
  return request.headers['user-agent'] || 'unknown';
}

/**
 * Extract origin from request
 */
export function getOrigin(request: Request): string | undefined {
  return request.headers['origin'] as string || undefined;
}

/**
 * Check if request is from a known bot
 */
export function isKnownBot(userAgent: string): boolean {
  const botPatterns = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebot/i,
    /ia_archiver/i,
  ];
  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Check if request is from a malicious scanner
 */
export function isMaliciousScanner(userAgent: string): boolean {
  const scannerPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /masscan/i,
    /nmap/i,
    /dirbuster/i,
    /gobuster/i,
    /burpsuite/i,
  ];
  return scannerPatterns.some(pattern => pattern.test(userAgent));
}

// ============================================================================
// SANITIZATION UTILITIES
// ============================================================================

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  return input.replace(/[&<>"'`=/]/g, char => htmlEntities[char]);
}

/**
 * Remove potential SQL injection patterns
 */
export function sanitizeSql(input: string): string {
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/\bUNION\b/gi, '')
    .replace(/\bSELECT\b/gi, '')
    .replace(/\bDROP\b/gi, '')
    .replace(/\bDELETE\b/gi, '')
    .replace(/\bINSERT\b/gi, '')
    .replace(/\bUPDATE\b/gi, '');
}

/**
 * Sanitize file path to prevent path traversal
 */
export function sanitizePath(input: string): string {
  return input
    .replace(/\.\./g, '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\//, '');
}

/**
 * Check for potential XSS patterns
 */
export function containsXss(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];
  return xssPatterns.some(pattern => pattern.test(input));
}

// ============================================================================
// PII UTILITIES
// ============================================================================

/**
 * Detect PII in text
 */
export function detectPii(text: string): Array<{ type: string; match: string }> {
  const results: Array<{ type: string; match: string }> = [];
  
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags + 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      results.push({ type: type.toLowerCase(), match: match[0] });
    }
  }
  
  return results;
}

/**
 * Mask sensitive data
 */
export function maskSensitiveData(
  value: string, 
  type: string,
  showLast: number = 4
): string {
  if (!value || value.length <= showLast) {
    return '*'.repeat(value?.length || 0);
  }

  switch (type.toLowerCase()) {
    case 'email': {
      const [local, domain] = value.split('@');
      if (local && domain) {
        return local[0] + '*'.repeat(local.length - 1) + '@' + domain;
      }
      break;
    }
    case 'ssn':
      return '***-**-' + value.slice(-4);
    case 'credit_card':
      return '*'.repeat(12) + value.slice(-4);
    case 'phone':
      return '*'.repeat(value.length - 4) + value.slice(-4);
  }

  return '*'.repeat(value.length - showLast) + value.slice(-showLast);
}

/**
 * Redact object fields
 */
export function redactFields<T extends Record<string, any>>(
  obj: T,
  fieldsToRedact: string[]
): T {
  const result = { ...obj };
  
  for (const field of fieldsToRedact) {
    if (field in result) {
      (result as any)[field] = '[REDACTED]';
    }
  }
  
  return result;
}

// ============================================================================
// TIMING UTILITIES
// ============================================================================

/**
 * Constant-time string comparison (prevents timing attacks)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Add random delay to prevent timing attacks
 */
export async function randomDelay(minMs: number = 100, maxMs: number = 500): Promise<void> {
  const delay = crypto.randomInt(minMs, maxMs);
  return new Promise(resolve => setTimeout(resolve, delay));
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  errors: string[];
} {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  } else {
    score += 25;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  } else {
    score += 25;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  } else {
    score += 25;
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  } else {
    score += 15;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain a special character');
  } else {
    score += 10;
  }

  return {
    valid: errors.length === 0,
    score,
    errors,
  };
}

/**
 * Check if email is valid
 */
export function isValidEmail(email: string): boolean {
  return PII_PATTERNS.EMAIL.test(email);
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
