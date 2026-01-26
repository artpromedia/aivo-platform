import type {
  SessionPlan,
  LearnerPreferences,
  BreakSchedule,
  ScheduledBreak,
  BreakActivity,
  BreakRecord,
} from '../types/index.js';
import { prisma } from '../prisma.js';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';

interface BreakActivityConfig {
  type: BreakActivity['type'];
  minDuration: number;
  maxDuration: number;
  fatigueRange: [number, number];
  instructions: string;
}

const BREAK_ACTIVITIES: BreakActivityConfig[] = [
  {
    type: 'hydrate',
    minDuration: 2,
    maxDuration: 3,
    fatigueRange: [0, 40],
    instructions: 'Take a moment to drink some water and refresh.',
  },
  {
    type: 'eye_rest',
    minDuration: 2,
    maxDuration: 5,
    fatigueRange: [30, 60],
    instructions: 'Rest your eyes by looking at something distant (20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds).',
  },
  {
    type: 'stretch',
    minDuration: 3,
    maxDuration: 7,
    fatigueRange: [40, 70],
    instructions: 'Stand up and do some gentle stretching. Roll your shoulders, stretch your neck, and move your arms.',
  },
  {
    type: 'walk',
    minDuration: 5,
    maxDuration: 10,
    fatigueRange: [60, 85],
    instructions: 'Take a short walk around the room or building. Movement helps refresh both body and mind.',
  },
  {
    type: 'mindfulness',
    minDuration: 3,
    maxDuration: 10,
    fatigueRange: [50, 90],
    instructions: 'Take a few deep breaths. Focus on your breathing for a minute or two to reset your mind.',
  },
  {
    type: 'free',
    minDuration: 5,
    maxDuration: 15,
    fatigueRange: [70, 100],
    instructions: 'Take a free break. Do whatever helps you relax and recharge.',
  },
];

const BREAK_INTERVALS = {
  short: { interval: 25, duration: 5 }, // Pomodoro-style
  medium: { interval: 45, duration: 10 },
  long: { interval: 90, duration: 15 },
};

export class BreakScheduler {
  /**
   * Schedule breaks for a session plan
   */
  async scheduleBreaks(
    sessionPlan: SessionPlan,
    learnerPreferences: LearnerPreferences
  ): Promise<BreakSchedule> {
    const scheduledBreaks: ScheduledBreak[] = [];

    // Determine break strategy based on preferences
    const breakStrategy = this.determineBreakStrategy(
      sessionPlan.plannedDuration,
      learnerPreferences
    );

    let accumulatedTime = 0;
    let nextBreakTime = breakStrategy.interval;
    let breakCount = 0;

    // Iterate through activities and insert breaks
    for (let i = 0; i < sessionPlan.activities.length; i++) {
      const activity = sessionPlan.activities[i];
      accumulatedTime += activity.expectedDuration;

      // Check if we should insert a break after this activity
      if (accumulatedTime >= nextBreakTime) {
        // Determine break duration (every 4th break is longer)
        breakCount++;
        const isLongBreak = breakCount % 4 === 0;
        const breakDuration = isLongBreak
          ? Math.min(15, learnerPreferences.preferredBreakLength * 2)
          : learnerPreferences.preferredBreakLength;

        // Get appropriate activity based on expected fatigue at this point
        const expectedFatigue = this.estimateFatigueAtTime(accumulatedTime, sessionPlan);
        const breakActivity = this.selectBreakActivity(expectedFatigue, breakDuration);

        scheduledBreaks.push({
          afterTaskId: activity.activity.id,
          duration: breakDuration,
          activity: breakActivity,
          isFlexible: !isLongBreak, // Long breaks are less flexible
        });

        nextBreakTime = accumulatedTime + breakStrategy.interval;
      }
    }

    // Calculate total break time
    const totalBreakTime = scheduledBreaks.reduce((sum, b) => sum + b.duration, 0);

    return {
      scheduledBreaks,
      totalBreakTime,
    };
  }

  /**
   * Suggest a break activity based on fatigue level and available time
   */
  async suggestBreakActivity(
    fatigueLevel: number,
    breakDuration: number
  ): Promise<BreakActivity> {
    return this.selectBreakActivity(fatigueLevel, breakDuration);
  }

  /**
   * Record that a break was taken
   */
  async recordBreak(
    sessionId: string,
    breakActivity?: BreakActivity
  ): Promise<BreakRecord> {
    const record: BreakRecord = {
      id: uuidv4(),
      sessionId,
      startedAt: new Date(),
      plannedDuration: breakActivity?.duration ?? 5,
      activity: breakActivity,
    };

    await prisma.breakRecord.create({
      data: {
        id: record.id,
        sessionId: record.sessionId,
        startedAt: record.startedAt,
        plannedDuration: record.plannedDuration,
        activityType: record.activity?.type,
        activityInstructions: record.activity?.instructions,
      },
    });

    return record;
  }

