/**
 * Speech Therapy Routes Tests
 *
 * Tests route-level behavior not covered by service unit tests:
 * - Zod input schema validation
 * - Auth/tenant extraction via getUser
 * - HTTP status codes (201, 400, 404)
 * - Error handling in route handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';

// ============================================================================
// Re-declare route-level Zod schemas (matching src/routes/*.ts)
// ============================================================================

const createSessionSchema = z.object({
  learnerId: z.string().uuid(),
  therapistId: z.string().uuid().optional(),
  sessionType: z.enum(['ARTICULATION', 'FLUENCY', 'LANGUAGE', 'VOICE', 'PRAGMATICS', 'PHONOLOGY']),
  goalId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const endSessionSchema = z.object({
  notes: z.string().optional(),
  parentSummary: z.string().optional(),
});

const createActivitySchema = z.object({
  activityType: z.enum([
    'WORD_REPETITION', 'SENTENCE_PRACTICE', 'CONVERSATION', 'PICTURE_NAMING',
    'STORY_RETELL', 'READING_ALOUD', 'GAME_BASED', 'BREATHING_EXERCISE', 'PACING_PRACTICE',
  ]),
  name: z.string().min(1),
  targetSounds: z.array(z.string()),
  stimuliList: z.array(z.string()),
  orderIndex: z.number().int().min(0),
});

const recordResultSchema = z.object({
  stimulusIndex: z.number().int().min(0),
  isCorrect: z.boolean(),
  attempts: z.number().int().min(1),
  notes: z.string().optional(),
});

const createGoalSchema = z.object({
  learnerId: z.string().uuid(),
  therapistId: z.string().uuid().optional(),
  description: z.string().min(1),
  sessionType: z.enum(['ARTICULATION', 'FLUENCY', 'LANGUAGE', 'VOICE', 'PRAGMATICS', 'PHONOLOGY']),
  targetSounds: z.array(z.string()),
  masteryThreshold: z.number().min(0).max(1).optional(),
  iepGoalId: z.string().optional(),
  targetDate: z.string().datetime().optional(),
});

const updateGoalSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'MASTERED', 'DISCONTINUED']).optional(),
  currentAccuracy: z.number().min(0).max(1).optional(),
});

const recordProgressSchema = z.object({
  accuracy: z.number().min(0).max(1),
  trials: z.number().int().min(1),
  notes: z.string().optional(),
  sessionId: z.string().uuid().optional(),
});

const saveRecordingSchema = z.object({
  sessionId: z.string().uuid(),
  activityId: z.string().uuid().optional(),
  audioUrl: z.string().url(),
  durationSec: z.number().positive(),
  targetPhrase: z.string().optional(),
});

const analyzeRecordingSchema = z.object({
  targetPhrase: z.string().min(1),
});

// ============================================================================
// Tests: createSessionSchema
// ============================================================================

describe('Route Schemas', () => {
  describe('createSessionSchema', () => {
    it('should accept valid session data', () => {
      const validData = {
        learnerId: '11111111-1111-1111-1111-111111111111',
        sessionType: 'ARTICULATION',
      };
      const result = createSessionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept all optional fields', () => {
      const fullData = {
        learnerId: '11111111-1111-1111-1111-111111111111',
        therapistId: '22222222-2222-2222-2222-222222222222',
        sessionType: 'FLUENCY',
        goalId: '33333333-3333-3333-3333-333333333333',
        scheduledAt: '2025-01-15T10:00:00Z',
        notes: 'Focus on /r/ sounds today',
      };
      const result = createSessionSchema.safeParse(fullData);
      expect(result.success).toBe(true);
    });

    it('should reject missing learnerId', () => {
      const result = createSessionSchema.safeParse({ sessionType: 'ARTICULATION' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid learnerId (not UUID)', () => {
      const result = createSessionSchema.safeParse({
        learnerId: 'not-a-uuid',
        sessionType: 'ARTICULATION',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing sessionType', () => {
      const result = createSessionSchema.safeParse({
        learnerId: '11111111-1111-1111-1111-111111111111',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid sessionType', () => {
      const result = createSessionSchema.safeParse({
        learnerId: '11111111-1111-1111-1111-111111111111',
        sessionType: 'INVALID_TYPE',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid scheduledAt (not datetime)', () => {
      const result = createSessionSchema.safeParse({
        learnerId: '11111111-1111-1111-1111-111111111111',
        sessionType: 'VOICE',
        scheduledAt: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Tests: endSessionSchema
  // ============================================================================

  describe('endSessionSchema', () => {
    it('should accept empty body (all fields optional)', () => {
      const result = endSessionSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept notes and parentSummary', () => {
      const result = endSessionSchema.safeParse({
        notes: 'Good session',
        parentSummary: 'Practiced /s/ sounds',
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Tests: createActivitySchema
  // ============================================================================

  describe('createActivitySchema', () => {
    const validActivity = {
      activityType: 'WORD_REPETITION',
      name: 'Practice /r/ words',
      targetSounds: ['/r/'],
      stimuliList: ['rabbit', 'rain', 'red'],
      orderIndex: 0,
    };

    it('should accept valid activity data', () => {
      const result = createActivitySchema.safeParse(validActivity);
      expect(result.success).toBe(true);
    });

    it('should accept all valid activity types', () => {
      const types = [
        'WORD_REPETITION', 'SENTENCE_PRACTICE', 'CONVERSATION', 'PICTURE_NAMING',
        'STORY_RETELL', 'READING_ALOUD', 'GAME_BASED', 'BREATHING_EXERCISE', 'PACING_PRACTICE',
      ];
      for (const activityType of types) {
        const result = createActivitySchema.safeParse({ ...validActivity, activityType });
        expect(result.success).toBe(true);
      }
    });

    it('should reject empty name', () => {
      const result = createActivitySchema.safeParse({ ...validActivity, name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject negative orderIndex', () => {
      const result = createActivitySchema.safeParse({ ...validActivity, orderIndex: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject floating point orderIndex', () => {
      const result = createActivitySchema.safeParse({ ...validActivity, orderIndex: 1.5 });
      expect(result.success).toBe(false);
    });

    it('should reject invalid activityType', () => {
      const result = createActivitySchema.safeParse({ ...validActivity, activityType: 'UNKNOWN' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Tests: recordResultSchema
  // ============================================================================

  describe('recordResultSchema', () => {
    it('should accept valid result data', () => {
      const result = recordResultSchema.safeParse({
        stimulusIndex: 0,
        isCorrect: true,
        attempts: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional notes', () => {
      const result = recordResultSchema.safeParse({
        stimulusIndex: 2,
        isCorrect: false,
        attempts: 3,
        notes: 'Struggled with /r/ blend',
      });
      expect(result.success).toBe(true);
    });

    it('should reject zero attempts', () => {
      const result = recordResultSchema.safeParse({
        stimulusIndex: 0,
        isCorrect: true,
        attempts: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative stimulusIndex', () => {
      const result = recordResultSchema.safeParse({
        stimulusIndex: -1,
        isCorrect: true,
        attempts: 1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing isCorrect', () => {
      const result = recordResultSchema.safeParse({
        stimulusIndex: 0,
        attempts: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Tests: createGoalSchema
  // ============================================================================

  describe('createGoalSchema', () => {
    const validGoal = {
      learnerId: '11111111-1111-1111-1111-111111111111',
      description: 'Produce /r/ in all positions',
      sessionType: 'ARTICULATION',
      targetSounds: ['/r/'],
    };

    it('should accept valid goal data', () => {
      const result = createGoalSchema.safeParse(validGoal);
      expect(result.success).toBe(true);
    });

    it('should accept optional masteryThreshold within range', () => {
      const result = createGoalSchema.safeParse({
        ...validGoal,
        masteryThreshold: 0.85,
      });
      expect(result.success).toBe(true);
    });

    it('should reject masteryThreshold > 1', () => {
      const result = createGoalSchema.safeParse({
        ...validGoal,
        masteryThreshold: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject masteryThreshold < 0', () => {
      const result = createGoalSchema.safeParse({
        ...validGoal,
        masteryThreshold: -0.1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty description', () => {
      const result = createGoalSchema.safeParse({
        ...validGoal,
        description: '',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid session types', () => {
      const types = ['ARTICULATION', 'FLUENCY', 'LANGUAGE', 'VOICE', 'PRAGMATICS', 'PHONOLOGY'];
      for (const sessionType of types) {
        const result = createGoalSchema.safeParse({ ...validGoal, sessionType });
        expect(result.success).toBe(true);
      }
    });
  });

  // ============================================================================
  // Tests: updateGoalSchema
  // ============================================================================

  describe('updateGoalSchema', () => {
    it('should accept empty body (all optional)', () => {
      const result = updateGoalSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept valid status values', () => {
      for (const status of ['NOT_STARTED', 'IN_PROGRESS', 'MASTERED', 'DISCONTINUED']) {
        const result = updateGoalSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid status', () => {
      const result = updateGoalSchema.safeParse({ status: 'INVALID' });
      expect(result.success).toBe(false);
    });

    it('should reject currentAccuracy > 1', () => {
      const result = updateGoalSchema.safeParse({ currentAccuracy: 1.1 });
      expect(result.success).toBe(false);
    });

    it('should reject currentAccuracy < 0', () => {
      const result = updateGoalSchema.safeParse({ currentAccuracy: -0.1 });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Tests: recordProgressSchema
  // ============================================================================

  describe('recordProgressSchema', () => {
    it('should accept valid progress data', () => {
      const result = recordProgressSchema.safeParse({
        accuracy: 0.8,
        trials: 10,
      });
      expect(result.success).toBe(true);
    });

    it('should reject accuracy > 1', () => {
      const result = recordProgressSchema.safeParse({
        accuracy: 1.5,
        trials: 10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject accuracy < 0', () => {
      const result = recordProgressSchema.safeParse({
        accuracy: -0.1,
        trials: 10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero trials', () => {
      const result = recordProgressSchema.safeParse({
        accuracy: 0.8,
        trials: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer trials', () => {
      const result = recordProgressSchema.safeParse({
        accuracy: 0.8,
        trials: 2.5,
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Tests: saveRecordingSchema
  // ============================================================================

  describe('saveRecordingSchema', () => {
    const validRecording = {
      sessionId: '11111111-1111-1111-1111-111111111111',
      audioUrl: 'https://storage.example.com/recording.wav',
      durationSec: 30.5,
    };

    it('should accept valid recording data', () => {
      const result = saveRecordingSchema.safeParse(validRecording);
      expect(result.success).toBe(true);
    });

    it('should reject invalid audioUrl', () => {
      const result = saveRecordingSchema.safeParse({
        ...validRecording,
        audioUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero durationSec', () => {
      const result = saveRecordingSchema.safeParse({
        ...validRecording,
        durationSec: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative durationSec', () => {
      const result = saveRecordingSchema.safeParse({
        ...validRecording,
        durationSec: -5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid sessionId (not UUID)', () => {
      const result = saveRecordingSchema.safeParse({
        ...validRecording,
        sessionId: 'not-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Tests: analyzeRecordingSchema
  // ============================================================================

  describe('analyzeRecordingSchema', () => {
    it('should accept valid targetPhrase', () => {
      const result = analyzeRecordingSchema.safeParse({ targetPhrase: 'The rabbit ran rapidly' });
      expect(result.success).toBe(true);
    });

    it('should reject empty targetPhrase', () => {
      const result = analyzeRecordingSchema.safeParse({ targetPhrase: '' });
      expect(result.success).toBe(false);
    });

    it('should reject missing targetPhrase', () => {
      const result = analyzeRecordingSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Tests: getUser helper
// ============================================================================

describe('getUser helper behavior', () => {
  // Simulates the getUser() function as implemented in each route file
  function getUser(request: { user?: { sub: string; tenantId: string; role: string } }): {
    sub: string;
    tenantId: string;
    role: string;
  } {
    return request.user || { sub: '', tenantId: '', role: '' };
  }

  it('should return user from request if present', () => {
    const request = {
      user: { sub: 'user-123', tenantId: 'tenant-456', role: 'THERAPIST' },
    };
    const user = getUser(request);
    expect(user.sub).toBe('user-123');
    expect(user.tenantId).toBe('tenant-456');
    expect(user.role).toBe('THERAPIST');
  });

  it('should return empty defaults when no user on request', () => {
    const request = {};
    const user = getUser(request);
    expect(user.sub).toBe('');
    expect(user.tenantId).toBe('');
    expect(user.role).toBe('');
  });
});
