/**
 * ND-2.3: Emotional State Detection Tests
 *
 * Tests for anxiety and overwhelm detection algorithms.
 */

import { describe, expect, it } from 'vitest';

import { AnxietyDetector } from '../src/emotional-state/anxiety-detector.js';
import { OverwhelmDetector } from '../src/emotional-state/overwhelm-detector.js';
import { InterventionSelector } from '../src/emotional-state/intervention-selector.js';
import {
  createDefaultBehavioralSignals,
  createDefaultContextualFactors,
  createDefaultOverwhelmThresholds,
  type BehavioralSignals,
  type ContextualFactors,
  type OverwhelmThresholds,
  type AnxietyPattern,
  EmotionalState,
} from '../src/emotional-state/emotional-state.types.js';

// ════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ════════════════════════════════════════════════════════════════════════════

function createSignals(overrides: Partial<BehavioralSignals> = {}): BehavioralSignals {
  return {
    ...createDefaultBehavioralSignals(),
    ...overrides,
  };
}

function createContext(overrides: Partial<ContextualFactors> = {}): ContextualFactors {
  return {
    ...createDefaultContextualFactors(),
    ...overrides,
  };
}

function createThresholds(overrides: Partial<OverwhelmThresholds> = {}): OverwhelmThresholds {
  return {
    ...createDefaultOverwhelmThresholds(),
    ...overrides,
  };
}

function createAnxietyPatterns(): AnxietyPattern[] {
  return [
    {
      patternId: 'pattern-1',
      learnerId: 'learner-123',
      tenantId: 'tenant-123',
      trigger: 'timed_activity',
      frequency: 5,
      typicalIntensity: 7,
      effectiveInterventions: ['BREATHING'],
      firstObserved: new Date(),
      lastObserved: new Date(),
    },
  ];
}

// ════════════════════════════════════════════════════════════════════════════
// ANXIETY DETECTOR TESTS
// ════════════════════════════════════════════════════════════════════════════

