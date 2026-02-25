// ════════════════════════════════════════════════════════════════
// compliance-evidence-svc — Fastify application factory
// ════════════════════════════════════════════════════════════════

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';
import { config } from './config.js';
import { controlsRoutes } from './routes/controls.js';
import { evidenceRoutes } from './routes/evidence.js';
import { packagesRoutes } from './routes/packages.js';
import { collectorsRoutes } from './routes/collectors.js';

// ── Prisma plugin ────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

// ── Prometheus metrics ───────────────────────────────────────

const register = new Registry();
collectDefaultMetrics({ register });

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

const evidenceCollectionCounter = new Counter({
  name: 'evidence_collection_total',
  help: 'Total evidence collection runs',
  labelNames: ['collector', 'status'],
  registers: [register],
});

export { evidenceCollectionCounter };

// ── App Factory ──────────────────────────────────────────────

export function createApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  // CORS
  void app.register(cors as any, {
    origin: [
      'http://localhost:3006',
      /\.aivo\.ai$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
  });

  // Prisma
  const prisma = new PrismaClient();
  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  // Request metrics
  app.addHook('onResponse', (req, reply, done) => {
    const route = req.routeOptions?.url ?? req.url;
    httpRequestDuration.observe(
      { method: req.method, route, status_code: reply.statusCode },
      reply.elapsedTime / 1000,
    );
    done();
  });

  // ── Health / readiness ─────────────────────────────────────

  app.get('/health', async () => ({ status: 'ok', service: 'compliance-evidence-svc' }));
  app.get('/ready', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      return { status: 'degraded', reason: 'database unreachable' };
    }
  });

  // ── Prometheus metrics endpoint ────────────────────────────

  app.get('/metrics', async (_req, reply) => {
    const metrics = await register.metrics();
    return reply.type(register.contentType).send(metrics);
  });

  // ── API Routes ─────────────────────────────────────────────

  void app.register(controlsRoutes as any);
  void app.register(evidenceRoutes as any);
  void app.register(packagesRoutes as any);
  void app.register(collectorsRoutes as any);

  return app;
}
