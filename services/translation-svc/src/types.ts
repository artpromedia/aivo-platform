/**
 * Translation Service Types
 */

import type { SupportedLocale, TranslationNamespace } from '@aivo/i18n';

/**
 * Translation entry in database
 */
export interface TranslationEntry {
  id: string;
  key: string;
  locale: SupportedLocale;
  namespace: TranslationNamespace;
  value: string;
  context?: string;
  description?: string;
  status: TranslationStatus;
  source: TranslationSource;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  version: number;
  pluralForm?: string;
  maxLength?: number;
  screenshot?: string;
}

/**
 * Translation status
 */
export type TranslationStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';

/**
 * Translation source
 */
export type TranslationSource = 'manual' | 'machine' | 'imported' | 'memory';

/**
 * Translation memory entry
 */
export interface TranslationMemoryEntry {
  id: string;
  sourceLocale: SupportedLocale;
  sourceText: string;
  targetLocale: SupportedLocale;
  targetText: string;
  context?: string;
  quality: number; // 0-100
  usageCount: number;
  createdAt: Date;
  lastUsedAt: Date;
}

/**
 * Glossary term
 */
export interface GlossaryTerm {
  id: string;
  term: string;
  locale: SupportedLocale;
  definition: string;
  translations: Record<SupportedLocale, string>;
  category?: string;
  doNotTranslate?: boolean;
  caseSensitive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Translation request
 */
export interface TranslationRequest {
  id: string;
  sourceLocale: SupportedLocale;
  targetLocales: SupportedLocale[];
  namespace: TranslationNamespace;
  entries: TranslationRequestEntry[];
  status: TranslationRequestStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requestedBy: string;
  assignedTo?: string;
  dueDate?: Date;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Single entry in translation request
 */
export interface TranslationRequestEntry {
  key: string;
  sourceText: string;
  context?: string;
  maxLength?: number;
  translations: Partial<
    Record<
      SupportedLocale,
      {
        value: string;
        status: TranslationStatus;
        translatedBy?: string;
        reviewedBy?: string;
      }
    >
  >;
}

/**
 * Translation request status
 */
export type TranslationRequestStatus =
  | 'pending'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'cancelled';

/**
 * Machine translation provider
 */
export type TranslationProvider = 'google' | 'deepl' | 'azure' | 'amazon';

/**
 * Machine translation request
 */
export interface MachineTranslationRequest {
  texts: string[];
  sourceLocale: SupportedLocale;
  targetLocale: SupportedLocale;
  provider?: TranslationProvider;
  format?: 'text' | 'html';
  glossaryId?: string;
}

/**
 * Machine translation result
 */
export interface MachineTranslationResult {
  translations: {
    sourceText: string;
    translatedText: string;
    confidence?: number;
    provider: TranslationProvider;
  }[];
  detectedSourceLocale?: string;
}

/**
 * Translation bundle (for export/import)
 */
export interface TranslationBundle {
  locale: SupportedLocale;
  namespace: TranslationNamespace;
  version: string;
  translations: Record<string, string>;
  metadata: {
    exportedAt: Date;
    exportedBy?: string;
    sourceVersion?: string;
  };
}

/**
 * Translation statistics
 */
export interface TranslationStats {
  locale: SupportedLocale;
  namespace: TranslationNamespace;
  totalKeys: number;
  translatedKeys: number;
  approvedKeys: number;
  pendingKeys: number;
  completionPercentage: number;
  lastUpdated: Date;
}

/**
 * Translation diff
 */
export interface TranslationDiff {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
}

/**
 * Content for translation
 */
export interface TranslatableContent {
  id: string;
  type: 'lesson' | 'question' | 'activity' | 'notification' | 'email';
  sourceLocale: SupportedLocale;
  fields: {
    name: string;
    value: string;
    format?: 'text' | 'html' | 'markdown';
    maxLength?: number;
  }[];
  translations: Partial<
    Record<
      SupportedLocale,
      {
        fields: Record<string, string>;
        status: TranslationStatus;
      }
    >
  >;
  createdAt: Date;
  updatedAt: Date;
}
