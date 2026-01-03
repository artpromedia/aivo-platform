/**
 * Streak Service
 *
 * Manages learning streaks with:
 * - Daily activity tracking
 * - Streak freezes (protection)
 * - Streak milestones
 * - Timezone-aware calculations
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

import { prisma } from '../prisma.js';
import { eventEmitter } from '../events/event-emitter.js';
import { Streak, StreakCalendarDay } from '../types/gamification.types.js';
import { achievementService } from './achievement.service.js';

// ============================================================================
// STREAK SERVICE
// ============================================================================

class StreakService {
  /**
   * Get current streak for a student
   */
  async getCurrentStreak(studentId: string): Promise<Streak> {
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: {
        streakDays: true,
        longestStreak: true,
        lastActivityDate: true,
        streakFreezes: true,
        timezone: true,
      },
    });

    if (!profile) {
      return {
        currentDays: 0,
        longestDays: 0,
        todayComplete: false,
        freezesAvailable: 0,
        nextMilestone: 3,
        lastActivityDate: null,
      };
    }

    const today = this.getLocalDate(profile.timezone || 'UTC');
    const lastActivity = profile.lastActivityDate
      ? this.getLocalDate(profile.timezone || 'UTC', profile.lastActivityDate)
      : null;

    const todayComplete = lastActivity?.toDateString() === today.toDateString();

    // Calculate next milestone
    const milestones = [3, 7, 14, 30, 50, 100, 200, 365];
    const nextMilestone = milestones.find((m) => m > profile.streakDays) || profile.streakDays + 100;

    return {
      currentDays: profile.streakDays,
      longestDays: profile.longestStreak,
      todayComplete,
      freezesAvailable: profile.streakFreezes || 0,
      nextMilestone,
      lastActivityDate: profile.lastActivityDate,
      daysUntilNextMilestone: nextMilestone - profile.streakDays,
    };
  }

  /**
   * Record activity for streak tracking
   */
  async recordActivity(studentId: string, activityType: string): Promise<Streak> {
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: {
        streakDays: true,
        longestStreak: true,
        lastActivityDate: true,
        timezone: true,
      },
    });

    if (!profile) {
      throw new Error('Player profile not found');
    }

    const today = this.getLocalDate(profile.timezone || 'UTC');
    const lastActivity = profile.lastActivityDate
      ? this.getLocalDate(profile.timezone || 'UTC', profile.lastActivityDate)
      : null;

    // Already recorded today
    if (lastActivity?.toDateString() === today.toDateString()) {
      return this.getCurrentStreak(studentId);
    }

    let newStreakDays = profile.streakDays;
    let streakExtended = false;

    if (lastActivity) {
      const daysDiff = this.getDaysDifference(lastActivity, today);

      if (daysDiff === 1) {
        // Continue streak
        newStreakDays = profile.streakDays + 1;
        streakExtended = true;
      } else if (daysDiff > 1) {
        // Streak broken - reset
        newStreakDays = 1;

        eventEmitter.emit('streak.broken', {
          studentId,
          previousStreak: profile.streakDays,
          daysMissed: daysDiff - 1,
        });
      }
    } else {
      // First activity
      newStreakDays = 1;
    }

    const newLongestStreak = Math.max(newStreakDays, profile.longestStreak);

    // Update profile
    await prisma.playerProfile.update({
      where: { studentId },
      data: {
        streakDays: newStreakDays,
        longestStreak: newLongestStreak,
        lastActivityDate: today,
      },
    });

    // Record daily activity
    await prisma.dailyActivity.upsert({
      where: {
        studentId_date: { studentId, date: today },
      },
      create: {
        studentId,
        date: today,
        activityType,
        streakDay: newStreakDays,
      },
      update: {},
    });

    // Check for streak milestones
    const milestones = [3, 7, 14, 30, 50, 100, 200, 365];
    if (milestones.includes(newStreakDays)) {
      eventEmitter.emit('streak.milestone', {
        studentId,
        days: newStreakDays,
      });

      // Award streak milestone XP
      await prisma.xPTransaction.create({
        data: {
          studentId,
          amount: 50, // streak_milestone XP
          activity: 'streak_milestone',
          metadata: { days: newStreakDays },
          earnedAt: new Date(),
        },
      });

      await prisma.playerProfile.update({
        where: { studentId },
        data: {
          totalXp: { increment: 50 },
          todayXp: { increment: 50 },
        },
      });
    }

    // Check streak achievements
    await achievementService.checkStreakAchievements(studentId, newStreakDays);

    if (streakExtended) {
      eventEmitter.emit('streak.extended', {
        studentId,
        days: newStreakDays,
      });
    }

    console.log(`Streak activity recorded: ${studentId} - ${newStreakDays} days`);

    return this.getCurrentStreak(studentId);
  }

  /**
   * Use a streak freeze
   */
  async useStreakFreeze(studentId: string): Promise<{ success: boolean; message: string }> {
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: { streakFreezes: true, streakDays: true, timezone: true },
    });

    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    if ((profile.streakFreezes || 0) <= 0) {
      return { success: false, message: 'No streak freezes available' };
    }

    const today = this.getLocalDate(profile.timezone || 'UTC');

    // Check if already used today
    const existingUsage = await prisma.streakFreezeUsage.findFirst({
      where: {
        studentId,
        usedAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999)),
        },
      },
    });

    if (existingUsage) {
      return { success: false, message: 'Already used freeze today' };
    }

    // Use the freeze
    await prisma.$transaction([
      prisma.playerProfile.update({
        where: { studentId },
        data: { streakFreezes: { decrement: 1 } },
      }),
      prisma.streakFreezeUsage.create({
        data: {
          studentId,
          usedAt: new Date(),
          streakDayProtected: profile.streakDays,
        },
      }),
      prisma.dailyActivity.upsert({
        where: {
          studentId_date: { studentId, date: today },
        },
        create: {
          studentId,
          date: today,
          activityType: 'streak_freeze',
          streakDay: profile.streakDays,
        },
        update: {},
      }),
    ]);

    console.log(`Streak freeze used: ${studentId} - protected day ${profile.streakDays}`);

    return { success: true, message: 'Streak protected!' };
  }

  /**
   * Award streak freezes to a player
   */
  async awardStreakFreezes(studentId: string, count: number): Promise<void> {
    await prisma.playerProfile.update({
      where: { studentId },
      data: { streakFreezes: { increment: count } },
    });

    console.log(`Streak freezes awarded: ${studentId} +${count}`);
  }

  /**
   * Process daily streaks (called by cron job)
   */
  async processDailyStreaks(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find players who didn't have activity yesterday
    const playersToCheck = await prisma.playerProfile.findMany({
      where: {
        streakDays: { gt: 0 },
        lastActivityDate: { lt: yesterday },
      },
    });

    for (const player of playersToCheck) {
      // Check if they have a freeze that was used
      const freezeUsed = await prisma.streakFreezeUsage.findFirst({
        where: {
          studentId: player.studentId,
          usedAt: {
            gte: yesterday,
            lt: today,
          },
        },
      });

      if (freezeUsed) {
        // Streak protected
        continue;
      }

      // Check if they have auto-freeze enabled and freezes available
      const settings = player.settings as { autoUseFreeze?: boolean } | null;
      if (settings?.autoUseFreeze && (player.streakFreezes || 0) > 0) {
        await this.useStreakFreeze(player.studentId);
        continue;
      }

      // Break the streak
      await prisma.playerProfile.update({
        where: { studentId: player.studentId },
        data: { streakDays: 0 },
      });

      eventEmitter.emit('streak.broken', {
        studentId: player.studentId,
        previousStreak: player.streakDays,
        daysMissed: 1,
      });

      console.log(`Streak broken: ${player.studentId} - was ${player.streakDays} days`);
    }
  }

  /**
   * Get streak calendar (last N days of activity)
   */
  async getStreakCalendar(studentId: string, days: number = 30): Promise<StreakCalendarDay[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);

    const activities = await prisma.dailyActivity.findMany({
      where: {
        studentId,
        date: { gte: startDate },
      },
    });

    const xpByDate = await prisma.xPTransaction.groupBy({
      by: ['earnedAt'],
      where: {
        studentId,
        earnedAt: { gte: startDate },
      },
      _sum: { amount: true },
    });

    const activityMap = new Map<string, { activityType: string }>(
      activities.map((a: any) => [a.date.toISOString().split('T')[0], a])
    );

    const xpMap = new Map<string, number>(
      xpByDate.map((x: any) => [new Date(x.earnedAt).toISOString().split('T')[0], x._sum.amount || 0])
    );

    const calendar: StreakCalendarDay[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];

      const activity = activityMap.get(dateKey);
      calendar.push({
        date,
        hasActivity: !!activity && activity.activityType !== 'streak_freeze',
        usedFreeze: activity?.activityType === 'streak_freeze',
        xpEarned: xpMap.get(dateKey) || 0,
      });
    }

    return calendar;
  }

  /**
   * Get local date for a timezone
   */
  private getLocalDate(timezone: string, date?: Date): Date {
    const d = date ? new Date(date) : new Date();

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      const parts = formatter.formatToParts(d);
      const year = parseInt(parts.find((p) => p.type === 'year')?.value || '2024');
      const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1') - 1;
      const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1');

      return new Date(year, month, day);
    } catch {
      // Fallback to UTC
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
  }

  /**
   * Get difference in days between two dates
   */
  private getDaysDifference(date1: Date, date2: Date): number {
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
}

export const streakService = new StreakService();
