/**
 * Progress Note Service
 *
 * Business logic for logging and retrieving progress notes.
 */

import type { Prisma } from '@prisma/client';

import { NotFoundError } from '../middleware/errorHandler.js';
import { prisma } from '../prisma.js';
import type { ProgressNote, ProgressRating, Visibility, NoteTag } from '../types/domain.js';

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESS NOTE CRUD
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateProgressNoteParams {
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  sessionId?: string | undefined;
  sessionPlanId?: string | undefined;
  goalId?: string | undefined;
  goalObjectiveId?: string | undefined;
  noteText: string;
  rating?: ProgressRating | undefined;
  visibility?: Visibility | undefined;
  tags?: NoteTag[] | undefined;
  evidenceUri?: string | undefined;
}

export interface ListProgressNotesParams {
  tenantId: string;
  learnerId: string;
  goalId?: string | undefined;
  sessionId?: string | undefined;
  /** Visibility levels to include (for filtering based on user role) */
  allowedVisibility?: Visibility[] | undefined;
  page: number;
  pageSize: number;
}

export interface ListProgressNotesResult {
  progressNotes: ProgressNote[];
  total: number;
}

/**
 * Create a new progress note
 */
export async function createProgressNote(params: CreateProgressNoteParams): Promise<ProgressNote> {
  const {
    tenantId,
    learnerId,
    createdByUserId,
    sessionId,
    sessionPlanId,
    goalId,
    goalObjectiveId,
    noteText,
    rating,
    visibility,
    tags,
    evidenceUri,
  } = params;

  const note = await prisma.progressNote.create({
    data: {
      tenantId,
      learnerId,
      createdByUserId,
      sessionId: sessionId ?? null,
      sessionPlanId: sessionPlanId ?? null,
      goalId: goalId ?? null,
      goalObjectiveId: goalObjectiveId ?? null,
      noteText,
      rating: rating ?? null,
      visibility: visibility ?? 'ALL_EDUCATORS',
      tags: (tags ?? []) as Prisma.InputJsonValue,
      evidenceUri: evidenceUri ?? null,
    },
  });

  return mapProgressNoteFromDb(note);
}

/**
 * Get a progress note by ID
 */
export async function getProgressNoteById(
  noteId: string,
  tenantId?: string
): Promise<ProgressNote> {
  interface WhereClause {
    id: string;
    tenantId?: string;
  }

  const where: WhereClause = { id: noteId };
  if (tenantId) where.tenantId = tenantId;

  const note = await prisma.progressNote.findFirst({ where });

  if (!note) {
    throw new NotFoundError('ProgressNote', noteId);
  }

  return mapProgressNoteFromDb(note);
}

/**
 * List progress notes for a learner
 */
export async function listProgressNotes(
  params: ListProgressNotesParams
): Promise<ListProgressNotesResult> {
  const { tenantId, learnerId, goalId, sessionId, allowedVisibility, page, pageSize } = params;

  interface WhereClause {
    learnerId: string;
    tenantId?: string;
    goalId?: string;
    sessionId?: string;
    visibility?: { in: Visibility[] };
  }

  const where: WhereClause = { learnerId };
  if (tenantId) where.tenantId = tenantId;
  if (goalId) where.goalId = goalId;
  if (sessionId) where.sessionId = sessionId;
  // Filter by allowed visibility levels (for role-based filtering)
  if (allowedVisibility && allowedVisibility.length > 0) {
    where.visibility = { in: allowedVisibility };
  }

  const [notes, total] = await Promise.all([
    prisma.progressNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.progressNote.count({ where }),
  ]);

  return {
    progressNotes: notes.map(mapProgressNoteFromDb),
    total,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAPPERS
// ══════════════════════════════════════════════════════════════════════════════

interface DbProgressNote {
  id: string;
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  sessionId: string | null;
  sessionPlanId: string | null;
  goalId: string | null;
  goalObjectiveId: string | null;
  noteText: string;
  rating: number | null;
  visibility: string;
  tags: unknown;
  evidenceUri: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapProgressNoteFromDb(db: DbProgressNote): ProgressNote {
  return {
    id: db.id,
    tenantId: db.tenantId,
    learnerId: db.learnerId,
    createdByUserId: db.createdByUserId,
    sessionId: db.sessionId,
    sessionPlanId: db.sessionPlanId,
    goalId: db.goalId,
    goalObjectiveId: db.goalObjectiveId,
    noteText: db.noteText,
    rating: db.rating as ProgressRating | null,
    visibility: db.visibility as Visibility,
    tags: (Array.isArray(db.tags) ? db.tags : []) as NoteTag[],
    evidenceUri: db.evidenceUri,
    createdAt: db.createdAt,
    updatedAt: db.updatedAt,
  };
}
