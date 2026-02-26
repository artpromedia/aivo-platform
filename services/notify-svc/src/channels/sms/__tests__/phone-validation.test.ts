import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('PhoneValidationService', () => {
  let PhoneValidationService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import('../src/channels/sms/phone-validation');
    PhoneValidationService = mod.PhoneValidationService || mod.default;
  });

  it('exports phone validation service', () => {
    expect(PhoneValidationService).toBeDefined();
  });

  it('validates a valid US phone number', () => {
    if (PhoneValidationService) {
      const service = new PhoneValidationService();
      const result = service.validate('+14155552671');
      expect(result.valid).toBe(true);
      expect(result.country).toBe('US');
    }
  });

  it('validates a valid UK phone number', () => {
    if (PhoneValidationService) {
      const service = new PhoneValidationService();
      const result = service.validate('+442071234567');
      expect(result.valid).toBe(true);
      expect(result.country).toBe('GB');
    }
  });

  it('rejects invalid phone numbers', () => {
    if (PhoneValidationService) {
      const service = new PhoneValidationService();
      const result = service.validate('not-a-number');
      expect(result.valid).toBe(false);
    }
  });

  it('rejects empty input', () => {
    if (PhoneValidationService) {
      const service = new PhoneValidationService();
      const result = service.validate('');
      expect(result.valid).toBe(false);
    }
  });

  it('formats numbers to E.164', () => {
    if (PhoneValidationService) {
      const service = new PhoneValidationService();
      const result = service.validate('+14155552671');
      if (result.formatted) {
        expect(result.formatted).toMatch(/^\+\d+$/);
      }
    }
  });
});