  /**
   * End a break and record actual duration
   */
  async endBreak(breakId: string): Promise<BreakRecord> {
    const existingRecord = await prisma.breakRecord.findUnique({
      where: { id: breakId },
    });

    if (!existingRecord) {
      throw new Error(`Break record not found: ${breakId}`);
    }

    const endedAt = new Date();
    const actualDuration = Math.round(
      (endedAt.getTime() - existingRecord.startedAt.getTime()) / 60000
    );

    await prisma.breakRecord.update({
      where: { id: breakId },
      data: {
        endedAt,
        actualDuration,
      },
    });

    return {
      id: existingRecord.id,
      sessionId: existingRecord.sessionId,
      startedAt: existingRecord.startedAt,
      endedAt,
      plannedDuration: existingRecord.plannedDuration,
      actualDuration,
      activity: existingRecord.activityType
        ? {
            type: existingRecord.activityType as BreakActivity['type'],
            duration: existingRecord.plannedDuration,
            instructions: existingRecord.activityInstructions ?? undefined,
          }
        : undefined,
    };
  }

  /**
   * Get break recommendations based on current session state
   */
  async getBreakRecommendation(
    sessionId: string,
    currentFatigueLevel: number,
    timeSinceLastBreak: number
  ): Promise<{
    shouldBreak: boolean;
    urgency: 'low' | 'medium' | 'high';
    suggestedActivity: BreakActivity;
    reason: string;
  }> {
    let shouldBreak = false;
    let urgency: 'low' | 'medium' | 'high' = 'low';
    let reason = '';

    // Check time-based thresholds
    if (timeSinceLastBreak >= config.cognitive.defaultBreakIntervalMinutes * 2) {
      shouldBreak = true;
      urgency = 'high';
      reason = 'Extended period without a break';
    } else if (timeSinceLastBreak >= config.cognitive.defaultBreakIntervalMinutes) {
      shouldBreak = true;
      urgency = 'medium';
      reason = 'Regular break interval reached';
    }

    // Check fatigue-based thresholds
    if (currentFatigueLevel >= 80) {
      shouldBreak = true;
      urgency = 'high';
      reason = reason ? `${reason}. High fatigue detected` : 'High fatigue detected';
    } else if (currentFatigueLevel >= 60) {
      shouldBreak = shouldBreak || timeSinceLastBreak >= 20;
      urgency = urgency === 'high' ? 'high' : 'medium';
      reason = reason
        ? `${reason}. Moderate fatigue detected`
        : 'Moderate fatigue detected';
    }

    // Determine break duration based on urgency
    const breakDuration =
      urgency === 'high' ? 10 : urgency === 'medium' ? 5 : 3;

    const suggestedActivity = this.selectBreakActivity(currentFatigueLevel, breakDuration);

    return {
      shouldBreak,
      urgency,
      suggestedActivity,
      reason: reason || 'No immediate break needed',
    };
  }

