/**
 * Tests for life-skills-svc — Skill schemas, safety scenarios, and goal management.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

/* ---------- replicate key schemas from src/routes/ ---------- */

const SkillCategory = z.enum([
  'DAILY_LIVING',
  'SOCIAL',
  'COMMUNITY',
  'SELF_CARE',
  'VOCATIONAL',
  'SAFETY',
  'ACADEMIC_FUNCTIONAL',
]);

const DifficultyLevel = z.enum(['FOUNDATIONAL', 'EMERGING', 'DEVELOPING', 'PROFICIENT']);

const CreateSkillSchema = z.object({
  tenantId: z.string().uuid(),
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: SkillCategory,
  difficultyLevel: DifficultyLevel,
});

const GetSkillsQuerySchema = z.object({
  tenantId: z.string().uuid(),
  category: SkillCategory.optional(),
  difficulty: DifficultyLevel.optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().default(25),
  offset: z.coerce.number().int().nonnegative().default(0),
});

describe('SkillCategory enum', () => {
  it('accepts valid categories', () => {
    expect(SkillCategory.parse('DAILY_LIVING')).toBe('DAILY_LIVING');
    expect(SkillCategory.parse('SAFETY')).toBe('SAFETY');
  });

  it('rejects invalid category', () => {
    expect(() => SkillCategory.parse('COOKING')).toThrow();
  });
});

describe('CreateSkillSchema', () => {
  const valid = {
    tenantId: 'a0b1c2d3-e4f5-6789-abcd-ef0123456789',
    code: 'HAND_WASH',
    name: 'Hand Washing',
    category: 'SELF_CARE',
    difficultyLevel: 'EMERGING',
  };

  it('parses a valid skill', () => {
    const result = CreateSkillSchema.parse(valid);
    expect(result.code).toBe('HAND_WASH');
    expect(result.category).toBe('SELF_CARE');
  });

  it('rejects missing tenantId', () => {
    expect(() => CreateSkillSchema.parse({ ...valid, tenantId: undefined })).toThrow();
  });

  it('rejects code longer than 30 characters', () => {
    expect(() =>
      CreateSkillSchema.parse({ ...valid, code: 'A'.repeat(31) }),
    ).toThrow();
  });

  it('allows optional description', () => {
    const result = CreateSkillSchema.parse({ ...valid, description: 'Good hygiene' });
    expect(result.description).toBe('Good hygiene');
  });
});

describe('GetSkillsQuerySchema', () => {
  const base = { tenantId: '00000000-0000-0000-0000-000000000001' };

  it('applies default limit and offset', () => {
    const result = GetSkillsQuerySchema.parse(base);
    expect(result.limit).toBe(25);
    expect(result.offset).toBe(0);
  });

  it('coerces string numbers', () => {
    const result = GetSkillsQuerySchema.parse({ ...base, limit: '10' as any, offset: '5' as any });
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(5);
  });

  it('rejects negative offset', () => {
    expect(() => GetSkillsQuerySchema.parse({ ...base, offset: -1 })).toThrow();
  });
});

/* ---------- safety scenario schemas ---------- */

const SafetyScenarioType = z.enum(['FIRE', 'STRANGER', 'TRAFFIC', 'WEATHER', 'ONLINE', 'MEDICAL']);

const CreateScenarioSchema = z.object({
  tenantId: z.string().uuid(),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  scenarioType: SafetyScenarioType,
  choices: z.array(
    z.object({
      text: z.string(),
      isCorrect: z.boolean(),
      feedback: z.string().optional(),
    }),
  ).min(2),
});

describe('CreateScenarioSchema', () => {
  const valid = {
    tenantId: '00000000-0000-0000-0000-000000000002',
    code: 'FIRE_001',
    title: 'Fire in the kitchen',
    scenarioType: 'FIRE',
    choices: [
      { text: 'Call 911', isCorrect: true },
      { text: 'Ignore it', isCorrect: false, feedback: 'Never ignore a fire!' },
    ],
  };

  it('parses a valid scenario', () => {
    const result = CreateScenarioSchema.parse(valid);
    expect(result.choices).toHaveLength(2);
    expect(result.scenarioType).toBe('FIRE');
  });

  it('rejects fewer than 2 choices', () => {
    expect(() =>
      CreateScenarioSchema.parse({ ...valid, choices: [{ text: 'Only one', isCorrect: true }] }),
    ).toThrow();
  });

  it('rejects invalid scenario type', () => {
    expect(() =>
      CreateScenarioSchema.parse({ ...valid, scenarioType: 'EARTHQUAKE' }),
    ).toThrow();
  });
});

/* ---------- goal management ---------- */

const CreateGoalSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  skillId: z.string().uuid(),
  createdByUserId: z.string().uuid(),
  title: z.string().min(1).max(200),
  milestones: z.array(z.object({
    description: z.string(),
    targetDate: z.string().datetime().optional(),
  })).optional(),
});

describe('CreateGoalSchema', () => {
  const uuid = '00000000-0000-0000-0000-000000000003';

  it('parses a goal without milestones', () => {
    const result = CreateGoalSchema.parse({
      tenantId: uuid,
      learnerId: uuid,
      skillId: uuid,
      createdByUserId: uuid,
      title: 'Learn to tie shoes',
    });
    expect(result.title).toBe('Learn to tie shoes');
    expect(result.milestones).toBeUndefined();
  });

  it('parses a goal with milestones', () => {
    const result = CreateGoalSchema.parse({
      tenantId: uuid,
      learnerId: uuid,
      skillId: uuid,
      createdByUserId: uuid,
      title: 'Learn to tie shoes',
      milestones: [{ description: 'Cross laces' }],
    });
    expect(result.milestones).toHaveLength(1);
  });
});
