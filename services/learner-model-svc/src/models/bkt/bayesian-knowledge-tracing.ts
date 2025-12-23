/**
 * Bayesian Knowledge Tracing (BKT) Implementation
 *
 * BKT models student knowledge as a hidden Markov model with four parameters:
 * - P(L₀): Prior probability of knowing the skill before any practice
 * - P(T):  Probability of learning the skill after each opportunity (transition)
 * - P(G):  Probability of guessing correctly without knowing (guess)
 * - P(S):  Probability of making a mistake despite knowing (slip)
 *
 * References:
 * - Corbett, A.T. & Anderson, J.R. (1994). Knowledge tracing: Modeling the acquisition of procedural knowledge
 * - Baker, R.S., Corbett, A.T., & Aleven, V. (2008). More Accurate Student Modeling through Contextual Estimation
 * - Pardos, Z.A. & Heffernan, N.T. (2010). Modeling Individualization in a Bayesian Networks Implementation of Knowledge Tracing
 */

import type {
  BKTParameters,
  KnowledgeState,
  PracticeOutcome,
  ForwardBackwardResult,
  NeurodiverseProfile,
  PersonalizedBKTConfig,
} from './types.js';

/**
 * Default BKT parameters based on research literature
 */
export const DEFAULT_BKT_PARAMS: BKTParameters = {
  pInit: 0.0, // Assume no prior knowledge
  pLearn: 0.1, // 10% chance of learning per opportunity
  pGuess: 0.2, // 20% chance of guessing correctly
  pSlip: 0.1, // 10% chance of careless error
};

/**
 * Bayesian Knowledge Tracer - Core implementation
 *
 * This class provides:
 * - Knowledge state updates using Bayesian inference
 * - Performance prediction
 * - Mastery detection
 * - Time-to-mastery estimation
 * - Parameter fitting via Expectation-Maximization (EM)
 */
export class BayesianKnowledgeTracer {
  private readonly MASTERY_THRESHOLD: number;
  private readonly MIN_OBSERVATIONS_FOR_CONFIDENCE: number;

  constructor(
    private readonly skillParams: Map<string, BKTParameters> = new Map(),
    private readonly config: Partial<PersonalizedBKTConfig> = {}
  ) {
    this.MASTERY_THRESHOLD = config.masteryThreshold ?? 0.95;
    this.MIN_OBSERVATIONS_FOR_CONFIDENCE = config.minObservationsForConfidence ?? 5;
  }

  /**
   * Update knowledge state after a practice outcome
   * Uses Bayesian update rule for hidden Markov model
   *
   * @param currentState - Current knowledge state
   * @param outcome - Practice outcome (correct/incorrect)
   * @param params - Optional skill-specific BKT parameters
   * @returns Updated knowledge state
   */
  updateKnowledge(
    currentState: KnowledgeState,
    outcome: PracticeOutcome,
    params?: BKTParameters
  ): KnowledgeState {
    const p = params ?? this.getParams(outcome.skillId);
    const pL = currentState.pMastery;

    // Calculate P(Lₙ | observation) using Bayes' rule
    let pLGivenObs: number;

    if (outcome.correct) {
      // P(Lₙ | correct) = P(correct | Lₙ) * P(Lₙ) / P(correct)
      // P(correct) = P(Lₙ)(1 - P(S)) + (1 - P(Lₙ))P(G)
      const pCorrect = pL * (1 - p.pSlip) + (1 - pL) * p.pGuess;
      pLGivenObs = (pL * (1 - p.pSlip)) / pCorrect;
    } else {
      // P(Lₙ | incorrect) = P(incorrect | Lₙ) * P(Lₙ) / P(incorrect)
      const pIncorrect = pL * p.pSlip + (1 - pL) * (1 - p.pGuess);
      pLGivenObs = (pL * p.pSlip) / pIncorrect;
    }

    // Apply learning transition: P(Lₙ₊₁) = P(Lₙ | obs) + (1 - P(Lₙ | obs)) * P(T)
    const pLNext = pLGivenObs + (1 - pLGivenObs) * p.pLearn;

    // Clamp to valid probability range
    const newPMastery = Math.max(0.001, Math.min(0.999, pLNext));

    // Update statistics
    const newOpportunities = currentState.opportunities + 1;
    const newCorrect = currentState.correct + (outcome.correct ? 1 : 0);

    // Calculate trend (requires at least 3 observations)
    const trend = this.calculateTrend(currentState.pMastery, newPMastery, newOpportunities);

    // Estimate attempts to mastery
    const estimatedAttemptsToMastery = this.estimateAttemptsToMastery(
      newPMastery,
      p,
      this.MASTERY_THRESHOLD
    );

    // Calculate confidence based on number of observations
    const confidence = Math.min(1, newOpportunities / this.MIN_OBSERVATIONS_FOR_CONFIDENCE);

    return {
      pMastery: newPMastery,
      opportunities: newOpportunities,
      correct: newCorrect,
      estimatedAttemptsToMastery,
      confidence,
      trend,
      updatedAt: new Date(),
    };
  }

