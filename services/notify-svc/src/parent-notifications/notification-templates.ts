/**
 * ND-3.1: Notification Templates
 *
 * Templates for different notification categories.
 */

/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  ParentNotificationCategory,
  type ParentNotificationUrgency,
  type NotificationContent,
  type NotificationRichContent,
  formatEmotionalState,
} from './parent-notification.types.js';

interface TemplateData {
  learnerName: string;
  learnerId: string;
  parentId: string;
  [key: string]: unknown;
}

interface TemplateResult {
  title: string;
  body: string;
  richContent?: NotificationRichContent;
  deepLink?: string;
}

/**
 * Template definitions for each category
 */
const templates: Record<
  ParentNotificationCategory,
  Record<string, (data: TemplateData) => TemplateResult>
> = {
  [ParentNotificationCategory.EMOTIONAL_STATE]: {
    state_change: (data) => {
      const state = formatEmotionalState(data.state as string);
      const intensity = (data.intensity as number) ?? 5;
      const isNegative = [
        'anxious',
        'overwhelmed',
        'frustrated',
        'stressed',
        'meltdown',
        'shutdown',
      ].includes((data.state as string)?.toLowerCase() ?? '');

      return {
        title: isNegative
          ? `${data.learnerName} may need support`
          : `${data.learnerName} is doing well`,
        body: isNegative
          ? `${data.learnerName} is currently feeling ${state.toLowerCase()}. The system is providing calming activities.`
          : `${data.learnerName} is feeling ${state.toLowerCase()} during their learning session.`,
        richContent: {
          emotionalState: {
            current: data.state as string,
            previous: data.previousState as string | undefined,
            intensity,
            trend: data.trend as string | undefined,
          },
        },
        deepLink: `aivo://learner/${data.learnerId}/emotional-state`,
      };
    },

    meltdown_risk: (data) => ({
      title: `⚠️ ${data.learnerName} shows signs of distress`,
      body: `${data.learnerName} may be approaching a meltdown. Consider checking in or providing a break.`,
      richContent: {
        emotionalState: {
          current: 'meltdown_risk',
          intensity: (data.intensity as number) ?? 9,
          trend: 'declining',
        },
        actionButtons: [
          { label: 'Call School', action: 'call_school' },
          { label: 'View Details', action: 'view_details' },
        ],
      },
      deepLink: `aivo://learner/${data.learnerId}/emotional-state`,
    }),

    recovery: (data) => ({
      title: `✨ ${data.learnerName} is recovering`,
      body: `${data.learnerName} is starting to feel calmer after a difficult moment.`,
      richContent: {
        emotionalState: {
          current: data.state as string,
          previous: data.previousState as string | undefined,
          trend: 'improving',
        },
      },
      deepLink: `aivo://learner/${data.learnerId}/emotional-state`,
    }),
  },

  [ParentNotificationCategory.ACHIEVEMENT]: {
    badge_earned: (data) => ({
      title: `🏆 ${data.learnerName} earned a badge!`,
      body: `Congratulations! ${data.learnerName} earned the "${data.badgeName}" badge.`,
      richContent: {
        image: data.badgeImage as string | undefined,
      },
      deepLink: `aivo://learner/${data.learnerId}/achievements`,
    }),

    level_up: (data) => ({
      title: `🎉 ${data.learnerName} leveled up!`,
      body: `${data.learnerName} is now level ${data.newLevel} in ${data.subject}!`,
      deepLink: `aivo://learner/${data.learnerId}/progress`,
    }),

    streak_milestone: (data) => ({
      title: `🔥 ${data.streakDays}-day streak!`,
      body: `${data.learnerName} has been learning for ${data.streakDays} days in a row!`,
      deepLink: `aivo://learner/${data.learnerId}/achievements`,
    }),

    goal_completed: (data) => ({
      title: `✅ Goal completed!`,
      body: `${data.learnerName} completed their goal: "${data.goalTitle}"`,
      deepLink: `aivo://learner/${data.learnerId}/goals`,
    }),

    mastery_achieved: (data) => ({
      title: `🌟 Mastery achieved!`,
      body: `${data.learnerName} has mastered ${data.skillName} in ${data.subject}!`,
      deepLink: `aivo://learner/${data.learnerId}/progress`,
    }),
  },

  [ParentNotificationCategory.SESSION_ACTIVITY]: {
    session_start: (data) => ({
      title: `📚 ${data.learnerName} started learning`,
      body: `${data.learnerName} began a ${data.subject} session.`,
      deepLink: `aivo://learner/${data.learnerId}/sessions`,
    }),

    session_complete: (data) => {
      const minutes = Math.round((data.durationMinutes as number) ?? 0);
      const activitiesCompleted = (data.activitiesCompleted as number) ?? 0;

      return {
        title: `✔️ ${data.learnerName} finished learning`,
        body: `${data.learnerName} completed a ${minutes}-minute ${data.subject} session with ${activitiesCompleted} activities.`,
        richContent: {
          sessionSummary: {
            duration: minutes,
            activitiesCompleted,
            focusScore: data.focusScore as number | undefined,
            emotionalJourney: data.emotionalJourney as string[] | undefined,
          },
        },
        deepLink: `aivo://learner/${data.learnerId}/sessions/${data.sessionId}`,
      };
    },

    session_interrupted: (data) => ({
      title: `⏸️ ${data.learnerName}'s session paused`,
      body: `${data.learnerName}'s learning session was interrupted. Reason: ${data.reason ?? 'Unknown'}`,
      deepLink: `aivo://learner/${data.learnerId}/sessions`,
    }),

    extended_break: (data) => ({
      title: `☕ ${data.learnerName} is on a break`,
      body: `${data.learnerName} has been on a break for ${data.breakMinutes} minutes.`,
      deepLink: `aivo://learner/${data.learnerId}/sessions`,
    }),
  },

  [ParentNotificationCategory.LEARNING_PROGRESS]: {
    weekly_summary: (data) => ({
      title: `📊 ${data.learnerName}'s weekly progress`,
      body: `${data.learnerName} completed ${data.sessionsCompleted} sessions this week with ${data.totalMinutes} minutes of learning.`,
      richContent: {
        progressSummary: {
          period: 'weekly',
          sessions: data.sessionsCompleted as number,
          minutes: data.totalMinutes as number,
          achievements: data.achievementsEarned as number,
        },
      },
      deepLink: `aivo://learner/${data.learnerId}/progress/weekly`,
    }),

    skill_improvement: (data) => ({
      title: `📈 Progress in ${data.skillName}`,
      body: `${data.learnerName} improved their ${data.skillName} skill by ${data.improvementPercent}%!`,
      deepLink: `aivo://learner/${data.learnerId}/progress`,
    }),

    struggling_alert: (data) => ({
      title: `${data.learnerName} may need help with ${data.skillName}`,
      body: `${data.learnerName} has been struggling with ${data.skillName} for the past ${data.dayCount} days. Consider discussing with their teacher.`,
      richContent: {
        actionButtons: [
          { label: 'Contact Teacher', action: 'contact_teacher' },
          { label: 'View Details', action: 'view_details' },
        ],
      },
      deepLink: `aivo://learner/${data.learnerId}/progress`,
    }),
  },

  [ParentNotificationCategory.SAFETY_CONCERN]: {
    content_flag: (data) => ({
      title: `🚨 Safety alert for ${data.learnerName}`,
      body: `${data.description ?? 'A safety concern was detected during the session.'}`,
      richContent: {
        actionButtons: [
          { label: 'View Details', action: 'view_details' },
          { label: 'Contact Support', action: 'contact_support' },
        ],
      },
      deepLink: `aivo://safety/alert/${data.alertId}`,
    }),

    crisis_detected: (data) => ({
      title: `🆘 Immediate attention needed for ${data.learnerName}`,
      body: `${data.description ?? 'A crisis situation has been detected. Please check on your child immediately.'}`,
      richContent: {
        actionButtons: [
          { label: 'Call Now', action: 'call_emergency' },
          { label: 'View Details', action: 'view_details' },
        ],
      },
      deepLink: `aivo://safety/crisis/${data.alertId}`,
    }),
  },

  [ParentNotificationCategory.GOAL_UPDATE]: {
    goal_created: (data) => ({
      title: `🎯 New goal for ${data.learnerName}`,
      body: `A new goal has been set: "${data.goalTitle}"`,
      deepLink: `aivo://learner/${data.learnerId}/goals/${data.goalId}`,
    }),

    goal_progress: (data) => ({
      title: `📊 Goal progress update`,
      body: `${data.learnerName} is ${data.progressPercent}% of the way to their goal: "${data.goalTitle}"`,
      deepLink: `aivo://learner/${data.learnerId}/goals/${data.goalId}`,
    }),

    goal_reminder: (data) => ({
      title: `⏰ Goal deadline approaching`,
      body: `${data.learnerName}'s goal "${data.goalTitle}" is due in ${data.daysRemaining} days.`,
      deepLink: `aivo://learner/${data.learnerId}/goals/${data.goalId}`,
    }),
  },

  [ParentNotificationCategory.CARE_TEAM]: {
    message_received: (data) => ({
      title: `💬 Message from ${data.senderName}`,
      body: `${data.senderRole}: "${data.messagePreview}"`,
      deepLink: `aivo://messages/${data.threadId}`,
    }),

    meeting_scheduled: (data) => ({
      title: `📅 Meeting scheduled`,
      body: `A meeting with ${data.attendees} has been scheduled for ${data.meetingDate}.`,
      deepLink: `aivo://calendar/${data.meetingId}`,
    }),

    iep_update: (data) => ({
      title: `📋 IEP update for ${data.learnerName}`,
      body: `${data.updateDescription ?? 'An update has been made to the IEP.'}`,
      deepLink: `aivo://learner/${data.learnerId}/iep`,
    }),
  },

  [ParentNotificationCategory.SYSTEM]: {
    account_update: (data) => ({
      title: `Account update`,
      body: data.message as string,
      deepLink: `aivo://settings/account`,
    }),

    subscription_reminder: (data) => ({
      title: `Subscription reminder`,
      body: `Your subscription will ${data.action} on ${data.date}.`,
      deepLink: `aivo://settings/subscription`,
    }),

    privacy_update: (_data) => ({
      title: `Privacy policy update`,
      body: `Our privacy policy has been updated. Please review the changes.`,
      deepLink: `aivo://settings/privacy`,
    }),
  },

  [ParentNotificationCategory.REMINDER]: {
    daily_check_in: (data) => ({
      title: `Daily check-in reminder`,
      body: `Don't forget to check on ${data.learnerName}'s progress today!`,
      deepLink: `aivo://learner/${data.learnerId}/dashboard`,
    }),

    scheduled_session: (data) => ({
      title: `Upcoming session`,
      body: `${data.learnerName} has a ${data.sessionType} session scheduled for ${data.sessionTime}.`,
      deepLink: `aivo://learner/${data.learnerId}/schedule`,
    }),

    homework_due: (data) => ({
      title: `Homework reminder`,
      body: `${data.learnerName} has homework due: "${data.assignmentTitle}"`,
      deepLink: `aivo://learner/${data.learnerId}/homework/${data.assignmentId}`,
    }),
  },
};

