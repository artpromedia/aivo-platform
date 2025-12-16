/**
 * Privacy Guard Tests
 * 
 * Tests for de-identification and k-anonymity enforcement.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  pseudonymize,
  coarsenDate,
  enforceKAnonymity,
  transformDataset,
  DEFAULT_CONSTRAINTS,
  type PrivacyConstraints,
} from '../src/services/privacyGuard.js';

describe('PrivacyGuard', () => {
  const testSecret = 'test-hmac-secret-key-12345';

  describe('pseudonymize', () => {
    it('should generate consistent pseudonyms for the same input', () => {
      const id1 = pseudonymize('learner-123', 'project-1', testSecret);
      const id2 = pseudonymize('learner-123', 'project-1', testSecret);
      
      expect(id1).toBe(id2);
    });

    it('should generate different pseudonyms for different learners', () => {
      const id1 = pseudonymize('learner-123', 'project-1', testSecret);
      const id2 = pseudonymize('learner-456', 'project-1', testSecret);
      
      expect(id1).not.toBe(id2);
    });

    it('should generate different pseudonyms for different projects', () => {
      const id1 = pseudonymize('learner-123', 'project-1', testSecret);
      const id2 = pseudonymize('learner-123', 'project-2', testSecret);
      
      expect(id1).not.toBe(id2);
    });

    it('should not reveal the original ID in the pseudonym', () => {
      const pseudo = pseudonymize('learner-123', 'project-1', testSecret);
      
      expect(pseudo).not.toContain('learner');
      expect(pseudo).not.toContain('123');
    });

    it('should generate a base64url-safe string', () => {
      const pseudo = pseudonymize('test-id', 'project', testSecret);
      
      expect(pseudo).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('coarsenDate', () => {
    it('should coarsen to DAY (start of day)', () => {
      const date = new Date('2024-03-15T14:30:45.123Z');
      const coarsened = coarsenDate(date, 'DAY');
      
      expect(coarsened.toISOString()).toBe('2024-03-15T00:00:00.000Z');
    });

    it('should coarsen to WEEK (start of week, Monday)', () => {
      const date = new Date('2024-03-15T14:30:45.123Z'); // Friday
      const coarsened = coarsenDate(date, 'WEEK');
      
      // March 11, 2024 is Monday
      expect(coarsened.toISOString()).toBe('2024-03-11T00:00:00.000Z');
    });

    it('should coarsen to MONTH (start of month)', () => {
      const date = new Date('2024-03-15T14:30:45.123Z');
      const coarsened = coarsenDate(date, 'MONTH');
      
      expect(coarsened.toISOString()).toBe('2024-03-01T00:00:00.000Z');
    });

    it('should coarsen to QUARTER (start of quarter)', () => {
      const date = new Date('2024-05-15T14:30:45.123Z'); // Q2
      const coarsened = coarsenDate(date, 'QUARTER');
      
      expect(coarsened.toISOString()).toBe('2024-04-01T00:00:00.000Z');
    });

    it('should coarsen to YEAR (start of year)', () => {
      const date = new Date('2024-07-15T14:30:45.123Z');
      const coarsened = coarsenDate(date, 'YEAR');
      
      expect(coarsened.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('enforceKAnonymity', () => {
    it('should not suppress groups meeting threshold', () => {
      const data = [
        { school: 'A', count: 15 },
        { school: 'A', count: 20 },
        { school: 'B', count: 12 },
      ];

      const result = enforceKAnonymity(data, 10, 'school');
      
      expect(result.suppressed).toBe(0);
      expect(result.data.length).toBe(3);
    });

    it('should suppress groups below threshold', () => {
      const data = [
        { school: 'A', grade: '5', count: 15 },
        { school: 'A', grade: '6', count: 8 }, // Below threshold
        { school: 'B', grade: '5', count: 20 },
        { school: 'B', grade: '6', count: 5 }, // Below threshold
      ];

      const result = enforceKAnonymity(data, 10, 'grade');
      
      expect(result.suppressed).toBe(2);
      expect(result.data.length).toBe(2);
      expect(result.data.every(row => row.count >= 10)).toBe(true);
    });

    it('should return empty array if all groups below threshold', () => {
      const data = [
        { school: 'A', count: 5 },
        { school: 'B', count: 3 },
      ];

      const result = enforceKAnonymity(data, 10, 'school');
      
      expect(result.suppressed).toBe(2);
      expect(result.data.length).toBe(0);
    });
  });

  describe('transformDataset', () => {
    const projectId = 'test-project';
    const projectSecret = testSecret;

    it('should apply all transformations correctly', () => {
      const data = [
        {
          learner_id: 'learner-123',
          session_date: new Date('2024-03-15T14:30:00Z'),
          school_name: 'Test School',
          total_minutes: 45,
          content_id: 'content-abc',
          ip_address: '192.168.1.1', // Should be excluded
        },
      ];

      const columns = [
        { name: 'learner_id', transform: 'PSEUDONYMIZE' as const },
        { name: 'session_date', transform: 'COARSEN_DATE' as const },
        { name: 'school_name', transform: 'NONE' as const },
        { name: 'total_minutes', transform: 'NONE' as const },
        { name: 'ip_address', transform: 'EXCLUDE' as const },
      ];

      const constraints: PrivacyConstraints = {
        ...DEFAULT_CONSTRAINTS,
        dateCoarsening: 'MONTH',
      };

      const result = transformDataset(data, columns, constraints, projectId, projectSecret);

      expect(result.length).toBe(1);
      const row = result[0]!;
      
      // Learner ID should be pseudonymized
      expect(row.learner_id).not.toBe('learner-123');
      expect(row.learner_id).toMatch(/^[A-Za-z0-9_-]+$/);
      
      // Date should be coarsened to month
      expect(new Date(row.session_date).toISOString()).toBe('2024-03-01T00:00:00.000Z');
      
      // School name unchanged
      expect(row.school_name).toBe('Test School');
      
      // IP address should be excluded
      expect(row.ip_address).toBeUndefined();
    });

    it('should filter out excluded columns', () => {
      const data = [
        { a: 1, b: 2, c: 3 },
      ];

      const columns = [
        { name: 'a', transform: 'NONE' as const },
        { name: 'b', transform: 'EXCLUDE' as const },
        { name: 'c', transform: 'NONE' as const },
      ];

      const result = transformDataset(data, columns, DEFAULT_CONSTRAINTS, projectId, projectSecret);

      expect(Object.keys(result[0]!)).toEqual(['a', 'c']);
    });

    it('should handle BUCKET transform for numeric values', () => {
      const data = [
        { age: 14 },
        { age: 16 },
        { age: 18 },
      ];

      const columns = [
        { name: 'age', transform: 'BUCKET' as const },
      ];

      const result = transformDataset(data, columns, DEFAULT_CONSTRAINTS, projectId, projectSecret);

      // Ages should be bucketed to ranges
      expect(result.map(r => r.age)).toEqual(['10-19', '10-19', '10-19']);
    });

    it('should handle ROUND transform', () => {
      const data = [
        { score: 87.654 },
        { score: 92.123 },
      ];

      const columns = [
        { name: 'score', transform: 'ROUND' as const },
      ];

      const result = transformDataset(data, columns, DEFAULT_CONSTRAINTS, projectId, projectSecret);

      expect(result.map(r => r.score)).toEqual([88, 92]);
    });
  });

  describe('DEFAULT_CONSTRAINTS', () => {
    it('should have k-anonymity threshold of 10', () => {
      expect(DEFAULT_CONSTRAINTS.kAnonymityThreshold).toBe(10);
    });

    it('should coarsen dates to DAY by default', () => {
      expect(DEFAULT_CONSTRAINTS.dateCoarsening).toBe('DAY');
    });

    it('should exclude PII columns by default', () => {
      expect(DEFAULT_CONSTRAINTS.excludedColumns).toContain('email');
      expect(DEFAULT_CONSTRAINTS.excludedColumns).toContain('first_name');
      expect(DEFAULT_CONSTRAINTS.excludedColumns).toContain('last_name');
      expect(DEFAULT_CONSTRAINTS.excludedColumns).toContain('ip_address');
    });
  });
});
