import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createHash, randomInt } from 'node:crypto';

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
};

// Mock fetch for notify-svc
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('ioredis', () => ({
  default: vi.fn(() => mockRedis),
}));

import { SmsMfaService } from '../src/services/sms-mfa.service';

describe('SmsMfaService', () => {
  let service: SmsMfaService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SmsMfaService(mockRedis as any);
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  });

  describe('sendCode', () => {
    it('sends code successfully when not rate limited', async () => {
      mockRedis.get.mockResolvedValueOnce(null); // no rate limit
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.sendCode('user-1', '+14155551234');

      expect(result).toHaveProperty('expiresAt');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/sms/send'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws when rate limited', async () => {
      mockRedis.get.mockResolvedValueOnce('1'); // rate limited

      await expect(service.sendCode('user-1', '+14155551234')).rejects.toThrow();
    });
  });

  describe('verifyCode', () => {
    it('returns true for correct code', async () => {
      const code = '123456';
      const hash = createHash('sha256').update(code).digest('hex');
      mockRedis.get
        .mockResolvedValueOnce('0')   // attempts
        .mockResolvedValueOnce(hash); // stored hash
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.verifyCode('user-1', code);
      expect(result).toBe(true);
    });

    it('returns false for incorrect code', async () => {
      const storedHash = createHash('sha256').update('654321').digest('hex');
      mockRedis.get
        .mockResolvedValueOnce('0')         // attempts
        .mockResolvedValueOnce(storedHash); // stored hash
      mockRedis.incr.mockResolvedValue(1);

      const result = await service.verifyCode('user-1', '000000');
      expect(result).toBe(false);
    });

    it('rejects after max attempts exceeded', async () => {
      mockRedis.get.mockResolvedValueOnce('3'); // max attempts reached

      await expect(service.verifyCode('user-1', '123456')).rejects.toThrow();
    });
  });
});
