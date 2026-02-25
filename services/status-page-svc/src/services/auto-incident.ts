// ==============================================================================
// AIVO Status Page Service — Auto-Incident Detection
// ==============================================================================
// Polls Prometheus at regular intervals and automatically creates / resolves
// incidents based on configurable thresholds.
//
// Rules:
//   • Component down > 2 min          → auto-incident
//   • Error rate > 5 % for > 5 min    → auto-incident
//   • P95 latency > 2× baseline > 10 min → auto-incident
//   • Healthy for > 5 min             → auto-resolve

import { randomUUID } from 'node:crypto';

import cron from 'node-cron';

import { COMPONENTS, deriveOverallStatus } from '../components.js';
import { config } from '../config.js';
import { getDb } from '../db/database.js';
import type { StatusLevel, MetricSnapshot } from '../types.js';

import { collectMetricSnapshots } from './prometheus-client.js';

let task: cron.ScheduledTask | null = null;

// In-memory baseline latencies (populated on first healthy sample)
const latencyBaselines = new Map<string, number>();

/**
 * Start the auto-detection poll loop.
 */
export function startAutoDetection(): void {
  const intervalSec = config.detection.pollIntervalSeconds;
  // node-cron doesn't support sub-minute, so we use setInterval for <60 s
  if (intervalSec < 60) {
    setInterval(() => runDetectionCycle(), intervalSec * 1000);
  } else {
    const cronExpr = `*/${Math.round(intervalSec / 60)} * * * *`;
    task = cron.schedule(cronExpr, () => runDetectionCycle());
  }
  console.log(`[auto-detection] started — polling every ${intervalSec}s`);
}

export function stopAutoDetection(): void {
  if (task) {
    task.stop();
    task = null;
  }
}

/**
 * Run one detection cycle: collect metrics, evaluate thresholds, manage incidents.
 */
export async function runDetectionCycle(): Promise<void> {
  try {
    const snapshots = await collectMetricSnapshots();
    const db = getDb();
    const now = new Date().toISOString();

    for (const snap of snapshots) {
      processComponentSnapshot(db, snap, now);
    }
  } catch (err) {
    console.error('[auto-detection] cycle failed:', err);
  }
}

function processComponentSnapshot(
  db: ReturnType<typeof getDb>,
  snap: MetricSnapshot,
  now: string,
): void {
  const { component_id, is_healthy, error_rate, p95_latency_ms } = snap;
  const thresholds = config.detection;

  // Ensure component_status row exists
  db.prepare(
    `INSERT OR IGNORE INTO component_status (component_id, status) VALUES (?, 'operational')`,
  ).run(component_id);

  const row: any = db
    .prepare('SELECT * FROM component_status WHERE component_id = ?')
    .get(component_id);

  let newStatus: StatusLevel = 'operational';
  let shouldCreateIncident = false;
  let incidentReason = '';

  // ── Down check ──────────────────────────────────────────────────────
  if (!is_healthy) {
    if (!row.down_since) {
      db.prepare('UPDATE component_status SET down_since = ? WHERE component_id = ?').run(
        now,
        component_id,
      );
    } else {
      const downDuration = (Date.now() - new Date(row.down_since).getTime()) / 1000;
      if (downDuration >= thresholds.downThresholdSeconds) {
        newStatus = 'major_outage';
        shouldCreateIncident = true;
        incidentReason = `Component ${component_id} has been unreachable for ${Math.round(downDuration)}s`;
      }
    }
  } else {
    // Clear down_since when healthy
    if (row.down_since) {
      db.prepare('UPDATE component_status SET down_since = NULL WHERE component_id = ?').run(
        component_id,
      );
    }
  }

  // ── Error rate check ────────────────────────────────────────────────
  if (error_rate !== null && error_rate > thresholds.errorRateThreshold) {
    if (!row.error_since) {
      db.prepare('UPDATE component_status SET error_since = ? WHERE component_id = ?').run(
        now,
        component_id,
      );
    } else {
      const errorDuration = (Date.now() - new Date(row.error_since).getTime()) / 1000;
      if (errorDuration >= thresholds.errorRateDurationSeconds) {
        newStatus = newStatus === 'major_outage' ? 'major_outage' : 'partial_outage';
        shouldCreateIncident = true;
        incidentReason = `Error rate for ${component_id} is ${(error_rate * 100).toFixed(1)}% (threshold: ${thresholds.errorRateThreshold * 100}%)`;
      }
    }
  } else {
    if (row.error_since) {
      db.prepare('UPDATE component_status SET error_since = NULL WHERE component_id = ?').run(
        component_id,
      );
    }
  }

  // ── Latency check ──────────────────────────────────────────────────
  if (p95_latency_ms !== null) {
    const baseline = latencyBaselines.get(component_id);
    if (!baseline) {
      // First healthy sample becomes baseline
      latencyBaselines.set(component_id, p95_latency_ms);
    } else if (p95_latency_ms > baseline * thresholds.latencyFactor) {
      if (!row.latency_since) {
        db.prepare('UPDATE component_status SET latency_since = ? WHERE component_id = ?').run(
          now,
          component_id,
        );
      } else {
        const latencyDuration = (Date.now() - new Date(row.latency_since).getTime()) / 1000;
        if (latencyDuration >= thresholds.latencyDurationSeconds) {
          newStatus = newStatus === 'operational' ? 'degraded' : newStatus;
          shouldCreateIncident = true;
          incidentReason = `P95 latency for ${component_id} is ${p95_latency_ms.toFixed(0)}ms (baseline: ${baseline.toFixed(0)}ms, ${thresholds.latencyFactor}× threshold)`;
        }
      }
    } else {
      if (row.latency_since) {
        db.prepare('UPDATE component_status SET latency_since = NULL WHERE component_id = ?').run(
          component_id,
        );
      }
    }
  }

  // ── Update component status ─────────────────────────────────────────
  db.prepare(
    'UPDATE component_status SET status = ?, last_checked_at = ? WHERE component_id = ?',
  ).run(newStatus, now, component_id);

  // ── Record uptime ───────────────────────────────────────────────────
  recordUptimeCheck(db, component_id, is_healthy, now);

  // ── Create or resolve auto-incidents ────────────────────────────────
  if (shouldCreateIncident) {
    ensureAutoIncident(db, component_id, incidentReason, newStatus, now);
  } else if (is_healthy && newStatus === 'operational') {
    tryAutoResolve(db, component_id, now);
  }
}

