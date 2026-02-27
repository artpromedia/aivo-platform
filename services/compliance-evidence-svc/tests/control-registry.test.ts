/**
 * Tests for compliance-evidence-svc control-registry — pure lookup functions
 * and structural integrity of CONTROLS / COLLECTORS arrays.
 */
import { describe, it, expect } from 'vitest';
import {
  CONTROLS,
  COLLECTORS,
  getControl,
  getCollector,
  getControlsByCategory,
  getControlsByCollector,
  staleDaysForSchedule,
} from '../src/control-registry.js';

// ── Structural Integrity ───────────────────────────────────────────────

describe('CONTROLS array', () => {
  it('has at least 50 controls', () => {
    expect(CONTROLS.length).toBeGreaterThanOrEqual(50);
  });

  it('every control has required fields', () => {
    for (const c of CONTROLS) {
      expect(c.id).toBeTruthy();
      expect(c.category).toBeTruthy();
      expect(c.section).toBeTruthy();
      expect(c.sectionTitle).toBeTruthy();
      expect(c.description).toBeTruthy();
      expect(Array.isArray(c.collectors)).toBe(true);
      expect(c.collectors.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('has unique control IDs', () => {
    const ids = CONTROLS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers all SOC 2 categories', () => {
    const categories = new Set(CONTROLS.map((c) => c.category));
    expect(categories).toContain('CC');
    expect(categories).toContain('A');
    expect(categories).toContain('PI');
    expect(categories).toContain('C');
    expect(categories).toContain('P');
  });

  it('all collector references point to valid COLLECTORS', () => {
    const collectorIds = new Set(COLLECTORS.map((c) => c.id));
    for (const control of CONTROLS) {
      for (const ref of control.collectors) {
        expect(collectorIds.has(ref)).toBe(true);
      }
    }
  });
});

describe('COLLECTORS array', () => {
  it('has at least 10 collectors', () => {
    expect(COLLECTORS.length).toBeGreaterThanOrEqual(10);
  });

  it('every collector has required fields', () => {
    for (const c of COLLECTORS) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.description).toBeTruthy();
      expect(['daily', 'weekly', 'monthly', 'quarterly', 'annual']).toContain(c.schedule);
      expect(Array.isArray(c.controlIds)).toBe(true);
      expect(typeof c.enabled).toBe('boolean');
    }
  });

  it('has unique collector IDs', () => {
    const ids = COLLECTORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('controlIds in each collector correspond to actual controls', () => {
    const controlIds = new Set(CONTROLS.map((c) => c.id));
    for (const collector of COLLECTORS) {
      for (const cid of collector.controlIds) {
        expect(controlIds.has(cid)).toBe(true);
      }
    }
  });
});

// ── Lookup Functions ───────────────────────────────────────────────────

describe('getControl', () => {
  it('returns matching control by ID', () => {
    const c = getControl('CC1.1.1');
    expect(c).toBeDefined();
    expect(c?.id).toBe('CC1.1.1');
    expect(c?.category).toBe('CC');
  });

  it('returns undefined for unknown ID', () => {
    expect(getControl('ZZZZZ')).toBeUndefined();
  });
});

describe('getCollector', () => {
  it('returns matching collector by ID', () => {
    const c = getCollector('access-review');
    expect(c).toBeDefined();
    expect(c?.id).toBe('access-review');
  });

  it('returns undefined for unknown ID', () => {
    expect(getCollector('nonexistent')).toBeUndefined();
  });
});

describe('getControlsByCategory', () => {
  it('returns only controls of given category', () => {
    const cc = getControlsByCategory('CC');
    expect(cc.length).toBeGreaterThan(0);
    expect(cc.every((c) => c.category === 'CC')).toBe(true);
  });

  it('returns privacy controls', () => {
    const p = getControlsByCategory('P');
    expect(p.length).toBeGreaterThan(0);
    expect(p.every((c) => c.category === 'P')).toBe(true);
  });

  it('returns empty array for unknown category', () => {
    expect(getControlsByCategory('X')).toEqual([]);
  });
});

describe('getControlsByCollector', () => {
  it('returns controls that use the given collector', () => {
    const controls = getControlsByCollector('access-review');
    expect(controls.length).toBeGreaterThan(0);
    expect(controls.every((c) => c.collectors.includes('access-review'))).toBe(true);
  });

  it('returns empty for unknown collector', () => {
    expect(getControlsByCollector('nope')).toEqual([]);
  });
});

// ── staleDaysForSchedule ───────────────────────────────────────────────

describe('staleDaysForSchedule', () => {
  it('returns 2 for daily', () => {
    expect(staleDaysForSchedule('daily')).toBe(2);
  });

  it('returns 10 for weekly', () => {
    expect(staleDaysForSchedule('weekly')).toBe(10);
  });

  it('returns 35 for monthly', () => {
    expect(staleDaysForSchedule('monthly')).toBe(35);
  });

  it('returns 100 for quarterly', () => {
    expect(staleDaysForSchedule('quarterly')).toBe(100);
  });

  it('returns 380 for annual', () => {
    expect(staleDaysForSchedule('annual')).toBe(380);
  });
});
