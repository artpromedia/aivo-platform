import { describe, expect, it } from 'vitest';

import { buildTransition, TransitionError } from '../src/fsm.js';
import type { Consent } from '../src/types.js';

const baseConsent: Consent = {
  id: 'consent-1',
  tenant_id: 'tenant-1',
  learner_id: 'learner-1',
  consent_type: 'AI_TUTOR',
  status: 'PENDING',
  granted_by_parent_id: null,
  granted_at: null,
  revoked_at: null,
  expires_at: null,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
};

describe('consent FSM', () => {
  it('allows valid transitions and sets audit + timestamps', () => {
    const pendingToGranted = buildTransition(baseConsent, 'GRANTED', {
      changedByUserId: 'parent-1',
      grantedByParentId: 'parent-1',
      reason: 'parent approved',
    });
    expect(pendingToGranted.updates.status).toBe('GRANTED');
    expect(pendingToGranted.audit.previous_status).toBe('PENDING');
    expect(pendingToGranted.audit.new_status).toBe('GRANTED');
    expect(pendingToGranted.audit.change_reason).toBe('parent approved');

    const grantedConsent: Consent = { ...baseConsent, status: 'GRANTED' };
    const grantedToRevoked = buildTransition(grantedConsent, 'REVOKED', {
      changedByUserId: 'parent-1',
      reason: 'parent revoked',
    });
    expect(grantedToRevoked.updates.status).toBe('REVOKED');
    expect(grantedToRevoked.audit.previous_status).toBe('GRANTED');
  });

  it('rejects invalid transitions', () => {
    const revokedConsent: Consent = { ...baseConsent, status: 'REVOKED' };
    expect(() =>
      buildTransition(revokedConsent, 'GRANTED', {
        changedByUserId: 'parent-1',
        reason: 'cannot re-grant from revoked',
      })
    ).toThrow(TransitionError);
  });

  it('requires a reason for auditing', () => {
    expect(() =>
      buildTransition(baseConsent, 'GRANTED', { changedByUserId: 'parent-1', reason: '' })
    ).toThrow(TransitionError);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// ADDITIONAL FSM TESTS - COMPREHENSIVE COVERAGE
// ════════════════════════════════════════════════════════════════════════════════

describe('consent FSM - state transitions', () => {
  describe('PENDING state', () => {
    const pendingConsent: Consent = { ...baseConsent, status: 'PENDING' };

    it('can transition to GRANTED', () => {
      const result = buildTransition(pendingConsent, 'GRANTED', {
        changedByUserId: 'parent-1',
        grantedByParentId: 'parent-1',
        reason: 'parent approved consent',
      });
      expect(result.updates.status).toBe('GRANTED');
      expect(result.updates.granted_at).toBeDefined();
    });

    it('can transition to REVOKED (denied)', () => {
      const result = buildTransition(pendingConsent, 'REVOKED', {
        changedByUserId: 'parent-1',
        reason: 'parent denied consent',
      });
      expect(result.updates.status).toBe('REVOKED');
      expect(result.updates.revoked_at).toBeDefined();
    });

    it('cannot transition to EXPIRED', () => {
      expect(() =>
        buildTransition(pendingConsent, 'EXPIRED', {
          changedByUserId: 'system',
          reason: 'invalid transition',
        })
      ).toThrow(TransitionError);
    });

    it('cannot stay PENDING', () => {
      expect(() =>
        buildTransition(pendingConsent, 'PENDING', {
          changedByUserId: 'system',
          reason: 'no-op',
        })
      ).toThrow(TransitionError);
    });
  });

  describe('GRANTED state', () => {
    const grantedConsent: Consent = {
      ...baseConsent,
      status: 'GRANTED',
      granted_at: new Date('2024-01-15T00:00:00Z'),
      granted_by_parent_id: 'parent-1',
    };

    it('can transition to REVOKED', () => {
      const result = buildTransition(grantedConsent, 'REVOKED', {
        changedByUserId: 'parent-1',
        reason: 'parent withdrew consent',
      });
      expect(result.updates.status).toBe('REVOKED');
      expect(result.updates.revoked_at).toBeDefined();
    });

    it('can transition to EXPIRED', () => {
      const result = buildTransition(grantedConsent, 'EXPIRED', {
        changedByUserId: 'system',
        reason: 'consent period expired',
      });
      expect(result.updates.status).toBe('EXPIRED');
    });

    it('cannot transition back to PENDING', () => {
      expect(() =>
        buildTransition(grantedConsent, 'PENDING', {
          changedByUserId: 'system',
          reason: 'invalid transition',
        })
      ).toThrow(TransitionError);
    });
  });

  describe('REVOKED state (terminal)', () => {
    const revokedConsent: Consent = {
      ...baseConsent,
      status: 'REVOKED',
      revoked_at: new Date('2024-02-01T00:00:00Z'),
    };

    it('cannot transition to any other state', () => {
      expect(() =>
        buildTransition(revokedConsent, 'PENDING', {
          changedByUserId: 'system',
          reason: 'invalid',
        })
      ).toThrow(TransitionError);

      expect(() =>
        buildTransition(revokedConsent, 'GRANTED', {
          changedByUserId: 'parent-1',
          reason: 'trying to re-grant',
        })
      ).toThrow(TransitionError);

      expect(() =>
        buildTransition(revokedConsent, 'EXPIRED', {
          changedByUserId: 'system',
          reason: 'invalid',
        })
      ).toThrow(TransitionError);
    });
  });

  describe('EXPIRED state', () => {
    const expiredConsent: Consent = {
      ...baseConsent,
      status: 'EXPIRED',
      expires_at: new Date('2024-01-01T00:00:00Z'),
    };

    it('can transition to GRANTED (re-consent)', () => {
      const result = buildTransition(expiredConsent, 'GRANTED', {
        changedByUserId: 'parent-1',
        grantedByParentId: 'parent-1',
        reason: 'parent renewed consent',
      });
      expect(result.updates.status).toBe('GRANTED');
      expect(result.updates.granted_at).toBeDefined();
    });

    it('cannot transition to PENDING', () => {
      expect(() =>
        buildTransition(expiredConsent, 'PENDING', {
          changedByUserId: 'system',
          reason: 'invalid',
        })
      ).toThrow(TransitionError);
    });
  });
});

describe('consent FSM - audit trail', () => {
  it('captures IP address and user agent when provided', () => {
    const result = buildTransition(baseConsent, 'GRANTED', {
      changedByUserId: 'parent-1',
      grantedByParentId: 'parent-1',
      reason: 'parent approved',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
    });
    expect(result.audit.ip_address).toBe('192.168.1.100');
    expect(result.audit.user_agent).toBe('Mozilla/5.0 (Windows NT 10.0)');
  });

  it('records verification method ID for COPPA compliance', () => {
    const result = buildTransition(baseConsent, 'GRANTED', {
      changedByUserId: 'parent-1',
      grantedByParentId: 'parent-1',
      reason: 'verified via credit card micro-charge',
      verificationMethodId: 'vm-credit-card-123',
    });
    expect(result.audit.verification_method_id).toBe('vm-credit-card-123');
  });
});

describe('TransitionError', () => {
  it('includes from and to status in error', () => {
    try {
      const revokedConsent: Consent = { ...baseConsent, status: 'REVOKED' };
      buildTransition(revokedConsent, 'GRANTED', {
        changedByUserId: 'parent-1',
        reason: 'test',
      });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(TransitionError);
      const transitionError = err as TransitionError;
      expect(transitionError.fromStatus).toBe('REVOKED');
      expect(transitionError.toStatus).toBe('GRANTED');
    }
  });
});
