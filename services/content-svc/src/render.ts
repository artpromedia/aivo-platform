/**
 * Content Render Service
 *
 * Retrieves full Learning Object content for learner sessions.
 * Handles locale resolution and accessibility profile application.
 */

import { prisma } from './prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface AccessibilityProfile {
  dyslexiaFriendly?: boolean;
  reducedStimuli?: boolean;
  screenReader?: boolean;
  highContrast?: boolean;
  textToSpeech?: boolean;
  maxCognitiveLoad?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RenderOptions {
  locale?: string;
  accessibilityProfile?: AccessibilityProfile;
  includeHints?: boolean;
  includeTutorContext?: boolean;
}

export interface RenderedContent {
  // Identity
  versionId: string;
  learningObjectId: string;
  versionNumber: number;
  title: string;
  slug: string;
  subject: string;
  gradeBand: string;

  // Content
  content: Record<string, unknown>;
  accessibility: Record<string, unknown>;
  metadata: Record<string, unknown>;

  // Locale info
  locale: string;
  fallbackLocaleUsed: boolean;
  requestedLocale: string;

  // Accessibility info
  accessibilityFlags: {
    supportsDyslexiaFriendlyFont: boolean;
    supportsReducedStimuli: boolean;
    hasScreenReaderOptimizedStructure: boolean;
    hasHighContrastMode: boolean;
    supportsTextToSpeech: boolean;
    estimatedCognitiveLoad: string | null;
  };

  // Skills
  skills: { skillId: string; isPrimary: boolean }[];
  primarySkillId: string | null;

  // Tutor hints (if requested)
  tutorContext?: {
    hints: string[];
    commonMistakes: string[];
    scaffoldingSteps: string[];
    encouragementPhrases: string[];
  };

