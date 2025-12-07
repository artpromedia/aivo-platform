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