  /**
   * Update knowledge with contextual factors (response time, hints, attempts)
   * Based on Baker et al. (2008) contextual estimation approach
   *
   * @param currentState - Current knowledge state
   * @param outcome - Practice outcome with contextual data
   * @param params - Optional skill-specific BKT parameters
   * @returns Updated knowledge state with contextual adjustments
   */
  updateKnowledgeWithContext(
    currentState: KnowledgeState,
    outcome: PracticeOutcome,
    params?: BKTParameters
  ): KnowledgeState {
    const p = params ?? this.getParams(outcome.skillId);
    const adjustedParams = this.adjustParamsForContext(p, outcome);

    return this.updateKnowledge(currentState, outcome, adjustedParams);
  }

  /**
   * Adjust BKT parameters based on contextual factors
   * Fast responses on correct answers suggest less guessing
   * Many hints suggest more guessing on correct answers
   */
  private adjustParamsForContext(params: BKTParameters, outcome: PracticeOutcome): BKTParameters {
    let adjustedGuess = params.pGuess;
    let adjustedSlip = params.pSlip;

    // Response time adjustments
    if (outcome.responseTime !== undefined) {
      const timeMultiplier = this.config.timeMultiplier ?? 1.0;
      const fastThreshold = 3000 * timeMultiplier; // 3 seconds
      const slowThreshold = 30000 * timeMultiplier; // 30 seconds

      if (outcome.correct) {
        // Fast correct response: less likely to be a guess
        if (outcome.responseTime < fastThreshold) {
          adjustedGuess = params.pGuess * 0.5; // Reduce guess probability
        }
        // Slow correct response: might indicate struggle then learning
        if (outcome.responseTime > slowThreshold) {
          adjustedGuess = params.pGuess * 1.2; // Slightly increase guess probability
        }
      } else {
        // Fast incorrect: might be careless
        if (outcome.responseTime < fastThreshold) {
          adjustedSlip = params.pSlip * 1.5; // Increase slip probability
        }
      }
    }

    // Hint usage adjustments
    if (outcome.hintsUsed !== undefined && outcome.hintsUsed > 0 && outcome.correct) {
      // Correct with hints: more likely due to hints, not knowledge
      const hintMultiplier = 1 + outcome.hintsUsed * 0.1;
      adjustedGuess = Math.min(0.4, params.pGuess * hintMultiplier);
    }

    // Multiple attempts on same problem
    if (outcome.attemptsOnProblem !== undefined && outcome.attemptsOnProblem > 1) {
      if (outcome.correct) {
        // Eventually correct: reduce credit (more like guessing or learning from errors)
        adjustedGuess = Math.min(0.4, params.pGuess * (1 + (outcome.attemptsOnProblem - 1) * 0.15));
      }
    }

    return {
      pInit: params.pInit,
      pLearn: params.pLearn,
      pGuess: Math.max(0.01, Math.min(0.4, adjustedGuess)),
      pSlip: Math.max(0.01, Math.min(0.3, adjustedSlip)),
    };
  }

