import { describe, it, expect, vi } from 'vitest';

import {
  SOFT_DELETE_MODELS,
  supportsSoftDelete,
  INCLUDE_DELETED_KEY,
  createSoftDeleteMiddleware,
  softDelete,
  restoreSoftDelete,
  purgeSoftDeleted,
  countPendingPurge,
} from '../src/soft-delete.js';

// ── supportsSoftDelete ─────────────────────────────────────────

describe('SOFT_DELETE_MODELS', () => {
  it('includes known models', () => {
    expect(SOFT_DELETE_MODELS.has('Session')).toBe(true);
    expect(SOFT_DELETE_MODELS.has('Assessment')).toBe(true);
    expect(SOFT_DELETE_MODELS.has('Goal')).toBe(true);
    expect(SOFT_DELETE_MODELS.has('PlayerProfile')).toBe(true);
  });

  it('does not include unknown models', () => {
    expect(SOFT_DELETE_MODELS.has('FakeModel')).toBe(false);
  });
});

describe('supportsSoftDelete', () => {
  it('returns true for supported models', () => {
    expect(supportsSoftDelete('Session')).toBe(true);
    expect(supportsSoftDelete('VirtualBrain')).toBe(true);
  });

  it('returns false for unsupported models', () => {
    expect(supportsSoftDelete('UnknownModel')).toBe(false);
  });
});

// ── createSoftDeleteMiddleware ──────────────────────────────────

describe('createSoftDeleteMiddleware', () => {
  const middleware = createSoftDeleteMiddleware();

  it('passes through non-soft-delete models', async () => {
    const next = vi.fn().mockResolvedValue([]);
    const params = {
      model: 'UnknownModel',
      action: 'findMany',
      args: { where: {} },
      dataPath: [],
      runInTransaction: false,
    };

    await middleware(params, next);
    expect(next).toHaveBeenCalledWith(params);
    // Should NOT add deletedAt filter
    expect(params.args.where).toEqual({});
  });

  it('adds deletedAt filter for read operations on soft-delete models', async () => {
    const next = vi.fn().mockResolvedValue([]);
    const params = {
      model: 'Session',
      action: 'findMany',
      args: { where: { status: 'active' } },
      dataPath: [],
      runInTransaction: false,
    };

    await middleware(params, next);
    expect(next).toHaveBeenCalled();
    expect(params.args.where).toHaveProperty('deletedAt', null);
  });

  it('adds where clause if missing', async () => {
    const next = vi.fn().mockResolvedValue([]);
    const params = {
      model: 'Session',
      action: 'findMany',
      args: {} as Record<string, unknown>,
      dataPath: [],
      runInTransaction: false,
    };

    await middleware(params, next);
    expect(params.args.where).toEqual({ deletedAt: null });
  });

  it('skips filter when includeDeleted is set', async () => {
    const next = vi.fn().mockResolvedValue([]);
    const params = {
      model: 'Session',
      action: 'findMany',
      args: { where: { [INCLUDE_DELETED_KEY]: true, status: 'any' } },
      dataPath: [],
      runInTransaction: false,
    };

    await middleware(params, next);
    // includeDeleted should be removed and no deletedAt filter added
    expect(params.args.where).not.toHaveProperty(INCLUDE_DELETED_KEY);
    expect(params.args.where).not.toHaveProperty('deletedAt');
  });

  it('converts delete to soft delete (update with deletedAt)', async () => {
    const next = vi.fn().mockResolvedValue({ id: '1' });
    const params = {
      model: 'Session',
      action: 'delete',
      args: { where: { id: '1' } } as Record<string, unknown>,
      dataPath: [],
      runInTransaction: false,
    };

    await middleware(params, next);
    expect(params.action).toBe('update');
    expect(params.args.data).toHaveProperty('deletedAt');
    expect((params.args.data as any).deletedAt).toBeInstanceOf(Date);
  });

  it('converts deleteMany to updateMany with deletedAt', async () => {
    const next = vi.fn().mockResolvedValue({ count: 3 });
    const params = {
      model: 'Assessment',
      action: 'deleteMany',
      args: { where: { status: 'archived' } } as Record<string, unknown>,
      dataPath: [],
      runInTransaction: false,
    };

    await middleware(params, next);
    expect(params.action).toBe('updateMany');
    expect(params.args.data).toHaveProperty('deletedAt');
  });

  it('adds deletedAt filter for update operations', async () => {
    const next = vi.fn().mockResolvedValue({ id: '1' });
    const params = {
      model: 'Goal',
      action: 'update',
      args: { where: { id: '1' }, data: { title: 'updated' } },
      dataPath: [],
      runInTransaction: false,
    };

    await middleware(params, next);
    expect(params.args.where).toHaveProperty('deletedAt', null);
  });

  it('does not add deletedAt if already specified', async () => {
    const next = vi.fn().mockResolvedValue([]);
    const params = {
      model: 'Session',
      action: 'findMany',
      args: { where: { deletedAt: { not: null } } },
      dataPath: [],
      runInTransaction: false,
    };

    await middleware(params, next);
    // Should keep the explicit deletedAt filter
    expect(params.args.where.deletedAt).toEqual({ not: null });
  });

  it('handles findUnique and other read actions', async () => {
    const readActions = ['findUnique', 'findFirst', 'count', 'aggregate', 'groupBy'];

    for (const action of readActions) {
      const next = vi.fn().mockResolvedValue(null);
      const params = {
        model: 'Session',
        action,
        args: { where: {} } as Record<string, unknown>,
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, next);
      expect(params.args.where).toHaveProperty('deletedAt', null);
    }
  });
});

