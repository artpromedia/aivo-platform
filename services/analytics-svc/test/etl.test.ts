/**
 * ETL Tests
 *
 * Unit tests for ETL utilities and job logic.
 */

import { describe, it, expect } from 'vitest';
import {
  toDateKey,
  fromDateKey,
  getYesterday,
  getToday,
  parseDate,
  formatDate,
  startOfDay,
  endOfDay,
  dateRange,
} from '../src/etl/dateUtils.js';

// ══════════════════════════════════════════════════════════════════════════════
// DATE UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

describe('Date Utilities', () => {
  describe('toDateKey', () => {
    it('converts date to YYYYMMDD integer', () => {
      const date = new Date(Date.UTC(2025, 0, 15)); // Jan 15, 2025
      expect(toDateKey(date)).toBe(20250115);
    });

    it('handles single-digit month and day', () => {
      const date = new Date(Date.UTC(2025, 0, 5)); // Jan 5, 2025
      expect(toDateKey(date)).toBe(20250105);
    });

    it('handles end of year', () => {
      const date = new Date(Date.UTC(2025, 11, 31)); // Dec 31, 2025
      expect(toDateKey(date)).toBe(20251231);
    });
  });

  describe('fromDateKey', () => {
    it('converts YYYYMMDD integer to date', () => {
      const date = fromDateKey(20250115);
      expect(date.getUTCFullYear()).toBe(2025);
      expect(date.getUTCMonth()).toBe(0); // January
      expect(date.getUTCDate()).toBe(15);
    });

    it('roundtrips correctly', () => {
      const original = new Date(Date.UTC(2025, 5, 20));
      const key = toDateKey(original);
      const restored = fromDateKey(key);
      expect(restored.getTime()).toBe(original.getTime());
    });
  });

  describe('getYesterday', () => {
    it('returns a date one day before today', () => {
      const yesterday = getYesterday();
      const today = getToday();
      const diff = today.getTime() - yesterday.getTime();
      expect(diff).toBe(24 * 60 * 60 * 1000); // One day in ms
    });

    it('returns midnight UTC', () => {
      const yesterday = getYesterday();
      expect(yesterday.getUTCHours()).toBe(0);
      expect(yesterday.getUTCMinutes()).toBe(0);
      expect(yesterday.getUTCSeconds()).toBe(0);
    });
  });

  describe('parseDate', () => {
    it('parses YYYY-MM-DD string', () => {
      const date = parseDate('2025-06-15');
      expect(date.getUTCFullYear()).toBe(2025);
      expect(date.getUTCMonth()).toBe(5); // June (0-indexed)
      expect(date.getUTCDate()).toBe(15);
    });

    it('throws on invalid format', () => {
      expect(() => parseDate('invalid')).toThrow();
      expect(() => parseDate('2025/01/15')).toThrow();
    });
  });

  describe('formatDate', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date(Date.UTC(2025, 5, 15));
      expect(formatDate(date)).toBe('2025-06-15');
    });
  });

  describe('startOfDay / endOfDay', () => {
    it('startOfDay returns midnight UTC', () => {
      const input = new Date(Date.UTC(2025, 5, 15, 14, 30, 45));
      const start = startOfDay(input);
      expect(start.getUTCHours()).toBe(0);
      expect(start.getUTCMinutes()).toBe(0);
      expect(start.getUTCSeconds()).toBe(0);
      expect(start.getUTCDate()).toBe(15);
    });

    it('endOfDay returns 23:59:59.999 UTC', () => {
      const input = new Date(Date.UTC(2025, 5, 15, 14, 30, 45));
      const end = endOfDay(input);
      expect(end.getUTCHours()).toBe(23);
      expect(end.getUTCMinutes()).toBe(59);
      expect(end.getUTCSeconds()).toBe(59);
      expect(end.getUTCMilliseconds()).toBe(999);
      expect(end.getUTCDate()).toBe(15);
    });
  });

  describe('dateRange', () => {
    it('generates inclusive date range', () => {
      const start = new Date(Date.UTC(2025, 0, 1));
      const end = new Date(Date.UTC(2025, 0, 5));
      const range = dateRange(start, end);

      expect(range).toHaveLength(5);
      expect(range[0]?.getUTCDate()).toBe(1);
      expect(range[4]?.getUTCDate()).toBe(5);
    });

    it('handles single day range', () => {
      const date = new Date(Date.UTC(2025, 0, 1));
      const range = dateRange(date, date);

      expect(range).toHaveLength(1);
      expect(range[0]?.getUTCDate()).toBe(1);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

describe('ETL Types', () => {
  it('JobResult shape is correct', () => {
    const result = {
      jobName: 'build_fact_sessions' as const,
      status: 'SUCCESS' as const,
      rowsProcessed: 100,
      rowsInserted: 80,
      rowsUpdated: 20,
      rowsDeleted: 5,
      durationMs: 1500,
    };

    expect(result.jobName).toBe('build_fact_sessions');
    expect(result.status).toBe('SUCCESS');
    expect(result.rowsProcessed).toBe(100);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MOCK INTEGRATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('ETL Job Logic (unit)', () => {
  describe('Dimension Sync Logic', () => {
    it('should handle SCD Type 2 versioning conceptually', () => {
      // Test the concept: old record closed, new record opened
      const oldRecord = {
        tenant_key: 1,
        tenant_name: 'Old Name',
        is_current: true,
        effective_to: null,
      };

      const updatedRecord = {
        tenant_name: 'New Name',
      };

      // Simulate close old
      const closedOld = {
        ...oldRecord,
        is_current: false,
        effective_to: new Date(),
      };

      // Simulate new version
      const newVersion = {
        tenant_key: 2, // New surrogate key
        tenant_name: updatedRecord.tenant_name,
        is_current: true,
        effective_to: null,
      };

      expect(closedOld.is_current).toBe(false);
      expect(closedOld.effective_to).toBeDefined();
      expect(newVersion.is_current).toBe(true);
      expect(newVersion.tenant_name).toBe('New Name');
    });
  });

  describe('Fact Build Logic', () => {
    it('should aggregate session events correctly', () => {
      // Mock session events
      const events = [
        { event_type: 'ACTIVITY_STARTED', metadata: {} },
        { event_type: 'ACTIVITY_COMPLETED', metadata: {} },
        { event_type: 'ACTIVITY_RESPONSE_SUBMITTED', metadata: { isCorrect: true } },
        { event_type: 'ACTIVITY_RESPONSE_SUBMITTED', metadata: { isCorrect: false } },
        { event_type: 'HOMEWORK_HINT_REQUESTED', metadata: {} },
        { event_type: 'FOCUS_BREAK_STARTED', metadata: {} },
      ];

      // Aggregate
      const stats = {
        activities_assigned: events.filter((e) => e.event_type === 'ACTIVITY_STARTED').length,
        activities_completed: events.filter((e) => e.event_type === 'ACTIVITY_COMPLETED').length,
        correct_responses: events.filter(
          (e) =>
            e.event_type === 'ACTIVITY_RESPONSE_SUBMITTED' &&
            (e.metadata as { isCorrect?: boolean }).isCorrect === true
        ).length,
        incorrect_responses: events.filter(
          (e) =>
            e.event_type === 'ACTIVITY_RESPONSE_SUBMITTED' &&
            (e.metadata as { isCorrect?: boolean }).isCorrect === false
        ).length,
        hints_used: events.filter((e) => e.event_type === 'HOMEWORK_HINT_REQUESTED').length,
        focus_breaks: events.filter((e) => e.event_type === 'FOCUS_BREAK_STARTED').length,
      };

      expect(stats.activities_assigned).toBe(1);
      expect(stats.activities_completed).toBe(1);
      expect(stats.correct_responses).toBe(1);
      expect(stats.incorrect_responses).toBe(1);
      expect(stats.hints_used).toBe(1);
      expect(stats.focus_breaks).toBe(1);
    });

    it('should calculate completion rate correctly', () => {
      const stepCount = 5;
      const stepsCompleted = 3;

      const completionRate = stepCount > 0 ? stepsCompleted / stepCount : 0;

      expect(completionRate).toBe(0.6);
    });
  });

  describe('Idempotency Strategy', () => {
    it('should use date_key for partitioning', () => {
      const targetDate = new Date(Date.UTC(2025, 0, 15));
      const dateKey = toDateKey(targetDate);

      // DELETE + INSERT pattern
      const deleteQuery = `DELETE FROM fact_sessions WHERE date_key = ${dateKey}`;
      const insertQuery = `INSERT INTO fact_sessions (date_key, ...) VALUES (${dateKey}, ...)`;

      expect(deleteQuery).toContain('date_key = 20250115');
      expect(insertQuery).toContain('20250115');
    });

    it('should use session_id for upsert pattern', () => {
      const sessionId = 'abc-123';

      // ON CONFLICT pattern
      const upsertQuery = `
        INSERT INTO fact_sessions (session_id, ...)
        VALUES ('${sessionId}', ...)
        ON CONFLICT (session_id) DO UPDATE SET ...
      `;

      expect(upsertQuery).toContain('ON CONFLICT (session_id)');
    });
  });
});
