/**
 * Review Notes Service
 *
 * Manages reviewer notes attached to Learning Object versions.
 * These provide an audit trail of feedback during the review process.
 */

import { prisma } from './prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type NoteType = 'GENERAL' | 'APPROVAL' | 'REJECTION' | 'FEEDBACK' | 'QA_OVERRIDE';

export interface ReviewNote {
  id: string;
  learningObjectVersionId: string;
  authorUserId: string;
  noteText: string;
  noteType: NoteType;
  createdAt: Date;
}

export interface CreateNoteInput {
  learningObjectVersionId: string;
  authorUserId: string;
  noteText: string;
  noteType: NoteType;
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Add a review note to a version.
 */
export async function addReviewNote(input: CreateNoteInput): Promise<ReviewNote> {
  const note = await prisma.learningObjectVersionReviewNote.create({
    data: {
      learningObjectVersionId: input.learningObjectVersionId,
      authorUserId: input.authorUserId,
      noteText: input.noteText,
      noteType: input.noteType,
    },
  });

  return {
    id: note.id,
    learningObjectVersionId: note.learningObjectVersionId,
    authorUserId: note.authorUserId,
    noteText: note.noteText,
    noteType: note.noteType as NoteType,
    createdAt: note.createdAt,
  };
}

/**
 * Get all review notes for a version.
 */
export async function getReviewNotes(learningObjectVersionId: string): Promise<ReviewNote[]> {
  const notes = await prisma.learningObjectVersionReviewNote.findMany({
    where: { learningObjectVersionId },
    orderBy: { createdAt: 'desc' },
  });

  return notes.map((n) => ({
    id: n.id,
    learningObjectVersionId: n.learningObjectVersionId,
    authorUserId: n.authorUserId,
    noteText: n.noteText,
    noteType: n.noteType as NoteType,
    createdAt: n.createdAt,
  }));
}

/**
 * Get notes by type (e.g., all rejection notes).
 */
export async function getReviewNotesByType(
  learningObjectVersionId: string,
  noteType: NoteType
): Promise<ReviewNote[]> {
  const notes = await prisma.learningObjectVersionReviewNote.findMany({
    where: { learningObjectVersionId, noteType },
    orderBy: { createdAt: 'desc' },
  });

  return notes.map((n) => ({
    id: n.id,
    learningObjectVersionId: n.learningObjectVersionId,
    authorUserId: n.authorUserId,
    noteText: n.noteText,
    noteType: n.noteType as NoteType,
    createdAt: n.createdAt,
  }));
}

/**
 * Add an approval note when a version is approved.
 */
export async function addApprovalNote(
  learningObjectVersionId: string,
  authorUserId: string,
  noteText?: string
): Promise<ReviewNote> {
  return addReviewNote({
    learningObjectVersionId,
    authorUserId,
    noteText: noteText ?? 'Approved',
    noteType: 'APPROVAL',
  });
}

/**
 * Add a rejection note when a version is rejected.
 */
export async function addRejectionNote(
  learningObjectVersionId: string,
  authorUserId: string,
  reason: string
): Promise<ReviewNote> {
  return addReviewNote({
    learningObjectVersionId,
    authorUserId,
    noteText: reason,
    noteType: 'REJECTION',
  });
}

/**
 * Add a QA override note when reviewer overrides a QA failure.
 */
export async function addQaOverrideNote(
  learningObjectVersionId: string,
  authorUserId: string,
  justification: string
): Promise<ReviewNote> {
  return addReviewNote({
    learningObjectVersionId,
    authorUserId,
    noteText: justification,
    noteType: 'QA_OVERRIDE',
  });
}
