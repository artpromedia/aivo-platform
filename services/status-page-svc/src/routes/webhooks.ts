// ==============================================================================
// AIVO Status Page Service — Alertmanager Webhook Route
// ==============================================================================
// POST /api/webhooks/alertmanager — receives alerts from Prometheus Alertmanager
// and auto-creates/updates incidents.

import { randomUUID } from 'node:crypto';

import type { FastifyPluginAsync } from 'fastify';

import { COMPONENTS } from '../components.js';
import { config } from '../config.js';
import { getDb } from '../db/database.js';
import { notifySubscribers } from '../services/notification.js';
import type { AlertmanagerPayload } from '../types.js';

// Map Alertmanager severity labels to incident severity
const SEVERITY_MAP: Record<string, 'minor' | 'major' | 'critical'> = {
  warning: 'minor',
  critical: 'critical',
  error: 'major',
};

// Map Alertmanager labels → component IDs
const SERVICE_TO_COMPONENT: Record<string, string> = {
  'auth-svc': 'auth',
  'api-gateway': 'api-gateway',
  'web-learner': 'student-portal',
  'web-parent': 'parent-dashboard',
  'web-teacher': 'teacher-tools',
  'content-svc': 'content-delivery',
  'assessment-svc': 'assessments',
  'brain-engine': 'ai-tutoring',
  'gamification-svc': 'gamification',
  'web-district': 'district-admin',
  'billing-svc': 'billing',
  'analytics-svc': 'reports',
  'messaging-svc': 'messaging',
  postgresql: 'database',
  redis: 'cache',
  nats: 'event-bus',
};

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/webhooks/alertmanager', async (req, reply) => {
    // Verify shared secret (basic auth or header)
    const authHeader = req.headers['x-webhook-secret'] as string | undefined;
    if (config.alertmanagerWebhookSecret && authHeader !== config.alertmanagerWebhookSecret) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const payload = req.body as AlertmanagerPayload;
    if (!payload?.alerts || !Array.isArray(payload.alerts)) {
      return reply.status(400).send({ error: 'Invalid Alertmanager payload' });
    }

    const db = getDb();
    const now = new Date().toISOString();
    const results: { alert: string; action: string }[] = [];

    for (const alert of payload.alerts) {
      const serviceName = alert.labels.job || alert.labels.service || alert.labels.alertname || '';
      const componentId = SERVICE_TO_COMPONENT[serviceName] || serviceName;
      const component = COMPONENTS.find((c) => c.id === componentId);
      const severity = SEVERITY_MAP[alert.labels.severity || 'warning'] || 'minor';

      if (alert.status === 'firing') {
        // Check for existing open incident
        const existing: any = db
          .prepare(
            `SELECT id FROM incidents
             WHERE status NOT IN ('resolved','postmortem')
               AND components LIKE ?`,
          )
          .get(`%"${componentId}"%`);

        if (existing) {
          // Add update to existing incident
          db.prepare(
            `INSERT INTO incident_updates (id, incident_id, status, message, created_at)
             VALUES (?, ?, 'identified', ?, ?)`,
          ).run(
            randomUUID(),
            existing.id,
            `Alert: ${alert.annotations.summary || alert.labels.alertname || 'Unknown alert'}`,
            now,
          );
          results.push({ alert: alert.fingerprint, action: 'updated_existing' });
        } else {
          // Create new incident
          const id = randomUUID();
          const title = alert.annotations.summary ||
            `Alert: ${component?.name || componentId}`;
          const message = alert.annotations.description ||
            `Alertmanager fired: ${alert.labels.alertname || 'unknown'}`;

          db.prepare(
            `INSERT INTO incidents (id, title, severity, status, message, components, is_auto, created_at, updated_at)
             VALUES (?, ?, ?, 'investigating', ?, ?, 1, ?, ?)`,
          ).run(id, title, severity, message, JSON.stringify([componentId]), now, now);

          db.prepare(
            `INSERT INTO incident_updates (id, incident_id, status, message, created_at)
             VALUES (?, ?, 'investigating', ?, ?)`,
          ).run(randomUUID(), id, message, now);

          const incident = {
            id, title, severity, status: 'investigating' as const,
            message, components: [componentId],
            created_at: now, updated_at: now,
            resolved_at: null, is_auto: true,
          };
          await notifySubscribers({ type: 'incident_created', incident });

          results.push({ alert: alert.fingerprint, action: 'created_incident' });
        }
      } else if (alert.status === 'resolved') {
        // Auto-resolve matching incidents
        const openIncidents: any[] = db
          .prepare(
            `SELECT * FROM incidents
             WHERE is_auto = 1
               AND status NOT IN ('resolved','postmortem')
               AND components LIKE ?`,
          )
          .all(`%"${componentId}"%`);

        for (const incident of openIncidents) {
          db.prepare(
            `UPDATE incidents SET status = 'resolved', resolved_at = ?, updated_at = ? WHERE id = ?`,
          ).run(now, now, incident.id);

          db.prepare(
            `INSERT INTO incident_updates (id, incident_id, status, message, created_at)
             VALUES (?, ?, 'resolved', 'Alert resolved via Alertmanager.', ?)`,
          ).run(randomUUID(), incident.id, now);

          const resolvedIncident = {
            ...incident,
            components: JSON.parse(incident.components),
            status: 'resolved' as const,
            resolved_at: now,
            is_auto: true,
          };
          await notifySubscribers({ type: 'incident_resolved', incident: resolvedIncident });
        }

        results.push({ alert: alert.fingerprint, action: 'resolved' });
      }
    }

    return reply.send({ processed: results.length, results });
  });
};