/**
 * Template service for generating notification content
 */
export class NotificationTemplates {
  /**
   * Generate notification content from a template
   */
  generate(
    category: ParentNotificationCategory,
    event: string,
    data: TemplateData
  ): NotificationContent {
    const categoryTemplates = templates[category];
    const template = categoryTemplates?.[event];

    if (!template) {
      // Fallback to generic template
      return this.generateGeneric(category, event, data);
    }

    const result = template(data);

    return {
      title: result.title,
      body: result.body,
      category,
      urgency: this.inferUrgency(category, event, data),
      learnerId: data.learnerId,
      learnerName: data.learnerName,
      richContent: result.richContent,
      deepLink: result.deepLink,
    };
  }

  /**
   * Generate a generic notification for unknown events
   */
  private generateGeneric(
    category: ParentNotificationCategory,
    event: string,
    data: TemplateData
  ): NotificationContent {
    const categoryLabels: Record<ParentNotificationCategory, string> = {
      [ParentNotificationCategory.EMOTIONAL_STATE]: 'Emotional update',
      [ParentNotificationCategory.ACHIEVEMENT]: 'Achievement',
      [ParentNotificationCategory.SESSION_ACTIVITY]: 'Session activity',
      [ParentNotificationCategory.LEARNING_PROGRESS]: 'Learning progress',
      [ParentNotificationCategory.SAFETY_CONCERN]: 'Safety alert',
      [ParentNotificationCategory.GOAL_UPDATE]: 'Goal update',
      [ParentNotificationCategory.CARE_TEAM]: 'Care team message',
      [ParentNotificationCategory.SYSTEM]: 'System notification',
      [ParentNotificationCategory.REMINDER]: 'Reminder',
    };

    return {
      title: `${categoryLabels[category]} for ${data.learnerName}`,
      body: event.replace(/_/g, ' '),
      category,
      urgency: 'medium',
      learnerId: data.learnerId,
      learnerName: data.learnerName,
    };
  }

