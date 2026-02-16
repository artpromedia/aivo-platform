/**
 * Gamification API Routes
 *
 * Handles player profiles, XP, levels, and dashboard
 */

/* eslint-disable @typescript-eslint/no-require-imports */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import {
  gamificationService,
  achievementService,
  streakService,
  challengeService,
} from '../services/index.js';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const awardXPSchema = z.object({
  activityType: z.string(),
  amount: z.number().optional(),
  lessonId: z.string().optional(),
  quizId: z.string().optional(),
  skillId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const dailyGoalSchema = z.object({
  xpGoal: z.number().min(10).max(500),
  lessonsGoal: z.number().min(1).max(20),
  minutesGoal: z.number().min(5).max(120),
});

// ============================================================================
// HELPERS
// ============================================================================

// Extract studentId from authenticated request
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

async function gamificationRoutes(app: FastifyInstance) {
  /**
   * GET /api/gamification/profile
   * Get player profile and stats
   */
  app.get('/profile', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const profile = await gamificationService.getPlayerProfile(studentId);
    return { success: true, data: profile };
  });

  /**
   * GET /api/gamification/dashboard
   * Get full gamification dashboard
   */
  app.get('/dashboard', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);

    const [profile, achievements, streak, activeChallenges] = await Promise.all([
      gamificationService.getPlayerProfile(studentId),
      achievementService.getPlayerAchievements(studentId),
      streakService.getCurrentStreak(studentId),
      challengeService.getActiveProgress(studentId),
    ]);

    return {
      success: true,
      data: {
        profile,
        achievements,
        streak,
        activeChallenges,
      },
    };
  });

  /**
   * POST /api/gamification/xp
   * Award XP for an activity
   */
  app.post('/xp', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const data = awardXPSchema.parse(request.body);

    const transaction = await gamificationService.awardXP(studentId, data.activityType, {
      bonusXp: data.amount,
      metadata: data.metadata,
    });

    return { success: true, data: transaction };
  });

  /**
   * GET /api/gamification/levels
   * Get level configuration
   */
  app.get('/levels', async (_request: FastifyRequest) => {
    const { LEVEL_CONFIG } = require('../services/gamification.service.js');
    return { success: true, data: LEVEL_CONFIG };
  });

  /**
   * GET /api/gamification/xp/history
   * Get XP transaction history
   */
  app.get('/xp/history', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const limit = Number.parseInt((request.query as any).limit as string) || 20;
    const offset = Number.parseInt((request.query as any).offset as string) || 0;

    const { prisma } = await import('../prisma.js');
    const transactions = await prisma.xPTransaction.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return { success: true, data: transactions };
  });

  /**
   * PUT /api/gamification/daily-goal
   * Update daily goal settings
   */
  app.put('/daily-goal', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const goals = dailyGoalSchema.parse(request.body);

    const { prisma } = await import('../prisma.js');
    const profile = await prisma.playerProfile.update({
      where: { studentId },
      data: {
        dailyXPGoal: goals.xpGoal,
        dailyLessonsGoal: goals.lessonsGoal,
        dailyMinutesGoal: goals.minutesGoal,
      },
    });

    return { success: true, data: profile };
  });

  /**
   * GET /api/gamification/daily-progress
   * Get today's progress towards daily goals
   */
  app.get('/daily-progress', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const progress = await gamificationService.getDailyGoalProgress(studentId);
    return { success: true, data: progress };
  });
}

export default gamificationRoutes;
