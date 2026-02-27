/**
 * Progress Note Service Tests (teacher-planning-svc)
 *
 * Unit tests for progressNoteService.ts:
 * - createProgressNote
 * - getProgressNoteById (with NotFoundError)
 * - listProgressNotes (pagination, visibility filtering)
 * - mapProgressNoteFromDb (mapper logic)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma before imports
vi.mock('../src/prisma.js', () => ({
  prisma: {
    progressNote: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock error handler
vi.mock('../src/middleware/errorHandler.js', () => ({
  NotFoundError: class NotFoundError extends Error {
    statusCode: number;
    constructor(resource: string, id: string) {
      super(`${resource} not found: ${id}`);
      this.name = 'NotFoundError';
      this.statusCode = 404;
    }
  },
}));

import { prisma } from '../src/prisma.js';
import {
  createProgressNote,
  getProgressNoteById,
  listProgressNotes,
} from '../src/services/progressNoteService.js';

// ============================================================================
// Test Data
// ============================================================================

const tenantId = 'tenant-111';
const learnerId = 'learner-222';
const userId = 'user-333';
const noteId = 'note-444';

const mockDbNote = {
  id: noteId,
  tenantId,
  learnerId,
  createdByUserId: userId,
  sessionId: null,
  sessionPlanId: null,
  goalId: null,
  goalObjectiveId: null,
  noteText: 'Showed improvement in reading fluency',
  rating: 4,
  visibility: 'ALL_EDUCATORS',
  tags: ['reading', 'fluency'],
  evidenceUri: null,
  createdAt: new Date('2025-01-10T10:00:00Z'),
  updatedAt: new Date('2025-01-10T10:00:00Z'),
};

// ============================================================================
// Tests
// ============================================================================

describe('Progress Note Service (teacher-planning-svc)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // createProgressNote
  // ──────────────────────────────────────────────────────────────────────────

  describe('createProgressNote', () => {
    it('should create a note with required fields', async () => {
      vi.mocked(prisma.progressNote.create).mockResolvedValue(mockDbNote as never);

      const result = await createProgressNote({
        tenantId,
        learnerId,
        createdByUserId: userId,
        noteText: 'Showed improvement in reading fluency',
      });

      expect(prisma.progressNote.create).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
      expect(result.noteText).toBe('Showed improvement in reading fluency');
    });

    it('should pass optional fields through correctly', async () => {
      vi.mocked(prisma.progressNote.create).mockResolvedValue({
        ...mockDbNote,
        goalId: 'goal-555',
        rating: 5,
        visibility: 'THERAPISTS_ONLY',
        tags: ['articulation'],
        evidenceUri: 'https://example.com/evidence.pdf',
      } as never);

      await createProgressNote({
        tenantId,
        learnerId,
        createdByUserId: userId,
        noteText: 'Great progress on /r/ sounds',
        goalId: 'goal-555',
        rating: 5 as any,
        visibility: 'THERAPISTS_ONLY' as any,
        tags: ['articulation'] as any,
        evidenceUri: 'https://example.com/evidence.pdf',
      });

      const createCall = vi.mocked(prisma.progressNote.create).mock.calls[0][0] as any;
      expect(createCall.data.visibility).toBe('THERAPISTS_ONLY');
      expect(createCall.data.evidenceUri).toBe('https://example.com/evidence.pdf');
    });

    it('should default visibility to ALL_EDUCATORS when not provided', async () => {
      vi.mocked(prisma.progressNote.create).mockResolvedValue(mockDbNote as never);

      await createProgressNote({
        tenantId,
        learnerId,
        createdByUserId: userId,
        noteText: 'Note text',
      });

      const createCall = vi.mocked(prisma.progressNote.create).mock.calls[0][0] as any;
      expect(createCall.data.visibility).toBe('ALL_EDUCATORS');
    });

    it('should set null for undefined optional relations', async () => {
      vi.mocked(prisma.progressNote.create).mockResolvedValue(mockDbNote as never);

      await createProgressNote({
        tenantId,
        learnerId,
        createdByUserId: userId,
        noteText: 'Note text',
      });

      const createCall = vi.mocked(prisma.progressNote.create).mock.calls[0][0] as any;
      expect(createCall.data.sessionId).toBeNull();
      expect(createCall.data.sessionPlanId).toBeNull();
      expect(createCall.data.goalId).toBeNull();
      expect(createCall.data.goalObjectiveId).toBeNull();
      expect(createCall.data.rating).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getProgressNoteById
  // ──────────────────────────────────────────────────────────────────────────

  describe('getProgressNoteById', () => {
    it('should return a note when found', async () => {
      vi.mocked(prisma.progressNote.findFirst).mockResolvedValue(mockDbNote as never);

      const result = await getProgressNoteById(noteId, tenantId);
      expect(result).toBeDefined();
      expect(result.id).toBe(noteId);
    });

    it('should scope query by tenantId when provided', async () => {
      vi.mocked(prisma.progressNote.findFirst).mockResolvedValue(mockDbNote as never);

      await getProgressNoteById(noteId, tenantId);

      const findCall = vi.mocked(prisma.progressNote.findFirst).mock.calls[0][0] as any;
      expect(findCall.where.id).toBe(noteId);
      expect(findCall.where.tenantId).toBe(tenantId);
    });

    it('should throw NotFoundError when note does not exist', async () => {
      vi.mocked(prisma.progressNote.findFirst).mockResolvedValue(null as never);

      await expect(getProgressNoteById('nonexistent-id', tenantId))
        .rejects
        .toThrow('not found');
    });

    it('should search without tenantId when not provided', async () => {
      vi.mocked(prisma.progressNote.findFirst).mockResolvedValue(mockDbNote as never);

      await getProgressNoteById(noteId);

      const findCall = vi.mocked(prisma.progressNote.findFirst).mock.calls[0][0] as any;
      expect(findCall.where.id).toBe(noteId);
      expect(findCall.where.tenantId).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // listProgressNotes
  // ──────────────────────────────────────────────────────────────────────────

  describe('listProgressNotes', () => {
    it('should return paginated notes', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([mockDbNote] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(1 as never);

      const result = await listProgressNotes({
        tenantId,
        learnerId,
        page: 1,
        pageSize: 20,
      });

      expect(result.progressNotes).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply goalId filter', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(0 as never);

      await listProgressNotes({
        tenantId,
        learnerId,
        goalId: 'goal-555',
        page: 1,
        pageSize: 10,
      });

      const findCall = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findCall.where.goalId).toBe('goal-555');
    });

    it('should apply sessionId filter', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(0 as never);

      await listProgressNotes({
        tenantId,
        learnerId,
        sessionId: 'session-666',
        page: 1,
        pageSize: 10,
      });

      const findCall = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findCall.where.sessionId).toBe('session-666');
    });

    it('should filter by allowed visibility levels', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(0 as never);

      await listProgressNotes({
        tenantId,
        learnerId,
        allowedVisibility: ['ALL_EDUCATORS', 'THERAPISTS_ONLY'] as any,
        page: 1,
        pageSize: 10,
      });

      const findCall = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findCall.where.visibility).toEqual({ in: ['ALL_EDUCATORS', 'THERAPISTS_ONLY'] });
    });

    it('should apply correct pagination skip/take', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(0 as never);

      await listProgressNotes({
        tenantId,
        learnerId,
        page: 3,
        pageSize: 5,
      });

      const findCall = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findCall.skip).toBe(10); // (3-1) * 5
      expect(findCall.take).toBe(5);
    });

    it('should order by createdAt descending', async () => {
      vi.mocked(prisma.progressNote.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.progressNote.count).mockResolvedValue(0 as never);

      await listProgressNotes({
        tenantId,
        learnerId,
        page: 1,
        pageSize: 20,
      });

      const findCall = vi.mocked(prisma.progressNote.findMany).mock.calls[0][0] as any;
      expect(findCall.orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Mapper: tags handling
  // ──────────────────────────────────────────────────────────────────────────

  describe('mapProgressNoteFromDb (via createProgressNote)', () => {
    it('should handle array tags', async () => {
      vi.mocked(prisma.progressNote.create).mockResolvedValue({
        ...mockDbNote,
        tags: ['tag1', 'tag2'],
      } as never);

      const result = await createProgressNote({
        tenantId,
        learnerId,
        createdByUserId: userId,
        noteText: 'test',
      });

      expect(result.tags).toEqual(['tag1', 'tag2']);
    });

    it('should handle non-array tags by defaulting to empty array', async () => {
      vi.mocked(prisma.progressNote.create).mockResolvedValue({
        ...mockDbNote,
        tags: null,
      } as never);

      const result = await createProgressNote({
        tenantId,
        learnerId,
        createdByUserId: userId,
        noteText: 'test',
      });

      expect(result.tags).toEqual([]);
    });
  });
});
