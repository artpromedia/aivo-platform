import { describe, it, expect, vi, beforeEach } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// Mocks  –  @aivo/rate-limiter
// ══════════════════════════════════════════════════════════════════════════════

const mockGetStats = vi.fn();
const mockGetState = vi.fn();
const mockExecute = vi.fn();

vi.mock('@aivo/rate-limiter', () => {
  class MockCircuitBreaker {
    opts: any;
    constructor(opts: any) { this.opts = opts; }
    getStats = mockGetStats;
    getState = mockGetState;
    execute = mockExecute;
  }
  return {
    CircuitBreaker: MockCircuitBreaker,
    CircuitBreakerOpenError: class extends Error { constructor(m?: string) { super(m ?? 'Circuit open'); } },
    MemoryStore: class {},
  };
});

import {
  sendgridCircuitBreaker,
  sesCircuitBreaker,
  twilioCircuitBreaker,
  fcmCircuitBreaker,
  apnsCircuitBreaker,
  getCircuitBreakerHealth,
  isEmailAvailable,
  isSmsAvailable,
} from '../src/lib/circuit-breaker.js';

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('notify-svc circuit-breaker', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Instances ─────────────────────────────────────────────────────────

  describe('instances', () => {
    it('should have 5 named circuit-breaker instances', () => {
      expect(sendgridCircuitBreaker.opts.name).toBe('sendgrid-api');
      expect(sesCircuitBreaker.opts.name).toBe('ses-api');
      expect(twilioCircuitBreaker.opts.name).toBe('twilio-api');
      expect(fcmCircuitBreaker.opts.name).toBe('fcm-api');
      expect(apnsCircuitBreaker.opts.name).toBe('apns-api');
    });

    it('all use failureThreshold=5, successThreshold=2, resetTimeout=30s', () => {
      for (const cb of [sendgridCircuitBreaker, sesCircuitBreaker, twilioCircuitBreaker]) {
        expect(cb.opts.failureThreshold).toBe(5);
        expect(cb.opts.successThreshold).toBe(2);
        expect(cb.opts.resetTimeout).toBe(30000);
      }
    });
  });

  // ── isFailure predicates ──────────────────────────────────────────────

  describe('isFailure predicates', () => {
    it('sendgrid: counts 500+ as failure', () => {
      const isF = sendgridCircuitBreaker.opts.isFailure;
      expect(isF(Object.assign(new Error(), { statusCode: 500 }))).toBe(true);
      expect(isF(Object.assign(new Error(), { statusCode: 429 }))).toBe(false);
      expect(isF(Object.assign(new Error('timeout'), {}))).toBe(true);
      expect(isF(Object.assign(new Error(), { code: 'ECONNREFUSED' }))).toBe(true);
    });

    it('ses: counts AWS errors as failures', () => {
      const isF = sesCircuitBreaker.opts.isFailure;
      const awsErr = new Error('service unavailable');
      awsErr.name = 'ServiceUnavailable';
      expect(isF(awsErr)).toBe(true);

      const throttle = new Error();
      throttle.name = 'ThrottlingException';
      expect(isF(throttle)).toBe(true);

      expect(isF(new Error('timeout'))).toBe(true);
    });

    it('twilio: counts status >= 500 as failure', () => {
      const isF = twilioCircuitBreaker.opts.isFailure;
      expect(isF(Object.assign(new Error(), { status: 503 }))).toBe(true);
      expect(isF(Object.assign(new Error(), { status: 400 }))).toBe(false);
    });
  });

  // ── getCircuitBreakerHealth ───────────────────────────────────────────

  describe('getCircuitBreakerHealth', () => {
    it('should aggregate health from all 5 breakers', async () => {
      const closedStats = { state: 'closed', failures: 0 };
      const openStats = { state: 'open', failures: 5 };

      mockGetStats
        .mockResolvedValueOnce(closedStats)   // sendgrid
        .mockResolvedValueOnce(closedStats)   // ses
        .mockResolvedValueOnce(openStats)     // twilio
        .mockResolvedValueOnce(closedStats)   // fcm
        .mockResolvedValueOnce(closedStats);  // apns

      const health = await getCircuitBreakerHealth();

      expect(health.email.sendgrid.available).toBe(true);
      expect(health.email.ses.available).toBe(true);
      expect(health.sms.twilio.available).toBe(false);
      expect(health.push.fcm.available).toBe(true);
      expect(health.push.apns.available).toBe(true);
    });
  });

  // ── isEmailAvailable ─────────────────────────────────────────────────

  describe('isEmailAvailable', () => {
    it('should return true when at least one email provider is available', async () => {
      mockGetState
        .mockResolvedValueOnce('open')   // sendgrid down
        .mockResolvedValueOnce('closed'); // ses up

      expect(await isEmailAvailable()).toBe(true);
    });

    it('should return false when both providers are open (down)', async () => {
      mockGetState
        .mockResolvedValueOnce('open')
        .mockResolvedValueOnce('open');

      expect(await isEmailAvailable()).toBe(false);
    });
  });

  // ── isSmsAvailable ───────────────────────────────────────────────────

  describe('isSmsAvailable', () => {
    it('should return true when twilio is closed', async () => {
      mockGetState.mockResolvedValue('closed');
      expect(await isSmsAvailable()).toBe(true);
    });

    it('should return false when twilio is open', async () => {
      mockGetState.mockResolvedValue('open');
      expect(await isSmsAvailable()).toBe(false);
    });
  });
});
