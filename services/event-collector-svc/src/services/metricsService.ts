/**
 * AIVO Event Collector Service - Metrics Service
 *
 * Tracks event processing metrics and health statistics.
 */

import { prisma } from '../prisma.js';
import { config } from '../config.js';
import type { EventMetricsSummary } from '../types/index.js';

// In-memory metrics buffer
interface MetricsBuffer {
  received: number;
  processed: number;
  failed: number;
  deadLettered: number;
  totalLatencyMs: number;
  latencySamples: number[];
  bytesReceived: number;
  windowStart: Date;
}

const metricsBuffer = new Map<string, MetricsBuffer>();
const FLUSH_INTERVAL = 60000; // 1 minute
const LATENCY_SAMPLE_SIZE = 100;

let flushInterval: NodeJS.Timeout | null = null;

/**
 * Initialize metrics service.
 */
export function initMetrics(): void {
  if (flushInterval) {
    clearInterval(flushInterval);
  }

  flushInterval = setInterval(() => {
    flushMetrics().catch((error) => {
      console.error('Failed to flush metrics:', error);
    });
  }, FLUSH_INTERVAL);

  console.log('Metrics service initialized');
}

/**
 * Shutdown metrics service.
 */
export async function shutdownMetrics(): Promise<void> {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }

  // Final flush
  await flushMetrics();
}

/**
 * Record event received.
 */
export function recordEventReceived(tenantId: string, eventSize: number): void {
  const buffer = getOrCreateBuffer(tenantId);
  buffer.received++;
  buffer.bytesReceived += eventSize;
}

/**
 * Record event processed.
 */
export function recordEventProcessed(tenantId: string, latencyMs: number): void {
  const buffer = getOrCreateBuffer(tenantId);
  buffer.processed++;
  buffer.totalLatencyMs += latencyMs;

  // Keep a sample of latencies for percentile calculation
  if (buffer.latencySamples.length < LATENCY_SAMPLE_SIZE) {
    buffer.latencySamples.push(latencyMs);
  } else {
    // Random replacement
    const index = Math.floor(Math.random() * LATENCY_SAMPLE_SIZE);
    buffer.latencySamples[index] = latencyMs;
  }
}

/**
 * Record event failed.
 */
export function recordEventFailed(tenantId: string): void {
  const buffer = getOrCreateBuffer(tenantId);
  buffer.failed++;
}

/**
 * Record event dead lettered.
 */
export function recordEventDeadLettered(tenantId: string): void {
  const buffer = getOrCreateBuffer(tenantId);
  buffer.deadLettered++;
}

/**
 * Get or create metrics buffer for tenant.
 */
function getOrCreateBuffer(tenantId: string): MetricsBuffer {
  let buffer = metricsBuffer.get(tenantId);

  if (!buffer) {
    buffer = {
      received: 0,
      processed: 0,
      failed: 0,
      deadLettered: 0,
      totalLatencyMs: 0,
      latencySamples: [],
      bytesReceived: 0,
      windowStart: new Date(),
    };
    metricsBuffer.set(tenantId, buffer);
  }

  return buffer;
}

/**
 * Flush metrics to database.
 */
