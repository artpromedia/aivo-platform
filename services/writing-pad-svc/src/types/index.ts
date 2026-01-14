/**
 * Writing Pad Service Types
 *
 * Type definitions for AI-assisted writing functionality.
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

export type WritingType =
  | 'NARRATIVE'
  | 'PERSUASIVE'
  | 'EXPOSITORY'
  | 'DESCRIPTIVE'
  | 'POETRY'
  | 'JOURNAL'
  | 'NOTE'
  | 'DRAFT';

export type WritingStatus = 'DRAFT' | 'IN_PROGRESS' | 'REVIEWING' | 'COMPLETED' | 'ARCHIVED';

export type GradeBand = 'K5' | 'G6_8' | 'G9_12';

export type Subject = 'ELA' | 'SCIENCE' | 'SOCIAL_STUDIES' | 'OTHER';

export type FeedbackType =
  | 'GRAMMAR'
  | 'SPELLING'
  | 'STRUCTURE'
  | 'CLARITY'
  | 'VOCABULARY'
  | 'STYLE'
  | 'CONTENT'
  | 'ENCOURAGEMENT';

export type SuggestionType =
  | 'WORD_CHOICE'
  | 'SENTENCE_STARTER'
  | 'TRANSITION'
  | 'CONCLUSION'
  | 'ELABORATION'
  | 'ORGANIZATION';

// ══════════════════════════════════════════════════════════════════════════════
// CORE ENTITIES
// ══════════════════════════════════════════════════════════════════════════════

export interface WritingDocument {
  id: string;
  tenant_id: string;
  learner_id: string;
  title: string;
  content: string;
  writing_type: WritingType;
  subject: Subject | null;
  grade_band: GradeBand | null;
  status: WritingStatus;
  word_count: number;
  character_count: number;
  assignment_id: string | null;
  session_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WritingVersion {
  id: string;
  document_id: string;
  version_number: number;
  content: string;
  word_count: number;
  created_at: Date;
}

export interface WritingFeedback {
  id: string;
  document_id: string;
  feedback_type: FeedbackType;
  text: string;
  start_offset: number | null;
  end_offset: number | null;
  original_text: string | null;
  suggested_text: string | null;
  applied: boolean;
  dismissed: boolean;
  created_at: Date;
}

export interface WritingSuggestion {
  id: string;
  document_id: string;
  suggestion_type: SuggestionType;
  text: string;
  position: 'INLINE' | 'END_OF_PARAGRAPH' | 'END_OF_DOCUMENT';
  context: string | null;
  accepted: boolean;
  dismissed: boolean;
  created_at: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// AI ASSISTANCE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface AIAssistanceRequest {
  documentId: string;
  content: string;
  writingType: WritingType;
  gradeBand: GradeBand;
  subject?: Subject;
  requestTypes: ('FEEDBACK' | 'SUGGESTIONS' | 'CONTINUATION')[];
  focusAreas?: FeedbackType[];
}

export interface AIAssistanceResponse {
  documentId: string;
  feedback: WritingFeedbackItem[];
  suggestions: WritingSuggestionItem[];
  continuation?: string;
  encouragement?: string;
  metrics: WritingMetrics;
}

export interface WritingFeedbackItem {
  type: FeedbackType;
  text: string;
  startOffset?: number;
  endOffset?: number;
  originalText?: string;
  suggestedText?: string;
  severity: 'INFO' | 'SUGGESTION' | 'WARNING';
}

export interface WritingSuggestionItem {
  type: SuggestionType;
  text: string;
  position: 'INLINE' | 'END_OF_PARAGRAPH' | 'END_OF_DOCUMENT';
  context?: string;
}

export interface WritingMetrics {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordLength: number;
  averageSentenceLength: number;
  readabilityScore: number;
  vocabularyLevel: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
}

// ══════════════════════════════════════════════════════════════════════════════
// API REQUEST/RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateDocumentRequest {
  title: string;
  content?: string;
  writingType: WritingType;
  subject?: Subject;
  gradeBand?: GradeBand;
  assignmentId?: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  status?: WritingStatus;
}

export interface DocumentResponse {
  document: WritingDocument;
  metrics?: WritingMetrics;
  recentFeedback?: WritingFeedbackItem[];
}

export interface DocumentListResponse {
  documents: WritingDocument[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FeedbackResponse {
  feedback: WritingFeedback[];
  suggestions: WritingSuggestion[];
  metrics: WritingMetrics;
  encouragement?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// WRITING PROMPTS & TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

export interface WritingPrompt {
  id: string;
  title: string;
  description: string;
  writingType: WritingType;
  gradeBand: GradeBand;
  subject: Subject;
  starterText?: string;
  guidelines?: string[];
  wordCountGoal?: { min: number; max: number };
}

export interface WritingTemplate {
  id: string;
  name: string;
  description: string;
  writingType: WritingType;
  structure: WritingTemplateSection[];
}

export interface WritingTemplateSection {
  name: string;
  description: string;
  placeholder: string;
  required: boolean;
  minWords?: number;
  maxWords?: number;
}
