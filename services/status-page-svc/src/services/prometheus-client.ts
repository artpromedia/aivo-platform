// ==============================================================================
// AIVO Status Page Service — Prometheus Client
// ==============================================================================
// Queries the AIVO platform's Prometheus instance to get component health,
// error rates, and latency metrics.

import { COMPONENTS } from '../components.js';
import { config } from '../config.js';
import type { PrometheusQueryResult, MetricSnapshot } from '../types.js';

/**
 * Execute an instant query against Prometheus.
 */
async function queryPrometheus(promQL: string): Promise<PrometheusQueryResult> {
  const url = `${config.prometheusUrl}/api/v1/query?query=${encodeURIComponent(promQL)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!res.ok) {
    throw new Error(`Prometheus query failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as PrometheusQueryResult;
}

/**
 * Execute a range query against Prometheus (used for uptime history).
 */
export async function queryPrometheusRange(
  promQL: string,
  start: number,
  end: number,
  step: string,
): Promise<PrometheusQueryResult> {
  const params = new URLSearchParams({
    query: promQL,
    start: start.toString(),
    end: end.toString(),
    step,
  });
  const url = `${config.prometheusUrl}/api/v1/query_range?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new Error(`Prometheus range query failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as PrometheusQueryResult;
}

/**
 * Check whether a component is healthy (up metric == 1).
 */
async function checkHealth(query: string): Promise<boolean> {
  try {
    const result = await queryPrometheus(query);
    if (result.status !== 'success' || result.data.result.length === 0) {
      return false;
    }
    const value = result.data.result[0]?.value?.[1];
    return value === '1';
  } catch {
    // If Prometheus is unreachable we can't determine health — assume unknown
    return true;
  }
}

/**
 * Get error rate for a component (0-1 float, null if unavailable).
 */
async function checkErrorRate(query: string): Promise<number | null> {
  try {
    const result = await queryPrometheus(query);
    if (result.status !== 'success' || result.data.result.length === 0) {
      return null;
    }
    const value = parseFloat(result.data.result[0]?.value?.[1] ?? 'NaN');
    return isNaN(value) ? null : value;
  } catch {
    return null;
  }
}

/**
 * Get P95 latency in milliseconds (null if unavailable).
 */
async function checkLatency(query: string): Promise<number | null> {
  try {
    const result = await queryPrometheus(query);
    if (result.status !== 'success' || result.data.result.length === 0) {
      return null;
    }
    const value = parseFloat(result.data.result[0]?.value?.[1] ?? 'NaN');
    return isNaN(value) ? null : value * 1000; // seconds → ms
  } catch {
    return null;
  }
}

/**
 * Collect a full health snapshot for every defined component.
 */
export async function collectMetricSnapshots(): Promise<MetricSnapshot[]> {
  const snapshots: MetricSnapshot[] = [];
  const now = new Date().toISOString();

  // Run checks in parallel for speed
  const checks = COMPONENTS.map(async (component) => {
    const [isHealthy, errorRate, p95Latency] = await Promise.all([
      checkHealth(component.healthQuery),
      component.errorRateQuery ? checkErrorRate(component.errorRateQuery) : Promise.resolve(null),
      component.latencyQuery ? checkLatency(component.latencyQuery) : Promise.resolve(null),
    ]);

    snapshots.push({
      component_id: component.id,
      is_healthy: isHealthy,
      error_rate: errorRate,
      p95_latency_ms: p95Latency,
      timestamp: now,
    });
  });

  await Promise.allSettled(checks);
  return snapshots;
}

/**
 * Get uptime percentage for a component over the last N days.
 */
export async function getUptimeHistory(
  componentId: string,
  days = 90,
): Promise<{ date: string; uptime: number }[]> {
  const component = COMPONENTS.find((c) => c.id === componentId);
  if (!component) return [];

  const end = Math.floor(Date.now() / 1000);
  const start = end - days * 86400;

  try {
    const result = await queryPrometheusRange(
      `avg_over_time(${component.healthQuery}[1d])`,
      start,
      end,
      '1d',
    );

    if (result.status !== 'success' || result.data.result.length === 0) {
      return [];
    }

    return (result.data.result[0]?.values ?? []).map(([ts, val]) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      uptime: parseFloat(val) * 100,
    }));
  } catch {
    return [];
  }
}
