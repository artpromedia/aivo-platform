// ==============================================================================
// AIVO Status Page Service — Maintenance Routes
// ==============================================================================
// GET    /api/maintenance         — list maintenance windows
// GET    /api/maintenance/:id     — single maintenance window
// POST   /api/maintenance         — schedule maintenance (admin)
// PATCH  /api/maintenance/:id     — update maintenance (admin)

import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDb } from '../db/database.js';
import { notifySubscribers } from '../services/notification.js';

const CreateMaintenanceBody = z.object({
  title: z.string().min(1).max(300),
  description: z.string().default(''),
  components: z.array(z.string()).default([]),
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime(),
});

const UpdateMaintenanceBody = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().optional(),
  components: z.array(z.string()).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  scheduled_start: z.string().datetime().optional(),
  scheduled_end: z.string().datetime().optional(),
});

export const maintenanceRoutes: FastifyPluginAsync = async (app) => {
  // ── GET /api/maintenance ────────────────────────────────────────────
  app.get<{ Querystring: { status?: string; page?: string; limit?: string } }>(
    '/api/maintenance',
    async (req, reply) => {
      const db = getDb();
      const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20', 10)));
      const offset = (page - 1) * limit;

      let whereClause = '';
      const params: any[] = [];

      if (req.query.status) {
        whereClause = 'WHERE status = ?';
        params.push(req.query.status);
      }

      const total = (
        db.prepare(`SELECT COUNT(*) as count FROM maintenance_windows ${whereClause}`).get(...params) as any
      ).count;

      const windows = db
        .prepare(
          `SELECT * FROM maintenance_windows ${whereClause} ORDER BY scheduled_start DESC LIMIT ? OFFSET ?`,
        )
        .all(...params, limit, offset)
        .map(mapMaintenance);

      return reply.send({
        maintenance: windows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    },
  );

  // ── GET /api/maintenance/:id ────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/maintenance/:id', async (req, reply) => {
    const db = getDb();
    const window = db.prepare('SELECT * FROM maintenance_windows WHERE id = ?').get(req.params.id);

    if (!window) {
      return reply.status(404).send({ error: 'Maintenance window not found' });
    }

    return reply.send(mapMaintenance(window));
  });

  // ── POST /api/maintenance ──────────────────────────────────────────
  app.post('/api/maintenance', async (req, reply) => {
    const parsed = CreateMaintenanceBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const db = getDb();
    const { title, description, components, scheduled_start, scheduled_end } = parsed.data;
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO maintenance_windows (id, title, description, components, status, scheduled_start, scheduled_end, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)`,
    ).run(id, title, description, JSON.stringify(components), scheduled_start, scheduled_end, now, now);

    const window = mapMaintenance(
      db.prepare('SELECT * FROM maintenance_windows WHERE id = ?').get(id),
    );

    await notifySubscribers({ type: 'maintenance_scheduled', maintenance: window });

    return reply.status(201).send(window);
  });

  // ── PATCH /api/maintenance/:id ─────────────────────────────────────
  app.patch<{ Params: { id: string } }>('/api/maintenance/:id', async (req, reply) => {
    const parsed = UpdateMaintenanceBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const db = getDb();
    const existing = db.prepare('SELECT * FROM maintenance_windows WHERE id = ?').get(req.params.id);
    if (!existing) {
      return reply.status(404).send({ error: 'Maintenance window not found' });
    }

    const updates = parsed.data;
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const vals: any[] = [now];

    if (updates.title) { sets.push('title = ?'); vals.push(updates.title); }
    if (updates.description !== undefined) { sets.push('description = ?'); vals.push(updates.description); }
    if (updates.components) { sets.push('components = ?'); vals.push(JSON.stringify(updates.components)); }
    if (updates.status) {
      sets.push('status = ?');
      vals.push(updates.status);
      if (updates.status === 'in_progress') {
        sets.push('actual_start = ?');
        vals.push(now);
      }
      if (updates.status === 'completed' || updates.status === 'cancelled') {
        sets.push('actual_end = ?');
        vals.push(now);
      }
    }
    if (updates.scheduled_start) { sets.push('scheduled_start = ?'); vals.push(updates.scheduled_start); }
    if (updates.scheduled_end) { sets.push('scheduled_end = ?'); vals.push(updates.scheduled_end); }

    vals.push(req.params.id);
    db.prepare(`UPDATE maintenance_windows SET ${sets.join(', ')} WHERE id = ?`).run(...vals);

    const window = mapMaintenance(
      db.prepare('SELECT * FROM maintenance_windows WHERE id = ?').get(req.params.id),
    );

    if (updates.status === 'in_progress') {
      await notifySubscribers({ type: 'maintenance_started', maintenance: window });
    }

    return reply.send(window);
  });
};

function mapMaintenance(row: any) {
  return {
    ...row,
    components: JSON.parse(row.components || '[]'),
  };
}
