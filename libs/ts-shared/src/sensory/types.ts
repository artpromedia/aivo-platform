/**
 * Sensory Profile Types - ND-2.1
 *
 * Shared type definitions for sensory profile matching and content adaptation.
 * Used by content-svc, personalization-svc, and mobile apps.
 */

// ══════════════════════════════════════════════════════════════════════════════
// SENSORY PROFILE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Sensitivity level category */
export type SensitivityCategory = 'hyposensitive' | 'typical' | 'hypersensitive';

/** Individual sensory sensitivity measurement */
export interface SensorySensitivity {
  /** Sensitivity level 0-10 (0 = no sensitivity, 10 = extreme) */
  level: number;
  /** Category based on level */
  category: SensitivityCategory;
  /** Specific triggers that cause discomfort */
  triggers?: string[];
  /** Coping strategies that work for this learner */
  copingStrategies?: string[];
}

/** Contrast preference options */
export type ContrastPreference = 'low' | 'normal' | 'high';

/** Animation speed preference */
export type AnimationSpeedPreference = 'none' | 'slow' | 'normal' | 'fast';

/** Typical environment where learner uses the platform */
export type TypicalEnvironment = 'quiet_home' | 'busy_home' | 'classroom' | 'therapy' | 'mixed';

/** Content type preference */
export interface ContentTypePreference {
  type: string;
  preference: 'preferred' | 'neutral' | 'avoid';
  reason?: string;
}

/** Complete sensory profile for a learner */
export interface SensoryProfile {
  id: string;
  learnerId: string;
  tenantId: string;

  // Sensory sensitivities (0-10 scale)
  auditorySensitivity: SensorySensitivity;
  visualSensitivity: SensorySensitivity;
  motionSensitivity: SensorySensitivity;
  tactileSensitivity: SensorySensitivity;

  // Numeric preferences
  preferredVolume: number; // 0-100
  preferredBrightness: number; // 0-100

  // Preference settings
  preferredContrast: ContrastPreference;
  preferredAnimationSpeed: AnimationSpeedPreference;

  // Specific triggers to avoid
  avoidFlashing: boolean;
  avoidLoudSounds: boolean;
  avoidSuddenSounds: boolean;
  avoidBusyBackgrounds: boolean;
  avoidAutoplay: boolean;
  avoidTimePressure: boolean;

  // Helpful accommodations
  prefersDarkMode: boolean;
  prefersReducedMotion: boolean;
  prefersSimplifiedUI: boolean;
  prefersLargerText: boolean;
  prefersHighContrast: boolean;

  // Content type preferences
  preferredContentTypes: ContentTypePreference[];
  avoidedContentTypes: string[];

  // Environmental context
  typicalEnvironment: TypicalEnvironment;
  usesHeadphones: boolean;
  usesBlueLight: boolean;

  // Assessment metadata
  lastAssessedAt?: Date;
  assessmentSource?: 'parent' | 'therapist' | 'self' | 'observed';

  updatedAt: Date;
}

/** Input for creating/updating sensory profile */
export interface SensoryProfileInput {
  auditorySensitivity?: Partial<SensorySensitivity>;
  visualSensitivity?: Partial<SensorySensitivity>;
  motionSensitivity?: Partial<SensorySensitivity>;
  tactileSensitivity?: Partial<SensorySensitivity>;
  preferredVolume?: number;
  preferredBrightness?: number;
  preferredContrast?: ContrastPreference;
  preferredAnimationSpeed?: AnimationSpeedPreference;
  avoidFlashing?: boolean;
  avoidLoudSounds?: boolean;
  avoidSuddenSounds?: boolean;
  avoidBusyBackgrounds?: boolean;
  avoidAutoplay?: boolean;
  avoidTimePressure?: boolean;
  prefersDarkMode?: boolean;
  prefersReducedMotion?: boolean;
  prefersSimplifiedUI?: boolean;
  prefersLargerText?: boolean;
  prefersHighContrast?: boolean;
  preferredContentTypes?: ContentTypePreference[];
  avoidedContentTypes?: string[];
  typicalEnvironment?: TypicalEnvironment;
  usesHeadphones?: boolean;
  usesBlueLight?: boolean;
  assessmentSource?: 'parent' | 'therapist' | 'self' | 'observed';
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT SENSORY METADATA
// ══════════════════════════════════════════════════════════════════════════════

/** Audio type classification */
export type AudioType = 'speech' | 'music' | 'effects' | 'mixed';

/** Animation intensity level */
export type AnimationIntensity = 'minimal' | 'moderate' | 'high';

/** Color intensity level */
export type ColorIntensity = 'muted' | 'normal' | 'vibrant';

/** Visual complexity level */
export type VisualComplexity = 'simple' | 'moderate' | 'complex';

/** Motion type classification */
export type MotionType = 'smooth' | 'quick' | 'parallax';

/** Cognitive load level */
export type CognitiveLoad = 'low' | 'medium' | 'high';

/** Alternative content format */
export type AlternativeFormat =
  | 'text-only'
  | 'audio-only'
  | 'simplified'
  | 'high-contrast'
  | 'no-animation'
  | 'extended-time';

/** Customizable content options */
export type CustomizableOption =
  | 'volume'
  | 'brightness'
  | 'contrast'
  | 'animation-speed'
  | 'text-size'
  | 'background-color'
  | 'timer-visibility'
  | 'auto-advance';

/** Sensory metadata for a piece of content */
export interface ContentSensoryMetadata {
  // Audio characteristics
  hasAudio: boolean;
  audioType?: AudioType;
  maxVolumePeak?: number; // dB
  hasSuddenSounds: boolean;
  hasBackgroundMusic: boolean;
  audioCanBeDisabled: boolean;