  /**
   * Infer urgency from category and event
   */
  private inferUrgency(
    category: ParentNotificationCategory,
    event: string,
    data: TemplateData
  ): string {
    // Safety concerns are always high priority
    if (category === ParentNotificationCategory.SAFETY_CONCERN) {
      return event === 'crisis_detected' ? 'critical' : 'high';
    }

    // Emotional state depends on the state
    if (category === ParentNotificationCategory.EMOTIONAL_STATE) {
      const state = (data.state as string)?.toLowerCase() ?? '';
      if (['meltdown', 'shutdown', 'meltdown_risk', 'crisis'].includes(state)) {
        return 'critical';
      }
      if (['anxious', 'overwhelmed', 'distressed'].includes(state)) {
        return 'high';
      }
      return 'medium';
    }

    // Most achievements are low priority
    if (category === ParentNotificationCategory.ACHIEVEMENT) {
      return 'low';
    }

    // Default to medium
    return 'medium';
  }

  /**
   * Get available templates for a category
   */
  getAvailableTemplates(category: ParentNotificationCategory): string[] {
    return Object.keys(templates[category] ?? {});
  }

  /**
   * Check if a template exists
   */
  hasTemplate(category: ParentNotificationCategory, event: string): boolean {
    return !!templates[category]?.[event];
  }
}

