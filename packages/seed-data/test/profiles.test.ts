import { describe, it, expect } from 'vitest';

import {
  LEARNER_PROFILES,
  PARENT_PROFILES,
  LEARNERS,
  PARENTS,
  SCHOOLS,
} from '../src/index.js';
import type { LearnerProfile, ParentProfile } from '../src/index.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// ── LEARNER_PROFILES ─────────────────────────────────────────────

describe('LEARNER_PROFILES', () => {
  const entries = Object.entries(LEARNER_PROFILES);

  it('has 6 entries', () => {
    expect(entries).toHaveLength(6);
  });

  it('every profile id references a known LEARNERS UUID', () => {
    const learnerIds = new Set(Object.values(LEARNERS));
    for (const [, profile] of entries) {
      expect(learnerIds.has(profile.id)).toBe(true);
    }
  });

  it('every profile school references a known SCHOOLS UUID', () => {
    const schoolIds = new Set(Object.values(SCHOOLS));
    for (const [, profile] of entries) {
      expect(schoolIds.has(profile.school)).toBe(true);
    }
  });

  it('every profile parentId references a known PARENTS UUID', () => {
    const parentIds = new Set(Object.values(PARENTS));
    for (const [, profile] of entries) {
      expect(parentIds.has(profile.parentId)).toBe(true);
    }
  });

  it('every profile has required string fields', () => {
    for (const [, p] of entries) {
      expect(p.firstName).toBeTruthy();
      expect(p.lastName).toBeTruthy();
      expect(p.grade).toBeTruthy();
      expect(p.dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.primaryDisability).toBeTruthy();
    }
  });

  it('every functioningLevel is valid', () => {
    const valid = new Set(['TYPICAL', 'MILD', 'MODERATE', 'SEVERE', 'PROFOUND']);
    for (const [, p] of entries) {
      expect(valid.has(p.functioningLevel)).toBe(true);
    }
  });

  it('every assessmentType is valid', () => {
    const valid = new Set(['STANDARD', 'STANDARD_WITH_ACCOMMODATIONS', 'MODIFIED', 'ALTERNATE']);
    for (const [, p] of entries) {
      expect(valid.has(p.assessmentType)).toBe(true);
    }
  });

  it('secondaryDisabilities is always an array', () => {
    for (const [, p] of entries) {
      expect(Array.isArray(p.secondaryDisabilities)).toBe(true);
    }
  });
});

// ── PARENT_PROFILES ──────────────────────────────────────────────

describe('PARENT_PROFILES', () => {
  const entries = Object.entries(PARENT_PROFILES);

  it('has 6 entries', () => {
    expect(entries).toHaveLength(6);
  });

  it('every profile id references a known PARENTS UUID', () => {
    const parentIds = new Set(Object.values(PARENTS));
    for (const [, p] of entries) {
      expect(parentIds.has(p.id)).toBe(true);
    }
  });

  it('every learnerId references a known LEARNERS UUID', () => {
    const learnerIds = new Set(Object.values(LEARNERS));
    for (const [, p] of entries) {
      expect(learnerIds.has(p.learnerId)).toBe(true);
    }
  });

  it('every profile has valid email', () => {
    for (const [, p] of entries) {
      expect(p.email).toMatch(/@/);
    }
  });

  it('every profile has givenName, familyName, phone, relationship', () => {
    for (const [, p] of entries) {
      expect(p.givenName).toBeTruthy();
      expect(p.familyName).toBeTruthy();
      expect(p.phone).toBeTruthy();
      expect(p.relationship).toBeTruthy();
    }
  });
});