  // Visual characteristics
  hasVideo: boolean;
  hasAnimation: boolean;
  animationIntensity?: AnimationIntensity;
  hasFlashing: boolean;
  flashFrequency?: number; // Hz (for photosensitive epilepsy warning >3Hz)
  colorIntensity: ColorIntensity;
  visualComplexity: VisualComplexity;
  hasAutoplay: boolean;

  // Motion characteristics
  hasMotion: boolean;
  motionType?: MotionType;
  canReduceMotion: boolean;

  // Cognitive load
  cognitiveLoad: CognitiveLoad;
  hasTiming: boolean;
  timingFlexible: boolean;

  // Interaction requirements
  requiresQuickReaction: boolean;
  requiresFineMotor: boolean;
  requiresAudioResponse: boolean;

  // Adaptability
  hasAlternativeFormats: boolean;
  alternativeFormats?: AlternativeFormat[];
  customizable: boolean;
  customizableOptions?: CustomizableOption[];
}

// ══════════════════════════════════════════════════════════════════════════════
// MATCHING RESULTS
// ══════════════════════════════════════════════════════════════════════════════

/** Warning type categories */
export type SensoryWarningType = 'audio' | 'visual' | 'motion' | 'cognitive' | 'timing';

/** Warning severity levels */
export type SensoryWarningSeverity = 'info' | 'caution' | 'warning' | 'block';

/** Warning about potential sensory issue */
export interface SensoryWarning {
  type: SensoryWarningType;
  severity: SensoryWarningSeverity;
  message: string;
  trigger: string;
  mitigation?: string;
}

/** Content adaptation to apply */
export interface ContentAdaptation {
  type: string;
  description: string;
  automatic: boolean;
  setting: string;
  value: unknown;
}

/** Result of matching content against sensory profile */
export interface SensoryMatchResult {
  contentId: string;
  matchScore: number; // 0-100
  compatible: boolean;
  warnings: SensoryWarning[];
  adaptations: ContentAdaptation[];
  alternativeContentIds?: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT FILTERS
// ══════════════════════════════════════════════════════════════════════════════

/** Filter for querying sensory-safe content */
export interface SensoryContentFilter {
  maxAudioIntensity?: number; // 0-10
  maxVisualComplexity?: VisualComplexity;
  maxAnimationIntensity?: AnimationIntensity;
  maxCognitiveLoad?: CognitiveLoad;
  requiresNoFlashing?: boolean;
  requiresNoAutoplay?: boolean;
  requiresNoTimePressure?: boolean;
  requiresReducedMotion?: boolean;
  preferredContentTypes?: string[];
  excludeContentTypes?: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// SENSORY INCIDENTS
// ══════════════════════════════════════════════════════════════════════════════

/** Type of sensory incident */
export type SensoryIncidentType = 'overwhelm' | 'distress' | 'avoidance' | 'meltdown_risk';

/** Trigger type for incident */
export type SensoryTriggerType = 'audio' | 'visual' | 'motion' | 'cognitive' | 'unknown';

/** Action taken in response to incident */
export type IncidentAction = 'break' | 'content_switch' | 'session_end' | 'settings_adjusted' | 'none';

/** Record of a sensory incident */
export interface SensoryIncident {
  id?: string;
  learnerId: string;
  tenantId: string;
  sessionId?: string;
  contentId?: string;
  incidentType: SensoryIncidentType;
  triggerType: SensoryTriggerType;
  triggerDetails?: string;
  sensoryState?: Partial<SensoryProfile>;
  focusState?: string;
  actionTaken?: IncidentAction;
  resolved?: boolean;
  contentMetadata?: Partial<ContentSensoryMetadata>;
  timestamp?: Date;
}

/** Input for reporting a sensory incident */
export interface SensoryIncidentInput {
  sessionId?: string;
  contentId?: string;
  incidentType: SensoryIncidentType;
  triggerType: SensoryTriggerType;
  triggerDetails?: string;
  focusState?: string;
  actionTaken?: IncidentAction;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT WITH SENSORY PREPARATION
// ══════════════════════════════════════════════════════════════════════════════

/** Content prepared with sensory adaptations */
export interface ContentWithSensoryPrep {
  content: unknown;
  sensoryMatch: SensoryMatchResult;
  displaySettings: Record<string, unknown>;
  preContentWarnings: string[];
  preContentPreparations: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Default sensory sensitivity */
export const DEFAULT_SENSITIVITY: SensorySensitivity = {
  level: 5,
  category: 'typical',
  triggers: [],
  copingStrategies: [],
};

/** Get sensitivity category from level */
export function getSensitivityCategory(level: number): SensitivityCategory {
  if (level <= 3) return 'hyposensitive';
  if (level >= 7) return 'hypersensitive';
  return 'typical';
}

/** Check if sensitivity level indicates high sensitivity */
export function isHighSensitivity(level: number): boolean {
  return level >= 6;
}

/** Check if sensitivity level indicates very high sensitivity */
export function isVeryHighSensitivity(level: number): boolean {
  return level >= 8;
}
