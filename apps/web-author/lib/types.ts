/**
 * Type definitions for content authoring
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS & CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

export type Subject = 'ELA' | 'MATH' | 'SCIENCE' | 'SEL' | 'SPEECH' | 'OTHER';
export type GradeBand = 'K_2' | 'G3_5' | 'G6_8' | 'G9_12';
export type VersionState = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'RETIRED';
export type ContentRole =
  | 'CURRICULUM_AUTHOR'
  | 'CURRICULUM_REVIEWER'
  | 'DISTRICT_CONTENT_ADMIN'
  | 'PLATFORM_ADMIN';

export const SUBJECT_LABELS: Record<Subject, string> = {
  ELA: 'English Language Arts',
  MATH: 'Mathematics',
  SCIENCE: 'Science',
  SEL: 'Social-Emotional Learning',
  SPEECH: 'Speech & Language',
  OTHER: 'Other',
};

export const GRADE_BAND_LABELS: Record<GradeBand, string> = {
  K_2: 'K-2',
  G3_5: '3-5',
  G6_8: '6-8',
  G9_12: '9-12',
};

export const VERSION_STATE_LABELS: Record<VersionState, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  RETIRED: 'Retired',
};

export const VERSION_STATE_TONES: Record<
  VersionState,
  'neutral' | 'info' | 'success' | 'warning' | 'error'
> = {
  DRAFT: 'neutral',
  IN_REVIEW: 'info',
  APPROVED: 'success',
  PUBLISHED: 'success',
  RETIRED: 'warning',
};

export const ROLE_LABELS: Record<ContentRole, string> = {
  CURRICULUM_AUTHOR: 'Author',
  CURRICULUM_REVIEWER: 'Reviewer',
  DISTRICT_CONTENT_ADMIN: 'Admin',
  PLATFORM_ADMIN: 'Platform Admin',
};

// ══════════════════════════════════════════════════════════════════════════════
// LEARNING OBJECT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface LearningObjectTag {
  id: string;
  learningObjectId: string;
  tag: string;
}

export interface LearningObject {
  id: string;
  tenantId: string | null;
  slug: string;
  title: string;
  subject: Subject;
  gradeBand: GradeBand;
  primarySkillId: string | null;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  tags: LearningObjectTag[];
  latestVersion?: LearningObjectVersionSummary;
}

export interface LearningObjectVersionSummary {
  id: string;
  versionNumber: number;
  state: VersionState;
  changeSummary: string | null;
  createdByUserId: string;
  createdAt: string;
  publishedAt: string | null;
  retiredAt: string | null;
}

export interface LearningObjectVersion {
  id: string;
  learningObjectId: string;
  versionNumber: number;
  state: VersionState;
  contentJson: ContentJson;
  accessibilityJson: AccessibilityJson;
  standardsJson: StandardsJson;
  changeSummary: string | null;
  reviewNotes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  retiredAt: string | null;
  skills: LearningObjectSkill[];
  learningObject?: LearningObject;
}

export interface LearningObjectSkill {
  id: string;
  versionId: string;
  skillId: string;
  isPrimary: boolean;
}

export interface VersionTransition {
  id: string;
  versionId: string;
  fromState: VersionState;
  toState: VersionState;
  transitionedByUserId: string;
  reason: string | null;
  transitionedAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT JSON TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ContentJson {
  type?: 'reading_passage' | 'math_problem' | 'generic';
  // Reading passage fields
  passageText?: string;
  lexileLevel?: number;
  readingLevel?: string;
  questions?: ContentQuestion[];
  // Math problem fields
  problemStatement?: string;
  solutionSteps?: string[];
  correctAnswer?: string;
  // Generic content
  content?: string;
  [key: string]: unknown;
}

export interface ContentQuestion {
  id: string;
  prompt: string;
  answerChoices: string[];
  correctIndex: number;
  explanation?: string;
}

export interface AccessibilityJson {
  altText?: string;
  readingLevelMetadata?: string;
  supportsDyslexiaFriendlyFont?: boolean;
  supportsReducedStimuli?: boolean;
  supportsHighContrast?: boolean;
  supportsScreenReader?: boolean;
  audioDescriptionUrl?: string;
  signLanguageVideoUrl?: string;
  [key: string]: unknown;
}

export interface StandardsJson {
  codes: string[];
  alignments?: StandardAlignment[];
  [key: string]: unknown;
}

export interface StandardAlignment {
  code: string;
  framework: string;
  description?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SKILL TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface Skill {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  subject: Subject | null;
  gradeBand: GradeBand | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  message?: string;
  details?: unknown;
}

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateLearningObjectRequest {
  title: string;
  subject: Subject;
  gradeBand: GradeBand;
  primarySkillId?: string | null;
  tags?: string[];
  tenantId?: string | null;
}

export interface UpdateLearningObjectRequest {
  title?: string;
  primarySkillId?: string | null;
  isActive?: boolean;
}

export interface UpdateVersionRequest {
  contentJson?: ContentJson;
  accessibilityJson?: AccessibilityJson;
  standardsJson?: StandardsJson;
  changeSummary?: string;
}

export interface SetSkillsRequest {
  skills: { skillId: string; isPrimary: boolean }[];
}

export interface RejectRequest {
  reason: string;
}

export interface ListLearningObjectsParams {
  subject?: Subject;
  gradeBand?: GradeBand;
  state?: VersionState;
  tag?: string;
  createdByMe?: boolean;
  includeGlobal?: boolean;
  page?: number;
  pageSize?: number;
}