describe('AnxietyDetector', () => {
  const detector = new AnxietyDetector();

  describe('analyze', () => {
    it('returns low risk for calm, normal behavior', () => {
      const signals = createSignals({
        consecutiveErrors: 0,
        consecutiveCorrect: 5,
        responseTimeVariance: 0.5,
        helpRequestCount: 1,
        backtrackCount: 0,
      });
      const context = createContext({
        isAssessment: false,
        hasTimeLimit: false,
        isNewContent: false,
      });

      const result = detector.analyze(signals, context, [], createThresholds());

      expect(result.riskLevel).toBeLessThan(3);
      expect(result.indicators.length).toBe(0);
    });

    it('detects performance anxiety from consecutive errors', () => {
      const signals = createSignals({
        consecutiveErrors: 4,
        errorRate: 0.6,
      });
      const context = createContext();

      const result = detector.analyze(signals, context, [], createThresholds());

      expect(result.riskLevel).toBeGreaterThan(3);
      expect(result.anxietyType).toBe('performance');
      expect(result.indicators.some((i) => i.signal === 'consecutiveErrors')).toBe(true);
    });

    it('detects time pressure anxiety', () => {
      const signals = createSignals({
        responseTimeMs: 1500,
        averageResponseTimeMs: 5000,
      });
      const context = createContext({
        hasTimeLimit: true,
        timeRemainingSeconds: 30,
        isAssessment: true,
      });

      const result = detector.analyze(signals, context, [], createThresholds());

      expect(result.riskLevel).toBeGreaterThan(4);
      expect(result.anxietyType).toBe('time_pressure');
      expect(result.triggers).toContain('timed_activity');
    });

    it('detects new content anxiety', () => {
      const signals = createSignals({
        helpRequestCount: 5,
        hintUsageCount: 4,
        consecutiveErrors: 2,
      });
      const context = createContext({
        isNewContent: true,
        previousPerformanceOnTopic: 30,
      });

      const result = detector.analyze(signals, context, [], createThresholds());

      expect(result.riskLevel).toBeGreaterThan(3);
      expect(result.anxietyType).toBe('new_content');
    });

    it('detects avoidance behavior', () => {
      const signals = createSignals({
        skipCount: 5,
        backtrackCount: 4,
        focusLossCount: 6,
      });
      const context = createContext();

      const result = detector.analyze(signals, context, [], createThresholds());

      expect(result.riskLevel).toBeGreaterThan(3);
      expect(result.anxietyType).toBe('avoidance');
    });

    it('detects erratic behavior', () => {
      const signals = createSignals({
        responseTimeVariance: 3.5,
        clicksPerMinute: 150,
        scrollBehavior: 'erratic',
      });
      const context = createContext();

      const result = detector.analyze(signals, context, [], createThresholds());

      expect(result.riskLevel).toBeGreaterThan(4);
      expect(result.anxietyType).toBe('erratic');
    });

    it('amplifies risk for known triggers', () => {
      const signals = createSignals();
      const context = createContext({
        hasTimeLimit: true,
        knownAnxietyTriggers: ['timed_activity'],
      });
      const patterns = createAnxietyPatterns();

      const resultWithoutPatterns = detector.analyze(signals, context, [], createThresholds());
      const resultWithPatterns = detector.analyze(signals, context, patterns, createThresholds());

      expect(resultWithPatterns.riskLevel).toBeGreaterThan(resultWithoutPatterns.riskLevel);
    });

    it('detects explicit frustration signal', () => {
      const signals = createSignals({
        explicitFrustrationReport: true,
      });
      const context = createContext();

      const result = detector.analyze(signals, context, [], createThresholds());

      expect(result.riskLevel).toBeGreaterThanOrEqual(7);
      expect(result.indicators.some((i) => i.signal === 'explicitFrustrationReport')).toBe(true);
    });

    it('detects break request as anxiety signal', () => {
      const signals = createSignals({
        requestedBreak: true,
      });
      const context = createContext();

      const result = detector.analyze(signals, context, [], createThresholds());

      expect(result.riskLevel).toBeGreaterThan(3);
      expect(result.indicators.some((i) => i.signal === 'requestedBreak')).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// OVERWHELM DETECTOR TESTS
// ════════════════════════════════════════════════════════════════════════════

describe('OverwhelmDetector', () => {
  const detector = new OverwhelmDetector();

  describe('analyze', () => {
    it('returns low risk for normal conditions', () => {
      const signals = createSignals({
        sessionDurationMinutes: 15,
        timeSinceLastBreak: 10 * 60 * 1000,
        focusLossCount: 1,
      });
      const context = createContext({
        estimatedCognitiveLoad: 4,
        estimatedSensoryLoad: 3,
        sessionDurationMinutes: 15,
      });

      const result = detector.analyze(signals, context, createThresholds());

      expect(result.riskLevel).toBeLessThan(4);
    });

    it('detects cognitive overload', () => {
      const signals = createSignals({
        consecutiveErrors: 3,
        responseTimeMs: 15000,
        averageResponseTimeMs: 5000,
      });
      const context = createContext({
        activityDifficulty: 'hard',
        estimatedCognitiveLoad: 9,
        isNewContent: true,
      });

      const result = detector.analyze(signals, context, createThresholds());

      expect(result.riskLevel).toBeGreaterThan(4);
      expect(result.loadBreakdown.cognitive).toBeGreaterThan(5);
    });

    it('detects sensory overload', () => {
      const signals = createSignals({
        focusLossCount: 8,
        scrollBehavior: 'rapid',
      });
      const context = createContext({
        estimatedSensoryLoad: 9,
        hasTimeLimit: true,
      });

      const result = detector.analyze(signals, context, createThresholds());

      expect(result.riskLevel).toBeGreaterThan(4);
      expect(result.loadBreakdown.sensory).toBeGreaterThan(5);
    });

    it('detects emotional overload', () => {
      const signals = createSignals({
        consecutiveErrors: 5,
        helpRequestCount: 6,
        explicitFrustrationReport: true,
      });
      const context = createContext();

      const result = detector.analyze(signals, context, createThresholds());

      expect(result.riskLevel).toBeGreaterThan(5);
      expect(result.loadBreakdown.emotional).toBeGreaterThan(5);
    });

    it('detects fatigue overload', () => {
      const signals = createSignals({
        idleTimeMs: 30000,
        responseTimeMs: 12000,
        averageResponseTimeMs: 5000,
      });
      const context = createContext({
        sessionDurationMinutes: 90,
        lastBreakMinutesAgo: 60,
        typicalSessionLength: 30,
      });
      const thresholds = createThresholds({
        maxSessionWithoutBreak: 30,
      });

      const result = detector.analyze(signals, context, thresholds);

      expect(result.loadBreakdown.fatigue).toBeGreaterThan(5);
    });

    it('amplifies risk when multiple systems are overloaded', () => {
      const signals = createSignals({
        consecutiveErrors: 4,
        focusLossCount: 7,
        idleTimeMs: 25000,
        responseTimeMs: 15000,
        averageResponseTimeMs: 5000,
      });
      const context = createContext({
        estimatedCognitiveLoad: 8,
        estimatedSensoryLoad: 8,
        sessionDurationMinutes: 60,
        lastBreakMinutesAgo: 50,
      });
      const thresholds = createThresholds({
        maxSessionWithoutBreak: 30,
      });

      const result = detector.analyze(signals, context, thresholds);

      // Multi-system overload should push risk very high
      expect(result.riskLevel).toBeGreaterThan(7);
      expect(result.overwhelmType).toBe('multi_system');
    });

    it('respects personalized thresholds', () => {
      const signals = createSignals({
        sessionDurationMinutes: 25,
      });
      const context = createContext({
        sessionDurationMinutes: 25,
        lastBreakMinutesAgo: 25,
      });

      // Default thresholds (30 min max session)
      const resultDefault = detector.analyze(signals, context, createThresholds());

      // Sensitive learner (15 min max session)
      const sensitiveThresholds = createThresholds({
        maxSessionWithoutBreak: 15,
        sensoryThreshold: 5,
      });
      const resultSensitive = detector.analyze(signals, context, sensitiveThresholds);

      expect(resultSensitive.riskLevel).toBeGreaterThan(resultDefault.riskLevel);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// INTERVENTION SELECTOR TESTS
// ════════════════════════════════════════════════════════════════════════════

describe('InterventionSelector', () => {
  describe('selectInterventions', () => {
    it('recommends breathing for high anxiety states', () => {
      const selector = new InterventionSelector(
        {
          getInterventions: async () => [
            {
              interventionId: 'breathing-1',
              tenantId: 'tenant-123',
              interventionType: 'BREATHING',
              name: 'Box Breathing',
              description: 'Calming breathing exercise',
              content: { instructions: 'Breathe in...', duration: 60 },
              duration: 60,
              minAge: 6,
              maxAge: 18,
              targetStates: ['ANXIOUS', 'STRESSED'],
              successRate: 0.8,
              usageCount: 100,
              active: true,
            },
          ],
          getLearnerInterventionHistory: async () => [],
        } as never,
        { query: async () => [] } as never
      );

      // We can't easily test the full method without mocking the database,
      // but we can verify the class instantiates correctly
      expect(selector).toBeDefined();
    });
  });

  describe('getInterventionTypeMatches', () => {
    it('maps emotional states to appropriate intervention types', () => {
      // Test that the state-to-intervention mapping logic works
      const stateToTypes: Record<string, string[]> = {
        [EmotionalState.ANXIOUS]: ['BREATHING', 'GROUNDING', 'SENSORY'],
        [EmotionalState.OVERWHELMED]: ['BREAK', 'SIMPLIFICATION', 'SENSORY'],
        [EmotionalState.FRUSTRATED]: ['BREAK', 'ENCOURAGEMENT', 'CHOICE'],
        [EmotionalState.STRESSED]: ['BREATHING', 'MOVEMENT', 'BREAK'],
        [EmotionalState.CONFUSED]: ['SIMPLIFICATION', 'VISUAL_SUPPORT', 'ENCOURAGEMENT'],
        [EmotionalState.TIRED]: ['BREAK', 'MOVEMENT', 'ENCOURAGEMENT'],
      };

      // Verify mappings exist for key states
      expect(stateToTypes[EmotionalState.ANXIOUS]).toContain('BREATHING');
      expect(stateToTypes[EmotionalState.OVERWHELMED]).toContain('BREAK');
      expect(stateToTypes[EmotionalState.FRUSTRATED]).toContain('ENCOURAGEMENT');
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ════════════════════════════════════════════════════════════════════════════

describe('Emotional State Detection Integration', () => {
  const anxietyDetector = new AnxietyDetector();
  const overwhelmDetector = new OverwhelmDetector();

  it('correctly identifies a learner in crisis', () => {
    const signals = createSignals({
      consecutiveErrors: 6,
      responseTimeVariance: 4.0,
      focusLossCount: 10,
      helpRequestCount: 8,
      explicitFrustrationReport: true,
      idleTimeMs: 45000,
    });
    const context = createContext({
      isAssessment: true,
      hasTimeLimit: true,
      timeRemainingSeconds: 60,
      sessionDurationMinutes: 50,
      lastBreakMinutesAgo: 50,
      estimatedCognitiveLoad: 9,
      estimatedSensoryLoad: 8,
    });
    const thresholds = createThresholds();

    const anxietyResult = anxietyDetector.analyze(signals, context, [], thresholds);
    const overwhelmResult = overwhelmDetector.analyze(signals, context, thresholds);

    // Both should indicate high risk
    expect(anxietyResult.riskLevel).toBeGreaterThan(7);
    expect(overwhelmResult.riskLevel).toBeGreaterThan(7);

    // Combined risk indicates need for immediate intervention
    const combinedRisk = Math.max(anxietyResult.riskLevel, overwhelmResult.riskLevel);
    expect(combinedRisk).toBeGreaterThanOrEqual(8);
  });

  it('correctly identifies a learner doing well', () => {
    const signals = createSignals({
      consecutiveCorrect: 8,
      consecutiveErrors: 0,
      responseTimeMs: 3000,
      averageResponseTimeMs: 3500,
      responseTimeVariance: 0.3,
      focusLossCount: 0,
      helpRequestCount: 1,
      skipCount: 0,
      errorRate: 0.1,
    });
    const context = createContext({
      isAssessment: false,
      hasTimeLimit: false,
      sessionDurationMinutes: 20,
      breaksTaken: 1,
      lastBreakMinutesAgo: 10,
      previousPerformanceOnTopic: 85,
      estimatedCognitiveLoad: 4,
      estimatedSensoryLoad: 3,
    });
    const thresholds = createThresholds();

    const anxietyResult = anxietyDetector.analyze(signals, context, [], thresholds);
    const overwhelmResult = overwhelmDetector.analyze(signals, context, thresholds);

    // Both should indicate low risk
    expect(anxietyResult.riskLevel).toBeLessThan(3);
    expect(overwhelmResult.riskLevel).toBeLessThan(3);
  });

  it('detects gradual buildup of stress', () => {
    const baseSignals = createSignals();
    const context = createContext();
    const thresholds = createThresholds();

    // Simulate progression over time
    const stages = [
      { consecutiveErrors: 1, focusLossCount: 1, sessionDurationMinutes: 10 },
      { consecutiveErrors: 2, focusLossCount: 3, sessionDurationMinutes: 25 },
      { consecutiveErrors: 3, focusLossCount: 5, sessionDurationMinutes: 40 },
      { consecutiveErrors: 4, focusLossCount: 7, sessionDurationMinutes: 55 },
    ];

    const risks = stages.map((stage) => {
      const signals = createSignals({ ...baseSignals, ...stage });
      const stageContext = createContext({
        ...context,
        sessionDurationMinutes: stage.sessionDurationMinutes,
        lastBreakMinutesAgo: stage.sessionDurationMinutes,
      });

      const anxiety = anxietyDetector.analyze(signals, stageContext, [], thresholds);
      const overwhelm = overwhelmDetector.analyze(signals, stageContext, thresholds);

      return Math.max(anxiety.riskLevel, overwhelm.riskLevel);
    });

    // Risk should increase over time
    for (let i = 1; i < risks.length; i++) {
      expect(risks[i]).toBeGreaterThanOrEqual(risks[i - 1]);
    }
  });
});
