/**
 * Low-Functioning Assessment Service
 *
 * Provides specialized assessment logic for learners with significant
 * cognitive or developmental support needs. Implements:
 *
 * - Functional skills baseline instead of academic grade levels
 * - Picture-based/symbol-based questions
 * - Partner-assisted/observational modes
 * - Reduced item counts and simplified navigation
 * - Alternative input method support
 *
 * @author AIVO Platform Team
 */

import type { AssessmentMode, AssessmentAccommodation } from './assessmentModeRouter.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Functional skill domains for low-functioning assessment
 * (replaces academic domains for severe/profound needs)
 */
export type FunctionalDomain =
  | 'RECEPTIVE_COMMUNICATION' // Understanding spoken/visual language
  | 'EXPRESSIVE_COMMUNICATION' // Communicating wants/needs
  | 'VISUAL_DISCRIMINATION' // Matching, sorting, identifying
  | 'CAUSE_EFFECT' // Understanding cause and effect
  | 'CHOICE_MAKING' // Making and indicating choices
  | 'ATTENTION_ENGAGEMENT' // Attending to activities
  | 'MOTOR_IMITATION' // Following motor models
  | 'OBJECT_PERMANENCE' // Understanding objects exist
  | 'BASIC_CONCEPTS' // Same/different, big/small, etc.
  | 'DAILY_LIVING'; // Functional life skills

/**
 * Skill level for functional domains (simpler than academic levels)
 */
export type FunctionalSkillLevel =
  | 'NOT_DEMONSTRATED' // 0 - No evidence of skill
  | 'EMERGING' // 1 - Shows awareness, inconsistent
  | 'DEVELOPING' // 2 - With significant support
  | 'APPROACHING' // 3 - With moderate support
  | 'ACHIEVED' // 4 - With minimal support
  | 'GENERALIZED'; // 5 - Across contexts independently

/**
 * Question format for low-functioning assessments
 */
export type LowFunctioningQuestionFormat =
  | 'PICTURE_TOUCH' // Touch correct picture
  | 'PICTURE_MATCH' // Match identical pictures
  | 'OBJECT_SORT' // Sort by category
  | 'CAUSE_EFFECT_ACTIVATION' // Touch to cause effect
  | 'CHOICE_BETWEEN_TWO' // Binary choice
  | 'LOOK_GAZE' // Eye gaze to answer
  | 'PARTNER_OBSERVATION'; // Adult observes and records

/**
 * Low-functioning assessment question
 */
export interface LowFunctioningQuestion {
  id: string;
  domain: FunctionalDomain;
  skillCode: string;
  skillDescription: string;
  format: LowFunctioningQuestionFormat;

  // Visual content
  prompt: {
    type: 'image' | 'symbol' | 'audio' | 'video';
    content: string;
    audioDescription?: string;
  };

  // Response options
  options: LowFunctioningOption[];
  correctOptionIndex: number;

  // Difficulty and adaptation
  difficultyLevel: 1 | 2 | 3; // 1 = easiest
  requiresPartnerAssist: boolean;
  adaptations: string[];

  // Timing
  noTimeLimit: boolean;
  suggestedMaxSeconds?: number;
}

export interface LowFunctioningOption {
  id: string;
  type: 'image' | 'symbol' | 'text' | 'audio';
  content: string;
  symbolSet?: string;
  audioLabel?: string;
  touchTargetSize: 'large' | 'extra_large';
}

/**
 * Observational assessment item (for partner-assisted mode)
 */
export interface ObservationalItem {
  id: string;
  domain: FunctionalDomain;
  skillCode: string;
  skillDescription: string;

  // What to observe
  observationPrompt: string;
  materialsNeeded: string[];
  setupInstructions: string;

  // Recording options
  responseOptions: {
    level: FunctionalSkillLevel;
    description: string;
    behaviorIndicators: string[];
  }[];

  // Notes
  allowNotes: boolean;
  promptQuestions: string[];
}

/**
 * Assessment session configuration
 */
export interface LowFunctioningAssessmentConfig {
  assessmentMode: AssessmentMode;
  accommodations: AssessmentAccommodation[];

  // Domain selection
  domainsToAssess: FunctionalDomain[];

  // Question settings
  questionsPerDomain: number;
  questionFormat: LowFunctioningQuestionFormat;
  symbolSet: string;

