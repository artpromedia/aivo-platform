import { describe, it, expect } from 'vitest';

import { getRecommendation, getAvailableActivities } from '../src/engine/regulationCatalog.js';
import type { GradeBand, SelfReportedMood, FocusLossReason } from '../src/types/telemetry.js';

describe('Regulation Catalog', () => {
  describe('getRecommendation', () => {
    it('should return a recommendation for K5 grade band', () => {
      const recommendation = getRecommendation({ gradeBand: 'K5' });

      expect(recommendation).toBeDefined();
      expect(recommendation.activityType).toBeDefined();
      expect(recommendation.title).toBeDefined();
      expect(recommendation.description).toBeDefined();
      expect(recommendation.estimatedDurationSeconds).toBeGreaterThan(0);
      expect(recommendation.source).toBe('static');
    });

    it('should return a recommendation for G6_8 grade band', () => {
      const recommendation = getRecommendation({ gradeBand: 'G6_8' });

      expect(recommendation).toBeDefined();
      expect(recommendation.activityType).toBeDefined();
    });

    it('should return a recommendation for G9_12 grade band', () => {
      const recommendation = getRecommendation({ gradeBand: 'G9_12' });

      expect(recommendation).toBeDefined();
      expect(recommendation.activityType).toBeDefined();
    });

    it('should consider mood when making recommendations', () => {
      // Run multiple times to account for randomness
      const moods: SelfReportedMood[] = ['frustrated', 'tired', 'confused'];

      for (const mood of moods) {
        const recommendation = getRecommendation({
          gradeBand: 'G6_8',
          mood,
        });

        expect(recommendation).toBeDefined();
        expect(recommendation.activityType).toBeDefined();
      }
    });

    it('should consider focus loss reasons when making recommendations', () => {
      const reasons: FocusLossReason[] = ['extended_idle', 'rapid_switching'];

      const recommendation = getRecommendation({
        gradeBand: 'K5',
        focusLossReasons: reasons,
      });

      expect(recommendation).toBeDefined();
      expect(recommendation.activityType).toBeDefined();
    });

    it('should include instructions in recommendations', () => {
      const recommendation = getRecommendation({ gradeBand: 'K5' });

      expect(recommendation.instructions).toBeDefined();
      expect(Array.isArray(recommendation.instructions)).toBe(true);
      expect(recommendation.instructions!.length).toBeGreaterThan(0);
    });
  });

  describe('getAvailableActivities', () => {
    it('should return multiple activities for K5', () => {
      const activities = getAvailableActivities('K5');

      expect(activities.length).toBeGreaterThan(3);
      expect(activities.every((a) => a.source === 'static')).toBe(true);
    });

    it('should return multiple activities for G6_8', () => {
      const activities = getAvailableActivities('G6_8');

      expect(activities.length).toBeGreaterThan(3);
    });

    it('should return multiple activities for G9_12', () => {
      const activities = getAvailableActivities('G9_12');

      expect(activities.length).toBeGreaterThan(3);
    });

    it('should include various activity types', () => {
      const activities = getAvailableActivities('G6_8');
      const types = new Set(activities.map((a) => a.activityType));

      // Should have at least 3 different activity types
      expect(types.size).toBeGreaterThanOrEqual(3);
    });

    it('should have valid duration for all activities', () => {
      const gradeBands: GradeBand[] = ['K5', 'G6_8', 'G9_12'];

      for (const gradeBand of gradeBands) {
        const activities = getAvailableActivities(gradeBand);

        for (const activity of activities) {
          expect(activity.estimatedDurationSeconds).toBeGreaterThan(0);
          expect(activity.estimatedDurationSeconds).toBeLessThanOrEqual(120); // Max 2 minutes
        }
      }
    });
  });
});
