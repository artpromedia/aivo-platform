/**
 * Content Resolver
 *
 * Resolves localized, accessible content for consumers (Lesson Planner, Tutor).
 * Handles locale fallback and accessibility profile matching.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

import { prisma } from './prisma.js';
import {
  type AccessibilityMetadata,
  type LocaleMetadata,
  DEFAULT_LOCALE,
  getBaseLocale,
} from './translations.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Accessibility profile for content consumers.
 * Used to select the best matching content variant.
 */
export interface AccessibilityProfile {
  dyslexiaFriendly?: boolean;
  reducedStimuli?: boolean;
  screenReader?: boolean;
  highContrast?: boolean;
  textToSpeech?: boolean;
  maxCognitiveLoad?: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Query parameters for resolving content.
 */
export interface ContentResolveQuery {
  skillId?: string;
  subject?: string;
  gradeBand?: string;
  locale: string;
  accessibilityProfile?: AccessibilityProfile;
  tenantId?: string | null;
  publishedOnly?: boolean;
}

/**
 * Resolved content result.
 */
export interface ResolvedContent {
  learningObjectId: string;
  versionId: string;
  versionNumber: number;
  slug: string;
  title: string;
  subject: string;
  gradeBand: string;

  // Content
  content: Record<string, unknown>;
  accessibility: AccessibilityMetadata;
  metadata: LocaleMetadata & Record<string, unknown>;

  // Resolution info
  locale: string;
  fallbackLocaleUsed: boolean;
  requestedLocale: string;

  // Accessibility matching
  accessibilityScore: number;
  accessibilityFlags: {
    supportsDyslexiaFriendlyFont: boolean;
    supportsReducedStimuli: boolean;
    hasScreenReaderOptimizedStructure: boolean;
    hasHighContrastMode: boolean;
    supportsTextToSpeech: boolean;
    estimatedCognitiveLoad: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  };

