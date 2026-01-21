/**
 * Assessment Mode Router
 *
 * Analyzes parent assessment responses to determine the appropriate
 * assessment mode for the learner. Routes learners to:
 * - STANDARD: Full baseline assessment
 * - MODIFIED: Reduced items, simplified UI, extended time
 * - SUPPORTED: Picture-based, touch-only, AAC-compatible
 * - OBSERVATIONAL: Parent/teacher records responses
 * - SENSORY_ADAPTED: Adapted for blind/deaf/deafblind
 *
 * @author AIVO Platform Team
 */

import {
  PARENT_ASSESSMENT_QUESTIONS,
  type ParentAssessmentQuestion,
} from './parentAssessmentQuestions.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type AssessmentMode =
  | 'STANDARD'
  | 'MODIFIED'
  | 'SUPPORTED'
  | 'OBSERVATIONAL'
  | 'SENSORY_ADAPTED';

export type FunctioningLevel = 'TYPICAL' | 'MILD' | 'MODERATE' | 'SEVERE' | 'PROFOUND';

export type SensoryImpairmentType =
  | 'NONE'
  | 'BLIND'
  | 'LOW_VISION'
  | 'DEAF'
  | 'HARD_OF_HEARING'
  | 'DEAFBLIND';

export type InputMethod =
  | 'STANDARD'
  | 'LARGE_TOUCH'
  | 'SWITCH_SINGLE'
  | 'SWITCH_DUAL'
  | 'EYE_GAZE'
  | 'VOICE_CONTROL'
  | 'PARTNER_ASSISTED'
  | 'HEAD_TRACKING';

export type CommunicationModality =
  | 'VERBAL'
  | 'WRITTEN'
  | 'SIGN_LANGUAGE'
  | 'PICTURE_SYMBOLS'
  | 'AAC_DEVICE'
  | 'GESTURES'
  | 'COMBINATION';

export interface AssessmentModeDecision {
  /** Recommended assessment mode */
  recommendedMode: AssessmentMode;
  /** Confidence in the recommendation (0-1) */
  confidence: number;
  /** Human-readable reasoning */
  reasoning: string;
  /** Detected functioning level */
  functioningLevel: FunctioningLevel;
  /** Detected sensory impairment */
  sensoryImpairment: SensoryImpairmentType;
  /** Recommended input method */
  inputMethod: InputMethod;
  /** Detected communication modality */
  communicationModality: CommunicationModality;
  /** Specific accommodations to enable */
  accommodations: AssessmentAccommodation[];
  /** Warning flags for review */
  flags: AssessmentFlag[];
}

export interface AssessmentAccommodation {
  type: string;
  description: string;
  settings: Record<string, unknown>;
}

export interface AssessmentFlag {
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  questionId: string;
}

export type ParentResponses = Record<string, string | string[] | number | boolean | undefined>;

// ══════════════════════════════════════════════════════════════════════════════
// SCORING WEIGHTS & THRESHOLDS
// ══════════════════════════════════════════════════════════════════════════════

const FUNCTIONING_LEVEL_THRESHOLDS = {
  PROFOUND: 85, // Score >= 85 indicates profound needs
  SEVERE: 70, // Score >= 70 indicates severe needs
  MODERATE: 50, // Score >= 50 indicates moderate needs
  MILD: 25, // Score >= 25 indicates mild needs
  TYPICAL: 0, // Score < 25 indicates typical functioning
};

const SENSORY_IMPAIRMENT_WEIGHTS = {
  'Totally blind': 100,
  'Legally blind': 80,
  'Low vision (even with glasses)': 50,
  'Profoundly deaf': 100,
  'Deaf since birth': 100,
  'Severe hearing loss': 80,
  'Moderate hearing loss': 50,
};

