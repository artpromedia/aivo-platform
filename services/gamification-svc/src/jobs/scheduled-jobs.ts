/**
 * Scheduled Jobs
 *
 * Runs periodic tasks for the gamification system
 */

import cron from 'node-cron';
import { prisma } from '../prisma.js';
import { streakService, challengeService, leaderboardService } from '../services/index.js';
import { eventEmitter } from '../events/event-emitter.js';

export function startScheduledJobs(): void {
  // ============================================================================
  // DAILY JOBS (midnight UTC)
  // ============================================================================

  // Process daily streaks - check for broken streaks and apply freezes
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily streak processing...');
    try {
      await streakService.processDailyStreaks();
      console.log('Daily streak processing completed');
    } catch (error) {
      console.error('Error processing daily streaks:', error);
    }
  });

  // Start new daily challenges for all active players
  cron.schedule('0 0 * * *', async () => {
    console.log('Starting new daily challenges...');
    try {
      const activePlayers = await prisma.playerProfile.findMany({
        where: {
          lastActivityDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Active in last 7 days
          },
        },
        select: { studentId: true },
      });

      for (const player of activePlayers) {
        await challengeService.startDailyChallenges(player.studentId);
      }

      console.log(`Daily challenges started for ${activePlayers.length} players`);
    } catch (error) {
      console.error('Error starting daily challenges:', error);
    }
  });

  // Archive daily leaderboard at end of day
  cron.schedule('59 23 * * *', async () => {
    console.log('Archiving daily leaderboard...');
    try {
      // TODO: Implement daily archive if needed
      console.log('Daily leaderboard archived');
    } catch (error) {
      console.error('Error archiving daily leaderboard:', error);
    }
  });

  // ============================================================================
  // WEEKLY JOBS (Sunday midnight UTC)
  // ============================================================================

  // Start new weekly challenges
  cron.schedule('0 0 * * 0', async () => {
    console.log('Starting new weekly challenges...');
    try {
      const activePlayers = await prisma.playerProfile.findMany({
        where: {
          lastActivityDate: {
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Active in last 14 days
          },
        },
        select: { studentId: true },
      });

      for (const player of activePlayers) {
        await challengeService.startWeeklyChallenges(player.studentId);
      }

      console.log(`Weekly challenges started for ${activePlayers.length} players`);
    } catch (error) {
      console.error('Error starting weekly challenges:', error);
    }
  });

  // Archive weekly leaderboard (Saturday 11:59 PM UTC)
  cron.schedule('59 23 * * 6', async () => {
    console.log('Archiving weekly leaderboard...');
    try {
      await leaderboardService.archiveWeekly();
      console.log('Weekly leaderboard archived');
    } catch (error) {
      console.error('Error archiving weekly leaderboard:', error);
    }
  });

  // ============================================================================
  // MONTHLY JOBS (1st of month midnight UTC)
  // ============================================================================

  // Start new monthly challenges
  cron.schedule('0 0 1 * *', async () => {
    console.log('Starting new monthly challenges...');
    try {
      const activePlayers = await prisma.playerProfile.findMany({
        where: {
          lastActivityDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Active in last 30 days
          },
        },
        select: { studentId: true },
      });

      for (const player of activePlayers) {
        await challengeService.startMonthlyChallenges(player.studentId);
      }

      console.log(`Monthly challenges started for ${activePlayers.length} players`);
    } catch (error) {
      console.error('Error starting monthly challenges:', error);
    }
  });

  // Archive monthly leaderboard (last day of month 11:59 PM UTC)
  // This runs on the last day of each month
  cron.schedule('59 23 28-31 * *', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Only run if tomorrow is the 1st (meaning today is last day of month)
    if (tomorrow.getDate() === 1) {
      console.log('Archiving monthly leaderboard...');
      try {
        await leaderboardService.archiveMonthly();
        console.log('Monthly leaderboard archived');
      } catch (error) {
        console.error('Error archiving monthly leaderboard:', error);
      }
    }
  });

  // ============================================================================
  // HOURLY JOBS
  // ============================================================================

  // Clean up expired boosters
  cron.schedule('0 * * * *', async () => {
    try {
      const deleted = await prisma.activeBooster.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      if (deleted.count > 0) {
        console.log(`Cleaned up ${deleted.count} expired boosters`);
      }
    } catch (error) {
      console.error('Error cleaning up boosters:', error);
    }
  });

  // Clean up old notifications
  cron.schedule('0 * * * *', async () => {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const deleted = await prisma.gamificationNotification.deleteMany({
        where: {
          read: true,
          createdAt: { lt: oneWeekAgo },
        },
      });

      if (deleted.count > 0) {
        console.log(`Cleaned up ${deleted.count} old notifications`);
      }
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
    }
  });

  // ============================================================================
  // EVERY 5 MINUTES
  // ============================================================================

  // Check for completed challenges
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Find challenges that have ended but weren't marked complete
      const expiredChallenges = await prisma.activeChallenge.findMany({
        where: {
          completed: false,
          expiresAt: { lt: new Date() },
        },
      });

      for (const challenge of expiredChallenges) {
        // Mark as expired (not completed)
        await prisma.activeChallenge.update({
          where: { id: challenge.id },
          data: { completed: false },
        });
      }

      // Check class challenges
      const expiredClassChallenges = await prisma.classChallenge.findMany({
        where: {
          endDate: { lt: new Date() },
          updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }, // Not updated in last 5 min
        },
      });

      for (const challenge of expiredClassChallenges) {
        eventEmitter.emit('challenge.classEnded', {
          challengeId: challenge.id,
          classId: challenge.classId,
          title: challenge.title,
        });
      }
    } catch (error) {
      console.error('Error checking challenges:', error);
    }
  });

  // Anti-addiction checks - remind players to take breaks
  cron.schedule('*/5 * * * *', async () => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const longSessions = await prisma.playerSession.findMany({
        where: {
          startedAt: { lt: oneHourAgo },
          endedAt: null,
          breakReminderSent: false,
        },
      });

      for (const session of longSessions) {
        eventEmitter.emit('session.breakReminder', {
          studentId: session.studentId,
          sessionMinutes: Math.floor((Date.now() - session.startedAt.getTime()) / 60000),
        });

        await prisma.playerSession.update({
          where: { id: session.id },
          data: { breakReminderSent: true },
        });
      }
    } catch (error) {
      console.error('Error checking session durations:', error);
    }
  });

  console.log('All scheduled jobs registered');
}
