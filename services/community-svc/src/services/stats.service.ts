/**
 * Stats Service
 * Community statistics and aggregations
 */

import { prisma } from '../prisma.js';

export const statsService = {
  /**
   * Get community statistics
   */
  async getCommunityStats(tenantId: string) {
    const [totalPosts, totalResources, totalComments, recentActivity] = await Promise.all([
      prisma.post.count({
        where: { tenantId, isPublished: true },
      }),
      prisma.sharedResource.count({
        where: { tenantId, isPublished: true },
      }),
      prisma.comment.count({
        where: { tenantId },
      }),
      // Get count of active users (users who posted or commented in last 7 days)
      prisma.post.findMany({
        where: {
          tenantId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { authorId: true },
        distinct: ['authorId'],
      }),
    ]);

    return {
      totalPosts,
      totalResources,
      totalComments,
      activeUsers: recentActivity.length,
      trendingTopics: await this.getTrendingTopics(tenantId),
    };
  },

  /**
   * Get trending topics based on recent post categories
   */
  async getTrendingTopics(tenantId: string) {
    const recentPosts = await prisma.post.groupBy({
      by: ['category'],
      where: {
        tenantId,
        isPublished: true,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
      take: 5,
    });

    return recentPosts.map((p) => ({
      category: p.category,
      count: p._count.category,
    }));
  },

  /**
   * Get top contributors
   */
  async getTopContributors(tenantId: string, limit = 10) {
    const contributors = await prisma.post.groupBy({
      by: ['authorId', 'authorName', 'authorRole'],
      where: {
        tenantId,
        isPublished: true,
      },
      _count: { id: true },
      _sum: { likesCount: true },
      orderBy: [{ _count: { id: 'desc' } }],
      take: limit,
    });

    return contributors.map((c) => ({
      authorId: c.authorId,
      authorName: c.authorName,
      authorRole: c.authorRole,
      postCount: c._count.id,
      totalLikes: c._sum.likesCount ?? 0,
    }));
  },
};
