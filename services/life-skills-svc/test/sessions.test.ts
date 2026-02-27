/**
 * Tests for life-skills-svc — Session management, progress tracking, and AI-coach helpers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

/* ---------- session schemas ---------- */

const PromptLevel = z.enum(['FULL_PHYSICAL', 'PARTIAL_PHYSICAL', 'MODELING', 'GESTURAL', 'VERBAL', 'INDEPENDENT']);

const StartSessionSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  skillId: z.string().uuid(),
  context: z.string().optional(),
  facilitator: z.string().uuid(),
  facilitatorRole: z.enum(['TEACHER', 'AIDE', 'THERAPIST', 'PARENT']),
});

const RecordStepAttemptSchema = z.object({
  stepNumber: z.number().int().positive(),
  wasSuccessful: z.boolean(),
  promptLevel: PromptLevel,
  durationSeconds: z.number().positive().optional(),
});

const EndSessionSchema = z.object({
  overallPromptLevel: PromptLevel,
  learnerMood: z.enum(['HAPPY', 'NEUTRAL', 'FRUSTRATED', 'UPSET']).optional(),
  engagementLevel: z.number().min(1).max(5).optional(),
});

describe('StartSessionSchema', () => {
  const uuid = '11111111-1111-1111-1111-111111111111';

  it('parses valid session start', () => {
    const result = StartSessionSchema.parse({
      tenantId: uuid,
      learnerId: uuid,
      skillId: uuid,
      facilitator: uuid,
      facilitatorRole: 'TEACHER',
    });
    expect(result.facilitatorRole).toBe('TEACHER');
  });

  it('rejects invalid facilitator role', () => {
    expect(() =>
      StartSessionSchema.parse({
        tenantId: uuid,
        learnerId: uuid,
        skillId: uuid,
        facilitator: uuid,
        facilitatorRole: 'ADMIN',
      }),
    ).toThrow();
  });
});

describe('RecordStepAttemptSchema', () => {
  it('records a successful attempt', () => {
    const result = RecordStepAttemptSchema.parse({
      stepNumber: 3,
      wasSuccessful: true,
      promptLevel: 'INDEPENDENT',
    });
    expect(result.wasSuccessful).toBe(true);
    expect(result.promptLevel).toBe('INDEPENDENT');
  });

  it('records an attempt with duration', () => {
    const result = RecordStepAttemptSchema.parse({
      stepNumber: 1,
      wasSuccessful: false,
      promptLevel: 'FULL_PHYSICAL',
      durationSeconds: 45,
    });
    expect(result.durationSeconds).toBe(45);
  });

  it('rejects step number 0', () => {
    expect(() =>
      RecordStepAttemptSchema.parse({
        stepNumber: 0,
        wasSuccessful: true,
        promptLevel: 'VERBAL',
      }),
    ).toThrow();
  });
});

describe('EndSessionSchema', () => {
  it('parses minimal end-session data', () => {
    const result = EndSessionSchema.parse({ overallPromptLevel: 'GESTURAL' });
    expect(result.overallPromptLevel).toBe('GESTURAL');
  });

  it('includes mood and engagement', () => {
    const result = EndSessionSchema.parse({
      overallPromptLevel: 'MODELING',
      learnerMood: 'HAPPY',
      engagementLevel: 4,
    });
    expect(result.learnerMood).toBe('HAPPY');
    expect(result.engagementLevel).toBe(4);
  });

  it('rejects engagement level > 5', () => {
    expect(() =>
      EndSessionSchema.parse({ overallPromptLevel: 'VERBAL', engagementLevel: 6 }),
    ).toThrow();
  });
});

/* ---------- progress tracking ---------- */

const ProgressStatus = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'EMERGING', 'ACQUIRED', 'MAINTAINED']);

const InitProgressSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  skillId: z.string().uuid(),
});

const UpdateStepProgressSchema = z.object({
  isAcquired: z.boolean(),
  lastPromptLevel: PromptLevel,
  totalAttempts: z.number().int().nonnegative(),
  successfulAttempts: z.number().int().nonnegative(),
  teacherNotes: z.string().optional(),
});

