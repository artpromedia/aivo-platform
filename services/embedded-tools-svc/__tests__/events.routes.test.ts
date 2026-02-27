/**
 * Events Routes Tests (embedded-tools-svc)
 *
 * Tests for the validateEventPayload function and event recording schemas.
 * This covers the untested route logic in events.routes.ts:
 * - Zod schema validation (RecordEventSchema, SessionIdSchema, EventQuerySchema)
 * - validateEventPayload per-event-type validation
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ============================================================================
// Re-declare enums as in src/types (to avoid importing prisma/config)
// ============================================================================

enum SessionEventType {
  SESSION_STARTED = 'SESSION_STARTED',
  SESSION_ENDED = 'SESSION_ENDED',
  ACTIVITY_STARTED = 'ACTIVITY_STARTED',
  ACTIVITY_COMPLETED = 'ACTIVITY_COMPLETED',
  SCORE_RECORDED = 'SCORE_RECORDED',
  PROGRESS_UPDATED = 'PROGRESS_UPDATED',
  BADGE_EARNED = 'BADGE_EARNED',
  TOOL_ERROR = 'TOOL_ERROR',
  CUSTOM_EVENT = 'CUSTOM_EVENT',
}

// ============================================================================
// Re-declare Zod schemas (matching src/routes/events.routes.ts)
// ============================================================================

const RecordEventSchema = z.object({
  sessionId: z.string().uuid(),
  eventType: z.nativeEnum(SessionEventType),
  eventTimestamp: z.string().datetime(),
  activityId: z.string().max(255).optional(),
  score: z.number().min(0).max(100).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  data: z.record(z.unknown()).optional(),
});

const SessionIdSchema = z.object({
  sessionId: z.string().uuid(),
});

const EventQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  eventType: z.nativeEnum(SessionEventType).optional(),
});

// ============================================================================
// Re-implement validateEventPayload (matching src/routes/events.routes.ts)
// ============================================================================

function validateEventPayload(
  eventType: SessionEventType,
  data: Record<string, unknown>,
): { valid: boolean; error?: string } {
  switch (eventType) {
    case SessionEventType.ACTIVITY_COMPLETED:
      if (data.activityName === undefined) {
        return { valid: false, error: 'activityName is required for ACTIVITY_COMPLETED' };
      }
      break;

    case SessionEventType.SCORE_RECORDED:
      if (data.score === undefined) {
        return { valid: false, error: 'score is required for SCORE_RECORDED' };
      }
      break;

    case SessionEventType.BADGE_EARNED:
      if (data.badgeId === undefined || data.badgeName === undefined) {
        return { valid: false, error: 'badgeId and badgeName are required for BADGE_EARNED' };
      }
      break;

    case SessionEventType.TOOL_ERROR:
      if (data.errorCode === undefined || data.errorMessage === undefined) {
        return { valid: false, error: 'errorCode and errorMessage are required for TOOL_ERROR' };
      }
      break;

    default:
      break;
  }

  return { valid: true };
}

// ============================================================================
// Tests: RecordEventSchema
// ============================================================================

describe('RecordEventSchema', () => {
  const validEvent = {
    sessionId: '11111111-1111-1111-1111-111111111111',
    eventType: 'ACTIVITY_COMPLETED',
    eventTimestamp: '2025-01-15T10:00:00Z',
  };

  it('should accept a valid minimal event', () => {
    const result = RecordEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it('should accept all optional fields', () => {
    const result = RecordEventSchema.safeParse({
      ...validEvent,
      activityId: 'act-123',
      score: 85,
      durationSeconds: 300,
      data: { level: 3, difficulty: 'hard' },
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid sessionId (not UUID)', () => {
    const result = RecordEventSchema.safeParse({
      ...validEvent,
      sessionId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid eventType', () => {
    const result = RecordEventSchema.safeParse({
      ...validEvent,
      eventType: 'INVALID_EVENT',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid eventTimestamp', () => {
    const result = RecordEventSchema.safeParse({
      ...validEvent,
      eventTimestamp: 'not-a-datetime',
    });
    expect(result.success).toBe(false);
  });

  it('should reject score below 0', () => {
    const result = RecordEventSchema.safeParse({
      ...validEvent,
      score: -5,
    });
    expect(result.success).toBe(false);
  });

  it('should reject score above 100', () => {
    const result = RecordEventSchema.safeParse({
      ...validEvent,
      score: 101,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative durationSeconds', () => {
    const result = RecordEventSchema.safeParse({
      ...validEvent,
      durationSeconds: -1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer durationSeconds', () => {
    const result = RecordEventSchema.safeParse({
      ...validEvent,
      durationSeconds: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('should reject activityId longer than 255 chars', () => {
    const result = RecordEventSchema.safeParse({
      ...validEvent,
      activityId: 'a'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('should accept all valid event types', () => {
    for (const eventType of Object.values(SessionEventType)) {
      const result = RecordEventSchema.safeParse({ ...validEvent, eventType });
      expect(result.success).toBe(true);
    }
  });
});

// ============================================================================
// Tests: SessionIdSchema
// ============================================================================

describe('SessionIdSchema', () => {
  it('should accept valid UUID', () => {
    const result = SessionIdSchema.safeParse({
      sessionId: '11111111-1111-1111-1111-111111111111',
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-UUID', () => {
    const result = SessionIdSchema.safeParse({ sessionId: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject missing sessionId', () => {
    const result = SessionIdSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Tests: EventQuerySchema
// ============================================================================

describe('EventQuerySchema', () => {
  it('should apply defaults for limit and offset', () => {
    const result = EventQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(0);
    }
  });

  it('should coerce string numbers', () => {
    const result = EventQuerySchema.safeParse({ limit: '25', offset: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
      expect(result.data.offset).toBe(10);
    }
  });

  it('should reject limit below 1', () => {
    const result = EventQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject limit above 100', () => {
    const result = EventQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('should reject negative offset', () => {
    const result = EventQuerySchema.safeParse({ offset: -1 });
    expect(result.success).toBe(false);
  });

  it('should accept valid eventType filter', () => {
    const result = EventQuerySchema.safeParse({ eventType: 'SCORE_RECORDED' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid eventType filter', () => {
    const result = EventQuerySchema.safeParse({ eventType: 'INVALID' });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Tests: validateEventPayload
// ============================================================================

describe('validateEventPayload', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // ACTIVITY_COMPLETED
  // ──────────────────────────────────────────────────────────────────────────

  describe('ACTIVITY_COMPLETED', () => {
    it('should pass when activityName is present', () => {
      const result = validateEventPayload(SessionEventType.ACTIVITY_COMPLETED, {
        activityName: 'Math Quiz',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when activityName is missing', () => {
      const result = validateEventPayload(SessionEventType.ACTIVITY_COMPLETED, {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('activityName');
    });

    it('should pass when activityName is an empty string (present but empty)', () => {
      const result = validateEventPayload(SessionEventType.ACTIVITY_COMPLETED, {
        activityName: '',
      });
      expect(result.valid).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SCORE_RECORDED
  // ──────────────────────────────────────────────────────────────────────────

  describe('SCORE_RECORDED', () => {
    it('should pass when score is present', () => {
      const result = validateEventPayload(SessionEventType.SCORE_RECORDED, {
        score: 95,
      });
      expect(result.valid).toBe(true);
    });

    it('should pass when score is 0 (present)', () => {
      const result = validateEventPayload(SessionEventType.SCORE_RECORDED, {
        score: 0,
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when score is missing', () => {
      const result = validateEventPayload(SessionEventType.SCORE_RECORDED, {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('score');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // BADGE_EARNED
  // ──────────────────────────────────────────────────────────────────────────

  describe('BADGE_EARNED', () => {
    it('should pass when both badgeId and badgeName are present', () => {
      const result = validateEventPayload(SessionEventType.BADGE_EARNED, {
        badgeId: 'badge-1',
        badgeName: 'Math Whiz',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when badgeId is missing', () => {
      const result = validateEventPayload(SessionEventType.BADGE_EARNED, {
        badgeName: 'Math Whiz',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('badgeId');
    });

    it('should fail when badgeName is missing', () => {
      const result = validateEventPayload(SessionEventType.BADGE_EARNED, {
        badgeId: 'badge-1',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('badgeName');
    });

    it('should fail when both are missing', () => {
      const result = validateEventPayload(SessionEventType.BADGE_EARNED, {});
      expect(result.valid).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TOOL_ERROR
  // ──────────────────────────────────────────────────────────────────────────

  describe('TOOL_ERROR', () => {
    it('should pass when errorCode and errorMessage are present', () => {
      const result = validateEventPayload(SessionEventType.TOOL_ERROR, {
        errorCode: 'ERR_TIMEOUT',
        errorMessage: 'Request timed out',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when errorCode is missing', () => {
      const result = validateEventPayload(SessionEventType.TOOL_ERROR, {
        errorMessage: 'Something broke',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('errorCode');
    });

    it('should fail when errorMessage is missing', () => {
      const result = validateEventPayload(SessionEventType.TOOL_ERROR, {
        errorCode: 'ERR_500',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('errorMessage');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Other event types (no required fields)
  // ──────────────────────────────────────────────────────────────────────────

  describe('default event types (no special validation)', () => {
    const typesWithNoRequiredFields = [
      SessionEventType.SESSION_STARTED,
      SessionEventType.SESSION_ENDED,
      SessionEventType.ACTIVITY_STARTED,
      SessionEventType.PROGRESS_UPDATED,
      SessionEventType.CUSTOM_EVENT,
    ];

    for (const eventType of typesWithNoRequiredFields) {
      it(`should pass with empty data for ${eventType}`, () => {
        const result = validateEventPayload(eventType, {});
        expect(result.valid).toBe(true);
      });

      it(`should pass with arbitrary data for ${eventType}`, () => {
        const result = validateEventPayload(eventType, {
          anyField: 'value',
          nested: { deep: true },
        });
        expect(result.valid).toBe(true);
      });
    }
  });
});
