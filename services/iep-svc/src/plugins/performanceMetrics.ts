/**
 * IEP Progress Performance Benchmarking
 *
 * Tracks response-time metrics (p50, p95, p99) for progress-related
 * endpoints. Exposes a /metrics/progress endpoint for observability
 * and health dashboarding.
 *
 * PRD requirement: Performance benchmarking for IEP progress updates
 * to ensure sub-second response times under load.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface LatencyBucket {
  route: string;
  method: string;
  /** Raw latency samples (ring buffer, last N) */
  samples: number[];
  totalRequests: number;
  totalErrors: number;
  /** Running sum of all latencies (for mean) */
  latencySum: number;
}

interface PercentileStats {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  min: number;
  max: number;
}

export interface ProgressMetrics {
  uptime: number;
  collectedAt: string;
  endpoints: {
    route: string;
    method: string;
    totalRequests: number;
    totalErrors: number;
    latencyMs: PercentileStats;
    /** Whether p95 meets the <500ms SLA */
    meetsSla: boolean;
  }[];
  overall: {
    totalRequests: number;
    totalErrors: number;
    latencyMs: PercentileStats;
    meetsSla: boolean;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/** Maximum samples kept per route (ring buffer) */
const MAX_SAMPLES = 2000;

/** SLA threshold: p95 must be below this (milliseconds) */
const SLA_P95_MS = 500;

/** Routes to track (prefix-matched against the URL path) */
const TRACKED_PREFIXES = ['/progress/', '/ieps/'];

// ══════════════════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════════════════

const buckets = new Map<string, LatencyBucket>();

function getBucketKey(method: string, route: string): string {
  return `${method} ${route}`;
}

function getOrCreateBucket(method: string, route: string): LatencyBucket {
  const key = getBucketKey(method, route);
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = {
      route,
      method,
      samples: [],
      totalRequests: 0,
      totalErrors: 0,
      latencySum: 0,
    };
    buckets.set(key, bucket);
  }
  return bucket;
}

// ══════════════════════════════════════════════════════════════════════════════
// PERCENTILE CALCULATION
// ══════════════════════════════════════════════════════════════════════════════

function calculatePercentiles(samples: number[]): PercentileStats {
  if (samples.length === 0) {
    return { p50: 0, p95: 0, p99: 0, mean: 0, min: 0, max: 0 };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const len = sorted.length;

  return {
    p50: sorted[Math.floor(len * 0.5)] ?? 0,
    p95: sorted[Math.floor(len * 0.95)] ?? 0,
    p99: sorted[Math.floor(len * 0.99)] ?? 0,
    mean: Math.round(sorted.reduce((s, v) => s + v, 0) / len),
    min: sorted[0] ?? 0,
    max: sorted[len - 1] ?? 0,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// NORMALIZE ROUTE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize a URL into a route pattern by replacing UUIDs and numeric IDs
 * with placeholders, so metrics aggregate properly.
 */
function normalizeRoute(url: string): string {
  return url
    .split('?')[0] // Remove query string
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id'
    )
    .replace(/\/\d+\b/g, '/:id');
}

// ══════════════════════════════════════════════════════════════════════════════
// FASTIFY PLUGIN
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Register the performance benchmarking hooks and metrics endpoint.
 *
 * Usage in app.ts:
 *   import { registerPerformanceMetrics } from './plugins/performanceMetrics.js';
 *   registerPerformanceMetrics(app);
 */
export async function registerPerformanceMetrics(fastify: FastifyInstance): Promise<void> {
  // Attach start time on every request to tracked prefixes
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const url = request.url;
    if (TRACKED_PREFIXES.some((p) => url.includes(p))) {
      (request as any)._perfStart = process.hrtime.bigint();
    }
  });

  // Record latency on response
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const start = (request as any)._perfStart as bigint | undefined;
    if (!start) return;

    const elapsed = Number(process.hrtime.bigint() - start) / 1_000_000; // ns → ms
    const route = normalizeRoute(request.url);
    const method = request.method;

    const bucket = getOrCreateBucket(method, route);
    bucket.totalRequests++;
    bucket.latencySum += elapsed;

    if (reply.statusCode >= 400) {
      bucket.totalErrors++;
    }

    // Ring buffer: keep last MAX_SAMPLES
    if (bucket.samples.length >= MAX_SAMPLES) {
      bucket.samples.shift();
    }
    bucket.samples.push(Math.round(elapsed * 100) / 100); // 2 decimal places
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GET /metrics/progress — performance stats endpoint
  // ══════════════════════════════════════════════════════════════════════════

  fastify.get('/metrics/progress', async (_request: FastifyRequest, reply: FastifyReply) => {
    const allSamples: number[] = [];
    let totalRequests = 0;
    let totalErrors = 0;

    const endpoints = Array.from(buckets.values()).map((bucket) => {
      const stats = calculatePercentiles(bucket.samples);
      allSamples.push(...bucket.samples);
      totalRequests += bucket.totalRequests;
      totalErrors += bucket.totalErrors;

      return {
        route: bucket.route,
        method: bucket.method,
        totalRequests: bucket.totalRequests,
        totalErrors: bucket.totalErrors,
        latencyMs: stats,
        meetsSla: stats.p95 <= SLA_P95_MS,
      };
    });

    const overallStats = calculatePercentiles(allSamples);

    const metrics: ProgressMetrics = {
      uptime: process.uptime(),
      collectedAt: new Date().toISOString(),
      endpoints,
      overall: {
        totalRequests,
        totalErrors,
        latencyMs: overallStats,
        meetsSla: overallStats.p95 <= SLA_P95_MS,
      },
    };

    return reply.send(metrics);
  });

  /**
   * POST /metrics/progress/reset — reset all metrics (testing/ops use)
   */
  fastify.post('/metrics/progress/reset', async (_request: FastifyRequest, reply: FastifyReply) => {
    buckets.clear();
    return reply.code(204).send();
  });
}
