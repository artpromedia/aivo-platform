/**
 * Experiment Analytics Routes
 *
 * API endpoints for experiment performance analytics.
 * Reads from experimentation warehouse tables to provide:
 * - Experiment performance summaries
 * - Variant comparison metrics
 * - Statistical significance calculations
 * - Time series for experiment metrics
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-non-null-assertion, @typescript-eslint/array-type */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const experimentQuerySchema = z.object({
  experimentKey: z.string().optional(),
  status: z.enum(['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED']).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const metricsQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  granularity: z.enum(['day', 'week', 'month']).optional().default('day'),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

function convertToDateKey(date: Date): number {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return parseInt(`${year}${month}${day}`, 10);
}

function getDefaultDateRange(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 28); // Default to last 4 weeks
  return { from, to };
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

/**
 * Calculate z-score for proportion comparison (A/B test significance)
 * Uses pooled proportion for two-sample z-test
 */
function calculateZScore(
  controlConversions: number,
  controlSamples: number,
  treatmentConversions: number,
  treatmentSamples: number
): number {
  if (controlSamples === 0 || treatmentSamples === 0) return 0;

  const p1 = controlConversions / controlSamples;
  const p2 = treatmentConversions / treatmentSamples;
  const pooledP = (controlConversions + treatmentConversions) / (controlSamples + treatmentSamples);
  const pooledQ = 1 - pooledP;

  const standardError = Math.sqrt(pooledP * pooledQ * (1 / controlSamples + 1 / treatmentSamples));

  if (standardError === 0) return 0;
  return (p2 - p1) / standardError;
}

/**
 * Convert z-score to p-value (two-tailed)
 */
function zScoreToPValue(zScore: number): number {
  // Standard normal CDF approximation
  const absZ = Math.abs(zScore);
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989423 * Math.exp((-absZ * absZ) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return 2 * p; // Two-tailed
}

/**
 * Determine statistical significance level
 */
function getSignificanceLevel(pValue: number): string {
  if (pValue < 0.001) return 'highly_significant';
  if (pValue < 0.01) return 'very_significant';
  if (pValue < 0.05) return 'significant';
  if (pValue < 0.1) return 'marginally_significant';
  return 'not_significant';
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

export const experimentAnalyticsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /analytics/experiments
   *
   * List experiments with summary metrics.
   * Requires: ADMIN or ANALYST role
   */
  app.get('/experiments', async (request, reply) => {
    const user = getUser(request);

    // Role check - only admins and analysts can view experiment analytics
    if (!['ADMIN', 'ANALYST', 'PLATFORM_ADMIN'].includes(user.role)) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Insufficient permissions' });
    }

    const query = experimentQuerySchema.parse(request.query);
    const { from: fromStr, to: toStr, status, experimentKey } = query;

    const { from, to } =
      fromStr && toStr ? { from: parseDate(fromStr), to: parseDate(toStr) } : getDefaultDateRange();

    const fromKey = convertToDateKey(from);
    const toKey = convertToDateKey(to);

    // Query experiments from warehouse
    // Note: This assumes we have experiment metrics in the warehouse
    const experiments = await prisma.$queryRaw<
      Array<{
        experiment_key: string;
        experiment_name: string;
        status: string;
        scope: string;
        total_exposures: bigint;
        unique_subjects: bigint;
        variants_count: number;
        start_at: Date | null;
        end_at: Date | null;
      }>
    >`
      SELECT 
        e.experiment_key,
        e.experiment_name,
        e.status,
        e.scope,
        COALESCE(m.total_exposures, 0) as total_exposures,
        COALESCE(m.unique_subjects, 0) as unique_subjects,
        e.variants_count,
        e.start_at,
        e.end_at
      FROM experimentation.dim_experiment e
      LEFT JOIN (
        SELECT 
          experiment_key,
          SUM(exposures) as total_exposures,
          SUM(unique_subjects) as unique_subjects
        FROM experimentation.agg_experiment_metrics_daily
        WHERE date_key >= ${fromKey} AND date_key <= ${toKey}
        GROUP BY experiment_key
      ) m ON e.experiment_key = m.experiment_key
      WHERE (${status}::text IS NULL OR e.status = ${status})
        AND (${experimentKey}::text IS NULL OR e.experiment_key = ${experimentKey})
        AND e.tenant_id = ${user.tenantId}::uuid
      ORDER BY e.created_at DESC
    `;

    return reply.send({
      experiments: experiments.map((exp: (typeof experiments)[number]) => ({
        experimentKey: exp.experiment_key,
        name: exp.experiment_name,
        status: exp.status,
        scope: exp.scope,
        totalExposures: Number(exp.total_exposures),
        uniqueSubjects: Number(exp.unique_subjects),
        variantsCount: exp.variants_count,
        startAt: exp.start_at?.toISOString() ?? null,
        endAt: exp.end_at?.toISOString() ?? null,
      })),
      dateRange: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
    });
  });

  /**
   * GET /analytics/experiments/:experimentKey
   *
   * Get detailed analytics for a specific experiment.
   * Includes variant comparison and statistical significance.
   */
  app.get<{
    Params: { experimentKey: string };
    Querystring: { from?: string; to?: string };
  }>('/experiments/:experimentKey', async (request, reply) => {
    const user = getUser(request);

    if (!['ADMIN', 'ANALYST', 'PLATFORM_ADMIN'].includes(user.role)) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Insufficient permissions' });
    }

    const { experimentKey } = request.params;
    const query = metricsQuerySchema.parse(request.query);
    const { from: fromStr, to: toStr } = query;

    const { from, to } =
      fromStr && toStr ? { from: parseDate(fromStr), to: parseDate(toStr) } : getDefaultDateRange();

    const fromKey = convertToDateKey(from);
    const toKey = convertToDateKey(to);

    // Get experiment details
    const experiment = await prisma.$queryRaw<
      Array<{
        experiment_key: string;
        experiment_name: string;
        description: string | null;
        status: string;
        scope: string;
        start_at: Date | null;
        end_at: Date | null;
        created_at: Date;
      }>
    >`
      SELECT 
        experiment_key,
        experiment_name,
        description,
        status,
        scope,
        start_at,
        end_at,
        created_at
      FROM experimentation.dim_experiment
      WHERE experiment_key = ${experimentKey}
        AND tenant_id = ${user.tenantId}::uuid
      LIMIT 1
    `;

    if (experiment.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Experiment not found' });
    }

    const exp = experiment[0]!;

    // Get variant metrics
    const variantMetrics = await prisma.$queryRaw<
      Array<{
        variant_key: string;
        exposures: bigint;
        unique_subjects: bigint;
        conversions: bigint;
        total_value: number;
      }>
    >`
      SELECT 
        variant_key,
        SUM(exposures) as exposures,
        SUM(unique_subjects) as unique_subjects,
        SUM(conversions) as conversions,
        SUM(total_value) as total_value
      FROM experimentation.agg_experiment_metrics_daily
      WHERE experiment_key = ${experimentKey}
        AND date_key >= ${fromKey} AND date_key <= ${toKey}
      GROUP BY variant_key
      ORDER BY variant_key
    `;

    // Find control variant (usually 'control' or first alphabetically)
    const sortedVariants = [...variantMetrics].sort((a, b) =>
      a.variant_key.localeCompare(b.variant_key)
    );
    const controlVariant =
      sortedVariants.find((v) => v.variant_key === 'control') ?? sortedVariants[0];

    // Calculate relative metrics and significance
    const variants = sortedVariants.map((v) => {
      const exposures = Number(v.exposures);
      const conversions = Number(v.conversions);
      const conversionRate = exposures > 0 ? conversions / exposures : 0;

      let relativeUplift = 0;
      let zScore = 0;
      let pValue = 1;
      let significanceLevel = 'not_significant';

      if (controlVariant && v.variant_key !== controlVariant.variant_key) {
        const controlExposures = Number(controlVariant.exposures);
        const controlConversions = Number(controlVariant.conversions);
        const controlRate = controlExposures > 0 ? controlConversions / controlExposures : 0;

        relativeUplift = controlRate > 0 ? (conversionRate - controlRate) / controlRate : 0;
        zScore = calculateZScore(controlConversions, controlExposures, conversions, exposures);
        pValue = zScoreToPValue(zScore);
        significanceLevel = getSignificanceLevel(pValue);
      }

      return {
        variantKey: v.variant_key,
        exposures,
        uniqueSubjects: Number(v.unique_subjects),
        conversions,
        conversionRate: Math.round(conversionRate * 10000) / 100, // Percentage with 2 decimal places
        totalValue: v.total_value,
        avgValuePerSubject:
          Number(v.unique_subjects) > 0
            ? Math.round((v.total_value / Number(v.unique_subjects)) * 100) / 100
            : 0,
        relativeUplift: Math.round(relativeUplift * 10000) / 100, // Percentage
        significance: {
          zScore: Math.round(zScore * 1000) / 1000,
          pValue: Math.round(pValue * 10000) / 10000,
          level: significanceLevel,
          isSignificant: pValue < 0.05,
        },
      };
    });

    // Get time series data
    const timeSeries = await prisma.$queryRaw<
      Array<{
        date_key: number;
        variant_key: string;
        exposures: bigint;
        conversions: bigint;
      }>
    >`
      SELECT 
        date_key,
        variant_key,
        exposures,
        conversions
      FROM experimentation.agg_experiment_metrics_daily
      WHERE experiment_key = ${experimentKey}
        AND date_key >= ${fromKey} AND date_key <= ${toKey}
      ORDER BY date_key, variant_key
    `;

    // Group by date
    const timeSeriesGrouped = new Map<
      number,
      Record<string, { exposures: number; conversions: number }>
    >();
    for (const row of timeSeries) {
      if (!timeSeriesGrouped.has(row.date_key)) {
        timeSeriesGrouped.set(row.date_key, {});
      }
      const dateEntry = timeSeriesGrouped.get(row.date_key)!;
      dateEntry[row.variant_key] = {
        exposures: Number(row.exposures),
        conversions: Number(row.conversions),
      };
    }

    const timeSeriesFormatted = Array.from(timeSeriesGrouped.entries()).map(
      ([dateKey, variants]) => ({
        date: `${String(dateKey).slice(0, 4)}-${String(dateKey).slice(4, 6)}-${String(dateKey).slice(6, 8)}`,
        variants,
      })
    );

    return reply.send({
      experiment: {
        experimentKey: exp.experiment_key,
        name: exp.experiment_name,
        description: exp.description,
        status: exp.status,
        scope: exp.scope,
        startAt: exp.start_at?.toISOString() ?? null,
        endAt: exp.end_at?.toISOString() ?? null,
        createdAt: exp.created_at.toISOString(),
      },
      variants,
      timeSeries: timeSeriesFormatted,
      summary: {
        totalExposures: variants.reduce((sum, v) => sum + v.exposures, 0),
        totalConversions: variants.reduce((sum, v) => sum + v.conversions, 0),
        overallConversionRate:
          variants.length > 0
            ? Math.round(
                (variants.reduce((sum, v) => sum + v.conversions, 0) /
                  variants.reduce((sum, v) => sum + v.exposures, 0)) *
                  10000
              ) / 100
            : 0,
      },
      dateRange: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
    });
  });

  /**
   * GET /analytics/experiments/:experimentKey/funnel
   *
   * Get funnel analysis for an experiment.
   * Shows conversion through different stages by variant.
   */
  app.get<{
    Params: { experimentKey: string };
    Querystring: { from?: string; to?: string };
  }>('/experiments/:experimentKey/funnel', async (request, reply) => {
    const user = getUser(request);

    if (!['ADMIN', 'ANALYST', 'PLATFORM_ADMIN'].includes(user.role)) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Insufficient permissions' });
    }

    const { experimentKey } = request.params;
    const query = metricsQuerySchema.parse(request.query);
    const { from: fromStr, to: toStr } = query;

    const { from, to } =
      fromStr && toStr ? { from: parseDate(fromStr), to: parseDate(toStr) } : getDefaultDateRange();

    const fromKey = convertToDateKey(from);
    const toKey = convertToDateKey(to);

    // Get funnel metrics by variant and feature area
    const funnelData = await prisma.$queryRaw<
      Array<{
        variant_key: string;
        feature_area: string;
        exposures: bigint;
        unique_subjects: bigint;
      }>
    >`
      SELECT 
        v.variant_key,
        e.feature_area,
        COUNT(*) as exposures,
        COUNT(DISTINCT COALESCE(e.learner_id, e.tenant_id)) as unique_subjects
      FROM experimentation.fact_experiment_exposures e
      JOIN experimentation.dim_experiment_variant v ON e.variant_id = v.variant_id
      JOIN experimentation.dim_experiment exp ON v.experiment_id = exp.experiment_id
      WHERE exp.experiment_key = ${experimentKey}
        AND exp.tenant_id = ${user.tenantId}::uuid
        AND e.date_key >= ${fromKey} AND e.date_key <= ${toKey}
      GROUP BY v.variant_key, e.feature_area
      ORDER BY v.variant_key, exposures DESC
    `;

    // Group by variant
    const variantFunnels = new Map<
      string,
      Array<{ featureArea: string; exposures: number; uniqueSubjects: number }>
    >();
    for (const row of funnelData) {
      if (!variantFunnels.has(row.variant_key)) {
        variantFunnels.set(row.variant_key, []);
      }
      variantFunnels.get(row.variant_key)!.push({
        featureArea: row.feature_area,
        exposures: Number(row.exposures),
        uniqueSubjects: Number(row.unique_subjects),
      });
    }

    return reply.send({
      experimentKey,
      funnels: Array.from(variantFunnels.entries()).map(([variantKey, stages]) => ({
        variantKey,
        stages,
      })),
      dateRange: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
    });
  });

  /**
   * GET /analytics/experiments/summary
   *
   * Get high-level summary of all experiments for dashboard.
   */
  app.get('/experiments/summary', async (request, reply) => {
    const user = getUser(request);

    if (!['ADMIN', 'ANALYST', 'PLATFORM_ADMIN'].includes(user.role)) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Insufficient permissions' });
    }

    // Count experiments by status
    const statusCounts = await prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
      SELECT status, COUNT(*) as count
      FROM experimentation.dim_experiment
      WHERE tenant_id = ${user.tenantId}::uuid
      GROUP BY status
    `;

    // Get running experiments with recent activity
    const activeExperiments = await prisma.$queryRaw<
      Array<{
        experiment_key: string;
        experiment_name: string;
        total_exposures: bigint;
        last_exposure_date: number | null;
      }>
    >`
      SELECT 
        e.experiment_key,
        e.experiment_name,
        COALESCE(SUM(m.exposures), 0) as total_exposures,
        MAX(m.date_key) as last_exposure_date
      FROM experimentation.dim_experiment e
      LEFT JOIN experimentation.agg_experiment_metrics_daily m 
        ON e.experiment_key = m.experiment_key
      WHERE e.tenant_id = ${user.tenantId}::uuid
        AND e.status = 'RUNNING'
      GROUP BY e.experiment_key, e.experiment_name
      ORDER BY total_exposures DESC
      LIMIT 10
    `;

    const statusMap: Record<string, number> = {
      DRAFT: 0,
      RUNNING: 0,
      PAUSED: 0,
      COMPLETED: 0,
    };
    for (const row of statusCounts) {
      statusMap[row.status] = Number(row.count);
    }

    return reply.send({
      summary: {
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
        byStatus: statusMap,
      },
      activeExperiments: activeExperiments.map((exp: (typeof activeExperiments)[number]) => ({
        experimentKey: exp.experiment_key,
        name: exp.experiment_name,
        totalExposures: Number(exp.total_exposures),
        lastActivityDate: exp.last_exposure_date
          ? `${String(exp.last_exposure_date).slice(0, 4)}-${String(exp.last_exposure_date).slice(4, 6)}-${String(exp.last_exposure_date).slice(6, 8)}`
          : null,
      })),
    });
  });
};