describe('InitProgressSchema', () => {
  const uuid = '22222222-2222-2222-2222-222222222222';

  it('parses valid init request', () => {
    const result = InitProgressSchema.parse({
      tenantId: uuid,
      learnerId: uuid,
      skillId: uuid,
    });
    expect(result.tenantId).toBe(uuid);
  });
});

describe('UpdateStepProgressSchema', () => {
  it('parses step progress update', () => {
    const result = UpdateStepProgressSchema.parse({
      isAcquired: false,
      lastPromptLevel: 'PARTIAL_PHYSICAL',
      totalAttempts: 10,
      successfulAttempts: 3,
    });
    expect(result.totalAttempts).toBe(10);
    expect(result.successfulAttempts).toBe(3);
  });

  it('rejects negative attempt counts', () => {
    expect(() =>
      UpdateStepProgressSchema.parse({
        isAcquired: false,
        lastPromptLevel: 'VERBAL',
        totalAttempts: -1,
        successfulAttempts: 0,
      }),
    ).toThrow();
  });
});

/* ---------- AI coach helpers ---------- */

function generateStepGuidance(
  step: { number: number; description: string; promptLevel: string },
  context: { learnerName: string; mood?: string },
): { guidance: string; visualCue?: string; audioPrompt?: string } {
  const moodMsg = context.mood === 'FRUSTRATED' ? ' Take a break if needed.' : '';
  return {
    guidance: `${context.learnerName}, let's try step ${step.number}: ${step.description}.${moodMsg}`,
    visualCue: step.promptLevel === 'MODELING' ? 'Show demonstration video' : undefined,
    audioPrompt: step.promptLevel === 'VERBAL' ? step.description : undefined,
  };
}

function generateEncouragement(
  event: 'STEP_SUCCESS' | 'STEP_FAIL' | 'SESSION_COMPLETE',
  details: { streak?: number },
): { message: string; celebration?: string } {
  if (event === 'STEP_SUCCESS') {
    const msg = details.streak && details.streak >= 3 ? 'Amazing streak!' : 'Great job!';
    return { message: msg, celebration: details.streak && details.streak >= 3 ? '🎉' : undefined };
  }
  if (event === 'SESSION_COMPLETE') {
    return { message: 'Session complete. You did great!', celebration: '⭐' };
  }
  return { message: "That's okay, let's try again!" };
}

describe('generateStepGuidance', () => {
  it('returns guidance text', () => {
    const result = generateStepGuidance(
      { number: 2, description: 'Rinse hands', promptLevel: 'VERBAL' },
      { learnerName: 'Alex' },
    );
    expect(result.guidance).toContain("Alex, let's try step 2");
    expect(result.audioPrompt).toBe('Rinse hands');
  });

  it('adds break message for frustrated learner', () => {
    const result = generateStepGuidance(
      { number: 1, description: 'Open faucet', promptLevel: 'GESTURAL' },
      { learnerName: 'Sam', mood: 'FRUSTRATED' },
    );
    expect(result.guidance).toContain('Take a break');
  });

  it('suggests demo video for modeling prompt', () => {
    const result = generateStepGuidance(
      { number: 1, description: 'Put on coat', promptLevel: 'MODELING' },
      { learnerName: 'Jamie' },
    );
    expect(result.visualCue).toBe('Show demonstration video');
  });
});

describe('generateEncouragement', () => {
  it('returns streak celebration', () => {
    const result = generateEncouragement('STEP_SUCCESS', { streak: 5 });
    expect(result.message).toBe('Amazing streak!');
    expect(result.celebration).toBe('🎉');
  });

  it('returns generic success for short streak', () => {
    const result = generateEncouragement('STEP_SUCCESS', { streak: 1 });
    expect(result.message).toBe('Great job!');
    expect(result.celebration).toBeUndefined();
  });

  it('returns try-again for failure', () => {
    const result = generateEncouragement('STEP_FAIL', {});
    expect(result.message).toContain('try again');
  });

  it('returns celebration for session complete', () => {
    const result = generateEncouragement('SESSION_COMPLETE', {});
    expect(result.celebration).toBe('⭐');
  });
});
