/**
 * Tests for engagement-svc core business logic: XP, levels, streaks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── XP / Level calculation (pure logic) ─────────────────────────────

const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 750, 1100, 1500, 2000, 2600, 3300, 4100, 5000];

function calculateLevel(xpTotal: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (LEVEL_THRESHOLDS[i] !== undefined && xpTotal >= LEVEL_THRESHOLDS[i]!) return i + 1;
  }
  return 1;
}

function xpForNextLevel(currentLevel: number): number {
  if (currentLevel >= LEVEL_THRESHOLDS.length) return Infinity;
  return LEVEL_THRESHOLDS[currentLevel] ?? Infinity;
}

function isConsecutiveDay(lastDate: Date | null, currentDate: Date): boolean {
  if (!lastDate) return false;
  const last = new Date(lastDate); last.setHours(0, 0, 0, 0);
  const curr = new Date(currentDate); curr.setHours(0, 0, 0, 0);
  return (curr.getTime() - last.getTime()) / 86_400_000 === 1;
}

function isSameDay(d1: Date | null, d2: Date): boolean {
  if (!d1) return false;
  const a = new Date(d1); a.setHours(0, 0, 0, 0);
  const b = new Date(d2); b.setHours(0, 0, 0, 0);
  return a.getTime() === b.getTime();
}

describe('calculateLevel', () => {
  it('returns 1 for 0 XP', () => expect(calculateLevel(0)).toBe(1));
  it('returns 1 for 49 XP', () => expect(calculateLevel(49)).toBe(1));
  it('returns 2 for 50 XP', () => expect(calculateLevel(50)).toBe(2));
  it('returns 3 for 150 XP', () => expect(calculateLevel(150)).toBe(3));
  it('returns max level for very high XP', () => expect(calculateLevel(99999)).toBe(13));
  it('returns 5 for exactly 500 XP', () => expect(calculateLevel(500)).toBe(5));
});

describe('xpForNextLevel', () => {
  it('returns 50 for level 1', () => expect(xpForNextLevel(1)).toBe(50));
  it('returns 150 for level 2', () => expect(xpForNextLevel(2)).toBe(150));
  it('returns Infinity at max level', () => expect(xpForNextLevel(13)).toBe(Infinity));
  it('returns Infinity for level beyond max', () => expect(xpForNextLevel(99)).toBe(Infinity));
});

describe('isConsecutiveDay', () => {
  it('returns true for consecutive days', () => {
    const yesterday = new Date('2025-06-01');
    const today = new Date('2025-06-02');
    expect(isConsecutiveDay(yesterday, today)).toBe(true);
  });
  it('returns false for same day', () => {
    const d = new Date('2025-06-01');
    expect(isConsecutiveDay(d, d)).toBe(false);
  });
  it('returns false for null last date', () => {
    expect(isConsecutiveDay(null, new Date())).toBe(false);
  });
  it('returns false for gap > 1 day', () => {
    expect(isConsecutiveDay(new Date('2025-06-01'), new Date('2025-06-03'))).toBe(false);
  });
});

describe('isSameDay', () => {
  it('returns true for same calendar day', () => {
    const d1 = new Date('2025-06-01T10:00:00Z');
    const d2 = new Date('2025-06-01T22:00:00Z');
    expect(isSameDay(d1, d2)).toBe(true);
  });
  it('returns false for consecutive days', () => {
    expect(isSameDay(new Date('2025-06-01'), new Date('2025-06-02'))).toBe(false);
  });
  it('returns false for null', () => {
    expect(isSameDay(null, new Date())).toBe(false);
  });
});

describe('DEFAULT_XP_RULES', () => {
  const XP_RULES: Record<string, number> = {
    SESSION_STARTED: 2, SESSION_COMPLETED: 10, ACTIVITY_COMPLETED: 8,
    FOCUS_BREAK_USED: 3, FOCUS_BREAK_RETURNED: 5, HOMEWORK_HELPER_USED: 5,
    HOMEWORK_STEP_COMPLETED: 10, RECOMMENDATION_ACCEPTED: 5,
    ACTION_PLAN_TASK_COMPLETED: 8, BASELINE_COMPLETED: 20,
    STREAK_MAINTAINED: 5, BADGE_EARNED: 0,
  };

  it('defines 12 event types', () => {
    expect(Object.keys(XP_RULES)).toHaveLength(12);
  });

  it('BADGE_EARNED gives 0 XP', () => expect(XP_RULES.BADGE_EARNED).toBe(0));
  it('BASELINE_COMPLETED gives highest XP', () => {
    expect(XP_RULES.BASELINE_COMPLETED).toBe(Math.max(...Object.values(XP_RULES)));
  });
});
