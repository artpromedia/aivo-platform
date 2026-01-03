/**
 * QA Engine
 *
 * Automated quality assurance checks for Learning Object versions.
 * Runs checks for accessibility, metadata completeness, policy language, etc.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */

// Local type definitions (Prisma client not generated)
type QaCheckStatus = 'PASSED' | 'WARNING' | 'FAILED' | 'SKIPPED';
type QaCheckType =
  | 'ACCESSIBILITY'
  | 'METADATA'
  | 'CONTENT'
  | 'POLICY'
  | 'TECHNICAL'
  | 'METADATA_COMPLETENESS'
  | 'POLICY_LANGUAGE'
  | 'CONTENT_STRUCTURE'
  | 'SKILL_ALIGNMENT';
type InputJsonValue = string | number | boolean | null | { [key: string]: InputJsonValue } | InputJsonValue[];

// Prisma namespace stub
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Prisma {
  export type InputJsonValue = string | number | boolean | null | { [key: string]: unknown } | unknown[];
}

import { prisma } from './prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface QaCheckResult {
  checkType: QaCheckType;
  status: QaCheckStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface QaCheckSummary {
  versionId: string;
  checks: QaCheckResult[];
  passed: number;
  warnings: number;
  failed: number;
  overallStatus: QaCheckStatus;
}

interface ContentJson {
  type?: string;
  passage?: string;
  problem?: string;
  instructions?: string;
  questions?: {
    text?: string;
    choices?: { text?: string }[];
  }[];
  media?: {
    type?: string;
    url?: string;
    altText?: string;
  }[];
  images?: {
    url?: string;
    altText?: string;
  }[];
}

interface AccessibilityJson {
  altTexts?: Record<string, string>;
  transcripts?: Record<string, string>;
  readingLevel?: string;
  flesch_kincaid_grade?: number;
  complexity?: string;

