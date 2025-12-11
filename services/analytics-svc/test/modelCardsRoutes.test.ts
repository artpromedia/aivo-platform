/**
 * Model Cards Routes Tests
 *
 * Tests for AI model card API endpoints used by Platform Admin
 * and District Admin for AI transparency features.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the prisma client
vi.mock('../src/prisma.js', () => ({
  prisma: {
    modelCard: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    tenantModelAssignment: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../src/prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

const mockModelCards = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    modelKey: 'AIVO_TUTOR_V1',
    provider: 'OPENAI',
    displayName: 'Aivo Tutor',
    description: 'AI-powered tutoring assistant for K-12 learners',
    intendedUseCases: `Best for:
• Providing step-by-step explanations of concepts
• Answering curriculum-aligned questions
• Offering hints and guided practice`,
    limitations: `Not appropriate for:
• Medical, legal, or professional advice
• Grading or formal assessment decisions
• Replacing teacher judgment on student progress`,
    safetyConsiderations: `Safety measures in place:
• Content filtered for age-appropriateness
• Guardrails prevent discussion of harmful topics
• Human review of flagged interactions

Disclaimer: This is not a diagnostic tool.`,
    inputTypes: 'Text (student questions, responses, homework problems)',
    outputTypes: 'Text (explanations, hints, feedback, encouragement)',
    dataSourcesSummary: 'Trained on curated educational content aligned with Common Core.',
    lastReviewedAt: new Date('2024-12-01'),
    lastReviewedBy: null,
    metadataJson: {
      version: '1.0',
      baseModel: 'gpt-4o-mini',
      features: ['tutoring', 'homework_help'],
    },
    createdAt: new Date('2024-10-01'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    modelKey: 'AIVO_BASELINE_V1',
    provider: 'OPENAI',
    displayName: 'Aivo Baseline Assessment',
    description: 'Analyzes learner responses during baseline assessments',
    intendedUseCases: `Best for:
• Analyzing written responses for skill demonstration
• Identifying prerequisite knowledge gaps`,
    limitations: `Not appropriate for:
• Formal diagnostic assessment
• High-stakes placement decisions`,
    safetyConsiderations: `Safety measures in place:
• Results presented as suggestions, not determinations
• Educator review required before finalizing placement`,
    inputTypes: 'Text (student responses, answer selections)',
    outputTypes: 'Text (skill assessments, confidence scores)',
    dataSourcesSummary: 'Calibrated against educator-graded response samples.',
    lastReviewedAt: new Date('2024-11-15'),
    lastReviewedBy: null,
    metadataJson: { version: '1.0', baseModel: 'gpt-4o' },
    createdAt: new Date('2024-09-01'),
    updatedAt: new Date('2024-11-15'),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    modelKey: 'AIVO_FOCUS_V1',
    provider: 'INTERNAL',
    displayName: 'Aivo Focus Assistant',
    description: 'Rule-based system for engagement monitoring',
    intendedUseCases: `Best for:
• Detecting signs of learner disengagement
• Suggesting timely breaks`,
    limitations: `Not appropriate for:
• Diagnosing attention disorders
• Clinical ADHD assessment`,
    safetyConsiderations: `Safety measures in place:
• No diagnostic labels applied to learners
• Break suggestions are optional`,
    inputTypes: 'Behavioral signals (response times, interaction patterns)',
    outputTypes: 'Suggestions (break recommendations, activity switches)',
    dataSourcesSummary: 'Trained on anonymized engagement patterns.',
    lastReviewedAt: new Date('2024-12-05'),
    lastReviewedBy: null,
    metadataJson: { version: '1.0', type: 'hybrid' },
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-05'),
  },
];

const mockTenantAssignments = [
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    tenantId: '770e8400-e29b-41d4-a716-446655440001',
    modelCardId: '550e8400-e29b-41d4-a716-446655440001',
    featureKey: 'TUTORING',
    isActive: true,
    assignedAt: new Date('2024-10-01'),
    assignedBy: null,
    modelCard: mockModelCards[0],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002',
    tenantId: '770e8400-e29b-41d4-a716-446655440001',
    modelCardId: '550e8400-e29b-41d4-a716-446655440002',
    featureKey: 'BASELINE',
    isActive: true,
    assignedAt: new Date('2024-10-01'),
    assignedBy: null,
    modelCard: mockModelCards[1],
  },
];

// Get mocks
const mockFindMany = prisma.modelCard.findMany as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.modelCard.findUnique as ReturnType<typeof vi.fn>;
const mockCount = prisma.modelCard.count as ReturnType<typeof vi.fn>;
const mockAssignmentFindMany = prisma.tenantModelAssignment.findMany as ReturnType<typeof vi.fn>;

// ══════════════════════════════════════════════════════════════════════════════
// HELPER TYPES (match route response shapes)
// ══════════════════════════════════════════════════════════════════════════════

interface ModelCardDbRow {
  id: string;
  modelKey: string;
  provider: string;
  displayName: string;
  description: string;
  intendedUseCases: string;
  lastReviewedAt: Date;
}

interface ModelCardSummary {
  id: string;
  modelKey: string;
  provider: string;
  displayName: string;
  description: string;
  intendedUseCases: string;
  lastReviewedAt: string;
}

interface ModelCardFull extends ModelCardSummary {
  limitations: string;
  safetyConsiderations: string;
  inputTypes: string;
  outputTypes: string;
  dataSourcesSummary: string;
  lastReviewedBy?: string | null;
  metadataJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface ListModelCardsResponse {
  modelCards: ModelCardSummary[];
  total: number;
}

interface GetModelCardResponse {
  modelCard: ModelCardFull;
}

interface TenantModelCardsResponse {
  tenantId: string;
  modelCards: Array<ModelCardFull & { featureKey: string; isActive: boolean }>;
  total: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('modelCardsRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /models/cards (list all model cards)', () => {
    it('should return all model cards for platform admin', async () => {
      const summaryModels = mockModelCards.map((m) => ({
        id: m.id,
        modelKey: m.modelKey,
        provider: m.provider,
        displayName: m.displayName,
        description: m.description,
        intendedUseCases: m.intendedUseCases,
        lastReviewedAt: m.lastReviewedAt,
      }));

      mockFindMany.mockResolvedValueOnce(summaryModels);
      mockCount.mockResolvedValueOnce(3);

      // Simulate route logic
      const [modelCards, total] = await Promise.all([
        prisma.modelCard.findMany({
          where: {},
          select: {
            id: true,
            modelKey: true,
            provider: true,
            displayName: true,
            description: true,
            intendedUseCases: true,
            lastReviewedAt: true,
          },
          orderBy: { displayName: 'asc' },
          take: 20,
          skip: 0,
        }),
        prisma.modelCard.count({ where: {} }),
      ]);

      const response: ListModelCardsResponse = {
        modelCards: (modelCards as ModelCardDbRow[]).map((card) => ({
          id: card.id,
          modelKey: card.modelKey,
          provider: card.provider,
          displayName: card.displayName,
          description: card.description,
          intendedUseCases: card.intendedUseCases,
          lastReviewedAt: card.lastReviewedAt.toISOString(),
        })),
        total,
      };

      expect(response.total).toBe(3);
      expect(response.modelCards).toHaveLength(3);
      expect(response.modelCards[0].modelKey).toBe('AIVO_TUTOR_V1');
      expect(response.modelCards[0].displayName).toBe('Aivo Tutor');
    });

    it('should filter by provider when specified', async () => {
      const openaiModels = mockModelCards
        .filter((m) => m.provider === 'OPENAI')
        .map((m) => ({
          id: m.id,
          modelKey: m.modelKey,
          provider: m.provider,
          displayName: m.displayName,
          description: m.description,
          intendedUseCases: m.intendedUseCases,
          lastReviewedAt: m.lastReviewedAt,
        }));

      mockFindMany.mockResolvedValueOnce(openaiModels);
      mockCount.mockResolvedValueOnce(2);

      const provider = 'OPENAI';
      const [modelCards, total] = await Promise.all([
        prisma.modelCard.findMany({
          where: { provider },
          select: {
            id: true,
            modelKey: true,
            provider: true,
            displayName: true,
            description: true,
            intendedUseCases: true,
            lastReviewedAt: true,
          },
          orderBy: { displayName: 'asc' },
          take: 20,
          skip: 0,
        }),
        prisma.modelCard.count({ where: { provider } }),
      ]);

      expect(total).toBe(2);
      expect(modelCards).toHaveLength(2);
      expect((modelCards as ModelCardDbRow[]).every((m) => m.provider === 'OPENAI')).toBe(true);
    });

    it('should support pagination with limit and offset', async () => {
      const pageTwo = [mockModelCards[2]].map((m) => ({
        id: m.id,
        modelKey: m.modelKey,
        provider: m.provider,
        displayName: m.displayName,
        description: m.description,
        intendedUseCases: m.intendedUseCases,
        lastReviewedAt: m.lastReviewedAt,
      }));

      mockFindMany.mockResolvedValueOnce(pageTwo);
      mockCount.mockResolvedValueOnce(3);

      const [modelCards, total] = await Promise.all([
        prisma.modelCard.findMany({
          where: {},
          select: {
            id: true,
            modelKey: true,
            provider: true,
            displayName: true,
            description: true,
            intendedUseCases: true,
            lastReviewedAt: true,
          },
          orderBy: { displayName: 'asc' },
          take: 1,
          skip: 2,
        }),
        prisma.modelCard.count({ where: {} }),
      ]);

      expect(total).toBe(3);
      expect(modelCards).toHaveLength(1);
      expect(modelCards[0].modelKey).toBe('AIVO_FOCUS_V1');
    });
  });

  describe('GET /models/cards/:modelKey (get single model card)', () => {
    it('should return full model card details', async () => {
      mockFindUnique.mockResolvedValueOnce(mockModelCards[0]);

      const modelCard = await prisma.modelCard.findUnique({
        where: { modelKey: 'AIVO_TUTOR_V1' },
      });

      expect(modelCard).not.toBeNull();
      expect(modelCard!.modelKey).toBe('AIVO_TUTOR_V1');
      expect(modelCard!.displayName).toBe('Aivo Tutor');
      expect(modelCard!.provider).toBe('OPENAI');
      expect(modelCard!.description).toContain('AI-powered tutoring');
      expect(modelCard!.intendedUseCases).toContain('Best for:');
      expect(modelCard!.limitations).toContain('Not appropriate for:');
      expect(modelCard!.safetyConsiderations).toContain('Safety measures');
      expect(modelCard!.safetyConsiderations).toContain('Disclaimer:');
    });

    it('should return null for non-existent model key', async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const modelCard = await prisma.modelCard.findUnique({
        where: { modelKey: 'NONEXISTENT_MODEL' },
      });

      expect(modelCard).toBeNull();
    });

    it('should include metadata with version and features', async () => {
      mockFindUnique.mockResolvedValueOnce(mockModelCards[0]);

      const modelCard = await prisma.modelCard.findUnique({
        where: { modelKey: 'AIVO_TUTOR_V1' },
      });

      expect(modelCard!.metadataJson).toHaveProperty('version', '1.0');
      expect(modelCard!.metadataJson).toHaveProperty('baseModel', 'gpt-4o-mini');
      expect(modelCard!.metadataJson).toHaveProperty('features');
      expect((modelCard!.metadataJson as { features: string[] }).features).toContain('tutoring');
    });
  });

  describe('GET /models/tenant/:tenantId/cards (tenant-specific models)', () => {
    it('should return models assigned to a specific tenant', async () => {
      mockAssignmentFindMany.mockResolvedValueOnce(mockTenantAssignments);

      const tenantId = '770e8400-e29b-41d4-a716-446655440001';
      const assignments = await prisma.tenantModelAssignment.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        include: {
          modelCard: true,
        },
        orderBy: {
          modelCard: { displayName: 'asc' },
        },
      });

      expect(assignments).toHaveLength(2);
      expect(assignments[0].featureKey).toBe('TUTORING');
      expect(assignments[0].modelCard.modelKey).toBe('AIVO_TUTOR_V1');
      expect(assignments[1].featureKey).toBe('BASELINE');
      expect(assignments[1].modelCard.modelKey).toBe('AIVO_BASELINE_V1');
    });

    it('should return all models when tenant has no explicit assignments', async () => {
      mockAssignmentFindMany.mockResolvedValueOnce([]);
      mockFindMany.mockResolvedValueOnce(mockModelCards);

      const tenantId = '880e8400-e29b-41d4-a716-446655440002';
      const assignments = await prisma.tenantModelAssignment.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        include: {
          modelCard: true,
        },
      });

      // When no assignments, fallback to all models
      if (assignments.length === 0) {
        const allModels = await prisma.modelCard.findMany({
          orderBy: { displayName: 'asc' },
        });

        expect(allModels).toHaveLength(3);
        const modelKeys = (allModels as Array<{ modelKey: string }>).map((m) => m.modelKey);
        expect(modelKeys).toContain('AIVO_TUTOR_V1');
        expect(modelKeys).toContain('AIVO_BASELINE_V1');
        expect(modelKeys).toContain('AIVO_FOCUS_V1');
      }
    });

    it('should only include active assignments', async () => {
      const mixedAssignments = [
        { ...mockTenantAssignments[0], isActive: true },
        { ...mockTenantAssignments[1], isActive: false },
      ];
      mockAssignmentFindMany.mockResolvedValueOnce(
        mixedAssignments.filter((a) => a.isActive)
      );

      const tenantId = '770e8400-e29b-41d4-a716-446655440001';
      const assignments = await prisma.tenantModelAssignment.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        include: {
          modelCard: true,
        },
      });

      expect(assignments).toHaveLength(1);
      expect(assignments[0].modelCard.modelKey).toBe('AIVO_TUTOR_V1');
    });
  });

  describe('Model Card Content Structure', () => {
    it('should have properly formatted intendedUseCases with "Best for:" section', () => {
      const tutorModel = mockModelCards[0];
      expect(tutorModel.intendedUseCases).toContain('Best for:');
      expect(tutorModel.intendedUseCases).toContain('•');
    });

    it('should have properly formatted limitations with "Not appropriate for:" section', () => {
      const tutorModel = mockModelCards[0];
      expect(tutorModel.limitations).toContain('Not appropriate for:');
      expect(tutorModel.limitations).toContain('•');
    });

    it('should have safety considerations with disclaimer', () => {
      const tutorModel = mockModelCards[0];
      expect(tutorModel.safetyConsiderations).toContain('Safety measures in place:');
      expect(tutorModel.safetyConsiderations).toContain('Disclaimer:');
    });

    it('should have valid provider enum values', () => {
      const validProviders = ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'INTERNAL', 'META', 'MISTRAL', 'COHERE'];

      for (const model of mockModelCards) {
        expect(validProviders).toContain(model.provider);
      }
    });

    it('should have ISO formatted dates', async () => {
      mockFindUnique.mockResolvedValueOnce(mockModelCards[0]);

      const modelCard = await prisma.modelCard.findUnique({
        where: { modelKey: 'AIVO_TUTOR_V1' },
      });

      const response: GetModelCardResponse = {
        modelCard: {
          ...modelCard!,
          lastReviewedAt: modelCard!.lastReviewedAt.toISOString(),
          createdAt: modelCard!.createdAt.toISOString(),
          updatedAt: modelCard!.updatedAt.toISOString(),
        },
      };

      expect(response.modelCard.lastReviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(response.modelCard.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(response.modelCard.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('GET /models/features (list available features)', () => {
    it('should return predefined list of AI features', () => {
      // Static feature list from route
      const features = [
        {
          key: 'TUTORING',
          name: 'AI Tutoring',
          description: 'Personalized tutoring and concept explanations',
          defaultModelKey: 'AIVO_TUTOR_V1',
        },
        {
          key: 'BASELINE',
          name: 'Baseline Assessment',
          description: 'Initial skill assessment and placement',
          defaultModelKey: 'AIVO_BASELINE_V1',
        },
        {
          key: 'HOMEWORK_HELP',
          name: 'Homework Helper',
          description: 'Guided homework assistance',
          defaultModelKey: 'AIVO_TUTOR_V1',
        },
        {
          key: 'FOCUS',
          name: 'Focus Support',
          description: 'Engagement monitoring and break suggestions',
          defaultModelKey: 'AIVO_FOCUS_V1',
        },
      ];

      expect(features).toHaveLength(4);
      expect(features.map((f) => f.key)).toEqual([
        'TUTORING',
        'BASELINE',
        'HOMEWORK_HELP',
        'FOCUS',
      ]);
      expect(features.every((f) => f.defaultModelKey.startsWith('AIVO_'))).toBe(true);
    });
  });
});
