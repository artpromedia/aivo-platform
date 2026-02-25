// ==============================================================================
// AIVO Status Page Service — Incident Routes
// ==============================================================================
// GET    /api/incidents           — list incidents (paginated)
// GET    /api/incidents/:id       — single incident with updates
// POST   /api/incidents           — create incident (admin)
// PATCH  /api/incidents/:id       — update incident (admin)
// POST   /api/incidents/:id/updates — add timeline entry (admin)

import { randomUUID } from 'node:crypto';

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { getDb } from '../db/database.js';
import { notifySubscribers } from '../services/notification.js';

const CreateIncidentBody = z.object({
  title: z.string().min(1).max(300),
  severity: z.enum(['minor', 'major', 'critical']),
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved', 'postmortem']).default('investigating'),
  message: z.string().default(''),
  components: z.array(z.string()).default([]),
});

const UpdateIncidentBody = z.object({
  title: z.string().min(1).max(300).optional(),
  severity: z.enum(['minor', 'major', 'critical']).optional(),
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved', 'postmortem']).optional(),
  message: z.string().optional(),
  components: z.array(z.string()).optional(),
});

const AddUpdateBody = z.object({
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved', 'postmortem']),
  message: z.string().min(1),
});

export const incidentRoutes: FastifyPluginAsync = async (app) => {
  // ── GET /api/incidents ──────────────────────────────────────────────
  app.get<{ Querystring: { page?: string; limit?: string; status?: string } }>(
    '/api/incidents',
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
        db.prepare(`SELECT COUNT(*) as count FROM incidents ${whereClause}`).get(...params) as any
      ).count;

      const incidents = db
        .prepare(
          `SELECT * FROM incidents ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        )
        .all(...params, limit, offset)
        .map(mapIncident);

      return reply.send({
        incidents,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    },
  );

  // ── GET /api/incidents/:id ──────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/incidents/:id', async (req, reply) => {
    const db = getDb();
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);

    if (!incident) {
      return reply.status(404).send({ error: 'Incident not found' });
    }

    const updates = db
      .prepare('SELECT * FROM incident_updates WHERE incident_id = ? ORDER BY created_at ASC')
      .all(req.params.id);

    return reply.send({ ...mapIncident(incident), updates });
  });

  // ── POST /api/incidents ─────────────────────────────────────────────
  app.post('/api/incidents', async (req, reply) => {
    // TODO: add admin authentication middleware
    const parsed = CreateIncidentBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const db = getDb();
    const { title, severity, status, message, components } = parsed.data;
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO incidents (id, title, severity, status, message, components, is_auto, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    ).run(id, title, severity, status, message, JSON.stringify(components), now, now);

    // Add initial update
    db.prepare(
      `INSERT INTO incident_updates (id, incident_id, status, message, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(randomUUID(), id, status, message, now);

    const incident = mapIncident(
      db.prepare('SELECT * FROM incidents WHERE id = ?').get(id),
    );

    // Notify subscribers
    await notifySubscribers({ type: 'incident_created', incident });

    return reply.status(201).send(incident);
  });

  // ── PATCH /api/incidents/:id ────────────────────────────────────────
  app.patch<{ Params: { id: string } }>('/api/incidents/:id', async (req, reply) => {
    const parsed = UpdateIncidentBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const db = getDb();
    const existing = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
    if (!existing) {
      return reply.status(404).send({ error: 'Incident not found' });
    }

    const updates = parsed.data;
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const vals: any[] = [now];

    if (updates.title) { sets.push('title = ?'); vals.push(updates.title); }
    if (updates.severity) { sets.push('severity = ?'); vals.push(updates.severity); }
    if (updates.status) {
      sets.push('status = ?');
      vals.push(updates.status);
      if (updates.status === 'resolved') {
        sets.push('resolved_at = ?');
        vals.push(now);
      }
    }
    if (updates.message !== undefined) { sets.push('message = ?'); vals.push(updates.message); }
    if (updates.components) { sets.push('components = ?'); vals.push(JSON.stringify(updates.components)); }

    vals.push(req.params.id);
    db.prepare(`UPDATE incidents SET ${sets.join(', ')} WHERE id = ?`).run(...vals);

    const incident = mapIncident(
      db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id),
    );

    const notifType = updates.status === 'resolved' ? 'incident_resolved' : 'incident_updated';
    await notifySubscribers({ type: notifType, incident });

    return reply.send(incident);
  });

  // ── POST /api/incidents/:id/updates ─────────────────────────────────
  app.post<{ Params: { id: string } }>('/api/incidents/:id/updates', async (req, reply) => {
    const parsed = AddUpdateBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const db = getDb();
    const existing = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
    if (!existing) {
      return reply.status(404).send({ error: 'Incident not found' });
    }

    const { status, message } = parsed.data;
    const now = new Date().toISOString();
    const updateId = randomUUID();

    db.prepare(
      `INSERT INTO incident_updates (id, incident_id, status, message, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(updateId, req.params.id, status, message, now);

    // Also update incident status
    const sets = ['status = ?', 'updated_at = ?'];
    const vals: any[] = [status, now];
    if (status === 'resolved') {
      sets.push('resolved_at = ?');
      vals.push(now);
    }
    vals.push(req.params.id);
    db.prepare(`UPDATE incidents SET ${sets.join(', ')} WHERE id = ?`).run(...vals);

    const incident = mapIncident(
      db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id),
    );
    const update = db.prepare('SELECT * FROM incident_updates WHERE id = ?').get(updateId);

    const notifType = status === 'resolved' ? 'incident_resolved' : 'incident_updated';
    await notifySubscribers({ type: notifType, incident, update: update as any });

    return reply.status(201).send(update);
  });
};

function mapIncident(row: any) {
  return {
    ...row,
    components: JSON.parse(row.components || '[]'),
    is_auto: Boolean(row.is_auto),
  };
}
