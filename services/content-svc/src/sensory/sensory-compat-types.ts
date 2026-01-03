/**
 * Sensory Compatibility Types - ND-2.1
 *
 * Local type definitions that match the actual implementation in sensory-matcher.service.ts.
 * These override the shared types to fix type mismatches.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Override SensoryProfile with properties the code actually uses
export interface SensoryProfile {
  id?: string;
  learnerId?: string;
  tenantId?: string;

  // Audio - numeric sensitivity level
  audioSensitivity?: number;
  auditorySensitivity?: { level: number } | number;
  prefersNoSuddenSounds?: boolean;
  maxVolume?: number;
  prefersQuietEnvironment?: boolean;

  // Visual
  visualSensitivity?: { level: number } | number;
  avoidsFlashing?: boolean;
  isPhotosensitive?: boolean;
  photosensitivityLevel?: number;
  prefersSimpleVisuals?: boolean;
  preferredBrightness?: number;
  preferredContrast?: 'low' | 'normal' | 'high';
  preferredTextSize?: 'small' | 'normal' | 'large' | 'very_large';
  prefersDyslexiaFont?: boolean;

  // Motion
  motionSensitivity?: { level: number } | number;
  prefersReducedMotion?: boolean;
  preferredAnimationSpeed?: 'slow' | 'normal' | 'fast';
  avoidsParallax?: boolean;

  // Tactile
  tactileSensitivity?: { level: number } | number;
  prefersNoHaptic?: boolean;

  // Cognitive
  processingSpeed?: 'slow' | 'normal' | 'fast';
  preferredPacing?: 'slow' | 'normal' | 'fast';
  needsExtendedTime?: boolean;
  timeExtensionFactor?: number;
  needsFrequentBreaks?: boolean;
  preferredBreakFrequency?: 'low' | 'normal' | 'high' | 'very_high';

  // Allow any additional properties
  [key: string]: any;
}

// Override ContentSensoryMetadata with properties the code actually uses
export interface ContentSensoryMetadata {
  // Audio
  hasAudio?: boolean;
  audioType?: string;
  maxVolumePeak?: number;
  audioLevel?: number;
  peakVolume?: number;
  hasSuddenSounds?: boolean;
  hasBackgroundMusic?: boolean;
  audioCanBeDisabled?: boolean;
  canMuteAudio?: boolean;

  // Visual
  hasVideo?: boolean;
  hasAnimation?: boolean;
  animationIntensity?: 'none' | 'minimal' | 'mild' | 'moderate' | 'high' | 'intense';
  hasFlashing?: boolean;
  flashFrequency?: number;
  colorIntensity?: string;
  hasVibrantColors?: boolean;
  visualComplexity?: 'simple' | 'moderate' | 'complex';
  contrastLevel?: number;
  hasAutoplay?: boolean;
  animationReducible?: boolean;

  // Motion
  hasMotion?: boolean;
  motionType?: string;
  canReduceMotion?: boolean;
  hasQuickMotion?: boolean;
  hasParallax?: boolean;
  hasScrolling?: boolean;

  // Cognitive
  cognitiveLoad?: 'low' | 'medium' | 'high';
  hasTiming?: boolean;
  timingFlexible?: boolean;
  hasTimeLimits?: boolean;
  timeLimitsAdjustable?: boolean;

  // Interaction
  requiresQuickReaction?: boolean;
  requiresQuickReactions?: boolean;
  requiresFineMotor?: boolean;
  requiresFineTouchInput?: boolean;
  requiresAudioResponse?: boolean;

  // Tactile
  hasHapticFeedback?: boolean;
  canDisableHaptic?: boolean;

  // Adaptability
  hasAlternativeFormats?: boolean;
  alternativeFormats?: string[];
  customizable?: boolean;
  customizableOptions?: string[];

  // Allow any additional properties
  [key: string]: any;
}

// Override SensoryWarning with properties the code actually uses
export interface SensoryWarning {
  type?: string;
  severity?: string;
  message?: string;
  trigger?: string;
  mitigation?: string;

  // Additional properties used in the code
  category?: 'audio' | 'visual' | 'motion' | 'tactile' | 'cognitive';
  level?: 'info' | 'warning' | 'critical';
  code?: string;
  explanation?: string;
  recommendation?: string;

  // Allow any additional properties
  [key: string]: any;
}

// Override ContentAdaptation with properties the code actually uses
export interface ContentAdaptation {
  type?: string;
  description?: string;
  automatic?: boolean;
  setting?: string;
  value?: any;
  reason?: string;

  // Allow any additional properties
  [key: string]: any;
}

// Override SensoryMatchResult with properties the code actually uses
export interface SensoryMatchResult {
  contentId?: string;
  matchScore?: number;
  overallScore?: number;
  compatible?: boolean;
  isSuitable?: boolean;
  warnings?: SensoryWarning[];
  adaptations?: ContentAdaptation[];
  alternativeContentIds?: string[];

  // Allow any additional properties
  [key: string]: any;
}

// Override SensoryContentFilter with properties the code actually uses
export interface SensoryContentFilter {
  // Suitability flags
  suitableForPhotosensitive?: boolean;
  suitableForAudioSensitive?: boolean;
  suitableForMotionSensitive?: boolean;

  // Intensity
  maxIntensityScore?: number;

  // Audio
  excludeSuddenSounds?: boolean;
  requireMutableAudio?: boolean;
  maxAudioIntensity?: number;

  // Visual
  excludeFlashing?: boolean;
  maxVisualComplexity?: string;
  requiresNoFlashing?: boolean;
  requiresNoAutoplay?: boolean;

  // Motion
  excludeAnimation?: boolean;
  requireReducibleAnimation?: boolean;
  requiresReducedMotion?: boolean;
  excludeParallax?: boolean;
  maxAnimationIntensity?: string;

  // Cognitive
  requireAdjustableTimeLimits?: boolean;
  requiresNoTimePressure?: boolean;
  maxCognitiveLoad?: string;

  // Content types
  preferredContentTypes?: string[];
  excludeContentTypes?: string[];

  // Allow any additional properties
  [key: string]: any;
}

// Type alias for sensitivity that can be a number or object
export type SensorySensitivity = number | { level: number; category?: string };

// Helper to get sensitivity level from either format
export function getSensitivityLevel(sensitivity: SensorySensitivity | undefined): number {
  if (sensitivity === undefined) return 5;
  if (typeof sensitivity === 'number') return sensitivity;
  return sensitivity.level ?? 5;
}
