/**
 * Progress Note Service Tests (goal-svc)
 *
 * Unit tests for progressNoteService.ts:
 * - createProgressNote
 * - getProgressNoteById (with null return)
 * - listProgressNotes (filtering, pagination, date ranges)
 * - updateProgressNote (partial updates, not-found)
 * - deleteProgressNote (success, not-found)
 * - getGoalProgressTimeline
 * - getLearnerRecentNotes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    progressNote: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    goal: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '../src/prisma.js';
import * as progressNoteService from '../src/services/progressNoteService.js';

// ============================================================================
// Test Data
// ============================================================================

const tenantId = 'tenant-aaa';
const learnerId = 'learner-bbb';
const userId = 'user-ccc';
const noteId = 'note-ddd';
const goalId = 'goal-eee';

const mockNote = {
  id: noteId,
  tenantId,
  learnerId,
  createdByUserId: userId,
  sessionId: null,
  sessionPlanId: null,
  goalId: null,
  goalObjectiveId: null,
  noteText: 'Student demonstrated mastery of addition facts',
  rating: 4,
  evidenceUri: null,
  createdAt: new Date('2025-01-10T10:00:00Z'),
  updatedAt: new Date('2025-01-10T10:00:00Z'),
  goal: null,
  goalObjective: null,
  sessionPlan: null,
};

// ============================================================================
// Tests
// ============================================================================

describe('Progress Note Service (goal-svc)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // createProgressNote
  // ──────────────────────────────────────────────────────────────────────────

  describe('createProgressNote', () => {
    it('should create a progress note with required fields', async () => {
      vi.mocked(prisma.progressNote.create).mockResolvedValue(mockNote as never);

      const result = await progressNoteService.createProgressNote({
        tenantId,
        learnerId,
        createdByUserId: userId,
        noteText: 'Student demonstrated mastery of addition facts',
      });

      expect(prisma.progressNote.create).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      expect(result.noteText).toBe('Student demonstrated mastery of addition facts');
    });

    it('should include goal/objective/sessionPlan in result', async () => {
      vi.mocked(prisma.progressNote.create).mockResolvedValue({
        ...mockNote,
        goalId: goalId,
        goal: { id: goalId, title: 'Math Addition', domain: 'MATH' },
        goalObjective: { id: 'obj-1', description: 'Single digit addition' },
      } as never);

      const result = await progressNoteService.createProgressNote({
        tenantId,
        learnerId,
        createdByUserId: userId,
        noteText: 'Note',
        goalId,
      });

      expect(result).toBeDefined();
    });

    it('should pass optional fields to Prisma create', async () => {
      vi.mocked(prisma.progressNote.create).mockResolvedValue(mockNote as never);

      await progressNoteService.createProgressNote({
        tenantId,
        learnerId,
        createdByUserId: userId,
        noteText: 'Note with extras',
        sessionId: 'session-1',
        sessionPlanId: 'plan-1',
        goalId: goalId,
        goalObjectiveId: 'obj-1',
        rating: 5,
        evidenceUri: 'https://example.com/evidence.pdf',
      });

      const createCall = vi.mocked(prisma.progressNote.create).mock.calls[0][0] as any;
      expect(createCall.data.sessionId).toBe('session-1');
      expect(createCall.data.sessionPlanId).toBe('plan-1');
      expect(createCall.data.goalId).toBe(goalId);
      expect(createCall.data.rating).toBe(5);
      expect(createCall.data.evidenceUri).toBe('https://example.com/evidence.pdf');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getProgressNoteById
  // ──────────────────────────────────────────────────────────────────────────

  describe('getProgressNoteById', () => {
    it('should return a note when found', async () => {
      vi.mocked(prisma.progressNote.findFirst).mockResolvedValue(mockNote as never);

      const result = await progressNoteService.getProgressNoteById(noteId, tenantId);
      expect(result).toBeDefined();
      expect(result!.id).toBe(noteId);
    });

    it('should scope by tenantId', async () => {
      vi.mocked(prisma.progressNote.findFirst).mockResolvedValue(mockNote as never);

      await progressNoteService.getProgressNoteById(noteId, tenantId);

      const findArg = vi.mocked(prisma.progressNote.findFirst).mock.calls[0][0] as any;
      expect(findArg.where.id).toBe(noteId);
      expect(findArg.where.tenantId).toBe(tenantId);
    });

    it('should return null when note does not exist', async () => {
      vi.mocked(prisma.progressNote.findFirst).mockResolvedValue(null as never);

      const result = await progressNoteService.getProgressNoteById('nonexistent', tenantId);
      expect(result).toBeNull();
    });

    it('should include related goal and objective selects', async () => {
      vi.mocked(prisma.progressNote.findFirst).mockResolvedValue(mockNote as never);

      await progressNoteService.getProgressNoteById(noteId, tenantId);

      const findArg = vi.mocked(prisma.progressNote.findFirst).mock.calls[0][0] as any;
      expect(findArg.include.goal).toBeDefined();
      expect(findArg.include.goalObjective).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // listProgressNotes
  // ──────────────────────────────────────────────────────────────────────────

  describe('listProgressNotes', () => {
    it('should return paginated notes with total', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([mockNote] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(25 as never);

      const result = await progressNoteService.listProgressNotes(
        { tenantId },
        { page: 1, pageSize: 20 },
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(2); // ceil(25/20)
    });

    it('should apply learnerId filter', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(0 as never);

      await progressNoteService.listProgressNotes(
        { tenantId, learnerId },
        { page: 1, pageSize: 10 },
      );

      const findArg = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findArg.where.learnerId).toBe(learnerId);
    });

    it('should apply goalId filter', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(0 as never);

      await progressNoteService.listProgressNotes(
        { tenantId, goalId },
        { page: 1, pageSize: 10 },
      );

      const findArg = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findArg.where.goalId).toBe(goalId);
    });

    it('should apply date range filters', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(0 as never);

      const from = new Date('2025-01-01');
      const to = new Date('2025-01-31');

      await progressNoteService.listProgressNotes(
        { tenantId, createdFrom: from, createdTo: to },
        { page: 1, pageSize: 10 },
      );

      const findArg = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findArg.where.createdAt).toBeDefined();
      expect(findArg.where.createdAt.gte).toBe(from);
      expect(findArg.where.createdAt.lte).toBe(to);
    });

    it('should default to page 1, pageSize 20', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(0 as never);

      await progressNoteService.listProgressNotes({ tenantId });

      const findArg = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findArg.skip).toBe(0);
      expect(findArg.take).toBe(20);
    });

    it('should calculate correct pagination offset', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(0 as never);

      await progressNoteService.listProgressNotes(
        { tenantId },
        { page: 4, pageSize: 15 },
      );

      const findArg = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findArg.skip).toBe(45); // (4-1) * 15
      expect(findArg.take).toBe(15);
    });

    it('should order by createdAt desc', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(0 as never);

      await progressNoteService.listProgressNotes({ tenantId });

      const findArg = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findArg.orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // updateProgressNote
  // ──────────────────────────────────────────────────────────────────────────

  describe('updateProgressNote', () => {
    it('should update note text', async () => {
      vi.mocked(prisma.progressNote.findFirst).mockResolvedValue(mockNote as never);
      vi.mocked(prisma.progressNote.update).mockResolvedValue({
        ...mockNote,
        noteText: 'Updated text',
      } as never);

      const result = await progressNoteService.updateProgressNote(noteId, tenantId, {
        noteText: 'Updated text',
      });

      expect(result).toBeDefined();
      expect(prisma.progressNote.update).toHaveBeenCalledOnce();
    });

    it('should return null when note not found', async () => {
      vi.mocked(prisma.progressNote.findFirst).mockResolvedValue(null as never);

      const result = await progressNoteService.updateProgressNote('nonexistent', tenantId, {
        noteText: 'Updated text',
      });

      expect(result).toBeNull();
      expect(prisma.progressNote.update).not.toHaveBeenCalled();
    });

    it('should only update provided fields', async () => {
      vi.mocked(prisma.progressNote.findFirst).mockResolvedValue(mockNote as never);
      vi.mocked(prisma.progressNote.update).mockResolvedValue(mockNote as never);

      await progressNoteService.updateProgressNote(noteId, tenantId, {
        rating: 5,
      });

      const updateCall = vi.mocked(prisma.progressNote.update).mock.calls[0][0] as any;
      expect(updateCall.data.rating).toBe(5);
      // noteText should not be in data since it wasn't provided
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // deleteProgressNote
  // ──────────────────────────────────────────────────────────────────────────

  describe('deleteProgressNote', () => {
    it('should delete and return true when note exists', async () => {
      vi.mocked(prisma.progressNote.findFirst).mockResolvedValue(mockNote as never);
      vi.mocked(prisma.progressNote.delete).mockResolvedValue(mockNote as never);

      const result = await progressNoteService.deleteProgressNote(noteId, tenantId);

      expect(result).toBe(true);
      expect(prisma.progressNote.delete).toHaveBeenCalledWith({ where: { id: noteId } });
    });

    it('should return false when note does not exist', async () => {
      vi.mocked(prisma.progressNote.findFirst).mockResolvedValue(null as never);

      const result = await progressNoteService.deleteProgressNote('nonexistent', tenantId);

      expect(result).toBe(false);
      expect(prisma.progressNote.delete).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getGoalProgressTimeline
  // ──────────────────────────────────────────────────────────────────────────

  describe('getGoalProgressTimeline', () => {
    const mockGoal = {
      id: goalId,
      tenantId,
      title: 'Master addition',
      domain: 'MATH',
      status: 'ACTIVE',
      progressRating: 3,
    };

    it('should return timeline with goal info', async () => {
      vi.mocked(prisma.goal.findFirst).mockResolvedValue(mockGoal as never);
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([mockNote] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(1 as never);

      const result = await progressNoteService.getGoalProgressTimeline(tenantId, goalId);

      expect(result).toBeDefined();
      expect(result!.goal.id).toBe(goalId);
      expect(result!.goal.title).toBe('Master addition');
      expect(result!.timeline.data).toHaveLength(1);
    });

    it('should return null when goal not found', async () => {
      vi.mocked(prisma.goal.findFirst).mockResolvedValue(null as never);

      const result = await progressNoteService.getGoalProgressTimeline(tenantId, 'nonexistent');

      expect(result).toBeNull();
    });

    it('should order timeline chronologically (asc)', async () => {
      vi.mocked(prisma.goal.findFirst).mockResolvedValue(mockGoal as never);
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(0 as never);

      await progressNoteService.getGoalProgressTimeline(tenantId, goalId);

      const findArg = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findArg.orderBy).toEqual({ createdAt: 'asc' });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getLearnerRecentNotes
  // ──────────────────────────────────────────────────────────────────────────

  describe('getLearnerRecentNotes', () => {
    it('should get recent notes with default limit', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([mockNote] as never);

      const result = await progressNoteService.getLearnerRecentNotes(tenantId, learnerId);

      expect(result).toHaveLength(1);
      const findArg = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findArg.take).toBe(10); // default limit
    });

    it('should respect custom limit', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);

      await progressNoteService.getLearnerRecentNotes(tenantId, learnerId, 5);

      const findArg = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findArg.take).toBe(5);
    });

    it('should filter by tenantId and learnerId', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);

      await progressNoteService.getLearnerRecentNotes(tenantId, learnerId);

      const findArg = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findArg.where.tenantId).toBe(tenantId);
      expect(findArg.where.learnerId).toBe(learnerId);
    });

    it('should order by createdAt descending', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);

      await progressNoteService.getLearnerRecentNotes(tenantId, learnerId);

      const findArg = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findArg.orderBy).toEqual({ createdAt: 'desc' });
    });
  });
});
