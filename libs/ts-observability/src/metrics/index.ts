/**
 * Prometheus Metrics Registry
 *
 * Provides standard metrics for HTTP, AI, and business operations.
 * Uses prom-client for Prometheus-compatible metric exposition.
 */

import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
  register as globalRegister,
} from 'prom-client';

import { METRIC_NAMES, METRIC_LABELS, HISTOGRAM_BUCKETS } from '../constants.js';

export * from './types.js';
export { createMetricsRegistry } from './registry.js';
