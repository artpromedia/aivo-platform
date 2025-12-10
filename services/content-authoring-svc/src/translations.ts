/**
 * Translation Service
 *
 * Manages localized content for Learning Object versions.
 * Supports multiple locales with accessibility metadata per locale.
 */

import type { TranslationStatus } from '@prisma/client';

import { prisma } from './prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Supported locales.
 * These follow BCP 47 language tags.
 */
export const SUPPORTED_LOCALES = ['en', 'en-US', 'es', 'es-MX', 'fr', 'de', 'pt', 'zh'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

/**
 * Extended accessibility metadata schema.
 * This is used in both the main accessibility_json and translation accessibility_json.
 */
export interface AccessibilityMetadata {
  // Alt text and transcripts
  altTexts?: Record<string, string>;
  transcripts?: Record<string, string>;
  audioDescriptions?: Record<string, string>;

  // Reading/cognitive metrics
  readingLevel?: string;
  flesch_kincaid_grade?: number;
  estimatedCognitiveLoad?: 'LOW' | 'MEDIUM' | 'HIGH';

  // Accessibility feature flags
  supportsDyslexiaFriendlyFont?: boolean;
  supportsReducedStimuli?: boolean;
  hasScreenReaderOptimizedStructure?: boolean;
  hasHighContrastMode?: boolean;
  supportsTextToSpeech?: boolean;

  // Additional hints
  teacherNotes?: string;
  simplifiedInstructions?: string;
  keyVocabulary?: string[];
}

/**
 * Locale-specific metadata (beyond accessibility).
 */
export interface LocaleMetadata {
  readingLevel?: string;
  culturalNotes?: string;
  localStandards?: string[];
  translationNotes?: string;
  lastSyncedWithSource?: string; // ISO date
}

export interface Translation {
  id: string;
  learningObjectVersionId: string;
  locale: string;
  status: TranslationStatus;
  contentJson: Record<string, unknown>;
  accessibilityJson: AccessibilityMetadata;
  metadataJson: LocaleMetadata;
  translatedByUserId: string | null;
  reviewedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranslationSummary {
  locale: string;
  status: TranslationStatus;
  updatedAt: Date;
  translatedByUserId: string | null;
}

export interface UpsertTranslationInput {
  learningObjectVersionId: string;
  locale: string;
  contentJson: Record<string, unknown>;
  accessibilityJson?: AccessibilityMetadata;
  metadataJson?: LocaleMetadata;
  translatedByUserId: string;
  status?: TranslationStatus;
}

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate locale string format.
 */
export function isValidLocale(locale: string): boolean {
  // BCP 47 pattern: language[-region]
  const pattern = /^[a-z]{2}(-[A-Z]{2})?$/;
  return pattern.test(locale);
}

/**
 * Normalize locale to base language if needed.
 * e.g., "en-US" -> "en" for fallback purposes.
 */
export function getBaseLocale(locale: string): string {
  return locale.split('-')[0];
}

// ══════════════════════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * List all translations for a version.
 */
export async function listTranslations(versionId: string): Promise<TranslationSummary[]> {
  const translations = await prisma.learningObjectTranslation.findMany({
    where: { learningObjectVersionId: versionId },
    select: {
      locale: true,
      status: true,
      updatedAt: true,
      translatedByUserId: true,
    },
    orderBy: { locale: 'asc' },
  });

  return translations;
}

/**
 * Get a specific translation by version and locale.
 */
export async function getTranslation(
  versionId: string,
  locale: string
): Promise<Translation | null> {
  const translation = await prisma.learningObjectTranslation.findUnique({
    where: {
      learningObjectVersionId_locale: {
        learningObjectVersionId: versionId,
        locale,
      },
    },
  });

  if (!translation) return null;

  return {
    id: translation.id,
    learningObjectVersionId: translation.learningObjectVersionId,
    locale: translation.locale,
    status: translation.status,
    contentJson: translation.contentJson as Record<string, unknown>,
    accessibilityJson: translation.accessibilityJson as AccessibilityMetadata,
    metadataJson: translation.metadataJson as LocaleMetadata,
    translatedByUserId: translation.translatedByUserId,
    reviewedByUserId: translation.reviewedByUserId,
    createdAt: translation.createdAt,
    updatedAt: translation.updatedAt,
  };
}

/**
 * Upsert a translation (create or update).
 */
export async function upsertTranslation(input: UpsertTranslationInput): Promise<Translation> {
  const translation = await prisma.learningObjectTranslation.upsert({
    where: {
      learningObjectVersionId_locale: {
        learningObjectVersionId: input.learningObjectVersionId,
        locale: input.locale,
      },
    },
    create: {
      learningObjectVersionId: input.learningObjectVersionId,
      locale: input.locale,
      status: input.status ?? 'DRAFT',
      contentJson: input.contentJson,
      accessibilityJson: input.accessibilityJson ?? {},
      metadataJson: input.metadataJson ?? {},
      translatedByUserId: input.translatedByUserId,
    },
    update: {
      contentJson: input.contentJson,
      accessibilityJson: input.accessibilityJson ?? {},
      metadataJson: input.metadataJson ?? {},
      translatedByUserId: input.translatedByUserId,
      status: input.status,
    },
  });

  return {
    id: translation.id,
    learningObjectVersionId: translation.learningObjectVersionId,
    locale: translation.locale,
    status: translation.status,
    contentJson: translation.contentJson as Record<string, unknown>,
    accessibilityJson: translation.accessibilityJson as AccessibilityMetadata,
    metadataJson: translation.metadataJson as LocaleMetadata,
    translatedByUserId: translation.translatedByUserId,
    reviewedByUserId: translation.reviewedByUserId,
    createdAt: translation.createdAt,
    updatedAt: translation.updatedAt,
  };
}

/**
 * Update translation status (e.g., mark as READY after review).
 */
export async function updateTranslationStatus(
  versionId: string,
  locale: string,
  status: TranslationStatus,
  reviewedByUserId?: string
): Promise<Translation | null> {
  try {
    const translation = await prisma.learningObjectTranslation.update({
      where: {
        learningObjectVersionId_locale: {
          learningObjectVersionId: versionId,
          locale,
        },
      },
      data: {
        status,
        reviewedByUserId: reviewedByUserId ?? undefined,
      },
    });

    return {
      id: translation.id,
      learningObjectVersionId: translation.learningObjectVersionId,
      locale: translation.locale,
      status: translation.status,
      contentJson: translation.contentJson as Record<string, unknown>,
      accessibilityJson: translation.accessibilityJson as AccessibilityMetadata,
      metadataJson: translation.metadataJson as LocaleMetadata,
      translatedByUserId: translation.translatedByUserId,
      reviewedByUserId: translation.reviewedByUserId,
      createdAt: translation.createdAt,
      updatedAt: translation.updatedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Delete a translation.
 */
export async function deleteTranslation(versionId: string, locale: string): Promise<boolean> {
  try {
    await prisma.learningObjectTranslation.delete({
      where: {
        learningObjectVersionId_locale: {
          learningObjectVersionId: versionId,
          locale,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Mark all translations as NEEDS_UPDATE when source content changes.
 * This is called when the version's contentJson is updated.
 */
export async function markTranslationsNeedUpdate(versionId: string): Promise<number> {
  const result = await prisma.learningObjectTranslation.updateMany({
    where: {
      learningObjectVersionId: versionId,
      status: 'READY',
    },
    data: {
      status: 'NEEDS_UPDATE',
    },
  });

  return result.count;
}

// ══════════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Copy translations from one version to another (e.g., when creating new version).
 */
export async function copyTranslations(
  sourceVersionId: string,
  targetVersionId: string
): Promise<number> {
  const sourceTranslations = await prisma.learningObjectTranslation.findMany({
    where: { learningObjectVersionId: sourceVersionId },
  });

  if (sourceTranslations.length === 0) return 0;

  const created = await prisma.learningObjectTranslation.createMany({
    data: sourceTranslations.map((t) => ({
      learningObjectVersionId: targetVersionId,
      locale: t.locale,
      status: 'NEEDS_UPDATE' as TranslationStatus, // Mark as needing review
      contentJson: t.contentJson,
      accessibilityJson: t.accessibilityJson,
      metadataJson: t.metadataJson,
      translatedByUserId: t.translatedByUserId,
    })),
  });

  return created.count;
}

/**
 * Get translation coverage statistics for a version.
 */
export async function getTranslationCoverage(
  versionId: string
): Promise<{ total: number; ready: number; draft: number; needsUpdate: number }> {
  const translations = await prisma.learningObjectTranslation.groupBy({
    by: ['status'],
    where: { learningObjectVersionId: versionId },
    _count: true,
  });

  const stats = {
    total: 0,
    ready: 0,
    draft: 0,
    needsUpdate: 0,
  };

  for (const t of translations) {
    stats.total += t._count;
    if (t.status === 'READY') stats.ready = t._count;
    if (t.status === 'DRAFT') stats.draft = t._count;
    if (t.status === 'NEEDS_UPDATE') stats.needsUpdate = t._count;
  }

  return stats;
}
