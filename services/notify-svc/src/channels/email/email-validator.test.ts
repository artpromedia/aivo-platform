/**
 * Unit Tests for Email Validator
 *
 * Tests for:
 * - RFC 5322 format validation
 * - Disposable email detection
 * - Role-based email detection
 * - MX record validation
 * - Domain blacklist checking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockDns = {
  resolveMx: vi.fn(),
};

vi.mock('dns', () => ({
  promises: mockDns,
}));

// =============================================================================
// EMAIL VALIDATOR (Simplified for testing)
// =============================================================================

class EmailValidator {
  private disposableDomains = new Set([
    'tempmail.com',
    'throwaway.com',
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
  ]);

  private roleBasedPrefixes = new Set([
    'admin',
    'info',
    'support',
    'sales',
    'contact',
    'webmaster',
    'postmaster',
    'noreply',
    'no-reply',
    'abuse',
  ]);

  private blacklistedDomains = new Set(['spam.com', 'fake.com', 'blocked.org']);

  // RFC 5322 compliant regex (simplified)
  private emailRegex =
    /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;

  validateFormat(email: string): ValidationResult {
    if (!email || typeof email !== 'string') {
      return { valid: false, reason: 'Email is required' };
    }

    const trimmed = email.trim().toLowerCase();

    if (trimmed.length > 254) {
      return { valid: false, reason: 'Email exceeds maximum length (254 characters)' };
    }

    if (!this.emailRegex.test(trimmed)) {
      return { valid: false, reason: 'Invalid email format' };
    }

    const [localPart, domain] = trimmed.split('@');

    if (localPart.length > 64) {
      return { valid: false, reason: 'Local part exceeds maximum length (64 characters)' };
    }

    if (domain.length > 253) {
      return { valid: false, reason: 'Domain exceeds maximum length (253 characters)' };
    }

    return { valid: true };
  }

  isDisposable(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return this.disposableDomains.has(domain);
  }

  isRoleBased(email: string): boolean {
    const localPart = email.split('@')[0]?.toLowerCase();
    return this.roleBasedPrefixes.has(localPart);
  }

  isBlacklisted(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return this.blacklistedDomains.has(domain);
  }

  async hasMxRecord(email: string): Promise<boolean> {
    const domain = email.split('@')[1];
    try {
      const records = await mockDns.resolveMx(domain);
      return records && records.length > 0;
    } catch {
      return false;
    }
  }

  async validate(
    email: string,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const {
      checkMx = false,
      allowDisposable = false,
      allowRoleBased = true,
      checkBlacklist = true,
    } = options;

    // Format validation
    const formatResult = this.validateFormat(email);
    if (!formatResult.valid) {
      return formatResult;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Blacklist check
    if (checkBlacklist && this.isBlacklisted(normalizedEmail)) {
      return { valid: false, reason: 'Domain is blacklisted' };
    }

    // Disposable check
    if (!allowDisposable && this.isDisposable(normalizedEmail)) {
      return { valid: false, reason: 'Disposable email addresses not allowed' };
    }

    // Role-based check
    if (!allowRoleBased && this.isRoleBased(normalizedEmail)) {
      return { valid: false, reason: 'Role-based email addresses not allowed' };
    }

    // MX record check
    if (checkMx) {
      const hasMx = await this.hasMxRecord(normalizedEmail);
      if (!hasMx) {
        return { valid: false, reason: 'Domain has no mail server' };
      }
    }

    return { valid: true, normalizedEmail };
  }

  addDisposableDomain(domain: string): void {
    this.disposableDomains.add(domain.toLowerCase());
  }

  addBlacklistedDomain(domain: string): void {
    this.blacklistedDomains.add(domain.toLowerCase());
  }

  removeBlacklistedDomain(domain: string): void {
    this.blacklistedDomains.delete(domain.toLowerCase());
  }

  extractDomain(email: string): string | null {
    const match = email.match(/@([^@]+)$/);
    return match ? match[1].toLowerCase() : null;
  }

  extractLocalPart(email: string): string | null {
    const match = email.match(/^([^@]+)@/);
    return match ? match[1].toLowerCase() : null;
  }

  normalizeEmail(email: string): string {
    const [localPart, domain] = email.trim().toLowerCase().split('@');

    // Remove dots from Gmail addresses (Gmail ignores dots)
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      const normalizedLocal = localPart.replace(/\./g, '').split('+')[0];
      return `${normalizedLocal}@gmail.com`;
    }

    // Remove + aliases
    const baseLocal = localPart.split('+')[0];
    return `${baseLocal}@${domain}`;
  }
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface ValidationResult {
  valid: boolean;
  reason?: string;
  normalizedEmail?: string;
}

interface ValidationOptions {
  checkMx?: boolean;
  allowDisposable?: boolean;
  allowRoleBased?: boolean;
  checkBlacklist?: boolean;
}

// =============================================================================
// TESTS
// =============================================================================

describe('EmailValidator', () => {
  let validator: EmailValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    validator = new EmailValidator();
  });

  // ===========================================================================
  // FORMAT VALIDATION TESTS
  // ===========================================================================

  describe('validateFormat', () => {
    it('should validate correct email format', () => {
      expect(validator.validateFormat('user@example.com')).toEqual({ valid: true });
    });

    it('should validate email with subdomain', () => {
      expect(validator.validateFormat('user@mail.example.com')).toEqual({ valid: true });
    });

    it('should validate email with plus sign', () => {
      expect(validator.validateFormat('user+tag@example.com')).toEqual({ valid: true });
    });

    it('should validate email with dots in local part', () => {
      expect(validator.validateFormat('first.last@example.com')).toEqual({ valid: true });
    });

    it('should reject empty email', () => {
      const result = validator.validateFormat('');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('required');
    });

    it('should reject email without @', () => {
      const result = validator.validateFormat('userexample.com');
      expect(result.valid).toBe(false);
    });

    it('should reject email without domain', () => {
      const result = validator.validateFormat('user@');
      expect(result.valid).toBe(false);
    });

    it('should reject email without local part', () => {
      const result = validator.validateFormat('@example.com');
      expect(result.valid).toBe(false);
    });

    it('should reject email with spaces', () => {
      const result = validator.validateFormat('user @example.com');
      expect(result.valid).toBe(false);
    });

    it('should reject email exceeding 254 characters', () => {
      const longLocal = 'a'.repeat(200);
      const result = validator.validateFormat(`${longLocal}@example.com`);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('254');
    });

    it('should reject local part exceeding 64 characters', () => {
      const longLocal = 'a'.repeat(65);
      const result = validator.validateFormat(`${longLocal}@example.com`);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('64');
    });
  });

  // ===========================================================================
  // DISPOSABLE EMAIL TESTS
  // ===========================================================================

  describe('isDisposable', () => {
    it('should detect tempmail.com as disposable', () => {
      expect(validator.isDisposable('user@tempmail.com')).toBe(true);
    });

    it('should detect mailinator.com as disposable', () => {
      expect(validator.isDisposable('user@mailinator.com')).toBe(true);
    });

    it('should detect guerrillamail.com as disposable', () => {
      expect(validator.isDisposable('user@guerrillamail.com')).toBe(true);
    });

    it('should not flag regular domains as disposable', () => {
      expect(validator.isDisposable('user@gmail.com')).toBe(false);
      expect(validator.isDisposable('user@company.com')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(validator.isDisposable('user@TEMPMAIL.COM')).toBe(true);
    });
  });

  describe('addDisposableDomain', () => {
    it('should add new disposable domain', () => {
      expect(validator.isDisposable('user@newdisposable.com')).toBe(false);
      validator.addDisposableDomain('newdisposable.com');
      expect(validator.isDisposable('user@newdisposable.com')).toBe(true);
    });
  });

  // ===========================================================================
  // ROLE-BASED EMAIL TESTS
  // ===========================================================================

  describe('isRoleBased', () => {
    it('should detect admin@ as role-based', () => {
      expect(validator.isRoleBased('admin@company.com')).toBe(true);
    });

    it('should detect support@ as role-based', () => {
      expect(validator.isRoleBased('support@company.com')).toBe(true);
    });

    it('should detect noreply@ as role-based', () => {
      expect(validator.isRoleBased('noreply@company.com')).toBe(true);
    });

    it('should detect no-reply@ as role-based', () => {
      expect(validator.isRoleBased('no-reply@company.com')).toBe(true);
    });

    it('should not flag personal emails as role-based', () => {
      expect(validator.isRoleBased('john@company.com')).toBe(false);
      expect(validator.isRoleBased('jane.doe@company.com')).toBe(false);
    });
  });

  // ===========================================================================
  // BLACKLIST TESTS
  // ===========================================================================

  describe('isBlacklisted', () => {
    it('should detect blacklisted domain', () => {
      expect(validator.isBlacklisted('user@spam.com')).toBe(true);
    });

    it('should not flag non-blacklisted domains', () => {
      expect(validator.isBlacklisted('user@legitimate.com')).toBe(false);
    });
  });

  describe('addBlacklistedDomain', () => {
    it('should add domain to blacklist', () => {
      expect(validator.isBlacklisted('user@newbad.com')).toBe(false);
      validator.addBlacklistedDomain('newbad.com');
      expect(validator.isBlacklisted('user@newbad.com')).toBe(true);
    });
  });

  describe('removeBlacklistedDomain', () => {
    it('should remove domain from blacklist', () => {
      expect(validator.isBlacklisted('user@spam.com')).toBe(true);
      validator.removeBlacklistedDomain('spam.com');
      expect(validator.isBlacklisted('user@spam.com')).toBe(false);
    });
  });

  // ===========================================================================
  // MX RECORD TESTS
  // ===========================================================================

  describe('hasMxRecord', () => {
    it('should return true when MX records exist', async () => {
      mockDns.resolveMx.mockResolvedValueOnce([
        { exchange: 'mail.example.com', priority: 10 },
      ]);

      const result = await validator.hasMxRecord('user@example.com');
      expect(result).toBe(true);
    });

    it('should return false when no MX records', async () => {
      mockDns.resolveMx.mockResolvedValueOnce([]);

      const result = await validator.hasMxRecord('user@nonexistent.com');
      expect(result).toBe(false);
    });

    it('should return false on DNS error', async () => {
      mockDns.resolveMx.mockRejectedValueOnce(new Error('DNS lookup failed'));

      const result = await validator.hasMxRecord('user@invalid.com');
      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // FULL VALIDATION TESTS
  // ===========================================================================

  describe('validate', () => {
    it('should validate email with default options', async () => {
      const result = await validator.validate('user@example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject blacklisted domain by default', async () => {
      const result = await validator.validate('user@spam.com');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('blacklisted');
    });

    it('should reject disposable email by default', async () => {
      const result = await validator.validate('user@tempmail.com');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Disposable');
    });

    it('should allow disposable when option set', async () => {
      const result = await validator.validate('user@tempmail.com', {
        allowDisposable: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should allow role-based by default', async () => {
      const result = await validator.validate('admin@example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject role-based when option set', async () => {
      const result = await validator.validate('admin@example.com', {
        allowRoleBased: false,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Role-based');
    });

    it('should check MX records when option set', async () => {
      mockDns.resolveMx.mockResolvedValueOnce([]);

      const result = await validator.validate('user@nomx.com', {
        checkMx: true,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('no mail server');
    });

    it('should pass with valid MX record', async () => {
      mockDns.resolveMx.mockResolvedValueOnce([
        { exchange: 'mx.example.com', priority: 10 },
      ]);

      const result = await validator.validate('user@example.com', {
        checkMx: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should return normalized email on success', async () => {
      const result = await validator.validate('  User@EXAMPLE.COM  ');
      expect(result.valid).toBe(true);
      expect(result.normalizedEmail).toBe('user@example.com');
    });
  });

  // ===========================================================================
  // EXTRACTION UTILITY TESTS
  // ===========================================================================

  describe('extractDomain', () => {
    it('should extract domain from email', () => {
      expect(validator.extractDomain('user@example.com')).toBe('example.com');
    });

    it('should return lowercase domain', () => {
      expect(validator.extractDomain('user@EXAMPLE.COM')).toBe('example.com');
    });

    it('should return null for invalid email', () => {
      expect(validator.extractDomain('invalid')).toBeNull();
    });
  });

  describe('extractLocalPart', () => {
    it('should extract local part from email', () => {
      expect(validator.extractLocalPart('user@example.com')).toBe('user');
    });

    it('should return lowercase local part', () => {
      expect(validator.extractLocalPart('USER@example.com')).toBe('user');
    });

    it('should return null for invalid email', () => {
      expect(validator.extractLocalPart('invalid')).toBeNull();
    });
  });

  // ===========================================================================
  // EMAIL NORMALIZATION TESTS
  // ===========================================================================

  describe('normalizeEmail', () => {
    it('should lowercase email', () => {
      expect(validator.normalizeEmail('User@Example.COM')).toBe('user@example.com');
    });

    it('should trim whitespace', () => {
      expect(validator.normalizeEmail('  user@example.com  ')).toBe('user@example.com');
    });

    it('should remove dots from Gmail local part', () => {
      expect(validator.normalizeEmail('john.doe@gmail.com')).toBe('johndoe@gmail.com');
    });

    it('should remove plus alias from Gmail', () => {
      expect(validator.normalizeEmail('john+newsletter@gmail.com')).toBe('john@gmail.com');
    });

    it('should normalize googlemail.com to gmail.com', () => {
      expect(validator.normalizeEmail('user@googlemail.com')).toBe('user@gmail.com');
    });

    it('should remove plus alias from non-Gmail', () => {
      expect(validator.normalizeEmail('user+tag@company.com')).toBe('user@company.com');
    });

    it('should not remove dots from non-Gmail', () => {
      expect(validator.normalizeEmail('first.last@company.com')).toBe('first.last@company.com');
    });
  });
});
