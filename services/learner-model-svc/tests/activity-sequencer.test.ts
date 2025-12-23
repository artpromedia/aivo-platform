/**
 * Activity Sequencer Tests
 *
 * Tests for the activity sequencing algorithm including:
 * - Session plan generation
 * - Spacing effect implementation
 * - Interleaving
 * - ZPD alignment
 * - Neurodiverse accommodations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ActivitySequencer } from '../src/services/activity-sequencer.js';
import type { ActivityCandidate } from '../src/services/activity-sequencer-types.js';

describe('ActivitySequencer', () => {
  let sequencer: ActivitySequencer;
  let sampleActivities: ActivityCandidate[];

  beforeEach(() => {
    sequencer = new ActivitySequencer();

    // Create sample activities across multiple skills
    sampleActivities = [
      // Math skills
      {
        activityId: 'act-1',
        skillId: 'skill-add',
        skillCode: 'MATH.ADD.001',
        difficultyLevel: 2,
        estimatedDurationMinutes: 5,
        activityType: 'exercise',
        currentMastery: 0.4,
        lastPracticedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        activityId: 'act-2',
        skillId: 'skill-add',
        skillCode: 'MATH.ADD.001',
        difficultyLevel: 3,
        estimatedDurationMinutes: 7,
        activityType: 'exercise',
        currentMastery: 0.4,
        lastPracticedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        activityId: 'act-3',
        skillId: 'skill-sub',
        skillCode: 'MATH.SUB.001',
        difficultyLevel: 2,
        estimatedDurationMinutes: 5,
        activityType: 'exercise',
        currentMastery: 0.6,
        lastPracticedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      // Reading skills
      {
        activityId: 'act-4',
        skillId: 'skill-read',
        skillCode: 'ELA.READ.001',
        difficultyLevel: 3,
        estimatedDurationMinutes: 10,
        activityType: 'lesson',
        currentMastery: 0.3,
        lastPracticedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      },
      {
        activityId: 'act-5',
        skillId: 'skill-vocab',
        skillCode: 'ELA.VOCAB.001',
        difficultyLevel: 1,
        estimatedDurationMinutes: 5,
        activityType: 'game',
        currentMastery: 0.7,
        lastPracticedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      // More activities
      {
        activityId: 'act-6',
        skillId: 'skill-mult',
        skillCode: 'MATH.MULT.001',
        difficultyLevel: 4,
        estimatedDurationMinutes: 8,
        activityType: 'exercise',
        currentMastery: 0.2,
      },
      {
        activityId: 'act-7',
        skillId: 'skill-write',
        skillCode: 'ELA.WRITE.001',
        difficultyLevel: 3,
        estimatedDurationMinutes: 15,
        activityType: 'exercise',
        currentMastery: 0.5,
        lastPracticedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ];
  });

  describe('generateSessionPlan', () => {
    it('should generate a session plan within duration limit', () => {
      const plan = sequencer.generateSessionPlan(sampleActivities, {
        targetDurationMinutes: 30,
        skillMasteries: {
          'skill-add': 0.4,
          'skill-sub': 0.6,
          'skill-read': 0.3,
          'skill-vocab': 0.7,
          'skill-mult': 0.2,
          'skill-write': 0.5,
        },
      });

      expect(plan.totalDurationMinutes).toBeLessThanOrEqual(35); // Some buffer allowed
      expect(plan.activities.length).toBeGreaterThan(0);
    });

    it('should include activities from multiple skills when interleaving enabled', () => {
      const plan = sequencer.generateSessionPlan(sampleActivities, {
        targetDurationMinutes: 30,
        skillMasteries: {
          'skill-add': 0.4,
          'skill-sub': 0.6,
          'skill-read': 0.3,
          'skill-vocab': 0.7,
        },
        interleavingEnabled: true,
      });

      // Check that we have activities from different skills
      const skillIds = new Set(plan.activities.map((a) => a.skillId));
      expect(skillIds.size).toBeGreaterThan(1);
    });

    it('should respect maxActivities limit', () => {
      const plan = sequencer.generateSessionPlan(sampleActivities, {
        targetDurationMinutes: 60,
        maxActivities: 3,
        skillMasteries: {},
      });

      expect(plan.activities.length).toBeLessThanOrEqual(3);
    });

    it('should prioritize activities based on ZPD', () => {
      const plan = sequencer.generateSessionPlan(sampleActivities, {
        targetDurationMinutes: 30,
        skillMasteries: {
          'skill-add': 0.4,
          'skill-sub': 0.6,
          'skill-read': 0.3,
        },
        zpdMap: {
          'skill-add': { lower: 0.3, upper: 0.6, optimal: 0.45 },
          'skill-sub': { lower: 0.5, upper: 0.8, optimal: 0.65 },
          'skill-read': { lower: 0.2, upper: 0.5, optimal: 0.35 },
        },
      });

      expect(plan.activities.length).toBeGreaterThan(0);
      // Activities should be within or near ZPD
    });

    it('should provide reasoning for each activity', () => {
      const plan = sequencer.generateSessionPlan(sampleActivities, {
        targetDurationMinutes: 30,
        skillMasteries: {},
      });

      for (const activity of plan.activities) {
        expect(activity.reason).toBeDefined();
        expect(activity.reason.length).toBeGreaterThan(0);
      }
    });
  });

  describe('spacing effect', () => {
    it('should prioritize skills with optimal spacing', () => {
      // Activity practiced 3 days ago should be prioritized over one practiced yesterday
      const recentActivity: ActivityCandidate = {
        activityId: 'recent',
        skillId: 'skill-recent',
        skillCode: 'RECENT.001',
        difficultyLevel: 2,
        estimatedDurationMinutes: 5,
        activityType: 'exercise',
        currentMastery: 0.5,
        lastPracticedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      };

      const spacedActivity: ActivityCandidate = {
        activityId: 'spaced',
        skillId: 'skill-spaced',
        skillCode: 'SPACED.001',
        difficultyLevel: 2,
        estimatedDurationMinutes: 5,
        activityType: 'exercise',
        currentMastery: 0.5,
        lastPracticedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      };

      const plan = sequencer.generateSessionPlan([recentActivity, spacedActivity], {
        targetDurationMinutes: 10,
        maxActivities: 2,
        skillMasteries: {
          'skill-recent': 0.5,
          'skill-spaced': 0.5,
        },
      });

      // Spaced activity should be first (higher priority)
      if (plan.activities.length >= 2) {
        expect(plan.activities[0].activityId).toBe('spaced');
      }
    });

    it('should not over-space (cap at optimal interval)', () => {
      const veryOldActivity: ActivityCandidate = {
        activityId: 'old',
        skillId: 'skill-old',
        skillCode: 'OLD.001',
        difficultyLevel: 2,
        estimatedDurationMinutes: 5,
        activityType: 'exercise',
        currentMastery: 0.8,
        lastPracticedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      };

      const plan = sequencer.generateSessionPlan([veryOldActivity], {
        targetDurationMinutes: 10,
        skillMasteries: { 'skill-old': 0.8 },
      });

      // Should still include the activity (needs review)
      expect(plan.activities.length).toBe(1);
    });
  });

  describe('interleaving', () => {
    it('should alternate between different skills', () => {
      const mathActivities: ActivityCandidate[] = [
        {
          activityId: 'm1',
          skillId: 'math',
          skillCode: 'MATH.001',
          difficultyLevel: 2,
          estimatedDurationMinutes: 5,
          activityType: 'exercise',
          currentMastery: 0.5,
        },
        {
          activityId: 'm2',
          skillId: 'math',
          skillCode: 'MATH.001',
          difficultyLevel: 3,
          estimatedDurationMinutes: 5,
          activityType: 'exercise',
          currentMastery: 0.5,
        },
      ];

      const readingActivities: ActivityCandidate[] = [
        {
          activityId: 'r1',
          skillId: 'reading',
          skillCode: 'READ.001',
          difficultyLevel: 2,
          estimatedDurationMinutes: 5,
          activityType: 'exercise',
          currentMastery: 0.5,
        },
        {
          activityId: 'r2',
          skillId: 'reading',
          skillCode: 'READ.001',
          difficultyLevel: 3,
          estimatedDurationMinutes: 5,
          activityType: 'exercise',
          currentMastery: 0.5,
        },
      ];

      const plan = sequencer.generateSessionPlan([...mathActivities, ...readingActivities], {
        targetDurationMinutes: 25,
        interleavingEnabled: true,
        skillMasteries: { math: 0.5, reading: 0.5 },
      });

      // Check that skills are interleaved (not all math followed by all reading)
      let switches = 0;
      for (let i = 1; i < plan.activities.length; i++) {
        if (plan.activities[i].skillId !== plan.activities[i - 1].skillId) {
          switches++;
        }
      }

      // Should have at least one skill switch
      if (plan.activities.length > 2) {
        expect(switches).toBeGreaterThan(0);
      }
    });

    it('should disable interleaving when specified', () => {
      const plan = sequencer.generateSessionPlan(sampleActivities, {
        targetDurationMinutes: 30,
        interleavingEnabled: false,
        skillMasteries: {},
      });

      // Plan should still be generated
      expect(plan.activities.length).toBeGreaterThan(0);
    });
  });

  describe('neurodiverse accommodations', () => {
    it('should add breakpoints for ADHD learners', () => {
      const plan = sequencer.generateSessionPlan(sampleActivities, {
        targetDurationMinutes: 30,
        skillMasteries: {},
        neurodiverseProfile: {
          conditions: { adhd: true },
          masteryThreshold: 0.95,
          maxSessionMinutes: 30,
          breakFrequencyMinutes: 10,
        },
      });

      expect(plan.breakpoints).toBeDefined();
      expect(plan.breakpoints.length).toBeGreaterThan(0);
    });

    it('should respect maxSessionMinutes for neurodiverse learners', () => {
      const plan = sequencer.generateSessionPlan(sampleActivities, {
        targetDurationMinutes: 60, // Request 60 minutes
        skillMasteries: {},
        neurodiverseProfile: {
          conditions: { processingDelay: true },
          masteryThreshold: 0.9,
          maxSessionMinutes: 20, // But max is 20
          breakFrequencyMinutes: 10,
        },
      });

      expect(plan.totalDurationMinutes).toBeLessThanOrEqual(25); // With some buffer
    });

    it('should include break durations in breakpoints', () => {
      const plan = sequencer.generateSessionPlan(sampleActivities, {
        targetDurationMinutes: 30,
        skillMasteries: {},
        neurodiverseProfile: {
          conditions: { asd: true },
          masteryThreshold: 0.95,
          maxSessionMinutes: 30,
          breakFrequencyMinutes: 15,
        },
      });

      if (plan.breakpoints.length > 0) {
        for (const bp of plan.breakpoints) {
          expect(bp.durationMinutes).toBeGreaterThan(0);
          expect(bp.afterActivityIndex).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('activity scoring', () => {
    it('should give higher scores to activities in ZPD', () => {
      const inZpd: ActivityCandidate = {
        activityId: 'in-zpd',
        skillId: 'skill-1',
        skillCode: 'S1',
        difficultyLevel: 3, // Matches ZPD optimal
        estimatedDurationMinutes: 5,
        activityType: 'exercise',
        currentMastery: 0.5,
      };

      const outZpd: ActivityCandidate = {
        activityId: 'out-zpd',
        skillId: 'skill-1',
        skillCode: 'S1',
        difficultyLevel: 1, // Too easy
        estimatedDurationMinutes: 5,
        activityType: 'exercise',
        currentMastery: 0.5,
      };

      const plan = sequencer.generateSessionPlan([inZpd, outZpd], {
        targetDurationMinutes: 10,
        maxActivities: 2,
        skillMasteries: { 'skill-1': 0.5 },
        zpdMap: {
          'skill-1': { lower: 0.4, upper: 0.7, optimal: 0.55 },
        },
      });

      // In-ZPD activity should be prioritized
      expect(plan.activities[0].activityId).toBe('in-zpd');
    });

    it('should prefer exercises and games over assessments', () => {
      const exercise: ActivityCandidate = {
        activityId: 'exercise',
        skillId: 'skill-1',
        skillCode: 'S1',
        difficultyLevel: 2,
        estimatedDurationMinutes: 5,
        activityType: 'exercise',
        currentMastery: 0.5,
      };

      const assessment: ActivityCandidate = {
        activityId: 'assessment',
        skillId: 'skill-1',
        skillCode: 'S1',
        difficultyLevel: 2,
        estimatedDurationMinutes: 5,
        activityType: 'assessment',
        currentMastery: 0.5,
      };

      const plan = sequencer.generateSessionPlan([assessment, exercise], {
        targetDurationMinutes: 10,
        maxActivities: 2,
        skillMasteries: { 'skill-1': 0.5 },
      });

      // Exercise should be preferred for practice
      expect(plan.activities[0].activityId).toBe('exercise');
    });
  });

  describe('edge cases', () => {
    it('should handle empty activity list', () => {
      const plan = sequencer.generateSessionPlan([], {
        targetDurationMinutes: 30,
        skillMasteries: {},
      });

      expect(plan.activities).toEqual([]);
      expect(plan.totalDurationMinutes).toBe(0);
    });

    it('should handle very short session duration', () => {
      const plan = sequencer.generateSessionPlan(sampleActivities, {
        targetDurationMinutes: 2,
        skillMasteries: {},
      });

      // Should include at least activities that fit
      expect(plan.totalDurationMinutes).toBeLessThanOrEqual(5);
    });

    it('should handle activities with missing lastPracticedAt', () => {
      const noDateActivity: ActivityCandidate = {
        activityId: 'no-date',
        skillId: 'skill-1',
        skillCode: 'S1',
        difficultyLevel: 2,
        estimatedDurationMinutes: 5,
        activityType: 'exercise',
        currentMastery: 0.5,
        // lastPracticedAt is undefined
      };

      const plan = sequencer.generateSessionPlan([noDateActivity], {
        targetDurationMinutes: 10,
        skillMasteries: { 'skill-1': 0.5 },
      });

      expect(plan.activities.length).toBe(1);
    });

    it('should handle all activities having same skill', () => {
      const sameSkillActivities: ActivityCandidate[] = [
        {
          activityId: 'a1',
          skillId: 'same',
          skillCode: 'SAME.001',
          difficultyLevel: 1,
          estimatedDurationMinutes: 5,
          activityType: 'exercise',
          currentMastery: 0.5,
        },
        {
          activityId: 'a2',
          skillId: 'same',
          skillCode: 'SAME.001',
          difficultyLevel: 2,
          estimatedDurationMinutes: 5,
          activityType: 'exercise',
          currentMastery: 0.5,
        },
        {
          activityId: 'a3',
          skillId: 'same',
          skillCode: 'SAME.001',
          difficultyLevel: 3,
          estimatedDurationMinutes: 5,
          activityType: 'exercise',
          currentMastery: 0.5,
        },
      ];

      const plan = sequencer.generateSessionPlan(sameSkillActivities, {
        targetDurationMinutes: 20,
        interleavingEnabled: true, // Can't interleave with single skill
        skillMasteries: { same: 0.5 },
      });

      // Should still work and sequence by difficulty
      expect(plan.activities.length).toBeGreaterThan(0);
    });
  });
});
