/**
 * Adaptive Difficulty Engine for Baseline Assessment
 *
 * Implements Item Response Theory (IRT) inspired adaptive question selection.
 * Adjusts difficulty level based on learner's recent performance to quickly
 * find the learner's true skill level.
 *
 * Key principles:
 * - Start at medium difficulty (level 3 of 5)
 * - Increase difficulty after consecutive correct answers
 * - Decrease difficulty after consecutive incorrect answers
 * - Track performance per domain for domain-specific adaptation
 *
 * @author AIVO Platform Team
 */

/**
 * Performance history for adaptive difficulty calculation
 */
interface PerformanceEntry {
  domain: string;
  skillCode: string;
  isCorrect: boolean;
  score: number;
  difficulty: number;
  timestamp: Date;
}

/**
 * Adaptive difficulty state per domain
 */
interface DomainState {
  currentDifficulty: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  totalQuestions: number;
  totalCorrect: number;
  estimatedAbility: number;
}

/**
 * Difficulty levels (1-5 scale)
 */
export const DIFFICULTY_LEVELS = {
  VERY_EASY: 1,
  EASY: 2,
  MEDIUM: 3,
  HARD: 4,
  VERY_HARD: 5,
} as const;

/**
 * Adaptive difficulty parameters
 */
const ADAPTIVE_CONFIG = {
  // Initial difficulty level
  INITIAL_DIFFICULTY: DIFFICULTY_LEVELS.MEDIUM,

  // Number of consecutive responses to trigger difficulty change
  STREAK_THRESHOLD: 2,

  // Difficulty adjustment step
  DIFFICULTY_STEP: 1,

  // Minimum and maximum difficulty
  MIN_DIFFICULTY: DIFFICULTY_LEVELS.VERY_EASY,
  MAX_DIFFICULTY: DIFFICULTY_LEVELS.VERY_HARD,

  // Partial credit threshold to count as "correct" for adaptation
  PARTIAL_CREDIT_THRESHOLD: 0.7,
};

/**
 * Adaptive Difficulty Engine
 */
export class AdaptiveDifficultyEngine {
  private performanceHistory: PerformanceEntry[] = [];
  private domainStates: Map<string, DomainState> = new Map();

  constructor() {
    // Initialize with default domains
    const domains = ['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL'];
    for (const domain of domains) {
      this.domainStates.set(domain, this.createInitialDomainState());
    }
  }

  /**
   * Create initial state for a domain
   */
  private createInitialDomainState(): DomainState {
    return {
      currentDifficulty: ADAPTIVE_CONFIG.INITIAL_DIFFICULTY,
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      estimatedAbility: 0.5, // Start at 50th percentile
    };
  }

  /**
   * Get the recommended difficulty for the next question in a domain
   */
  getDifficulty(domain: string): number {
    const state = this.domainStates.get(domain);
    if (!state) {
      return ADAPTIVE_CONFIG.INITIAL_DIFFICULTY;
    }
    return state.currentDifficulty;
  }

  /**
   * Record a response and update difficulty
   */
  recordResponse(params: {
    domain: string;
    skillCode: string;
    isCorrect: boolean;
    score: number | null;
    difficulty: number;
  }): void {
    const { domain, skillCode, isCorrect, score, difficulty } = params;

    // Record in history
    this.performanceHistory.push({
      domain,
      skillCode,
      isCorrect,
      score: score ?? (isCorrect ? 1 : 0),
      difficulty,
      timestamp: new Date(),
    });

    // Get or create domain state
    let state = this.domainStates.get(domain);
    if (!state) {
      state = this.createInitialDomainState();
      this.domainStates.set(domain, state);
    }

    // Determine if response is "good enough" for adaptation
    const effectiveCorrect =
      isCorrect ||
      (score !== null && score >= ADAPTIVE_CONFIG.PARTIAL_CREDIT_THRESHOLD);

    // Update counters
    state.totalQuestions++;
    if (effectiveCorrect) {
      state.totalCorrect++;
      state.consecutiveCorrect++;
      state.consecutiveIncorrect = 0;
    } else {
      state.consecutiveIncorrect++;
      state.consecutiveCorrect = 0;
    }

    // Adapt difficulty based on streaks
    if (state.consecutiveCorrect >= ADAPTIVE_CONFIG.STREAK_THRESHOLD) {
      // Increase difficulty
      state.currentDifficulty = Math.min(
        state.currentDifficulty + ADAPTIVE_CONFIG.DIFFICULTY_STEP,
        ADAPTIVE_CONFIG.MAX_DIFFICULTY
      );
      state.consecutiveCorrect = 0; // Reset streak
    } else if (state.consecutiveIncorrect >= ADAPTIVE_CONFIG.STREAK_THRESHOLD) {
      // Decrease difficulty
      state.currentDifficulty = Math.max(
        state.currentDifficulty - ADAPTIVE_CONFIG.DIFFICULTY_STEP,
        ADAPTIVE_CONFIG.MIN_DIFFICULTY
      );
      state.consecutiveIncorrect = 0; // Reset streak
    }

    // Update ability estimate using simple ELO-like formula
    this.updateAbilityEstimate(state, effectiveCorrect, difficulty);
  }

