/**
 * Anti-Addiction Service
 *
 * Manages session tracking and break reminders
 * to promote healthy learning habits
 */

import { prisma } from '../prisma.js';
import { eventEmitter } from '../events/event-emitter.js';

interface SessionStartResult {
  sessionId: string;
  remainingDailyMinutes: number;
  isLimited: boolean;
  message?: string;
}

interface AntiAddictionSettings {
  enabled: boolean;
  maxDailyMinutes: number;
  breakReminderMinutes: number;
  cooldownBetweenSessions: number;
}

const DEFAULT_SETTINGS: AntiAddictionSettings = {
  enabled: true,
  maxDailyMinutes: 120, // 2 hours
  breakReminderMinutes: 45,
  cooldownBetweenSessions: 10,
};

class AntiAddictionService {
  /**
   * Start a new learning session
   */
  async startSession(studentId: string, classId?: string): Promise<SessionStartResult> {
    const settings = await this.getSettings(studentId, classId);

    if (!settings.enabled) {
      const session = await prisma.playerSession.create({
        data: {
          studentId,
          startedAt: new Date(),
          breakReminderSent: false,
        },
      });

      return {
        sessionId: session.id,
        remainingDailyMinutes: -1, // Unlimited
        isLimited: false,
      };
    }

    // Check daily usage
    const todayUsage = await this.getTodayUsage(studentId);
    const remainingMinutes = settings.maxDailyMinutes - todayUsage;

    if (remainingMinutes <= 0) {
      return {
        sessionId: '',
        remainingDailyMinutes: 0,
        isLimited: true,
        message: "You've reached your daily learning limit. Come back tomorrow to continue!",
      };
    }

    // Check cooldown from last session
    const lastSession = await prisma.playerSession.findFirst({
      where: { studentId },
      orderBy: { endedAt: 'desc' },
    });

    if (lastSession?.endedAt) {
      const minutesSinceLastSession = (Date.now() - lastSession.endedAt.getTime()) / 60000;
      if (minutesSinceLastSession < settings.cooldownBetweenSessions) {
        const waitMinutes = Math.ceil(settings.cooldownBetweenSessions - minutesSinceLastSession);
        return {
          sessionId: '',
          remainingDailyMinutes: remainingMinutes,
          isLimited: true,
          message: `Take a ${waitMinutes} minute break before starting another session!`,
        };
      }
    }

    // Start session
    const session = await prisma.playerSession.create({
      data: {
        studentId,
        startedAt: new Date(),
        breakReminderSent: false,
      },
    });

    console.log(`Session started: ${studentId} - ${session.id}`);

    return {
      sessionId: session.id,
      remainingDailyMinutes: remainingMinutes,
      isLimited: false,
    };
  }

  /**
   * End a learning session
   */
  async endSession(sessionId: string): Promise<{ totalMinutes: number }> {
    const session = await prisma.playerSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.endedAt) {
      return { totalMinutes: 0 };
    }

    const endTime = new Date();
    const totalMinutes = Math.floor((endTime.getTime() - session.startedAt.getTime()) / 60000);

    await prisma.playerSession.update({
      where: { id: sessionId },
      data: {
        endedAt: endTime,
        totalMinutes,
      },
    });

    console.log(`Session ended: ${session.studentId} - ${totalMinutes} minutes`);

