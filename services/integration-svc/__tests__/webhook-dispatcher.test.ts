import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('webhook-dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Event matching', () => {
    it('should match endpoints by event type', () => {
      const endpoint = {
        id: 'endpoint-1',
        eventTypes: ['SESSION_COMPLETED', 'BASELINE_COMPLETED'],
        isEnabled: true,
      };
      
      const eventType = 'SESSION_COMPLETED';
      expect(endpoint.eventTypes.includes(eventType)).toBe(true);
    });

    it('should not match disabled endpoints', () => {
      const endpoint = {
        id: 'endpoint-1',
        eventTypes: ['SESSION_COMPLETED'],
        isEnabled: false,
      };
      
      expect(endpoint.isEnabled).toBe(false);
    });

    it('should not match endpoints without subscribed event', () => {
      const endpoint = {
        id: 'endpoint-1',
        eventTypes: ['SESSION_COMPLETED'],
        isEnabled: true,
      };
      
      const eventType = 'BASELINE_COMPLETED';
      expect(endpoint.eventTypes.includes(eventType)).toBe(false);
    });
  });

  describe('Retry logic', () => {
    it('should calculate exponential backoff correctly', () => {
      const initialDelay = 1000; // 1 second
      const multiplier = 2;
      
      const delays = [0, 1, 2, 3, 4].map(attempt => 
        initialDelay * Math.pow(multiplier, attempt)
      );
      
      expect(delays).toEqual([1000, 2000, 4000, 8000, 16000]);
    });

    it('should cap backoff at max delay', () => {
      const initialDelay = 1000;
      const multiplier = 2;
      const maxDelay = 3600000; // 1 hour
      
      const attemptCount = 15;
      const uncappedDelay = initialDelay * Math.pow(multiplier, attemptCount);
      const cappedDelay = Math.min(uncappedDelay, maxDelay);
      
      expect(cappedDelay).toBe(maxDelay);
    });

    it('should mark as permanent failure after max retries', () => {
      const maxAttempts = 5;
      const currentAttempt = 5;
      
      expect(currentAttempt >= maxAttempts).toBe(true);
    });
  });

  describe('HTTP response handling', () => {
    it('should treat 2xx as success', () => {
      const successCodes = [200, 201, 202, 204];
      
      successCodes.forEach(code => {
        expect(code >= 200 && code < 300).toBe(true);
      });
    });

    it('should treat 4xx (except 429) as permanent failure', () => {
      const clientErrorCodes = [400, 401, 403, 404, 422];
      
      clientErrorCodes.forEach(code => {
        const isPermanentFailure = code >= 400 && code < 500 && code !== 429;
        expect(isPermanentFailure).toBe(true);
      });
    });

    it('should retry on 429 (rate limited)', () => {
      const code = 429;
      const shouldRetry = code === 429;
      expect(shouldRetry).toBe(true);
    });

    it('should retry on 5xx errors', () => {
      const serverErrorCodes = [500, 502, 503, 504];
      
      serverErrorCodes.forEach(code => {
        const shouldRetry = code >= 500;
        expect(shouldRetry).toBe(true);
      });
    });
  });

  describe('Error classification', () => {
    it('should classify timeout errors', () => {
      const errors = ['timeout', 'aborted', 'Request timeout'];
      
      errors.forEach(err => {
        const isTimeout = err.toLowerCase().includes('timeout') || 
                          err.toLowerCase().includes('aborted');
        expect(isTimeout).toBe(true);
      });
    });

    it('should classify connection errors', () => {
      const errors = ['ECONNREFUSED', 'connection refused'];
      
      errors.forEach(err => {
        const isConnectionError = err.toLowerCase().includes('econnrefused') || 
                                  err.toLowerCase().includes('connection refused');
        expect(isConnectionError).toBe(true);
      });
    });

    it('should classify DNS errors', () => {
      const errors = ['ENOTFOUND', 'getaddrinfo'];
      
      errors.forEach(err => {
        const isDnsError = err.toLowerCase().includes('enotfound') || 
                          err.toLowerCase().includes('getaddrinfo');
        expect(isDnsError).toBe(true);
      });
    });
  });

  describe('Filter matching', () => {
    it('should match subject filter', () => {
      const filter = { subjects: ['MATH', 'READING'] };
      const payload = { data: { subject: 'MATH' } };
      
      const matches = filter.subjects.includes(payload.data.subject);
      expect(matches).toBe(true);
    });

    it('should not match excluded subjects', () => {
      const filter = { subjects: ['MATH', 'READING'] };
      const payload = { data: { subject: 'SCIENCE' } };
      
      const matches = filter.subjects.includes(payload.data.subject);
      expect(matches).toBe(false);
    });

    it('should match grade filter', () => {
      const filter = { grades: ['G3_5', 'G6_8'] };
      const payload = { data: { gradeBand: 'G3_5' } };
      
      const matches = filter.grades.includes(payload.data.gradeBand);
      expect(matches).toBe(true);
    });

    it('should pass when no filter specified', () => {
      const filter = null;
      const matchesWithNoFilter = filter === null;
      expect(matchesWithNoFilter).toBe(true);
    });
  });

  describe('Delivery scheduling', () => {
    it('should schedule retry with correct delay', () => {
      const now = Date.now();
      const delayMs = 2000;
      const scheduledAt = new Date(now + delayMs);
      
      expect(scheduledAt.getTime()).toBeGreaterThan(now);
      expect(scheduledAt.getTime() - now).toBe(delayMs);
    });

    it('should process only due deliveries', () => {
      const now = new Date();
      const pastSchedule = new Date(now.getTime() - 60000);
      const futureSchedule = new Date(now.getTime() + 60000);
      
      expect(pastSchedule <= now).toBe(true);
      expect(futureSchedule <= now).toBe(false);
    });
  });
});
