// ==============================================================================
// AIVO Status Page Service — Status Routes
// ==============================================================================
// GET /api/status          — current status of all components
// GET /api/status/history  — 90-day uptime history per component
// GET /api/status/summary  — lightweight overall status (for badges / monitors)

import type { FastifyPluginAsync } from 'fastify';
import { getDb } from '../db/database.js';
import { COMPONENTS, COMPONENT_GROUPS, deriveOverallStatus } from '../components.js';
import type { StatusLevel, StatusResponse } from '../types.js';

export const statusRoutes: FastifyPluginAsync = async (app) => {
  // ── GET /api/status ─────────────────────────────────────────────────
  app.get('/api/status', async (_req, reply) => {
    const db = getDb();
    const now = new Date().toISOString();

    // Merge static component definitions with live DB status
    const componentStatuses: Map<string, StatusLevel> = new Map();
    const rows: any[] = db.prepare('SELECT component_id, status FROM component_status').all();
    for (const r of rows) {
      componentStatuses.set(r.component_id, r.status as StatusLevel);
    }

    const enrichedComponents = COMPONENTS.map((c) => ({
      ...c,
      status: componentStatuses.get(c.id) ?? c.status,
    }));

    // Active incidents
    const activeIncidents = db
      .prepare(
        `SELECT * FROM incidents
         WHERE status NOT IN ('resolved','postmortem')
         ORDER BY created_at DESC`,
      )
      .all()
      .map(mapIncident);

    // Upcoming maintenance (within 7 days)
    const upcomingMaintenance = db
      .prepare(
        `SELECT * FROM maintenance_windows
         WHERE status IN ('scheduled','in_progress')
           AND scheduled_start <= datetime('now', '+7 days')
         ORDER BY scheduled_start ASC`,
      )
      .all()
      .map(mapMaintenance);

    const response: StatusResponse = {
      overall: deriveOverallStatus(enrichedComponents),
      groups: COMPONENT_GROUPS.map((g) => ({
        group: g,
        components: enrichedComponents
          .filter((c) => c.group === g.id)
          .sort((a, b) => a.order - b.order)
          .map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            status: c.status,
          })),
      })),
      active_incidents: activeIncidents,
      upcoming_maintenance: upcomingMaintenance,
      updated_at: now,
    };

    return reply.send(response);
  });

  // ── GET /api/status/history ─────────────────────────────────────────
  app.get<{ Querystring: { days?: string; component?: string } }>(
    '/api/status/history',
    async (req, reply) => {
      const db = getDb();
      const days = Math.min(parseInt(req.query.days ?? '90', 10), 365);
      const componentFilter = req.query.component;

      let query = `SELECT * FROM uptime_daily WHERE date >= date('now', '-${days} days')`;
      const params: any[] = [];

      if (componentFilter) {
        query += ' AND component_id = ?';
        params.push(componentFilter);
      }

      query += ' ORDER BY date ASC, component_id ASC';

      const rows: any[] = db.prepare(query).all(...params);

      // Group by component
      const byComponent: Record<string, { date: string; uptime_percent: number }[]> = {};
      for (const row of rows) {
        if (!byComponent[row.component_id]) {
          byComponent[row.component_id] = [];
        }
        byComponent[row.component_id].push({
          date: row.date,
          uptime_percent: row.uptime_percent,
        });
      }

      return reply.send({
        days,
        components: byComponent,
      });
    },
  );

  // ── GET /api/status/summary ─────────────────────────────────────────
  app.get('/api/status/summary', async (_req, reply) => {
    const db = getDb();
    const rows: any[] = db.prepare('SELECT component_id, status FROM component_status').all();
    const statuses = rows.map((r) => ({ status: r.status as StatusLevel }));
    const overall = statuses.length > 0 ? deriveOverallStatus(statuses) : 'operational';

    const activeCount = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM incidents WHERE status NOT IN ('resolved','postmortem')`,
        )
        .get() as any
    ).count;

    return reply.send({
      status: overall,
      active_incidents: activeCount,
      updated_at: new Date().toISOString(),
    });
  });
};

// Helpers to parse JSON columns
function mapIncident(row: any) {
  return {
    ...row,
    components: JSON.parse(row.components || '[]'),
    is_auto: Boolean(row.is_auto),
  };
}

function mapMaintenance(row: any) {
  return {
    ...row,
    components: JSON.parse(row.components || '[]'),
  };
}
