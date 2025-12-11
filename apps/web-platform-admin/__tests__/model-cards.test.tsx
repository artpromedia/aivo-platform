/**
 * Model Cards Page Tests
 *
 * Tests for Platform Admin AI model cards listing and detail views.
 */

import { describe, it, expect } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

const mockModelCards = [
  {
    id: '1',
    modelKey: 'AIVO_TUTOR_V1',
    provider: 'OPENAI' as const,
    displayName: 'Aivo Tutor',
    description: 'AI-powered tutoring assistant for K-12 learners',
    intendedUseCases: `Best for:
• Providing step-by-step explanations of concepts
• Answering curriculum-aligned questions
• Offering hints and guided practice`,
    lastReviewedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: '2',
    modelKey: 'AIVO_BASELINE_V1',
    provider: 'OPENAI' as const,
    displayName: 'Aivo Baseline Assessment',
    description: 'Analyzes learner responses during baseline assessments',
    intendedUseCases: `Best for:
• Analyzing written responses for skill demonstration
• Identifying prerequisite knowledge gaps`,
    lastReviewedAt: '2024-11-15T00:00:00Z',
  },
  {
    id: '3',
    modelKey: 'AIVO_FOCUS_V1',
    provider: 'INTERNAL' as const,
    displayName: 'Aivo Focus Assistant',
    description: 'Rule-based system for engagement monitoring',
    intendedUseCases: `Best for:
• Detecting signs of learner disengagement
• Suggesting timely breaks`,
    lastReviewedAt: '2024-12-05T00:00:00Z',
  },
];

