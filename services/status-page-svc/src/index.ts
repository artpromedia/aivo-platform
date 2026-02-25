// ==============================================================================
// AIVO Status Page Service — Entry Point
// ==============================================================================
// Independent status page backend running on Fastify + SQLite.
// Designed to survive full platform outages — no dependency on the
// platform PostgreSQL cluster, Redis, or NATS.

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import { config } from './config.js';
import { initDb, closeDb } from './db/database.js';
import { statusRoutes } from './routes/status.js';
import { incidentRoutes } from './routes/incidents.js';
import { maintenanceRoutes } from './routes/maintenance.js';
import { subscriberRoutes } from './routes/subscribers.js';
import { webhookRoutes } from './routes/webhooks.js';
import { feedRoutes } from './routes/feed.js';
import { startAutoDetection, stopAutoDetection } from './services/auto-incident.js';

async function main(): Promise<void> {
  // ── Initialise SQLite ───────────────────────────────────────────────
  console.log(`[status-page-svc] initialising SQLite at ${config.databasePath}`);
  initDb();

  // ── Create Fastify ──────────────────────────────────────────────────
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
    },
    trustProxy: true,
  });

  // ── Plugins ─────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // CSP handled by the frontend
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // ── Health check ────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', service: 'status-page-svc' }));

  // ── Routes ──────────────────────────────────────────────────────────
  await app.register(statusRoutes);
  await app.register(incidentRoutes);
  await app.register(maintenanceRoutes);
  await app.register(subscriberRoutes);
  await app.register(webhookRoutes);
  await app.register(feedRoutes);

  // ── Start auto-detection ────────────────────────────────────────────
  startAutoDetection();

  // ── Graceful shutdown ───────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`[status-page-svc] received ${signal}, shutting down…`);
    stopAutoDetection();
    await app.close();
    closeDb();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // ── Listen ──────────────────────────────────────────────────────────
  await app.listen({ port: config.port, host: config.host });
  console.log(`[status-page-svc] listening on ${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error('[status-page-svc] fatal:', err);
  process.exit(1);
});
