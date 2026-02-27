import { describe, it, expect, beforeAll } from 'vitest';

import {
  PILOT_CONFIG,
  generateSchools,
  type PilotSchool,
} from '../src/pilot-generator.js';

// ------------------------------------------------------------------
// PILOT_CONFIG
// ------------------------------------------------------------------

describe('PILOT_CONFIG', () => {
  it('references Anoka-Hennepin district', () => {
    expect(PILOT_CONFIG.district.name).toBe('Anoka-Hennepin School District');
    expect(PILOT_CONFIG.district.state).toBe('MN');
  });

  it('defines 5 schools', () => {
    expect(PILOT_CONFIG.schools).toBe(5);
  });

  it('defines 10 teachers per school', () => {
    expect(PILOT_CONFIG.teachersPerSchool).toBe(10);
  });

  it('targets 500 students', () => {
    expect(PILOT_CONFIG.totalStudents).toBe(500);
  });

  it('targets 400 parents', () => {
    expect(PILOT_CONFIG.totalParents).toBe(400);
  });

  it('targets 450 IEPs', () => {
    expect(PILOT_CONFIG.totalIeps).toBe(450);
  });
});

// ------------------------------------------------------------------
// generateSchools
// ------------------------------------------------------------------

describe('generateSchools', () => {
  let schools: PilotSchool[];

  beforeAll(() => {
    schools = generateSchools();
  });

  it('returns exactly 5 schools', () => {
    expect(schools).toHaveLength(5);
  });

  it('all schools reference the same tenantId', () => {
    for (const school of schools) {
      expect(school.tenantId).toBe(PILOT_CONFIG.district.id);
    }
  });

  it('each school has a unique id', () => {
    const ids = schools.map((s) => s.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('includes variety of school types', () => {
    const types = schools.map((s) => s.type);
    expect(types).toContain('elementary');
    expect(types).toContain('middle');
    expect(types).toContain('high');
  });

  it('each school has expected properties', () => {
    for (const school of schools) {
      expect(school.id).toBeTruthy();
      expect(school.name).toBeTruthy();
      expect(school.grades).toBeInstanceOf(Array);
      expect(school.grades.length).toBeGreaterThan(0);
      expect(school.type).toBeTruthy();
      expect(school.address).toBeTruthy();
      expect(school.phone).toBeTruthy();
      expect(school.principalName).toBeTruthy();
    }
  });

  it('is deterministic (same output each call)', () => {
    const first = generateSchools();
    const second = generateSchools();
    expect(first).toEqual(second);
  });

  it('elementary schools have K–5 grades', () => {
    const elem = schools.find((s) => s.name.includes('Elementary'));
    expect(elem).toBeDefined();
    expect(elem!.grades).toEqual(['K', '1', '2', '3', '4', '5']);
  });

  it('high school has 9–12 grades', () => {
    const high = schools.find((s) => s.type === 'high');
    expect(high).toBeDefined();
    expect(high!.grades).toEqual(['9', '10', '11', '12']);
  });
});
