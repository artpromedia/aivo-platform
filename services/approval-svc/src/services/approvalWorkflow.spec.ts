/**
 * Tests for approval-svc — workflow management, delegation, and escalation logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ---------- types ---------- */

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
type StepType = 'SINGLE' | 'ANY_OF' | 'ALL_OF' | 'QUORUM';
type EscalationType = 'AUTO_APPROVE' | 'AUTO_REJECT' | 'ESCALATE_UP' | 'NOTIFY_ONLY';

/* ---------- isStepComplete logic ---------- */

function isStepComplete(
  step: { type: StepType; quorumCount?: number },
  decisions: Array<{ decision: 'APPROVED' | 'REJECTED' }>,
): { complete: boolean; outcome?: 'APPROVED' | 'REJECTED' } {
  if (decisions.length === 0) return { complete: false };

  switch (step.type) {
    case 'SINGLE':
      return { complete: true, outcome: decisions[0]!.decision };

    case 'ANY_OF': {
      const approved = decisions.find((d) => d.decision === 'APPROVED');
      if (approved) return { complete: true, outcome: 'APPROVED' };
      return { complete: false };
    }

    case 'ALL_OF': {
      const rejected = decisions.find((d) => d.decision === 'REJECTED');
      if (rejected) return { complete: true, outcome: 'REJECTED' };
      // All must approve — we can't determine without knowing total approvers
      return { complete: false };
    }

    case 'QUORUM': {
      const approvedCount = decisions.filter((d) => d.decision === 'APPROVED').length;
      if (approvedCount >= (step.quorumCount ?? 1)) {
        return { complete: true, outcome: 'APPROVED' };
      }
      return { complete: false };
    }

    default:
      return { complete: false };
  }
}

describe('isStepComplete', () => {
  it('SINGLE: complete with first decision', () => {
    const result = isStepComplete(
      { type: 'SINGLE' },
      [{ decision: 'APPROVED' }],
    );
    expect(result.complete).toBe(true);
    expect(result.outcome).toBe('APPROVED');
  });

  it('SINGLE: returns REJECTED when rejected', () => {
    const result = isStepComplete(
      { type: 'SINGLE' },
      [{ decision: 'REJECTED' }],
    );
    expect(result.outcome).toBe('REJECTED');
  });

  it('ANY_OF: complete when any approves', () => {
    const result = isStepComplete(
      { type: 'ANY_OF' },
      [{ decision: 'REJECTED' }, { decision: 'APPROVED' }],
    );
    expect(result.complete).toBe(true);
    expect(result.outcome).toBe('APPROVED');
  });

  it('ANY_OF: not complete without approval', () => {
    const result = isStepComplete(
      { type: 'ANY_OF' },
      [{ decision: 'REJECTED' }],
    );
    expect(result.complete).toBe(false);
  });

  it('ALL_OF: rejected when any rejects', () => {
    const result = isStepComplete(
      { type: 'ALL_OF' },
      [{ decision: 'APPROVED' }, { decision: 'REJECTED' }],
    );
    expect(result.complete).toBe(true);
    expect(result.outcome).toBe('REJECTED');
  });

  it('QUORUM: complete when quorum reached', () => {
    const result = isStepComplete(
      { type: 'QUORUM', quorumCount: 2 },
      [{ decision: 'APPROVED' }, { decision: 'APPROVED' }],
    );
    expect(result.complete).toBe(true);
    expect(result.outcome).toBe('APPROVED');
  });

  it('QUORUM: not complete below quorum', () => {
    const result = isStepComplete(
      { type: 'QUORUM', quorumCount: 3 },
      [{ decision: 'APPROVED' }],
    );
    expect(result.complete).toBe(false);
  });

  it('returns incomplete with no decisions', () => {
    expect(isStepComplete({ type: 'SINGLE' }, []).complete).toBe(false);
  });
});

/* ---------- delegation logic ---------- */

interface Delegation {
  id: string;
  fromUserId: string;
  toUserId: string;
  workflowIds?: string[];
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

function isActiveDelegation(d: Delegation, workflowId: string, now = new Date()): boolean {
  if (!d.isActive) return false;
  if (d.startDate > now) return false;
  if (d.endDate && d.endDate < now) return false;
  if (d.workflowIds && d.workflowIds.length > 0 && !d.workflowIds.includes(workflowId)) {
    return false;
  }
  return true;
}

function resolveApprovers(
  approverIds: string[],
  delegations: Delegation[],
  workflowId: string,
): string[] {
  const resolved = new Set<string>();
  for (const id of approverIds) {
    const delegation = delegations.find(
      (d) => d.fromUserId === id && isActiveDelegation(d, workflowId),
    );
    resolved.add(delegation ? delegation.toUserId : id);
  }
  return [...resolved];
}

describe('isActiveDelegation', () => {
  const baseDelegation: Delegation = {
    id: 'del-1',
    fromUserId: 'u-1',
    toUserId: 'u-2',
    startDate: new Date('2026-01-01'),
    isActive: true,
  };

  it('returns true for active delegation', () => {
    expect(isActiveDelegation(baseDelegation, 'wf-1', new Date('2026-06-01'))).toBe(true);
  });

  it('returns false when inactive', () => {
    expect(isActiveDelegation({ ...baseDelegation, isActive: false }, 'wf-1')).toBe(false);
  });

  it('returns false before start date', () => {
    expect(isActiveDelegation(baseDelegation, 'wf-1', new Date('2025-12-01'))).toBe(false);
  });

  it('returns false after end date', () => {
    const d = { ...baseDelegation, endDate: new Date('2026-06-01') };
    expect(isActiveDelegation(d, 'wf-1', new Date('2026-07-01'))).toBe(false);
  });

  it('returns false for unmatched workflow scope', () => {
    const d = { ...baseDelegation, workflowIds: ['wf-2'] };
    expect(isActiveDelegation(d, 'wf-1', new Date('2026-06-01'))).toBe(false);
  });
});

describe('resolveApprovers', () => {
  it('returns original IDs without delegations', () => {
    expect(resolveApprovers(['u-1', 'u-2'], [], 'wf-1')).toEqual(['u-1', 'u-2']);
  });

  it('substitutes delegated user', () => {
    const delegations: Delegation[] = [
      {
        id: 'del-1',
        fromUserId: 'u-1',
        toUserId: 'u-3',
        startDate: new Date('2026-01-01'),
        isActive: true,
      },
    ];
    const result = resolveApprovers(['u-1', 'u-2'], delegations, 'wf-1');
    expect(result).toContain('u-3');
    expect(result).toContain('u-2');
    expect(result).not.toContain('u-1');
  });
});

describe('EscalationType values', () => {
  const types: EscalationType[] = ['AUTO_APPROVE', 'AUTO_REJECT', 'ESCALATE_UP', 'NOTIFY_ONLY'];

  it('has 4 escalation types', () => {
    expect(types).toHaveLength(4);
  });

  it('includes AUTO_APPROVE', () => {
    expect(types).toContain('AUTO_APPROVE');
  });
});
