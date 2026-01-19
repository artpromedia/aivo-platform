/**
 * Prometheus Metrics for Realtime Service
 *
 * Provides Prometheus-compatible metrics for WebSocket connections,
 * room activity, and presence tracking.
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface MetricValue {
  value: number;
  labels?: Record<string, string>;
}

// ══════════════════════════════════════════════════════════════════════════════
// METRICS STATE
// ══════════════════════════════════════════════════════════════════════════════

const gauges: Map<string, MetricValue[]> = new Map();
const counters: Map<string, number> = new Map();
const histograms: Map<string, number[]> = new Map();

// ══════════════════════════════════════════════════════════════════════════════
// GAUGE FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Set a gauge metric value
 */
export function setGauge(name: string, value: number, labels?: Record<string, string>): void {
  const existing = gauges.get(name) ?? [];
  
  // Find existing entry with same labels
  const labelKey = labels ? JSON.stringify(labels) : '';
  const index = existing.findIndex(
    (m) => (m.labels ? JSON.stringify(m.labels) : '') === labelKey
  );
  
  if (index >= 0) {
    existing[index].value = value;
  } else {
    existing.push({ value, labels });
  }
  
  gauges.set(name, existing);
}

/**
 * Increment a gauge metric
 */
export function incGauge(name: string, labels?: Record<string, string>): void {
  const existing = gauges.get(name) ?? [];
  const labelKey = labels ? JSON.stringify(labels) : '';
  const index = existing.findIndex(
    (m) => (m.labels ? JSON.stringify(m.labels) : '') === labelKey
  );
  
  if (index >= 0) {
    existing[index].value++;
  } else {
    existing.push({ value: 1, labels });
  }
  
  gauges.set(name, existing);
}

/**
 * Decrement a gauge metric
 */
export function decGauge(name: string, labels?: Record<string, string>): void {
  const existing = gauges.get(name) ?? [];
  const labelKey = labels ? JSON.stringify(labels) : '';
  const index = existing.findIndex(
    (m) => (m.labels ? JSON.stringify(m.labels) : '') === labelKey
  );
  
  if (index >= 0) {
    existing[index].value = Math.max(0, existing[index].value - 1);
  }
  
  gauges.set(name, existing);
}

// ══════════════════════════════════════════════════════════════════════════════
// COUNTER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Increment a counter metric
 */
export function incCounter(name: string, value = 1): void {
  const current = counters.get(name) ?? 0;
  counters.set(name, current + value);
}

// ══════════════════════════════════════════════════════════════════════════════
// HISTOGRAM FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Observe a histogram value
 */
export function observeHistogram(name: string, value: number): void {
  const existing = histograms.get(name) ?? [];
  existing.push(value);
  
  // Keep last 1000 observations
  if (existing.length > 1000) {
    existing.shift();
  }
  
  histograms.set(name, existing);
}

// ══════════════════════════════════════════════════════════════════════════════
// PROMETHEUS FORMAT OUTPUT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Format labels for Prometheus output
 */
function formatLabels(labels?: Record<string, string>): string {
  if (!labels || Object.keys(labels).length === 0) {
    return '';
  }
  
  const escapedQuote = String.raw`\"`;
  const pairs = Object.entries(labels)
    .map(([key, value]) => `${key}="${value.replaceAll('"', escapedQuote)}"`)
    .join(',');
  
  return `{${pairs}}`;
}

/**
 * Calculate histogram buckets
 */
function calculateBuckets(values: number[], buckets: number[]): Record<string, number> {
  const result: Record<string, number> = {};
  
  for (const bucket of buckets) {
    result[`le="${bucket}"`] = values.filter((v) => v <= bucket).length;
  }
  result['le="+Inf"'] = values.length;
  
  return result;
}

/**
 * Get all metrics in Prometheus format
 */
export function getPrometheusMetrics(): string {
  const lines: string[] = [];
  
  // Add standard process metrics
  const memUsage = process.memoryUsage();
  lines.push(
    '# HELP process_memory_heap_bytes Process heap memory in bytes',
    '# TYPE process_memory_heap_bytes gauge',
    `process_memory_heap_bytes ${memUsage.heapUsed}`,
    '# HELP process_memory_rss_bytes Process RSS memory in bytes',
    '# TYPE process_memory_rss_bytes gauge',
    `process_memory_rss_bytes ${memUsage.rss}`,
    '# HELP process_uptime_seconds Process uptime in seconds',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${process.uptime()}`
  );
  
  // Output gauges
  for (const [name, values] of gauges.entries()) {
    lines.push(`# HELP ${name} Gauge metric`, `# TYPE ${name} gauge`);
    for (const { value, labels } of values) {
      lines.push(`${name}${formatLabels(labels)} ${value}`);
    }
  }
  
  // Output counters
  for (const [name, value] of counters.entries()) {
    lines.push(`# HELP ${name} Counter metric`, `# TYPE ${name} counter`, `${name} ${value}`);
  }
  
  // Output histograms
  const histogramBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
  for (const [name, values] of histograms.entries()) {
    if (values.length === 0) continue;
    
    lines.push(`# HELP ${name} Histogram metric`, `# TYPE ${name} histogram`);
    
    const buckets = calculateBuckets(values, histogramBuckets);
    for (const [label, count] of Object.entries(buckets)) {
      lines.push(`${name}_bucket{${label}} ${count}`);
    }
    
    const sum = values.reduce((a, b) => a + b, 0);
    lines.push(`${name}_sum ${sum}`, `${name}_count ${values.length}`);
  }
  
  return lines.join('\n');
}

// ══════════════════════════════════════════════════════════════════════════════
// PREDEFINED METRICS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Update WebSocket connection count metric
 */
export function updateConnectionCount(count: number): void {
  setGauge('realtime_websocket_connections_total', count);
}

/**
 * Record new connection
 */
export function recordConnection(tenantId: string, deviceType: string): void {
  incCounter('realtime_websocket_connections_created_total');
  incGauge('realtime_websocket_connections', { tenant_id: tenantId, device_type: deviceType });
}

/**
 * Record disconnection
 */
export function recordDisconnection(tenantId: string, deviceType: string): void {
  incCounter('realtime_websocket_disconnections_total');
  decGauge('realtime_websocket_connections', { tenant_id: tenantId, device_type: deviceType });
}

/**
 * Record message sent
 */
export function recordMessageSent(_eventType: string): void {
  incCounter('realtime_messages_sent_total');
}

/**
 * Record room join
 */
export function recordRoomJoin(roomType: string): void {
  incCounter('realtime_room_joins_total');
  incGauge('realtime_rooms_active', { room_type: roomType });
}

/**
 * Record room leave
 */
export function recordRoomLeave(roomType: string): void {
  incCounter('realtime_room_leaves_total');
  decGauge('realtime_rooms_active', { room_type: roomType });
}
