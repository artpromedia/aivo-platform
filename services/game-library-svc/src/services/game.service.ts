/**
 * Game Service - Core business logic for game library
 */

import { PrismaClient } from '../generated/prisma-client/index.js';
import { GAME_CATALOG, filterGames, getRandomFocusBreakGame } from '../games/catalog.js';
import { config } from '../config.js';
import type {
  GameDefinition,
  GameFilters,
  GameRecommendation,
  GameSummary,
  StartSessionRequest,
  EndSessionRequest,
  GameSessionResponse,
  BrainTrainingPlan,
  BrainTrainingStats,
  CognitiveSkill,
  GradeBand,
} from '../types/index.js';

export class GameService {
  constructor(private prisma: PrismaClient) {}

  // ══════════════════════════════════════════════════════════════════════════════
  // GAME CATALOG
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Seed the game catalog into the database
   */
  async seedGameCatalog(): Promise<void> {
    for (const gameDef of GAME_CATALOG) {
      await this.prisma.game.upsert({
        where: { slug: gameDef.slug },
        update: {
          title: gameDef.title,
          description: gameDef.description,
          instructions: gameDef.instructions,
          type: gameDef.type,
          category: gameDef.category,
          minAge: gameDef.minAge,
          maxAge: gameDef.maxAge,
          gradeBands: gameDef.gradeBands,
          estimatedDurationSec: gameDef.estimatedDurationSec,
          cognitiveSkills: gameDef.cognitiveSkills,
          accessibilityFeatures: gameDef.accessibilityFeatures,
          thumbnailUrl: gameDef.thumbnailUrl,
          assetBundleUrl: gameDef.assetBundleUrl,
          gameConfig: gameDef.gameConfig as any,
          xpReward: gameDef.xpReward,
          coinReward: gameDef.coinReward,
          tags: gameDef.tags,
          isActive: true,
        },
        create: {
          slug: gameDef.slug,
          title: gameDef.title,
          description: gameDef.description,
          instructions: gameDef.instructions,
          type: gameDef.type,
          category: gameDef.category,
          minAge: gameDef.minAge,
          maxAge: gameDef.maxAge,
          gradeBands: gameDef.gradeBands,
          estimatedDurationSec: gameDef.estimatedDurationSec,
          cognitiveSkills: gameDef.cognitiveSkills,
          accessibilityFeatures: gameDef.accessibilityFeatures,
          thumbnailUrl: gameDef.thumbnailUrl,
          assetBundleUrl: gameDef.assetBundleUrl,
          gameConfig: gameDef.gameConfig as any,
          xpReward: gameDef.xpReward,
          coinReward: gameDef.coinReward,
          tags: gameDef.tags,
          isActive: true,
        },
      });
    }
  }

  /**
   * List all available games with optional filters
   */
  async listGames(filters: GameFilters = {}): Promise<GameSummary[]> {
    const games = await this.prisma.game.findMany({
      where: {
        isActive: true,
        ...(filters.type && { type: filters.type }),
        ...(filters.category && { category: filters.category }),
        ...(filters.gradeBand && { gradeBands: { has: filters.gradeBand } }),
        ...(filters.cognitiveSkill && { cognitiveSkills: { has: filters.cognitiveSkill } }),
        ...(filters.maxDurationSec && { estimatedDurationSec: { lte: filters.maxDurationSec } }),
        ...(filters.minAge && { maxAge: { gte: filters.minAge } }),
        ...(filters.maxAge && { minAge: { lte: filters.maxAge } }),
        ...(filters.tags && filters.tags.length > 0 && { tags: { hasSome: filters.tags } }),
        ...(filters.accessibilityFeatures &&
          filters.accessibilityFeatures.length > 0 && {
            accessibilityFeatures: { hasEvery: filters.accessibilityFeatures },
          }),
      },
      orderBy: { title: 'asc' },
    });

    return games.map(this.toGameSummary);
  }

