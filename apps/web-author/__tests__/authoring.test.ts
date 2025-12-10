import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  SUBJECT_LABELS,
  GRADE_BAND_LABELS,
  VERSION_STATE_LABELS,
  VERSION_STATE_TONES,
  type LearningObject,
  type LearningObjectVersion,
  type Subject,
  type GradeBand,
  type VersionState,
} from '../lib/types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPE LABELS & CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Type Labels', () => {
  describe('SUBJECT_LABELS', () => {
    it('has labels for all subjects', () => {
      const subjects: Subject[] = ['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER'];
      subjects.forEach((subject) => {
        expect(SUBJECT_LABELS[subject]).toBeDefined();
        expect(typeof SUBJECT_LABELS[subject]).toBe('string');
      });
    });

    it('returns correct labels', () => {
      expect(SUBJECT_LABELS.ELA).toBe('English Language Arts');
      expect(SUBJECT_LABELS.MATH).toBe('Mathematics');
      expect(SUBJECT_LABELS.SCIENCE).toBe('Science');
    });
  });

  describe('GRADE_BAND_LABELS', () => {
    it('has labels for all grade bands', () => {
      const gradeBands: GradeBand[] = ['K_2', 'G3_5', 'G6_8', 'G9_12'];
      gradeBands.forEach((band) => {
        expect(GRADE_BAND_LABELS[band]).toBeDefined();
        expect(typeof GRADE_BAND_LABELS[band]).toBe('string');
      });
    });

    it('returns correct labels', () => {
      expect(GRADE_BAND_LABELS.K_2).toBe('K-2');
      expect(GRADE_BAND_LABELS.G3_5).toBe('3-5');
      expect(GRADE_BAND_LABELS.G6_8).toBe('6-8');
      expect(GRADE_BAND_LABELS.G9_12).toBe('9-12');
    });
  });

  describe('VERSION_STATE_LABELS', () => {
    it('has labels for all states', () => {
      const states: VersionState[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED'];
      states.forEach((state) => {
        expect(VERSION_STATE_LABELS[state]).toBeDefined();
        expect(typeof VERSION_STATE_LABELS[state]).toBe('string');
      });
    });

    it('returns correct labels', () => {
      expect(VERSION_STATE_LABELS.DRAFT).toBe('Draft');
      expect(VERSION_STATE_LABELS.IN_REVIEW).toBe('In Review');
      expect(VERSION_STATE_LABELS.APPROVED).toBe('Approved');
      expect(VERSION_STATE_LABELS.PUBLISHED).toBe('Published');
      expect(VERSION_STATE_LABELS.RETIRED).toBe('Retired');
    });
  });

  describe('VERSION_STATE_TONES', () => {
    it('has tones for all states', () => {
      const states: VersionState[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED'];
      states.forEach((state) => {
        expect(VERSION_STATE_TONES[state]).toBeDefined();
      });
    });

    it('returns correct tones', () => {
      expect(VERSION_STATE_TONES.DRAFT).toBe('neutral');
      expect(VERSION_STATE_TONES.IN_REVIEW).toBe('info');
      expect(VERSION_STATE_TONES.APPROVED).toBe('success');
      expect(VERSION_STATE_TONES.PUBLISHED).toBe('success');
      expect(VERSION_STATE_TONES.RETIRED).toBe('warning');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT TESTS
// ══════════════════════════════════════════════════════════════════════════════

import * as api from '../lib/authoring-api';

describe('Authoring API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('listLearningObjects', () => {
    it('calls fetch with correct URL and returns data', async () => {
      const mockResponse: api.PaginatedResponse<LearningObject> = {
        data: [
          {
            id: '1',
            tenantId: 'tenant-1',
            slug: 'test-lo',
            title: 'Test LO',
            subject: 'ELA',
            gradeBand: 'G3_5',
            primarySkillId: null,
            isActive: true,
            createdByUserId: 'user-1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            tags: [],
          },
        ],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.listLearningObjects({ subject: 'ELA', page: 1 });

      expect(fetch).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Test LO');
    });

    it('throws error on failed request', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      await expect(api.listLearningObjects()).rejects.toThrow('Server error');
    });
  });

  describe('createLearningObject', () => {
    it('calls POST with correct body', async () => {
      const mockResponse = {
        learningObject: {
          id: '1',
          title: 'New LO',
          subject: 'MATH',
          gradeBand: 'G6_8',
        },
        version: {
          id: 'v1',
          versionNumber: 1,
          state: 'DRAFT',
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.createLearningObject({
        title: 'New LO',
        subject: 'MATH',
        gradeBand: 'G6_8',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/learning-objects'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('New LO'),
        })
      );
      expect(result.learningObject.title).toBe('New LO');
    });
  });

  describe('updateVersion', () => {
    it('calls PATCH with correct body', async () => {
      const mockResponse = {
        id: 'v1',
        versionNumber: 1,
        state: 'DRAFT',
        contentJson: { type: 'reading_passage', passageText: 'Updated text' },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.updateVersion('lo-1', 1, {
        contentJson: { type: 'reading_passage', passageText: 'Updated text' },
        changeSummary: 'Updated passage',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/learning-objects/lo-1/versions/1'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
      expect(result.contentJson.passageText).toBe('Updated text');
    });
  });

  describe('workflow transitions', () => {
    it('submitForReview calls correct endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ state: 'IN_REVIEW' }),
      });

      await api.submitForReview('lo-1', 1);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/submit-review'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('approveVersion calls correct endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ state: 'APPROVED' }),
      });

      await api.approveVersion('lo-1', 1);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/approve'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('rejectVersion sends reason in body', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ state: 'DRAFT' }),
      });

      await api.rejectVersion('lo-1', 1, { reason: 'Needs revision' });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reject'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Needs revision'),
        })
      );
    });

    it('publishVersion calls correct endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ state: 'PUBLISHED' }),
      });

      await api.publishVersion('lo-1', 1);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/publish'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('listSkills', () => {
    it('returns mock skills when API unavailable', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const skills = await api.listSkills({ subject: 'ELA' });

      expect(skills.length).toBeGreaterThan(0);
      expect(skills.every((s) => s.subject === 'ELA' || s.subject === null)).toBe(true);
    });
  });

  describe('searchStandards', () => {
    it('returns matching standards', async () => {
      const standards = await api.searchStandards('main idea');

      expect(standards.length).toBeGreaterThan(0);
      expect(standards.some((s) => s.description.toLowerCase().includes('main idea'))).toBe(true);
    });

    it('returns empty for no matches', async () => {
      const standards = await api.searchStandards('xyz123nonexistent');

      expect(standards).toEqual([]);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY TESTS
// ══════════════════════════════════════════════════════════════════════════════

import { cn } from '../lib/cn';

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', true && 'active', false && 'hidden')).toBe('base active');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTH HELPERS
// ══════════════════════════════════════════════════════════════════════════════

import { hasRole, isAuthor, isReviewer, isAdmin, type AuthSession } from '../lib/auth';

describe('Auth helpers', () => {
  const mockSession = (roles: string[]): AuthSession => ({
    userId: 'user-1',
    tenantId: 'tenant-1',
    roles: roles as any,
    accessToken: 'token',
  });

  describe('hasRole', () => {
    it('returns true when user has role', () => {
      const session = mockSession(['CURRICULUM_AUTHOR']);
      expect(hasRole(session, 'CURRICULUM_AUTHOR')).toBe(true);
    });

    it('returns false when user lacks role', () => {
      const session = mockSession(['CURRICULUM_AUTHOR']);
      expect(hasRole(session, 'CURRICULUM_REVIEWER')).toBe(false);
    });

    it('returns true when user has any of multiple roles', () => {
      const session = mockSession(['CURRICULUM_REVIEWER']);
      expect(hasRole(session, 'CURRICULUM_AUTHOR', 'CURRICULUM_REVIEWER')).toBe(true);
    });
  });

  describe('isAuthor', () => {
    it('returns true for CURRICULUM_AUTHOR', () => {
      expect(isAuthor(mockSession(['CURRICULUM_AUTHOR']))).toBe(true);
    });

    it('returns true for DISTRICT_CONTENT_ADMIN', () => {
      expect(isAuthor(mockSession(['DISTRICT_CONTENT_ADMIN']))).toBe(true);
    });

    it('returns true for PLATFORM_ADMIN', () => {
      expect(isAuthor(mockSession(['PLATFORM_ADMIN']))).toBe(true);
    });

    it('returns false for CURRICULUM_REVIEWER only', () => {
      expect(isAuthor(mockSession(['CURRICULUM_REVIEWER']))).toBe(false);
    });
  });

  describe('isReviewer', () => {
    it('returns true for CURRICULUM_REVIEWER', () => {
      expect(isReviewer(mockSession(['CURRICULUM_REVIEWER']))).toBe(true);
    });

    it('returns true for DISTRICT_CONTENT_ADMIN', () => {
      expect(isReviewer(mockSession(['DISTRICT_CONTENT_ADMIN']))).toBe(true);
    });

    it('returns false for CURRICULUM_AUTHOR only', () => {
      expect(isReviewer(mockSession(['CURRICULUM_AUTHOR']))).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('returns true for DISTRICT_CONTENT_ADMIN', () => {
      expect(isAdmin(mockSession(['DISTRICT_CONTENT_ADMIN']))).toBe(true);
    });

    it('returns true for PLATFORM_ADMIN', () => {
      expect(isAdmin(mockSession(['PLATFORM_ADMIN']))).toBe(true);
    });

    it('returns false for author and reviewer', () => {
      expect(isAdmin(mockSession(['CURRICULUM_AUTHOR', 'CURRICULUM_REVIEWER']))).toBe(false);
    });
  });
});