  /**
   * Predict probability of correct response on next attempt
   */
  predictCorrect(state: KnowledgeState, params?: BKTParameters): number {
    const p = params ?? DEFAULT_BKT_PARAMS;
    // P(correct) = P(L)(1 - P(S)) + (1 - P(L))P(G)
    return state.pMastery * (1 - p.pSlip) + (1 - state.pMastery) * p.pGuess;
  }

  /**
   * Check if skill is mastered (above threshold with sufficient confidence)
   */
  isMastered(state: KnowledgeState): boolean {
    return state.pMastery >= this.MASTERY_THRESHOLD && state.confidence >= 0.8;
  }

  /**
   * Get mastery level as a percentage (0-100)
   */
  getMasteryPercentage(state: KnowledgeState): number {
    return Math.round(state.pMastery * 100);
  }

  /**
   * Estimate number of attempts needed to reach mastery
   * Uses simulation approach assuming mostly correct responses
   */
  private estimateAttemptsToMastery(
    currentP: number,
    params: BKTParameters,
    threshold: number
  ): number {
    if (currentP >= threshold) return 0;

    // Simulate learning trajectory with mostly correct responses
    let p = currentP;
    let attempts = 0;
    const maxAttempts = 100;

    while (p < threshold && attempts < maxAttempts) {
      // Probability update assuming correct response
      const pCorrect = p * (1 - params.pSlip) + (1 - p) * params.pGuess;
      const pLGivenCorrect = (p * (1 - params.pSlip)) / pCorrect;
      p = pLGivenCorrect + (1 - pLGivenCorrect) * params.pLearn;
      attempts++;
    }

    return attempts;
  }

