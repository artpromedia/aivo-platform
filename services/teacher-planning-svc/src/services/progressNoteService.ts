/**
 * Progress Note Service
 *
 * Business logic for logging and retrieving progress notes.
 */

import { NotFoundError } from '../middleware/errorHandler.js';
import { prisma } from '../prisma.js';
import type { ProgressNote, ProgressRating } from '../types/domain.js';

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
  evidenceUri?: string | undefined;
}

export interface ListProgressNotesParams {
  tenantId: string;
  learnerId: string;
  goalId?: string | undefined;
  sessionId?: string | undefined;
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
  const { tenantId, learnerId, goalId, sessionId, page, pageSize } = params;

  interface WhereClause {
    learnerId: string;
    tenantId?: string;
    goalId?: string;
    sessionId?: string;
  }

  const where: WhereClause = { learnerId };
  if (tenantId) where.tenantId = tenantId;
  if (goalId) where.goalId = goalId;
  if (sessionId) where.sessionId = sessionId;

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
    evidenceUri: db.evidenceUri,
    createdAt: db.createdAt,
    updatedAt: db.updatedAt,
  };
}
