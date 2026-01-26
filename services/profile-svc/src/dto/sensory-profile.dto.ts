/**
 * Sensory Profile DTOs
 *
 * Zod validation schemas for sensory profile data.
 * Handles visual, auditory, motor, and cognitive accommodations.
 */

import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

export const VisualContrastSchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'ULTRA_HIGH']);
export const FontSizeSchema = z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']);
export const ColorBlindModeSchema = z.enum([
  'NONE',
  'PROTANOPIA',
  'DEUTERANOPIA',
  'TRITANOPIA',
  'ACHROMATOPSIA',
]);

export type VisualContrast = z.infer<typeof VisualContrastSchema>;
export type FontSize = z.infer<typeof FontSizeSchema>;
export type ColorBlindMode = z.infer<typeof ColorBlindModeSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// VISUAL ACCOMMODATIONS SCHEMA
// ══════════════════════════════════════════════════════════════════════════════

export const VisualAccommodationsSchema = z.object({
  visualContrast: VisualContrastSchema.optional(),
  fontSize: FontSizeSchema.optional(),
  lineSpacing: z.number().min(1.0).max(3.0).optional(),
  fontFamily: z.string().max(100).optional(),
  reduceAnimations: z.boolean().optional(),
  darkMode: z.boolean().optional(),
  colorBlindMode: ColorBlindModeSchema.optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// AUDITORY ACCOMMODATIONS SCHEMA
// ══════════════════════════════════════════════════════════════════════════════

export const AuditoryAccommodationsSchema = z.object({
  textToSpeech: z.boolean().optional(),
  speechRate: z.number().min(0.25).max(4.0).optional(),
  speechVoice: z.string().max(100).optional(),
  audioDescriptions: z.boolean().optional(),
  closedCaptions: z.boolean().optional(),
  signLanguageSupport: z.boolean().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// MOTOR ACCOMMODATIONS SCHEMA
// ══════════════════════════════════════════════════════════════════════════════

export const MotorAccommodationsSchema = z.object({
  keyboardNavigation: z.boolean().optional(),
  extendedTimeLimits: z.number().min(1.0).max(5.0).optional(),
  largeClickTargets: z.boolean().optional(),
  stickyKeys: z.boolean().optional(),
  voiceControl: z.boolean().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// COGNITIVE ACCOMMODATIONS SCHEMA
// ══════════════════════════════════════════════════════════════════════════════

export const CognitiveAccommodationsSchema = z.object({
  simplifiedLayouts: z.boolean().optional(),
  readingGuide: z.boolean().optional(),
  focusHighlight: z.boolean().optional(),
  breakReminders: z.boolean().optional(),
  breakIntervalMins: z.number().int().min(5).max(120).optional(),
  contentChunking: z.boolean().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for creating a sensory profile.
 * All fields are optional - defaults are applied at the database level.
 */
export const CreateSensoryProfileSchema = z.object({
  // Visual Accommodations
  visualContrast: VisualContrastSchema.optional(),
  fontSize: FontSizeSchema.optional(),
  lineSpacing: z.number().min(1.0).max(3.0).optional(),
  fontFamily: z.string().max(100).optional(),
  reduceAnimations: z.boolean().optional(),
  darkMode: z.boolean().optional(),
  colorBlindMode: ColorBlindModeSchema.optional(),

  // Auditory Accommodations
  textToSpeech: z.boolean().optional(),
  speechRate: z.number().min(0.25).max(4.0).optional(),
  speechVoice: z.string().max(100).optional(),
  audioDescriptions: z.boolean().optional(),
  closedCaptions: z.boolean().optional(),
  signLanguageSupport: z.boolean().optional(),

  // Motor Accommodations
  keyboardNavigation: z.boolean().optional(),
  extendedTimeLimits: z.number().min(1.0).max(5.0).optional(),
  largeClickTargets: z.boolean().optional(),
  stickyKeys: z.boolean().optional(),
  voiceControl: z.boolean().optional(),

  // Cognitive Accommodations
  simplifiedLayouts: z.boolean().optional(),
  readingGuide: z.boolean().optional(),
  focusHighlight: z.boolean().optional(),
  breakReminders: z.boolean().optional(),
  breakIntervalMins: z.number().int().min(5).max(120).optional(),
  contentChunking: z.boolean().optional(),
});

/**
 * Schema for updating a sensory profile.
 * Same as create schema - all fields optional.
 */
export const UpdateSensoryProfileSchema = CreateSensoryProfileSchema;

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for sensory profile response.
 */
export const SensoryProfileResponseSchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().uuid(),
  tenantId: z.string().uuid(),

  // Visual Accommodations
  visualContrast: VisualContrastSchema,
  fontSize: FontSizeSchema,
  lineSpacing: z.number(),
  fontFamily: z.string(),
  reduceAnimations: z.boolean(),
  darkMode: z.boolean(),
  colorBlindMode: ColorBlindModeSchema,

  // Auditory Accommodations
  textToSpeech: z.boolean(),
  speechRate: z.number(),
  speechVoice: z.string(),
  audioDescriptions: z.boolean(),
  closedCaptions: z.boolean(),
  signLanguageSupport: z.boolean(),

  // Motor Accommodations
  keyboardNavigation: z.boolean(),
  extendedTimeLimits: z.number(),
  largeClickTargets: z.boolean(),
  stickyKeys: z.boolean(),
  voiceControl: z.boolean(),

  // Cognitive Accommodations
  simplifiedLayouts: z.boolean(),
  readingGuide: z.boolean(),
  focusHighlight: z.boolean(),
  breakReminders: z.boolean(),
  breakIntervalMins: z.number(),
  contentChunking: z.boolean(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ══════════════════════════════════════════════════════════════════════════════
// PRESET SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const PresetNameSchema = z.enum([
  'dyslexia-friendly',
  'low-vision',
  'motor-impaired',
  'cognitive-support',
  'hearing-impaired',
  'photosensitive',
]);

export type PresetName = z.infer<typeof PresetNameSchema>;

/**
 * Schema for a sensory profile preset configuration.
 */
export const SensoryProfilePresetSchema = z.object({
  name: PresetNameSchema,
  displayName: z.string(),
  description: z.string(),
  settings: CreateSensoryProfileSchema,
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export type CreateSensoryProfileRequest = z.infer<typeof CreateSensoryProfileSchema>;
export type UpdateSensoryProfileRequest = z.infer<typeof UpdateSensoryProfileSchema>;
export type SensoryProfileResponse = z.infer<typeof SensoryProfileResponseSchema>;
export type SensoryProfilePreset = z.infer<typeof SensoryProfilePresetSchema>;
export type VisualAccommodations = z.infer<typeof VisualAccommodationsSchema>;
export type AuditoryAccommodations = z.infer<typeof AuditoryAccommodationsSchema>;
export type MotorAccommodations = z.infer<typeof MotorAccommodationsSchema>;
export type CognitiveAccommodations = z.infer<typeof CognitiveAccommodationsSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// PRESET DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Predefined accessibility presets for common needs.
 */
export const SENSORY_PROFILE_PRESETS: SensoryProfilePreset[] = [
  {
    name: 'dyslexia-friendly',
    displayName: 'Dyslexia Friendly',
    description: 'Optimized settings for learners who benefit from dyslexia-friendly accommodations',
    settings: {
      fontFamily: 'OpenDyslexic',
      fontSize: 'LARGE',
      lineSpacing: 2.0,
      visualContrast: 'HIGH',
      reduceAnimations: true,
      readingGuide: true,
      contentChunking: true,
      breakReminders: true,
      breakIntervalMins: 20,
    },
  },
  {
    name: 'low-vision',
    displayName: 'Low Vision',
    description: 'High contrast and large text settings for learners with low vision',
    settings: {
      visualContrast: 'ULTRA_HIGH',
      fontSize: 'EXTRA_LARGE',
      lineSpacing: 2.0,
      fontFamily: 'Arial',
      darkMode: false,
      largeClickTargets: true,
      textToSpeech: true,
      audioDescriptions: true,
      focusHighlight: true,
    },
  },
  {
    name: 'motor-impaired',
    displayName: 'Motor Accessibility',
    description: 'Settings optimized for learners with motor impairments',
    settings: {
      keyboardNavigation: true,
      largeClickTargets: true,
      stickyKeys: true,
      extendedTimeLimits: 2.0,
      voiceControl: true,
      reduceAnimations: true,
      focusHighlight: true,
    },
  },
  {
    name: 'cognitive-support',
    displayName: 'Cognitive Support',
    description: 'Simplified layouts and reduced distractions for cognitive support',
    settings: {
      simplifiedLayouts: true,
      readingGuide: true,
      focusHighlight: true,
      breakReminders: true,
      breakIntervalMins: 15,
      contentChunking: true,
      reduceAnimations: true,
      extendedTimeLimits: 1.5,
    },
  },
  {
    name: 'hearing-impaired',
    displayName: 'Hearing Accessibility',
    description: 'Visual and text-based alternatives for learners with hearing impairments',
    settings: {
      closedCaptions: true,
      signLanguageSupport: true,
      audioDescriptions: false,
      textToSpeech: false,
      focusHighlight: true,
    },
  },
  {
    name: 'photosensitive',
    displayName: 'Photosensitive',
    description: 'Reduced visual stimulation for learners with light sensitivity',
    settings: {
      visualContrast: 'LOW',
      darkMode: true,
      reduceAnimations: true,
      lineSpacing: 1.5,
      fontSize: 'MEDIUM',
    },
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate accommodation combinations for compatibility.
 * Some settings may conflict or need special handling.
 */
export function validateAccommodationCombinations(
  settings: CreateSensoryProfileRequest
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check for potentially conflicting settings
  if (settings.textToSpeech && settings.signLanguageSupport) {
    warnings.push(
      'Both text-to-speech and sign language support are enabled. Consider learner preference.'
    );
  }

  if (settings.darkMode && settings.visualContrast === 'LOW') {
    warnings.push(
      'Dark mode with low contrast may reduce readability. Consider using NORMAL or HIGH contrast.'
    );
  }

  if (settings.voiceControl && settings.textToSpeech) {
    warnings.push(
      'Voice control with text-to-speech may cause feedback issues. Ensure proper audio routing.'
    );
  }

  if (settings.reduceAnimations === false && settings.simplifiedLayouts) {
    warnings.push(
      'Simplified layouts typically work best with reduced animations enabled.'
    );
  }

  if (settings.breakIntervalMins && settings.breakIntervalMins < 10 && !settings.contentChunking) {
    warnings.push(
      'Very short break intervals work best with content chunking enabled.'
    );
  }

  return {
    valid: true, // Always valid, warnings are just suggestions
    warnings,
  };
}

/**
 * Get preset by name.
 */
export function getPresetByName(name: PresetName): SensoryProfilePreset | undefined {
  return SENSORY_PROFILE_PRESETS.find((p) => p.name === name);
}
