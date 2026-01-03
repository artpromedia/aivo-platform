/**
 * Leaderboard Service
 *
 * Manages competitive leaderboards with:
 * - Multiple scopes (class, school, global)
 * - Multiple periods (daily, weekly, monthly, all-time)
 * - Privacy controls (opt-in)
 * - Efficient Redis-backed rankings
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

import { prisma } from '../prisma.js';
import { redis } from '../redis.js';
import { LeaderboardEntry, LeaderboardPeriod, LeaderboardType, LeaderboardResponse } from '../types/gamification.types.js';

// ============================================================================
// LEADERBOARD SERVICE
// ============================================================================

class LeaderboardService {
  private readonly LEADERBOARD_PREFIX = 'leaderboard';

  /**
   * Get leaderboard entries
   */
  async getLeaderboard(
    options: {
      type?: LeaderboardType;
      period?: LeaderboardPeriod;
      scope?: 'global' | 'school' | 'class';
      scopeId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<LeaderboardResponse> {
    const {
      type = 'xp',
      period = 'weekly',
      scope = 'global',
      scopeId,
      limit = 50,
      offset = 0,
    } = options;

    const key = this.getLeaderboardKey(type, period, scope, scopeId);

    try {
      // Try to get from Redis cache
      const cached = await redis.zrevrange(key, offset, offset + limit - 1, 'WITHSCORES');

      if (cached && cached.length > 0) {
        const entries = await this.hydrateLeaderboardEntries(cached, offset);
        const total = await redis.zcard(key);

        return {
          entries,
          total,
          period,
          updatedAt: new Date(),
        };
      }
    } catch (error) {
      console.warn('Redis unavailable, falling back to database:', error);
    }

    // Fall back to database
    return this.getLeaderboardFromDatabase(type, period, scope, scopeId, limit, offset);
  }

  /**
   * Get a player's rank on a leaderboard
   */
  async getPlayerRank(
    studentId: string,
    period: LeaderboardPeriod = 'weekly',
    options?: {
      type?: LeaderboardType;
      scope?: 'global' | 'school' | 'class';
      scopeId?: string;
    }
  ): Promise<number | null> {
    const { type = 'xp', scope = 'global', scopeId } = options || {};

    // Check if player has opted in
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: { settings: true },
    });

    const settings = profile?.settings as { showOnLeaderboard?: boolean } | null;
    if (!settings?.showOnLeaderboard) {
      return null;
    }

    const key = this.getLeaderboardKey(type, period, scope, scopeId);

    try {
      const rank = await redis.zrevrank(key, studentId);
      return rank !== null ? rank + 1 : null;
    } catch {
      // Fall back to database
      return this.getPlayerRankFromDatabase(studentId, type, period, scope, scopeId);
    }
  }

  /**
   * Get a player's position with surrounding entries
   */
  async getPlayerContext(
    studentId: string,
    period: LeaderboardPeriod = 'weekly',
    contextSize: number = 2
  ): Promise<{
    rank: number | null;
    entries: LeaderboardEntry[];
    playerEntry: LeaderboardEntry | null;
  }> {
    const rank = await this.getPlayerRank(studentId, period);

    if (rank === null) {
      return { rank: null, entries: [], playerEntry: null };
    }

    const startRank = Math.max(0, rank - 1 - contextSize);
    const endRank = rank - 1 + contextSize;

    const key = this.getLeaderboardKey('xp', period, 'global');

    try {
      const cached = await redis.zrevrange(key, startRank, endRank, 'WITHSCORES');
      const entries = await this.hydrateLeaderboardEntries(cached, startRank);

      const playerEntry = entries.find((e) => e.studentId === studentId) || null;

      return { rank, entries, playerEntry };
    } catch {
      return { rank, entries: [], playerEntry: null };
    }
  }

  /**
   * Update player's score on leaderboards
   */
  async updatePlayerScore(studentId: string, xpEarned: number): Promise<void> {
    // Check if player has opted in
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: {
        settings: true,
      },
    });

    const settings = profile?.settings as { showOnLeaderboard?: boolean } | null;
    if (!settings?.showOnLeaderboard) {
      return;
    }

    const periods: LeaderboardPeriod[] = ['daily', 'weekly', 'monthly', 'all_time'];

    try {
      for (const period of periods) {
        // Global leaderboard
        const globalKey = this.getLeaderboardKey('xp', period, 'global');
        await redis.zincrby(globalKey, xpEarned, studentId);
      }
    } catch (error) {
      console.warn('Failed to update Redis leaderboard:', error);
    }
  }

  /**
   * Archive weekly leaderboard
   */
  async archiveWeekly(): Promise<void> {
    const now = new Date();
    const weekKey = `${now.getFullYear()}-W${this.getWeekNumber(now)}`;

    const globalKey = this.getLeaderboardKey('xp', 'weekly', 'global');

    try {
      const topEntries = await redis.zrevrange(globalKey, 0, 99, 'WITHSCORES');

      if (topEntries.length > 0) {
        await prisma.leaderboardArchive.create({
          data: {
            type: 'xp',
            period: 'weekly',
            scope: 'global',
            periodKey: weekKey,
            entries: this.parseRedisEntries(topEntries),
            archivedAt: now,
          },
        });
      }

      // Clear weekly leaderboards
      const keys = await redis.keys(`${this.LEADERBOARD_PREFIX}:xp:weekly:*`);
      for (const key of keys) {
        await redis.del(key);
      }
    } catch (error) {
      console.error('Failed to archive weekly leaderboard:', error);
    }

    console.log(`Weekly leaderboards archived: ${weekKey}`);
  }

  /**
   * Archive monthly leaderboard
   */
  async archiveMonthly(): Promise<void> {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const globalKey = this.getLeaderboardKey('xp', 'monthly', 'global');

    try {
      const topEntries = await redis.zrevrange(globalKey, 0, 99, 'WITHSCORES');

      if (topEntries.length > 0) {
        await prisma.leaderboardArchive.create({
          data: {
            type: 'xp',
            period: 'monthly',
            scope: 'global',
            periodKey: monthKey,
            entries: this.parseRedisEntries(topEntries),
            archivedAt: now,
          },
        });
      }

      // Clear monthly leaderboards
      const keys = await redis.keys(`${this.LEADERBOARD_PREFIX}:xp:monthly:*`);
      for (const key of keys) {
        await redis.del(key);
      }
    } catch (error) {
      console.error('Failed to archive monthly leaderboard:', error);
    }

    console.log(`Monthly leaderboards archived: ${monthKey}`);
  }

  /**
   * Rebuild leaderboard from database
   */
  async rebuildLeaderboard(
    type: LeaderboardType,
    period: LeaderboardPeriod,
    scope: 'global' | 'school' | 'class' = 'global',
    scopeId?: string
  ): Promise<void> {
    const key = this.getLeaderboardKey(type, period, scope, scopeId);

    try {
      // Clear existing
      await redis.del(key);

      // Get score field based on type and period
      let scoreField: string;
      switch (type) {
        case 'xp':
          scoreField =
            period === 'all_time'
              ? 'totalXp'
              : period === 'monthly'
              ? 'monthXp'
              : period === 'weekly'
              ? 'weekXp'
              : 'todayXp';
          break;
        case 'lessons':
          scoreField = 'lessonsCompleted';
          break;
        case 'streak':
          scoreField = 'streakDays';
          break;
        default:
          scoreField = 'totalXp';
      }

      // Get all opted-in players
      const players = await prisma.playerProfile.findMany({
        where: {
          settings: {
            path: ['showOnLeaderboard'],
            equals: true,
          },
        },
        select: {
          studentId: true,
          totalXp: true,
          weekXp: true,
          monthXp: true,
          todayXp: true,
          lessonsCompleted: true,
          streakDays: true,
        },
      });

      // Add to Redis sorted set
      const pipeline = redis.pipeline();
      for (const player of players) {
        const score = (player as Record<string, number>)[scoreField] || 0;
        pipeline.zadd(key, score, player.studentId);
      }
      await pipeline.exec();

      // Set expiry for non-all-time leaderboards
      if (period !== 'all_time') {
        const ttl = period === 'daily' ? 86400 * 2 : period === 'weekly' ? 86400 * 8 : 86400 * 32;
        await redis.expire(key, ttl);
      }

      console.log(`Leaderboard rebuilt: ${type}/${period}/${scope} (${players.length} players)`);
    } catch (error) {
      console.error('Failed to rebuild leaderboard:', error);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private getLeaderboardKey(
    type: LeaderboardType,
    period: LeaderboardPeriod,
    scope: string,
    scopeId?: string
  ): string {
    const parts = [this.LEADERBOARD_PREFIX, type, period, scope];
    if (scopeId) {
      parts.push(scopeId);
    }
    return parts.join(':');
  }

  private async hydrateLeaderboardEntries(redisData: string[], startRank: number): Promise<LeaderboardEntry[]> {
    const entries: LeaderboardEntry[] = [];

    // Redis returns [member, score, member, score, ...]
    for (let i = 0; i < redisData.length; i += 2) {
      const studentId = redisData[i];
      const score = parseInt(redisData[i + 1], 10);

      entries.push({
        rank: startRank + i / 2 + 1,
        studentId,
        score,
        displayName: '',
        avatarUrl: null,
        level: 1,
      });
    }

    // Fetch player details
    const studentIds = entries.map((e) => e.studentId);
    const profiles = await prisma.playerProfile.findMany({
      where: { studentId: { in: studentIds } },
    });

    const profileMap = new Map<string, { level: number }>(
      profiles.map((p: any) => [p.studentId, p])
    );

    for (const entry of entries) {
      const profile = profileMap.get(entry.studentId);
      if (profile) {
        entry.displayName = `Player ${entry.studentId.slice(-4)}`;
        entry.level = profile.level;
      }
    }

    return entries;
  }

  private async getLeaderboardFromDatabase(
    type: LeaderboardType,
    period: LeaderboardPeriod,
    scope: string,
    scopeId: string | undefined,
    limit: number,
    offset: number
  ): Promise<LeaderboardResponse> {
    let orderBy: Record<string, 'asc' | 'desc'>;
    switch (type) {
      case 'xp':
        orderBy =
          period === 'all_time'
            ? { totalXp: 'desc' }
            : period === 'monthly'
            ? { monthXp: 'desc' }
            : period === 'weekly'
            ? { weekXp: 'desc' }
            : { todayXp: 'desc' };
        break;
      case 'lessons':
        orderBy = { lessonsCompleted: 'desc' };
        break;
      case 'streak':
        orderBy = { streakDays: 'desc' };
        break;
      default:
        orderBy = { totalXp: 'desc' };
    }

    const where = {
      settings: {
        path: ['showOnLeaderboard'],
        equals: true,
      },
    };

    const [profiles, total] = await Promise.all([
      prisma.playerProfile.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.playerProfile.count({ where }),
    ]);

    const scoreField =
      type === 'lessons'
        ? 'lessonsCompleted'
        : type === 'streak'
        ? 'streakDays'
        : period === 'all_time'
        ? 'totalXp'
        : period === 'monthly'
        ? 'monthXp'
        : period === 'weekly'
        ? 'weekXp'
        : 'todayXp';

    const entries: LeaderboardEntry[] = profiles.map((p, index) => ({
      rank: offset + index + 1,
      studentId: p.studentId,
      displayName: `Player ${p.studentId.slice(-4)}`,
      avatarUrl: null,
      score: (p as Record<string, number>)[scoreField] || 0,
      level: p.level,
    }));

    return {
      entries,
      total,
      period,
      updatedAt: new Date(),
    };
  }

  private async getPlayerRankFromDatabase(
    studentId: string,
    type: LeaderboardType,
    period: LeaderboardPeriod,
    scope: string,
    scopeId?: string
  ): Promise<number | null> {
    // Simplified rank calculation from database
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
    });

    if (!profile) return null;

    const scoreField =
      type === 'lessons'
        ? 'lessonsCompleted'
        : type === 'streak'
        ? 'streakDays'
        : period === 'all_time'
        ? 'totalXp'
        : period === 'monthly'
        ? 'monthXp'
        : period === 'weekly'
        ? 'weekXp'
        : 'todayXp';

    const playerScore = (profile as Record<string, number>)[scoreField] || 0;

    const rank = await prisma.playerProfile.count({
      where: {
        settings: {
          path: ['showOnLeaderboard'],
          equals: true,
        },
        [scoreField]: { gt: playerScore },
      },
    });

    return rank + 1;
  }

  private parseRedisEntries(data: string[]): Array<{ studentId: string; score: number }> {
    const entries = [];
    for (let i = 0; i < data.length; i += 2) {
      entries.push({
        studentId: data[i],
        score: parseInt(data[i + 1], 10),
      });
    }
    return entries;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}

export const leaderboardService = new LeaderboardService();