/**
 * Daily digest template
 */
export function generateDailyDigestTemplate(data: {
  parentName: string;
  learnerSummaries: {
    learnerName: string;
    sessionsCompleted: number;
    totalMinutes: number;
    achievements: number;
    emotionalHighlights: string[];
  }[];
  date: string;
}): { subject: string; text: string; html: string } {
  const subject = `Daily Summary for ${data.date}`;

  const textParts: string[] = [];
  textParts.push(`Hi ${data.parentName},`);
  textParts.push('');
  textParts.push("Here's your daily summary:");
  textParts.push('');

  for (const learner of data.learnerSummaries) {
    textParts.push(`${learner.learnerName}:`);
    textParts.push(`- ${learner.sessionsCompleted} sessions (${learner.totalMinutes} minutes)`);
    textParts.push(`- ${learner.achievements} achievements`);
    if (learner.emotionalHighlights.length > 0) {
      textParts.push(`- Emotional notes: ${learner.emotionalHighlights.join(', ')}`);
    }
    textParts.push('');
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
    <div style="background: #4CAF50; padding: 20px; color: white;">
      <h1 style="margin: 0;">Daily Summary</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.date}</p>
    </div>
    <div style="padding: 20px;">
      <p>Hi ${data.parentName},</p>
      <p>Here's how your learners did today:</p>
      
      ${data.learnerSummaries
        .map(
          (learner) => `
        <div style="margin: 15px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${learner.learnerName}</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>📚 ${learner.sessionsCompleted} sessions (${learner.totalMinutes} minutes)</li>
            <li>🏆 ${learner.achievements} achievements</li>
            ${
              learner.emotionalHighlights.length > 0
                ? `<li>💙 ${learner.emotionalHighlights.join(', ')}</li>`
                : ''
            }
          </ul>
        </div>
      `
        )
        .join('')}
      
      <p style="margin-top: 20px;">
        <a href="https://app.aivo.com/dashboard" style="display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">View Full Dashboard</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, text: textParts.join('\n'), html };
}