  /**
   * Calculate learning trend based on mastery change
   */
  private calculateTrend(
    previousP: number,
    currentP: number,
    opportunities: number
  ): 'improving' | 'stable' | 'declining' {
    if (opportunities < 3) return 'stable';

    const delta = currentP - previousP;

    if (delta > 0.05) return 'improving';
    if (delta < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * Get parameters for a skill (with defaults)
   */
  private getParams(skillId: string): BKTParameters {
    return this.skillParams.get(skillId) ?? DEFAULT_BKT_PARAMS;
  }

  /**
   * Set skill-specific parameters
   */
  setSkillParams(skillId: string, params: BKTParameters): void {
    this.skillParams.set(skillId, params);
  }

  /**
   * Get skill-specific parameters
   */
  getSkillParams(skillId: string): BKTParameters {
    return this.getParams(skillId);
  }

  /**
   * Initialize knowledge state for a new skill
   */
  initializeState(skillId: string, priorKnowledge?: number): KnowledgeState {
    const params = this.getParams(skillId);
    const pInit = priorKnowledge ?? params.pInit;

    return {
      pMastery: pInit,
      opportunities: 0,
      correct: 0,
      estimatedAttemptsToMastery: this.estimateAttemptsToMastery(
        pInit,
        params,
        this.MASTERY_THRESHOLD
      ),
      confidence: 0,
      trend: 'stable',
      updatedAt: new Date(),
    };
  }

  /**
   * Create a BKT instance with personalized parameters for neurodiverse learners
   */
  static createPersonalized(
    profile: NeurodiverseProfile,
    baseParams: BKTParameters = DEFAULT_BKT_PARAMS
  ): { tracer: BayesianKnowledgeTracer; config: PersonalizedBKTConfig } {
    const adjustedParams = { ...baseParams };
    const masteryThreshold = 0.95;
    let minObservations = 5;
    let useExtendedTime = false;
    let timeMultiplier = 1.0;

    // Adjust for ADHD
    if (profile.adhd) {
      // ADHD learners may have more variable performance
      adjustedParams.pSlip = Math.min(0.25, baseParams.pSlip * 1.3); // Higher slip rate
      adjustedParams.pGuess = Math.min(0.35, baseParams.pGuess * 1.2); // Slightly higher guess
      minObservations = 7; // Need more observations for stable estimate
    }

    // Adjust for processing speed
    if (profile.processingSpeed === 'slow') {
      useExtendedTime = true;
      timeMultiplier = 1.5;
      // Slower learners may need more time but not necessarily less capable
      adjustedParams.pLearn = baseParams.pLearn * 0.9; // Slightly slower learning rate
    } else if (profile.processingSpeed === 'fast') {
      timeMultiplier = 0.7;
    }

    // Adjust for working memory
    if (profile.workingMemory === 'low') {
      // Lower working memory may require more practice
      adjustedParams.pLearn = adjustedParams.pLearn * 0.85;
      minObservations = 8;
    }

    // Adjust for autism
    if (profile.autism) {
      // May show very consistent performance once learned
      adjustedParams.pSlip = Math.max(0.03, baseParams.pSlip * 0.7);
      // But may take longer to initially learn
      adjustedParams.pLearn = adjustedParams.pLearn * 0.9;
    }

    // Adjust for dyslexia (affects reading-based content)
    if (profile.dyslexia) {
      // Not adjusting core BKT params as dyslexia affects content delivery, not learning
      useExtendedTime = true;
      timeMultiplier = Math.max(timeMultiplier, 1.3);
    }

    const config: PersonalizedBKTConfig = {
      baseParams: adjustedParams,
      masteryThreshold,
      minObservationsForConfidence: minObservations,
      useExtendedTimeThresholds: useExtendedTime,
      timeMultiplier,
    };

    const tracer = new BayesianKnowledgeTracer(new Map(), config);

    return { tracer, config };
  }

  /**
   * Fit BKT parameters from historical data using Expectation-Maximization
   *
   * @param sequences - Array of practice outcome sequences (one per learner)
   * @param initialParams - Initial parameter guesses
   * @param maxIterations - Maximum EM iterations
   * @param convergenceThreshold - Stop when parameter changes are below this
   * @returns Fitted BKT parameters
   */
  static fitParameters(
    sequences: { correct: boolean }[][],
    initialParams?: Partial<BKTParameters>,
    maxIterations = 100,
    convergenceThreshold = 0.0001
  ): BKTParameters {
    // Initialize parameters
    let params: BKTParameters = {
      pInit: initialParams?.pInit ?? 0.1,
      pLearn: initialParams?.pLearn ?? 0.1,
      pGuess: initialParams?.pGuess ?? 0.2,
      pSlip: initialParams?.pSlip ?? 0.1,
    };

    for (let iter = 0; iter < maxIterations; iter++) {
      const newParams = BayesianKnowledgeTracer.emStep(sequences, params);

      // Check convergence
      const delta = Math.max(
        Math.abs(newParams.pInit - params.pInit),
        Math.abs(newParams.pLearn - params.pLearn),
        Math.abs(newParams.pGuess - params.pGuess),
        Math.abs(newParams.pSlip - params.pSlip)
      );

      params = newParams;

      if (delta < convergenceThreshold) {
        break;
      }
    }

    // Apply constraints to ensure valid and reasonable probabilities
    return {
      pInit: Math.max(0.001, Math.min(0.999, params.pInit)),
      pLearn: Math.max(0.001, Math.min(0.999, params.pLearn)),
      pGuess: Math.max(0.001, Math.min(0.4, params.pGuess)), // Cap guess at 0.4
      pSlip: Math.max(0.001, Math.min(0.3, params.pSlip)), // Cap slip at 0.3
    };
  }

  /**
   * Single EM iteration for parameter estimation
   */
  private static emStep(sequences: { correct: boolean }[][], params: BKTParameters): BKTParameters {
    let sumPL0 = 0;
    let sumPT = 0;
    let sumPTDenom = 0;
    let sumPG = 0;
    let sumPGDenom = 0;
    let sumPS = 0;
    let sumPSDenom = 0;
    let seqCount = 0;

    for (const sequence of sequences) {
      if (sequence.length === 0) continue;

      // Forward-backward algorithm
      const { gamma } = BayesianKnowledgeTracer.forwardBackward(sequence, params);

      // Accumulate expected counts
      const gamma0 = gamma[0];
      if (gamma0 !== undefined) {
        sumPL0 += gamma0;
      }
      seqCount++;

      for (let t = 0; t < sequence.length; t++) {
        const outcome = sequence[t];
        const gammaT = gamma[t];
        if (outcome === undefined || gammaT === undefined) continue;

        const obs = outcome.correct;

        if (t < sequence.length - 1) {
          const gammaTPlus1 = gamma[t + 1];
          if (gammaTPlus1 !== undefined) {
            // Learning transitions (not known → known)
            const pNotKnown = 1 - gammaT;
            const pKnownNext = gammaTPlus1;
            sumPT += pNotKnown * pKnownNext * params.pLearn;
            sumPTDenom += pNotKnown;
          }
        }

        if (obs) {
          // Correct response
          sumPG += 1 - gammaT; // Guessed correctly
          sumPGDenom += 1 - gammaT;
          sumPSDenom += gammaT;
        } else {
          // Incorrect response
          sumPS += gammaT; // Slipped
          sumPSDenom += gammaT;
          sumPGDenom += 1 - gammaT;
        }
      }
    }

    // Update parameters
    return {
      pInit: sumPL0 / Math.max(1, seqCount),
      pLearn: sumPT / Math.max(0.001, sumPTDenom),
      pGuess: sumPG / Math.max(0.001, sumPGDenom),
      pSlip: sumPS / Math.max(0.001, sumPSDenom),
    };
  }

  /**
   * Forward-backward algorithm for HMM
   * Returns posterior probability of mastery at each time step
   */
  private static forwardBackward(
    sequence: { correct: boolean }[],
    params: BKTParameters
  ): ForwardBackwardResult {
    const T = sequence.length;
    const alpha = new Array<number>(T).fill(0);
    const beta = new Array<number>(T).fill(0);
    const gamma = new Array<number>(T).fill(0);

    // Forward pass
    alpha[0] = params.pInit;
    for (let t = 0; t < T; t++) {
      const outcome = sequence[t];
      if (outcome === undefined) continue;
      const obs = outcome.correct;

      if (t > 0) {
        // Transition: can go from not-known to known via learning
        const prevAlpha = alpha[t - 1];
        if (prevAlpha !== undefined) {
          const pKnownPrev = prevAlpha;
          const pNotKnownPrev = 1 - pKnownPrev;
          alpha[t] = pKnownPrev + pNotKnownPrev * params.pLearn;
        }
      }

      // Observation update
      const currentAlpha = alpha[t];
      if (currentAlpha !== undefined) {
        const pL = currentAlpha;
        if (obs) {
          const pCorrect = pL * (1 - params.pSlip) + (1 - pL) * params.pGuess;
          alpha[t] = (pL * (1 - params.pSlip)) / pCorrect;
        } else {
          const pIncorrect = pL * params.pSlip + (1 - pL) * (1 - params.pGuess);
          alpha[t] = (pL * params.pSlip) / pIncorrect;
        }
      }
    }

    // Backward pass (simplified for BKT)
    beta[T - 1] = 1;
    for (let t = T - 2; t >= 0; t--) {
      const nextBeta = beta[t + 1];
      if (nextBeta !== undefined) {
        beta[t] = nextBeta;
      }
    }

    // Combine for gamma (posterior probability of mastery at each step)
    for (let t = 0; t < T; t++) {
      const currentAlpha = alpha[t];
      if (currentAlpha !== undefined) {
        gamma[t] = currentAlpha; // In BKT, gamma ≈ alpha after observation update
      }
    }

    return { alpha, beta, gamma };
  }
}

export * from './types.js';
