import { describe, expect, it } from 'vitest';
import { Role } from '@aivo/ts-rbac';
import { canViewLearnerField, filterLearnerPayloadForCaller } from '../src/index.js';
import type { AuthContext } from '../src/types.js';

const baseCtx = (roles: Role[], relatedLearnerIds?: string[]): AuthContext => ({
  userId: 'user-1',
  tenantId: 'tenant-1',
  roles,
  relatedLearnerIds,
});

describe('canViewLearnerField', () => {
  const learnerId = 'learner-1';

  it('allows parent to see CONFIDENTIAL for their learner', () => {
    const ctx = baseCtx([Role.PARENT], [learnerId]);
    expect(canViewLearnerField(ctx, learnerId, 'CONFIDENTIAL', 'grade')).toBe(true);
  });

  it('denies parent for other learner', () => {
    const ctx = baseCtx([Role.PARENT], ['other']);
    expect(canViewLearnerField(ctx, learnerId, 'CONFIDENTIAL', 'grade')).toBe(false);
  });

  it('allows teacher on SENSITIVE subset for assigned learner', () => {
    const ctx = baseCtx([Role.TEACHER], [learnerId]);
    expect(canViewLearnerField(ctx, learnerId, 'SENSITIVE', 'diagnosisFlagsJson')).toBe(true);
    expect(canViewLearnerField(ctx, learnerId, 'SENSITIVE', 'notes')).toBe(false);
  });

  it('denies teacher on non-assigned learner', () => {
    const ctx = baseCtx([Role.TEACHER], ['other']);
    expect(canViewLearnerField(ctx, learnerId, 'SENSITIVE', 'diagnosisFlagsJson')).toBe(false);
  });

  it('denies district admin on SENSITIVE', () => {
    const ctx = baseCtx([Role.DISTRICT_ADMIN]);
    expect(canViewLearnerField(ctx, learnerId, 'SENSITIVE', 'diagnosisFlagsJson')).toBe(false);
  });

  it('allows platform admin on SENSITIVE', () => {
    const ctx = baseCtx([Role.PLATFORM_ADMIN]);
    expect(canViewLearnerField(ctx, learnerId, 'SENSITIVE', 'notes')).toBe(true);
  });
});

describe('filterLearnerPayloadForCaller', () => {
  const learner = {
    id: 'learner-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    dateOfBirth: '2000-01-01',
    grade: '3',
    diagnosisFlagsJson: { dyslexia: true },
    sensoryProfileJson: { auditory: 'low' },
    preferencesJson: { theme: 'dark' },
    notes: 'Free text about learner',
    createdAt: 'ts',
  } as const;

  it('filters for parent of learner', () => {
    const ctx = baseCtx([Role.PARENT], ['learner-1']);
    const filtered = filterLearnerPayloadForCaller(ctx, 'learner-1', learner);
    expect(filtered.firstName).toBe('Ada');
    expect(filtered.notes).toBeUndefined();
    expect(filtered.diagnosisFlagsJson).toEqual({ dyslexia: true });
  });

  it('filters out learner data for unrelated parent', () => {
    const ctx = baseCtx([Role.PARENT], ['other']);
    const filtered = filterLearnerPayloadForCaller(ctx, 'learner-1', learner);
    expect(filtered.firstName).toBeUndefined();
    expect(filtered.grade).toBeUndefined();
  });

  it('allows platform admin to see all', () => {
    const ctx = baseCtx([Role.PLATFORM_ADMIN]);
    const filtered = filterLearnerPayloadForCaller(ctx, 'learner-1', learner);
    expect(filtered.notes).toBe('Free text about learner');
    expect(filtered.diagnosisFlagsJson).toBeDefined();
  });
});