  // Skills
  skills: { skillId: string; isPrimary: boolean }[];
}

/**
 * Multi-result response with pagination.
 */
export interface ResolvedContentList {
  items: ResolvedContent[];
  total: number;
  page: number;
  pageSize: number;
  fallbacksUsed: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY SCORING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate accessibility match score between profile and content flags.
 * Higher score = better match.
 */
function calculateAccessibilityScore(
  profile: AccessibilityProfile | undefined,
  flags: AccessibilityMetadata
): number {
  if (!profile) return 0;

  let score = 0;
  let requested = 0;

  if (profile.dyslexiaFriendly) {
    requested++;
    if (flags.supportsDyslexiaFriendlyFont) score++;
  }

  if (profile.reducedStimuli) {
    requested++;
    if (flags.supportsReducedStimuli) score++;
  }

  if (profile.screenReader) {
    requested++;
    if (flags.hasScreenReaderOptimizedStructure) score++;
  }

  if (profile.highContrast) {
    requested++;
    if (flags.hasHighContrastMode) score++;
  }

  if (profile.textToSpeech) {
    requested++;
    if (flags.supportsTextToSpeech) score++;
  }

  if (profile.maxCognitiveLoad) {
    requested++;
    const load = flags.estimatedCognitiveLoad;
    if (load) {
      const loadMap = { LOW: 1, MEDIUM: 2, HIGH: 3 };
      const maxLoad = loadMap[profile.maxCognitiveLoad];
      const contentLoad = loadMap[load];
      if (contentLoad <= maxLoad) score++;
    }
  }

  return requested > 0 ? score / requested : 1;
}

/**
 * Extract accessibility flags from JSON.
 */
function extractAccessibilityFlags(
  json: AccessibilityMetadata
): ResolvedContent['accessibilityFlags'] {
  return {
    supportsDyslexiaFriendlyFont: json.supportsDyslexiaFriendlyFont ?? false,
    supportsReducedStimuli: json.supportsReducedStimuli ?? false,
    hasScreenReaderOptimizedStructure: json.hasScreenReaderOptimizedStructure ?? false,
    hasHighContrastMode: json.hasHighContrastMode ?? false,
    supportsTextToSpeech: json.supportsTextToSpeech ?? false,
    estimatedCognitiveLoad: json.estimatedCognitiveLoad ?? null,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// LOCALE RESOLUTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build locale fallback chain.
 * e.g., "es-MX" -> ["es-MX", "es", "en"]
 */
function buildLocaleFallbackChain(locale: string): string[] {
  const chain = [locale];
  const base = getBaseLocale(locale);

  if (base !== locale) {
    chain.push(base);
  }

  if (base !== DEFAULT_LOCALE && locale !== DEFAULT_LOCALE) {
    chain.push(DEFAULT_LOCALE);
  }

  return chain;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN RESOLVER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve a single Learning Object with locale and accessibility handling.
 */
export async function resolveContent(
  learningObjectId: string,
  query: Omit<ContentResolveQuery, 'skillId' | 'subject' | 'gradeBand'>
): Promise<ResolvedContent | null> {
  const { locale, accessibilityProfile, tenantId, publishedOnly = true } = query;

  // Find the version
  const versionWhere: Record<string, unknown> = {
    learningObjectId,
    ...(publishedOnly ? { state: 'PUBLISHED' } : {}),
  };

  const version = await prisma.learningObjectVersion.findFirst({
    where: versionWhere,
    orderBy: { versionNumber: 'desc' },
    include: {
      learningObject: true,
      skills: true,
      translations: true,
    },
  });

  if (!version) return null;

  // Check tenant access
  if (tenantId !== undefined && version.learningObject.tenantId !== tenantId) {
    // For null tenantId (global), allow access; for specific tenantId, must match
    if (tenantId !== null && version.learningObject.tenantId !== null) {
      return null;
    }
  }

  // Resolve locale with fallback
  const localeChain = buildLocaleFallbackChain(locale);
  let resolvedContent: Record<string, unknown> = version.contentJson as Record<string, unknown>;
  let resolvedAccessibility: AccessibilityMetadata =
    version.accessibilityJson as AccessibilityMetadata;
  let resolvedMetadata: LocaleMetadata & Record<string, unknown> =
    version.metadataJson as LocaleMetadata & Record<string, unknown>;
  let resolvedLocale = DEFAULT_LOCALE;
  let fallbackUsed = locale !== DEFAULT_LOCALE;

  // Try to find translation in locale chain
  for (const tryLocale of localeChain) {
    const translation = version.translations.find(
      (t) => t.locale === tryLocale && t.status === 'READY'
    );

    if (translation) {
      resolvedContent = translation.contentJson as Record<string, unknown>;
      resolvedAccessibility = {
        ...(version.accessibilityJson as AccessibilityMetadata),
        ...(translation.accessibilityJson as AccessibilityMetadata),
      };
      resolvedMetadata = {
        ...(version.metadataJson as Record<string, unknown>),
        ...(translation.metadataJson as LocaleMetadata),
      };
      resolvedLocale = tryLocale as typeof DEFAULT_LOCALE;
      fallbackUsed = tryLocale !== locale;
      break;
    }
  }

  const accessibilityFlags = extractAccessibilityFlags(resolvedAccessibility);
  const accessibilityScore = calculateAccessibilityScore(
    accessibilityProfile,
    resolvedAccessibility
  );

  return {
    learningObjectId: version.learningObjectId,
    versionId: version.id,
    versionNumber: version.versionNumber,
    slug: version.learningObject.slug,
    title: version.learningObject.title,
    subject: version.learningObject.subject,
    gradeBand: version.learningObject.gradeBand,

    content: resolvedContent,
    accessibility: resolvedAccessibility,
    metadata: resolvedMetadata,

    locale: resolvedLocale,
    fallbackLocaleUsed: fallbackUsed,
    requestedLocale: locale,

    accessibilityScore,
    accessibilityFlags,

    skills: version.skills.map((s) => ({
      skillId: s.skillId,
      isPrimary: s.isPrimary,
    })),
  };
}

/**
 * Resolve multiple Learning Objects by query with locale and accessibility handling.
 */
export async function resolveContentList(
  query: ContentResolveQuery,
  page = 1,
  pageSize = 20
): Promise<ResolvedContentList> {
  const {
    skillId,
    subject,
    gradeBand,
    locale,
    accessibilityProfile,
    tenantId,
    publishedOnly = true,
  } = query;

  // Build the base query
  const loWhere: Record<string, unknown> = {};
  if (subject) loWhere.subject = subject;
  if (gradeBand) loWhere.gradeBand = gradeBand;

  // For tenant scoping: include global content (null) + tenant-specific
  if (tenantId !== undefined) {
    loWhere.OR = [{ tenantId: null }, { tenantId }];
  }

  // If skillId is provided, filter by skill alignment
  let skillFilter: { some: { skillId: string } } | undefined;
  if (skillId) {
    skillFilter = { some: { skillId } };
  }

  // Get matching versions
  const versions = await prisma.learningObjectVersion.findMany({
    where: {
      learningObject: loWhere,
      ...(publishedOnly ? { state: 'PUBLISHED' } : {}),
      ...(skillFilter ? { skills: skillFilter } : {}),
    },
    orderBy: [{ learningObject: { title: 'asc' } }, { versionNumber: 'desc' }],
    distinct: ['learningObjectId'], // Get latest version per LO
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      learningObject: true,
      skills: true,
      translations: true,
    },
  });

  // Count total
  const total = await prisma.learningObjectVersion.count({
    where: {
      learningObject: loWhere,
      ...(publishedOnly ? { state: 'PUBLISHED' } : {}),
      ...(skillFilter ? { skills: skillFilter } : {}),
    },
  });

  // Resolve each with locale fallback
  const localeChain = buildLocaleFallbackChain(locale);
  let fallbacksUsed = 0;

  const items: ResolvedContent[] = versions.map((version) => {
    let resolvedContent: Record<string, unknown> = version.contentJson as Record<string, unknown>;
    let resolvedAccessibility: AccessibilityMetadata =
      version.accessibilityJson as AccessibilityMetadata;
    let resolvedMetadata: LocaleMetadata & Record<string, unknown> =
      version.metadataJson as LocaleMetadata & Record<string, unknown>;
    let resolvedLocale = DEFAULT_LOCALE;
    let fallbackUsed = locale !== DEFAULT_LOCALE;

    for (const tryLocale of localeChain) {
      const translation = version.translations.find(
        (t) => t.locale === tryLocale && t.status === 'READY'
      );

      if (translation) {
        resolvedContent = translation.contentJson as Record<string, unknown>;
        resolvedAccessibility = {
          ...(version.accessibilityJson as AccessibilityMetadata),
          ...(translation.accessibilityJson as AccessibilityMetadata),
        };
        resolvedMetadata = {
          ...(version.metadataJson as Record<string, unknown>),
          ...(translation.metadataJson as LocaleMetadata),
        };
        resolvedLocale = tryLocale as typeof DEFAULT_LOCALE;
        fallbackUsed = tryLocale !== locale;
        break;
      }
    }

    if (fallbackUsed) fallbacksUsed++;

    const accessibilityFlags = extractAccessibilityFlags(resolvedAccessibility);
    const accessibilityScore = calculateAccessibilityScore(
      accessibilityProfile,
      resolvedAccessibility
    );

    return {
      learningObjectId: version.learningObjectId,
      versionId: version.id,
      versionNumber: version.versionNumber,
      slug: version.learningObject.slug,
      title: version.learningObject.title,
      subject: version.learningObject.subject,
      gradeBand: version.learningObject.gradeBand,

      content: resolvedContent,
      accessibility: resolvedAccessibility,
      metadata: resolvedMetadata,

      locale: resolvedLocale,
      fallbackLocaleUsed: fallbackUsed,
      requestedLocale: locale,

      accessibilityScore,
      accessibilityFlags,

      skills: version.skills.map((s) => ({
        skillId: s.skillId,
        isPrimary: s.isPrimary,
      })),
    };
  });

  // Sort by accessibility score if profile provided
  if (accessibilityProfile) {
    items.sort((a, b) => b.accessibilityScore - a.accessibilityScore);
  }

  return {
    items,
    total,
    page,
    pageSize,
    fallbacksUsed,
  };
}

/**
 * Find the best matching LO for a skill + accessibility profile.
 * Used by Tutor to get ideal content for a learner.
 */
export async function findBestMatch(
  skillId: string,
  locale: string,
  accessibilityProfile?: AccessibilityProfile,
  tenantId?: string | null
): Promise<ResolvedContent | null> {
  const result = await resolveContentList(
    {
      skillId,
      locale,
      accessibilityProfile,
      tenantId,
      publishedOnly: true,
    },
    1,
    1
  );

  return result.items[0] ?? null;
}
