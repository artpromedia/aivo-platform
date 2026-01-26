import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScaffoldingEngine } from '../../src/scaffolding/step-engine.js';

// Mock the AI orchestrator client
vi.mock('../../src/services/aiOrchestratorClient.js', () => ({
  aiOrchestratorClient: {
    generateScaffolding: vi.fn().mockResolvedValue({
      content: {
        steps: [
          {
            stepOrder: 1,
            promptText:
              'CONTENT: Let me help you understand this problem.\nHINTS: Think step by step | What do you know?\nFOLLOW_UP: What part confuses you?',
          },
        ],
        problemType: 'equation',
      },
    }),
  },
}));

describe('ScaffoldingEngine', () => {
  let engine: ScaffoldingEngine;

  beforeEach(() => {
    engine = new ScaffoldingEngine();
    vi.clearAllMocks();
  });

  describe('generateStep', () => {
    const baseContext = {
      problem: {
        id: 'test-problem-1',
        rawText: 'Solve for x: 2x + 5 = 11',
        subject: 'MATH' as const,
        gradeBand: 'G6_8' as const,
        problemType: 'equation',
      },
      currentStep: 1 as const,
      previousInteractions: [],
      tenantId: 'tenant-1',
    };

    it('should generate a response for step 1', async () => {
      const response = await engine.generateStep(baseContext);

      expect(response).toHaveProperty('step', 1);
      expect(response).toHaveProperty('stepName', 'Clarifying Questions');
      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('hints');
      expect(response).toHaveProperty('relatedConcepts');
    });

    it('should include related concepts for math problems', async () => {
      const response = await engine.generateStep(baseContext);

      expect(response.relatedConcepts).toBeDefined();
      expect(response.relatedConcepts.length).toBeGreaterThan(0);
    });

    it('should calculate difficulty based on problem and interactions', async () => {
      const response = await engine.generateStep(baseContext);

      expect(response.estimatedDifficulty).toBeGreaterThanOrEqual(1);
      expect(response.estimatedDifficulty).toBeLessThanOrEqual(10);
    });

    it('should determine if can proceed to next step', async () => {
      const response = await engine.generateStep(baseContext);
      expect(response.canProceedToNext).toBe(false); // No interactions yet

      const contextWithInteraction = {
        ...baseContext,
        previousInteractions: [
          {
            step: 1,
            userResponse: "I don't understand the equation",
            aiResponse: 'Let me help you understand',
            timestamp: new Date(),
          },
        ],
      };

      const response2 = await engine.generateStep(contextWithInteraction);
      expect(response2.canProceedToNext).toBe(true);
    });

    it('should parse hints from AI response', async () => {
      const response = await engine.generateStep(baseContext);

      expect(Array.isArray(response.hints)).toBe(true);
      expect(response.hints.length).toBeGreaterThan(0);
    });

    it('should include follow-up when present', async () => {
      const response = await engine.generateStep(baseContext);

      expect(response.suggestedFollowUp).toBeDefined();
    });
  });
});