  /**
   * Update ability estimate based on response
   * Uses an ELO-inspired formula adapted for educational assessment
   */
  private updateAbilityEstimate(
    state: DomainState,
    correct: boolean,
    difficulty: number
  ): void {
    // K-factor: how much each response affects the estimate
    const kFactor = 0.15;

    // Expected probability based on current ability vs difficulty
    // difficulty is 1-5, ability is 0-1; map difficulty to 0-1 scale
    const normalizedDifficulty = (difficulty - 1) / 4;
    const expectedCorrect = 1 / (1 + Math.exp(5 * (normalizedDifficulty - state.estimatedAbility)));

    // Actual result (1 or 0)
    const actual = correct ? 1 : 0;

    // Update estimate
    state.estimatedAbility = Math.max(
      0,
      Math.min(1, state.estimatedAbility + kFactor * (actual - expectedCorrect))
    );
  }

  /**
   * Get performance summary for a domain
   */
  getDomainSummary(domain: string): {
    difficulty: number;
    questionsAnswered: number;
    correctCount: number;
    accuracy: number;
    estimatedAbility: number;
  } {
    const state = this.domainStates.get(domain);
    if (!state) {
      return {
        difficulty: ADAPTIVE_CONFIG.INITIAL_DIFFICULTY,
        questionsAnswered: 0,
        correctCount: 0,
        accuracy: 0,
        estimatedAbility: 0.5,
      };
    }

    return {
      difficulty: state.currentDifficulty,
      questionsAnswered: state.totalQuestions,
      correctCount: state.totalCorrect,
      accuracy: state.totalQuestions > 0 ? state.totalCorrect / state.totalQuestions : 0,
      estimatedAbility: state.estimatedAbility,
    };
  }

  /**
   * Get all domain summaries
   */
  getAllDomainSummaries(): Record<string, ReturnType<AdaptiveDifficultyEngine['getDomainSummary']>> {
    const summaries: Record<string, ReturnType<AdaptiveDifficultyEngine['getDomainSummary']>> = {};
    for (const domain of this.domainStates.keys()) {
      summaries[domain] = this.getDomainSummary(domain);
    }
    return summaries;
  }

  /**
   * Get estimated skill levels based on adaptive assessment
   * Returns 0-10 scale levels suitable for Virtual Brain initialization
   */
  getEstimatedSkillLevels(): Map<string, number> {
    const estimates = new Map<string, number>();

    for (const [domain, state] of this.domainStates) {
      // Convert 0-1 ability to 0-10 scale
      estimates.set(domain, state.estimatedAbility * 10);
    }

    return estimates;
  }

  /**
   * Calculate confidence in the estimates based on number of questions
   */
  getEstimateConfidence(domain: string): number {
    const state = this.domainStates.get(domain);
    if (!state || state.totalQuestions === 0) {
      return 0;
    }

    // Confidence increases with more questions, caps at 0.95
    // 5 questions = ~0.75 confidence, 10 questions = ~0.90 confidence
    const confidence = 1 - Math.exp(-state.totalQuestions / 5);
    return Math.min(0.95, confidence);
  }

  /**
   * Serialize state for persistence
   */
  serialize(): string {
    return JSON.stringify({
      performanceHistory: this.performanceHistory,
      domainStates: Object.fromEntries(this.domainStates),
    });
  }

  /**
   * Restore state from serialized data
   */
  static deserialize(data: string): AdaptiveDifficultyEngine {
    const engine = new AdaptiveDifficultyEngine();
    try {
      const parsed = JSON.parse(data) as {
        performanceHistory: PerformanceEntry[];
        domainStates: Record<string, DomainState>;
      };
      engine.performanceHistory = parsed.performanceHistory;
      engine.domainStates = new Map(Object.entries(parsed.domainStates));
    } catch {
      // Return fresh engine if deserialization fails
    }
    return engine;
  }
}

// Engine instances per attempt (in-memory cache)
const attemptEngines = new Map<string, AdaptiveDifficultyEngine>();

/**
 * Get or create an adaptive engine for an attempt
 */
export function getAdaptiveEngine(attemptId: string): AdaptiveDifficultyEngine {
  let engine = attemptEngines.get(attemptId);
  if (!engine) {
    engine = new AdaptiveDifficultyEngine();
    attemptEngines.set(attemptId, engine);
  }
  return engine;
}

/**
 * Clear an adaptive engine (when attempt is completed)
 */
export function clearAdaptiveEngine(attemptId: string): void {
  attemptEngines.delete(attemptId);
}

/**
 * Get adaptive difficulty summary for an attempt
 */
export function getAttemptAdaptiveSummary(attemptId: string): ReturnType<AdaptiveDifficultyEngine['getAllDomainSummaries']> | null {
  const engine = attemptEngines.get(attemptId);
  if (!engine) {
    return null;
  }
  return engine.getAllDomainSummaries();
}
