/**
 * ND-3.1: Parent Notification Tests
 *
 * Unit tests for parent notification system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ParentNotificationCategory,
  ParentNotificationUrgency,
  getUrgencyLevel,
  meetsUrgencyThreshold,
  isPositiveState,
  formatEmotionalState,
  DEFAULT_URGENCY_SETTINGS,
  DEFAULT_CATEGORY_SETTINGS,
} from '../parent-notifications/parent-notification.types.js';
import { UrgencyClassifier } from '../parent-notifications/urgency-classifier.js';

describe('Parent Notification Types', () => {
  describe('getUrgencyLevel', () => {
    it('should return correct numeric level for each urgency', () => {
      expect(getUrgencyLevel(ParentNotificationUrgency.CRITICAL)).toBe(0);
      expect(getUrgencyLevel(ParentNotificationUrgency.HIGH)).toBe(1);
      expect(getUrgencyLevel(ParentNotificationUrgency.MEDIUM)).toBe(2);
      expect(getUrgencyLevel(ParentNotificationUrgency.LOW)).toBe(3);
      expect(getUrgencyLevel(ParentNotificationUrgency.INFO)).toBe(4);
    });
  });

  describe('meetsUrgencyThreshold', () => {
    it('should return true when actual urgency meets threshold', () => {
      expect(
        meetsUrgencyThreshold(ParentNotificationUrgency.CRITICAL, ParentNotificationUrgency.HIGH)
      ).toBe(true);
      expect(
        meetsUrgencyThreshold(ParentNotificationUrgency.HIGH, ParentNotificationUrgency.HIGH)
      ).toBe(true);
    });

    it('should return false when actual urgency is below threshold', () => {
      expect(
        meetsUrgencyThreshold(ParentNotificationUrgency.LOW, ParentNotificationUrgency.HIGH)
      ).toBe(false);
      expect(
        meetsUrgencyThreshold(ParentNotificationUrgency.INFO, ParentNotificationUrgency.MEDIUM)
      ).toBe(false);
    });
  });

  describe('isPositiveState', () => {
    it('should return true for positive emotional states', () => {
      expect(isPositiveState('calm')).toBe(true);
      expect(isPositiveState('focused')).toBe(true);
      expect(isPositiveState('engaged')).toBe(true);
      expect(isPositiveState('happy')).toBe(true);
      expect(isPositiveState('curious')).toBe(true);
    });

    it('should return false for negative emotional states', () => {
      expect(isPositiveState('anxious')).toBe(false);
      expect(isPositiveState('overwhelmed')).toBe(false);
      expect(isPositiveState('frustrated')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isPositiveState('CALM')).toBe(true);
      expect(isPositiveState('Focused')).toBe(true);
    });
  });

  describe('formatEmotionalState', () => {
    it('should format emotional states with underscores', () => {
      expect(formatEmotionalState('meltdown_risk')).toBe('Meltdown Risk');
      expect(formatEmotionalState('highly_anxious')).toBe('Highly Anxious');
    });

    it('should capitalize single words', () => {
      expect(formatEmotionalState('calm')).toBe('Calm');
      expect(formatEmotionalState('anxious')).toBe('Anxious');
    });
  });

  describe('Default Settings', () => {
    it('should have settings for all urgency levels', () => {
      expect(DEFAULT_URGENCY_SETTINGS).toHaveProperty(ParentNotificationUrgency.CRITICAL);
      expect(DEFAULT_URGENCY_SETTINGS).toHaveProperty(ParentNotificationUrgency.HIGH);
      expect(DEFAULT_URGENCY_SETTINGS).toHaveProperty(ParentNotificationUrgency.MEDIUM);
      expect(DEFAULT_URGENCY_SETTINGS).toHaveProperty(ParentNotificationUrgency.LOW);
      expect(DEFAULT_URGENCY_SETTINGS).toHaveProperty(ParentNotificationUrgency.INFO);
    });

    it('should enable all channels for critical urgency', () => {
      const critical = DEFAULT_URGENCY_SETTINGS[ParentNotificationUrgency.CRITICAL];
      expect(critical.push).toBe(true);
      expect(critical.email).toBe(true);
      expect(critical.sms).toBe(true);
      expect(critical.inApp).toBe(true);
    });

    it('should have settings for all categories', () => {
      expect(DEFAULT_CATEGORY_SETTINGS).toHaveProperty(ParentNotificationCategory.EMOTIONAL_STATE);
      expect(DEFAULT_CATEGORY_SETTINGS).toHaveProperty(ParentNotificationCategory.ACHIEVEMENT);
      expect(DEFAULT_CATEGORY_SETTINGS).toHaveProperty(ParentNotificationCategory.SAFETY_CONCERN);
    });
  });
});

describe('UrgencyClassifier', () => {
  let classifier: UrgencyClassifier;

  beforeEach(() => {
    classifier = new UrgencyClassifier();
  });

  describe('classify', () => {
    it('should respect forced urgency', () => {
      const result = classifier.classify(ParentNotificationCategory.ACHIEVEMENT, 'badge_earned', {
        forcedUrgency: ParentNotificationUrgency.CRITICAL,
      });
      expect(result).toBe(ParentNotificationUrgency.CRITICAL);
    });

    describe('Emotional State', () => {
      it('should classify meltdown as critical', () => {
        const result = classifier.classify(
          ParentNotificationCategory.EMOTIONAL_STATE,
          'state_change',
          { state: 'meltdown' }
        );
        expect(result).toBe(ParentNotificationUrgency.CRITICAL);
      });

      it('should classify high intensity anxiety as critical', () => {
        const result = classifier.classify(
          ParentNotificationCategory.EMOTIONAL_STATE,
          'state_change',
          { state: 'anxious', intensity: 9 }
        );
        expect(result).toBe(ParentNotificationUrgency.CRITICAL);
      });

      it('should classify high intensity states as high urgency', () => {
        const result = classifier.classify(
          ParentNotificationCategory.EMOTIONAL_STATE,
          'state_change',
          { state: 'highly_anxious', intensity: 7 }
        );
        expect(result).toBe(ParentNotificationUrgency.HIGH);
      });

      it('should classify positive states as low urgency', () => {
        const result = classifier.classify(
          ParentNotificationCategory.EMOTIONAL_STATE,
          'state_change',
          { state: 'calm', intensity: 3 }
        );
        expect(result).toBe(ParentNotificationUrgency.LOW);
      });
    });

    describe('Safety Concern', () => {
      it('should classify critical severity as critical', () => {
        const result = classifier.classify(
          ParentNotificationCategory.SAFETY_CONCERN,
          'content_flag',
          { severity: 'critical' }
        );
        expect(result).toBe(ParentNotificationUrgency.CRITICAL);
      });

      it('should classify high severity as critical', () => {
        const result = classifier.classify(
          ParentNotificationCategory.SAFETY_CONCERN,
          'content_flag',
          { severity: 'high' }
        );
        expect(result).toBe(ParentNotificationUrgency.CRITICAL);
      });

      it('should default to critical for unknown severity', () => {
        const result = classifier.classify(
          ParentNotificationCategory.SAFETY_CONCERN,
          'content_flag',
          {}
        );
        expect(result).toBe(ParentNotificationUrgency.CRITICAL);
      });
    });

    describe('Achievement', () => {
      it('should classify level up as medium', () => {
        const result = classifier.classify(ParentNotificationCategory.ACHIEVEMENT, 'level_up', {});
        expect(result).toBe(ParentNotificationUrgency.MEDIUM);
      });

      it('should classify regular badge as low', () => {
        const result = classifier.classify(ParentNotificationCategory.ACHIEVEMENT, 'badge_earned', {
          badgeName: 'First Steps',
        });
        expect(result).toBe(ParentNotificationUrgency.LOW);
      });

      it('should classify mastery badge as medium', () => {
        const result = classifier.classify(ParentNotificationCategory.ACHIEVEMENT, 'badge_earned', {
          badgeName: 'Math Mastery',
        });
        expect(result).toBe(ParentNotificationUrgency.MEDIUM);
      });

      it('should classify long streaks as medium', () => {
        const result = classifier.classify(
          ParentNotificationCategory.ACHIEVEMENT,
          'streak_milestone',
          { streakDays: 30 }
        );
        expect(result).toBe(ParentNotificationUrgency.MEDIUM);
      });
    });

    describe('Session Activity', () => {
      it('should classify session start as info', () => {
        const result = classifier.classify(
          ParentNotificationCategory.SESSION_ACTIVITY,
          'session_start',
          {}
        );
        expect(result).toBe(ParentNotificationUrgency.INFO);
      });

      it('should classify long session complete as medium', () => {
        const result = classifier.classify(
          ParentNotificationCategory.SESSION_ACTIVITY,
          'session_complete',
          { durationMinutes: 90 }
        );
        expect(result).toBe(ParentNotificationUrgency.MEDIUM);
      });

      it('should classify short session complete as low', () => {
        const result = classifier.classify(
          ParentNotificationCategory.SESSION_ACTIVITY,
          'session_complete',
          { durationMinutes: 15 }
        );
        expect(result).toBe(ParentNotificationUrgency.LOW);
      });
    });

    describe('Other Categories', () => {
      it('should classify goal updates as low', () => {
        const result = classifier.classify(
          ParentNotificationCategory.GOAL_UPDATE,
          'goal_progress',
          {}
        );
        expect(result).toBe(ParentNotificationUrgency.LOW);
      });

      it('should classify care team as medium', () => {
        const result = classifier.classify(
          ParentNotificationCategory.CARE_TEAM,
          'message_received',
          {}
        );
        expect(result).toBe(ParentNotificationUrgency.MEDIUM);
      });

      it('should classify system as info', () => {
        const result = classifier.classify(ParentNotificationCategory.SYSTEM, 'account_update', {});
        expect(result).toBe(ParentNotificationUrgency.INFO);
      });
    });
  });

  describe('getUrgencyDisplayName', () => {
    it('should return correct display names', () => {
      expect(classifier.getUrgencyDisplayName(ParentNotificationUrgency.CRITICAL)).toBe('Critical');
      expect(classifier.getUrgencyDisplayName(ParentNotificationUrgency.HIGH)).toBe('High');
      expect(classifier.getUrgencyDisplayName(ParentNotificationUrgency.MEDIUM)).toBe('Medium');
      expect(classifier.getUrgencyDisplayName(ParentNotificationUrgency.LOW)).toBe('Low');
      expect(classifier.getUrgencyDisplayName(ParentNotificationUrgency.INFO)).toBe('Info');
    });
  });

  describe('getUrgencyColor', () => {
    it('should return correct colors', () => {
      expect(classifier.getUrgencyColor(ParentNotificationUrgency.CRITICAL)).toBe('#E53935');
      expect(classifier.getUrgencyColor(ParentNotificationUrgency.HIGH)).toBe('#FF9800');
      expect(classifier.getUrgencyColor(ParentNotificationUrgency.MEDIUM)).toBe('#FFC107');
      expect(classifier.getUrgencyColor(ParentNotificationUrgency.LOW)).toBe('#4CAF50');
      expect(classifier.getUrgencyColor(ParentNotificationUrgency.INFO)).toBe('#2196F3');
    });
  });
});