  // Timing
  estimatedDuration: number | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOCALE RESOLUTION
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_LOCALE = 'en';

/** Translation row from raw query */
interface TranslationRow {
  locale: string;
  content_json: Record<string, unknown>;
  accessibility_json: Record<string, unknown>;
  metadata_json: Record<string, unknown>;
  status: string;
}

function buildLocaleFallbackChain(locale: string): string[] {
  const chain = [locale];
  const base = locale.split('-')[0];

  if (base && base !== locale) {
    chain.push(base);
  }

  if (base !== DEFAULT_LOCALE && locale !== DEFAULT_LOCALE) {
    chain.push(DEFAULT_LOCALE);
  }

  return chain;
}

// ══════════════════════════════════════════════════════════════════════════════
// RENDER IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Render a Learning Object version for a learner session.
 * Resolves locale with fallback and applies accessibility settings.
 */
export async function renderContent(
  versionId: string,
  options: RenderOptions = {}
): Promise<RenderedContent | null> {
  const {
    locale = DEFAULT_LOCALE,
    accessibilityProfile,
    includeHints = false,
    includeTutorContext = false,
  } = options;

  // Load the version with all related data
  const version = await prisma.learningObjectVersion.findUnique({
    where: { id: versionId },
    include: {
      learningObject: {
        include: {
          tags: { select: { tag: true } },
        },
      },
      skills: {
        select: { skillId: true, isPrimary: true },
      },
    },
  });

  if (!version || version.state !== 'PUBLISHED') {
    return null;
  }

  // Resolve locale with fallback
  const localeChain = buildLocaleFallbackChain(locale);
  let resolvedContent: Record<string, unknown> =
    (version.contentJson as Record<string, unknown> | null) ?? {};
  let resolvedAccessibility: Record<string, unknown> =
    (version.accessibilityJson as Record<string, unknown> | null) ?? {};
  let resolvedMetadata: Record<string, unknown> =
    (version.metadataJson as Record<string, unknown> | null) ?? {};
  let resolvedLocale = DEFAULT_LOCALE;
  let fallbackUsed = locale !== DEFAULT_LOCALE;

  // Try to find translation (if we have the translation table)
  // This integrates with the i18n system from content-authoring-svc
  try {
    for (const tryLocale of localeChain) {
      const translation = await prisma.$queryRaw<TranslationRow[]>`
        SELECT locale, content_json, accessibility_json, metadata_json, status
        FROM learning_object_translations
        WHERE learning_object_version_id = ${versionId}::uuid
          AND locale = ${tryLocale}
          AND status = 'READY'
        LIMIT 1
      `;

      if (translation.length > 0) {
        const t = translation[0]!;
        resolvedContent = t.content_json;
        resolvedAccessibility = {
          ...resolvedAccessibility,
          ...t.accessibility_json,
        };
        resolvedMetadata = {
          ...resolvedMetadata,
          ...t.metadata_json,
        };
        resolvedLocale = t.locale;
        fallbackUsed = t.locale !== locale;
        break;
      }
    }
  } catch {
    // Translation table might not exist in this service's DB
    // Fall back to main content
  }

  // Extract accessibility flags
  const accessibilityFlags = {
    supportsDyslexiaFriendlyFont: Boolean(resolvedAccessibility.supportsDyslexiaFriendlyFont),
    supportsReducedStimuli: Boolean(resolvedAccessibility.supportsReducedStimuli),
    hasScreenReaderOptimizedStructure: Boolean(
      resolvedAccessibility.hasScreenReaderOptimizedStructure
    ),
    hasHighContrastMode: Boolean(resolvedAccessibility.hasHighContrastMode),
    supportsTextToSpeech: Boolean(resolvedAccessibility.supportsTextToSpeech),
    estimatedCognitiveLoad:
      (resolvedAccessibility.estimatedCognitiveLoad as string | undefined) ?? null,
  };

  // Apply accessibility transformations if profile provided
  if (accessibilityProfile) {
    resolvedContent = applyAccessibilityTransformations(resolvedContent, accessibilityProfile);
  }

  // Build tutor context if requested
  let tutorContext: RenderedContent['tutorContext'];
  if (includeTutorContext || includeHints) {
    tutorContext = extractTutorContext(resolvedContent, resolvedAccessibility);
  }

  return {
    versionId: version.id,
    learningObjectId: version.learningObjectId,
    versionNumber: version.versionNumber,
    title: version.learningObject.title,
    slug: version.learningObject.slug,
    subject: version.learningObject.subject,
    gradeBand: version.learningObject.gradeBand,

    content: resolvedContent,
    accessibility: resolvedAccessibility,
    metadata: resolvedMetadata,

    locale: resolvedLocale,
    fallbackLocaleUsed: fallbackUsed,
    requestedLocale: locale,

    accessibilityFlags,

    skills: version.skills.map((s) => ({ skillId: s.skillId, isPrimary: s.isPrimary })),
    primarySkillId: version.learningObject.primarySkillId,

    tutorContext,

    estimatedDuration: (resolvedMetadata.estimatedDuration as number | undefined) ?? null,
  };
}

/**
 * Apply accessibility transformations to content.
 */
function applyAccessibilityTransformations(
  content: Record<string, unknown>,
  profile: AccessibilityProfile
): Record<string, unknown> {
  const transformed = { ...content };
  const existingHints =
    (transformed._accessibilityHints as Record<string, unknown> | undefined) ?? {};

  // Add accessibility hints to content
  if (profile.dyslexiaFriendly) {
    transformed._accessibilityHints = {
      ...existingHints,
      useDyslexiaFont: true,
      increasedLineSpacing: true,
    };
  }

  if (profile.reducedStimuli) {
    transformed._accessibilityHints = {
      ...(transformed._accessibilityHints as Record<string, unknown> | undefined),
      reduceAnimations: true,
      calmColorPalette: true,
      simplifiedLayout: true,
    };
  }

  if (profile.screenReader) {
    transformed._accessibilityHints = {
      ...(transformed._accessibilityHints as Record<string, unknown> | undefined),
      enhanceAriaLabels: true,
      provideAudioDescriptions: true,
    };
  }

  if (profile.highContrast) {
    transformed._accessibilityHints = {
      ...(transformed._accessibilityHints as Record<string, unknown> | undefined),
      highContrastMode: true,
    };
  }

  if (profile.textToSpeech) {
    transformed._accessibilityHints = {
      ...(transformed._accessibilityHints as Record<string, unknown> | undefined),
      enableTTS: true,
    };
  }

  return transformed;
}

/**
 * Extract tutor context from content for AI agent use.
 */
function extractTutorContext(
  content: Record<string, unknown>,
  accessibility: Record<string, unknown>
): RenderedContent['tutorContext'] {
  // Extract hints from various possible locations
  const hints: string[] = [];
  const commonMistakes: string[] = [];
  const scaffoldingSteps: string[] = [];
  const encouragementPhrases: string[] = [];

  // From accessibility JSON
  const teacherNotes = accessibility.teacherNotes;
  if (typeof teacherNotes === 'string') {
    hints.push(teacherNotes);
  }

  const simplifiedInstructions = accessibility.simplifiedInstructions;
  if (typeof simplifiedInstructions === 'string') {
    scaffoldingSteps.push(simplifiedInstructions);
  }

  // From content JSON (if structured with tutor hints)
  const contentHints = content.tutorHints as Record<string, unknown> | undefined;
  if (contentHints) {
    const hintsArray = contentHints.hints;
    if (Array.isArray(hintsArray)) {
      hints.push(...(hintsArray as string[]));
    }
    const mistakesArray = contentHints.commonMistakes;
    if (Array.isArray(mistakesArray)) {
      commonMistakes.push(...(mistakesArray as string[]));
    }
    const scaffoldingArray = contentHints.scaffolding;
    if (Array.isArray(scaffoldingArray)) {
      scaffoldingSteps.push(...(scaffoldingArray as string[]));
    }
    const encouragementArray = contentHints.encouragement;
    if (Array.isArray(encouragementArray)) {
      encouragementPhrases.push(...(encouragementArray as string[]));
    }
  }

  // Default encouragement if none provided
  if (encouragementPhrases.length === 0) {
    encouragementPhrases.push(
      "You're doing great!",
      "Keep going, you've got this!",
      'Nice work on that one!',
      "Let's try another one!"
    );
  }

  return {
    hints,
    commonMistakes,
    scaffoldingSteps,
    encouragementPhrases,
  };
}

/**
 * Render multiple LOs for a session (batch render).
 */
export async function renderBatch(
  versionIds: string[],
  options: RenderOptions = {}
): Promise<Map<string, RenderedContent>> {
  const results = new Map<string, RenderedContent>();

  // Render in parallel
  const renderPromises = versionIds.map(async (id) => {
    const content = await renderContent(id, options);
    if (content) {
      results.set(id, content);
    }
  });

  await Promise.all(renderPromises);

  return results;
}

/**
 * Check if content is suitable for a learner's accessibility needs.
 */
export function isAccessibilitySuitable(
  content: RenderedContent,
  profile: AccessibilityProfile
): { suitable: boolean; missingFeatures: string[] } {
  const missingFeatures: string[] = [];

  if (profile.dyslexiaFriendly && !content.accessibilityFlags.supportsDyslexiaFriendlyFont) {
    missingFeatures.push('dyslexia-friendly font');
  }

  if (profile.reducedStimuli && !content.accessibilityFlags.supportsReducedStimuli) {
    missingFeatures.push('reduced stimuli');
  }

  if (profile.screenReader && !content.accessibilityFlags.hasScreenReaderOptimizedStructure) {
    missingFeatures.push('screen reader optimization');
  }

  if (profile.highContrast && !content.accessibilityFlags.hasHighContrastMode) {
    missingFeatures.push('high contrast mode');
  }

  if (profile.textToSpeech && !content.accessibilityFlags.supportsTextToSpeech) {
    missingFeatures.push('text-to-speech');
  }

  if (profile.maxCognitiveLoad && content.accessibilityFlags.estimatedCognitiveLoad) {
    const loadMap = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    const contentLoad =
      loadMap[content.accessibilityFlags.estimatedCognitiveLoad as keyof typeof loadMap];
    const maxLoad = loadMap[profile.maxCognitiveLoad];
    if (contentLoad > maxLoad) {
      missingFeatures.push(
        `cognitive load (${content.accessibilityFlags.estimatedCognitiveLoad} > ${profile.maxCognitiveLoad})`
      );
    }
  }

  return {
    suitable: missingFeatures.length === 0,
    missingFeatures,
  };
}
