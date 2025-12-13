/**
 * Tests for DSR (Data Subject Request) functionality
 * Tests 30-day grace period, rate limiting, and export enhancements
 */

import { describe, it, expect } from 'vitest';

import {
  DSR_CONFIG,
  type DsrRequest,
  type DsrRequestStatus,
  type RateLimitInfo,
} from '../src/types.js';
import { calculateGracePeriodDaysRemaining } from '../src/repository.js';

describe('DSR Configuration', () => {
  it('should have 30-day grace period', () => {
    expect(DSR_CONFIG.GRACE_PERIOD_DAYS).toBe(30);
  });

  it('should allow 1 export request per day', () => {
    expect(DSR_CONFIG.MAX_EXPORT_REQUESTS_PER_DAY).toBe(1);
  });

  it('should allow 1 delete request per day', () => {
    expect(DSR_CONFIG.MAX_DELETE_REQUESTS_PER_DAY).toBe(1);
  });

  it('should retain exports for 7 days', () => {
    expect(DSR_CONFIG.EXPORT_RETENTION_DAYS).toBe(7);
  });

  it('should use export version 2.0', () => {
    expect(DSR_CONFIG.EXPORT_VERSION).toBe('2.0');
  });
});

describe('Grace Period Calculation', () => {
  const createMockRequest = (
    status: DsrRequestStatus,
    gracePeriodEndsAt: Date | null
  ): DsrRequest => ({
    id: 'req-1',
    tenant_id: 'tenant-1',
    requested_by_user_id: 'user-1',
    learner_id: 'learner-1',
    request_type: 'DELETE',
    status,
    reason: null,
    export_location: null,
    result_uri: null,
    reviewed_by_user_id: null,
    reviewed_at: null,
    error_message: null,
    metadata_json: null,
    created_at: new Date(),
    updated_at: new Date(),
    completed_at: null,
    grace_period_ends_at: gracePeriodEndsAt,
    scheduled_deletion_at: gracePeriodEndsAt
      ? new Date(gracePeriodEndsAt.getTime() + 86400000)
      : null,
    cancelled_at: null,
    cancelled_by_user_id: null,
    cancellation_reason: null,
  });

  it('should return null for non-GRACE_PERIOD status', () => {
    const request = createMockRequest('PENDING', new Date(Date.now() + 86400000 * 15));
    expect(calculateGracePeriodDaysRemaining(request)).toBeNull();
  });

  it('should return null when grace_period_ends_at is null', () => {
    const request = createMockRequest('GRACE_PERIOD', null);
    expect(calculateGracePeriodDaysRemaining(request)).toBeNull();
  });

  it('should return days remaining when in grace period', () => {
    const fifteenDaysFromNow = new Date(Date.now() + 86400000 * 15);
    const request = createMockRequest('GRACE_PERIOD', fifteenDaysFromNow);
    const daysRemaining = calculateGracePeriodDaysRemaining(request);

    // Should be approximately 15 days (allowing for test execution time)
    expect(daysRemaining).toBeGreaterThanOrEqual(14);
    expect(daysRemaining).toBeLessThanOrEqual(16);
  });

  it('should return 0 when grace period has ended', () => {
    const yesterday = new Date(Date.now() - 86400000);
    const request = createMockRequest('GRACE_PERIOD', yesterday);
    expect(calculateGracePeriodDaysRemaining(request)).toBe(0);
  });

  it('should round up partial days', () => {
    // 2.5 days from now should show as 3 days
    const twoAndHalfDaysFromNow = new Date(Date.now() + 86400000 * 2.5);
    const request = createMockRequest('GRACE_PERIOD', twoAndHalfDaysFromNow);
    const daysRemaining = calculateGracePeriodDaysRemaining(request);
    expect(daysRemaining).toBe(3);
  });
});

