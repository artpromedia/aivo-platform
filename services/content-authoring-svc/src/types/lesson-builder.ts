/**
 * Lesson Builder Type Definitions
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

export type BlockType =
  // Text blocks
  | 'TEXT_PARAGRAPH'
  | 'TEXT_HEADING'
  | 'TEXT_LIST'
  | 'TEXT_QUOTE'
  // Media blocks
  | 'MEDIA_IMAGE'
  | 'MEDIA_VIDEO'
  | 'MEDIA_AUDIO'
  | 'MEDIA_EMBED'
  // Interactive blocks
  | 'QUIZ'
  | 'POLL'
  | 'FLASHCARD'
  | 'DRAG_DROP'
  // Activity blocks
  | 'ACTIVITY_WORKSHEET'
  | 'ACTIVITY_ASSIGNMENT'
  | 'ACTIVITY_DISCUSSION'
  // Layout blocks
  | 'LAYOUT_COLUMNS'
  | 'LAYOUT_DIVIDER'
  | 'LAYOUT_CALLOUT'
  | 'LAYOUT_ACCORDION';

export type LessonPreviewMode = 'desktop' | 'tablet' | 'mobile';

// ══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

export interface LessonBlock {
  id: string;
  versionId: string;
  type: BlockType;
  position: number;
  content: Record<string, any>;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonVersion {
  id: string;
  lessonId: string;
  versionNumber: number;
  isDraft: boolean;
  publishedAt?: Date;
  createdByUserId: string;
  createdAt: Date;
  blocks?: LessonBlock[];
}

export interface Lesson {
  id: string;
  tenantId: string | null;
  title: string;
  description?: string;
  subject: string;
  gradeBand: string;
  isPublished: boolean;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  versions?: LessonVersion[];
}
