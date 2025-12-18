/**
 * Sensory Metadata Service - ND-2.1
 *
 * CRUD operations for content sensory metadata.
 */

import type { Prisma, ContentSensoryMetadata as PrismaContentSensoryMetadata } from '@prisma/client';
import { prisma } from '../prisma.js';
import type {
  CreateSensoryMetadataInput,
  UpdateSensoryMetadataInput,
  ListSensoryMetadataOptions,
  ContentAnalysisRequest,
  ContentAnalysisResult,
} from './sensory.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CREATE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create sensory metadata for a learning object version.
 */
export async function createSensoryMetadata(
  input: CreateSensoryMetadataInput
): Promise<PrismaContentSensoryMetadata> {
  const {
    learningObjectVersionId,
    visualComplexity,
    animationIntensity,
    cognitiveLoad,
    sensoryWarnings,
    ...rest
  } = input;

  // Calculate suitability flags
  const suitableForPhotosensitive =
    !input.hasFlashing && (input.overallIntensityScore ?? 5) <= 5;
  const suitableForAudioSensitive = !input.hasSuddenSounds && (input.audioLevel ?? 5) <= 5;
  const suitableForMotionSensitive =
    !input.hasAnimation ||
    input.animationIntensity === 'none' ||
    input.animationIntensity === 'mild';

  return prisma.contentSensoryMetadata.create({
    data: {
      learningObjectVersionId,
      visualComplexity: visualComplexity
        ? (visualComplexity.toUpperCase() as 'SIMPLE' | 'MODERATE' | 'COMPLEX')
        : 'MODERATE',
      animationIntensity: animationIntensity
        ? (animationIntensity.toUpperCase() as 'NONE' | 'MILD' | 'MODERATE' | 'INTENSE')
        : 'NONE',
      cognitiveLoad: cognitiveLoad
        ? (cognitiveLoad.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH')
        : 'MEDIUM',
      sensoryWarnings: sensoryWarnings ?? [],
      suitableForPhotosensitive,
      suitableForAudioSensitive,
      suitableForMotionSensitive,
      ...rest,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// READ
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get sensory metadata by ID.
 */
export async function getSensoryMetadataById(
  id: string
): Promise<PrismaContentSensoryMetadata | null> {
  return prisma.contentSensoryMetadata.findUnique({
    where: { id },
  });
}

/**
 * Get sensory metadata by learning object version ID.
 */
export async function getSensoryMetadataByVersionId(
  learningObjectVersionId: string
): Promise<PrismaContentSensoryMetadata | null> {
  return prisma.contentSensoryMetadata.findUnique({
    where: { learningObjectVersionId },
  });
}

/**
 * List sensory metadata with filters.
 */
export async function listSensoryMetadata(
  options: ListSensoryMetadataOptions = {}
): Promise<{ items: PrismaContentSensoryMetadata[]; total: number }> {
  const {
    suitableForPhotosensitive,
    suitableForAudioSensitive,
    suitableForMotionSensitive,
    maxIntensityScore,
    analyzedBySystem,
    manuallyReviewed,
    page = 1,
    pageSize = 50,
  } = options;

  const where: Prisma.ContentSensoryMetadataWhereInput = {};

  if (suitableForPhotosensitive !== undefined) {
    where.suitableForPhotosensitive = suitableForPhotosensitive;
  }
  if (suitableForAudioSensitive !== undefined) {
    where.suitableForAudioSensitive = suitableForAudioSensitive;
  }
  if (suitableForMotionSensitive !== undefined) {
    where.suitableForMotionSensitive = suitableForMotionSensitive;
  }
  if (maxIntensityScore !== undefined) {
    where.overallIntensityScore = { lte: maxIntensityScore };
  }
  if (analyzedBySystem !== undefined) {
    where.analyzedBySystem = analyzedBySystem;
  }
  if (manuallyReviewed !== undefined) {
    where.manuallyReviewed = manuallyReviewed;
  }

  const [items, total] = await Promise.all([
    prisma.contentSensoryMetadata.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.contentSensoryMetadata.count({ where }),
  ]);

  return { items, total };
}

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Update sensory metadata.
 */
export async function updateSensoryMetadata(
  id: string,
  input: UpdateSensoryMetadataInput
): Promise<PrismaContentSensoryMetadata> {
  const { visualComplexity, animationIntensity, cognitiveLoad, sensoryWarnings, ...rest } = input;

  const updateData: Prisma.ContentSensoryMetadataUpdateInput = { ...rest };

  if (visualComplexity !== undefined) {
    updateData.visualComplexity = visualComplexity.toUpperCase() as
      | 'SIMPLE'
      | 'MODERATE'
      | 'COMPLEX';
  }
  if (animationIntensity !== undefined) {
    updateData.animationIntensity = animationIntensity.toUpperCase() as
      | 'NONE'
      | 'MILD'
      | 'MODERATE'
      | 'INTENSE';
  }
  if (cognitiveLoad !== undefined) {
    updateData.cognitiveLoad = cognitiveLoad.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH';
  }
  if (sensoryWarnings !== undefined) {
    updateData.sensoryWarnings = sensoryWarnings;
  }

  // Recalculate suitability flags if relevant fields changed
  if (
    input.hasFlashing !== undefined ||
    input.overallIntensityScore !== undefined ||
    input.hasSuddenSounds !== undefined ||
    input.audioLevel !== undefined ||
    input.hasAnimation !== undefined ||
    animationIntensity !== undefined
  ) {
    const current = await prisma.contentSensoryMetadata.findUnique({ where: { id } });
    if (current) {
      const hasFlashing = input.hasFlashing ?? current.hasFlashing;
      const intensityScore = input.overallIntensityScore ?? current.overallIntensityScore;
      const hasSuddenSounds = input.hasSuddenSounds ?? current.hasSuddenSounds;
      const audioLevel = input.audioLevel ?? current.audioLevel;
      const hasAnimation = input.hasAnimation ?? current.hasAnimation;
      const animIntensity = animationIntensity?.toUpperCase() ?? current.animationIntensity;

      updateData.suitableForPhotosensitive = !hasFlashing && intensityScore <= 5;
      updateData.suitableForAudioSensitive = !hasSuddenSounds && audioLevel <= 5;
      updateData.suitableForMotionSensitive =
        !hasAnimation || animIntensity === 'NONE' || animIntensity === 'MILD';
    }
  }

  return prisma.contentSensoryMetadata.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Mark sensory metadata as manually reviewed.
 */
export async function markAsReviewed(
  id: string,
  reviewedByUserId: string
): Promise<PrismaContentSensoryMetadata> {
  return prisma.contentSensoryMetadata.update({
    where: { id },
    data: {
      manuallyReviewed: true,
      reviewedByUserId,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// DELETE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Delete sensory metadata by ID.
 */
export async function deleteSensoryMetadata(id: string): Promise<void> {
  await prisma.contentSensoryMetadata.delete({
    where: { id },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze content and generate sensory metadata.
 * This is a basic implementation - can be enhanced with ML models.
 */
export function analyzeContentForSensory(
  request: ContentAnalysisRequest
): ContentAnalysisResult {
  const { contentType, contentJson } = request;
  const warnings: string[] = [];

  // Base metadata with defaults
  const metadata: CreateSensoryMetadataInput = {
    learningObjectVersionId: '', // Will be set by caller
    hasAudio: false,
    hasSuddenSounds: false,
    hasBackgroundMusic: false,
    audioLevel: 3,
    hasFlashing: false,
    visualComplexity: 'moderate',
    hasVibrantColors: false,
    hasAnimation: false,
    animationIntensity: 'none',
    animationReducible: true,
    hasQuickMotion: false,
    requiresFineTouchInput: false,
    hasHapticFeedback: false,
    canDisableHaptic: true,
    cognitiveLoad: 'medium',
    hasTimeLimits: false,
    timeLimitsAdjustable: true,
    requiresQuickReactions: false,
    hasScrolling: false,
    hasParallax: false,
    overallIntensityScore: 5,
    canMuteAudio: true,
  };

  // Analyze based on content type
  switch (contentType.toLowerCase()) {
    case 'video':
      metadata.hasAudio = true;
      metadata.audioLevel = 6;
      metadata.hasAnimation = true;
      metadata.animationIntensity = 'moderate';
      metadata.visualComplexity = 'moderate';
      metadata.overallIntensityScore = 6;
      break;

    case 'interactive':
    case 'game':
      metadata.hasAudio = true;
      metadata.audioLevel = 7;
      metadata.hasAnimation = true;
      metadata.animationIntensity = 'moderate';
      metadata.visualComplexity = 'complex';
      metadata.cognitiveLoad = 'high';
      metadata.overallIntensityScore = 7;
      metadata.hasHapticFeedback = true;
      break;

    case 'reading':
    case 'text':
      metadata.visualComplexity = 'simple';
      metadata.cognitiveLoad = 'medium';
      metadata.overallIntensityScore = 2;
      break;

    case 'quiz':
    case 'assessment':
      metadata.hasTimeLimits = true;
      metadata.cognitiveLoad = 'high';
      metadata.overallIntensityScore = 4;
      break;

    case 'social_story':
      metadata.visualComplexity = 'simple';
      metadata.cognitiveLoad = 'low';
      metadata.overallIntensityScore = 2;
      if (contentJson.hasAudio) {
        metadata.hasAudio = true;
        metadata.audioLevel = 4;
      }
      break;

    default:
      warnings.push(`Unknown content type: ${contentType}, using defaults`);
  }

  // Check for specific content properties
  if (contentJson.mediaType === 'video') {
    metadata.hasAudio = true;
    metadata.hasAnimation = true;
  }

  if (contentJson.hasBackgroundMusic) {
    metadata.hasBackgroundMusic = true;
    metadata.audioLevel = Math.max(metadata.audioLevel ?? 5, 5);
  }

  if (contentJson.timeLimit || contentJson.timer) {
    metadata.hasTimeLimits = true;
    metadata.timeLimitsAdjustable = contentJson.adjustableTime !== false;
  }

  return {
    metadata,
    confidence: 0.6, // Low confidence for rule-based analysis
    analysisMethod: 'rule-based',
    warnings,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get content versions that need sensory analysis.
 */
export async function getVersionsNeedingAnalysis(
  limit: number = 100
): Promise<Array<{ id: string; contentJson: unknown }>> {
  const versionsWithMetadata = await prisma.learningObjectVersion.findMany({
    where: {
      sensoryMetadata: null,
      state: 'PUBLISHED',
    },
    select: {
      id: true,
      contentJson: true,
    },
    take: limit,
  });

  return versionsWithMetadata;
}

/**
 * Count content with and without sensory metadata.
 */
export async function getSensoryAnalysisCoverage(): Promise<{
  totalPublished: number;
  withMetadata: number;
  withoutMetadata: number;
  coveragePercent: number;
}> {
  const totalPublished = await prisma.learningObjectVersion.count({
    where: { state: 'PUBLISHED' },
  });

  const withMetadata = await prisma.contentSensoryMetadata.count();

  const withoutMetadata = totalPublished - withMetadata;
  const coveragePercent = totalPublished > 0 ? (withMetadata / totalPublished) * 100 : 100;

  return {
    totalPublished,
    withMetadata,
    withoutMetadata,
    coveragePercent: Math.round(coveragePercent * 100) / 100,
  };
}