  // Timing
  breakFrequency: number;
  breakDurationSeconds: number;
  noTimeLimits: boolean;

  // Input
  inputMethod: string;
  touchTargetMultiplier: number;
  dwellTimeMs?: number;
  scanSpeedMs?: number;

  // Support
  partnerAssisted: boolean;
  readAloudEnabled: boolean;
  audioDescriptionsEnabled: boolean;

  // Visual
  highContrast: boolean;
  reducedStimuli: boolean;
  calmColorPalette: boolean;
}

/**
 * Assessment session state
 */
export interface LowFunctioningAssessmentState {
  sessionId: string;
  learnerId: string;
  config: LowFunctioningAssessmentConfig;

  // Progress
  currentDomainIndex: number;
  currentQuestionIndex: number;
  totalQuestionsAnswered: number;

  // Responses
  responses: LowFunctioningResponse[];

  // Breaks
  lastBreakAt: number;
  breaksTaken: number;

  // Timing
  startedAt: Date;
  lastActivityAt: Date;

  // Status
  status: 'IN_PROGRESS' | 'PAUSED' | 'BREAK' | 'COMPLETED' | 'ABANDONED';
}

export interface LowFunctioningResponse {
  questionId: string;
  domain: FunctionalDomain;
  skillCode: string;

  // Response
  selectedOptionIndex: number | null;
  isCorrect: boolean | null; // null for observational

  // Observational scoring (if applicable)
  observedLevel?: FunctionalSkillLevel;
  partnerNotes?: string;

  // Engagement metrics
  timeToRespondMs: number | null;
  attentionLevel: 'engaged' | 'distracted' | 'refusing' | 'unknown';
  promptingRequired: 'none' | 'verbal' | 'gestural' | 'physical' | 'full_physical';

  // Timestamps
  presentedAt: Date;
  respondedAt: Date | null;
}

/**
 * Assessment results for low-functioning assessment
 */
export interface LowFunctioningAssessmentResults {
  sessionId: string;
  learnerId: string;
  completedAt: Date;

  // Domain scores
  domainResults: {
    domain: FunctionalDomain;
    skillLevel: FunctionalSkillLevel;
    confidence: number;
    questionsAnswered: number;
    correctCount: number;
    engagementScore: number;
    promptingLevel: string;
    notes: string[];
  }[];

  // Overall profile
  overallFunctionalLevel: FunctionalSkillLevel;
  overallConfidence: number;

  // Recommendations
  recommendations: {
    domain: FunctionalDomain;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
  }[];

