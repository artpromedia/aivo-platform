/**
 * Streak Routes
 *
 * Handles streak-related API endpoints
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { streakService } from '../services/index.js';

// ============================================================================
// VALIDATION
// ============================================================================

const freezeSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// ============================================================================
// HELPERS
// ============================================================================

const extractStudentId = (request: FastifyRequest): string => {
  const studentId = request.headers['x-student-id'] as string;
  if (!studentId) {
    throw new Error('Student ID required');
  }
  return studentId;
};

// ============================================================================
// ROUTES
// ============================================================================

async function streakRoutes(app: FastifyInstance) {
  /**
   * GET /api/gamification/streaks
   * Get current streak info
   */
  app.get('/', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const streak = await streakService.getCurrentStreak(studentId);
    return { success: true, data: streak };
  });

  /**
   * GET /api/gamification/streaks/calendar
   * Get streak calendar for a month
   */
  app.get('/calendar', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const query = request.query as any;

    const year = Number.parseInt(query.year as string) || new Date().getFullYear();
    const month = Number.parseInt(query.month as string);

    let startDate: Date;
    let endDate: Date;

    if (Number.isFinite(month)) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const calendar = await streakService.getStreakCalendar(studentId, days);

    return { success: true, data: calendar };
  });

  /**
   * POST /api/gamification/streaks/freeze
   * Use a streak freeze
   */
  app.post('/freeze', async (request: FastifyRequest, reply: FastifyReply) => {
    const studentId = extractStudentId(request);
    freezeSchema.parse(request.body);

    const result = await streakService.useStreakFreeze(studentId);

    if (result) {
      return { success: true, message: 'Streak freeze applied' };
    } else {
      reply.status(400);
      return {
        success: false,
        error: 'Unable to apply streak freeze. Check if you have freezes available.',
      };
    }
  });

  /**
   * GET /api/gamification/streaks/milestones
   * Get streak milestones
   */
  app.get('/milestones', async () => {
    const milestones = [
      { days: 3, name: 'Getting Started', xpBonus: 25, icon: '🌱' },
      { days: 7, name: 'Week Warrior', xpBonus: 50, icon: '⚡' },
      { days: 14, name: 'Fortnight Fighter', xpBonus: 100, icon: '🔥' },
      { days: 30, name: 'Month Master', xpBonus: 250, icon: '⭐' },
      { days: 50, name: 'Consistency Champion', xpBonus: 400, icon: '🏆' },
      { days: 100, name: 'Century Sage', xpBonus: 1000, icon: '💎' },
      { days: 365, name: 'Year-Long Legend', xpBonus: 5000, icon: '👑' },
    ];

    return { success: true, data: milestones };
  });

  /**
   * GET /api/gamification/streaks/stats
   * Get detailed streak statistics
   */
  app.get('/stats', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);

    const { prisma } = await import('../prisma.js');

    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: {
        currentStreak: true,
        longestStreak: true,
        streakFreezes: true,
        lastActivityDate: true,
      },
    });

    const freezeUsage = await prisma.streakFreezeUsage.count({
      where: { studentId },
    });

    const totalActiveDays = await prisma.dailyActivity.count({
      where: { studentId },
    });

    return {
      success: true,
      data: {
        currentStreak: profile?.currentStreak || 0,
        longestStreak: profile?.longestStreak || 0,
        availableFreezes: profile?.streakFreezes || 0,
        freezesUsed: freezeUsage,
        totalActiveDays,
        lastActivityDate: profile?.lastActivityDate,
      },
    };
  });
}

export default streakRoutes;
