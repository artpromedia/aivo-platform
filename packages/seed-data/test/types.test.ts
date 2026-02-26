import { describe, it, expect } from 'vitest';

import type {
  FunctioningLevel,
  AssessmentType,
  LearnerProfile,
  ParentProfile,
} from '../src/index.js';

// ── FunctioningLevel type tests ──────────────────────────────────

describe('FunctioningLevel type', () => {
  it('TYPICAL is a valid level', () => {
    const val: FunctioningLevel = 'TYPICAL';
    expect(val).toBe('TYPICAL');
  });

  it('MILD is a valid level', () => {
    const val: FunctioningLevel = 'MILD';
    expect(val).toBe('MILD');
  });

  it('MODERATE is a valid level', () => {
    const val: FunctioningLevel = 'MODERATE';
    expect(val).toBe('MODERATE');
  });

  it('SEVERE is a valid level', () => {
    const val: FunctioningLevel = 'SEVERE';
    expect(val).toBe('SEVERE');
  });

  it('PROFOUND is a valid level', () => {
    const val: FunctioningLevel = 'PROFOUND';
    expect(val).toBe('PROFOUND');
  });
});

// ── AssessmentType type tests ────────────────────────────────────

describe('AssessmentType type', () => {
  it('STANDARD is a valid type', () => {
    const val: AssessmentType = 'STANDARD';
    expect(val).toBe('STANDARD');
  });

  it('STANDARD_WITH_ACCOMMODATIONS is a valid type', () => {
    const val: AssessmentType = 'STANDARD_WITH_ACCOMMODATIONS';
    expect(val).toBe('STANDARD_WITH_ACCOMMODATIONS');
  });

  it('MODIFIED is a valid type', () => {
    const val: AssessmentType = 'MODIFIED';
    expect(val).toBe('MODIFIED');
  });

  it('ALTERNATE is a valid type', () => {
    const val: AssessmentType = 'ALTERNATE';
    expect(val).toBe('ALTERNATE');
  });
});

// ── LearnerProfile shape tests ───────────────────────────────────

describe('LearnerProfile shape', () => {
  it('constructs a valid profile', () => {
    const profile: LearnerProfile = {
      id: '00000000-0000-0000-0000-000000000001',
      firstName: 'Test',
      lastName: 'Learner',
      grade: '3',
      dateOfBirth: '2017-05-01',
      school: '00000000-0000-0000-0001-100000000001',
      parentId: '00000000-0000-0000-3000-000000000001',
      functioningLevel: 'MILD',
      assessmentType: 'STANDARD',
      primaryDisability: 'ADHD',
      secondaryDisabilities: [],
    };
    expect(profile.id).toBeTruthy();
    expect(profile.functioningLevel).toBe('MILD');
    expect(profile.secondaryDisabilities).toHaveLength(0);
  });

  it('supports multiple secondary disabilities', () => {
    const profile: LearnerProfile = {
      id: '00000000-0000-0000-0000-000000000002',
      firstName: 'Multi',
      lastName: 'Disability',
      grade: '7',
      dateOfBirth: '2013-09-30',
      school: '00000000-0000-0000-0001-100000000002',
      parentId: '00000000-0000-0000-3000-000000000004',
      functioningLevel: 'MODERATE',
      assessmentType: 'MODIFIED',
      primaryDisability: 'SLD',
      secondaryDisabilities: ['Anxiety', 'Dyslexia'],
    };
    expect(profile.secondaryDisabilities).toHaveLength(2);
  });
});

// ── ParentProfile shape tests ────────────────────────────────────

describe('ParentProfile shape', () => {
  it('constructs a valid parent profile', () => {
    const profile: ParentProfile = {
      id: '00000000-0000-0000-3000-000000000001',
      email: 'test@example.com',
      givenName: 'Test',
      familyName: 'Parent',
      phone: '(555) 000-0000',
      relationship: 'mother',
      learnerId: '00000000-0000-0000-2000-000000000101',
    };
    expect(profile.email).toContain('@');
    expect(profile.relationship).toBe('mother');
  });

  it('father relationship is valid', () => {
    const profile: ParentProfile = {
      id: '00000000-0000-0000-3000-000000000005',
      email: 'dad@example.com',
      givenName: 'Robert',
      familyName: 'Anderson',
      phone: '(555) 000-0005',
      relationship: 'father',
      learnerId: '00000000-0000-0000-2000-000000000105',
    };
    expect(profile.relationship).toBe('father');
  });
});