async function flushMetrics(): Promise<void> {
  const now = new Date();
  const entries: Array<{
    tenantId: string;
    windowStart: Date;
    windowEnd: Date;
    eventsReceived: number;
    eventsProcessed: number;
    eventsFailed: number;
    eventsDeadLettered: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    bytesReceived: bigint;
    eventsPerSecond: number;
    bytesPerSecond: number;
  }> = [];

  for (const [tenantId, buffer] of metricsBuffer.entries()) {
    if (buffer.received === 0 && buffer.processed === 0) {
      continue; // Skip empty buffers
    }

    const windowDurationSec = (now.getTime() - buffer.windowStart.getTime()) / 1000;
    const avgLatency = buffer.latencySamples.length > 0
      ? buffer.totalLatencyMs / buffer.latencySamples.length
      : 0;

    // Calculate percentiles
    const sortedLatencies = [...buffer.latencySamples].sort((a, b) => a - b);
    const p50 = percentile(sortedLatencies, 50);
    const p95 = percentile(sortedLatencies, 95);
    const p99 = percentile(sortedLatencies, 99);

    entries.push({
      tenantId,
      windowStart: buffer.windowStart,
      windowEnd: now,
      eventsReceived: buffer.received,
      eventsProcessed: buffer.processed,
      eventsFailed: buffer.failed,
      eventsDeadLettered: buffer.deadLettered,
      avgLatencyMs: Math.round(avgLatency),
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      bytesReceived: BigInt(buffer.bytesReceived),
      eventsPerSecond: windowDurationSec > 0 ? buffer.received / windowDurationSec : 0,
      bytesPerSecond: windowDurationSec > 0 ? buffer.bytesReceived / windowDurationSec : 0,
    });

    // Reset buffer
    buffer.received = 0;
    buffer.processed = 0;
    buffer.failed = 0;
    buffer.deadLettered = 0;
    buffer.totalLatencyMs = 0;
    buffer.latencySamples = [];
    buffer.bytesReceived = 0;
    buffer.windowStart = now;
  }

  if (entries.length > 0) {
    await prisma.eventMetrics.createMany({ data: entries });
  }
}

/**
 * Calculate percentile from sorted array.
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

/**
 * Get metrics summary for a tenant.
 */
export async function getMetricsSummary(
  tenantId: string,
  hours: number = 24
): Promise<EventMetricsSummary> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const metrics = await prisma.eventMetrics.findMany({
    where: {
      tenantId,
      windowStart: { gte: since },
    },
  });

  if (metrics.length === 0) {
    return {
      received: 0,
      processed: 0,
      failed: 0,
      deadLettered: 0,
      avgLatencyMs: 0,
      p99LatencyMs: 0,
      eventsPerSecond: 0,
      bytesPerSecond: 0,
    };
  }

  const totals = metrics.reduce(
    (acc, m) => ({
      received: acc.received + m.eventsReceived,
      processed: acc.processed + m.eventsProcessed,
      failed: acc.failed + m.eventsFailed,
      deadLettered: acc.deadLettered + m.eventsDeadLettered,
      totalLatency: acc.totalLatency + m.avgLatencyMs * m.eventsProcessed,
      maxP99: Math.max(acc.maxP99, m.p99LatencyMs),
      totalEps: acc.totalEps + m.eventsPerSecond,
      totalBps: acc.totalBps + m.bytesPerSecond,
    }),
    {
      received: 0,
      processed: 0,
      failed: 0,
      deadLettered: 0,
      totalLatency: 0,
      maxP99: 0,
      totalEps: 0,
      totalBps: 0,
    }
  );

  return {
    received: totals.received,
    processed: totals.processed,
    failed: totals.failed,
    deadLettered: totals.deadLettered,
    avgLatencyMs: totals.processed > 0 ? Math.round(totals.totalLatency / totals.processed) : 0,
    p99LatencyMs: totals.maxP99,
    eventsPerSecond: metrics.length > 0 ? totals.totalEps / metrics.length : 0,
    bytesPerSecond: metrics.length > 0 ? totals.totalBps / metrics.length : 0,
  };
}

/**
 * Get metrics time series for a tenant.
 */
export async function getMetricsTimeSeries(
  tenantId: string,
  hours: number = 24,
  resolution: 'minute' | 'hour' | 'day' = 'hour'
): Promise<Array<{
  timestamp: string;
  received: number;
  processed: number;
  failed: number;
  avgLatencyMs: number;
}>> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const metrics = await prisma.eventMetrics.findMany({
    where: {
      tenantId,
      windowStart: { gte: since },
    },
    orderBy: { windowStart: 'asc' },
  });

  // Group by resolution
  const grouped = new Map<string, {
    received: number;
    processed: number;
    failed: number;
    totalLatency: number;
    count: number;
  }>();

  for (const m of metrics) {
    let key: string;
    const date = new Date(m.windowStart);

    switch (resolution) {
      case 'minute':
        key = date.toISOString().slice(0, 16);
        break;
      case 'hour':
        key = date.toISOString().slice(0, 13);
        break;
      case 'day':
        key = date.toISOString().slice(0, 10);
        break;
    }

    const existing = grouped.get(key) || {
      received: 0,
      processed: 0,
      failed: 0,
      totalLatency: 0,
      count: 0,
    };

    existing.received += m.eventsReceived;
    existing.processed += m.eventsProcessed;
    existing.failed += m.eventsFailed;
    existing.totalLatency += m.avgLatencyMs * m.eventsProcessed;
    existing.count++;

    grouped.set(key, existing);
  }

  return Array.from(grouped.entries()).map(([timestamp, data]) => ({
    timestamp,
    received: data.received,
    processed: data.processed,
    failed: data.failed,
    avgLatencyMs: data.processed > 0 ? Math.round(data.totalLatency / data.processed) : 0,
  }));
}

