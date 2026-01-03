/**
 * Data Masking Service Unit Tests
 */

import { DataMaskingService } from '../services/data-masking.service';
import { PIIDetectionService } from '../services/pii-detection.service';

describe('DataMaskingService', () => {
  let service: DataMaskingService;
  let piiDetection: PIIDetectionService;

  beforeEach(() => {
    piiDetection = new PIIDetectionService();
    service = new DataMaskingService(piiDetection);
  });

  describe('maskValue', () => {
    it('should mask entire value by default', () => {
      const result = service.maskValue('sensitive');
      expect(result).toBe('*********');
      expect(result.length).toBe('sensitive'.length);
    });

    it('should preserve specified first characters', () => {
      const result = service.maskValue('password123', { showFirst: 2 });
      expect(result).toMatch(/^pa\*+$/);
    });

    it('should preserve specified last characters', () => {
      const result = service.maskValue('password123', { showLast: 3 });
      expect(result).toMatch(/^\*+123$/);
    });

    it('should preserve both first and last', () => {
      const result = service.maskValue('password123', { showFirst: 2, showLast: 2 });
      expect(result).toMatch(/^pa\*+23$/);
    });

    it('should use custom mask character', () => {
      const result = service.maskValue('test', { maskChar: 'X' });
      expect(result).toBe('XXXX');
    });
  });

  describe('maskEmail', () => {
    it('should mask local part while showing domain', () => {
      const result = service.maskEmail('john.doe@example.com');
      expect(result).toContain('@example.com');
      expect(result).not.toBe('john.doe@example.com');
      expect(result).toContain('*');
    });

    it('should preserve first and last character of local part', () => {
      const result = service.maskEmail('testing@test.com');
      expect(result).toMatch(/^t\*+g@test\.com$/);
    });

    it('should handle short local parts', () => {
      const result = service.maskEmail('ab@test.com');
      expect(result).toMatch(/^\*+@test\.com$/);
    });

    it('should handle single character local part', () => {
      const result = service.maskEmail('a@test.com');
      expect(result).toContain('@test.com');
    });
  });

  describe('maskPhone', () => {
    it('should show last 4 digits', () => {
      const result = service.maskPhone('555-123-4567');
      expect(result).toContain('4567');
      expect(result).not.toBe('555-123-4567');
    });

    it('should preserve formatting', () => {
      const result = service.maskPhone('(555) 123-4567');
      expect(result).toMatch(/\(\*+\)\s?\*+-4567/);
    });

    it('should handle phone with country code', () => {
      const result = service.maskPhone('+1-555-123-4567');
      expect(result).toContain('4567');
    });
  });

  describe('maskCreditCard', () => {
    it('should show only last 4 digits', () => {
      const result = service.maskCreditCard('4532015112830366');
      expect(result).toBe('****-****-****-0366');
    });

    it('should handle formatted card numbers', () => {
      const result = service.maskCreditCard('4532-0151-1283-0366');
      expect(result).toContain('0366');
    });
  });

  describe('maskSSN', () => {
    it('should fully mask SSN', () => {
      const result = service.maskSSN('123-45-6789');
      expect(result).toBe('***-**-****');
    });
  });

  describe('maskObject', () => {
    it('should mask known sensitive fields', () => {
      const obj = {
        name: 'John Doe',
        password: 'secret123',
        email: 'john@test.com',
        ssn: '123-45-6789',
      };

      const masked = service.maskObject(obj);

      expect(masked.name).toBe('John Doe'); // name is not sensitive
      expect(masked.password).not.toBe('secret123');
      expect(masked.email).not.toBe('john@test.com');
      expect(masked.ssn).not.toBe('123-45-6789');
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          profile: {
            email: 'test@test.com',
            password: 'secret',
          },
        },
      };

      const masked = service.maskObject(obj);

      expect(masked.user.profile.email).not.toBe('test@test.com');
      expect(masked.user.profile.password).not.toBe('secret');
    });

    it('should handle arrays', () => {
      const obj = {
        users: [
          { email: 'a@b.com', password: 'pass1' },
          { email: 'c@d.com', password: 'pass2' },
        ],
      };

      const masked = service.maskObject(obj);

      expect(masked.users[0].email).not.toBe('a@b.com');
      expect(masked.users[0].password).not.toBe('pass1');
      expect(masked.users[1].email).not.toBe('c@d.com');
    });

    it('should not modify non-sensitive fields', () => {
      const obj = {
        id: '123',
        createdAt: new Date('2024-01-01'),
        count: 42,
        active: true,
      };

      const masked = service.maskObject(obj);

      expect(masked.id).toBe('123');
      expect(masked.count).toBe(42);
      expect(masked.active).toBe(true);
    });

    it('should handle null and undefined', () => {
      const obj = {
        nullField: null,
        undefinedField: undefined,
        password: 'secret',
      };

      const masked = service.maskObject(obj);

      expect(masked.nullField).toBeNull();
      expect(masked.undefinedField).toBeUndefined();
      expect(masked.password).not.toBe('secret');
    });

    it('should detect and mask PII in string values', () => {
      const obj = {
        notes: 'SSN is 123-45-6789 and email is test@test.com',
      };

      const masked = service.maskObject(obj);

      expect(masked.notes).not.toContain('123-45-6789');
      expect(masked.notes).not.toContain('test@test.com');
    });
  });

  describe('maskStringWithPII', () => {
    it('should mask PII found in text', () => {
      const text = 'Contact: 555-123-4567, Email: john@test.com';
      const result = service.maskStringWithPII(text);

      expect(result).not.toContain('555-123');
      expect(result).not.toBe(text);
    });

    it('should preserve non-PII text', () => {
      const text = 'Hello World, this is a test';
      const result = service.maskStringWithPII(text);

      expect(result).toBe(text);
    });
  });

  describe('toSafeLog', () => {
    it('should create safe version for logging', () => {
      const obj = {
        request: {
          headers: {
            authorization: 'Bearer token123',
          },
          body: {
            password: 'secret',
            email: 'user@test.com',
          },
        },
      };

      const safe = service.toSafeLog(obj);

      expect(safe.request.body.password).not.toBe('secret');
      expect(safe.request.body.email).not.toBe('user@test.com');
    });
  });
});
