/**
 * Analytics Routes for Billing Admin Dashboard
 *
 * These routes provide subscription analytics data for the admin dashboard.
 * Access should be restricted to admin users only.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

import { SubscriptionAnalyticsService } from '../services/analytics.service.js';

interface AnalyticsRoutesOptions {
  prisma: PrismaClient;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const DateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const RunAggregationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyticsRoutes(
  fastify: FastifyInstance,
  options: AnalyticsRoutesOptions
): Promise<void> {
  const { prisma } = options;
  const analyticsService = new SubscriptionAnalyticsService(prisma);

  /**
   * GET /admin/billing/analytics/snapshot
   *
   * Get the latest analytics snapshot (most recent day's data).
   */
  fastify.get(
    '/admin/billing/analytics/snapshot',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Verify admin access
      const userId = request.headers['x-user-id'] as string;
      const userRole = request.headers['x-user-role'] as string;

      if (!userId || !['admin', 'platform_admin', 'billing_admin'].includes(userRole)) {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const snapshot = await analyticsService.getLatestSnapshot();

      if (!snapshot) {
        return reply.status(404).send({
          error: 'No analytics data available',
          message: 'Run the daily aggregation job first',
        });
      }

      return reply.send({
        date: snapshot.date.toISOString().split('T')[0],
        metrics: {
          activeSubscriptions: snapshot.totalActiveSubscriptions,
          trialingSubscriptions: snapshot.totalTrialSubscriptions,
          pastDueSubscriptions: snapshot.totalPastDueSubscriptions,
          canceledSubscriptions: snapshot.totalCanceledSubscriptions,
          mrr: {
            cents: snapshot.mrrCents,
            formatted: `$${(snapshot.mrrCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          },
          arr: {
            cents: snapshot.arrCents,
            formatted: `$${(snapshot.arrCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          },
          newSubscriptions: snapshot.newSubscriptions,
          churned: snapshot.churned,
          trialConversions: snapshot.trialConversions,
        },
        addonBreakdown: snapshot.addonBreakdown,
      });
    }
  );

  /**
   * GET /admin/billing/analytics/range
   *
   * Get analytics for a date range.
   * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
   */
  fastify.get(
    '/admin/billing/analytics/range',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Verify admin access
      const userId = request.headers['x-user-id'] as string;
      const userRole = request.headers['x-user-role'] as string;

      if (!userId || !['admin', 'platform_admin', 'billing_admin'].includes(userRole)) {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const parsed = DateRangeSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: parsed.error.flatten(),
          example: '?startDate=2024-01-01&endDate=2024-01-31',
        });
      }

      const { startDate, endDate } = parsed.data;
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Validate date range
      if (start > end) {
        return reply.status(400).send({ error: 'startDate must be before endDate' });
      }

      const maxDays = 365;
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > maxDays) {
        return reply.status(400).send({
          error: `Date range exceeds maximum of ${maxDays} days`,
        });
      }

      const analytics = await analyticsService.getAnalyticsRange(start, end);

      return reply.send({
        startDate,
        endDate,
        summary: {
          avgMrr: {
            cents: Math.round(analytics.summary.avgMrrCents),
            formatted: `$${(analytics.summary.avgMrrCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          },
          totalNewSubscriptions: analytics.summary.totalNewSubscriptions,
          totalChurned: analytics.summary.totalChurned,
          netGrowth: analytics.summary.netGrowth,
          churnRate: `${analytics.summary.churnRate.toFixed(2)}%`,
          trialConversionRate: `${analytics.summary.trialConversionRate.toFixed(2)}%`,
        },
        dailyData: analytics.dailyData.map(d => ({
          date: d.date.toISOString().split('T')[0],
          activeSubscriptions: d.totalActiveSubscriptions,
          trialingSubscriptions: d.totalTrialSubscriptions,
          pastDueSubscriptions: d.totalPastDueSubscriptions,
          mrrCents: d.mrrCents,
          newSubscriptions: d.newSubscriptions,
          churned: d.churned,
          trialConversions: d.trialConversions,
        })),
      });
    }
  );

  /**
   * POST /admin/billing/analytics/run-aggregation
   *
   * Manually trigger the daily aggregation job.
   * Optionally specify a date to aggregate (defaults to yesterday).
   */
  fastify.post(
    '/admin/billing/analytics/run-aggregation',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Verify admin access
      const userId = request.headers['x-user-id'] as string;
      const userRole = request.headers['x-user-role'] as string;

      if (!userId || !['admin', 'platform_admin', 'billing_admin'].includes(userRole)) {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const parsed = RunAggregationSchema.safeParse(request.body);
      const targetDate = parsed.success && parsed.data.date
        ? new Date(parsed.data.date)
        : undefined;

      try {
        const result = await analyticsService.runDailyAggregation(targetDate);

        return reply.send({
          success: true,
          date: result.date.toISOString().split('T')[0],
          metrics: {
            activeSubscriptions: result.totalActiveSubscriptions,
            mrrCents: result.mrrCents,
            newSubscriptions: result.newSubscriptions,
            churned: result.churned,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(500).send({
          error: 'Aggregation failed',
          message,
        });
      }
    }
  );

  /**
   * GET /admin/billing/analytics/mrr-trend
   *
   * Get MRR trend data for charting (last 30 days by default).
   */
  fastify.get(
    '/admin/billing/analytics/mrr-trend',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Verify admin access
      const userId = request.headers['x-user-id'] as string;
      const userRole = request.headers['x-user-role'] as string;

      if (!userId || !['admin', 'platform_admin', 'billing_admin'].includes(userRole)) {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const query = request.query as { days?: string };
      const days = Math.min(parseInt(query.days ?? '30', 10), 90);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const analytics = await analyticsService.getAnalyticsRange(startDate, endDate);

      return reply.send({
        period: `${days} days`,
        trend: analytics.dailyData.map(d => ({
          date: d.date.toISOString().split('T')[0],
          mrrCents: d.mrrCents,
          activeSubscriptions: d.totalActiveSubscriptions,
        })),
        change: analytics.dailyData.length >= 2
          ? {
              mrrCents: analytics.dailyData[analytics.dailyData.length - 1].mrrCents - analytics.dailyData[0].mrrCents,
              subscriptions: analytics.dailyData[analytics.dailyData.length - 1].totalActiveSubscriptions - analytics.dailyData[0].totalActiveSubscriptions,
            }
          : null,
      });
    }
  );

  /**
   * GET /admin/billing/analytics/addon-adoption
   *
   * Get add-on adoption rates across the platform.
   */
  fastify.get(
    '/admin/billing/analytics/addon-adoption',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Verify admin access
      const userId = request.headers['x-user-id'] as string;
      const userRole = request.headers['x-user-role'] as string;

      if (!userId || !['admin', 'platform_admin', 'billing_admin'].includes(userRole)) {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const snapshot = await analyticsService.getLatestSnapshot();

      if (!snapshot) {
        return reply.status(404).send({ error: 'No analytics data available' });
      }

      const baseCount = snapshot.addonBreakdown['BASE'] ?? snapshot.totalActiveSubscriptions;

      const addons = [
        { sku: 'ADDON_SEL', name: 'Social-Emotional Learning' },
        { sku: 'ADDON_SPEECH', name: 'Speech & Language' },
        { sku: 'ADDON_SCIENCE', name: 'Science Content' },
      ];

      const adoption = addons.map(addon => {
        const count = snapshot.addonBreakdown[addon.sku as keyof typeof snapshot.addonBreakdown] ?? 0;
        const rate = baseCount > 0 ? (count / baseCount) * 100 : 0;
        return {
          sku: addon.sku,
          name: addon.name,
          subscriberCount: count,
          adoptionRate: `${rate.toFixed(1)}%`,
        };
      });

      return reply.send({
        date: snapshot.date.toISOString().split('T')[0],
        totalBaseSubscriptions: baseCount,
        addons: adoption,
      });
    }
  );
}
