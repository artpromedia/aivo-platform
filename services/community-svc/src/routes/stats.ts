/**
 * Stats Routes
 * Community statistics endpoints
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { statsService } from '../services/stats.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getTenantId(request: FastifyRequest): string {
  return (request.headers['x-tenant-id'] as string) || 'default-tenant';
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerStatsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /stats
   * Get community statistics
   */
  app.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request);

    const stats = await statsService.getCommunityStats(tenantId);

    return reply.send({
      data: {
        totalPosts: stats.totalPosts,
        totalResources: stats.totalResources,
        totalComments: stats.totalComments,
        activeUsers: stats.activeUsers,
        trendingTopics: stats.trendingTopics.map((t) => ({
          category: t.category.toLowerCase(),
          count: t.count,
        })),
      },
    });
  });

  /**
   * GET /stats/contributors
   * Get top contributors
   */
  app.get(
    '/stats/contributors',
    async (
      request: FastifyRequest<{ Querystring: { limit?: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = getTenantId(request);
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;

      const contributors = await statsService.getTopContributors(tenantId, limit);

      return reply.send({
        data: contributors.map((c) => ({
          author: {
            id: c.authorId,
            name: c.authorName,
            role: c.authorRole.toLowerCase(),
          },
          postCount: c.postCount,
          totalLikes: c.totalLikes,
        })),
      });
    }
  );
}
