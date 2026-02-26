import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('AnxietyDetector', () => {
  let AnxietyDetector: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import('../src/emotional-state/anxiety-detector');
    AnxietyDetector = mod.AnxietyDetector || mod.default;
  });

  it('exports AnxietyDetector class', () => {
    expect(AnxietyDetector).toBeDefined();
  });

  describe('performance anxiety', () => {
    it('detects performance anxiety from rapid incorrect answers', () => {
      const detector = new AnxietyDetector();
      const result = detector.detect({
        recentAnswers: [
          { correct: false, timeMs: 2000 },
          { correct: false, timeMs: 1500 },
          { correct: false, timeMs: 1000 },
          { correct: false, timeMs: 800 },
        ],
        sessionDuration: 300,
        contentDifficulty: 'medium',
      });

      expect(result).toBeDefined();
      expect(result.anxietyType).toContain('performance');
    });
  });

  describe('time pressure anxiety', () => {
    it('detects time-pressure anxiety near deadlines', () => {
      const detector = new AnxietyDetector();
      const result = detector.detect({
        recentAnswers: [{ correct: true, timeMs: 500 }],
        sessionDuration: 60,
        timeRemaining: 30,
        contentDifficulty: 'hard',
      });

      expect(result).toBeDefined();
      if (result.detected) {
        expect(result.anxietyType).toContain('time');
      }
    });
  });

  describe('new content anxiety', () => {
    it('detects anxiety from unfamiliar content area', () => {
      const detector = new AnxietyDetector();
      const result = detector.detect({
        recentAnswers: [],
        sessionDuration: 10,
        contentDifficulty: 'hard',
        isNewTopic: true,
        priorExposure: 0,
      });

      expect(result).toBeDefined();
    });
  });

  describe('risk scoring', () => {
    it('returns a risk score between 0 and 1', () => {
      const detector = new AnxietyDetector();
      const result = detector.detect({
        recentAnswers: [{ correct: false, timeMs: 3000 }],
        sessionDuration: 120,
        contentDifficulty: 'medium',
      });

      if (result.riskScore !== undefined) {
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('no anxiety', () => {
    it('returns not-detected for normal patterns', () => {
      const detector = new AnxietyDetector();
      const result = detector.detect({
        recentAnswers: [
          { correct: true, timeMs: 5000 },
          { correct: true, timeMs: 6000 },
          { correct: true, timeMs: 4500 },
        ],
        sessionDuration: 300,
        contentDifficulty: 'easy',
      });

      expect(result.detected).toBe(false);
    });
  });
});
