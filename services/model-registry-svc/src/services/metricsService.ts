/**
 * AIVO Model Registry Service - Metrics Service
 *
 * Business logic for model metrics management.
 */

import { prisma } from '../prisma.js';
import type { RecordMetricInput, ListMetricsQuery, PaginatedResponse } from '../types/index.js';

/**
 * Record a metric for a model version.
 */
export async function recordMetric(
  versionId: string,
  recordedBy: string | undefined,
  input: RecordMetricInput
) {
  return prisma.modelMetric.create({
    data: {
      versionId,
      name: input.name,
      category: input.category,
      value: input.value,
      unit: input.unit,
      datasetId: input.datasetId,
      datasetName: input.datasetName,
      splitName: input.splitName,
      evaluationConfig: input.evaluationConfig,
      recordedBy,
    },
  });
}

/**
 * Record multiple metrics at once.
 */
export async function recordMetricsBatch(
  versionId: string,
  recordedBy: string | undefined,
  metrics: RecordMetricInput[]
) {
  return prisma.modelMetric.createMany({
    data: metrics.map((m) => ({
      versionId,
      name: m.name,
      category: m.category,
      value: m.value,
      unit: m.unit,
      datasetId: m.datasetId,
      datasetName: m.datasetName,
      splitName: m.splitName,
      evaluationConfig: m.evaluationConfig,
      recordedBy,
    })),
  });
}

/**
 * List metrics for a version.
 */
export async function listMetrics(
  versionId: string,
  query: ListMetricsQuery
): Promise<PaginatedResponse<any>> {
  const {
    name,
    category,
    page = 1,
    pageSize = 50,
  } = query;

  const where: any = { versionId };

  if (name) {
    where.name = name;
  }

  if (category) {
    where.category = category;
  }

  const [data, totalItems] = await Promise.all([
    prisma.modelMetric.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.modelMetric.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

/**
 * Get latest metrics for a version (one per metric name).
 */
export async function getLatestMetrics(versionId: string) {
  // Get distinct metric names
  const names = await prisma.modelMetric.findMany({
    where: { versionId },
    select: { name: true },
    distinct: ['name'],
  });

  // Get latest value for each
  const metrics = await Promise.all(
    names.map(async ({ name }) => {
      return prisma.modelMetric.findFirst({
        where: { versionId, name },
        orderBy: { recordedAt: 'desc' },
      });
    })
  );

  return metrics.filter(Boolean);
}

/**
 * Get metric history over time.
 */
export async function getMetricHistory(
  versionId: string,
  metricName: string,
  limit: number = 100
) {
  return prisma.modelMetric.findMany({
    where: { versionId, name: metricName },
    orderBy: { recordedAt: 'asc' },
    take: limit,
    select: {
      id: true,
      value: true,
      recordedAt: true,
      datasetName: true,
      splitName: true,
    },
  });
}

/**
 * Delete metrics for a version.
 */
export async function deleteMetrics(versionId: string, metricName?: string) {
  const where: any = { versionId };

  if (metricName) {
    where.name = metricName;
  }

  return prisma.modelMetric.deleteMany({ where });
}

/**
 * Get aggregated metrics summary.
 */
export async function getMetricsSummary(versionId: string) {
  const metrics = await prisma.modelMetric.findMany({
    where: { versionId },
    select: {
      name: true,
      category: true,
      value: true,
      unit: true,
    },
  });

  // Group by name and calculate stats
  const byName: Record<string, { values: number[]; category: string; unit?: string }> = {};

  for (const m of metrics) {
    if (!byName[m.name]) {
      byName[m.name] = { values: [], category: m.category, unit: m.unit || undefined };
    }
    byName[m.name].values.push(m.value);
  }

  return Object.entries(byName).map(([name, data]) => {
    const values = data.values;
    const sorted = [...values].sort((a, b) => a - b);

    return {
      name,
      category: data.category,
      unit: data.unit,
      count: values.length,
      latest: values[values.length - 1],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
    };
  });
}