    return { totalMinutes };
  }

  /**
   * Update session heartbeat (keeps session alive)
   */
  async heartbeat(sessionId: string): Promise<{ shouldBreak: boolean; message?: string }> {
    const session = await prisma.playerSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.endedAt) {
      return { shouldBreak: false };
    }

    const settings = await this.getSettings(session.studentId);
    const sessionMinutes = Math.floor((Date.now() - session.startedAt.getTime()) / 60000);

    // Check daily limit
    const todayUsage = await this.getTodayUsage(session.studentId);
    if (settings.enabled && todayUsage >= settings.maxDailyMinutes) {
      await this.endSession(sessionId);
      
      eventEmitter.emit('session.dailyLimitReached', {
        studentId: session.studentId,
        totalMinutes: todayUsage,
      });

      return {
        shouldBreak: true,
        message: "You've reached your daily learning goal! Great job. Come back tomorrow!",
      };
    }

    // Check break reminder
    if (settings.enabled && !session.breakReminderSent && sessionMinutes >= settings.breakReminderMinutes) {
      await prisma.playerSession.update({
        where: { id: sessionId },
        data: { breakReminderSent: true },
      });

      eventEmitter.emit('session.breakReminder', {
        studentId: session.studentId,
        sessionMinutes,
      });

      return {
        shouldBreak: false,
        message: `You've been learning for ${sessionMinutes} minutes. Consider taking a short break!`,
      };
    }

    return { shouldBreak: false };
  }

  /**
   * Get total usage for today
   */
  async getTodayUsage(studentId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessions = await prisma.playerSession.findMany({
      where: {
        studentId,
        startedAt: { gte: today },
      },
      select: { totalMinutes: true, startedAt: true, endedAt: true },
    });

    return sessions.reduce((total, session) => {
      if (session.totalMinutes) {
        return total + session.totalMinutes;
      }
      if (!session.endedAt) {
        // Active session
        return total + Math.floor((Date.now() - session.startedAt.getTime()) / 60000);
      }
      return total;
    }, 0);
  }

  /**
   * Get usage statistics for a period
   */
  async getUsageStats(studentId: string, days: number = 7): Promise<{
    daily: Array<{ date: string; minutes: number }>;
    average: number;
    total: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sessions = await prisma.playerSession.findMany({
      where: {
        studentId,
        startedAt: { gte: startDate },
        totalMinutes: { not: null },
      },
      select: { startedAt: true, totalMinutes: true },
      orderBy: { startedAt: 'asc' },
    });

    // Group by date
    const dailyMap = new Map<string, number>();
    for (const session of sessions) {
      const dateStr = session.startedAt.toISOString().split('T')[0];
      const current = dailyMap.get(dateStr) || 0;
      dailyMap.set(dateStr, current + (session.totalMinutes || 0));
    }

    const daily = Array.from(dailyMap.entries()).map(([date, minutes]) => ({
      date,
      minutes,
    }));

    const total = daily.reduce((sum, d) => sum + d.minutes, 0);
    const average = daily.length > 0 ? Math.round(total / daily.length) : 0;

    return { daily, average, total };
  }

  /**
   * Get anti-addiction settings for a student
   */
  private async getSettings(studentId: string, classId?: string): Promise<AntiAddictionSettings> {
    // First check class settings if classId provided
    if (classId) {
      const classSettings = await prisma.classGamificationSettings.findUnique({
        where: { classId },
      });

      if (classSettings?.antiAddictionEnabled) {
        return {
          enabled: true,
          maxDailyMinutes: classSettings.maxDailyMinutes,
          breakReminderMinutes: classSettings.breakReminderMinutes,
          cooldownBetweenSessions: classSettings.cooldownBetweenSessions,
        };
      }
    }

    // Fall back to global defaults
    return DEFAULT_SETTINGS;
  }

  /**
   * Check if student can start a session
   */
  async canStartSession(studentId: string, classId?: string): Promise<{
    allowed: boolean;
    reason?: string;
    waitMinutes?: number;
  }> {
    const settings = await this.getSettings(studentId, classId);

    if (!settings.enabled) {
      return { allowed: true };
    }

    // Check daily limit
    const todayUsage = await this.getTodayUsage(studentId);
    if (todayUsage >= settings.maxDailyMinutes) {
      return {
        allowed: false,
        reason: 'daily_limit',
      };
    }

    // Check cooldown
    const lastSession = await prisma.playerSession.findFirst({
      where: { studentId },
      orderBy: { endedAt: 'desc' },
    });

    if (lastSession?.endedAt) {
      const minutesSinceLastSession = (Date.now() - lastSession.endedAt.getTime()) / 60000;
      if (minutesSinceLastSession < settings.cooldownBetweenSessions) {
        return {
          allowed: false,
          reason: 'cooldown',
          waitMinutes: Math.ceil(settings.cooldownBetweenSessions - minutesSinceLastSession),
        };
      }
    }

    return { allowed: true };
  }
}

export const antiAddictionService = new AntiAddictionService();
