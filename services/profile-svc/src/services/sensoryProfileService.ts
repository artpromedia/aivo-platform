/**
 * Sensory Profile Service
 *
 * Business logic for managing sensory profiles with visual, auditory,
 * motor, and cognitive accommodations.
 */

import { prisma } from '../prisma.js';
import type { TenantContext } from '../types/index.js';
import type {
  CreateSensoryProfileRequest,
  UpdateSensoryProfileRequest,
  SensoryProfilePreset,
  PresetName,
} from '../dto/sensory-profile.dto.js';
import {
  SENSORY_PROFILE_PRESETS,
  getPresetByName,
  validateAccommodationCombinations,
} from '../dto/sensory-profile.dto.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sensory profile entity returned from database operations.
 */
export interface SensoryProfileEntity {
  id: string;
  learnerId: string;
  tenantId: string;
  visualContrast: string;
  fontSize: string;
  lineSpacing: number;
  fontFamily: string;
  reduceAnimations: boolean;
  darkMode: boolean;
  colorBlindMode: string;
  textToSpeech: boolean;
  speechRate: number;
  speechVoice: string;
  audioDescriptions: boolean;
  closedCaptions: boolean;
  signLanguageSupport: boolean;
  keyboardNavigation: boolean;
  extendedTimeLimits: number;
  largeClickTargets: boolean;
  stickyKeys: boolean;
  voiceControl: boolean;
  simplifiedLayouts: boolean;
  readingGuide: boolean;
  focusHighlight: boolean;
  breakReminders: boolean;
  breakIntervalMins: number;
  contentChunking: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Result of profile creation/update with validation warnings.
 */
export interface SensoryProfileResult {
  profile: SensoryProfileEntity;
  warnings: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// GET SENSORY PROFILE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get a learner's sensory profile.
 */
export async function getSensoryProfile(
  tenantId: string,
  learnerId: string
): Promise<SensoryProfileEntity | null> {
  const profile = await prisma.sensoryProfile.findUnique({
    where: {
      learnerId,
    },
  });

  // Verify tenant isolation
  if (profile && profile.tenantId !== tenantId) {
    return null;
  }

  return profile as SensoryProfileEntity | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// CREATE SENSORY PROFILE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new sensory profile for a learner.
 */
export async function createSensoryProfile(
  tenantId: string,
  learnerId: string,
  data: CreateSensoryProfileRequest,
  _context: TenantContext
): Promise<SensoryProfileResult> {
  // Check if profile already exists
  const existing = await prisma.sensoryProfile.findUnique({
    where: {
      learnerId,
    },
  });

  if (existing) {
    if (existing.tenantId !== tenantId) {
      throw new Error('Unauthorized: Learner belongs to different tenant');
    }
    throw new Error('Sensory profile already exists. Use PUT to update.');
  }

  // Validate accommodation combinations
  const validation = validateAccommodationCombinations(data);

  // Create the profile with defaults for unspecified fields
  const profile = await prisma.sensoryProfile.create({
    data: {
      tenantId,
      learnerId,
      // Visual Accommodations
      visualContrast: data.visualContrast ?? 'NORMAL',
      fontSize: data.fontSize ?? 'MEDIUM',
      lineSpacing: data.lineSpacing ?? 1.5,
      fontFamily: data.fontFamily ?? 'OpenDyslexic',
      reduceAnimations: data.reduceAnimations ?? false,
      darkMode: data.darkMode ?? false,
      colorBlindMode: data.colorBlindMode ?? 'NONE',
      // Auditory Accommodations
      textToSpeech: data.textToSpeech ?? false,
      speechRate: data.speechRate ?? 1.0,
      speechVoice: data.speechVoice ?? 'default',
      audioDescriptions: data.audioDescriptions ?? false,
      closedCaptions: data.closedCaptions ?? true,
      signLanguageSupport: data.signLanguageSupport ?? false,
      // Motor Accommodations
      keyboardNavigation: data.keyboardNavigation ?? false,
      extendedTimeLimits: data.extendedTimeLimits ?? 1.0,
      largeClickTargets: data.largeClickTargets ?? false,
      stickyKeys: data.stickyKeys ?? false,
      voiceControl: data.voiceControl ?? false,
      // Cognitive Accommodations
      simplifiedLayouts: data.simplifiedLayouts ?? false,
      readingGuide: data.readingGuide ?? false,
      focusHighlight: data.focusHighlight ?? false,
      breakReminders: data.breakReminders ?? true,
      breakIntervalMins: data.breakIntervalMins ?? 25,
      contentChunking: data.contentChunking ?? false,
    },
  });

  return {
    profile: profile as SensoryProfileEntity,
    warnings: validation.warnings,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE SENSORY PROFILE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Update an existing sensory profile.
 */
export async function updateSensoryProfile(
  tenantId: string,
  learnerId: string,
  data: UpdateSensoryProfileRequest,
  _context: TenantContext
): Promise<SensoryProfileResult> {
  // Get existing profile
  const existing = await prisma.sensoryProfile.findUnique({
    where: {
      learnerId,
    },
  });

  if (!existing) {
    throw new Error('Sensory profile not found');
  }

  // Verify tenant isolation
  if (existing.tenantId !== tenantId) {
    throw new Error('Unauthorized: Learner belongs to different tenant');
  }

  // Merge existing with updates for validation
  const mergedSettings = {
    visualContrast: data.visualContrast ?? existing.visualContrast,
    fontSize: data.fontSize ?? existing.fontSize,
    lineSpacing: data.lineSpacing ?? existing.lineSpacing,
    fontFamily: data.fontFamily ?? existing.fontFamily,
    reduceAnimations: data.reduceAnimations ?? existing.reduceAnimations,
    darkMode: data.darkMode ?? existing.darkMode,
    colorBlindMode: data.colorBlindMode ?? existing.colorBlindMode,
    textToSpeech: data.textToSpeech ?? existing.textToSpeech,
    speechRate: data.speechRate ?? existing.speechRate,
    speechVoice: data.speechVoice ?? existing.speechVoice,
    audioDescriptions: data.audioDescriptions ?? existing.audioDescriptions,
    closedCaptions: data.closedCaptions ?? existing.closedCaptions,
    signLanguageSupport: data.signLanguageSupport ?? existing.signLanguageSupport,
    keyboardNavigation: data.keyboardNavigation ?? existing.keyboardNavigation,
    extendedTimeLimits: data.extendedTimeLimits ?? existing.extendedTimeLimits,
    largeClickTargets: data.largeClickTargets ?? existing.largeClickTargets,
    stickyKeys: data.stickyKeys ?? existing.stickyKeys,
    voiceControl: data.voiceControl ?? existing.voiceControl,
    simplifiedLayouts: data.simplifiedLayouts ?? existing.simplifiedLayouts,
    readingGuide: data.readingGuide ?? existing.readingGuide,
    focusHighlight: data.focusHighlight ?? existing.focusHighlight,
    breakReminders: data.breakReminders ?? existing.breakReminders,
    breakIntervalMins: data.breakIntervalMins ?? existing.breakIntervalMins,
    contentChunking: data.contentChunking ?? existing.contentChunking,
  } as CreateSensoryProfileRequest;

  // Validate accommodation combinations
  const validation = validateAccommodationCombinations(mergedSettings);

  // Update only the fields that were provided
  const profile = await prisma.sensoryProfile.update({
    where: {
      learnerId,
    },
    data: {
      ...(data.visualContrast !== undefined && { visualContrast: data.visualContrast }),
      ...(data.fontSize !== undefined && { fontSize: data.fontSize }),
      ...(data.lineSpacing !== undefined && { lineSpacing: data.lineSpacing }),
      ...(data.fontFamily !== undefined && { fontFamily: data.fontFamily }),
      ...(data.reduceAnimations !== undefined && { reduceAnimations: data.reduceAnimations }),
      ...(data.darkMode !== undefined && { darkMode: data.darkMode }),
      ...(data.colorBlindMode !== undefined && { colorBlindMode: data.colorBlindMode }),
      ...(data.textToSpeech !== undefined && { textToSpeech: data.textToSpeech }),
      ...(data.speechRate !== undefined && { speechRate: data.speechRate }),
      ...(data.speechVoice !== undefined && { speechVoice: data.speechVoice }),
      ...(data.audioDescriptions !== undefined && { audioDescriptions: data.audioDescriptions }),
      ...(data.closedCaptions !== undefined && { closedCaptions: data.closedCaptions }),
      ...(data.signLanguageSupport !== undefined && {
        signLanguageSupport: data.signLanguageSupport,
      }),
      ...(data.keyboardNavigation !== undefined && {
        keyboardNavigation: data.keyboardNavigation,
      }),
      ...(data.extendedTimeLimits !== undefined && {
        extendedTimeLimits: data.extendedTimeLimits,
      }),
      ...(data.largeClickTargets !== undefined && { largeClickTargets: data.largeClickTargets }),
      ...(data.stickyKeys !== undefined && { stickyKeys: data.stickyKeys }),
      ...(data.voiceControl !== undefined && { voiceControl: data.voiceControl }),
      ...(data.simplifiedLayouts !== undefined && { simplifiedLayouts: data.simplifiedLayouts }),
      ...(data.readingGuide !== undefined && { readingGuide: data.readingGuide }),
      ...(data.focusHighlight !== undefined && { focusHighlight: data.focusHighlight }),
      ...(data.breakReminders !== undefined && { breakReminders: data.breakReminders }),
      ...(data.breakIntervalMins !== undefined && { breakIntervalMins: data.breakIntervalMins }),
      ...(data.contentChunking !== undefined && { contentChunking: data.contentChunking }),
    },
  });

  return {
    profile: profile as SensoryProfileEntity,
    warnings: validation.warnings,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// RESET SENSORY PROFILE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Reset a sensory profile to default values.
 */
export async function resetSensoryProfile(
  tenantId: string,
  learnerId: string,
  _context: TenantContext
): Promise<SensoryProfileEntity> {
  // Get existing profile
  const existing = await prisma.sensoryProfile.findUnique({
    where: {
      learnerId,
    },
  });

  if (!existing) {
    throw new Error('Sensory profile not found');
  }

  // Verify tenant isolation
  if (existing.tenantId !== tenantId) {
    throw new Error('Unauthorized: Learner belongs to different tenant');
  }

  // Reset to defaults
  const profile = await prisma.sensoryProfile.update({
    where: {
      learnerId,
    },
    data: {
      // Visual Accommodations
      visualContrast: 'NORMAL',
      fontSize: 'MEDIUM',
      lineSpacing: 1.5,
      fontFamily: 'OpenDyslexic',
      reduceAnimations: false,
      darkMode: false,
      colorBlindMode: 'NONE',
      // Auditory Accommodations
      textToSpeech: false,
      speechRate: 1.0,
      speechVoice: 'default',
      audioDescriptions: false,
      closedCaptions: true,
      signLanguageSupport: false,
      // Motor Accommodations
      keyboardNavigation: false,
      extendedTimeLimits: 1.0,
      largeClickTargets: false,
      stickyKeys: false,
      voiceControl: false,
      // Cognitive Accommodations
      simplifiedLayouts: false,
      readingGuide: false,
      focusHighlight: false,
      breakReminders: true,
      breakIntervalMins: 25,
      contentChunking: false,
    },
  });

  return profile as SensoryProfileEntity;
}

// ══════════════════════════════════════════════════════════════════════════════
// APPLY PRESET
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Apply a preset configuration to a sensory profile.
 */
export async function applyPreset(
  tenantId: string,
  learnerId: string,
  presetName: PresetName,
  context: TenantContext
): Promise<SensoryProfileResult> {
  const preset = getPresetByName(presetName);
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`);
  }

  // Check if profile exists
  const existing = await prisma.sensoryProfile.findUnique({
    where: {
      learnerId,
    },
  });

  if (existing) {
    // Update existing profile with preset
    return updateSensoryProfile(tenantId, learnerId, preset.settings, context);
  } else {
    // Create new profile with preset
    return createSensoryProfile(tenantId, learnerId, preset.settings, context);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GET PRESETS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get all available sensory profile presets.
 */
export function getPresets(): SensoryProfilePreset[] {
  return SENSORY_PROFILE_PRESETS;
}

/**
 * Get a specific preset by name.
 */
export function getPreset(name: PresetName): SensoryProfilePreset | undefined {
  return getPresetByName(name);
}

// ══════════════════════════════════════════════════════════════════════════════
// UPSERT SENSORY PROFILE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create or update a sensory profile (upsert operation).
 */
export async function upsertSensoryProfile(
  tenantId: string,
  learnerId: string,
  data: CreateSensoryProfileRequest,
  context: TenantContext
): Promise<SensoryProfileResult> {
  const existing = await prisma.sensoryProfile.findUnique({
    where: {
      learnerId,
    },
  });

  if (existing) {
    // Verify tenant isolation
    if (existing.tenantId !== tenantId) {
      throw new Error('Unauthorized: Learner belongs to different tenant');
    }
    return updateSensoryProfile(tenantId, learnerId, data, context);
  } else {
    return createSensoryProfile(tenantId, learnerId, data, context);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GET CHANGED FIELDS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get list of fields that would change in an update.
 * Useful for event publishing.
 */
export function getChangedFields(
  existing: SensoryProfileEntity,
  updates: UpdateSensoryProfileRequest
): string[] {
  const changedFields: string[] = [];

  const fieldMappings: Array<{
    key: keyof UpdateSensoryProfileRequest;
    existingKey: keyof SensoryProfileEntity;
  }> = [
    { key: 'visualContrast', existingKey: 'visualContrast' },
    { key: 'fontSize', existingKey: 'fontSize' },
    { key: 'lineSpacing', existingKey: 'lineSpacing' },
    { key: 'fontFamily', existingKey: 'fontFamily' },
    { key: 'reduceAnimations', existingKey: 'reduceAnimations' },
    { key: 'darkMode', existingKey: 'darkMode' },
    { key: 'colorBlindMode', existingKey: 'colorBlindMode' },
    { key: 'textToSpeech', existingKey: 'textToSpeech' },
    { key: 'speechRate', existingKey: 'speechRate' },
    { key: 'speechVoice', existingKey: 'speechVoice' },
    { key: 'audioDescriptions', existingKey: 'audioDescriptions' },
    { key: 'closedCaptions', existingKey: 'closedCaptions' },
    { key: 'signLanguageSupport', existingKey: 'signLanguageSupport' },
    { key: 'keyboardNavigation', existingKey: 'keyboardNavigation' },
    { key: 'extendedTimeLimits', existingKey: 'extendedTimeLimits' },
    { key: 'largeClickTargets', existingKey: 'largeClickTargets' },
    { key: 'stickyKeys', existingKey: 'stickyKeys' },
    { key: 'voiceControl', existingKey: 'voiceControl' },
    { key: 'simplifiedLayouts', existingKey: 'simplifiedLayouts' },
    { key: 'readingGuide', existingKey: 'readingGuide' },
    { key: 'focusHighlight', existingKey: 'focusHighlight' },
    { key: 'breakReminders', existingKey: 'breakReminders' },
    { key: 'breakIntervalMins', existingKey: 'breakIntervalMins' },
    { key: 'contentChunking', existingKey: 'contentChunking' },
  ];

  for (const { key, existingKey } of fieldMappings) {
    if (updates[key] !== undefined && updates[key] !== existing[existingKey]) {
      changedFields.push(key);
    }
  }

  return changedFields;
}
