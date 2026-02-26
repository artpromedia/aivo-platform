import { describe, it, expect } from 'vitest';

import {
  TENANTS,
  SCHOOLS,
  PARENTS,
  LEARNERS,
  TEACHERS,
  IEPS,
  PARENT_ASSESSMENTS,
} from '../src/index.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// ── TENANTS ──────────────────────────────────────────────────────

describe('TENANTS', () => {
  it('has DEV and ANOKA_HENNEPIN', () => {
    expect(TENANTS).toHaveProperty('DEV');
    expect(TENANTS).toHaveProperty('ANOKA_HENNEPIN');
  });

  it('values are valid UUIDs', () => {
    for (const v of Object.values(TENANTS)) {
      expect(v).toMatch(UUID_RE);
    }
  });

  it('has exactly 2 entries', () => {
    expect(Object.keys(TENANTS)).toHaveLength(2);
  });
});

// ── SCHOOLS ──────────────────────────────────────────────────────

describe('SCHOOLS', () => {
  it('has 4 schools', () => {
    expect(Object.keys(SCHOOLS)).toHaveLength(4);
  });

  it('all values are valid UUIDs', () => {
    for (const v of Object.values(SCHOOLS)) {
      expect(v).toMatch(UUID_RE);
    }
  });

  it('includes expected names', () => {
    expect(SCHOOLS).toHaveProperty('LINCOLN_ELEMENTARY');
    expect(SCHOOLS).toHaveProperty('ANOKA_MIDDLE');
    expect(SCHOOLS).toHaveProperty('CHAMPLIN_PARK_HIGH');
    expect(SCHOOLS).toHaveProperty('COON_RAPIDS_MIDDLE');
  });

  it('all values are unique', () => {
    const vals = Object.values(SCHOOLS);
    expect(new Set(vals).size).toBe(vals.length);
  });
});

// ── PARENTS ──────────────────────────────────────────────────────

describe('PARENTS', () => {
  it('has 6 parents', () => {
    expect(Object.keys(PARENTS)).toHaveLength(6);
  });

  it('all values are valid UUIDs', () => {
    for (const v of Object.values(PARENTS)) {
      expect(v).toMatch(UUID_RE);
    }
  });

  it('all values are unique', () => {
    const vals = Object.values(PARENTS);
    expect(new Set(vals).size).toBe(vals.length);
  });
});

// ── LEARNERS ─────────────────────────────────────────────────────

describe('LEARNERS', () => {
  it('has 6 learners', () => {
    expect(Object.keys(LEARNERS)).toHaveLength(6);
  });

  it('all values are valid UUIDs', () => {
    for (const v of Object.values(LEARNERS)) {
      expect(v).toMatch(UUID_RE);
    }
  });

  it('all values are unique', () => {
    const vals = Object.values(LEARNERS);
    expect(new Set(vals).size).toBe(vals.length);
  });
});

// ── TEACHERS ─────────────────────────────────────────────────────

describe('TEACHERS', () => {
  it('has 6 teachers', () => {
    expect(Object.keys(TEACHERS)).toHaveLength(6);
  });

  it('all values are valid UUIDs', () => {
    for (const v of Object.values(TEACHERS)) {
      expect(v).toMatch(UUID_RE);
    }
  });
});

// ── IEPS ─────────────────────────────────────────────────────────

describe('IEPS', () => {
  it('has 6 IEPs (one per learner)', () => {
    expect(Object.keys(IEPS)).toHaveLength(6);
  });

  it('keys mirror LEARNERS keys', () => {
    expect(Object.keys(IEPS).sort()).toEqual(Object.keys(LEARNERS).sort());
  });

  it('all values are valid UUIDs', () => {
    for (const v of Object.values(IEPS)) {
      expect(v).toMatch(UUID_RE);
    }
  });
});

// ── PARENT_ASSESSMENTS ───────────────────────────────────────────

describe('PARENT_ASSESSMENTS', () => {
  it('has 6 assessments', () => {
    expect(Object.keys(PARENT_ASSESSMENTS)).toHaveLength(6);
  });

  it('keys mirror LEARNERS keys', () => {
    expect(Object.keys(PARENT_ASSESSMENTS).sort()).toEqual(Object.keys(LEARNERS).sort());
  });

  it('all values are valid UUIDs', () => {
    for (const v of Object.values(PARENT_ASSESSMENTS)) {
      expect(v).toMatch(UUID_RE);
    }
  });
});