  /**
   * Get a single game by ID or slug
   */
  async getGame(idOrSlug: string): Promise<GameSummary | null> {
    const game = await this.prisma.game.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        isActive: true,
      },
    });

    return game ? this.toGameSummary(game) : null;
  }

  /**
   * Get full game details including config
   */
  async getGameDetails(idOrSlug: string): Promise<any | null> {
    const game = await this.prisma.game.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        isActive: true,
      },
    });

    if (!game) return null;

    return {
      ...this.toGameSummary(game),
      instructions: game.instructions,
      gameConfig: game.gameConfig,
      accessibilityFeatures: game.accessibilityFeatures,
      gradeBands: game.gradeBands,
      minAge: game.minAge,
      maxAge: game.maxAge,
      tags: game.tags,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // GAME SESSIONS
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Start a new game session
   */
  async startSession(
    tenantId: string,
    learnerId: string,
    request: StartSessionRequest
  ): Promise<GameSessionResponse> {
    const game = await this.prisma.game.findUnique({
      where: { id: request.gameId },
    });

    if (!game) {
      throw new Error('Game not found');
    }

    const session = await this.prisma.gameSession.create({
      data: {
        tenantId,
        learnerId,
        gameId: request.gameId,
        context: request.context,
        difficulty: request.difficulty,
        learningSessionId: request.learningSessionId,
        status: 'STARTED',
      },
      include: { game: true },
    });

    return this.toSessionResponse(session);
  }

  /**
   * End a game session and calculate rewards
   */
  async endSession(
    tenantId: string,
    sessionId: string,
    request: EndSessionRequest
  ): Promise<GameSessionResponse> {
    const session = await this.prisma.gameSession.findFirst({
      where: { id: sessionId, tenantId },
      include: { game: true },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'STARTED' && session.status !== 'PAUSED') {
      throw new Error('Session already ended');
    }

    const endedAt = new Date();
    const durationSec = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);

    // Calculate rewards
    let xpEarned = 0;
    let coinsEarned = 0;

    if (request.completed) {
      xpEarned = session.game.xpReward;
      coinsEarned = session.game.coinReward;

      // Bonus for stars
      if (request.stars === 3) {
        xpEarned = Math.floor(xpEarned * 1.5);
        coinsEarned = Math.floor(coinsEarned * 1.5);
      } else if (request.stars === 2) {
        xpEarned = Math.floor(xpEarned * 1.2);
      }
    }

    // Check for personal best
    const isPersonalBest = await this.checkPersonalBest(
      tenantId,
      session.learnerId,
      session.gameId,
      request.score || 0
    );

    const updated = await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status: request.completed ? 'COMPLETED' : 'ABANDONED',
        score: request.score,
        stars: request.stars,
        levelReached: request.levelReached,
        metrics: (request.metrics as any) || {},
        durationSec,
        xpEarned,
        coinsEarned,
        isPersonalBest,
        endedAt,
      },
      include: { game: true },
    });

    // Update learner profile
    await this.updateLearnerProfile(tenantId, session.learnerId, updated);

    // Update leaderboard if score achieved
    if (request.score && request.completed) {
      await this.updateLeaderboard(tenantId, session.learnerId, session.gameId, request.score);
    }

    return this.toSessionResponse(updated);
  }

  /**
   * Pause a game session
   */
  async pauseSession(tenantId: string, sessionId: string): Promise<GameSessionResponse> {
    const session = await this.prisma.gameSession.findFirst({
      where: { id: sessionId, tenantId },
      include: { game: true },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const updated = await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
      },
      include: { game: true },
    });

    return this.toSessionResponse(updated);
  }

  /**
   * Get session history for a learner
   */
  async getSessionHistory(
    tenantId: string,
    learnerId: string,
    limit = 20
  ): Promise<GameSessionResponse[]> {
    const sessions = await this.prisma.gameSession.findMany({
      where: { tenantId, learnerId },
      include: { game: true },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return sessions.map(this.toSessionResponse);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RECOMMENDATIONS
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Get game recommendations for a learner
   */
  async getRecommendations(
    tenantId: string,
    learnerId: string,
    context: 'BREAK' | 'BRAIN_TRAINING' | 'FREE_PLAY',
    gradeBand: GradeBand,
    limit = 5
  ): Promise<GameRecommendation[]> {
    const profile = await this.prisma.learnerGameProfile.findUnique({
      where: { learnerId },
    });

    const recentGameIds = profile?.recentGameIds || [];

    // Get all active games for the grade band
    const games = await this.prisma.game.findMany({
      where: {
        isActive: true,
        gradeBands: { has: gradeBand },
      },
    });

    const recommendations: GameRecommendation[] = [];

    // Filter by context
    const contextGames = games.filter((g) => {
      if (context === 'BREAK') {
        return g.type === 'FOCUS_BREAK' || g.type === 'RELAXATION';
      } else if (context === 'BRAIN_TRAINING') {
        return g.type === 'BRAIN_TRAINING';
      }
      return true;
    });

    // Prioritize games not recently played
    const unplayedGames = contextGames.filter((g) => !recentGameIds.includes(g.id));
    const replayGames = contextGames.filter((g) => recentGameIds.includes(g.id));

    // Add unplayed games first
    for (const game of unplayedGames.slice(0, limit)) {
      recommendations.push({
        game: this.toGameSummary(game),
        reason: context === 'BREAK' ? 'FOCUS_BREAK' : context === 'BRAIN_TRAINING' ? 'BRAIN_TRAINING' : 'NEW',
        priority: 10,
      });
    }

    // Add favorites if space remains
    if (recommendations.length < limit && profile?.favoriteGameIds) {
      const favoriteGames = contextGames.filter((g) =>
        profile.favoriteGameIds.includes(g.id)
      );
      for (const game of favoriteGames.slice(0, limit - recommendations.length)) {
        if (!recommendations.find((r) => r.game.id === game.id)) {
          recommendations.push({
            game: this.toGameSummary(game),
            reason: 'FAVORITE',
            priority: 8,
          });
        }
      }
    }

    // Fill remaining with popular/replay games
    for (const game of replayGames.slice(0, limit - recommendations.length)) {
      if (!recommendations.find((r) => r.game.id === game.id)) {
        recommendations.push({
          game: this.toGameSummary(game),
          reason: 'POPULAR',
          priority: 5,
        });
      }
    }

    return recommendations.slice(0, limit);
  }

  /**
   * Get a random focus break game
   */
  async getRandomFocusBreak(gradeBand: GradeBand, excludeSlugs: string[] = []): Promise<GameSummary | null> {
    const game = getRandomFocusBreakGame(GAME_CATALOG, gradeBand, excludeSlugs);
    if (!game) return null;

    const dbGame = await this.prisma.game.findFirst({
      where: { slug: game.slug, isActive: true },
    });

    return dbGame ? this.toGameSummary(dbGame) : null;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // BRAIN TRAINING
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate or get today's brain training plan
   */
  async getBrainTrainingPlan(
    tenantId: string,
    learnerId: string,
    gradeBand: GradeBand
  ): Promise<BrainTrainingPlan> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for existing plan
    let plan = await this.prisma.brainTrainingPlan.findUnique({
      where: {
        tenantId_learnerId_planDate: {
          tenantId,
          learnerId,
          planDate: today,
        },
      },
    });

    if (!plan) {
      // Generate new plan
      plan = await this.generateBrainTrainingPlan(tenantId, learnerId, gradeBand, today);
    }

    // Get game details
    const games = await this.prisma.game.findMany({
      where: { id: { in: plan.gameIds } },
    });

    const gameSummaries = games.map(this.toGameSummary);
    const completedCount = plan.completedGameIds.length;
    const totalCount = plan.gameIds.length;

    return {
      id: plan.id,
      planDate: plan.planDate.toISOString().split('T')[0],
      games: gameSummaries,
      targetMinutes: plan.targetMinutes,
      focusSkills: plan.focusSkills as CognitiveSkill[],
      completedGameIds: plan.completedGameIds,
      isCompleted: plan.isCompleted,
      actualMinutes: plan.actualMinutes || undefined,
      progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    };
  }

  /**
   * Mark a game as completed in today's brain training plan
   */
  async completeBrainTrainingGame(
    tenantId: string,
    learnerId: string,
    gameId: string
  ): Promise<BrainTrainingPlan> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const plan = await this.prisma.brainTrainingPlan.findUnique({
      where: {
        tenantId_learnerId_planDate: {
          tenantId,
          learnerId,
          planDate: today,
        },
      },
    });

    if (!plan) {
      throw new Error('No brain training plan for today');
    }

    if (!plan.gameIds.includes(gameId)) {
      throw new Error('Game not part of today\'s plan');
    }

    const completedGameIds = [...new Set([...plan.completedGameIds, gameId])];
    const isCompleted = completedGameIds.length >= plan.gameIds.length;

    await this.prisma.brainTrainingPlan.update({
      where: { id: plan.id },
      data: {
        completedGameIds,
        isCompleted,
      },
    });

    // Update streak if completed
    if (isCompleted) {
      await this.updateBrainTrainingStreak(tenantId, learnerId);
    }

    return this.getBrainTrainingPlan(tenantId, learnerId, 'G3_5'); // Grade band doesn't matter here
  }

  /**
   * Get brain training statistics
   */
  async getBrainTrainingStats(tenantId: string, learnerId: string): Promise<BrainTrainingStats> {
    const profile = await this.prisma.learnerGameProfile.findUnique({
      where: { learnerId },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = await this.prisma.gameSession.findMany({
      where: {
        tenantId,
        learnerId,
        context: 'BRAIN_TRAINING',
        status: 'COMPLETED',
        startedAt: { gte: thirtyDaysAgo },
      },
      select: { durationSec: true, startedAt: true },
    });

    const totalSessions = sessions.length;
    const totalMinutes = Math.round(
      sessions.reduce((sum, s) => sum + (s.durationSec || 0), 0) / 60
    );

    // Calculate weekly completion rate
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekPlans = await this.prisma.brainTrainingPlan.findMany({
      where: {
        tenantId,
        learnerId,
        planDate: { gte: sevenDaysAgo },
      },
    });

    const completedPlans = weekPlans.filter((p) => p.isCompleted).length;
    const weeklyCompletionRate = weekPlans.length > 0
      ? Math.round((completedPlans / Math.min(weekPlans.length, 7)) * 100)
      : 0;

    return {
      currentStreak: profile?.brainTrainingStreak || 0,
      longestStreak: profile?.brainTrainingStreak || 0, // Would need separate tracking
      totalSessions,
      totalMinutes,
      averageMinutesPerDay: totalSessions > 0 ? Math.round(totalMinutes / 30) : 0,
      skillProgress: (profile?.skillLevels as Record<CognitiveSkill, number>) || {},
      lastTrainingDate: profile?.lastBrainTrainingDate?.toISOString().split('T')[0],
      weeklyCompletionRate,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════════

  private toGameSummary(game: any): GameSummary {
    return {
      id: game.id,
      slug: game.slug,
      title: game.title,
      description: game.description,
      type: game.type,
      category: game.category,
      estimatedDurationSec: game.estimatedDurationSec,
      thumbnailUrl: game.thumbnailUrl,
      xpReward: game.xpReward,
      coinReward: game.coinReward,
      cognitiveSkills: game.cognitiveSkills,
    };
  }

  private toSessionResponse(session: any): GameSessionResponse {
    return {
      id: session.id,
      gameId: session.gameId,
      gameSlug: session.game.slug,
      gameTitle: session.game.title,
      context: session.context,
      status: session.status,
      score: session.score,
      stars: session.stars,
      levelReached: session.levelReached,
      difficulty: session.difficulty,
      durationSec: session.durationSec,
      xpEarned: session.xpEarned,
      coinsEarned: session.coinsEarned,
      isPersonalBest: session.isPersonalBest,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString(),
    };
  }

  private async checkPersonalBest(
    tenantId: string,
    learnerId: string,
    gameId: string,
    score: number
  ): Promise<boolean> {
    const bestSession = await this.prisma.gameSession.findFirst({
      where: {
        tenantId,
        learnerId,
        gameId,
        status: 'COMPLETED',
      },
      orderBy: { score: 'desc' },
      select: { score: true },
    });

    return !bestSession?.score || score > bestSession.score;
  }

  private async updateLearnerProfile(
    tenantId: string,
    learnerId: string,
    session: any
  ): Promise<void> {
    const profile = await this.prisma.learnerGameProfile.findUnique({
      where: { learnerId },
    });

    const recentGameIds = profile?.recentGameIds || [];
    const updatedRecent = [
      session.gameId,
      ...recentGameIds.filter((id: string) => id !== session.gameId),
    ].slice(0, config.recommendations.maxRecentGames);

    await this.prisma.learnerGameProfile.upsert({
      where: { learnerId },
      update: {
        totalGamesPlayed: { increment: 1 },
        totalPlayTimeMin: { increment: Math.round((session.durationSec || 0) / 60) },
        recentGameIds: updatedRecent,
      },
      create: {
        tenantId,
        learnerId,
        totalGamesPlayed: 1,
        totalPlayTimeMin: Math.round((session.durationSec || 0) / 60),
        recentGameIds: [session.gameId],
        preferredCategories: [],
        accessibilityNeeds: [],
        skillLevels: {},
        favoriteGameIds: [],
      },
    });
  }

  private async updateLeaderboard(
    tenantId: string,
    learnerId: string,
    gameId: string,
    score: number
  ): Promise<void> {
    const now = new Date();
    const weekKey = `${now.getFullYear()}-W${String(Math.ceil((now.getDate() - now.getDay() + 1) / 7)).padStart(2, '0')}`;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Update weekly leaderboard
    await this.prisma.gameLeaderboardEntry.upsert({
      where: {
        tenantId_gameId_learnerId_periodType_periodKey: {
          tenantId,
          gameId,
          learnerId,
          periodType: 'weekly',
          periodKey: weekKey,
        },
      },
      update: {
        score: { set: score },
        achievedAt: now,
      },
      create: {
        tenantId,
        gameId,
        learnerId,
        score,
        periodType: 'weekly',
        periodKey: weekKey,
      },
    });

    // Update monthly leaderboard
    await this.prisma.gameLeaderboardEntry.upsert({
      where: {
        tenantId_gameId_learnerId_periodType_periodKey: {
          tenantId,
          gameId,
          learnerId,
          periodType: 'monthly',
          periodKey: monthKey,
        },
      },
      update: {
        score: { set: score },
        achievedAt: now,
      },
      create: {
        tenantId,
        gameId,
        learnerId,
        score,
        periodType: 'monthly',
        periodKey: monthKey,
      },
    });
  }

  private async generateBrainTrainingPlan(
    tenantId: string,
    learnerId: string,
    gradeBand: GradeBand,
    date: Date
  ): Promise<any> {
    // Get brain training games for this grade band
    const games = await this.prisma.game.findMany({
      where: {
        isActive: true,
        type: 'BRAIN_TRAINING',
        gradeBands: { has: gradeBand },
      },
    });

    // Select games targeting different skills
    const selectedGames: any[] = [];
    const targetSkills: CognitiveSkill[] = [];
    const skillsUsed = new Set<string>();

    for (const game of games) {
      if (selectedGames.length >= config.brainTraining.gamesPerSession) break;

      // Prefer games that target different skills
      const newSkill = game.cognitiveSkills.find((s: string) => !skillsUsed.has(s));
      if (newSkill || selectedGames.length < 2) {
        selectedGames.push(game);
        game.cognitiveSkills.forEach((s: string) => {
          skillsUsed.add(s);
          if (!targetSkills.includes(s as CognitiveSkill)) {
            targetSkills.push(s as CognitiveSkill);
          }
        });
      }
    }

    const plan = await this.prisma.brainTrainingPlan.create({
      data: {
        tenantId,
        learnerId,
        planDate: date,
        gameIds: selectedGames.map((g) => g.id),
        targetMinutes: config.brainTraining.defaultDurationMinutes,
        focusSkills: targetSkills,
        completedGameIds: [],
        isCompleted: false,
      },
    });

    return plan;
  }

  private async updateBrainTrainingStreak(tenantId: string, learnerId: string): Promise<void> {
    const profile = await this.prisma.learnerGameProfile.findUnique({
      where: { learnerId },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = 1;

    if (profile?.lastBrainTrainingDate) {
      const lastDate = new Date(profile.lastBrainTrainingDate);
      lastDate.setHours(0, 0, 0, 0);

      if (lastDate.getTime() === yesterday.getTime()) {
        // Continuing streak
        newStreak = (profile.brainTrainingStreak || 0) + 1;
      } else if (lastDate.getTime() === today.getTime()) {
        // Already trained today
        newStreak = profile.brainTrainingStreak || 1;
      }
    }

    await this.prisma.learnerGameProfile.upsert({
      where: { learnerId },
      update: {
        brainTrainingStreak: newStreak,
        lastBrainTrainingDate: today,
      },
      create: {
        tenantId,
        learnerId,
        brainTrainingStreak: 1,
        lastBrainTrainingDate: today,
        preferredCategories: [],
        accessibilityNeeds: [],
        skillLevels: {},
        favoriteGameIds: [],
        recentGameIds: [],
      },
    });
  }
}