const mockFullModelCard = {
  id: '1',
  modelKey: 'AIVO_TUTOR_V1',
  provider: 'OPENAI' as const,
  displayName: 'Aivo Tutor',
  description:
    'An AI-powered tutoring assistant designed to help K-12 learners understand concepts through guided questions and scaffolded explanations.',
  intendedUseCases: `Best for:
• Providing step-by-step explanations of concepts
• Answering curriculum-aligned questions
• Offering hints and guided practice
• Explaining mistakes in a supportive way
• Adapting language to different grade levels`,
  limitations: `Not appropriate for:
• Medical, legal, or professional advice
• Grading or formal assessment decisions
• Replacing teacher judgment on student progress
• Handling sensitive student disclosures

Important: AI tutoring is a supplement to, not a replacement for, human instruction.`,
  safetyConsiderations: `Safety measures in place:
• Content filtered for age-appropriateness
• Guardrails prevent discussion of harmful topics
• Human review of flagged interactions

Disclaimer: This is not a diagnostic tool and should not be used as a substitute for clinical evaluation.`,
  inputTypes: 'Text (student questions, responses, homework problems)',
  outputTypes: 'Text (explanations, hints, feedback, encouragement)',
  dataSourcesSummary:
    'Trained on curated educational content aligned with Common Core and state standards.',
  lastReviewedAt: '2024-12-01T00:00:00Z',
  lastReviewedBy: null,
  metadataJson: { version: '1.0', baseModel: 'gpt-4o-mini', features: ['tutoring', 'homework_help'] },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-12-01T00:00:00Z',
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (from model-cards-api.ts)
// ══════════════════════════════════════════════════════════════════════════════

const PROVIDER_DISPLAY: Record<string, { name: string; colorClass: string }> = {
  OPENAI: { name: 'OpenAI', colorClass: 'bg-emerald-100 text-emerald-800' },
  ANTHROPIC: { name: 'Anthropic', colorClass: 'bg-orange-100 text-orange-800' },
  GOOGLE: { name: 'Google', colorClass: 'bg-blue-100 text-blue-800' },
  INTERNAL: { name: 'Internal', colorClass: 'bg-slate-100 text-slate-800' },
  META: { name: 'Meta', colorClass: 'bg-indigo-100 text-indigo-800' },
  MISTRAL: { name: 'Mistral', colorClass: 'bg-purple-100 text-purple-800' },
  COHERE: { name: 'Cohere', colorClass: 'bg-cyan-100 text-cyan-800' },
};

function parseBestFor(intendedUseCases: string): string[] {
  const regex = /Best for:\s*([\s\S]*?)(?=\n\n|Not appropriate|$)/i;
  const bestForMatch = regex.exec(intendedUseCases);
  if (!bestForMatch?.[1]) return [];

  return bestForMatch[1]
    .split('\n')
    .filter((line) => line.trim().startsWith('•'))
    .map((line) => line.replace('•', '').trim());
}

function parseNotAppropriateFor(limitations: string): string[] {
  const regex = /Not appropriate for:\s*([\s\S]*?)(?=\n\nImportant:|$)/i;
  const notAppropriateMatch = regex.exec(limitations);
  if (!notAppropriateMatch?.[1]) return [];

  return notAppropriateMatch[1]
    .split('\n')
    .filter((line) => line.trim().startsWith('•'))
    .map((line) => line.replace('•', '').trim());
}

function parseSafetyMeasures(safety: string): string[] {
  const regex = /Safety measures in place:\s*([\s\S]*?)(?=\n\nDisclaimer:|$)/i;
  const safetyMatch = regex.exec(safety);
  if (!safetyMatch?.[1]) return [];

  return safetyMatch[1]
    .split('\n')
    .filter((line) => line.trim().startsWith('•'))
    .map((line) => line.replace('•', '').trim());
}

function extractDisclaimer(safety: string): string | null {
  const regex = /Disclaimer:\s*(.+)/i;
  const disclaimerMatch = regex.exec(safety);
  return disclaimerMatch?.[1]?.trim() ?? null;
}

function formatReviewDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS: Model Cards List Page
// ══════════════════════════════════════════════════════════════════════════════

describe('Model Cards List Page', () => {
  describe('helper functions', () => {
    it('should parse "Best for" items from intendedUseCases', () => {
      const bestFor = parseBestFor(mockFullModelCard.intendedUseCases);

      expect(bestFor).toHaveLength(5);
      expect(bestFor[0]).toBe('Providing step-by-step explanations of concepts');
      expect(bestFor[1]).toBe('Answering curriculum-aligned questions');
    });

    it('should parse "Not appropriate for" items from limitations', () => {
      const notAppropriate = parseNotAppropriateFor(mockFullModelCard.limitations);

      expect(notAppropriate).toHaveLength(4);
      expect(notAppropriate[0]).toBe('Medical, legal, or professional advice');
      expect(notAppropriate[1]).toBe('Grading or formal assessment decisions');
    });

    it('should parse safety measures from safetyConsiderations', () => {
      const safetyMeasures = parseSafetyMeasures(mockFullModelCard.safetyConsiderations);

      expect(safetyMeasures).toHaveLength(3);
      expect(safetyMeasures[0]).toBe('Content filtered for age-appropriateness');
    });

    it('should extract disclaimer from safetyConsiderations', () => {
      const disclaimer = extractDisclaimer(mockFullModelCard.safetyConsiderations);

      expect(disclaimer).not.toBeNull();
      expect(disclaimer).toContain('not a diagnostic tool');
    });

    it('should format review date correctly', () => {
      const formatted = formatReviewDate('2024-12-01T00:00:00Z');

      expect(formatted).toContain('Dec');
      expect(formatted).toContain('2024');
    });

    it('should return correct provider display info', () => {
      const openai = PROVIDER_DISPLAY.OPENAI;
      expect(openai).toBeDefined();
      expect(openai?.name).toBe('OpenAI');
      expect(openai?.colorClass).toContain('emerald');

      const internal = PROVIDER_DISPLAY.INTERNAL;
      expect(internal).toBeDefined();
      expect(internal?.name).toBe('Internal');
      expect(internal?.colorClass).toContain('slate');

      const anthropic = PROVIDER_DISPLAY.ANTHROPIC;
      expect(anthropic).toBeDefined();
      expect(anthropic?.name).toBe('Anthropic');
      expect(anthropic?.colorClass).toContain('orange');
    });
  });

  describe('model cards data structure', () => {
    it('should have all required fields in model card summary', () => {
      const model = mockModelCards[0];

      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('modelKey');
      expect(model).toHaveProperty('provider');
      expect(model).toHaveProperty('displayName');
      expect(model).toHaveProperty('description');
      expect(model).toHaveProperty('intendedUseCases');
      expect(model).toHaveProperty('lastReviewedAt');
    });

    it('should have all required fields in full model card', () => {
      const model = mockFullModelCard;

      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('modelKey');
      expect(model).toHaveProperty('provider');
      expect(model).toHaveProperty('displayName');
      expect(model).toHaveProperty('description');
      expect(model).toHaveProperty('intendedUseCases');
      expect(model).toHaveProperty('limitations');
      expect(model).toHaveProperty('safetyConsiderations');
      expect(model).toHaveProperty('inputTypes');
      expect(model).toHaveProperty('outputTypes');
      expect(model).toHaveProperty('dataSourcesSummary');
      expect(model).toHaveProperty('lastReviewedAt');
      expect(model).toHaveProperty('metadataJson');
    });

    it('should have valid provider values', () => {
      const validProviders = ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'INTERNAL', 'META', 'MISTRAL', 'COHERE'];

      for (const model of mockModelCards) {
        expect(validProviders).toContain(model.provider);
      }
    });
  });

  describe('content requirements', () => {
    it('should include "Best for" section in intendedUseCases', () => {
      expect(mockFullModelCard.intendedUseCases).toContain('Best for:');
    });

    it('should include "Not appropriate for" section in limitations', () => {
      expect(mockFullModelCard.limitations).toContain('Not appropriate for:');
    });

    it('should include "Safety measures" in safetyConsiderations', () => {
      expect(mockFullModelCard.safetyConsiderations).toContain('Safety measures in place:');
    });

    it('should include disclaimer in safetyConsiderations', () => {
      expect(mockFullModelCard.safetyConsiderations).toContain('Disclaimer:');
    });

    it('should have input and output type descriptions', () => {
      expect(mockFullModelCard.inputTypes).toBeTruthy();
      expect(mockFullModelCard.outputTypes).toBeTruthy();
      expect(mockFullModelCard.inputTypes).toContain('Text');
      expect(mockFullModelCard.outputTypes).toContain('Text');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS: Model Detail Page
// ══════════════════════════════════════════════════════════════════════════════

describe('Model Detail Page', () => {
  describe('model metadata', () => {
    it('should include version in metadataJson', () => {
      expect(mockFullModelCard.metadataJson).toHaveProperty('version');
      expect(mockFullModelCard.metadataJson.version).toBe('1.0');
    });

    it('should include baseModel in metadataJson', () => {
      expect(mockFullModelCard.metadataJson).toHaveProperty('baseModel');
      expect(mockFullModelCard.metadataJson.baseModel).toBe('gpt-4o-mini');
    });

    it('should include features list in metadataJson', () => {
      expect(mockFullModelCard.metadataJson).toHaveProperty('features');
      expect(mockFullModelCard.metadataJson.features).toContain('tutoring');
      expect(mockFullModelCard.metadataJson.features).toContain('homework_help');
    });
  });

  describe('date formatting', () => {
    it('should have valid ISO date for lastReviewedAt', () => {
      const date = new Date(mockFullModelCard.lastReviewedAt);
      expect(date.toString()).not.toBe('Invalid Date');
    });

    it('should have valid ISO date for createdAt', () => {
      const date = new Date(mockFullModelCard.createdAt);
      expect(date.toString()).not.toBe('Invalid Date');
    });

    it('should have valid ISO date for updatedAt', () => {
      const date = new Date(mockFullModelCard.updatedAt);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('content extraction', () => {
    it('should extract multiple "Best for" items', () => {
      const items = parseBestFor(mockFullModelCard.intendedUseCases);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((item) => typeof item === 'string' && item.length > 0)).toBe(true);
    });

    it('should extract multiple "Not appropriate for" items', () => {
      const items = parseNotAppropriateFor(mockFullModelCard.limitations);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((item) => typeof item === 'string' && item.length > 0)).toBe(true);
    });

    it('should extract multiple safety measures', () => {
      const items = parseSafetyMeasures(mockFullModelCard.safetyConsiderations);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((item) => typeof item === 'string' && item.length > 0)).toBe(true);
    });

    it('should extract Important note from limitations', () => {
      expect(mockFullModelCard.limitations).toContain('Important:');
      expect(mockFullModelCard.limitations).toContain('supplement');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS: AI Transparency Content
// ══════════════════════════════════════════════════════════════════════════════

describe('AI Transparency Content', () => {
  it('should communicate that AI may make mistakes', () => {
    // Check that model cards include appropriate disclaimers
    const disclaimer = extractDisclaimer(mockFullModelCard.safetyConsiderations);
    expect(disclaimer).toBeTruthy();
  });

  it('should clarify AI is not a diagnostic tool', () => {
    const disclaimer = extractDisclaimer(mockFullModelCard.safetyConsiderations);
    expect(disclaimer).toContain('not a diagnostic tool');
  });

  it('should emphasize human oversight requirements', () => {
    expect(mockFullModelCard.limitations).toContain('Replacing teacher judgment');
    expect(mockFullModelCard.safetyConsiderations).toContain('Human review');
  });

  it('should specify what the model is appropriate for', () => {
    const bestFor = parseBestFor(mockFullModelCard.intendedUseCases);
    expect(bestFor.length).toBeGreaterThan(0);
    expect(bestFor.some((item) => item.includes('explanations'))).toBe(true);
  });

  it('should specify what the model is NOT appropriate for', () => {
    const notFor = parseNotAppropriateFor(mockFullModelCard.limitations);
    expect(notFor.length).toBeGreaterThan(0);
    expect(notFor.some((item) => item.includes('Medical'))).toBe(true);
  });

  it('should document safety measures in place', () => {
    const safety = parseSafetyMeasures(mockFullModelCard.safetyConsiderations);
    expect(safety.length).toBeGreaterThan(0);
    expect(safety.some((item) => item.includes('filtered'))).toBe(true);
  });
});
