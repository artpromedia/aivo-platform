/**
 * Tests for collaboration-svc Zod schemas.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Replicate the key schema shapes for validation testing
const CareTeamRoleSchema = z.enum([
  'TEACHER', 'COUNSELOR', 'THERAPIST', 'ADMIN', 'PARENT', 'SPECIALIST',
]);

const ActionPlanStatusSchema = z.enum([
  'DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED',
]);

const TaskFrequencySchema = z.enum([
  'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'AS_NEEDED',
]);

const CareNoteTypeSchema = z.enum([
  'OBSERVATION', 'INTERVENTION', 'PROGRESS', 'CONCERN', 'GENERAL',
]);

const MeetingStatusSchema = z.enum([
  'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
]);

const CreateCareTeamMemberSchema = z.object({
  studentId: z.string().uuid(),
  userId: z.string().uuid(),
  role: CareTeamRoleSchema,
  isPrimary: z.boolean().optional().default(false),
});

const CreateActionPlanSchema = z.object({
  studentId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: ActionPlanStatusSchema.optional().default('DRAFT'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

describe('CareTeamRoleSchema', () => {
  it('accepts valid roles', () => {
    expect(CareTeamRoleSchema.parse('TEACHER')).toBe('TEACHER');
    expect(CareTeamRoleSchema.parse('COUNSELOR')).toBe('COUNSELOR');
    expect(CareTeamRoleSchema.parse('PARENT')).toBe('PARENT');
  });

  it('rejects invalid roles', () => {
    expect(() => CareTeamRoleSchema.parse('JANITOR')).toThrow();
    expect(() => CareTeamRoleSchema.parse('')).toThrow();
  });
});

describe('ActionPlanStatusSchema', () => {
  it('accepts valid statuses', () => {
    expect(ActionPlanStatusSchema.parse('DRAFT')).toBe('DRAFT');
    expect(ActionPlanStatusSchema.parse('ACTIVE')).toBe('ACTIVE');
    expect(ActionPlanStatusSchema.parse('COMPLETED')).toBe('COMPLETED');
  });

  it('rejects invalid status', () => {
    expect(() => ActionPlanStatusSchema.parse('PENDING')).toThrow();
  });
});

describe('TaskFrequencySchema', () => {
  it('accepts all valid frequencies', () => {
    for (const f of ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'AS_NEEDED']) {
      expect(TaskFrequencySchema.parse(f)).toBe(f);
    }
  });
});

describe('CareNoteTypeSchema', () => {
  it('accepts valid note types', () => {
    expect(CareNoteTypeSchema.parse('OBSERVATION')).toBe('OBSERVATION');
    expect(CareNoteTypeSchema.parse('INTERVENTION')).toBe('INTERVENTION');
    expect(CareNoteTypeSchema.parse('PROGRESS')).toBe('PROGRESS');
  });

  it('rejects invalid type', () => {
    expect(() => CareNoteTypeSchema.parse('CHAT')).toThrow();
  });
});

describe('MeetingStatusSchema', () => {
  it('accepts valid statuses', () => {
    expect(MeetingStatusSchema.parse('SCHEDULED')).toBe('SCHEDULED');
    expect(MeetingStatusSchema.parse('CANCELLED')).toBe('CANCELLED');
  });
});

describe('CreateCareTeamMemberSchema', () => {
  it('accepts valid member data', () => {
    const data = {
      studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      userId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      role: 'TEACHER',
    };
    const result = CreateCareTeamMemberSchema.parse(data);
    expect(result.role).toBe('TEACHER');
    expect(result.isPrimary).toBe(false);
  });

  it('rejects non-UUID studentId', () => {
    expect(() =>
      CreateCareTeamMemberSchema.parse({
        studentId: 'not-a-uuid',
        userId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        role: 'TEACHER',
      }),
    ).toThrow();
  });

  it('allows isPrimary override', () => {
    const data = {
      studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      userId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      role: 'COUNSELOR',
      isPrimary: true,
    };
    expect(CreateCareTeamMemberSchema.parse(data).isPrimary).toBe(true);
  });
});

describe('CreateActionPlanSchema', () => {
  it('accepts valid plan with defaults', () => {
    const plan = {
      studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: 'Behavior Improvement Plan',
    };
    const result = CreateActionPlanSchema.parse(plan);
    expect(result.status).toBe('DRAFT');
    expect(result.title).toBe('Behavior Improvement Plan');
  });

  it('rejects empty title', () => {
    expect(() =>
      CreateActionPlanSchema.parse({
        studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        title: '',
      }),
    ).toThrow();
  });

  it('rejects title exceeding max length', () => {
    expect(() =>
      CreateActionPlanSchema.parse({
        studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        title: 'x'.repeat(201),
      }),
    ).toThrow();
  });

  it('accepts explicit status override', () => {
    const plan = {
      studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: 'Active Plan',
      status: 'ACTIVE',
    };
    expect(CreateActionPlanSchema.parse(plan).status).toBe('ACTIVE');
  });

  it('accepts datetime strings for date fields', () => {
    const plan = {
      studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: 'Dated Plan',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-06-30T23:59:59.999Z',
    };
    const result = CreateActionPlanSchema.parse(plan);
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
  });
});