  // Extended accessibility profile flags
  supportsDyslexiaFriendlyFont?: boolean;
  supportsReducedStimuli?: boolean;
  hasScreenReaderOptimizedStructure?: boolean;
  hasHighContrastMode?: boolean;
  supportsTextToSpeech?: boolean;
  estimatedCognitiveLoad?: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface MetadataJson {
  estimatedDuration?: number;
  difficulty?: string;
  prerequisites?: string[];
  tags?: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// BANNED PHRASES FOR POLICY CHECKS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Banned phrases that may indicate policy violations.
 * These are patterns that should not appear in educational content.
 */
const BANNED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  // Diagnostic language
  {
    pattern:
      /\b(you\s+have|you're\s+diagnosed\s+with|your)\s+(ADHD|ADD|autism|dyslexia|OCD|anxiety\s+disorder|depression)\b/i,
    reason: 'Diagnostic language - content should not make diagnoses',
  },
  {
    pattern: /\b(suffers?\s+from|afflicted\s+with|victim\s+of)\s+\w+/i,
    reason: 'Stigmatizing language about conditions',
  },
  // Inappropriate content
  {
    pattern: /\b(stupid|dumb|idiot|retard|moron)\b/i,
    reason: 'Derogatory language',
  },
  // Content safety
  {
    pattern: /\b(kill\s+yourself|suicide\s+method|how\s+to\s+die)\b/i,
    reason: 'Harmful content',
  },
  // Advertising
  {
    pattern: /\b(buy\s+now|click\s+here\s+to\s+purchase|limited\s+time\s+offer)\b/i,
    reason: 'Advertising language',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// INDIVIDUAL CHECK FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check accessibility requirements.
 * - Images/media should have alt text
 * - Reading level should be appropriate for grade band
 */
function checkAccessibility(
  contentJson: ContentJson,
  accessibilityJson: AccessibilityJson,
  gradeBand: string
): QaCheckResult {
  const issues: string[] = [];
  const details: Record<string, unknown> = {};

  // Check for media/images without alt text
  const media = contentJson.media ?? [];
  const images = contentJson.images ?? [];
  const allMedia = [...media, ...images];

  if (allMedia.length > 0) {
    const missingAlt = allMedia.filter((m) => {
      const url = m.url ?? '';
      const hasInlineAlt = m.altText && m.altText.trim().length > 0;
      const hasExternalAlt =
        accessibilityJson.altTexts && accessibilityJson.altTexts[url]?.trim().length > 0;
      return !hasInlineAlt && !hasExternalAlt;
    });

    if (missingAlt.length > 0) {
      issues.push(`${missingAlt.length} media item(s) missing alt text`);
      details.missingAltTextCount = missingAlt.length;
    }
  }

  // Check reading level for grade band
  const fleschGrade = accessibilityJson.flesch_kincaid_grade;
  if (fleschGrade !== undefined) {
    const expectedRange = getGradeLevelRange(gradeBand);
    if (fleschGrade > expectedRange.max + 2) {
      issues.push(
        `Reading level (${fleschGrade}) may be too high for ${gradeBand} (expected ${expectedRange.min}-${expectedRange.max})`
      );
      details.readingLevel = fleschGrade;
      details.expectedRange = expectedRange;
    }
  }

  if (issues.length === 0) {
    return {
      checkType: 'ACCESSIBILITY',
      status: 'PASSED',
      message: 'All accessibility checks passed',
      details,
    };
  }

  // Media missing alt text is a failure; reading level is a warning
  const hasFailure = details.missingAltTextCount !== undefined;
  return {
    checkType: 'ACCESSIBILITY',
    status: hasFailure ? 'FAILED' : 'WARNING',
    message: issues.join('; '),
    details,
  };
}

/**
 * Check metadata completeness.
 * - Subject, grade band, at least one skill required
 * - Estimated duration recommended
 */
function checkMetadataCompleteness(
  subject: string | null,
  gradeBand: string | null,
  skillCount: number,
  metadataJson: MetadataJson
): QaCheckResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const details: Record<string, unknown> = {};

  // Required fields
  if (!subject) {
    missing.push('subject');
  }
  if (!gradeBand) {
    missing.push('gradeBand');
  }
  if (skillCount === 0) {
    missing.push('at least one skill alignment');
  }

  // Recommended fields
  if (!metadataJson.estimatedDuration) {
    warnings.push('estimatedDuration');
  }

  details.missingRequired = missing;
  details.missingRecommended = warnings;

  if (missing.length > 0) {
    return {
      checkType: 'METADATA_COMPLETENESS',
      status: 'FAILED',
      message: `Missing required metadata: ${missing.join(', ')}`,
      details,
    };
  }

  if (warnings.length > 0) {
    return {
      checkType: 'METADATA_COMPLETENESS',
      status: 'WARNING',
      message: `Missing recommended metadata: ${warnings.join(', ')}`,
      details,
    };
  }

  return {
    checkType: 'METADATA_COMPLETENESS',
    status: 'PASSED',
    message: 'All metadata requirements met',
    details,
  };
}

/**
 * Check for policy-violating language.
 * Scans all text content for banned patterns.
 */
function checkPolicyLanguage(contentJson: ContentJson): QaCheckResult {
  const violations: { pattern: string; reason: string; context: string }[] = [];

  // Collect all text content
  const textParts: string[] = [];
  if (contentJson.passage) textParts.push(contentJson.passage);
  if (contentJson.problem) textParts.push(contentJson.problem);
  if (contentJson.instructions) textParts.push(contentJson.instructions);

  contentJson.questions?.forEach((q) => {
    if (q.text) textParts.push(q.text);
    q.choices?.forEach((c) => {
      if (c.text) textParts.push(c.text);
    });
  });

  const allText = textParts.join(' ');

  // Check each pattern
  for (const { pattern, reason } of BANNED_PATTERNS) {
    const match = pattern.exec(allText);
    if (match) {
      // Get context around the match
      const start = Math.max(0, match.index - 20);
      const end = Math.min(allText.length, match.index + match[0].length + 20);
      const context = allText.slice(start, end);

      violations.push({
        pattern: match[0],
        reason,
        context: `...${context}...`,
      });
    }
  }

  if (violations.length === 0) {
    return {
      checkType: 'POLICY_LANGUAGE',
      status: 'PASSED',
      message: 'No policy violations found',
    };
  }

  return {
    checkType: 'POLICY_LANGUAGE',
    status: 'FAILED',
    message: `Found ${violations.length} policy violation(s): ${violations.map((v) => v.reason).join('; ')}`,
    details: { violations },
  };
}

/**
 * Check content structure.
 * - Questions should have at least 2 choices
 * - Content should not be empty
 */
function checkContentStructure(contentJson: ContentJson): QaCheckResult {
  const issues: string[] = [];
  const details: Record<string, unknown> = {};

  // Check for empty content
  const hasContent =
    contentJson.passage?.trim() ||
    contentJson.problem?.trim() ||
    contentJson.instructions?.trim() ||
    (contentJson.questions && contentJson.questions.length > 0);

  if (!hasContent) {
    issues.push('Content appears to be empty');
    details.isEmpty = true;
  }

  // Check questions structure
  const questions = contentJson.questions ?? [];
  questions.forEach((q, idx) => {
    if (!q.text?.trim()) {
      issues.push(`Question ${idx + 1} has no text`);
    }
    const choiceCount = q.choices?.length ?? 0;
    if (choiceCount > 0 && choiceCount < 2) {
      issues.push(`Question ${idx + 1} has only ${choiceCount} choice(s), need at least 2`);
    }
  });

  details.questionCount = questions.length;

  if (issues.length === 0) {
    return {
      checkType: 'CONTENT_STRUCTURE',
      status: 'PASSED',
      message: 'Content structure is valid',
      details,
    };
  }

  const hasFailure = details.isEmpty === true;
  return {
    checkType: 'CONTENT_STRUCTURE',
    status: hasFailure ? 'FAILED' : 'WARNING',
    message: issues.join('; '),
    details,
  };
}

/**
 * Check skill alignment quality.
 * - At least one primary skill
 * - Skills should exist (would need skill service validation)
 */
function checkSkillAlignment(skills: { skillId: string; isPrimary: boolean }[]): QaCheckResult {
  const details: Record<string, unknown> = {
    totalSkills: skills.length,
  };

  if (skills.length === 0) {
    return {
      checkType: 'SKILL_ALIGNMENT',
      status: 'WARNING',
      message: 'No skills aligned to this content',
      details,
    };
  }

  const primarySkills = skills.filter((s) => s.isPrimary);
  details.primarySkillCount = primarySkills.length;

  if (primarySkills.length === 0) {
    return {
      checkType: 'SKILL_ALIGNMENT',
      status: 'WARNING',
      message: `${skills.length} skill(s) aligned but none marked as primary`,
      details,
    };
  }

  return {
    checkType: 'SKILL_ALIGNMENT',
    status: 'PASSED',
    message: `${skills.length} skill(s) aligned with ${primarySkills.length} primary`,
    details,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getGradeLevelRange(gradeBand: string): { min: number; max: number } {
  switch (gradeBand) {
    case 'K_2':
      return { min: 0, max: 2 };
    case 'G3_5':
      return { min: 3, max: 5 };
    case 'G6_8':
      return { min: 6, max: 8 };
    case 'G9_12':
      return { min: 9, max: 12 };
    default:
      return { min: 0, max: 12 };
  }
}

/**
 * Check accessibility profile completeness.
 * K-5 content should have basic accessibility flags filled.
 */
function checkAccessibilityProfile(
  accessibilityJson: AccessibilityJson,
  gradeBand: string
): QaCheckResult {
  const details: Record<string, unknown> = {};
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check which flags are set
  const flags = {
    supportsDyslexiaFriendlyFont: accessibilityJson.supportsDyslexiaFriendlyFont ?? false,
    supportsReducedStimuli: accessibilityJson.supportsReducedStimuli ?? false,
    hasScreenReaderOptimizedStructure: accessibilityJson.hasScreenReaderOptimizedStructure ?? false,
    hasHighContrastMode: accessibilityJson.hasHighContrastMode ?? false,
    supportsTextToSpeech: accessibilityJson.supportsTextToSpeech ?? false,
    estimatedCognitiveLoad: accessibilityJson.estimatedCognitiveLoad ?? null,
  };

  details.flags = flags;
  const flagsSet = Object.values(flags).filter((v) => v !== false && v !== null).length;
  details.flagsSetCount = flagsSet;

  // K-5 content should have basic accessibility flags (K_2, G3_5)
  const isYoungerGradeBand = gradeBand === 'K_2' || gradeBand === 'G3_5';

  if (isYoungerGradeBand) {
    // For younger grades, we require at least cognitive load and dyslexia-friendly flag
    if (!flags.estimatedCognitiveLoad) {
      issues.push('estimatedCognitiveLoad should be set for K-5 content');
    }
    if (!flags.supportsDyslexiaFriendlyFont) {
      warnings.push('K-5 content should indicate dyslexia-friendly font support');
    }
    if (!flags.supportsReducedStimuli) {
      warnings.push('K-5 content should indicate reduced stimuli support');
    }
  }

  // All content should have screen reader structure info
  if (!flags.hasScreenReaderOptimizedStructure) {
    warnings.push('Screen reader optimized structure flag not set');
  }

  if (issues.length > 0) {
    return {
      checkType: 'ACCESSIBILITY' as QaCheckType,
      status: 'FAILED',
      message: `Accessibility profile incomplete: ${issues.join('; ')}`,
      details,
    };
  }

  if (warnings.length > 0) {
    return {
      checkType: 'ACCESSIBILITY' as QaCheckType,
      status: 'WARNING',
      message: `Accessibility profile warnings: ${warnings.join('; ')}`,
      details,
    };
  }

  return {
    checkType: 'ACCESSIBILITY' as QaCheckType,
    status: 'PASSED',
    message: `Accessibility profile complete (${flagsSet} flags set)`,
    details,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN QA ENGINE FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Run all QA checks for a Learning Object version.
 *
 * @param loVersionId - The UUID of the learning object version to check
 * @returns Summary of all check results
 */
export async function runVersionQaChecks(loVersionId: string): Promise<QaCheckSummary> {
  // Load the version with related data
  const version = await prisma.learningObjectVersion.findUnique({
    where: { id: loVersionId },
    include: {
      learningObject: {
        select: {
          subject: true,
          gradeBand: true,
        },
      },
      skills: {
        select: {
          skillId: true,
          isPrimary: true,
        },
      },
    },
  });

  if (!version) {
    throw new Error(`Version not found: ${loVersionId}`);
  }

  const contentJson = (version.contentJson ?? {}) as ContentJson;
  const accessibilityJson = (version.accessibilityJson ?? {}) as AccessibilityJson;
  const metadataJson = (version.metadataJson ?? {}) as MetadataJson;

  // Run all checks
  const checks: QaCheckResult[] = [
    checkAccessibility(contentJson, accessibilityJson, version.learningObject.gradeBand),
    checkAccessibilityProfile(accessibilityJson, version.learningObject.gradeBand),
    checkMetadataCompleteness(
      version.learningObject.subject,
      version.learningObject.gradeBand,
      version.skills.length,
      metadataJson
    ),
    checkPolicyLanguage(contentJson),
    checkContentStructure(contentJson),
    checkSkillAlignment(version.skills),
  ];

  // Clear previous checks and insert new ones
  await prisma.$transaction(async (tx) => {
    await tx.learningObjectVersionCheck.deleteMany({
      where: { learningObjectVersionId: loVersionId },
    });

    await tx.learningObjectVersionCheck.createMany({
      data: checks.map((check) => ({
        learningObjectVersionId: loVersionId,
        checkType: check.checkType,
        status: check.status,
        message: check.message,
        details: (check.details ?? {}) as Prisma.InputJsonValue,
      })),
    });
  });

  // Calculate summary
  const passed = checks.filter((c) => c.status === 'PASSED').length;
  const warnings = checks.filter((c) => c.status === 'WARNING').length;
  const failed = checks.filter((c) => c.status === 'FAILED').length;

  let overallStatus: QaCheckStatus = 'PASSED';
  if (failed > 0) overallStatus = 'FAILED';
  else if (warnings > 0) overallStatus = 'WARNING';

  return {
    versionId: loVersionId,
    checks,
    passed,
    warnings,
    failed,
    overallStatus,
  };
}

/**
 * Get the latest QA check results for a version.
 */
export async function getVersionQaChecks(loVersionId: string): Promise<QaCheckResult[]> {
  const checks = await prisma.learningObjectVersionCheck.findMany({
    where: { learningObjectVersionId: loVersionId },
    orderBy: { createdAt: 'desc' },
  });

  return checks.map((c) => ({
    checkType: c.checkType,
    status: c.status,
    message: c.message,
    details: c.details as Record<string, unknown> | undefined,
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTED CHECK FUNCTIONS (for unit testing)
// ══════════════════════════════════════════════════════════════════════════════

export const qaChecks = {
  checkAccessibility,
  checkAccessibilityProfile,
  checkMetadataCompleteness,
  checkPolicyLanguage,
  checkContentStructure,
  checkSkillAlignment,
};