  // Session metrics
  sessionMetrics: {
    totalDurationMinutes: number;
    breaksTaken: number;
    averageResponseTimeSeconds: number;
    engagementPercentage: number;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// LOW-FUNCTIONING ASSESSMENT SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class LowFunctioningAssessmentService {
  /**
   * Create assessment configuration based on mode and accommodations
   */
  createAssessmentConfig(
    mode: AssessmentMode,
    accommodations: AssessmentAccommodation[],
    options?: {
      preferredSymbolSet?: string;
      preferredDomains?: FunctionalDomain[];
    }
  ): LowFunctioningAssessmentConfig {
    // Default domains based on mode
    const defaultDomains: FunctionalDomain[] =
      mode === 'OBSERVATIONAL'
        ? [
            'RECEPTIVE_COMMUNICATION',
            'EXPRESSIVE_COMMUNICATION',
            'ATTENTION_ENGAGEMENT',
            'CAUSE_EFFECT',
            'CHOICE_MAKING',
          ]
        : [
            'VISUAL_DISCRIMINATION',
            'CHOICE_MAKING',
            'CAUSE_EFFECT',
            'BASIC_CONCEPTS',
            'RECEPTIVE_COMMUNICATION',
          ];

    // Find accommodations
    const getAccommodation = (type: string) => accommodations.find((a) => a.type === type);

    const switchAccess = getAccommodation('SWITCH_ACCESS');
    const eyeGaze = getAccommodation('EYE_GAZE');
    const largeTargets = getAccommodation('LARGE_TOUCH_TARGETS');
    const pictureSymbols = getAccommodation('PICTURE_SYMBOLS');
    const frequentBreaks = getAccommodation('FREQUENT_BREAKS');
    const contentFilters = getAccommodation('CONTENT_FILTERS');
    const audioDesc = getAccommodation('AUDIO_DESCRIPTIONS');

    // Determine question format
    let questionFormat: LowFunctioningQuestionFormat = 'PICTURE_TOUCH';
    if (mode === 'OBSERVATIONAL') {
      questionFormat = 'PARTNER_OBSERVATION';
    } else if (switchAccess) {
      questionFormat = 'CHOICE_BETWEEN_TWO';
    } else if (eyeGaze) {
      questionFormat = 'LOOK_GAZE';
    }

    // Determine input settings
    let inputMethod = 'STANDARD';
    let touchTargetMultiplier = 1;
    let dwellTimeMs: number | undefined;
    let scanSpeedMs: number | undefined;

    if (largeTargets) {
      touchTargetMultiplier =
        (largeTargets.settings as { sizeMultiplier?: number }).sizeMultiplier ?? 2;
    }

    if (switchAccess) {
      inputMethod =
        (switchAccess.settings as { switchCount?: number }).switchCount === 1
          ? 'SWITCH_SINGLE'
          : 'SWITCH_DUAL';
      scanSpeedMs = (switchAccess.settings as { scanSpeed?: number }).scanSpeed ?? 1500;
    }

    if (eyeGaze) {
      inputMethod = 'EYE_GAZE';
      dwellTimeMs = (eyeGaze.settings as { dwellTime?: number }).dwellTime ?? 1500;
    }

    // Break settings
    let breakFrequency = 10;
    let breakDurationSeconds = 60;

    if (frequentBreaks) {
      breakFrequency =
        (frequentBreaks.settings as { questionsBeforeBreak?: number }).questionsBeforeBreak ?? 5;
      breakDurationSeconds =
        (frequentBreaks.settings as { breakDurationSeconds?: number }).breakDurationSeconds ?? 60;
    }

    // Visual settings
    const avoidBusy =
      contentFilters?.settings &&
      (contentFilters.settings as { avoidBusyVisuals?: boolean }).avoidBusyVisuals;

    const config: LowFunctioningAssessmentConfig = {
      assessmentMode: mode,
      accommodations,
      domainsToAssess: options?.preferredDomains ?? defaultDomains,
      questionsPerDomain: mode === 'OBSERVATIONAL' ? 3 : 5,
      questionFormat,
      symbolSet:
        options?.preferredSymbolSet ??
        (pictureSymbols?.settings as { symbolSet?: string }).symbolSet ??
        'PCS',
      breakFrequency,
      breakDurationSeconds,
      noTimeLimits: true,
      inputMethod,
      touchTargetMultiplier,
      dwellTimeMs,
      scanSpeedMs,
      partnerAssisted: mode === 'OBSERVATIONAL' || mode === 'SUPPORTED',
      readAloudEnabled: true,
      audioDescriptionsEnabled: audioDesc !== undefined,
      highContrast: false,
      reducedStimuli: avoidBusy ?? true,
      calmColorPalette: true,
    };

    console.log('[low-functioning-assessment] assessment_config_created', {
      mode,
      domainsCount: config.domainsToAssess.length,
      questionFormat: config.questionFormat,
      inputMethod: config.inputMethod,
    });

    return config;
  }

  /**
   * Generate questions for a functional domain
   */
  generateDomainQuestions(
    domain: FunctionalDomain,
    config: LowFunctioningAssessmentConfig
  ): LowFunctioningQuestion[] {
    const questionBank = this.getQuestionBank(domain, config.symbolSet);

    // Select questions based on format and count
    const filtered = questionBank.filter((q) => this.isQuestionCompatible(q, config));

    // Start with easiest, progress based on responses (handled at runtime)
    const sorted = [...filtered].sort((a, b) => a.difficultyLevel - b.difficultyLevel);

    return sorted.slice(0, config.questionsPerDomain);
  }

  /**
   * Generate observational items for partner-assisted mode
   */
  generateObservationalItems(domain: FunctionalDomain): ObservationalItem[] {
    return OBSERVATIONAL_ITEM_BANK[domain] ?? [];
  }

  /**
   * Check if a question is compatible with the assessment configuration
   */
  private isQuestionCompatible(
    question: LowFunctioningQuestion,
    config: LowFunctioningAssessmentConfig
  ): boolean {
    // Check format compatibility
    if (config.questionFormat === 'PARTNER_OBSERVATION') {
      return question.requiresPartnerAssist;
    }

    if (config.inputMethod === 'SWITCH_SINGLE' || config.inputMethod === 'SWITCH_DUAL') {
      // Switch access works best with 2-4 options
      return question.options.length <= 4;
    }

    if (config.inputMethod === 'EYE_GAZE') {
      // Eye gaze works best with widely spaced options
      return question.options.length <= 4;
    }

    return true;
  }

  /**
   * Get question bank for a domain
   */
  private getQuestionBank(domain: FunctionalDomain, symbolSet: string): LowFunctioningQuestion[] {
    // This would typically load from database or content service
    // For now, returning structured template
    return (
      QUESTION_TEMPLATES[domain]?.map((template, index) => ({
        ...template,
        id: `${domain.toLowerCase()}-${index + 1}`,
        options: template.options.map((opt, optIndex) => ({
          ...opt,
          id: `${domain.toLowerCase()}-${index + 1}-opt-${optIndex}`,
          symbolSet,
        })),
      })) ?? []
    );
  }

  /**
   * Calculate functional skill level from responses
   */
  calculateSkillLevel(
    responses: LowFunctioningResponse[],
    domain: FunctionalDomain
  ): { level: FunctionalSkillLevel; confidence: number } {
    const domainResponses = responses.filter((r) => r.domain === domain);

    if (domainResponses.length === 0) {
      return { level: 'NOT_DEMONSTRATED', confidence: 0 };
    }

    // For observational responses
    const observationalResponses = domainResponses.filter((r) => r.observedLevel !== undefined);
    if (observationalResponses.length > 0) {
      // Average the observed levels
      const levelValues: Record<FunctionalSkillLevel, number> = {
        NOT_DEMONSTRATED: 0,
        EMERGING: 1,
        DEVELOPING: 2,
        APPROACHING: 3,
        ACHIEVED: 4,
        GENERALIZED: 5,
      };

      const levels = [
        'NOT_DEMONSTRATED',
        'EMERGING',
        'DEVELOPING',
        'APPROACHING',
        'ACHIEVED',
        'GENERALIZED',
      ] as FunctionalSkillLevel[];

      const avgValue =
        observationalResponses.reduce(
          (sum, r) => sum + levelValues[r.observedLevel ?? 'NOT_DEMONSTRATED'],
          0
        ) / observationalResponses.length;

      const levelIndex = Math.round(avgValue);
      const confidence = observationalResponses.length / 3; // Max confidence at 3 observations

      return {
        level: levels[levelIndex],
        confidence: Math.min(1, confidence),
      };
    }

    // For interactive responses
    const answered = domainResponses.filter((r) => r.selectedOptionIndex !== null);
    const correct = answered.filter((r) => r.isCorrect);

    if (answered.length === 0) {
      return { level: 'NOT_DEMONSTRATED', confidence: 0.3 };
    }

    const accuracy = correct.length / answered.length;
    const confidence = Math.min(1, answered.length / 5);

    // Map accuracy to skill level
    let level: FunctionalSkillLevel;
    if (accuracy >= 0.9) {
      level = 'GENERALIZED';
    } else if (accuracy >= 0.75) {
      level = 'ACHIEVED';
    } else if (accuracy >= 0.6) {
      level = 'APPROACHING';
    } else if (accuracy >= 0.4) {
      level = 'DEVELOPING';
    } else if (accuracy >= 0.2) {
      level = 'EMERGING';
    } else {
      level = 'NOT_DEMONSTRATED';
    }

    // Adjust for prompting levels
    const promptingAdjustment = this.calculatePromptingAdjustment(domainResponses);
    if (promptingAdjustment < 0 && level !== 'NOT_DEMONSTRATED') {
      const levels: FunctionalSkillLevel[] = [
        'NOT_DEMONSTRATED',
        'EMERGING',
        'DEVELOPING',
        'APPROACHING',
        'ACHIEVED',
        'GENERALIZED',
      ];
      const currentIndex = levels.indexOf(level);
      const newIndex = Math.max(0, currentIndex + promptingAdjustment);
      level = levels[newIndex];
    }

    return { level, confidence };
  }

  /**
   * Calculate adjustment based on prompting required
   */
  private calculatePromptingAdjustment(responses: LowFunctioningResponse[]): number {
    const promptingCounts = {
      none: 0,
      verbal: 0,
      gestural: 0,
      physical: 0,
      full_physical: 0,
    };

    for (const r of responses) {
      promptingCounts[r.promptingRequired]++;
    }

    const total = responses.length;
    if (total === 0) return 0;

    // Heavy prompting lowers the skill level
    const physicalRatio = (promptingCounts.physical + promptingCounts.full_physical) / total;
    const gesturalRatio = promptingCounts.gestural / total;

    if (physicalRatio > 0.5) return -2;
    if (physicalRatio > 0.25 || gesturalRatio > 0.5) return -1;

    return 0;
  }

  /**
   * Generate assessment results
   */
  generateResults(state: LowFunctioningAssessmentState): LowFunctioningAssessmentResults {
    const domainResults = state.config.domainsToAssess.map((domain) => {
      const domainResponses = state.responses.filter((r) => r.domain === domain);
      const { level, confidence } = this.calculateSkillLevel(domainResponses, domain);

      const engaged = domainResponses.filter((r) => r.attentionLevel === 'engaged').length;
      const engagementScore = domainResponses.length > 0 ? engaged / domainResponses.length : 0;

      const correctCount = domainResponses.filter((r) => r.isCorrect === true).length;

      // Most common prompting level
      const promptingCounts: Record<string, number> = {};
      for (const r of domainResponses) {
        promptingCounts[r.promptingRequired] = (promptingCounts[r.promptingRequired] ?? 0) + 1;
      }
      const promptingLevel =
        Object.entries(promptingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';

      const notes = domainResponses
        .filter((r): r is typeof r & { partnerNotes: string } => r.partnerNotes != null)
        .map((r) => r.partnerNotes);

      return {
        domain,
        skillLevel: level,
        confidence,
        questionsAnswered: domainResponses.length,
        correctCount,
        engagementScore,
        promptingLevel,
        notes,
      };
    });

    // Calculate overall level
    const levelValues: Record<FunctionalSkillLevel, number> = {
      NOT_DEMONSTRATED: 0,
      EMERGING: 1,
      DEVELOPING: 2,
      APPROACHING: 3,
      ACHIEVED: 4,
      GENERALIZED: 5,
    };
    const levels: FunctionalSkillLevel[] = [
      'NOT_DEMONSTRATED',
      'EMERGING',
      'DEVELOPING',
      'APPROACHING',
      'ACHIEVED',
      'GENERALIZED',
    ];

    const avgLevel =
      domainResults.reduce((sum, dr) => sum + levelValues[dr.skillLevel] * dr.confidence, 0) /
      Math.max(
        1,
        domainResults.reduce((sum, dr) => sum + dr.confidence, 0)
      );

    const overallFunctionalLevel = levels[Math.round(avgLevel)];
    const overallConfidence =
      domainResults.reduce((sum, dr) => sum + dr.confidence, 0) / domainResults.length;

    // Generate recommendations
    const recommendations = this.generateRecommendations(domainResults);

    // Session metrics
    const durationMs = state.lastActivityAt.getTime() - state.startedAt.getTime();
    const totalDurationMinutes = durationMs / 60000;

    const responseTimes = state.responses
      .filter((r): r is typeof r & { timeToRespondMs: number } => r.timeToRespondMs != null)
      .map((r) => r.timeToRespondMs);
    const averageResponseTimeSeconds =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 1000
        : 0;

    const engagedResponses = state.responses.filter((r) => r.attentionLevel === 'engaged').length;
    const engagementPercentage =
      state.responses.length > 0 ? (engagedResponses / state.responses.length) * 100 : 0;

    return {
      sessionId: state.sessionId,
      learnerId: state.learnerId,
      completedAt: new Date(),
      domainResults,
      overallFunctionalLevel,
      overallConfidence,
      recommendations,
      sessionMetrics: {
        totalDurationMinutes,
        breaksTaken: state.breaksTaken,
        averageResponseTimeSeconds,
        engagementPercentage,
      },
    };
  }

  /**
   * Generate personalized recommendations based on results
   */
  private generateRecommendations(
    domainResults: LowFunctioningAssessmentResults['domainResults']
  ): LowFunctioningAssessmentResults['recommendations'] {
    const recommendations: LowFunctioningAssessmentResults['recommendations'] = [];

    for (const result of domainResults) {
      if (result.skillLevel === 'NOT_DEMONSTRATED' || result.skillLevel === 'EMERGING') {
        recommendations.push({
          domain: result.domain,
          recommendation:
            DOMAIN_RECOMMENDATIONS[result.domain]?.priority ??
            `Focus on foundational ${result.domain.toLowerCase().replaceAll('_', ' ')} skills with high support.`,
          priority: 'high',
        });
      } else if (result.skillLevel === 'DEVELOPING') {
        recommendations.push({
          domain: result.domain,
          recommendation:
            DOMAIN_RECOMMENDATIONS[result.domain]?.developing ??
            `Continue building ${result.domain.toLowerCase().replaceAll('_', ' ')} with structured practice.`,
          priority: 'medium',
        });
      }

      if (result.engagementScore < 0.5) {
        recommendations.push({
          domain: result.domain,
          recommendation: `Engagement was low for ${result.domain.toLowerCase().replaceAll('_', ' ')}. Consider more motivating activities or shorter sessions.`,
          priority: 'medium',
        });
      }
    }

    return recommendations;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// QUESTION TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

const QUESTION_TEMPLATES: Partial<Record<FunctionalDomain, Omit<LowFunctioningQuestion, 'id'>[]>> =
  {
    VISUAL_DISCRIMINATION: [
      {
        domain: 'VISUAL_DISCRIMINATION',
        skillCode: 'VD_MATCH_IDENTICAL',
        skillDescription: 'Match identical pictures',
        format: 'PICTURE_MATCH',
        prompt: {
          type: 'image',
          content: '/symbols/apple.png',
          audioDescription: 'Find the same picture. Look at the apple.',
        },
        options: [
          {
            id: 'vd-mi-1',
            type: 'image',
            content: '/symbols/apple.png',
            audioLabel: 'Apple',
            touchTargetSize: 'extra_large',
          },
          {
            id: 'vd-mi-2',
            type: 'image',
            content: '/symbols/banana.png',
            audioLabel: 'Banana',
            touchTargetSize: 'extra_large',
          },
        ],
        correctOptionIndex: 0,
        difficultyLevel: 1,
        requiresPartnerAssist: false,
        adaptations: ['high_contrast', 'large_images'],
        noTimeLimit: true,
      },
      {
        domain: 'VISUAL_DISCRIMINATION',
        skillCode: 'VD_MATCH_COLOR',
        skillDescription: 'Match by color',
        format: 'PICTURE_MATCH',
        prompt: {
          type: 'image',
          content: '/symbols/red_circle.png',
          audioDescription: 'Find the same color. Look at the red circle.',
        },
        options: [
          {
            id: 'vd-mc-1',
            type: 'image',
            content: '/symbols/red_square.png',
            audioLabel: 'Red',
            touchTargetSize: 'extra_large',
          },
          {
            id: 'vd-mc-2',
            type: 'image',
            content: '/symbols/blue_square.png',
            audioLabel: 'Blue',
            touchTargetSize: 'extra_large',
          },
        ],
        correctOptionIndex: 0,
        difficultyLevel: 2,
        requiresPartnerAssist: false,
        adaptations: ['high_contrast'],
        noTimeLimit: true,
      },
    ],
    CHOICE_MAKING: [
      {
        domain: 'CHOICE_MAKING',
        skillCode: 'CM_INDICATE_WANT',
        skillDescription: 'Indicate a want between two items',
        format: 'CHOICE_BETWEEN_TWO',
        prompt: {
          type: 'audio',
          content: 'Which one do you want?',
          audioDescription: 'Choose which one you want.',
        },
        options: [
          {
            id: 'cm-iw-1',
            type: 'symbol',
            content: '/symbols/pcs/cookie.png',
            audioLabel: 'Cookie',
            touchTargetSize: 'extra_large',
          },
          {
            id: 'cm-iw-2',
            type: 'symbol',
            content: '/symbols/pcs/drink.png',
            audioLabel: 'Drink',
            touchTargetSize: 'extra_large',
          },
        ],
        correctOptionIndex: -1, // Any choice is valid
        difficultyLevel: 1,
        requiresPartnerAssist: false,
        adaptations: ['motivating_items'],
        noTimeLimit: true,
      },
    ],
    CAUSE_EFFECT: [
      {
        domain: 'CAUSE_EFFECT',
        skillCode: 'CE_TOUCH_ACTIVATE',
        skillDescription: 'Touch to cause an effect',
        format: 'CAUSE_EFFECT_ACTIVATION',
        prompt: {
          type: 'audio',
          content: 'Touch the button to see what happens!',
          audioDescription: 'Touch the big button.',
        },
        options: [
          {
            id: 'ce-ta-1',
            type: 'symbol',
            content: '/symbols/big_button.png',
            audioLabel: 'Button',
            touchTargetSize: 'extra_large',
          },
        ],
        correctOptionIndex: 0,
        difficultyLevel: 1,
        requiresPartnerAssist: false,
        adaptations: ['animation_reward', 'sound_reward'],
        noTimeLimit: true,
      },
    ],
    RECEPTIVE_COMMUNICATION: [
      {
        domain: 'RECEPTIVE_COMMUNICATION',
        skillCode: 'RC_IDENTIFY_OBJECT',
        skillDescription: 'Identify named object',
        format: 'PICTURE_TOUCH',
        prompt: {
          type: 'audio',
          content: 'Show me the ball',
          audioDescription: 'Touch the ball.',
        },
        options: [
          {
            id: 'rc-io-1',
            type: 'image',
            content: '/symbols/ball.png',
            audioLabel: 'Ball',
            touchTargetSize: 'extra_large',
          },
          {
            id: 'rc-io-2',
            type: 'image',
            content: '/symbols/cup.png',
            audioLabel: 'Cup',
            touchTargetSize: 'extra_large',
          },
        ],
        correctOptionIndex: 0,
        difficultyLevel: 1,
        requiresPartnerAssist: false,
        adaptations: ['repeat_prompt'],
        noTimeLimit: true,
      },
    ],
    BASIC_CONCEPTS: [
      {
        domain: 'BASIC_CONCEPTS',
        skillCode: 'BC_BIG_SMALL',
        skillDescription: 'Identify big vs small',
        format: 'PICTURE_TOUCH',
        prompt: {
          type: 'audio',
          content: 'Touch the BIG one',
          audioDescription: 'Find the big one.',
        },
        options: [
          {
            id: 'bc-bs-1',
            type: 'image',
            content: '/symbols/big_bear.png',
            audioLabel: 'Big bear',
            touchTargetSize: 'extra_large',
          },
          {
            id: 'bc-bs-2',
            type: 'image',
            content: '/symbols/small_bear.png',
            audioLabel: 'Small bear',
            touchTargetSize: 'extra_large',
          },
        ],
        correctOptionIndex: 0,
        difficultyLevel: 1,
        requiresPartnerAssist: false,
        adaptations: ['size_emphasis'],
        noTimeLimit: true,
      },
    ],
  };

// ══════════════════════════════════════════════════════════════════════════════
// OBSERVATIONAL ITEM BANK
// ══════════════════════════════════════════════════════════════════════════════

const OBSERVATIONAL_ITEM_BANK: Partial<Record<FunctionalDomain, ObservationalItem[]>> = {
  ATTENTION_ENGAGEMENT: [
    {
      id: 'obs-ae-1',
      domain: 'ATTENTION_ENGAGEMENT',
      skillCode: 'AE_SUSTAIN_ATTENTION',
      skillDescription: 'Sustains attention to preferred activity',
      observationPrompt:
        'Present a preferred activity (e.g., favorite toy, video, or sensory item). Observe how long the learner attends.',
      materialsNeeded: ['Preferred item or activity', 'Timer'],
      setupInstructions: 'Place preferred item within reach. Start timer when learner engages.',
      responseOptions: [
        {
          level: 'NOT_DEMONSTRATED',
          description: 'Does not attend or attends for less than 10 seconds',
          behaviorIndicators: ['Looks away immediately', 'Does not engage with item'],
        },
        {
          level: 'EMERGING',
          description: 'Attends for 10-30 seconds with support',
          behaviorIndicators: ['Brief glances', 'Needs redirection'],
        },
        {
          level: 'DEVELOPING',
          description: 'Attends for 30-60 seconds',
          behaviorIndicators: ['Maintains gaze', 'Some interaction'],
        },
        {
          level: 'APPROACHING',
          description: 'Attends for 1-3 minutes',
          behaviorIndicators: ['Sustained engagement', 'Returns attention if distracted'],
        },
        {
          level: 'ACHIEVED',
          description: 'Attends for 3+ minutes independently',
          behaviorIndicators: ['Focused engagement', 'Self-redirects'],
        },
        {
          level: 'GENERALIZED',
          description: 'Attends across activities and settings',
          behaviorIndicators: ['Consistent attention', 'Generalizes to non-preferred'],
        },
      ],
      allowNotes: true,
      promptQuestions: [
        'What was the preferred activity?',
        'What distracted the learner (if anything)?',
      ],
    },
  ],
  EXPRESSIVE_COMMUNICATION: [
    {
      id: 'obs-ec-1',
      domain: 'EXPRESSIVE_COMMUNICATION',
      skillCode: 'EC_REQUEST_WANT',
      skillDescription: 'Requests a wanted item',
      observationPrompt:
        'Show a highly preferred item but keep it out of reach. Wait 10 seconds. Observe how the learner requests.',
      materialsNeeded: ['Highly preferred item', 'Communication system if applicable'],
      setupInstructions: 'Ensure learner sees the item. Wait for initiation before prompting.',
      responseOptions: [
        {
          level: 'NOT_DEMONSTRATED',
          description: 'Does not attempt to request',
          behaviorIndicators: ['No response', 'Ignores item'],
        },
        {
          level: 'EMERGING',
          description: 'Shows interest but no clear request',
          behaviorIndicators: ['Reaches', 'Cries or vocalizes without direction'],
        },
        {
          level: 'DEVELOPING',
          description: 'Uses basic gesture or vocalization',
          behaviorIndicators: ['Points', 'Looks at item and adult', 'Makes sound'],
        },
        {
          level: 'APPROACHING',
          description: 'Uses consistent method to request',
          behaviorIndicators: ['Uses AAC', 'Signs', 'Says word approximation'],
        },
        {
          level: 'ACHIEVED',
          description: 'Requests clearly and independently',
          behaviorIndicators: ['Clear word or symbol', 'Consistent across items'],
        },
        {
          level: 'GENERALIZED',
          description: 'Requests across people, settings, and items',
          behaviorIndicators: ['Requests from unfamiliar adults', 'Novel items'],
        },
      ],
      allowNotes: true,
      promptQuestions: [
        'What method did the learner use?',
        'How long did they wait before requesting?',
      ],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// DOMAIN RECOMMENDATIONS
// ══════════════════════════════════════════════════════════════════════════════

const DOMAIN_RECOMMENDATIONS: Partial<
  Record<FunctionalDomain, { priority: string; developing: string }>
> = {
  RECEPTIVE_COMMUNICATION: {
    priority:
      'Start with identifying 2-3 highly motivating items. Use consistent language and pair words with objects.',
    developing:
      'Expand vocabulary of understood words. Practice following simple 1-step directions.',
  },
  EXPRESSIVE_COMMUNICATION: {
    priority:
      'Establish a reliable communication method (AAC, signs, or pictures). Focus on requesting highly preferred items.',
    developing: 'Increase communication vocabulary. Practice requesting in different settings.',
  },
  VISUAL_DISCRIMINATION: {
    priority: 'Begin with matching identical real objects. Use high-contrast, familiar items.',
    developing: 'Progress to matching pictures to objects, then pictures to pictures.',
  },
  CAUSE_EFFECT: {
    priority:
      'Use simple cause-effect toys (buttons that make sounds, light-up toys). Make the effect immediate and motivating.',
    developing: 'Generalize cause-effect understanding to tablet/computer interactions.',
  },
  CHOICE_MAKING: {
    priority:
      'Start with two highly different choices (preferred vs non-preferred). Accept any clear indication.',
    developing: 'Practice choosing between two equally preferred items. Expand to 3-4 options.',
  },
  ATTENTION_ENGAGEMENT: {
    priority:
      'Build engagement through preferred activities. Gradually introduce brief learning moments during play.',
    developing:
      'Extend engagement time. Practice attention to less preferred but tolerated activities.',
  },
};

// Export singleton instance
export const lowFunctioningAssessmentService = new LowFunctioningAssessmentService();
