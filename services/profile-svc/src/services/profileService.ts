/**
 * Profile Service
 *
 * Business logic for learner profile management.
 */

import { prisma, type LearnerProfile } from '../prisma.js';
import type {
  CreateProfileRequest,
  UpdateProfileRequest,
  LearningStyleJson,
  SensoryProfileJson,
  CommunicationPreferencesJson,
  InteractionConstraintsJson,
  UiAccessibilityJson,
} from '../schemas/index.js';
import type { ProfileWithAccommodations, ProfileForAi, TenantContext } from '../types/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// GET PROFILE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get learner profile with accommodations
 */
export async function getProfile(
  tenantId: string,
  learnerId: string
): Promise<ProfileWithAccommodations | null> {
  const profile = await prisma.learnerProfile.findUnique({
    where: {
      tenantId_learnerId: { tenantId, learnerId },
    },
    include: {
      accommodations: {
        where: { isActive: true },
        orderBy: [{ isCritical: 'desc' }, { createdAt: 'desc' }],
      },
    },
  });

  if (!profile) {
    return null;
  }

  return {
    ...profile,
    learningStyleJson: profile.learningStyleJson as Record<string, unknown>,
    sensoryProfileJson: profile.sensoryProfileJson as Record<string, unknown>,
    communicationPreferencesJson: profile.communicationPreferencesJson as Record<string, unknown>,
    interactionConstraintsJson: profile.interactionConstraintsJson as Record<string, unknown>,
    uiAccessibilityJson: profile.uiAccessibilityJson as Record<string, unknown>,
    accommodations: profile.accommodations.map((a) => ({
      id: a.id,
      category: a.category,
      description: a.description,
      appliesToDomains: a.appliesToDomains,
      source: a.source,
      isCritical: a.isCritical,
      effectiveFrom: a.effectiveFrom,
      effectiveTo: a.effectiveTo,
      isActive: a.isActive,
    })),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CREATE PROFILE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new learner profile
 */
export async function createProfile(
  tenantId: string,
  learnerId: string,
  data: CreateProfileRequest,
  context: TenantContext
): Promise<LearnerProfile> {
  // Check if profile already exists
  const existing = await prisma.learnerProfile.findUnique({
    where: {
      tenantId_learnerId: { tenantId, learnerId },
    },
  });

  if (existing) {
    throw new Error('Profile already exists. Use PATCH to update.');
  }

  const profile = await prisma.learnerProfile.create({
    data: {
      tenantId,
      learnerId,
      summary: data.summary,
      learningStyleJson: data.learningStyleJson ?? {},
      sensoryProfileJson: data.sensoryProfileJson ?? {},
      communicationPreferencesJson: data.communicationPreferencesJson ?? {},
      interactionConstraintsJson: data.interactionConstraintsJson ?? {},
      uiAccessibilityJson: data.uiAccessibilityJson ?? {},
      origin: data.origin ?? 'PARENT_REPORTED',
      createdByUserId: context.userId,
      profileVersion: 1,
    },
  });

  // Create initial change log entry
  await prisma.profileChangeLog.create({
    data: {
      profileId: profile.id,
      tenantId,
      learnerId,
      version: 1,
      changedFields: Object.keys(data),
      previousValuesJson: null,
      changedByUserId: context.userId,
      changedByRole: context.userRole,
    },
  });

  return profile;
}

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE PROFILE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Update an existing learner profile (versioned)
 */
export async function updateProfile(
  tenantId: string,
  learnerId: string,
  data: UpdateProfileRequest,
  context: TenantContext
): Promise<LearnerProfile> {
  // Get existing profile
  const existing = await prisma.learnerProfile.findUnique({
    where: {
      tenantId_learnerId: { tenantId, learnerId },
    },
  });

  if (!existing) {
    throw new Error('Profile not found');
  }

  // Determine which fields changed
  const changedFields: string[] = [];
  const previousValues: Record<string, unknown> = {};

  if (data.summary !== undefined && data.summary !== existing.summary) {
    changedFields.push('summary');
    previousValues.summary = existing.summary;
  }

  const jsonFields = [
    'learningStyleJson',
    'sensoryProfileJson',
    'communicationPreferencesJson',
    'interactionConstraintsJson',
    'uiAccessibilityJson',
  ] as const;

  for (const field of jsonFields) {
    if (data[field] !== undefined) {
      changedFields.push(field);
      previousValues[field] = existing[field];
    }
  }

  if (data.origin !== undefined && data.origin !== existing.origin) {
    changedFields.push('origin');
    previousValues.origin = existing.origin;
  }

  if (changedFields.length === 0) {
    return existing;
  }

  // Update profile with new version
  const newVersion = existing.profileVersion + 1;

  const updated = await prisma.learnerProfile.update({
    where: { id: existing.id },
    data: {
      summary: data.summary ?? existing.summary,
      learningStyleJson: data.learningStyleJson
        ? mergeJson(existing.learningStyleJson as Record<string, unknown>, data.learningStyleJson)
        : existing.learningStyleJson,
      sensoryProfileJson: data.sensoryProfileJson
        ? mergeJson(existing.sensoryProfileJson as Record<string, unknown>, data.sensoryProfileJson)
        : existing.sensoryProfileJson,
      communicationPreferencesJson: data.communicationPreferencesJson
        ? mergeJson(existing.communicationPreferencesJson as Record<string, unknown>, data.communicationPreferencesJson)
        : existing.communicationPreferencesJson,
      interactionConstraintsJson: data.interactionConstraintsJson
        ? mergeJson(existing.interactionConstraintsJson as Record<string, unknown>, data.interactionConstraintsJson)
        : existing.interactionConstraintsJson,
      uiAccessibilityJson: data.uiAccessibilityJson
        ? mergeJson(existing.uiAccessibilityJson as Record<string, unknown>, data.uiAccessibilityJson)
        : existing.uiAccessibilityJson,
      origin: data.origin ?? existing.origin,
      profileVersion: newVersion,
      updatedByUserId: context.userId,
    },
  });

  // Create change log entry
  await prisma.profileChangeLog.create({
    data: {
      profileId: updated.id,
      tenantId,
      learnerId,
      version: newVersion,
      changedFields,
      previousValuesJson: previousValues,
      changedByUserId: context.userId,
      changedByRole: context.userRole,
    },
  });

  return updated;
}

// ══════════════════════════════════════════════════════════════════════════════
// GET PROFILE FOR AI
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get compact profile for AI orchestrator (no PII)
 */
export async function getProfileForAi(
  tenantId: string,
  learnerId: string
): Promise<ProfileForAi | null> {
  const profile = await prisma.learnerProfile.findUnique({
    where: {
      tenantId_learnerId: { tenantId, learnerId },
    },
    include: {
      accommodations: {
        where: {
          isActive: true,
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } },
          ],
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  const learningStyle = profile.learningStyleJson as LearningStyleJson;
  const sensory = profile.sensoryProfileJson as SensoryProfileJson;
  const communication = profile.communicationPreferencesJson as CommunicationPreferencesJson;
  const constraints = profile.interactionConstraintsJson as InteractionConstraintsJson;
  const accessibility = profile.uiAccessibilityJson as UiAccessibilityJson;

  return {
    learning_style: {
      prefers_visual: learningStyle.prefersVisual,
      prefers_audio: learningStyle.prefersAudio,
      prefers_text: learningStyle.prefersText,
      prefers_kinesthetic: learningStyle.prefersKinesthetic,
      needs_chunking: learningStyle.needsChunking,
      benefits_from_repetition: learningStyle.benefitsFromRepetition,
    },
    sensory: {
      noise_sensitivity: sensory.noiseSensitivity,
      light_sensitivity: sensory.lightSensitivity,
      movement_breaks: sensory.benefitsFromMovementBreaks,
      break_duration_minutes: sensory.preferredBreakDurationMinutes,
    },
    communication: {
      short_prompts: communication.prefersShortPrompts,
      single_step_instructions: communication.prefersSingleStepInstructions,
      visual_schedules: communication.visualSchedules,
      check_understanding_frequency: communication.checkForUnderstandingFrequency,
      wait_time: communication.benefitsFromWaitTime,
      response_format: communication.preferredResponseFormat,
    },
    interaction_constraints: {
      questions_per_screen: constraints.limitQuestionsPerScreen,
      avoid_timers: constraints.avoidTimers,
      avoid_red_text: constraints.avoidRedText,
      avoid_flashing: constraints.avoidFlashingContent,
      avoid_loud_sounds: constraints.avoidLoudSounds,
      predictable_flow: constraints.requiresPredictableFlow,
    },
    ui_accessibility: {
      font: accessibility.font,
      text_size: accessibility.textSize,
      reduce_motion: accessibility.reduceMotion,
      high_contrast: accessibility.highContrast,
      warm_colors: accessibility.useWarmColors,
      read_aloud_button: accessibility.showReadAloudButton,
      auto_read_aloud: accessibility.autoReadAloud,
    },
    accommodations: profile.accommodations.map((a) => ({
      category: a.category,
      description: a.description,
      domains: a.appliesToDomains,
      is_critical: a.isCritical,
    })),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Merge JSON objects (shallow merge)
 */
function mergeJson(
  existing: Record<string, unknown>,
  updates: Record<string, unknown>
): Record<string, unknown> {
  return { ...existing, ...updates };
}