// ── softDelete helper ──────────────────────────────────────────

describe('softDelete', () => {
  it('calls update with deletedAt on the correct model', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ id: '1', deletedAt: new Date() });
    const prisma = { session: { update: mockUpdate } };

    await softDelete(prisma, 'Session', { id: '1' });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('throws for unknown model', async () => {
    await expect(
      softDelete({}, 'Unknown', { id: '1' }),
    ).rejects.toThrow('Model Unknown not found');
  });
});

// ── restoreSoftDelete ──────────────────────────────────────────

describe('restoreSoftDelete', () => {
  it('sets deletedAt to null', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ id: '1', deletedAt: null });
    const prisma = { session: { update: mockUpdate } };

    await restoreSoftDelete(prisma, 'Session', { id: '1' });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: '1', [INCLUDE_DELETED_KEY]: true },
      data: { deletedAt: null },
    });
  });

  it('throws for unknown model', async () => {
    await expect(
      restoreSoftDelete({}, 'Unknown', { id: '1' }),
    ).rejects.toThrow('Model Unknown not found');
  });
});

// ── purgeSoftDeleted ───────────────────────────────────────────

describe('purgeSoftDeleted', () => {
  it('permanently deletes records older than retention period', async () => {
    const mockDeleteMany = vi.fn().mockResolvedValue({ count: 5 });
    const prisma = { session: { deleteMany: mockDeleteMany } };

    const count = await purgeSoftDeleted(prisma, 'Session', 30);

    expect(count).toBe(5);
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: {
        deletedAt: {
          not: null,
          lt: expect.any(Date),
        },
      },
    });
  });

  it('uses default 90-day retention', async () => {
    const mockDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const prisma = { session: { deleteMany: mockDeleteMany } };

    await purgeSoftDeleted(prisma, 'Session');

    const cutoffDate = mockDeleteMany.mock.calls[0][0].where.deletedAt.lt as Date;
    const daysDiff = (Date.now() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(90, 0);
  });

  it('throws for unknown model', async () => {
    await expect(
      purgeSoftDeleted({}, 'Unknown'),
    ).rejects.toThrow('Model Unknown not found');
  });
});

// ── countPendingPurge ──────────────────────────────────────────

describe('countPendingPurge', () => {
  it('counts records pending purge', async () => {
    const mockCount = vi.fn().mockResolvedValue(10);
    const prisma = { session: { count: mockCount } };

    const count = await countPendingPurge(prisma, 'Session', 30);

    expect(count).toBe(10);
    expect(mockCount).toHaveBeenCalledWith({
      where: {
        deletedAt: {
          not: null,
          lt: expect.any(Date),
        },
        [INCLUDE_DELETED_KEY]: true,
      },
    });
  });

  it('throws for unknown model', async () => {
    await expect(
      countPendingPurge({}, 'Unknown'),
    ).rejects.toThrow('Model Unknown not found');
  });
});
