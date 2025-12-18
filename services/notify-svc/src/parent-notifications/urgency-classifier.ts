/**
 * ND-3.1: Urgency Classifier
 *
 * Classifies notification urgency based on category, event type, and data.
 */

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import {
  ParentNotificationCategory,
  ParentNotificationUrgency,
} from './parent-notification.types.js';

interface ClassificationData {
  state?: string;
  intensity?: number;
  severity?: string;
  urgency?: string;
  forcedUrgency?: ParentNotificationUrgency;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class UrgencyClassifier {
  /**
   * Classify the urgency level for a notification
   */
  classify(
    category: ParentNotificationCategory,
    event: string,
    data: ClassificationData
  ): ParentNotificationUrgency {
    // Check for forced urgency (e.g., safety concerns)
    if (data.forcedUrgency) {
      return data.forcedUrgency;
    }

    switch (category) {
      case ParentNotificationCategory.EMOTIONAL_STATE:
        return this.classifyEmotionalState(event, data);

      case ParentNotificationCategory.SAFETY_CONCERN:
        return this.classifySafetyConcern(data);

      case ParentNotificationCategory.ACHIEVEMENT:
        return this.classifyAchievement(event, data);

      case ParentNotificationCategory.SESSION_ACTIVITY:
        return this.classifySessionActivity(event, data);

      case ParentNotificationCategory.GOAL_UPDATE:
        return ParentNotificationUrgency.LOW;

      case ParentNotificationCategory.LEARNING_PROGRESS:
        return ParentNotificationUrgency.LOW;

      case ParentNotificationCategory.CARE_TEAM:
        return ParentNotificationUrgency.MEDIUM;

      case ParentNotificationCategory.SYSTEM:
        return ParentNotificationUrgency.INFO;

      case ParentNotificationCategory.REMINDER:
        return ParentNotificationUrgency.LOW;

      default:
        return ParentNotificationUrgency.LOW;
    }
  }

  /**
   * Classify emotional state alerts
   */
  private classifyEmotionalState(
    event: string,
    data: ClassificationData
  ): ParentNotificationUrgency {
    const state = data.state?.toLowerCase() ?? '';
    const intensity = data.intensity ?? 5;

    // Critical states
    const criticalStates = ['meltdown', 'meltdown_risk', 'shutdown', 'shutdown_risk', 'crisis'];
    if (criticalStates.includes(state)) {
      return ParentNotificationUrgency.CRITICAL;
    }

    // High intensity anxiety or overwhelm
    if ((state === 'anxious' || state === 'overwhelmed') && intensity >= 8) {
      return ParentNotificationUrgency.CRITICAL;
    }

    // High urgency states
    const highStates = ['highly_anxious', 'highly_frustrated', 'severe_stress'];
    if (highStates.includes(state) || intensity >= 7) {
      return ParentNotificationUrgency.HIGH;
    }

    // Medium urgency states
    const mediumStates = ['anxious', 'overwhelmed', 'frustrated', 'stressed', 'distressed'];
    if (mediumStates.includes(state) || intensity >= 5) {
      return ParentNotificationUrgency.MEDIUM;
    }

    // Positive states are low urgency
    const positiveStates = ['calm', 'focused', 'engaged', 'happy', 'curious'];
    if (positiveStates.includes(state)) {
      return ParentNotificationUrgency.LOW;
    }

    // Check if data has urgency hint from emotional state service
    if (data.urgency === 'immediate') {
      return ParentNotificationUrgency.CRITICAL;
    }
    if (data.urgency === 'high') {
      return ParentNotificationUrgency.HIGH;
    }

    return ParentNotificationUrgency.MEDIUM;
  }

  /**
   * Classify safety concerns
   */
  private classifySafetyConcern(data: ClassificationData): ParentNotificationUrgency {
    const severity = data.severity?.toLowerCase() ?? 'medium';

    switch (severity) {
      case 'critical':
        return ParentNotificationUrgency.CRITICAL;
      case 'high':
        return ParentNotificationUrgency.CRITICAL; // Safety is always critical or high
      case 'medium':
        return ParentNotificationUrgency.HIGH;
      case 'low':
        return ParentNotificationUrgency.HIGH;
      default:
        return ParentNotificationUrgency.CRITICAL; // Default to critical for safety
    }
  }

  /**
   * Classify achievement events
   */
  private classifyAchievement(event: string, data: ClassificationData): ParentNotificationUrgency {
    switch (event) {
      case 'level_up':
        return ParentNotificationUrgency.MEDIUM;

      case 'badge_earned':
        // Check if it's a significant badge
        if (data.badgeName?.toLowerCase().includes('mastery')) {
          return ParentNotificationUrgency.MEDIUM;
        }
        return ParentNotificationUrgency.LOW;

      case 'streak_milestone': {
        // Longer streaks are more notable
        const streakDays = (data.streakDays as number | undefined) ?? 0;
        if (streakDays >= 30) return ParentNotificationUrgency.MEDIUM;
        if (streakDays >= 7) return ParentNotificationUrgency.LOW;
        return ParentNotificationUrgency.INFO;
      }

      case 'goal_completed':
        return ParentNotificationUrgency.MEDIUM;

      default:
        return ParentNotificationUrgency.LOW;
    }
  }

  /**
   * Classify session activity events
   */
  private classifySessionActivity(
    event: string,
    data: ClassificationData
  ): ParentNotificationUrgency {
    switch (event) {
      case 'session_start':
        return ParentNotificationUrgency.INFO;

      case 'session_complete': {
        // Longer sessions are more notable
        const duration = (data.durationMinutes as number | undefined) ?? 0;
        if (duration >= 60) return ParentNotificationUrgency.MEDIUM;
        return ParentNotificationUrgency.LOW;
      }

      case 'session_interrupted':
        return ParentNotificationUrgency.MEDIUM;

      default:
        return ParentNotificationUrgency.LOW;
    }
  }

  /**
   * Get display name for urgency level
   */
  getUrgencyDisplayName(urgency: ParentNotificationUrgency): string {
    const names: Record<ParentNotificationUrgency, string> = {
      [ParentNotificationUrgency.CRITICAL]: 'Critical',
      [ParentNotificationUrgency.HIGH]: 'High',
      [ParentNotificationUrgency.MEDIUM]: 'Medium',
      [ParentNotificationUrgency.LOW]: 'Low',
      [ParentNotificationUrgency.INFO]: 'Info',
    };
    return names[urgency] ?? 'Unknown';
  }

  /**
   * Get color for urgency level (for UI)
   */
  getUrgencyColor(urgency: ParentNotificationUrgency): string {
    const colors: Record<ParentNotificationUrgency, string> = {
      [ParentNotificationUrgency.CRITICAL]: '#E53935', // Red
      [ParentNotificationUrgency.HIGH]: '#FF9800', // Orange
      [ParentNotificationUrgency.MEDIUM]: '#FFC107', // Yellow
      [ParentNotificationUrgency.LOW]: '#4CAF50', // Green
      [ParentNotificationUrgency.INFO]: '#2196F3', // Blue
    };
    return colors[urgency] ?? '#9E9E9E';
  }
}