const ASSESSMENT_MODE_THRESHOLDS = {
  OBSERVATIONAL: {
    minFunctioningScore: 80,
    orConditions: ['partner_assisted_input', 'profound_functioning', 'deafblind'],
  },
  SUPPORTED: {
    minFunctioningScore: 55,
    orConditions: ['picture_communication', 'aac_user', 'switch_access'],
  },
  SENSORY_ADAPTED: {
    orConditions: ['blind', 'deaf', 'low_vision_significant', 'deafblind'],
  },
  MODIFIED: {
    minFunctioningScore: 25,
    orConditions: ['mild_functioning', 'extended_time', 'iep_developmental'],
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ROUTING FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Determine the appropriate assessment mode based on parent responses.
 * This is the main entry point for assessment routing.
 */
export function determineAssessmentMode(
  responses: ParentResponses,
  options?: {
    tenantId?: string;
    learnerId?: string;
  }
): AssessmentModeDecision {
  const startTime = Date.now();

  // Calculate scores
  const functioningScore = calculateFunctioningScore(responses);
  const sensoryProfile = analyzeSensoryProfile(responses);
  const communicationProfile = analyzeCommunicationProfile(responses);
  const inputProfile = analyzeInputProfile(responses);
  const supportProfile = analyzeSupportProfile(responses);

  // Collect flags
  const flags = collectFlags(responses);

  // Determine functioning level
  const functioningLevel = scoringToFunctioningLevel(functioningScore);

  // Determine sensory impairment
  const sensoryImpairment = sensoryProfile.primaryImpairment;

  // Determine communication modality
  const communicationModality = communicationProfile.primaryModality;

  // Determine input method
  const inputMethod = inputProfile.preferredMethod;

  // Decision logic with priority order
  let recommendedMode: AssessmentMode = 'STANDARD';
  let reasoning = 'Standard assessment is appropriate based on responses.';
  let confidence = 0.9;

  // Priority 1: Check for observational mode (most restrictive)
  if (shouldUseObservationalMode(functioningScore, sensoryProfile, inputProfile, supportProfile)) {
    recommendedMode = 'OBSERVATIONAL';
    reasoning = buildObservationalReasoning(functioningLevel, sensoryImpairment, inputMethod);
    confidence = calculateConfidence(responses, ['fl-', 'sn-', 'im-']);
  }
  // Priority 2: Check for sensory-adapted mode
  else if (shouldUseSensoryAdaptedMode(sensoryProfile)) {
    recommendedMode = 'SENSORY_ADAPTED';
    reasoning = buildSensoryAdaptedReasoning(sensoryImpairment);
    confidence = calculateConfidence(responses, ['sa-']);
  }
  // Priority 3: Check for supported mode
  else if (shouldUseSupportedMode(functioningScore, communicationProfile, inputProfile)) {
    recommendedMode = 'SUPPORTED';
    reasoning = buildSupportedReasoning(functioningLevel, communicationModality, inputMethod);
    confidence = calculateConfidence(responses, ['fl-', 'cn-', 'im-']);
  }
  // Priority 4: Check for modified mode
  else if (shouldUseModifiedMode(functioningScore, responses)) {
    recommendedMode = 'MODIFIED';
    reasoning = buildModifiedReasoning(functioningLevel, responses);
    confidence = calculateConfidence(responses, ['fl-', 'ch-']);
  }

  // Build accommodations list
  const accommodations = buildAccommodations(
    recommendedMode,
    sensoryProfile,
    communicationProfile,
    inputProfile,
    supportProfile
  );

  const decision: AssessmentModeDecision = {
    recommendedMode,
    confidence,
    reasoning,
    functioningLevel,
    sensoryImpairment,
    inputMethod,
    communicationModality,
    accommodations,
    flags,
  };

  // Log assessment mode determination
  console.log('[assessment-mode-router] assessment_mode_determined', {
    tenantId: options?.tenantId,
    learnerId: options?.learnerId,
    recommendedMode,
    functioningLevel,
    sensoryImpairment,
    confidence,
    durationMs: Date.now() - startTime,
  });

  return decision;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCORING FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate overall functioning score from responses (0-100).
 * Higher scores indicate greater support needs.
 */
function calculateFunctioningScore(responses: ParentResponses): number {
  let totalScore = 0;
  let totalWeight = 0;

  const scoringQuestions = PARENT_ASSESSMENT_QUESTIONS.filter(
    (q): q is ParentAssessmentQuestion & { routingWeight: number } =>
      q.routingWeight !== undefined && q.category === 'functioning_level'
  );

  for (const question of scoringQuestions) {
    const response = responses[question.id];
    if (response == null) continue;

    const weight = question.routingWeight;
    const score = scoreResponse(question, response);

    totalScore += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  // Normalize to 0-100
  return Math.min(100, Math.max(0, (totalScore / totalWeight) * 100));
}

/**
 * Check if triggers array includes a value
 */
function hasTrigger(triggers: string[], value: string): boolean {
  return triggers.includes(value);
}

/**
 * Score an array response with triggers
 */
function scoreArrayWithTriggers(response: string[], triggers: string[]): number {
  const matchCount = response.filter((r) => hasTrigger(triggers, r)).length;
  return matchCount > 0 ? 0.8 + (matchCount / triggers.length) * 0.2 : 0;
}

/**
 * Score based on option position
 */
function scoreByOptionPosition(options: string[], response: string): number {
  const index = options.indexOf(response);
  if (index >= 0 && options.length > 1) {
    return index / (options.length - 1);
  }
  return 0;
}

/**
 * Score a rating scale response
 */
function scoreRatingScale(response: number, scaleMin: number, scaleMax: number): number {
  const range = scaleMax - scaleMin;
  return 1 - (response - scaleMin) / range;
}

/**
 * Check if question has valid triggers array
 */
function hasValidTriggers(
  question: ParentAssessmentQuestion
): question is ParentAssessmentQuestion & { flagTriggers: string[] } {
  return Array.isArray(question.flagTriggers) && question.flagTriggers.length > 0;
}

/**
 * Score an individual response (0-1 scale).
 * Higher scores indicate greater support needs.
 */
function scoreResponse(
  question: ParentAssessmentQuestion,
  response: string | string[] | number | boolean
): number {
  if (hasValidTriggers(question)) {
    const triggers = question.flagTriggers;
    if (Array.isArray(response)) {
      return scoreArrayWithTriggers(response, triggers);
    }
    if (typeof response === 'string') {
      return hasTrigger(triggers, response) ? 1 : 0;
    }
  }

  if (question.options && typeof response === 'string') {
    return scoreByOptionPosition(question.options, response);
  }

  if (question.questionType === 'rating_scale' && typeof response === 'number') {
    return scoreRatingScale(response, question.scaleMin ?? 1, question.scaleMax ?? 5);
  }

  return 0;
}

/**
 * Convert functioning score to level.
 */
function scoringToFunctioningLevel(score: number): FunctioningLevel {
  if (score >= FUNCTIONING_LEVEL_THRESHOLDS.PROFOUND) return 'PROFOUND';
  if (score >= FUNCTIONING_LEVEL_THRESHOLDS.SEVERE) return 'SEVERE';
  if (score >= FUNCTIONING_LEVEL_THRESHOLDS.MODERATE) return 'MODERATE';
  if (score >= FUNCTIONING_LEVEL_THRESHOLDS.MILD) return 'MILD';
  return 'TYPICAL';
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE ANALYZERS
// ══════════════════════════════════════════════════════════════════════════════

interface SensoryProfile {
  primaryImpairment: SensoryImpairmentType;
  visionScore: number;
  hearingScore: number;
  isDeafblind: boolean;
  tools: string[];
}

function analyzeSensoryProfile(responses: ParentResponses): SensoryProfile {
  const visionResponse = responses['sa-1'] as string | undefined;
  const hearingResponse = responses['sa-3'] as string | undefined;
  const deafblindResponse = responses['sa-5'] as string | undefined;
  const visionTools = (responses['sa-2'] as string[] | undefined) ?? [];
  const hearingTools = (responses['sa-4'] as string[] | undefined) ?? [];

  const isDeafblind = deafblindResponse === 'Yes';

  let visionScore = 0;
  let hearingScore = 0;

  if (visionResponse && visionResponse in SENSORY_IMPAIRMENT_WEIGHTS) {
    visionScore =
      SENSORY_IMPAIRMENT_WEIGHTS[visionResponse as keyof typeof SENSORY_IMPAIRMENT_WEIGHTS];
  }

  if (hearingResponse && hearingResponse in SENSORY_IMPAIRMENT_WEIGHTS) {
    hearingScore =
      SENSORY_IMPAIRMENT_WEIGHTS[hearingResponse as keyof typeof SENSORY_IMPAIRMENT_WEIGHTS];
  }

  let primaryImpairment: SensoryImpairmentType = 'NONE';

  if (isDeafblind) {
    primaryImpairment = 'DEAFBLIND';
  } else if (visionScore >= 100) {
    primaryImpairment = 'BLIND';
  } else if (hearingScore >= 100) {
    primaryImpairment = 'DEAF';
  } else if (visionScore >= 50) {
    primaryImpairment = 'LOW_VISION';
  } else if (hearingScore >= 50) {
    primaryImpairment = 'HARD_OF_HEARING';
  }

  return {
    primaryImpairment,
    visionScore,
    hearingScore,
    isDeafblind,
    tools: [...visionTools, ...hearingTools],
  };
}

interface CommunicationProfile {
  primaryModality: CommunicationModality;
  usesAAC: boolean;
  aacSystem: string | null;
  symbolSet: string | null;
}

function analyzeCommunicationProfile(responses: ParentResponses): CommunicationProfile {
  const primaryResponse = responses['cn-1'] as string | undefined;
  const aacResponse = responses['cn-2'] as string | undefined;
  const symbolResponse = responses['cn-3'] as string | undefined;

  let primaryModality: CommunicationModality = 'VERBAL';
  let usesAAC = false;
  let aacSystem: string | null = null;
  let symbolSet: string | null = null;

  // Map responses to modality
  const modalityMap: Record<string, CommunicationModality> = {
    'Verbal speech (speaks clearly)': 'VERBAL',
    'Verbal speech (limited vocabulary or clarity)': 'VERBAL',
    'Sign language': 'SIGN_LANGUAGE',
    'Picture symbols (PECS, Boardmaker, etc.)': 'PICTURE_SYMBOLS',
    'Communication device/app (AAC)': 'AAC_DEVICE',
    'Gestures and pointing': 'GESTURES',
    'Combination of methods': 'COMBINATION',
    'Non-verbal / Pre-verbal': 'GESTURES',
  };

  if (primaryResponse && primaryResponse in modalityMap) {
    primaryModality = modalityMap[primaryResponse];
  }

  if (aacResponse && aacResponse !== 'No, does not use AAC') {
    usesAAC = true;
    aacSystem = aacResponse.replace('Yes - ', '');
  }

  if (
    symbolResponse &&
    symbolResponse !== 'Not applicable - uses verbal/text communication' &&
    symbolResponse !== 'Not sure'
  ) {
    symbolSet = symbolResponse;
  }

  return {
    primaryModality,
    usesAAC,
    aacSystem,
    symbolSet,
  };
}

interface InputProfile {
  preferredMethod: InputMethod;
  needsLargeTargets: boolean;
  scanSettings: {
    type: string | null;
    needsConfiguration: boolean;
  };
  needsExtendedTime: boolean;
  extendedTimeLevel: 'standard' | 'moderate' | 'significant' | 'unlimited';
}

function analyzeInputProfile(responses: ParentResponses): InputProfile {
  const inputResponse = responses['im-1'] as string | undefined;
  const scanResponse = responses['im-2'] as string | undefined;
  const timeResponse = responses['im-3'] as string | undefined;

  let preferredMethod: InputMethod = 'STANDARD';
  let needsLargeTargets = false;
  let scanSettings = { type: null as string | null, needsConfiguration: false };
  let needsExtendedTime = false;
  let extendedTimeLevel: 'standard' | 'moderate' | 'significant' | 'unlimited' = 'standard';

  // Map input response to method
  const inputMap: Record<string, InputMethod> = {
    'Standard touch/mouse - no adaptations needed': 'STANDARD',
    'Needs larger touch targets/buttons': 'LARGE_TOUCH',
    'Uses switch access (single switch)': 'SWITCH_SINGLE',
    'Uses switch access (two switches)': 'SWITCH_DUAL',
    'Uses eye gaze/eye tracking': 'EYE_GAZE',
    'Uses head tracking': 'HEAD_TRACKING',
    'Uses voice control': 'VOICE_CONTROL',
    "Parent/aide operates device based on child's cues": 'PARTNER_ASSISTED',
  };

  if (inputResponse && inputResponse in inputMap) {
    preferredMethod = inputMap[inputResponse];
  }

  needsLargeTargets = inputResponse === 'Needs larger touch targets/buttons';

  if (scanResponse && scanResponse !== 'Not applicable - does not use switch access') {
    scanSettings = {
      type: scanResponse,
      needsConfiguration: scanResponse === 'Unsure - need help determining',
    };
  }

  // Time response
  type ExtendedTimeLevel = 'standard' | 'moderate' | 'significant' | 'unlimited';
  const timeMap: Record<string, { needs: boolean; level: ExtendedTimeLevel }> = {
    'No, responds at typical pace': { needs: false, level: 'standard' },
    'Yes, needs a few extra seconds': { needs: true, level: 'moderate' },
    'Yes, needs significantly more time (10+ seconds)': { needs: true, level: 'significant' },
    'Yes, needs partner assistance to respond': { needs: true, level: 'unlimited' },
    'Yes, no time limits should be used': { needs: true, level: 'unlimited' },
  };

  if (timeResponse && timeResponse in timeMap) {
    needsExtendedTime = timeMap[timeResponse].needs;
    extendedTimeLevel = timeMap[timeResponse].level;
  }

  return {
    preferredMethod,
    needsLargeTargets,
    scanSettings,
    needsExtendedTime,
    extendedTimeLevel,
  };
}

interface SupportProfile {
  adultPresenceLevel:
    | 'none'
    | 'encouragement'
    | 'reading'
    | 'physical'
    | 'interpret'
    | 'full_facilitation';
  questionsPerBreak: number;
  breakTypes: string[];
  triggers: string[];
}

function analyzeSupportProfile(responses: ParentResponses): SupportProfile {
  const presenceResponse = responses['sn-1'] as string | undefined;
  const breakResponse = responses['sn-2'] as string | undefined;
  const breakTypes = (responses['sn-3'] as string[] | undefined) ?? [];
  const triggers = (responses['sn-4'] as string[] | undefined) ?? [];

  // Map presence response
  const presenceMap: Record<string, SupportProfile['adultPresenceLevel']> = {
    'No, child can complete independently': 'none',
    'Yes, to provide encouragement but not help': 'encouragement',
    'Yes, to read questions aloud': 'reading',
    'Yes, to physically assist with responses': 'physical',
    'Yes, to interpret/translate responses': 'interpret',
    'Yes, to fully facilitate (observational mode)': 'full_facilitation',
  };

  const adultPresenceLevel = presenceMap[presenceResponse ?? ''] ?? 'none';

  // Map break frequency
  const breakMap: Record<string, number> = {
    '20+ questions at a time': 25,
    '10-20 questions at a time': 15,
    '5-10 questions at a time': 7,
    '3-5 questions at a time': 4,
    '1-2 questions at a time': 2,
    'Needs frequent breaks after each question': 1,
  };

  const questionsPerBreak = breakMap[breakResponse ?? ''] ?? 25;

  return {
    adultPresenceLevel,
    questionsPerBreak,
    breakTypes,
    triggers,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE DECISION FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function shouldUseObservationalMode(
  functioningScore: number,
  sensoryProfile: SensoryProfile,
  inputProfile: InputProfile,
  supportProfile: SupportProfile
): boolean {
  // Observational if:
  // 1. Profound functioning needs
  // 2. Partner-assisted input
  // 3. Deafblind
  // 4. Full facilitation required
  return (
    functioningScore >= ASSESSMENT_MODE_THRESHOLDS.OBSERVATIONAL.minFunctioningScore ||
    inputProfile.preferredMethod === 'PARTNER_ASSISTED' ||
    sensoryProfile.isDeafblind ||
    supportProfile.adultPresenceLevel === 'full_facilitation'
  );
}

function shouldUseSensoryAdaptedMode(sensoryProfile: SensoryProfile): boolean {
  return (
    sensoryProfile.primaryImpairment === 'BLIND' ||
    sensoryProfile.primaryImpairment === 'DEAF' ||
    sensoryProfile.primaryImpairment === 'DEAFBLIND' ||
    sensoryProfile.primaryImpairment === 'LOW_VISION' ||
    sensoryProfile.primaryImpairment === 'HARD_OF_HEARING'
  );
}

function shouldUseSupportedMode(
  functioningScore: number,
  communicationProfile: CommunicationProfile,
  inputProfile: InputProfile
): boolean {
  return (
    functioningScore >= ASSESSMENT_MODE_THRESHOLDS.SUPPORTED.minFunctioningScore ||
    communicationProfile.primaryModality === 'PICTURE_SYMBOLS' ||
    communicationProfile.primaryModality === 'AAC_DEVICE' ||
    communicationProfile.usesAAC ||
    inputProfile.preferredMethod === 'SWITCH_SINGLE' ||
    inputProfile.preferredMethod === 'SWITCH_DUAL' ||
    inputProfile.preferredMethod === 'EYE_GAZE'
  );
}

function shouldUseModifiedMode(functioningScore: number, responses: ParentResponses): boolean {
  // Check for IEP indicators
  const iepResponse = responses['fl-1'] as string | undefined;
  const hasIep = iepResponse && iepResponse !== 'No IEP or 504 plan';

  // Check for developmental delay indicators
  const developmentResponse = responses['fl-7'] as string | undefined;
  const hasMildDelay = developmentResponse === 'Mild delays (about 1-2 years behind peers)';

  return (
    functioningScore >= ASSESSMENT_MODE_THRESHOLDS.MODIFIED.minFunctioningScore ||
    (hasIep && functioningScore >= 15) ||
    hasMildDelay
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REASONING BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

function buildObservationalReasoning(
  functioningLevel: FunctioningLevel,
  sensoryImpairment: SensoryImpairmentType,
  inputMethod: InputMethod
): string {
  const reasons: string[] = [];

  if (functioningLevel === 'PROFOUND' || functioningLevel === 'SEVERE') {
    reasons.push(`learner has ${functioningLevel.toLowerCase()} support needs`);
  }

  if (inputMethod === 'PARTNER_ASSISTED') {
    reasons.push('requires adult assistance to respond');
  }

  if (sensoryImpairment === 'DEAFBLIND') {
    reasons.push('learner has combined vision and hearing impairment');
  }

  return `Observational assessment recommended because ${reasons.join(' and ')}. A parent or teacher will observe and record the learner's responses.`;
}

function buildSensoryAdaptedReasoning(sensoryImpairment: SensoryImpairmentType): string {
  const impairmentDescriptions: Record<SensoryImpairmentType, string> = {
    NONE: '',
    BLIND: 'learner is blind and requires audio-first content with screen reader support',
    LOW_VISION:
      'learner has low vision and requires magnification, high contrast, and audio descriptions',
    DEAF: 'learner is deaf and requires sign language videos, captions, and visual alerts',
    HARD_OF_HEARING: 'learner has hearing loss and requires captions and visual alerts',
    DEAFBLIND: 'learner is deafblind and requires tactile/haptic content with partner mediation',
  };

  return `Sensory-adapted assessment recommended because ${impairmentDescriptions[sensoryImpairment]}.`;
}

function buildSupportedReasoning(
  functioningLevel: FunctioningLevel,
  communicationModality: CommunicationModality,
  inputMethod: InputMethod
): string {
  const reasons: string[] = [];

  if (functioningLevel === 'MODERATE' || functioningLevel === 'SEVERE') {
    reasons.push(`learner has ${functioningLevel.toLowerCase()} support needs`);
  }

  if (communicationModality === 'PICTURE_SYMBOLS' || communicationModality === 'AAC_DEVICE') {
    reasons.push('learner uses symbol-based communication');
  }

  if (['SWITCH_SINGLE', 'SWITCH_DUAL', 'EYE_GAZE'].includes(inputMethod)) {
    reasons.push('learner uses assistive input methods');
  }

  return `Supported assessment recommended because ${reasons.join(' and ')}. Assessment will use picture-based responses with simplified navigation.`;
}

function buildModifiedReasoning(
  functioningLevel: FunctioningLevel,
  responses: ParentResponses
): string {
  const reasons: string[] = [];

  if (functioningLevel === 'MILD') {
    reasons.push('learner has mild support needs');
  }

  const iepResponse = responses['fl-1'] as string | undefined;
  if (iepResponse && iepResponse !== 'No IEP or 504 plan') {
    reasons.push('learner has an IEP/504 plan');
  }

  return `Modified assessment recommended because ${reasons.join(' and ')}. Assessment will have fewer items, simplified interface, and extended time.`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCOMMODATIONS BUILDER
// ══════════════════════════════════════════════════════════════════════════════

function buildAccommodations(
  mode: AssessmentMode,
  sensoryProfile: SensoryProfile,
  communicationProfile: CommunicationProfile,
  inputProfile: InputProfile,
  supportProfile: SupportProfile
): AssessmentAccommodation[] {
  return [
    ...getModeAccommodations(mode, inputProfile),
    ...getSensoryAccommodations(sensoryProfile),
    ...getInputAccommodations(inputProfile),
    ...getCommunicationAccommodations(communicationProfile),
    ...getSupportAccommodations(supportProfile),
  ];
}

function getModeAccommodations(
  mode: AssessmentMode,
  inputProfile: InputProfile
): AssessmentAccommodation[] {
  const result: AssessmentAccommodation[] = [];

  if (mode === 'MODIFIED' || mode === 'SUPPORTED' || mode === 'OBSERVATIONAL') {
    result.push({
      type: 'EXTENDED_TIME',
      description: 'No time limits on responses',
      settings: {
        timeMultiplier: inputProfile.extendedTimeLevel === 'unlimited' ? null : 2,
        disableTimers: true,
      },
    });
  }

  if (mode === 'SUPPORTED' || mode === 'OBSERVATIONAL') {
    result.push(
      {
        type: 'REDUCED_ITEMS',
        description: 'Fewer assessment items',
        settings: { itemReductionFactor: 0.5 },
      },
      {
        type: 'SIMPLIFIED_UI',
        description: 'Simplified interface with larger elements',
        settings: { uiComplexityLevel: 'minimal' },
      }
    );
  }

  return result;
}

function getSensoryAccommodations(sensoryProfile: SensoryProfile): AssessmentAccommodation[] {
  const result: AssessmentAccommodation[] = [];

  if (
    sensoryProfile.primaryImpairment === 'BLIND' ||
    sensoryProfile.primaryImpairment === 'LOW_VISION'
  ) {
    result.push(
      {
        type: 'SCREEN_READER',
        description: 'Full screen reader support',
        settings: {
          enabled: true,
          announceAllContent: true,
          keyboardNavigationOnly: sensoryProfile.primaryImpairment === 'BLIND',
        },
      },
      {
        type: 'AUDIO_DESCRIPTIONS',
        description: 'Audio descriptions for all visual content',
        settings: { enabled: true, detailLevel: 'comprehensive' },
      }
    );
  }

  if (
    sensoryProfile.primaryImpairment === 'DEAF' ||
    sensoryProfile.primaryImpairment === 'HARD_OF_HEARING'
  ) {
    result.push(
      {
        type: 'CAPTIONS',
        description: 'Captions for all audio content',
        settings: { enabled: true, style: 'detailed' },
      },
      {
        type: 'VISUAL_ALERTS',
        description: 'Visual alerts instead of audio cues',
        settings: { enabled: true, flashWarning: false },
      }
    );

    if (
      sensoryProfile.tools.includes('American Sign Language (ASL)') ||
      sensoryProfile.tools.includes('British Sign Language (BSL)')
    ) {
      result.push({
        type: 'SIGN_LANGUAGE',
        description: 'Sign language interpretation for content',
        settings: {
          enabled: true,
          languageType: sensoryProfile.tools.includes('American Sign Language (ASL)')
            ? 'ASL'
            : 'BSL',
        },
      });
    }
  }

  return result;
}

function getInputAccommodations(inputProfile: InputProfile): AssessmentAccommodation[] {
  const result: AssessmentAccommodation[] = [];

  if (inputProfile.needsLargeTargets || inputProfile.preferredMethod === 'LARGE_TOUCH') {
    result.push({
      type: 'LARGE_TOUCH_TARGETS',
      description: 'Enlarged touch targets',
      settings: { sizeMultiplier: 2 },
    });
  }

  if (
    inputProfile.preferredMethod === 'SWITCH_SINGLE' ||
    inputProfile.preferredMethod === 'SWITCH_DUAL'
  ) {
    result.push({
      type: 'SWITCH_ACCESS',
      description: 'Switch scanning access',
      settings: {
        switchCount: inputProfile.preferredMethod === 'SWITCH_SINGLE' ? 1 : 2,
        scanPattern: inputProfile.scanSettings.type ?? 'row_column',
        autoScan: true,
        scanSpeed: 1500,
      },
    });
  }

  if (inputProfile.preferredMethod === 'EYE_GAZE') {
    result.push({
      type: 'EYE_GAZE',
      description: 'Eye gaze/tracking input',
      settings: {
        enabled: true,
        dwellTime: 1500,
        calibrationRequired: true,
      },
    });
  }

  return result;
}

function getCommunicationAccommodations(
  communicationProfile: CommunicationProfile
): AssessmentAccommodation[] {
  const result: AssessmentAccommodation[] = [];

  if (communicationProfile.primaryModality === 'PICTURE_SYMBOLS' || communicationProfile.usesAAC) {
    result.push({
      type: 'PICTURE_SYMBOLS',
      description: 'Picture symbol response options',
      settings: {
        enabled: true,
        symbolSet: communicationProfile.symbolSet ?? 'PCS',
        symbolSize: 'large',
      },
    });
  }

  return result;
}

function getSupportAccommodations(supportProfile: SupportProfile): AssessmentAccommodation[] {
  const result: AssessmentAccommodation[] = [];

  if (supportProfile.questionsPerBreak < 10) {
    result.push({
      type: 'FREQUENT_BREAKS',
      description: 'Automatic break reminders',
      settings: {
        questionsBeforeBreak: supportProfile.questionsPerBreak,
        breakDurationSeconds: 60,
        breakActivities: supportProfile.breakTypes,
      },
    });
  }

  if (
    supportProfile.triggers.length > 0 &&
    !supportProfile.triggers.includes("None that I'm aware of")
  ) {
    result.push({
      type: 'CONTENT_FILTERS',
      description: 'Avoid specific content triggers',
      settings: {
        avoidFlashing: supportProfile.triggers.includes('Flashing lights or animations'),
        avoidLoudSounds: supportProfile.triggers.includes('Loud or sudden sounds'),
        avoidBusyVisuals: supportProfile.triggers.includes('Crowded or busy visuals'),
        avoidTimers: supportProfile.triggers.includes('Time pressure or countdowns'),
      },
    });
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// FLAG COLLECTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Determine severity based on routing weight
 */
function getSeverity(weight: number): AssessmentFlag['severity'] {
  if (weight >= 9) return 'CRITICAL';
  if (weight >= 7) return 'WARNING';
  return 'INFO';
}

function collectFlags(responses: ParentResponses): AssessmentFlag[] {
  const flags: AssessmentFlag[] = [];

  for (const question of PARENT_ASSESSMENT_QUESTIONS) {
    const response = responses[question.id];
    if (response == null) continue;

    if (!hasValidTriggers(question)) continue;

    const triggers = question.flagTriggers;
    let triggered = false;
    if (Array.isArray(response)) {
      triggered = response.some((r) => hasTrigger(triggers, r));
    } else if (typeof response === 'string') {
      triggered = hasTrigger(triggers, response);
    }

    if (triggered) {
      const weight = typeof question.routingWeight === 'number' ? question.routingWeight : 5;

      const severity = getSeverity(weight);

      flags.push({
        severity,
        message: `Response to "${question.questionText}" indicates specialized assessment may be needed.`,
        questionId: question.id,
      });
    }
  }

  return flags;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE CALCULATION
// ══════════════════════════════════════════════════════════════════════════════

function calculateConfidence(responses: ParentResponses, relevantPrefixes: string[]): number {
  let answeredRelevant = 0;
  let totalRelevant = 0;

  for (const question of PARENT_ASSESSMENT_QUESTIONS) {
    if (relevantPrefixes.some((prefix) => question.id.startsWith(prefix))) {
      totalRelevant++;
      if (responses[question.id] != null) {
        answeredRelevant++;
      }
    }
  }

  if (totalRelevant === 0) return 0.5;

  // Base confidence on answer completeness
  const completeness = answeredRelevant / totalRelevant;

  // Scale from 0.6 (minimal) to 0.95 (all answered)
  return 0.6 + completeness * 0.35;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export {
  calculateFunctioningScore,
  analyzeSensoryProfile,
  analyzeCommunicationProfile,
  analyzeInputProfile,
  analyzeSupportProfile,
};
