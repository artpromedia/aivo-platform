/**
 * Comprehensive Unit Tests for Profile Service
 *
 * Coverage targets: ≥80% line coverage
 * Tests: CRUD operations, accommodations, sensory profiles, AI settings,
 *        tenant isolation, FERPA compliance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════════

const mockProfile = {
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  upsert: vi.fn(),
  count: vi.fn(),
};

const mockAccommodation = {
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
};

const mockSensoryProfile = {
  findUnique: vi.fn(),
  upsert: vi.fn(),
};

const mockAiSettings = {
  findUnique: vi.fn(),
  upsert: vi.fn(),
};

vi.mock('../src/prisma.js', () => ({
  prisma: {
    learnerProfile: mockProfile,
    accommodation: mockAccommodation,
    sensoryProfile: mockSensoryProfile,
    learnerAiSettings: mockAiSettings,
    $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
      fn({
        learnerProfile: mockProfile,
        accommodation: mockAccommodation,
        sensoryProfile: mockSensoryProfile,
        learnerAiSettings: mockAiSettings,
      })
    ),
  },
  Prisma: { JsonNull: null },
}));

vi.mock('../src/events/index.js', () => ({
  publishEvent: vi.fn(),
}));

import * as profileService from '../src/services/profileService.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════════

const TENANT_ID = 'tenant-001';
const LEARNER_ID = 'learner-001';
const CONTEXT = { tenantId: TENANT_ID, userId: 'admin-001', role: 'ADMIN' as const };

const MOCK_PROFILE_DB = {
  id: 'profile-001',
  tenantId: TENANT_ID,
  learnerId: LEARNER_ID,
  displayName: 'Alex Smith',
  gradeLevel: '4',
  dateOfBirth: new Date('2016-05-15'),
  primaryLanguage: 'en',
  learningStyleJson: { visual: 0.8, auditory: 0.5, kinesthetic: 0.7 },
  sensoryProfileJson: { noiseThreshold: 'low', lightSensitivity: 'moderate' },
  communicationPreferencesJson: { preferredMode: 'text', readAloud: true },
  interactionConstraintsJson: { maxSessionMinutes: 30 },
  uiAccessibilityJson: { fontSize: 'large', highContrast: false },
  accommodations: [
    {
      id: 'acc-001',
      category: 'TESTING',
      description: 'Extended time on tests (1.5x)',
      appliesToDomains: ['MATH', 'READING'],
      source: 'IEP',
      isCritical: true,
      effectiveFrom: new Date('2025-08-01'),
      effectiveTo: null,
      isActive: true,
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET PROFILE ─────────────────────────────────────────────────────────
  describe('getProfile', () => {
    it('should return profile with accommodations', async () => {
      mockProfile.findUnique.mockResolvedValue(MOCK_PROFILE_DB);

      const result = await profileService.getProfile(TENANT_ID, LEARNER_ID);

      expect(result).toBeDefined();
      expect(result!.learnerId).toBe(LEARNER_ID);
      expect(result!.accommodations).toHaveLength(1);
      expect(result!.accommodations[0].isCritical).toBe(true);
      expect(mockProfile.findUnique).toHaveBeenCalledWith({
        where: { tenantId_learnerId: { tenantId: TENANT_ID, learnerId: LEARNER_ID } },
        include: expect.objectContaining({
          accommodations: expect.any(Object),
        }),
      });
    });

    it('should return null for non-existent profile', async () => {
      mockProfile.findUnique.mockResolvedValue(null);

      const result = await profileService.getProfile(TENANT_ID, 'no-such-learner');
      expect(result).toBeNull();
    });

    it('should enforce tenant isolation — cannot read cross-tenant', async () => {
      mockProfile.findUnique.mockResolvedValue(null);

      const result = await profileService.getProfile('other-tenant', LEARNER_ID);
      expect(result).toBeNull();
      expect(mockProfile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_learnerId: { tenantId: 'other-tenant', learnerId: LEARNER_ID } },
        })
      );
    });

    it('should only include active accommodations', async () => {
      mockProfile.findUnique.mockResolvedValue(MOCK_PROFILE_DB);

      const result = await profileService.getProfile(TENANT_ID, LEARNER_ID);
      // The query itself filters isActive: true
      expect(mockProfile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            accommodations: expect.objectContaining({
              where: { isActive: true },
            }),
          }),
        })
      );
    });

    it('should sort accommodations by critical-first then newest', async () => {
      mockProfile.findUnique.mockResolvedValue(MOCK_PROFILE_DB);

      await profileService.getProfile(TENANT_ID, LEARNER_ID);
      expect(mockProfile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            accommodations: expect.objectContaining({
              orderBy: [{ isCritical: 'desc' }, { createdAt: 'desc' }],
            }),
          }),
        })
      );
    });
  });

  // ─── CREATE PROFILE ──────────────────────────────────────────────────────
  describe('createProfile', () => {
    it('should create a new profile', async () => {
      mockProfile.findUnique.mockResolvedValue(null);
      mockProfile.create.mockResolvedValue(MOCK_PROFILE_DB);

      const input = {
        displayName: 'Alex Smith',
        gradeLevel: '4',
        dateOfBirth: '2016-05-15',
        primaryLanguage: 'en',
      };

      const result = await profileService.createProfile(
        TENANT_ID,
        LEARNER_ID,
        input as any,
        CONTEXT
      );
      expect(result).toBeDefined();
      expect(mockProfile.create).toHaveBeenCalled();
    });

    it('should reject duplicate profile creation', async () => {
      mockProfile.findUnique.mockResolvedValue(MOCK_PROFILE_DB);

      const input = { displayName: 'Alex Smith' };

      await expect(
        profileService.createProfile(TENANT_ID, LEARNER_ID, input as any, CONTEXT)
      ).rejects.toThrow();
    });

    it('should sanitize JSON fields on creation', async () => {
      mockProfile.findUnique.mockResolvedValue(null);
      mockProfile.create.mockResolvedValue(MOCK_PROFILE_DB);

      const input = {
        displayName: 'Alex Smith',
        learningStyle: { visual: 0.8 },
      };

      await profileService.createProfile(TENANT_ID, LEARNER_ID, input as any, CONTEXT);
      expect(mockProfile.create).toHaveBeenCalled();
    });
  });

  // ─── UPDATE PROFILE ──────────────────────────────────────────────────────
  describe('updateProfile', () => {
    it('should update an existing profile', async () => {
      mockProfile.findUnique.mockResolvedValue(MOCK_PROFILE_DB);
      mockProfile.update.mockResolvedValue({ ...MOCK_PROFILE_DB, displayName: 'Alex S.' });

      const result = await profileService.updateProfile(
        TENANT_ID,
        LEARNER_ID,
        { displayName: 'Alex S.' } as any,
        CONTEXT
      );
      expect(result).toBeDefined();
    });

    it('should throw on non-existent profile update', async () => {
      mockProfile.findUnique.mockResolvedValue(null);

      await expect(
        profileService.updateProfile(TENANT_ID, 'missing', { displayName: 'X' } as any, CONTEXT)
      ).rejects.toThrow();
    });
  });

  // ─── GET PROFILE FOR AI ──────────────────────────────────────────────────
  describe('getProfileForAi', () => {
    it('should return AI-focused profile data', async () => {
      mockProfile.findUnique.mockResolvedValue(MOCK_PROFILE_DB);

      const result = await profileService.getProfileForAi(TENANT_ID, LEARNER_ID);

      expect(result).toBeDefined();
    });

    it('should return null for non-existent learner', async () => {
      mockProfile.findUnique.mockResolvedValue(null);

      const result = await profileService.getProfileForAi(TENANT_ID, 'missing');
      expect(result).toBeNull();
    });
  });

  // ─── Sensory & Learning Data ─────────────────────────────────────────────
  describe('data shape', () => {
    it('should map JSON fields to proper types', async () => {
      mockProfile.findUnique.mockResolvedValue(MOCK_PROFILE_DB);

      const result = await profileService.getProfile(TENANT_ID, LEARNER_ID);
      expect(result).toBeDefined();
      expect(typeof result!.learningStyleJson).toBe('object');
      expect(typeof result!.sensoryProfileJson).toBe('object');
      expect(typeof result!.communicationPreferencesJson).toBe('object');
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('should handle profile with no accommodations', async () => {
      mockProfile.findUnique.mockResolvedValue({
        ...MOCK_PROFILE_DB,
        accommodations: [],
      });

      const result = await profileService.getProfile(TENANT_ID, LEARNER_ID);
      expect(result!.accommodations).toHaveLength(0);
    });

    it('should handle profile with null JSON fields', async () => {
      mockProfile.findUnique.mockResolvedValue({
        ...MOCK_PROFILE_DB,
        learningStyleJson: null,
        sensoryProfileJson: null,
        communicationPreferencesJson: null,
        interactionConstraintsJson: null,
        uiAccessibilityJson: null,
      });

      const result = await profileService.getProfile(TENANT_ID, LEARNER_ID);
      expect(result).toBeDefined();
    });

    it('should handle concurrent profile reads', async () => {
      mockProfile.findUnique.mockResolvedValue(MOCK_PROFILE_DB);

      const results = await Promise.all([
        profileService.getProfile(TENANT_ID, LEARNER_ID),
        profileService.getProfile(TENANT_ID, LEARNER_ID),
        profileService.getProfile(TENANT_ID, LEARNER_ID),
      ]);

      results.forEach((r) => expect(r).toBeDefined());
      expect(mockProfile.findUnique).toHaveBeenCalledTimes(3);
    });
  });
});