  /**
   * Optimize break schedule based on learner's break history
   */
  async optimizeBreakSchedule(
    learnerId: string,
    sessionPlan: SessionPlan
  ): Promise<BreakSchedule> {
    // Get learner's historical break data
    const breakHistory = await prisma.breakRecord.findMany({
      where: {
        session: { learnerId },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    // Analyze break effectiveness
    const breakAnalysis = this.analyzeBreakHistory(breakHistory);

    // Get learner preferences
    const preferences: LearnerPreferences = {
      preferredSessionLength: breakAnalysis.optimalWorkInterval,
      preferredBreakLength: breakAnalysis.optimalBreakDuration,
      preferredDifficulty: 'adaptive',
      learningStyle: 'mixed',
      peakHours: [],
      avoidedActivityTypes: [],
    };

    // Schedule breaks with optimized preferences
    return this.scheduleBreaks(sessionPlan, preferences);
  }

  // ========== Private Helper Methods ==========

  private determineBreakStrategy(
    sessionDuration: number,
    preferences: LearnerPreferences
  ): { interval: number; duration: number } {
    // Use learner preferences as base
    let interval = preferences.preferredSessionLength;
    let duration = preferences.preferredBreakLength;

    // Adjust based on session length
    if (sessionDuration <= 30) {
      // Short session: one break in the middle
      interval = sessionDuration / 2;
      duration = Math.min(3, duration);
    } else if (sessionDuration <= 60) {
      // Medium session: Pomodoro-style
      interval = Math.min(25, interval);
      duration = Math.min(5, duration);
    } else if (sessionDuration <= 120) {
      // Long session: regular breaks
      interval = Math.min(30, interval);
      duration = Math.min(10, duration);
    } else {
      // Very long session: ensure adequate breaks
      interval = Math.min(45, interval);
      duration = Math.max(10, duration);
    }

    return { interval, duration };
  }

  private estimateFatigueAtTime(minutes: number, sessionPlan: SessionPlan): number {
    // Simple fatigue estimation based on time and cognitive load
    const baseFatigue = Math.min(100, minutes * 1.5);

    // Adjust for cognitive load distribution
    let accumulatedMinutes = 0;
    let cognitiveLoadSum = 0;
    let activityCount = 0;

    for (const activity of sessionPlan.activities) {
      if (accumulatedMinutes >= minutes) break;

      cognitiveLoadSum += this.cognitiveLoadToNumber(
        sessionPlan.cognitiveLoadDistribution[activityCount] ?? 'medium'
      );
      activityCount++;
      accumulatedMinutes += activity.expectedDuration;
    }

    const avgCognitiveLoad = activityCount > 0 ? cognitiveLoadSum / activityCount : 2;
    const loadMultiplier = avgCognitiveLoad / 2; // Normalize around medium load

    return Math.min(100, baseFatigue * loadMultiplier);
  }

  private cognitiveLoadToNumber(load: string): number {
    switch (load) {
      case 'low':
        return 1;
      case 'medium':
        return 2;
      case 'high':
        return 3;
      case 'overload':
        return 4;
      default:
        return 2;
    }
  }

  private selectBreakActivity(fatigueLevel: number, duration: number): BreakActivity {
    // Find activities that match the fatigue level and duration
    const suitableActivities = BREAK_ACTIVITIES.filter((activity) => {
      const [minFatigue, maxFatigue] = activity.fatigueRange;
      const durationFits =
        duration >= activity.minDuration && duration <= activity.maxDuration * 1.5;
      const fatigueFits = fatigueLevel >= minFatigue && fatigueLevel <= maxFatigue;

      return durationFits && fatigueFits;
    });

    // If no perfect match, find closest match
    if (suitableActivities.length === 0) {
      // Sort by fatigue range proximity
      const sortedActivities = [...BREAK_ACTIVITIES].sort((a, b) => {
        const aDistance = Math.min(
          Math.abs(fatigueLevel - a.fatigueRange[0]),
          Math.abs(fatigueLevel - a.fatigueRange[1])
        );
        const bDistance = Math.min(
          Math.abs(fatigueLevel - b.fatigueRange[0]),
          Math.abs(fatigueLevel - b.fatigueRange[1])
        );
        return aDistance - bDistance;
      });

      const selected = sortedActivities[0];
      return {
        type: selected.type,
        duration: Math.min(duration, selected.maxDuration),
        instructions: selected.instructions,
      };
    }

    // Randomly select from suitable activities for variety
    const selected = suitableActivities[Math.floor(Math.random() * suitableActivities.length)];

    return {
      type: selected.type,
      duration: Math.min(duration, selected.maxDuration),
      instructions: selected.instructions,
    };
  }

  private analyzeBreakHistory(breakHistory: any[]): {
    optimalWorkInterval: number;
    optimalBreakDuration: number;
    preferredActivities: BreakActivity['type'][];
  } {
    if (breakHistory.length === 0) {
      return {
        optimalWorkInterval: 25,
        optimalBreakDuration: 5,
        preferredActivities: ['stretch', 'hydrate'],
      };
    }

    // Calculate average break duration
    const completedBreaks = breakHistory.filter((b) => b.actualDuration);
    const avgBreakDuration =
      completedBreaks.length > 0
        ? completedBreaks.reduce((sum, b) => sum + b.actualDuration, 0) /
          completedBreaks.length
        : 5;

    // Find preferred activities
    const activityCounts = new Map<string, number>();
    for (const breakRecord of breakHistory) {
      if (breakRecord.activityType) {
        activityCounts.set(
          breakRecord.activityType,
          (activityCounts.get(breakRecord.activityType) ?? 0) + 1
        );
      }
    }

    const sortedActivities = Array.from(activityCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type as BreakActivity['type']);

    return {
      optimalWorkInterval: 25, // Default Pomodoro
      optimalBreakDuration: Math.round(avgBreakDuration),
      preferredActivities:
        sortedActivities.length > 0 ? sortedActivities.slice(0, 3) : ['stretch', 'hydrate'],
    };
  }
}
