/**
 * Explanation Builder Tests
 *
 * Tests for the explanation generation system including:
 * - Template rendering
 * - Fallback summaries
 * - Agent integration hooks
 * - Database persistence
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createExplanationBuilder,
  ExplanationBuilder,
  type BuildExplanationInput,
  type ExplainabilityConfig,
} from '../src/explainability/builder.js';
import {
  explainContentSelection,
  explainDifficultyChange,
  explainFocusBreak,
  explainModuleRecommendation,
  explainScaffolding,
  type AgentContext,
  type ContentSelectionDecision,
  type DifficultyChangeDecision,
  type FocusBreakDecision,
  type ModuleRecommendationDecision,
  type ScaffoldingDecision,
} from '../src/explainability/agents.js';

// ════════════════════════════════════════════════════════════════════════════
// Mock Database
// ════════════════════════════════════════════════════════════════════════════

interface MockRow {
  id: string;
  source_type: string;
  action_type: string;
  template_key: string;
  display_name: string;
  template_text: string;
  placeholders_schema: Record<string, unknown>;
  is_active: boolean;
  created_by: null;
  updated_by: null;
  created_at: Date;
  updated_at: Date;
}

const mockTemplates: Record<string, MockRow> = {
  'VIRTUAL_BRAIN:DIFFICULTY_CHANGE:DIFFICULTY_DOWN_STRUGGLE': {
    id: 'template-1',
    source_type: 'VIRTUAL_BRAIN',
    action_type: 'DIFFICULTY_CHANGE',
    template_key: 'DIFFICULTY_DOWN_STRUGGLE',
    display_name: 'Difficulty Reduced',
    template_text:
      'We adjusted {subject} to an easier level to help build confidence. {learner_name} can work at a comfortable pace.',
    placeholders_schema: {},
    is_active: true,
    created_by: null,
    updated_by: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
  'FOCUS_AGENT:FOCUS_BREAK_TRIGGER:FOCUS_BREAK_TIME_BASED': {
    id: 'template-2',
    source_type: 'FOCUS_AGENT',
    action_type: 'FOCUS_BREAK_TRIGGER',
    template_key: 'FOCUS_BREAK_TIME_BASED',
    display_name: 'Focus Break (Time)',
    template_text:
      'A short break was suggested after {duration_minutes} minutes of focused practice to help maintain attention.',
    placeholders_schema: {},
    is_active: true,
    created_by: null,
    updated_by: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
  'LESSON_PLANNER:CONTENT_SELECTION:CONTENT_SKILL_GAP': {
    id: 'template-3',
    source_type: 'LESSON_PLANNER',
    action_type: 'CONTENT_SELECTION',
    template_key: 'CONTENT_SKILL_GAP',
    display_name: 'Content Selected (Skill Gap)',
    template_text:
      'We selected {content_name} to address {skill_area}, an area identified for growth.',
    placeholders_schema: {},
    is_active: true,
    created_by: null,
    updated_by: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
};

interface InsertedRow {
  id: string;
  tenant_id: string;
  learner_id: string | null;
  source_type: string;
  action_type: string;
  summary_text: string;
  details_json: string;
  template_id: string | null;
}

const insertedExplanations: InsertedRow[] = [];

function createMockPool() {
  return {
    query: vi.fn().mockImplementation((query: string, params?: unknown[]) => {
      // Template lookup
      if (query.includes('explanation_templates')) {
        const sourceType = params?.[0] as string;
        const actionType = params?.[1] as string;
        const templateKey = params?.[2] as string | undefined;

        const key = templateKey
          ? `${sourceType}:${actionType}:${templateKey}`
          : `${sourceType}:${actionType}:default`;

        const template = mockTemplates[key];
        return Promise.resolve({
          rows: template ? [template] : [],
        });
      }

      // Insert explanation event
      if (query.includes('INSERT INTO explanation_events')) {
        insertedExplanations.push({
          id: params?.[0] as string,
          tenant_id: params?.[1] as string,
          learner_id: params?.[2] as string | null,
          source_type: params?.[5] as string,
          action_type: params?.[6] as string,
          summary_text: params?.[9] as string,
          details_json: params?.[10] as string,
          template_id: params?.[12] as string | null,
        });
        return Promise.resolve({ rowCount: 1 });
      }

      return Promise.resolve({ rows: [] });
    }),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Test Setup
// ════════════════════════════════════════════════════════════════════════════

describe('ExplanationBuilder', () => {
  let mockPool: ReturnType<typeof createMockPool>;
  let builder: ExplanationBuilder;
  const testConfig: ExplainabilityConfig = {
    enabled: true,
    enableAiSummaries: false,
    asyncWrites: false, // Sync for testing
    generatorVersion: '1.0.0-test',
    templateCacheTtlMs: 0, // No cache for testing
  };

  beforeEach(() => {
    mockPool = createMockPool();
    builder = createExplanationBuilder(mockPool as unknown as import('pg').Pool, testConfig);
    insertedExplanations.length = 0;
  });

  afterEach(() => {
    builder.clearTemplateCache();
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Template Rendering Tests
  // ──────────────────────────────────────────────────────────────────────────

  describe('buildExplanation with templates', () => {
    it('should render template with placeholders', async () => {
      const input: BuildExplanationInput = {
        tenantId: 'tenant-1',
        learnerId: 'learner-1',
        sourceType: 'VIRTUAL_BRAIN',
        actionType: 'DIFFICULTY_CHANGE',
        relatedEntityType: 'SKILL',
        relatedEntityId: 'skill-123',
        reasons: [
          { code: 'REPEATED_STRUGGLE', description: 'Recent practice showed difficulty' },
        ],
        inputs: {
          subject: 'fractions',
          learnerName: 'Alex',
        },
        templateKey: 'DIFFICULTY_DOWN_STRUGGLE',
        templateContext: {
          subject: 'fractions',
          learner_name: 'Alex',
        },
      };

      const result = await builder.buildExplanation(input);

      expect(result.summaryText).toBe(
        'We adjusted fractions to an easier level to help build confidence. Alex can work at a comfortable pace.'
      );
      expect(result.templateId).toBe('template-1');
      expect(result.aiGenerated).toBe(false);
      expect(result.detailsJson.reasons).toHaveLength(1);
      expect(result.detailsJson.reasons![0]!.code).toBe('REPEATED_STRUGGLE');
    });

    it('should include all details in detailsJson', async () => {
      const input: BuildExplanationInput = {
        tenantId: 'tenant-1',
        learnerId: 'learner-1',
        sourceType: 'FOCUS_AGENT',
        actionType: 'FOCUS_BREAK_TRIGGER',
        relatedEntityType: 'SESSION_EVENT',
        relatedEntityId: 'event-123',
        reasons: [
          { code: 'TIME_BASED', description: 'Session exceeded time threshold', weight: 0.8 },
          { code: 'FOCUS_SCORE_LOW', description: 'Focus score dropped', weight: 0.2 },
        ],
        inputs: {
          sessionDurationMinutes: 25,
          focusScore: 0.35,
          durationMinutes: 25,
        },
        thresholds: {
          timeThresholdMinutes: 25,
          focusThreshold: 0.4,
        },
        policyReferences: ['FOCUS_BREAK_POLICY_V1'],
        experimentKey: 'focus_break_timing',
        variantId: 'short_breaks',
        templateKey: 'FOCUS_BREAK_TIME_BASED',
        templateContext: {
          duration_minutes: 25,
        },
      };

      const result = await builder.buildExplanation(input);

      expect(result.summaryText).toContain('25 minutes');
      expect(result.detailsJson.reasons).toHaveLength(2);
      expect(result.detailsJson.reasons![0]!.weight).toBe(0.8);
      expect(result.detailsJson.inputs?.sessionDurationMinutes).toBe(25);
      expect(result.detailsJson.thresholds?.timeThresholdMinutes).toBe(25);
      expect(result.detailsJson.policyReferences).toContain('FOCUS_BREAK_POLICY_V1');
      expect(result.detailsJson.experimentKey).toBe('focus_break_timing');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Fallback Summary Tests
  // ──────────────────────────────────────────────────────────────────────────

  describe('buildExplanation fallback', () => {
    it('should generate fallback when no template found', async () => {
      const input: BuildExplanationInput = {
        tenantId: 'tenant-1',
        learnerId: 'learner-1',
        sourceType: 'BASELINE_AGENT',
        actionType: 'CONTENT_SELECTION',
        relatedEntityType: 'ASSESSMENT',
        relatedEntityId: 'assessment-123',
        reasons: [{ code: 'CUSTOM_REASON', description: 'based on diagnostic results' }],
        inputs: {},
      };

      const result = await builder.buildExplanation(input);

      expect(result.summaryText).toBe('We selected this activity based on diagnostic results.');
      expect(result.templateId).toBeUndefined();
      expect(result.aiGenerated).toBe(false);
    });

    it('should generate neutral fallback for difficulty change', async () => {
      const input: BuildExplanationInput = {
        tenantId: 'tenant-1',
        learnerId: 'learner-1',
        sourceType: 'VIRTUAL_BRAIN',
        actionType: 'DIFFICULTY_CHANGE',
        relatedEntityType: 'SKILL',
        relatedEntityId: 'skill-123',
        reasons: [{ code: 'UNKNOWN_REASON', description: 'to support learning progress' }],
        inputs: {},
        // No template key - force fallback
      };

      // Override mock to return no template
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('explanation_templates')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await builder.buildExplanation(input);

      expect(result.summaryText).toBe(
        'We adjusted the difficulty level to support learning progress.'
      );
      // Should NOT contain judgmental language
      expect(result.summaryText).not.toMatch(/struggl|fail|poor|bad|wrong/i);
    });

    it('should use primary reason description in fallback', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('explanation_templates')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const input: BuildExplanationInput = {
        tenantId: 'tenant-1',
        learnerId: 'learner-1',
        sourceType: 'RECOMMENDER',
        actionType: 'MODULE_RECOMMENDATION',
        relatedEntityType: 'MODULE',
        relatedEntityId: 'module-123',
        reasons: [
          { code: 'SKILL_GAP', description: 'to strengthen multiplication understanding' },
          { code: 'ENGAGEMENT', description: 'based on learning preferences' },
        ],
        inputs: {},
      };

      const result = await builder.buildExplanation(input);

      expect(result.summaryText).toBe(
        'We recommended this module to strengthen multiplication understanding.'
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Persistence Tests
  // ──────────────────────────────────────────────────────────────────────────

  describe('explain (build and persist)', () => {
    it('should persist explanation event to database', async () => {
      const input: BuildExplanationInput = {
        tenantId: 'tenant-1',
        learnerId: 'learner-1',
        sessionId: 'session-1',
        sourceType: 'LESSON_PLANNER',
        actionType: 'CONTENT_SELECTION',
        relatedEntityType: 'LEARNING_OBJECT_VERSION',
        relatedEntityId: 'lo-123',
        reasons: [{ code: 'SKILL_GAP_FILL', description: 'addresses skill gap' }],
        inputs: {
          contentName: 'Fraction Basics',
          skillArea: 'fractions',
        },
        templateKey: 'CONTENT_SKILL_GAP',
        templateContext: {
          content_name: 'Fraction Basics',
          skill_area: 'fractions',
        },
      };

      const result = await builder.explain(input);

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.id).toBeTruthy();

      // Verify insert was called
      expect(insertedExplanations).toHaveLength(1);
      expect(insertedExplanations[0]!.tenant_id).toBe('tenant-1');
      expect(insertedExplanations[0]!.learner_id).toBe('learner-1');
      expect(insertedExplanations[0]!.source_type).toBe('LESSON_PLANNER');
      expect(insertedExplanations[0]!.action_type).toBe('CONTENT_SELECTION');
      expect(insertedExplanations[0]!.template_id).toBe('template-3');
    });

    it('should return null when explainability is disabled', async () => {
      const disabledBuilder = createExplanationBuilder(mockPool as unknown as import('pg').Pool, {
        ...testConfig,
        enabled: false,
      });

      const result = await disabledBuilder.explain({
        tenantId: 'tenant-1',
        sourceType: 'VIRTUAL_BRAIN',
        actionType: 'DIFFICULTY_CHANGE',
        relatedEntityType: 'SKILL',
        relatedEntityId: 'skill-123',
        reasons: [],
        inputs: {},
      });

      expect(result).toBeNull();
      expect(insertedExplanations).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('INSERT INTO explanation_events')) {
          return Promise.reject(new Error('Database connection failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await builder.explain({
        tenantId: 'tenant-1',
        sourceType: 'VIRTUAL_BRAIN',
        actionType: 'DIFFICULTY_CHANGE',
        relatedEntityType: 'SKILL',
        relatedEntityId: 'skill-123',
        reasons: [{ code: 'TEST', description: 'test' }],
        inputs: {},
      });

      expect(result?.success).toBe(false);
      expect(result?.error).toContain('Database connection failed');
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Agent Integration Tests
// ════════════════════════════════════════════════════════════════════════════

describe('Agent Explanation Hooks', () => {
  let mockPool: ReturnType<typeof createMockPool>;
  let builder: ExplanationBuilder;
  const testConfig: ExplainabilityConfig = {
    enabled: true,
    enableAiSummaries: false,
    asyncWrites: false,
    generatorVersion: '1.0.0-test',
    templateCacheTtlMs: 0,
  };

  const baseContext: AgentContext = {
    tenantId: 'tenant-1',
    learnerId: 'learner-1',
    sessionId: 'session-1',
    learnerName: 'Alex',
  };

  beforeEach(() => {
    mockPool = createMockPool();
    builder = createExplanationBuilder(mockPool as unknown as import('pg').Pool, testConfig);
    insertedExplanations.length = 0;
  });

  afterEach(() => {
    builder.clearTemplateCache();
    vi.clearAllMocks();
  });

  describe('explainContentSelection', () => {
    it('should create explanation for content selection', async () => {
      const decision: ContentSelectionDecision = {
        selectedLoVersionId: 'lo-version-123',
        contentName: 'Fraction Basics',
        subject: 'Math',
        skillArea: 'fractions',
        masteryScore: 0.42,
        gradeBand: 'K5',
        lastUsedDaysAgo: 7,
        masteryThreshold: 0.6,
        selectionReasons: ['SKILL_GAP_FILL', 'MASTERY_MATCH'],
      };

      // Use sync version for testing
      await builder.explain({
        tenantId: baseContext.tenantId,
        learnerId: baseContext.learnerId,
        sessionId: baseContext.sessionId,
        sourceType: 'LESSON_PLANNER',
        actionType: 'CONTENT_SELECTION',
        relatedEntityType: 'LEARNING_OBJECT_VERSION',
        relatedEntityId: decision.selectedLoVersionId,
        reasons: [
          { code: 'SKILL_GAP_FILL', description: 'addresses an area identified for growth' },
          { code: 'MASTERY_MATCH', description: 'matches current skill level' },
        ],
        inputs: {
          masteryScore: decision.masteryScore,
          gradeBand: decision.gradeBand,
          subject: decision.subject,
          contentName: decision.contentName,
          skillArea: decision.skillArea,
        },
        templateKey: 'CONTENT_SKILL_GAP',
        templateContext: {
          content_name: decision.contentName,
          skill_area: decision.skillArea,
        },
      });

      expect(insertedExplanations).toHaveLength(1);
      expect(insertedExplanations[0]!.source_type).toBe('LESSON_PLANNER');
      expect(insertedExplanations[0]!.action_type).toBe('CONTENT_SELECTION');

      const details = JSON.parse(insertedExplanations[0]!.details_json);
      expect(details.reasons).toHaveLength(2);
      expect(details.inputs.masteryScore).toBe(0.42);
    });
  });

  describe('explainDifficultyChange', () => {
    it('should create explanation for difficulty decrease', async () => {
      const decision: DifficultyChangeDecision = {
        skillId: 'skill-123',
        subject: 'Math',
        direction: 'DECREASE',
        previousLevel: 3,
        newLevel: 2,
        recentAccuracy: 0.35,
        attemptCount: 10,
        masteryScore: 0.42,
        changeReasons: ['REPEATED_STRUGGLE', 'BELOW_THRESHOLD'],
      };

      await builder.explain({
        tenantId: baseContext.tenantId,
        learnerId: baseContext.learnerId,
        sourceType: 'VIRTUAL_BRAIN',
        actionType: 'DIFFICULTY_CHANGE',
        relatedEntityType: 'SKILL',
        relatedEntityId: decision.skillId,
        reasons: [
          { code: 'REPEATED_STRUGGLE', description: 'recent practice showed some areas for growth' },
        ],
        inputs: {
          subject: decision.subject,
          direction: decision.direction,
          recentAccuracy: decision.recentAccuracy,
          learnerName: baseContext.learnerName,
        },
        templateKey: 'DIFFICULTY_DOWN_STRUGGLE',
        templateContext: {
          subject: decision.subject,
          learner_name: baseContext.learnerName,
        },
      });

      expect(insertedExplanations).toHaveLength(1);
      expect(insertedExplanations[0]!.source_type).toBe('VIRTUAL_BRAIN');

      // Verify summary is neutral
      expect(insertedExplanations[0]!.summary_text).not.toMatch(/fail|poor|bad|wrong/i);
      expect(insertedExplanations[0]!.summary_text).toContain('easier level');
    });
  });

  describe('explainFocusBreak', () => {
    it('should create explanation for time-based break', async () => {
      const decision: FocusBreakDecision = {
        sessionEventId: 'event-123',
        sessionDurationMinutes: 25,
        focusScore: 0.65,
        breakType: 'MOVEMENT',
        triggerReasons: ['TIME_BASED', 'SCHEDULED_BREAK'],
      };

      await builder.explain({
        tenantId: baseContext.tenantId,
        learnerId: baseContext.learnerId,
        sessionId: baseContext.sessionId,
        sourceType: 'FOCUS_AGENT',
        actionType: 'FOCUS_BREAK_TRIGGER',
        relatedEntityType: 'SESSION_EVENT',
        relatedEntityId: decision.sessionEventId,
        reasons: [
          { code: 'TIME_BASED', description: 'after focused practice to help maintain attention' },
        ],
        inputs: {
          sessionDurationMinutes: decision.sessionDurationMinutes,
          durationMinutes: decision.sessionDurationMinutes,
          focusScore: decision.focusScore,
        },
        templateKey: 'FOCUS_BREAK_TIME_BASED',
        templateContext: {
          duration_minutes: decision.sessionDurationMinutes,
        },
      });

      expect(insertedExplanations).toHaveLength(1);
      expect(insertedExplanations[0]!.source_type).toBe('FOCUS_AGENT');
      expect(insertedExplanations[0]!.summary_text).toContain('25 minutes');
    });
  });

  describe('explainModuleRecommendation', () => {
    it('should create explanation for module recommendation', async () => {
      const decision: ModuleRecommendationDecision = {
        moduleId: 'module-123',
        moduleName: 'Advanced Fractions',
        subject: 'Math',
        skillArea: 'fractions',
        prerequisiteSkill: 'basic fractions',
        confidence: 0.85,
        recommendationReasons: ['NEXT_IN_SEQUENCE', 'SKILL_GAP'],
      };

      await builder.explain({
        tenantId: baseContext.tenantId,
        learnerId: baseContext.learnerId,
        userId: 'parent-1',
        sourceType: 'RECOMMENDER',
        actionType: 'MODULE_RECOMMENDATION',
        relatedEntityType: 'MODULE',
        relatedEntityId: decision.moduleId,
        reasons: [
          {
            code: 'NEXT_IN_SEQUENCE',
            description: 'is the natural next step in the learning journey',
          },
        ],
        inputs: {
          moduleName: decision.moduleName,
          skillArea: decision.skillArea,
        },
        confidence: decision.confidence,
      });

      expect(insertedExplanations).toHaveLength(1);
      expect(insertedExplanations[0]!.source_type).toBe('RECOMMENDER');
    });
  });

  describe('explainScaffolding', () => {
    it('should create explanation for scaffolding decision', async () => {
      const decision: ScaffoldingDecision = {
        stepId: 'step-123',
        scaffoldType: 'HINT',
        attemptCount: 3,
        hintRequested: false,
        scaffoldReasons: ['MULTIPLE_ATTEMPTS', 'PROACTIVE_SUPPORT'],
      };

      await builder.explain({
        tenantId: baseContext.tenantId,
        learnerId: baseContext.learnerId,
        sessionId: baseContext.sessionId,
        sourceType: 'HOMEWORK_HELPER',
        actionType: 'SCAFFOLDING_DECISION',
        relatedEntityType: 'ACTIVITY',
        relatedEntityId: decision.stepId,
        reasons: [
          { code: 'MULTIPLE_ATTEMPTS', description: 'to guide toward the solution' },
        ],
        inputs: {
          scaffoldType: decision.scaffoldType,
          attemptCount: decision.attemptCount,
        },
      });

      expect(insertedExplanations).toHaveLength(1);
      expect(insertedExplanations[0]!.source_type).toBe('HOMEWORK_HELPER');
      expect(insertedExplanations[0]!.action_type).toBe('SCAFFOLDING_DECISION');
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Language Quality Tests
// ════════════════════════════════════════════════════════════════════════════

describe('Explanation Language Quality', () => {
  let mockPool: ReturnType<typeof createMockPool>;
  let builder: ExplanationBuilder;

  beforeEach(() => {
    mockPool = createMockPool();
    // Return no templates to force fallback
    mockPool.query.mockImplementation((query: string) => {
      if (query.includes('explanation_templates')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    builder = createExplanationBuilder(mockPool as unknown as import('pg').Pool, {
      enabled: true,
      enableAiSummaries: false,
      asyncWrites: false,
      generatorVersion: '1.0.0-test',
      templateCacheTtlMs: 0,
    });
  });

  const inappropriatePatterns = [
    /struggling/i,
    /failed/i,
    /poor performance/i,
    /bad/i,
    /wrong/i,
    /stupid/i,
    /slow learner/i,
    /behind/i,
    /disability/i,
    /disorder/i,
    /diagnosis/i,
    /ADHD/i,
    /autism/i,
    /dyslexia/i,
  ];

  it.each([
    { actionType: 'DIFFICULTY_CHANGE' as const, description: 'to support learning progress' },
    { actionType: 'FOCUS_BREAK_TRIGGER' as const, description: 'to refresh and refocus' },
    { actionType: 'CONTENT_SELECTION' as const, description: 'based on current progress' },
    {
      actionType: 'MODULE_RECOMMENDATION' as const,
      description: 'to support continued growth',
    },
  ])('should generate appropriate language for $actionType', async ({ actionType, description }) => {
    const result = await builder.buildExplanation({
      tenantId: 'tenant-1',
      learnerId: 'learner-1',
      sourceType: 'VIRTUAL_BRAIN',
      actionType,
      relatedEntityType: 'SKILL',
      relatedEntityId: 'skill-123',
      reasons: [{ code: 'TEST', description }],
      inputs: {},
    });

    for (const pattern of inappropriatePatterns) {
      expect(result.summaryText).not.toMatch(pattern);
    }
  });

  it('should never include diagnostic language', async () => {
    const result = await builder.buildExplanation({
      tenantId: 'tenant-1',
      learnerId: 'learner-1',
      sourceType: 'FOCUS_AGENT',
      actionType: 'FOCUS_INTERVENTION',
      relatedEntityType: 'SESSION_EVENT',
      relatedEntityId: 'event-123',
      reasons: [
        {
          code: 'ENGAGEMENT_DROP',
          description: 'to help re-engage with learning',
        },
      ],
      inputs: {
        focusScore: 0.2,
        idleSeconds: 60,
      },
    });

    // Should not suggest any medical/psychological conditions
    for (const pattern of inappropriatePatterns) {
      expect(result.summaryText).not.toMatch(pattern);
    }

    // Should be supportive
    expect(result.summaryText.length).toBeGreaterThan(10);
    expect(result.summaryText.length).toBeLessThan(300);
  });
});