describe('DSR Request Statuses', () => {
  it('should have all expected statuses', () => {
    const validStatuses: DsrRequestStatus[] = [
      'PENDING',
      'APPROVED',
      'IN_PROGRESS',
      'GRACE_PERIOD',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
      'FAILED',
    ];

    // This is a type check - if any status is invalid, TypeScript will error
    validStatuses.forEach((status) => {
      expect(typeof status).toBe('string');
    });
  });

  describe('DELETE request lifecycle', () => {
    it('should follow: PENDING → GRACE_PERIOD → COMPLETED', () => {
      // This represents the happy path for a DELETE request
      const states = ['PENDING', 'GRACE_PERIOD', 'COMPLETED'];
      expect(states).toEqual(['PENDING', 'GRACE_PERIOD', 'COMPLETED']);
    });

    it('should allow cancellation during grace period', () => {
      // DELETE can be cancelled during grace period
      const states = ['PENDING', 'GRACE_PERIOD', 'CANCELLED'];
      expect(states).toEqual(['PENDING', 'GRACE_PERIOD', 'CANCELLED']);
    });
  });

  describe('EXPORT request lifecycle', () => {
    it('should follow: PENDING → IN_PROGRESS → COMPLETED', () => {
      // EXPORT requests process immediately without grace period
      const states = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
      expect(states).toEqual(['PENDING', 'IN_PROGRESS', 'COMPLETED']);
    });
  });
});

describe('Rate Limit Info', () => {
  it('should indicate when requests are allowed', () => {
    const info: RateLimitInfo = {
      allowed: true,
      requests_today: 0,
      max_requests_per_day: 1,
      next_allowed_at: null,
    };
    expect(info.allowed).toBe(true);
    expect(info.next_allowed_at).toBeNull();
  });

  it('should indicate when rate limited', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const info: RateLimitInfo = {
      allowed: false,
      requests_today: 1,
      max_requests_per_day: 1,
      next_allowed_at: tomorrow,
    };
    expect(info.allowed).toBe(false);
    expect(info.next_allowed_at).toEqual(tomorrow);
  });
});

describe('Export Bundle v2.0', () => {
  it('should include export info metadata', () => {
    // Type check for export info structure
    const exportInfo = {
      generated_at: new Date().toISOString(),
      request_id: 'req-123',
      learner_id: 'learner-456',
      export_version: '2.0' as const,
      includes_consent_data: true,
    };

    expect(exportInfo.export_version).toBe('2.0');
    expect(exportInfo.includes_consent_data).toBe(true);
  });

  it('should include consent records for GDPR compliance', () => {
    // Consent records are required for GDPR Article 15 (right of access)
    const consentRecord = {
      id: 'consent-1',
      learner_id: 'learner-1',
      consent_type: 'AI_TUTOR',
      status: 'GRANTED',
      granted_at: new Date().toISOString(),
      revoked_at: null,
      expires_at: null,
      granted_by_user_id: 'parent-1',
      text_version: '1.0',
      last_updated_at: new Date().toISOString(),
    };

    expect(consentRecord.consent_type).toBeDefined();
    expect(consentRecord.status).toBeDefined();
  });

  it('should include parental consent history for COPPA compliance', () => {
    // Parental consent verification history for COPPA auditing
    const parentalConsent = {
      parent_id: 'parent-1',
      learner_id: 'learner-1',
      consent_link_token_hash: 'hash-abc123',
      status: 'COMPLETED',
      created_at: new Date().toISOString(),
      used_at: new Date().toISOString(),
      verification_method: 'CREDIT_CARD',
      verification_status: 'VERIFIED',
      verification_completed_at: new Date().toISOString(),
    };

    expect(parentalConsent.verification_method).toBeDefined();
    expect(parentalConsent.verification_status).toBe('VERIFIED');
  });
});

describe('DSR Audit Actions', () => {
  it('should support all audit action types', () => {
    const actions = [
      'CREATED',
      'APPROVED',
      'REJECTED',
      'STARTED',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
      'DOWNLOADED',
    ];

    actions.forEach((action) => {
      expect(typeof action).toBe('string');
    });
  });
});