/**
 * Update collector health status.
 */
export async function updateCollectorHealth(status: {
  isHealthy: boolean;
  queueDepth: number;
  processingRate: number;
  errorRate: number;
  lastError?: string;
}): Promise<void> {
  await prisma.collectorHealth.upsert({
    where: { instanceId: config.instanceId },
    create: {
      instanceId: config.instanceId,
      ...status,
      lastHeartbeat: new Date(),
    },
    update: {
      ...status,
      lastHeartbeat: new Date(),
    },
  });
}

/**
 * Get all collector instances health.
 */
export async function getCollectorHealthStatus(): Promise<Array<{
  instanceId: string;
  isHealthy: boolean;
  queueDepth: number;
  processingRate: number;
  errorRate: number;
  lastHeartbeat: Date;
  lastError: string | null;
}>> {
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes

  const instances = await prisma.collectorHealth.findMany({
    orderBy: { lastHeartbeat: 'desc' },
  });

  return instances.map((i) => ({
    ...i,
    isHealthy: i.isHealthy && i.lastHeartbeat > staleThreshold,
  }));
}

/**
 * Clean up stale collector health records.
 */
export async function cleanupStaleCollectors(): Promise<number> {
  const staleThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes

  const result = await prisma.collectorHealth.deleteMany({
    where: { lastHeartbeat: { lt: staleThreshold } },
  });

  return result.count;
}

/**
 * Get event processing breakdown by type.
 */
export async function getEventTypeBreakdown(
  tenantId: string,
  hours: number = 24
): Promise<Array<{ eventType: string; count: number; avgLatencyMs: number }>> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const events = await prisma.event.groupBy({
    by: ['eventType'],
    where: {
      tenantId,
      createdAt: { gte: since },
      status: 'PROCESSED',
    },
    _count: { eventType: true },
    _avg: { processingTime: true },
    orderBy: { _count: { eventType: 'desc' } },
    take: 20,
  });

  return events.map((e) => ({
    eventType: e.eventType,
    count: e._count.eventType,
    avgLatencyMs: Math.round(e._avg.processingTime || 0),
  }));
}

/**
 * Get destination delivery breakdown.
 */
export async function getDeliveryBreakdown(
  tenantId: string,
  hours: number = 24
): Promise<Array<{ routeName: string; success: number; failed: number; avgLatencyMs: number }>> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const routes = await prisma.eventRoute.findMany({
    where: { tenantId },
    select: { id: true, name: true },
  });

  const routeMap = new Map(routes.map((r) => [r.id, r.name]));

  const deliveries = await prisma.deliveryAttempt.groupBy({
    by: ['routeId', 'status'],
    where: {
      attemptedAt: { gte: since },
      route: { tenantId },
    },
    _count: { status: true },
  });

  const breakdown = new Map<string, { success: number; failed: number }>();

  for (const d of deliveries) {
    const routeName = routeMap.get(d.routeId) || d.routeId;
    const existing = breakdown.get(routeName) || { success: 0, failed: 0 };

    if (d.status === 'SUCCESS') {
      existing.success += d._count.status;
    } else {
      existing.failed += d._count.status;
    }

    breakdown.set(routeName, existing);
  }

  return Array.from(breakdown.entries()).map(([routeName, data]) => ({
    routeName,
    success: data.success,
    failed: data.failed,
    avgLatencyMs: 0, // Would need additional query for accurate latency
  }));
}
