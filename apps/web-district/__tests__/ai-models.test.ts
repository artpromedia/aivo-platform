/**
 * District Admin AI Models Page Tests
 *
 * Tests for the AI overview page that shows model capabilities and limitations
 * to district administrators.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

const mockTenantModelCards = [
  {
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
• Explaining mistakes in a supportive way`,
    limitations: `Not appropriate for:
• Medical, legal, or professional advice
• Grading or formal assessment decisions
• Replacing teacher judgment on student progress

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
    featureKey: 'TUTORING',
    isActive: true,
  },
  {
    id: '2',
    modelKey: 'AIVO_BASELINE_V1',
    provider: 'OPENAI' as const,
    displayName: 'Aivo Baseline Assessment',
    description: 'Analyzes learner responses during baseline assessments to determine starting skill levels.',
    intendedUseCases: `Best for:
• Analyzing written responses for skill demonstration
• Identifying prerequisite knowledge gaps
• Suggesting appropriate starting points`,
    limitations: `Not appropriate for:
• Formal diagnostic assessment
• Special education eligibility decisions
• High-stakes placement decisions

Important: Baseline results are preliminary indicators and should be validated by educators.`,
    safetyConsiderations: `Safety measures in place:
• Results presented as suggestions, not determinations
• Educator review required before finalizing placement

Disclaimer: AI-generated baselines are not a substitute for professional educational assessment.`,
    inputTypes: 'Text (student responses, answer selections)',
    outputTypes: 'Text (skill assessments, confidence scores, placement suggestions)',
    dataSourcesSummary: 'Calibrated against educator-graded response samples across grade levels.',
    lastReviewedAt: '2024-11-15T00:00:00Z',
    lastReviewedBy: null,
    metadataJson: { version: '1.0', baseModel: 'gpt-4o' },
    createdAt: '2024-09-01T00:00:00Z',
    updatedAt: '2024-11-15T00:00:00Z',
    featureKey: 'BASELINE',
    isActive: true,
  },
  {
    id: '3',
    modelKey: 'AIVO_FOCUS_V1',
    provider: 'INTERNAL' as const,
    displayName: 'Aivo Focus Assistant',
    description: 'A rule-based system enhanced with ML that monitors learner engagement patterns.',
    intendedUseCases: `Best for:
• Detecting signs of learner disengagement
• Suggesting timely breaks
• Adjusting session pacing`,
    limitations: `Not appropriate for:
• Diagnosing attention disorders
• Clinical ADHD assessment
• Medical recommendations

Important: Focus patterns vary naturally among learners.`,
    safetyConsiderations: `Safety measures in place:
• No diagnostic labels applied to learners
• Break suggestions are optional, not mandatory

Disclaimer: This system identifies engagement patterns, not attention disorders.`,
    inputTypes: 'Behavioral signals (response times, interaction patterns)',
    outputTypes: 'Suggestions (break recommendations, activity switches)',
    dataSourcesSummary: 'Trained on anonymized engagement patterns with no PII.',
    lastReviewedAt: '2024-12-05T00:00:00Z',
    lastReviewedBy: null,
    metadataJson: { version: '1.0', type: 'hybrid' },
    createdAt: '2024-08-01T00:00:00Z',
    updatedAt: '2024-12-05T00:00:00Z',
    featureKey: 'FOCUS',
    isActive: true,
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (from model-cards-api.ts)
// ══════════════════════════════════════════════════════════════════════════════

const FEATURE_DISPLAY: Record<string, { name: string; icon: string }> = {
  TUTORING: { name: 'AI Tutoring', icon: '📚' },
  BASELINE: { name: 'Baseline Assessment', icon: '📊' },
  HOMEWORK_HELP: { name: 'Homework Helper', icon: '✏️' },
  FOCUS: { name: 'Focus Support', icon: '🧘' },
  RECOMMENDATIONS: { name: 'Learning Recommendations', icon: '🎯' },
  HOMEWORK_PARSING: { name: 'Homework Vision', icon: '📷' },
  SEL: { name: 'SEL Activities', icon: '💚' },
  ALL: { name: 'All Features', icon: '⭐' },
};

const PROVIDER_DISPLAY: Record<string, { name: string; colorClass: string }> = {
  OPENAI: { name: 'OpenAI', colorClass: 'bg-emerald-100 text-emerald-800' },
  ANTHROPIC: { name: 'Anthropic', colorClass: 'bg-orange-100 text-orange-800' },
  GOOGLE: { name: 'Google', colorClass: 'bg-blue-100 text-blue-800' },
  INTERNAL: { name: 'Internal', colorClass: 'bg-slate-100 text-slate-800' },
};

function parseBestFor(intendedUseCases: string): string[] {
  const bestForMatch = intendedUseCases.match(/Best for:\s*([\s\S]*?)(?=\n\n|Not appropriate|$)/i);
  if (!bestForMatch?.[1]) return [];

  return bestForMatch[1]
    .split('\n')
    .filter((line) => line.trim().startsWith('•'))
    .map((line) => line.replace('•', '').trim());
}

function parseNotAppropriateFor(limitations: string): string[] {
  const notAppropriateMatch = limitations.match(
    /Not appropriate for:\s*([\s\S]*?)(?=\n\nImportant:|$)/i
  );
  if (!notAppropriateMatch?.[1]) return [];

  return notAppropriateMatch[1]
    .split('\n')
    .filter((line) => line.trim().startsWith('•'))
    .map((line) => line.replace('•', '').trim());
}

function extractDisclaimer(safety: string): string | null {
  const disclaimerMatch = safety.match(/Disclaimer:\s*(.+)/i);
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
// TESTS: District AI Models Overview
// ══════════════════════════════════════════════════════════════════════════════

describe('District Admin AI Models Page', () => {
  describe('tenant-specific model cards', () => {
    it('should have featureKey and isActive for tenant assignment', () => {
      const model = mockTenantModelCards[0]!;

      expect(model).toHaveProperty('featureKey');
      expect(model).toHaveProperty('isActive');
      expect(model.featureKey).toBe('TUTORING');
      expect(model.isActive).toBe(true);
    });

    it('should have all base model card fields', () => {
      const model = mockTenantModelCards[0]!;

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
    });

    it('should map to correct feature display names', () => {
      for (const model of mockTenantModelCards) {
        const featureDisplay = FEATURE_DISPLAY[model.featureKey];
        expect(featureDisplay).toBeDefined();
        expect(featureDisplay!.name).toBeTruthy();
        expect(featureDisplay!.icon).toBeTruthy();
      }
    });
  });

  describe('helper functions', () => {
    it('should parse "Best for" items', () => {
      const model = mockTenantModelCards[0]!;
      const bestFor = parseBestFor(model.intendedUseCases);

      expect(bestFor.length).toBeGreaterThan(0);
      expect(bestFor[0]).toBe('Providing step-by-step explanations of concepts');
    });

    it('should parse "Not appropriate for" items', () => {
      const model = mockTenantModelCards[0]!;
      const notFor = parseNotAppropriateFor(model.limitations);

      expect(notFor.length).toBeGreaterThan(0);
      expect(notFor[0]).toBe('Medical, legal, or professional advice');
    });

    it('should extract disclaimer', () => {
      const model = mockTenantModelCards[0]!;
      const disclaimer = extractDisclaimer(model.safetyConsiderations);

      expect(disclaimer).not.toBeNull();
      expect(disclaimer).toContain('not a diagnostic tool');
    });

    it('should format review date for display', () => {
      const formatted = formatReviewDate('2024-12-01T00:00:00Z');

      expect(formatted).toContain('Dec');
      expect(formatted).toContain('2024');
    });
  });

  describe('provider display mapping', () => {
    it('should have display info for all used providers', () => {
      const providers = mockTenantModelCards.map((m) => m.provider);

      for (const provider of providers) {
        expect(PROVIDER_DISPLAY[provider]).toBeDefined();
        expect(PROVIDER_DISPLAY[provider]!.name).toBeTruthy();
        expect(PROVIDER_DISPLAY[provider]!.colorClass).toBeTruthy();
      }
    });
  });

  describe('feature display mapping', () => {
    it('should have display info for TUTORING feature', () => {
      expect(FEATURE_DISPLAY.TUTORING!.name).toBe('AI Tutoring');
      expect(FEATURE_DISPLAY.TUTORING!.icon).toBe('📚');
    });

    it('should have display info for BASELINE feature', () => {
      expect(FEATURE_DISPLAY.BASELINE!.name).toBe('Baseline Assessment');
      expect(FEATURE_DISPLAY.BASELINE!.icon).toBe('📊');
    });

    it('should have display info for FOCUS feature', () => {
      expect(FEATURE_DISPLAY.FOCUS!.name).toBe('Focus Support');
      expect(FEATURE_DISPLAY.FOCUS!.icon).toBe('🧘');
    });

    it('should have display info for ALL features fallback', () => {
      expect(FEATURE_DISPLAY.ALL!.name).toBe('All Features');
      expect(FEATURE_DISPLAY.ALL!.icon).toBe('⭐');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS: Model Detail Modal
// ══════════════════════════════════════════════════════════════════════════════

describe('Model Detail Modal', () => {
  describe('content display', () => {
    it('should have all sections available for display', () => {
      const model = mockTenantModelCards[0]!;

      // Overview
      expect(model.description).toBeTruthy();
      expect(model.description.length).toBeGreaterThan(50);

      // Intended Uses
      expect(model.intendedUseCases).toContain('Best for:');
      const bestFor = parseBestFor(model.intendedUseCases);
      expect(bestFor.length).toBeGreaterThan(0);

      // Limitations
      expect(model.limitations).toContain('Not appropriate for:');
      const notFor = parseNotAppropriateFor(model.limitations);
      expect(notFor.length).toBeGreaterThan(0);

      // Safety
      expect(model.safetyConsiderations).toContain('Safety measures');
      expect(model.safetyConsiderations).toContain('Disclaimer:');

      // Input/Output
      expect(model.inputTypes).toBeTruthy();
      expect(model.outputTypes).toBeTruthy();

      // Data Sources
      expect(model.dataSourcesSummary).toBeTruthy();
    });

    it('should have provider and review date for header', () => {
      const model = mockTenantModelCards[0];

      expect(model.provider).toBe('OPENAI');
      expect(model.lastReviewedAt).toBeTruthy();

      const formattedDate = formatReviewDate(model.lastReviewedAt);
      expect(formattedDate).toContain('Dec');
    });
  });

  describe('accessibility', () => {
    it('should have unique model keys for accessibility IDs', () => {
      const modelKeys = mockTenantModelCards.map((m) => m.modelKey);
      const uniqueKeys = new Set(modelKeys);

      expect(uniqueKeys.size).toBe(modelKeys.length);
    });

    it('should have display names suitable for modal titles', () => {
      for (const model of mockTenantModelCards) {
        expect(model.displayName).toBeTruthy();
        expect(model.displayName.length).toBeGreaterThan(5);
        expect(model.displayName.length).toBeLessThan(100);
      }
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS: AI Transparency for District Admins
// ══════════════════════════════════════════════════════════════════════════════

describe('AI Transparency for District Admins', () => {
  describe('clear communication of AI limitations', () => {
    it('should clearly state what AI is NOT appropriate for', () => {
      for (const model of mockTenantModelCards) {
        expect(model.limitations).toContain('Not appropriate for:');
        const notFor = parseNotAppropriateFor(model.limitations);
        expect(notFor.length).toBeGreaterThan(0);
      }
    });

    it('should include disclaimers about AI not being diagnostic tools', () => {
      let hasNonDiagnosticDisclaimer = false;

      for (const model of mockTenantModelCards) {
        const disclaimer = extractDisclaimer(model.safetyConsiderations);
        if (disclaimer && disclaimer.toLowerCase().includes('not a diagnostic')) {
          hasNonDiagnosticDisclaimer = true;
        }
      }

      expect(hasNonDiagnosticDisclaimer).toBe(true);
    });

    it('should mention human oversight or review requirements', () => {
      let mentionsHumanOversight = false;

      for (const model of mockTenantModelCards) {
        if (
          model.safetyConsiderations.includes('Human review') ||
          model.safetyConsiderations.includes('Educator review') ||
          model.limitations.includes('Replacing teacher')
        ) {
          mentionsHumanOversight = true;
        }
      }

      expect(mentionsHumanOversight).toBe(true);
    });
  });

  describe('clear communication of AI capabilities', () => {
    it('should clearly state what AI IS appropriate for', () => {
      for (const model of mockTenantModelCards) {
        expect(model.intendedUseCases).toContain('Best for:');
        const bestFor = parseBestFor(model.intendedUseCases);
        expect(bestFor.length).toBeGreaterThan(0);
      }
    });

    it('should provide context about data sources', () => {
      for (const model of mockTenantModelCards) {
        expect(model.dataSourcesSummary).toBeTruthy();
        expect(model.dataSourcesSummary.length).toBeGreaterThan(20);
      }
    });
  });

  describe('safety information', () => {
    it('should document safety measures in place', () => {
      for (const model of mockTenantModelCards) {
        expect(model.safetyConsiderations).toContain('Safety measures in place:');
      }
    });

    it('should not apply diagnostic labels inappropriately', () => {
      // The Focus model specifically should not diagnose ADHD
      const focusModel = mockTenantModelCards.find((m) => m.modelKey === 'AIVO_FOCUS_V1');
      expect(focusModel).toBeDefined();
      expect(focusModel!.limitations).toContain('Diagnosing attention disorders');
      expect(focusModel!.safetyConsiderations).toContain('No diagnostic labels');
    });

    it('should require educator validation for assessments', () => {
      // The Baseline model should require educator review
      const baselineModel = mockTenantModelCards.find((m) => m.modelKey === 'AIVO_BASELINE_V1');
      expect(baselineModel).toBeDefined();
      expect(baselineModel!.safetyConsiderations).toContain('Educator review required');
    });
  });
});
