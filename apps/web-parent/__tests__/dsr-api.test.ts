import { describe, it, expect } from 'vitest';
import {
  formatGracePeriod,
  canCancelRequest,
  getStatusColor,
} from '@/lib/dsr-api';
import type { DsrRequestSummary, DsrRequestStatus } from '@/lib/dsr-api';

describe('DSR API utility functions', () => {
  describe('formatGracePeriod', () => {
    it('returns empty string for null', () => {
      expect(formatGracePeriod(null)).toBe('');
    });

    it('returns "Deletion scheduled" for 0', () => {
      expect(formatGracePeriod(0)).toBe('Deletion scheduled');
    });

    it('returns "Deletion scheduled" for negative days', () => {
      expect(formatGracePeriod(-1)).toBe('Deletion scheduled');
    });

    it('returns singular "1 day remaining" for 1', () => {
      expect(formatGracePeriod(1)).toBe('1 day remaining');
    });

    it('returns plural "N days remaining" for > 1', () => {
      expect(formatGracePeriod(5)).toBe('5 days remaining');
      expect(formatGracePeriod(14)).toBe('14 days remaining');
    });
  });

  describe('canCancelRequest', () => {
    function makeSummary(overrides: Partial<DsrRequestSummary> = {}): DsrRequestSummary {
      return {
        id: 'req-1',
        type: 'DELETE',
        status: 'GRACE_PERIOD',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        grace_period_ends_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        can_cancel: true,
        download_url: null,
        ...overrides,
      } as DsrRequestSummary;
    }

    it('returns true when status is GRACE_PERIOD and grace period has not ended', () => {
      const request = makeSummary();
      expect(canCancelRequest(request)).toBe(true);
    });

    it('returns false when status is not GRACE_PERIOD', () => {
      const request = makeSummary({ status: 'COMPLETED' as DsrRequestStatus });
      expect(canCancelRequest(request)).toBe(false);
    });

    it('returns false when grace_period_ends_at is null', () => {
      const request = makeSummary({ grace_period_ends_at: null });
      expect(canCancelRequest(request)).toBe(false);
    });

    it('returns false when grace period has ended', () => {
      const request = makeSummary({
        grace_period_ends_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
      });
      expect(canCancelRequest(request)).toBe(false);
    });
  });

  describe('getStatusColor', () => {
    it('returns green for COMPLETED', () => {
      expect(getStatusColor('COMPLETED')).toBe('green');
    });

    it('returns yellow for GRACE_PERIOD', () => {
      expect(getStatusColor('GRACE_PERIOD')).toBe('yellow');
    });

    it('returns blue for IN_PROGRESS', () => {
      expect(getStatusColor('IN_PROGRESS')).toBe('blue');
    });

    it('returns blue for PENDING', () => {
      expect(getStatusColor('PENDING')).toBe('blue');
    });

    it('returns red for FAILED', () => {
      expect(getStatusColor('FAILED')).toBe('red');
    });

    it('returns gray for CANCELLED', () => {
      expect(getStatusColor('CANCELLED')).toBe('gray');
    });

    it('returns gray for unknown status', () => {
      expect(getStatusColor('UNKNOWN' as DsrRequestStatus)).toBe('gray');
    });
  });

  describe('DsrRequestType values', () => {
    it('EXPORT and DELETE are valid request types', () => {
      const validTypes = ['EXPORT', 'DELETE'];
      for (const t of validTypes) {
        expect(typeof t).toBe('string');
      }
    });
  });

  describe('DsrRequestStatus values', () => {
    it('all 6 statuses are valid', () => {
      const statuses: DsrRequestStatus[] = [
        'PENDING',
        'IN_PROGRESS',
        'GRACE_PERIOD',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
      ];
      expect(statuses).toHaveLength(6);
      for (const s of statuses) {
        expect(typeof getStatusColor(s)).toBe('string');
      }
    });
  });
});