function recordUptimeCheck(
  db: ReturnType<typeof getDb>,
  componentId: string,
  isUp: boolean,
  now: string,
): void {
  const today = now.slice(0, 10);
  const existing: any = db
    .prepare('SELECT * FROM uptime_daily WHERE component_id = ? AND date = ?')
    .get(componentId, today);

  if (existing) {
    const totalChecks = existing.total_checks + 1;
    const failedChecks = existing.failed_checks + (isUp ? 0 : 1);
    const uptimePercent = ((totalChecks - failedChecks) / totalChecks) * 100;
    db.prepare(
      'UPDATE uptime_daily SET total_checks = ?, failed_checks = ?, uptime_percent = ? WHERE component_id = ? AND date = ?',
    ).run(totalChecks, failedChecks, uptimePercent, componentId, today);
  } else {
    db.prepare(
      'INSERT INTO uptime_daily (component_id, date, total_checks, failed_checks, uptime_percent) VALUES (?, ?, 1, ?, ?)',
    ).run(componentId, today, isUp ? 0 : 1, isUp ? 100 : 0);
  }
}

function ensureAutoIncident(
  db: ReturnType<typeof getDb>,
  componentId: string,
  reason: string,
  status: StatusLevel,
  now: string,
): void {
  // Check if there's already an open auto-incident for this component
  const existing: any = db
    .prepare(
      `SELECT id FROM incidents
       WHERE is_auto = 1
         AND status NOT IN ('resolved','postmortem')
         AND components LIKE ?`,
    )
    .get(`%"${componentId}"%`);

  if (existing) return; // already tracked

  const severity = status === 'major_outage' ? 'critical' : status === 'partial_outage' ? 'major' : 'minor';
  const id = randomUUID();

  db.prepare(
    `INSERT INTO incidents (id, title, severity, status, message, components, is_auto, created_at, updated_at)
     VALUES (?, ?, ?, 'investigating', ?, ?, 1, ?, ?)`,
  ).run(
    id,
    `Auto-detected: ${COMPONENTS.find((c) => c.id === componentId)?.name ?? componentId} issue`,
    severity,
    reason,
    JSON.stringify([componentId]),
    now,
    now,
  );

  // Add initial update
  db.prepare(
    `INSERT INTO incident_updates (id, incident_id, status, message, created_at)
     VALUES (?, ?, 'investigating', ?, ?)`,
  ).run(randomUUID(), id, reason, now);

  console.log(`[auto-detection] created incident ${id} for ${componentId}: ${reason}`);
}

function tryAutoResolve(
  db: ReturnType<typeof getDb>,
  componentId: string,
  now: string,
): void {
  const openIncidents: any[] = db
    .prepare(
      `SELECT * FROM incidents
       WHERE is_auto = 1
         AND status NOT IN ('resolved','postmortem')
         AND components LIKE ?`,
    )
    .all(`%"${componentId}"%`);

  for (const incident of openIncidents) {
    // Check that ALL components in the incident are now healthy
    const ids: string[] = JSON.parse(incident.components);
    const allHealthy = ids.every((cid) => {
      const cs: any = db
        .prepare('SELECT status FROM component_status WHERE component_id = ?')
        .get(cid);
      return cs?.status === 'operational';
    });

    if (!allHealthy) continue;

    // Auto-resolve
    db.prepare(
      `UPDATE incidents SET status = 'resolved', resolved_at = ?, updated_at = ? WHERE id = ?`,
    ).run(now, now, incident.id);

    db.prepare(
      `INSERT INTO incident_updates (id, incident_id, status, message, created_at)
       VALUES (?, ?, 'resolved', 'Automatically resolved — all affected components are healthy.', ?)`,
    ).run(randomUUID(), incident.id, now);

    console.log(`[auto-detection] auto-resolved incident ${incident.id}`);
  }
}
