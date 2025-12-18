/**
 * Sensory Types - ND-2.1
 *
 * Content service specific types for sensory matching.
 */

import type {
  SensoryProfile,
  ContentSensoryMetadata,
  SensoryMatchResult,
  SensoryIncident,
  SensoryWarning,
  ContentAdaptation,
} from '@aivo/ts-shared';

// Re-export shared types for convenience
export type {
  SensoryProfile,
  ContentSensoryMetadata,
  SensoryMatchResult,
  SensoryIncident,
  SensoryWarning,
  ContentAdaptation,
};

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateSensoryMetadataInput {
  learningObjectVersionId: string;
  hasAudio?: boolean;
  hasSuddenSounds?: boolean;
  hasBackgroundMusic?: boolean;
  audioLevel?: number;
  peakVolume?: number;
  canMuteAudio?: boolean;
  hasFlashing?: boolean;
  flashFrequency?: number;
  visualComplexity?: 'simple' | 'moderate' | 'complex';
  hasVibrantColors?: boolean;
  contrastLevel?: number;
  hasAnimation?: boolean;
  animationIntensity?: 'none' | 'mild' | 'moderate' | 'intense';
  animationReducible?: boolean;
  hasQuickMotion?: boolean;
  requiresFineTouchInput?: boolean;
  hasHapticFeedback?: boolean;
  canDisableHaptic?: boolean;
  cognitiveLoad?: 'low' | 'medium' | 'high';
  hasTimeLimits?: boolean;
  timeLimitsAdjustable?: boolean;
  requiresQuickReactions?: boolean;
  hasScrolling?: boolean;
  hasParallax?: boolean;
  overallIntensityScore?: number;
  sensoryWarnings?: SensoryWarningInput[];
}

export interface SensoryWarningInput {
  category: 'audio' | 'visual' | 'motion' | 'tactile' | 'cognitive';
  level: 'info' | 'warning' | 'critical';
  code: string;
  message: string;
  recommendation?: string;
}

export interface UpdateSensoryMetadataInput extends Partial<CreateSensoryMetadataInput> {
  manuallyReviewed?: boolean;
  reviewedByUserId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYSIS TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ContentAnalysisRequest {
  contentType: string;
  contentJson: Record<string, unknown>;
  mediaUrls?: string[];
}

export interface ContentAnalysisResult {
  metadata: CreateSensoryMetadataInput;
  confidence: number;
  analysisMethod: string;
  warnings: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ListSensoryMetadataOptions {
  suitableForPhotosensitive?: boolean;
  suitableForAudioSensitive?: boolean;
  suitableForMotionSensitive?: boolean;
  maxIntensityScore?: number;
  analyzedBySystem?: boolean;
  manuallyReviewed?: boolean;
  page?: number;
  pageSize?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// MATCHING TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ContentWithSensoryMatch {
  contentId: string;
  contentType: string;
  title: string;
  matchResult: SensoryMatchResult;
}

export interface SensoryFilteredContentResult<T> {
  items: T[];
  totalCount: number;
  filteredCount: number;
  appliedFilters: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// INCIDENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateSensoryIncidentInput {
  learnerId: string;
  tenantId: string;
  contentId?: string;
  contentType?: string;
  contentTitle?: string;
  sessionId?: string;
  activityId?: string;
  incidentType: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  triggerCategory: 'audio' | 'visual' | 'motion' | 'tactile' | 'cognitive';
  triggerDescription?: string;
  triggerTimestamp?: Date;
  reportedByUserId?: string;
  reportedByRole?: 'learner' | 'parent' | 'teacher';
  userDescription?: string;
  systemDetected?: boolean;
  detectionMethod?: string;
  detectionConfidence?: number;
  behavioralSignals?: BehavioralSignal[];
}

export interface BehavioralSignal {
  type: string;
  value: number | string | boolean;
  timestamp: Date;
  source: string;
}

export interface ResolveSensoryIncidentInput {
  resolvedByUserId: string;
  resolutionNotes?: string;
  actionsTaken?: IncidentAction[];
  profileUpdated?: boolean;
  contentFlagged?: boolean;
}

export interface IncidentAction {
  type: string;
  description: string;
  performedAt: Date;
  performedByUserId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE SERVICE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateLearnerSensoryProfileInput {
  learnerId: string;
  tenantId: string;
  audioSensitivity?: number;
  audioCategory?: 'hyposensitive' | 'typical' | 'hypersensitive' | 'avoiding';
  prefersNoSuddenSounds?: boolean;
  maxVolume?: number;
  prefersQuietEnvironment?: boolean;
  visualSensitivity?: number;
  visualCategory?: 'hyposensitive' | 'typical' | 'hypersensitive' | 'avoiding';
  avoidsFlashing?: boolean;
  prefersSimpleVisuals?: boolean;
  preferredBrightness?: number;
  preferredContrast?: 'low' | 'normal' | 'high';
  motionSensitivity?: number;
  motionCategory?: 'hyposensitive' | 'typical' | 'hypersensitive' | 'avoiding';
  prefersReducedMotion?: boolean;
  preferredAnimationSpeed?: 'slow' | 'normal' | 'fast';
  avoidsParallax?: boolean;
  tactileSensitivity?: number;
  tactileCategory?: 'hyposensitive' | 'typical' | 'hypersensitive' | 'avoiding';
  prefersNoHaptic?: boolean;
  processingSpeed?: 'slow' | 'normal' | 'fast';
  preferredPacing?: 'slow' | 'normal' | 'fast';
  needsExtendedTime?: boolean;
  timeExtensionFactor?: number;
  isPhotosensitive?: boolean;
  photosensitivityLevel?: number;
  needsFrequentBreaks?: boolean;
  preferredBreakFrequency?: 'low' | 'normal' | 'high' | 'very_high';
  preferredTextSize?: 'small' | 'normal' | 'large' | 'very_large';
  prefersDyslexiaFont?: boolean;
  typicalEnvironment?: 'quiet' | 'noisy' | 'mixed';
  profileSource?: 'manual' | 'assessed' | 'imported';
  notes?: string;
}

export interface UpdateLearnerSensoryProfileInput
  extends Partial<CreateLearnerSensoryProfileInput> {
  parentConfirmedByUserId?: string;
}
