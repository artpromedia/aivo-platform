/**
 * AIVO IEP Service - Progress Visualization Routes
 *
 * PRD: Time-series API for progress trend charts.
 * GET /progress/goals/:goalId/timeseries — progress data points over time
 * GET /progress/ieps/:iepId/summary     — aggregated progress across all goals
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';

export default async function progressRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /progress/goals/:goalId/timeseries
   * Returns time-series progress data for a single goal (for line charts).
   */
  fastify.get('/goals/:goalId/timeseries', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { goalId } = request.params as { goalId: string };
    const { from, to } = request.query as { from?: string; to?: string };

    const goal = await prisma.iEPGoal.findFirst({
      where: { id: goalId },
      include: { iep: { select: { tenantId: true } } },
    });

    if (!goal || goal.iep.tenantId !== tenantId) {
      return reply.status(404).send({ error: 'Goal not found' });
    }

    const where: any = { goalId };
    if (from || to) {
      where.recordDate = {};
      if (from) where.recordDate.gte = new Date(from);
      if (to) where.recordDate.lte = new Date(to);
    }

    const dataPoints = await prisma.progressData.findMany({
      where,
      orderBy: { recordDate: 'asc' },
      select: {
        id: true,
        recordDate: true,
        progressLevel: true,
        measurementType: true,
        measurementValue: true,
        notes: true,
        recordedBy: true,
      },
    });

    // Map progress levels to numeric values for charting
    const series = dataPoints.map((dp) => ({
      ...dp,
      numericValue: progressLevelToNumeric(dp.progressLevel),
    }));

    return reply.send({
      goalId,
      goalDomain: goal.domain,
      goalDescription: goal.description,
      baseline: goal.baseline,
      targetCriteria: goal.targetCriteria,
      dataPoints: series,
      summary: {
        totalEntries: series.length,
        latestLevel: series.length > 0 ? series[series.length - 1]!.progressLevel : null,
        trend: calculateTrend(series.map((s) => s.numericValue)),
      },
    });
  });

  /**
   * GET /progress/ieps/:iepId/summary
   * Returns aggregated progress summary across all goals for an IEP.
   */
  fastify.get('/ieps/:iepId/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { iepId } = request.params as { iepId: string };

    const iep = await prisma.iEP.findFirst({
      where: { id: iepId, tenantId },
      include: {
        goals: {
          include: {
            progressData: {
              orderBy: { recordDate: 'desc' },
              take: 10,
            },
          },
          orderBy: { goalNumber: 'asc' },
        },
        student: { select: { firstName: true, lastName: true } },
      },
    });

    if (!iep) {
      return reply.status(404).send({ error: 'IEP not found' });
    }

    const goalSummaries = iep.goals.map((goal) => {
      const latest = goal.progressData[0];
      const numericValues = goal.progressData
        .reverse()
        .map((dp) => progressLevelToNumeric(dp.progressLevel));

      return {
        goalId: goal.id,
        goalNumber: goal.goalNumber,
        domain: goal.domain,
        description: goal.description,
        status: goal.status,
        targetDate: goal.targetDate,
        latestProgress: latest
          ? {
              level: latest.progressLevel,
              numericValue: progressLevelToNumeric(latest.progressLevel),
              recordDate: latest.recordDate,
              notes: latest.notes,
            }
          : null,
        dataPointCount: goal.progressData.length,
        trend: calculateTrend(numericValues),
      };
    });

    return reply.send({
      iepId,
      studentName: `${iep.student.firstName} ${iep.student.lastName}`,
      status: iep.status,
      goals: goalSummaries,
      overallProgress: {
        totalGoals: goalSummaries.length,
        goalsWithData: goalSummaries.filter((g) => g.dataPointCount > 0).length,
        averageProgress:
          goalSummaries.length > 0
            ? Math.round(
                goalSummaries
                  .filter((g) => g.latestProgress)
                  .reduce((sum, g) => sum + (g.latestProgress?.numericValue ?? 0), 0) /
                  Math.max(goalSummaries.filter((g) => g.latestProgress).length, 1)
              )
            : 0,
      },
    });
  });
}

function progressLevelToNumeric(level: string): number {
  const mapping: Record<string, number> = {
    NO_PROGRESS: 0,
    REGRESSION: 5,
    MINIMAL_PROGRESS: 20,
    SOME_PROGRESS: 40,
    ADEQUATE_PROGRESS: 60,
    SIGNIFICANT_PROGRESS: 80,
    MASTERED: 100,
  };
  return mapping[level] ?? 0;
}

function calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' | 'insufficient_data' {
  if (values.length < 2) return 'insufficient_data';
  const recent = values.slice(-3);
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const older = values.slice(0, Math.max(1, values.length - 3));
  const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = avgRecent - avgOlder;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}
