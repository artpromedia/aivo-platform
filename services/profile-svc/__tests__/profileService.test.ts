/**
 * Profile Service Unit Tests
 *
 * Tests for learner profile management service with Prisma mocking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TenantContext } from '../src/types/index.js';

// Mock Prisma client
const mockPrisma = {
  learnerProfile: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  profileChangeLog: {
    create: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
  Prisma: {
    JsonNull: null,
    InputJsonValue: {},
  },
}));

// Import after mocking
import {
  getProfile,
  createProfile,
  updateProfile,
  getProfileForAi,
} from '../src/services/profileService.js';

describe('ProfileService', () => {
  const tenantId = 'tenant-123';
  const learnerId = 'learner-456';
  const context: TenantContext = {
    tenantId,
    userId: 'user-789',
    userRole: 'PARENT',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET PROFILE
  // ════════════════════════════════════════════════════════════════════════════

  describe('getProfile', () => {
    it('should return null for non-existent profile', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue(null);

      const result = await getProfile(tenantId, learnerId);

      expect(result).toBeNull();
      expect(mockPrisma.learnerProfile.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_learnerId: { tenantId, learnerId },
        },
        include: {
          accommodations: {
            where: { isActive: true },
            orderBy: [{ isCritical: 'desc' }, { createdAt: 'desc' }],
          },
        },
      });
    });

    it('should return profile with accommodations', async () => {
      const mockProfile = {
        id: 'profile-1',
        tenantId,
        learnerId,
        summary: 'Test learner profile',
        learningStyleJson: { prefersVisual: true },
        sensoryProfileJson: { noiseSensitivity: 'HIGH' },
        communicationPreferencesJson: { prefersShortPrompts: true },
        interactionConstraintsJson: { avoidTimers: true },
        uiAccessibilityJson: { highContrast: true },
        origin: 'PARENT_REPORTED',
        profileVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        accommodations: [
          {
            id: 'acc-1',
            category: 'VISUAL',
            description: 'Prefers large text',
            appliesToDomains: ['READING'],
            source: 'PARENT_PREFERENCE',
            isCritical: false,
            effectiveFrom: new Date(),
            effectiveTo: null,
            isActive: true,
          },
          {
            id: 'acc-2',
            category: 'MOTOR',
            description: 'Extended time needed',
            appliesToDomains: ['MATH', 'WRITING'],
            source: 'IEP',
            isCritical: true,
            effectiveFrom: new Date(),
            effectiveTo: null,
            isActive: true,
          },
        ],
      };

      mockPrisma.learnerProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await getProfile(tenantId, learnerId);

      expect(result).not.toBeNull();
      expect(result?.summary).toBe('Test learner profile');
      expect(result?.learningStyleJson).toEqual({ prefersVisual: true });
      expect(result?.accommodations).toHaveLength(2);
      expect(result?.accommodations[0].category).toBe('VISUAL');
      expect(result?.accommodations[1].isCritical).toBe(true);
    });

    it('should map accommodation fields correctly', async () => {
      const effectiveFrom = new Date('2024-01-01');
      const effectiveTo = new Date('2024-12-31');

      const mockProfile = {
        id: 'profile-1',
        tenantId,
        learnerId,
        summary: 'Test',
        learningStyleJson: {},
        sensoryProfileJson: {},
        communicationPreferencesJson: {},
        interactionConstraintsJson: {},
        uiAccessibilityJson: {},
        origin: 'ASSESSMENT',
        profileVersion: 1,
        accommodations: [
          {
            id: 'acc-1',
            category: 'AUDITORY',
            description: 'Needs quiet environment',
            appliesToDomains: ['ALL'],
            source: 'PLAN_504',
            isCritical: true,
            effectiveFrom,
            effectiveTo,
            isActive: true,
            // Extra fields that should be excluded
            tenantId,
            learnerId,
            profileId: 'profile-1',
            createdByUserId: 'user-1',
          },
        ],
      };

      mockPrisma.learnerProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await getProfile(tenantId, learnerId);

      expect(result?.accommodations[0]).toEqual({
        id: 'acc-1',
        category: 'AUDITORY',
        description: 'Needs quiet environment',
        appliesToDomains: ['ALL'],
        source: 'PLAN_504',
        isCritical: true,
        effectiveFrom,
        effectiveTo,
        isActive: true,
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CREATE PROFILE
  // ════════════════════════════════════════════════════════════════════════════

  describe('createProfile', () => {
    it('should throw error if profile already exists', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue({
        id: 'existing-profile',
      });

      await expect(
        createProfile(tenantId, learnerId, { summary: 'New profile' }, context)
      ).rejects.toThrow('Profile already exists. Use PATCH to update.');
    });

    it('should create profile with all fields', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue(null);

      const createdProfile = {
        id: 'new-profile-1',
        tenantId,
        learnerId,
        summary: 'New learner profile',
        learningStyleJson: { prefersVisual: true },
        sensoryProfileJson: { noiseSensitivity: 'LOW' },
        communicationPreferencesJson: {},
        interactionConstraintsJson: {},
        uiAccessibilityJson: {},
        origin: 'PARENT_REPORTED',
        profileVersion: 1,
        createdByUserId: context.userId,
      };

      mockPrisma.learnerProfile.create.mockResolvedValue(createdProfile);
      mockPrisma.profileChangeLog.create.mockResolvedValue({});

      const result = await createProfile(
        tenantId,
        learnerId,
        {
          summary: 'New learner profile',
          learningStyleJson: { prefersVisual: true },
          sensoryProfileJson: { noiseSensitivity: 'LOW' },
        },
        context
      );

      expect(result.id).toBe('new-profile-1');
      expect(result.profileVersion).toBe(1);

      // Verify create was called with correct data
      expect(mockPrisma.learnerProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          learnerId,
          summary: 'New learner profile',
          learningStyleJson: { prefersVisual: true },
          sensoryProfileJson: { noiseSensitivity: 'LOW' },
          origin: 'PARENT_REPORTED',
          createdByUserId: context.userId,
          profileVersion: 1,
        }),
      });

      // Verify change log was created
      expect(mockPrisma.profileChangeLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          profileId: 'new-profile-1',
          tenantId,
          learnerId,
          version: 1,
          changedByUserId: context.userId,
          changedByRole: context.userRole,
        }),
      });
    });

    it('should use default origin if not provided', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.learnerProfile.create.mockResolvedValue({
        id: 'profile-1',
        origin: 'PARENT_REPORTED',
        profileVersion: 1,
      });
      mockPrisma.profileChangeLog.create.mockResolvedValue({});

      await createProfile(tenantId, learnerId, { summary: 'Test' }, context);

      expect(mockPrisma.learnerProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          origin: 'PARENT_REPORTED',
        }),
      });
    });

    it('should use custom origin when provided', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.learnerProfile.create.mockResolvedValue({
        id: 'profile-1',
        origin: 'ASSESSMENT',
        profileVersion: 1,
      });
      mockPrisma.profileChangeLog.create.mockResolvedValue({});

      await createProfile(tenantId, learnerId, { summary: 'Test', origin: 'ASSESSMENT' }, context);

      expect(mockPrisma.learnerProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          origin: 'ASSESSMENT',
        }),
      });
    });

    it('should default empty JSON fields to empty objects', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.learnerProfile.create.mockResolvedValue({
        id: 'profile-1',
        profileVersion: 1,
      });
      mockPrisma.profileChangeLog.create.mockResolvedValue({});

      await createProfile(tenantId, learnerId, { summary: 'Minimal' }, context);

      expect(mockPrisma.learnerProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          learningStyleJson: {},
          sensoryProfileJson: {},
          communicationPreferencesJson: {},
          interactionConstraintsJson: {},
          uiAccessibilityJson: {},
        }),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // UPDATE PROFILE
  // ════════════════════════════════════════════════════════════════════════════

  describe('updateProfile', () => {
    it('should throw error for non-existent profile', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue(null);

      await expect(
        updateProfile(tenantId, learnerId, { summary: 'Updated' }, context)
      ).rejects.toThrow('Profile not found');
    });

    it('should return existing profile if no changes', async () => {
      const existingProfile = {
        id: 'profile-1',
        tenantId,
        learnerId,
        summary: 'Same summary',
        learningStyleJson: {},
        sensoryProfileJson: {},
        communicationPreferencesJson: {},
        interactionConstraintsJson: {},
        uiAccessibilityJson: {},
        origin: 'PARENT_REPORTED',
        profileVersion: 1,
      };

      mockPrisma.learnerProfile.findUnique.mockResolvedValue(existingProfile);

      const result = await updateProfile(tenantId, learnerId, { summary: 'Same summary' }, context);

      expect(result).toEqual(existingProfile);
      expect(mockPrisma.learnerProfile.update).not.toHaveBeenCalled();
      expect(mockPrisma.profileChangeLog.create).not.toHaveBeenCalled();
    });

    it('should update profile and increment version', async () => {
      const existingProfile = {
        id: 'profile-1',
        tenantId,
        learnerId,
        summary: 'Old summary',
        learningStyleJson: { prefersVisual: false },
        sensoryProfileJson: {},
        communicationPreferencesJson: {},
        interactionConstraintsJson: {},
        uiAccessibilityJson: {},
        origin: 'PARENT_REPORTED',
        profileVersion: 3,
      };

      const updatedProfile = {
        ...existingProfile,
        summary: 'New summary',
        learningStyleJson: { prefersVisual: false, prefersAudio: true },
        profileVersion: 4,
      };

      mockPrisma.learnerProfile.findUnique.mockResolvedValue(existingProfile);
      mockPrisma.learnerProfile.update.mockResolvedValue(updatedProfile);
      mockPrisma.profileChangeLog.create.mockResolvedValue({});

      const result = await updateProfile(
        tenantId,
        learnerId,
        {
          summary: 'New summary',
          learningStyleJson: { prefersAudio: true },
        },
        context
      );

      expect(result.profileVersion).toBe(4);
      expect(mockPrisma.learnerProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: expect.objectContaining({
          summary: 'New summary',
          profileVersion: 4,
          updatedByUserId: context.userId,
        }),
      });

      // Verify change log was created
      expect(mockPrisma.profileChangeLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          profileId: 'profile-1',
          version: 4,
          changedFields: expect.arrayContaining(['summary', 'learningStyleJson']),
        }),
      });
    });

    it('should merge JSON fields instead of replacing', async () => {
      const existingProfile = {
        id: 'profile-1',
        tenantId,
        learnerId,
        summary: 'Test',
        learningStyleJson: { prefersVisual: true, needsChunking: true },
        sensoryProfileJson: {},
        communicationPreferencesJson: {},
        interactionConstraintsJson: {},
        uiAccessibilityJson: {},
        origin: 'PARENT_REPORTED',
        profileVersion: 1,
      };

      mockPrisma.learnerProfile.findUnique.mockResolvedValue(existingProfile);
      mockPrisma.learnerProfile.update.mockResolvedValue({ profileVersion: 2 });
      mockPrisma.profileChangeLog.create.mockResolvedValue({});

      await updateProfile(
        tenantId,
        learnerId,
        {
          learningStyleJson: { prefersAudio: true },
        },
        context
      );

      // Should merge, not replace
      expect(mockPrisma.learnerProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: expect.objectContaining({
          learningStyleJson: {
            prefersVisual: true,
            needsChunking: true,
            prefersAudio: true,
          },
        }),
      });
    });

    it('should track changed fields in change log', async () => {
      const existingProfile = {
        id: 'profile-1',
        tenantId,
        learnerId,
        summary: 'Old summary',
        learningStyleJson: {},
        sensoryProfileJson: {},
        communicationPreferencesJson: {},
        interactionConstraintsJson: {},
        uiAccessibilityJson: {},
        origin: 'PARENT_REPORTED',
        profileVersion: 1,
      };

      mockPrisma.learnerProfile.findUnique.mockResolvedValue(existingProfile);
      mockPrisma.learnerProfile.update.mockResolvedValue({ profileVersion: 2 });
      mockPrisma.profileChangeLog.create.mockResolvedValue({});

      await updateProfile(
        tenantId,
        learnerId,
        {
          summary: 'New summary',
          sensoryProfileJson: { noiseSensitivity: 'HIGH' },
          origin: 'ASSESSMENT',
        },
        context
      );

      expect(mockPrisma.profileChangeLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          changedFields: expect.arrayContaining(['summary', 'sensoryProfileJson', 'origin']),
          previousValuesJson: expect.objectContaining({
            summary: 'Old summary',
            sensoryProfileJson: {},
            origin: 'PARENT_REPORTED',
          }),
        }),
      });
    });

    it('should handle origin change', async () => {
      const existingProfile = {
        id: 'profile-1',
        tenantId,
        learnerId,
        summary: 'Test',
        learningStyleJson: {},
        sensoryProfileJson: {},
        communicationPreferencesJson: {},
        interactionConstraintsJson: {},
        uiAccessibilityJson: {},
        origin: 'PARENT_REPORTED',
        profileVersion: 1,
      };

      mockPrisma.learnerProfile.findUnique.mockResolvedValue(existingProfile);
      mockPrisma.learnerProfile.update.mockResolvedValue({ profileVersion: 2, origin: 'IEP' });
      mockPrisma.profileChangeLog.create.mockResolvedValue({});

      await updateProfile(tenantId, learnerId, { origin: 'IEP' }, context);

      expect(mockPrisma.learnerProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: expect.objectContaining({
          origin: 'IEP',
        }),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET PROFILE FOR AI
  // ════════════════════════════════════════════════════════════════════════════

  describe('getProfileForAi', () => {
    it('should return null for non-existent profile', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue(null);

      const result = await getProfileForAi(tenantId, learnerId);

      expect(result).toBeNull();
    });

    it('should return compact profile without PII', async () => {
      const mockProfile = {
        id: 'profile-1',
        tenantId,
        learnerId,
        // PII fields that should NOT be included in AI profile
        summary: 'This learner is named John and has anxiety',
        learningStyleJson: {
          prefersVisual: true,
          prefersAudio: false,
          prefersText: true,
          prefersKinesthetic: false,
          needsChunking: true,
          benefitsFromRepetition: true,
        },
        sensoryProfileJson: {
          noiseSensitivity: 'HIGH',
          lightSensitivity: 'LOW',
          benefitsFromMovementBreaks: true,
          preferredBreakDurationMinutes: 5,
        },
        communicationPreferencesJson: {
          prefersShortPrompts: true,
          prefersSingleStepInstructions: true,
          visualSchedules: true,
          checkForUnderstandingFrequency: 'OFTEN',
          benefitsFromWaitTime: true,
          preferredResponseFormat: 'MULTIPLE_CHOICE',
        },
        interactionConstraintsJson: {
          limitQuestionsPerScreen: 3,
          avoidTimers: true,
          avoidRedText: false,
          avoidFlashingContent: true,
          avoidLoudSounds: true,
          requiresPredictableFlow: true,
        },
        uiAccessibilityJson: {
          font: 'OpenDyslexic',
          textSize: 'LARGE',
          reduceMotion: true,
          highContrast: false,
          useWarmColors: true,
          showReadAloudButton: true,
          autoReadAloud: false,
        },
        accommodations: [
          {
            category: 'TIME',
            description: 'Extended time on assessments',
            appliesToDomains: ['MATH', 'READING'],
            isCritical: true,
          },
        ],
      };

      mockPrisma.learnerProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await getProfileForAi(tenantId, learnerId);

      expect(result).not.toBeNull();

      // Verify structure matches expected AI-safe format
      expect(result?.learning_style).toEqual({
        prefers_visual: true,
        prefers_audio: false,
        prefers_text: true,
        prefers_kinesthetic: false,
        needs_chunking: true,
        benefits_from_repetition: true,
      });

      expect(result?.sensory).toEqual({
        noise_sensitivity: 'HIGH',
        light_sensitivity: 'LOW',
        movement_breaks: true,
        break_duration_minutes: 5,
      });

      expect(result?.communication).toEqual({
        short_prompts: true,
        single_step_instructions: true,
        visual_schedules: true,
        check_understanding_frequency: 'OFTEN',
        wait_time: true,
        response_format: 'MULTIPLE_CHOICE',
      });

      expect(result?.interaction_constraints).toEqual({
        questions_per_screen: 3,
        avoid_timers: true,
        avoid_red_text: false,
        avoid_flashing: true,
        avoid_loud_sounds: true,
        predictable_flow: true,
      });

      expect(result?.ui_accessibility).toEqual({
        font: 'OpenDyslexic',
        text_size: 'LARGE',
        reduce_motion: true,
        high_contrast: false,
        warm_colors: true,
        read_aloud_button: true,
        auto_read_aloud: false,
      });

      expect(result?.accommodations).toEqual([
        {
          category: 'TIME',
          description: 'Extended time on assessments',
          domains: ['MATH', 'READING'],
          is_critical: true,
        },
      ]);
    });

    it('should only include active accommodations', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue({
        learningStyleJson: {},
        sensoryProfileJson: {},
        communicationPreferencesJson: {},
        interactionConstraintsJson: {},
        uiAccessibilityJson: {},
        accommodations: [],
      });

      await getProfileForAi(tenantId, learnerId);

      // Verify the query filters for active accommodations
      expect(mockPrisma.learnerProfile.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_learnerId: { tenantId, learnerId },
        },
        include: {
          accommodations: {
            where: {
              isActive: true,
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: expect.any(Date) } }],
            },
          },
        },
      });
    });

    it('should handle missing/undefined JSON fields gracefully', async () => {
      const mockProfile = {
        id: 'profile-1',
        learningStyleJson: null,
        sensoryProfileJson: undefined,
        communicationPreferencesJson: {},
        interactionConstraintsJson: {},
        uiAccessibilityJson: {},
        accommodations: [],
      };

      mockPrisma.learnerProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await getProfileForAi(tenantId, learnerId);

      expect(result).not.toBeNull();
      // Should handle null/undefined gracefully
      expect(result?.learning_style.prefers_visual).toBeUndefined();
    });
  });
});
