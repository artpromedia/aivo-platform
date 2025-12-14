/**
 * Zod Validation Schemas
 *
 * Validation schemas for profile and accommodation data.
 * Uses non-diagnostic language enforcement.
 */

import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

export const ProfileOriginSchema = z.enum([
  'PARENT_REPORTED',
  'TEACHER_REPORTED',
  'JOINT',
  'IMPORTED',
  'SYSTEM_INFERRED',
]);

export const AccommodationCategorySchema = z.enum([
  'INSTRUCTIONAL',
  'SENSORY',
  'ASSESSMENT',
  'ENVIRONMENTAL',
  'COMMUNICATION',
  'BEHAVIORAL',
  'TECHNOLOGY',
  'OTHER',
]);

export const AccommodationSourceSchema = z.enum([
  'IEP',
  'PLAN_504',
  'TEAM_DECISION',
  'PARENT_PREFERENCE',
  'LEARNER_PREFERENCE',
  'TEACHER_OBSERVATION',
]);

export const SensitivityLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const FontPreferenceSchema = z.enum([
  'SYSTEM_DEFAULT',
  'DYSLEXIA_FRIENDLY',
  'SANS_SERIF',
  'SERIF',
  'MONOSPACE',
]);

export const TextSizePreferenceSchema = z.enum([
  'SMALL',
  'MEDIUM',
  'LARGE',
  'EXTRA_LARGE',
]);

export const CheckFrequencySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

// ══════════════════════════════════════════════════════════════════════════════
// JSONB SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const LearningStyleJsonSchema = z.object({
  prefersVisual: z.boolean().optional(),
  prefersAudio: z.boolean().optional(),
  prefersText: z.boolean().optional(),
  prefersKinesthetic: z.boolean().optional(),
  needsChunking: z.boolean().optional(),
  benefitsFromRepetition: z.boolean().optional(),
}).passthrough();

export const SensoryProfileJsonSchema = z.object({
  noiseSensitivity: SensitivityLevelSchema.optional(),
  lightSensitivity: SensitivityLevelSchema.optional(),
  prefersLowContrast: z.boolean().optional(),
  prefersWarmColors: z.boolean().optional(),
  benefitsFromMovementBreaks: z.boolean().optional(),
  preferredBreakDurationMinutes: z.number().int().min(1).max(30).optional(),
}).passthrough();

export const CommunicationPreferencesJsonSchema = z.object({
  prefersShortPrompts: z.boolean().optional(),
  prefersSingleStepInstructions: z.boolean().optional(),
  visualSchedules: z.boolean().optional(),
  checkForUnderstandingFrequency: CheckFrequencySchema.optional(),
  benefitsFromWaitTime: z.boolean().optional(),
  preferredResponseFormat: z.enum(['verbal', 'written', 'pointing', 'any']).optional(),
}).passthrough();

export const InteractionConstraintsJsonSchema = z.object({
  limitQuestionsPerScreen: z.number().int().min(1).max(10).nullable().optional(),
  avoidTimers: z.boolean().optional(),
  avoidRedText: z.boolean().optional(),
  avoidFlashingContent: z.boolean().optional(),
  avoidLoudSounds: z.boolean().optional(),
  requiresPredictableFlow: z.boolean().optional(),
}).passthrough();

export const UiAccessibilityJsonSchema = z.object({
  font: FontPreferenceSchema.optional(),
  textSize: TextSizePreferenceSchema.optional(),
  reduceMotion: z.boolean().optional(),
  highContrast: z.boolean().optional(),
  useWarmColors: z.boolean().optional(),
  showReadAloudButton: z.boolean().optional(),
  autoReadAloud: z.boolean().optional(),
}).passthrough();

// ══════════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC LANGUAGE BLOCKLIST
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Terms that suggest diagnostic language (we want preference-based language)
 */
const DIAGNOSTIC_TERMS = [
  'autism',
  'autistic',
  'adhd',
  'add',
  'dyslexia',
  'dyslexic',
  'dyspraxia',
  'dyscalculia',
  'disorder',
  'syndrome',
  'diagnosis',
  'diagnosed',
  'condition',
  'disability',
  'disabled',
  'impairment',
  'impaired',
  'deficit',
  'asperger',
  'spectrum',
  'mental',
  'psychiatric',
  'psycholog',
  'therapy',
  'medication',
  'medicated',
  'iep requires',
  'due to',
  'because of their',
  'suffers from',
  'afflicted',
];

/**
 * Validate that text uses non-diagnostic language
 */
export function validateNonDiagnosticLanguage(text: string): { valid: boolean; flaggedTerms: string[] } {
  const lowerText = text.toLowerCase();
  const flaggedTerms: string[] = [];

  for (const term of DIAGNOSTIC_TERMS) {
    if (lowerText.includes(term)) {
      flaggedTerms.push(term);
    }
  }

  return {
    valid: flaggedTerms.length === 0,
    flaggedTerms,
  };
}

/**
 * Zod refinement for non-diagnostic language
 */
const nonDiagnosticString = z.string().refine(
  (val) => validateNonDiagnosticLanguage(val).valid,
  (val) => ({
    message: `Description contains diagnostic language. Please use preference-based language. Flagged terms: ${validateNonDiagnosticLanguage(val).flaggedTerms.join(', ')}`,
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const CreateProfileRequestSchema = z.object({
  summary: z.string().max(500).optional(),
  learningStyleJson: LearningStyleJsonSchema.optional(),
  sensoryProfileJson: SensoryProfileJsonSchema.optional(),
  communicationPreferencesJson: CommunicationPreferencesJsonSchema.optional(),
  interactionConstraintsJson: InteractionConstraintsJsonSchema.optional(),
  uiAccessibilityJson: UiAccessibilityJsonSchema.optional(),
  origin: ProfileOriginSchema.optional(),
});

export const UpdateProfileRequestSchema = CreateProfileRequestSchema.partial();

export const CreateAccommodationRequestSchema = z.object({
  category: AccommodationCategorySchema,
  description: nonDiagnosticString.min(5).max(500),
  appliesToDomains: z.array(z.string()).optional(),
  source: AccommodationSourceSchema.optional(),
  isCritical: z.boolean().optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
});

export const UpdateAccommodationRequestSchema = CreateAccommodationRequestSchema.partial();

export const ListAccommodationsQuerySchema = z.object({
  category: AccommodationCategorySchema.optional(),
  source: AccommodationSourceSchema.optional(),
  isCritical: z.enum(['true', 'false']).optional(),
  includeInactive: z.enum(['true', 'false']).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type CreateProfileRequest = z.infer<typeof CreateProfileRequestSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type CreateAccommodationRequest = z.infer<typeof CreateAccommodationRequestSchema>;
export type UpdateAccommodationRequest = z.infer<typeof UpdateAccommodationRequestSchema>;
export type ListAccommodationsQuery = z.infer<typeof ListAccommodationsQuerySchema>;

export type LearningStyleJson = z.infer<typeof LearningStyleJsonSchema>;
export type SensoryProfileJson = z.infer<typeof SensoryProfileJsonSchema>;
export type CommunicationPreferencesJson = z.infer<typeof CommunicationPreferencesJsonSchema>;
export type InteractionConstraintsJson = z.infer<typeof InteractionConstraintsJsonSchema>;
export type UiAccessibilityJson = z.infer<typeof UiAccessibilityJsonSchema>;
