/**
 * Suppression Sync Service Tests
 *
 * Tests for:
 * - syncLocalToOonruMail: pushes unsynced suppressions to OonruMail
 * - reconcileFromOonruMail: creates local records for provider-only suppressions
 * - filterSuppressed: merges local + OonruMail suppression lists
 * - Idempotency: duplicate syncs don't create duplicates
 * - Non-blocking: OonruMail failures don't crash filter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const mockSuppressionsCreate = vi.fn();
const mockSuppressionsCheck = vi.fn();

vi.mock('@enterprise-email/aivolearning-email', () => ({
  AivolearningEmail: vi.fn().mockImplementation(function () {
    return {
      sdk: {
        suppressions: {
          create: mockSuppressionsCreate,
          check: mockSuppressionsCheck,
        },
      },
    };
  }),
}));

const mockPrisma = {
  emailSuppression: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../../../prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../../config.js', () => ({
  config: {
    email: {
      oonrumail: {
        enabled: true,
        apiKey: 'test-api-key',
      },
    },
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SuppressionSyncService', () => {
  let suppressionSyncService: Awaited<typeof import('../suppression-sync.service.js')>['suppressionSyncService'];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../suppression-sync.service.js');
    suppressionSyncService = mod.suppressionSyncService;
    suppressionSyncService.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // syncLocalToOonruMail
  // ───────────────────────────────────────────────────────────────────────────

  describe('syncLocalToOonruMail', () => {
    it('should push unsynced suppressions to OonruMail', async () => {
      mockPrisma.emailSuppression.findMany.mockResolvedValue([
        { id: 'id-1', email: 'bounce@example.com', reason: 'HARD_BOUNCE' },
        { id: 'id-2', email: 'spam@example.com', reason: 'SPAM_COMPLAINT' },
      ]);
      mockSuppressionsCreate.mockResolvedValue({});
      mockPrisma.emailSuppression.update.mockResolvedValue({});

      const result = await suppressionSyncService.syncLocalToOonruMail();

      expect(result).toEqual({ synced: 2, errors: 0 });
      expect(mockSuppressionsCreate).toHaveBeenCalledTimes(2);
      expect(mockSuppressionsCreate).toHaveBeenCalledWith({
        email: 'bounce@example.com',
        reason: 'hard_bounce',
        description: 'Synced from AIVO: HARD_BOUNCE',
      });
      expect(mockPrisma.emailSuppression.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.emailSuppression.update).toHaveBeenCalledWith({
        where: { id: 'id-1' },
        data: { syncedToProvider: true },
      });
    });

    it('should query only unsynced suppressions', async () => {
      mockPrisma.emailSuppression.findMany.mockResolvedValue([]);

      await suppressionSyncService.syncLocalToOonruMail();

      expect(mockPrisma.emailSuppression.findMany).toHaveBeenCalledWith({
        where: { syncedToProvider: false },
        take: 500,
      });
    });

    it('should count errors when OonruMail create fails', async () => {
      mockPrisma.emailSuppression.findMany.mockResolvedValue([
        { id: 'id-1', email: 'fail@example.com', reason: 'HARD_BOUNCE' },
      ]);
      mockSuppressionsCreate.mockRejectedValue(new Error('API error'));

      const result = await suppressionSyncService.syncLocalToOonruMail();

      expect(result).toEqual({ synced: 0, errors: 1 });
      expect(mockPrisma.emailSuppression.update).not.toHaveBeenCalled();
    });

    it('should return zero counts when no client', async () => {
      // Create a fresh instance without calling initialize — client stays null
      const { SuppressionSyncService } = await import('../suppression-sync.service.js');
      const svc = new SuppressionSyncService();

      const result = await svc.syncLocalToOonruMail();
      expect(result).toEqual({ synced: 0, errors: 0 });
    });

    it('should map suppression reasons correctly', async () => {
      mockPrisma.emailSuppression.findMany.mockResolvedValue([
        { id: 'id-1', email: 'a@test.com', reason: 'SPAM_COMPLAINT' },
        { id: 'id-2', email: 'b@test.com', reason: 'UNSUBSCRIBED' },
        { id: 'id-3', email: 'c@test.com', reason: 'MANUAL' },
      ]);
      mockSuppressionsCreate.mockResolvedValue({});
      mockPrisma.emailSuppression.update.mockResolvedValue({});

      await suppressionSyncService.syncLocalToOonruMail();

      expect(mockSuppressionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'spam_complaint' }),
      );
      expect(mockSuppressionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'unsubscribe' }),
      );
      expect(mockSuppressionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'manual' }),
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // reconcileFromOonruMail
  // ───────────────────────────────────────────────────────────────────────────

  describe('reconcileFromOonruMail', () => {
    it('should create local records for OonruMail-only suppressions', async () => {
      mockSuppressionsCheck.mockResolvedValue({
        results: {
          'new@example.com': { suppressed: true },
          'existing@example.com': { suppressed: true },
          'clean@example.com': { suppressed: false },
        },
      });

      // "existing" already in local DB; "new" is not
      mockPrisma.emailSuppression.findUnique
        .mockResolvedValueOnce(null) // new@example.com — not found
        .mockResolvedValueOnce({ email: 'existing@example.com' }); // exists

      mockPrisma.emailSuppression.create.mockResolvedValue({});

      const result = await suppressionSyncService.reconcileFromOonruMail([
        'new@example.com',
        'existing@example.com',
        'clean@example.com',
      ]);

      expect(result).toEqual(['new@example.com']);
      expect(mockPrisma.emailSuppression.create).toHaveBeenCalledOnce();
      expect(mockPrisma.emailSuppression.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          reason: 'HARD_BOUNCE',
          source: 'oonrumail_reconciliation',
          syncedToProvider: true,
        },
      });
    });

    it('should return empty array when no emails provided', async () => {
      const result = await suppressionSyncService.reconcileFromOonruMail([]);
      expect(result).toEqual([]);
      expect(mockSuppressionsCheck).not.toHaveBeenCalled();
    });

    it('should be idempotent — existing suppressions are not duplicated', async () => {
      mockSuppressionsCheck.mockResolvedValue({
        results: { 'existing@example.com': { suppressed: true } },
      });
      mockPrisma.emailSuppression.findUnique.mockResolvedValue({ email: 'existing@example.com' });

      const result = await suppressionSyncService.reconcileFromOonruMail(['existing@example.com']);

      expect(result).toEqual([]);
      expect(mockPrisma.emailSuppression.create).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // filterSuppressed
  // ───────────────────────────────────────────────────────────────────────────

  describe('filterSuppressed', () => {
    it('should filter locally-suppressed emails', async () => {
      mockPrisma.emailSuppression.findMany.mockResolvedValue([
        { email: 'bad@example.com' },
      ]);
      mockSuppressionsCheck.mockResolvedValue({ results: {} });

      const result = await suppressionSyncService.filterSuppressed([
        'good@example.com',
        'bad@example.com',
      ]);

      expect(result.allowed).toEqual(['good@example.com']);
      expect(result.suppressed).toEqual(['bad@example.com']);
    });

    it('should filter OonruMail-suppressed emails', async () => {
      mockPrisma.emailSuppression.findMany.mockResolvedValue([]); // no local suppressions
      mockSuppressionsCheck.mockResolvedValue({
        results: {
          'provider-bad@test.com': { suppressed: true },
          'provider-good@test.com': { suppressed: false },
        },
      });

      const result = await suppressionSyncService.filterSuppressed([
        'provider-bad@test.com',
        'provider-good@test.com',
      ]);

      expect(result.allowed).toEqual(['provider-good@test.com']);
      expect(result.suppressed).toEqual(['provider-bad@test.com']);
    });

    it('should merge local and OonruMail suppressions', async () => {
      mockPrisma.emailSuppression.findMany.mockResolvedValue([
        { email: 'local-bad@test.com' },
      ]);
      mockSuppressionsCheck.mockResolvedValue({
        results: { 'provider-bad@test.com': { suppressed: true } },
      });

      const result = await suppressionSyncService.filterSuppressed([
        'local-bad@test.com',
        'provider-bad@test.com',
        'clean@test.com',
      ]);

      expect(result.allowed).toEqual(['clean@test.com']);
      expect(result.suppressed).toContain('local-bad@test.com');
      expect(result.suppressed).toContain('provider-bad@test.com');
    });

    it('should not call OonruMail for emails already suppressed locally', async () => {
      mockPrisma.emailSuppression.findMany.mockResolvedValue([
        { email: 'a@test.com' },
        { email: 'b@test.com' },
      ]);
      mockSuppressionsCheck.mockResolvedValue({ results: {} });

      await suppressionSyncService.filterSuppressed(['a@test.com', 'b@test.com']);

      // OonruMail check should receive empty remaining list — or not be called
      // at most called with empty array
      if (mockSuppressionsCheck.mock.calls.length > 0) {
        expect(mockSuppressionsCheck).toHaveBeenCalledWith({ emails: [] });
      }
    });

    it('should be non-blocking when OonruMail check fails', async () => {
      mockPrisma.emailSuppression.findMany.mockResolvedValue([]);
      mockSuppressionsCheck.mockRejectedValue(new Error('Network error'));

      // Should NOT throw — falls back to local-only
      const result = await suppressionSyncService.filterSuppressed([
        'a@test.com',
        'b@test.com',
      ]);

      expect(result.allowed).toEqual(['a@test.com', 'b@test.com']);
      expect(result.suppressed).toEqual([]);
    });
  });
});
