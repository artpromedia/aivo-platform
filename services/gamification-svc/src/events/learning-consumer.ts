/**
 * NATS JetStream Consumer for Learning Events
 *
 * Subscribes to the LEARNING stream and triggers gamification logic
 * when sessions end or activities complete.
 *
 * Events handled:
 *   - learning.session.ended   → XP award, streak, challenge progress
 *   - learning.activity.completed → badge criteria checks
 */

import {
  BaseConsumer,
  type ConsumerConnectionConfig,
  type ProcessedMessage,
  type BaseEvent,
} from '@aivo/events';

import { achievementService } from '../services/achievement.service.js';
import { challengeService } from '../services/challenge.service.js';
import { gamificationService } from '../services/gamification.service.js';
import { streakService } from '../services/streak.service.js';

// ---------------------------------------------------------------------------
// Payload types (matching @aivo/events schemas)
// ---------------------------------------------------------------------------

interface SessionEndedPayload {
  sessionId: string;
  learnerId: string;
  durationMs: number;
  endReason: string;
  summary: {
    activitiesStarted: number;
    activitiesCompleted: number;
    correctAnswers: number;
    incorrectAnswers: number;
    hintsUsed: number;
    avgFocusScore?: number;
  };
  endedAt: string;
}

interface ActivityCompletedPayload {
  sessionId: string;
  learnerId: string;
  activityId: string;
  durationMs: number;
  outcome: string;
  score?: number;
  attempts?: number;
  masteryLevel?: number;
  completedAt: string;
}

type LearningEvent = BaseEvent & {
  payload: SessionEndedPayload | ActivityCompletedPayload;
};

// ---------------------------------------------------------------------------
// XP Formula (per sprint spec)
// ---------------------------------------------------------------------------

/**
 * XP formula: baseXP = 10 * activitiesCompleted + bonusXP(accuracy > 90%)
 */
function calculateSessionXP(summary: SessionEndedPayload['summary']): number {
  const baseXP = 10 * summary.activitiesCompleted;
  const totalAnswers = summary.correctAnswers + summary.incorrectAnswers;
  const accuracy = totalAnswers > 0 ? summary.correctAnswers / totalAnswers : 0;
  const bonusXP = accuracy > 0.9 ? 25 : 0;
  return baseXP + bonusXP;
}

// ---------------------------------------------------------------------------
// Consumer
// ---------------------------------------------------------------------------

export class LearningEventConsumer extends BaseConsumer {
  private _processedCount = 0;

  get processedCount(): number {
    return this._processedCount;
  }

  protected async handleMessage(message: ProcessedMessage<BaseEvent>): Promise<void> {
    const event = message.event as LearningEvent;

    switch (event.eventType) {
      case 'learning.session.ended':
        await this.onSessionEnded(event.payload as SessionEndedPayload);
        break;

      case 'learning.activity.completed':
        await this.onActivityCompleted(event.payload as ActivityCompletedPayload);
        break;

      default:
        // Ignore other learning events (session.started, activity.started)
        break;
    }

    this._processedCount++;
  }

  // -------------------------------------------------------------------------
  // Session ended → XP + streak + challenge progress
  // -------------------------------------------------------------------------

  private async onSessionEnded(payload: SessionEndedPayload): Promise<void> {
    const { learnerId, summary, durationMs } = payload;

    console.log(
      `[gamification] session.ended learnerId=${learnerId} activities=${summary.activitiesCompleted} durationMs=${durationMs}`
    );

    try {
      // 1. Ensure player profile exists
      await gamificationService.getPlayerProfile(learnerId);

      // 2. Award XP based on the sprint formula
      const xp = calculateSessionXP(summary);
      if (xp > 0) {
        await gamificationService.awardXP(learnerId, 'lesson_completed', {
          metadata: {
            sessionXP: true,
            activitiesCompleted: summary.activitiesCompleted,
            accuracy:
              summary.correctAnswers + summary.incorrectAnswers > 0
                ? summary.correctAnswers / (summary.correctAnswers + summary.incorrectAnswers)
                : 0,
            durationMs,
          },
        });
      }

      // 3. If accuracy was 100 %, award perfect score bonus
      const totalAnswers = summary.correctAnswers + summary.incorrectAnswers;
      if (totalAnswers > 0 && summary.incorrectAnswers === 0) {
        await gamificationService.awardXP(learnerId, 'lesson_perfect_score');
      }

      // 4. Record streak activity (consecutive-day tracking)
      await streakService.recordActivity(learnerId, 'session');

      // 5. Update challenge progress
      await challengeService.updateProgress(
        learnerId,
        'lessons_completed',
        summary.activitiesCompleted
      );

      // 6. Update time-based stats on profile
      const timeMinutes = Math.round(durationMs / 60_000);
      if (timeMinutes > 0) {
        await challengeService.updateProgress(learnerId, 'time_spent', timeMinutes);
      }

      // 7. Check lesson & streak achievements
      await achievementService.checkLessonAchievements(learnerId);
      await achievementService.checkStreakAchievements(learnerId);
      await achievementService.checkTimeBasedAchievements(learnerId);
      await achievementService.checkXPAchievements(learnerId);
    } catch (err) {
      console.error(`[gamification] Error processing session.ended for ${learnerId}:`, err);
      throw err; // Let BaseConsumer handle NAK / DLQ
    }
  }

  // -------------------------------------------------------------------------
  // Activity completed → badge criteria checks
  // -------------------------------------------------------------------------

  private async onActivityCompleted(payload: ActivityCompletedPayload): Promise<void> {
    const { learnerId, score, outcome, durationMs } = payload;

    if (outcome !== 'completed') {
      return; // Only award for completed activities
    }

    console.log(
      `[gamification] activity.completed learnerId=${learnerId} score=${score} durationMs=${durationMs}`
    );

    try {
      // 1. Award incremental XP for single activity completion
      await gamificationService.awardXP(learnerId, 'practice_session', {
        metadata: {
          activityId: payload.activityId,
          sessionId: payload.sessionId,
          score,
        },
      });

      // 2. Perfect score on activity → check perfect-score achievements
      if (score !== undefined && score >= 100) {
        await gamificationService.awardXP(learnerId, 'lesson_perfect_score');
        await achievementService.checkLessonAchievements(learnerId);
      }

      // 3. If mastery reached → mastery XP and skill achievements
      if (payload.masteryLevel !== undefined && payload.masteryLevel >= 0.95) {
        await gamificationService.awardXP(learnerId, 'skill_mastered', {
          metadata: { activityId: payload.activityId },
        });
        await achievementService.checkSkillAchievements(learnerId);
      }

      // 4. Check XP-threshold achievements after every activity
      await achievementService.checkXPAchievements(learnerId);
    } catch (err) {
      console.error(`[gamification] Error processing activity.completed for ${learnerId}:`, err);
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Factory — called from index.ts startup
// ---------------------------------------------------------------------------

let _consumer: LearningEventConsumer | null = null;

export function createLearningConsumer(natsUrl: string): LearningEventConsumer {
  const connCfg: ConsumerConnectionConfig = {
    servers: natsUrl,
    name: 'gamification-svc',
  };

  _consumer = new LearningEventConsumer(connCfg, {
    stream: 'LEARNING',
    durableName: 'gamification-learning',
    filterSubject: 'learning.>',
    deliverPolicy: 'new',
    maxDeliveries: 5,
    ackWaitMs: 30_000,
  });

  return _consumer;
}

export function getLearningConsumer(): LearningEventConsumer | null {
  return _consumer;
}
