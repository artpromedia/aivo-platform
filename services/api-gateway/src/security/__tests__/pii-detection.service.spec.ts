/**
 * PII Detection Service Unit Tests
 */

import { PIIDetectionService } from '../services/pii-detection.service';

describe('PIIDetectionService', () => {
  let service: PIIDetectionService;

  beforeEach(() => {
    service = new PIIDetectionService();
  });

  describe('detectPII', () => {
    describe('SSN Detection', () => {
      it('should detect standard SSN format', () => {
        const matches = service.detectPII('SSN: 123-45-6789');
        expect(matches).toHaveLength(1);
        expect(matches[0]).toMatchObject({
          type: 'ssn',
          value: '123-45-6789',
        });
      });

      it('should reject invalid SSN with area 000', () => {
        const matches = service.detectPII('SSN: 000-45-6789');
        expect(matches.filter(m => m.type === 'ssn')).toHaveLength(0);
      });

      it('should reject invalid SSN with area 666', () => {
        const matches = service.detectPII('SSN: 666-45-6789');
        expect(matches.filter(m => m.type === 'ssn')).toHaveLength(0);
      });

      it('should reject invalid SSN with group 00', () => {
        const matches = service.detectPII('SSN: 123-00-6789');
        expect(matches.filter(m => m.type === 'ssn')).toHaveLength(0);
      });

      it('should reject invalid SSN with serial 0000', () => {
        const matches = service.detectPII('SSN: 123-45-0000');
        expect(matches.filter(m => m.type === 'ssn')).toHaveLength(0);
      });
    });

    describe('Email Detection', () => {
      it('should detect standard email addresses', () => {
        const matches = service.detectPII('Email: john.doe@example.com');
        expect(matches).toHaveLength(1);
        expect(matches[0]).toMatchObject({
          type: 'email',
          value: 'john.doe@example.com',
        });
      });

      it('should detect educational email addresses', () => {
        const matches = service.detectPII('Contact: student@school.edu');
        expect(matches).toHaveLength(1);
        expect(matches[0].type).toBe('email');
      });

      it('should detect multiple email addresses', () => {
        const text = 'From: a@b.com To: c@d.com CC: e@f.com';
        const matches = service.detectPII(text);
        expect(matches.filter(m => m.type === 'email')).toHaveLength(3);
      });
    });

    describe('Phone Detection', () => {
      it('should detect standard phone format', () => {
        const matches = service.detectPII('Phone: 555-123-4567');
        expect(matches).toHaveLength(1);
        expect(matches[0].type).toBe('phone');
      });

      it('should detect parenthesized area code', () => {
        const matches = service.detectPII('Call: (555) 123-4567');
        expect(matches).toHaveLength(1);
        expect(matches[0].type).toBe('phone');
      });

      it('should detect phone with country code', () => {
        const matches = service.detectPII('Phone: +1-555-123-4567');
        expect(matches).toHaveLength(1);
        expect(matches[0].type).toBe('phone');
      });

      it('should reject invalid phone with area code starting with 0', () => {
        const matches = service.detectPII('Phone: 055-123-4567');
        expect(matches.filter(m => m.type === 'phone')).toHaveLength(0);
      });
    });

    describe('Credit Card Detection', () => {
      it('should detect Visa card numbers', () => {
        const matches = service.detectPII('Card: 4532015112830366');
        expect(matches).toHaveLength(1);
        expect(matches[0].type).toBe('credit_card');
      });

      it('should detect MasterCard numbers', () => {
        const matches = service.detectPII('Card: 5425233430109903');
        expect(matches).toHaveLength(1);
        expect(matches[0].type).toBe('credit_card');
      });

      it('should reject invalid credit card numbers (Luhn check)', () => {
        const matches = service.detectPII('Card: 4532015112830367');
        expect(matches.filter(m => m.type === 'credit_card')).toHaveLength(0);
      });
    });

    describe('IP Address Detection', () => {
      it('should detect valid IPv4 addresses', () => {
        const matches = service.detectPII('IP: 192.168.1.1');
        expect(matches).toHaveLength(1);
        expect(matches[0].type).toBe('ip_address');
      });

      it('should detect edge case IPs', () => {
        const matches = service.detectPII('IP: 255.255.255.255');
        expect(matches).toHaveLength(1);
        expect(matches[0].type).toBe('ip_address');
      });
    });

    describe('Multiple PII Types', () => {
      it('should detect multiple PII types in same text', () => {
        const text = `
          Name: John Doe
          SSN: 123-45-6789
          Email: john@test.com
          Phone: 555-123-4567
          IP: 192.168.1.1
        `;
        
        const matches = service.detectPII(text);
        const types = matches.map(m => m.type);
        
        expect(types).toContain('ssn');
        expect(types).toContain('email');
        expect(types).toContain('phone');
        expect(types).toContain('ip_address');
      });

      it('should correctly identify start and end indices', () => {
        const text = 'Email: test@example.com';
        const matches = service.detectPII(text);
        
        expect(matches[0].startIndex).toBe(7);
        expect(matches[0].endIndex).toBe(23);
        expect(text.substring(matches[0].startIndex, matches[0].endIndex)).toBe('test@example.com');
      });
    });
  });

  describe('containsPII', () => {
    it('should return true when PII is present', () => {
      expect(service.containsPII('SSN: 123-45-6789')).toBe(true);
      expect(service.containsPII('Email: test@test.com')).toBe(true);
    });

    it('should return false when no PII is present', () => {
      expect(service.containsPII('Hello World')).toBe(false);
      expect(service.containsPII('Student scored 95 points')).toBe(false);
    });
  });

  describe('detectPIIInObject', () => {
    it('should detect PII in nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          contact: {
            email: 'john@test.com',
            phone: '555-123-4567',
          },
        },
      };

      const results = service.detectPIIInObject(obj);
      expect(results).toHaveLength(2);
      
      const paths = results.map(r => r.path);
      expect(paths).toContain('user.contact.email');
      expect(paths).toContain('user.contact.phone');
    });

    it('should detect PII in arrays', () => {
      const obj = {
        emails: ['a@b.com', 'c@d.com'],
      };

      const results = service.detectPIIInObject(obj);
      expect(results).toHaveLength(2);
      expect(results[0].path).toBe('emails[0]');
      expect(results[1].path).toBe('emails[1]');
    });
  });

  describe('getPIISummary', () => {
    it('should provide accurate summary', () => {
      const obj = {
        ssn: '123-45-6789',
        email: 'test@test.com',
        name: 'John Doe',
      };

      const summary = service.getPIISummary(obj);
      
      expect(summary.hasPII).toBe(true);
      expect(summary.count).toBe(2);
      expect(summary.types).toContain('ssn');
      expect(summary.types).toContain('email');
    });

    it('should return empty summary for clean data', () => {
      const obj = {
        name: 'John',
        score: 95,
      };

      const summary = service.getPIISummary(obj);
      
      expect(summary.hasPII).toBe(false);
      expect(summary.count).toBe(0);
      expect(summary.types).toHaveLength(0);
    });
  });
});
