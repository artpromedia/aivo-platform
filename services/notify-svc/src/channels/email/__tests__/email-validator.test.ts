/**
 * Email Validator Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  emailValidator,
  validateEmail,
  validateEmailFormat,
  isDisposableEmail,
  isRoleBasedEmail,
  normalizeEmail,
} from '../email-validator.js';

describe('EmailValidator', () => {
  beforeEach(() => {
    emailValidator.clearCache();
  });

  describe('normalizeEmail', () => {
    it('should lowercase email addresses', () => {
      expect(normalizeEmail('Test@Example.COM')).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
    });

    it('should remove control characters', () => {
      expect(normalizeEmail('test\x00@example.com')).toBe('test@example.com');
    });

    it('should return empty string for null/undefined', () => {
      expect(normalizeEmail(null as unknown as string)).toBe('');
      expect(normalizeEmail(undefined as unknown as string)).toBe('');
    });
  });

  describe('validateFormat', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.com',
        'user+tag@domain.com',
        'user123@subdomain.domain.org',
        'a@b.co',
      ];

      for (const email of validEmails) {
        const result = validateEmailFormat(email);
        expect(result.isValid).toBe(true);
      }
    });

    it('should reject empty emails', () => {
      const result = validateEmailFormat('');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('required');
    });

    it('should reject emails without @', () => {
      const result = validateEmailFormat('testexample.com');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('@');
    });

    it('should reject emails without domain', () => {
      const result = validateEmailFormat('test@');
      expect(result.isValid).toBe(false);
    });

    it('should reject emails without local part', () => {
      const result = validateEmailFormat('@example.com');
      expect(result.isValid).toBe(false);
    });

    it('should reject emails with consecutive dots', () => {
      const result = validateEmailFormat('test..user@example.com');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('consecutive dots');
    });

    it('should reject domains without a dot', () => {
      const result = validateEmailFormat('test@localhost');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('dot');
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = validateEmailFormat(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('too long');
    });

    it('should reject local parts starting with dot', () => {
      const result = validateEmailFormat('.test@example.com');
      expect(result.isValid).toBe(false);
    });

    it('should reject local parts ending with dot', () => {
      const result = validateEmailFormat('test.@example.com');
      expect(result.isValid).toBe(false);
    });
  });

  describe('isDisposable', () => {
    it('should detect known disposable domains', () => {
      expect(isDisposableEmail('test@mailinator.com')).toBe(true);
      expect(isDisposableEmail('test@guerrillamail.com')).toBe(true);
      expect(isDisposableEmail('test@10minutemail.com')).toBe(true);
      expect(isDisposableEmail('test@tempmail.com')).toBe(true);
    });

    it('should allow legitimate domains', () => {
      expect(isDisposableEmail('test@gmail.com')).toBe(false);
      expect(isDisposableEmail('test@yahoo.com')).toBe(false);
      expect(isDisposableEmail('test@company.com')).toBe(false);
    });
  });

  describe('isRoleBased', () => {
    it('should detect role-based emails', () => {
      expect(isRoleBasedEmail('admin@example.com')).toBe(true);
      expect(isRoleBasedEmail('support@example.com')).toBe(true);
      expect(isRoleBasedEmail('noreply@example.com')).toBe(true);
      expect(isRoleBasedEmail('info@example.com')).toBe(true);
    });

    it('should allow personal emails', () => {
      expect(isRoleBasedEmail('john@example.com')).toBe(false);
      expect(isRoleBasedEmail('jane.doe@example.com')).toBe(false);
    });
  });

  describe('suggestCorrection', () => {
    it('should suggest corrections for common typos', () => {
      expect(emailValidator.suggestCorrection('gmial.com')).toBe('gmail.com');
      expect(emailValidator.suggestCorrection('gmal.com')).toBe('gmail.com');
      expect(emailValidator.suggestCorrection('yaho.com')).toBe('yahoo.com');
      expect(emailValidator.suggestCorrection('hotmal.com')).toBe('hotmail.com');
    });

    it('should return null for correct domains', () => {
      expect(emailValidator.suggestCorrection('gmail.com')).toBe(null);
      expect(emailValidator.suggestCorrection('yahoo.com')).toBe(null);
    });
  });

  describe('validate (async)', () => {
    it('should validate complete email addresses', async () => {
      const result = await validateEmail('test@gmail.com', {
        checkMx: false, // Skip MX for unit tests
      });
      expect(result.isValid).toBe(true);
      expect(result.email).toBe('test@gmail.com');
      expect(result.domain).toBe('gmail.com');
    });

    it('should reject disposable emails when enabled', async () => {
      const result = await validateEmail('test@mailinator.com', {
        checkMx: false,
        checkDisposable: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Disposable');
      expect(result.isDisposable).toBe(true);
    });

    it('should reject role-based emails when enabled', async () => {
      const result = await validateEmail('admin@example.com', {
        checkMx: false,
        checkRoleBased: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Role-based');
      expect(result.isRoleBased).toBe(true);
    });

    it('should suggest typo corrections', async () => {
      const result = await validateEmail('test@gmial.com', {
        checkMx: false,
        suggestCorrection: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.suggestion).toBe('test@gmail.com');
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple emails efficiently', async () => {
      const emails = [
        'valid@gmail.com',
        'invalid@',
        'test@mailinator.com',
      ];

      const results = await emailValidator.validateBatch(emails, {
        checkMx: false,
        checkDisposable: true,
      });

      expect(results.get('valid@gmail.com')?.isValid).toBe(true);
      expect(results.get('invalid@')?.isValid).toBe(false);
      expect(results.get('test@mailinator.com')?.isValid).toBe(false);
    });
  });
});
