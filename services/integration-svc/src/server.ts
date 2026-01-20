/**
 * Integration Service Server
 *
 * Fastify server setup for the integration service.
 */

import { PrismaClient } from '@prisma/client';
import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';

import { ApiKeyService } from './api-key-service.js';
import { createGoogleClassroomIntegration } from './google-classroom/index.js';
import { registerRoutes } from './routes.js';
import { WebhookDispatcher } from './webhook-dispatcher.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export interface ServerConfig {
  port: number;
  host?: string;
  webhookWorkerIntervalMs?: number;
  webhookBatchSize?: number;
  googleClassroom?: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    webhookUrl: string;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVER
// ══════════════════════════════════════════════════════════════════════════════

export async function createServer(config: ServerConfig): Promise<{
  app: FastifyInstance;
  prisma: PrismaClient;
  webhookDispatcher: WebhookDispatcher;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}> {
  // Initialize Prisma
  const prisma = new PrismaClient();

  // Initialize services
  const apiKeyService = new ApiKeyService(prisma);
  const webhookDispatcher = new WebhookDispatcher(prisma, {
    getSecret: async (ref) => {
      // In production, fetch from KMS
      // For now, return the ref as the secret (stored directly)
      return ref;
    },
  });

  // Create Fastify instance
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Rate limiting
  await app.register(rateLimit, FastifyRateLimitPresets.internalApi('integration-svc'));

  // Register routes
  await registerRoutes(app, {
    prisma,
    apiKeyService,
    webhookDispatcher,
  });

  // Initialize Google Classroom integration if configured
  let googleClassroom: ReturnType<typeof createGoogleClassroomIntegration> | null = null;
  if (config.googleClassroom) {
    googleClassroom = createGoogleClassroomIntegration(prisma, config.googleClassroom);
    await googleClassroom.registerRoutes(app);
    app.log.info('Google Classroom integration registered');
  }

  // Webhook worker interval
  let webhookWorkerInterval: ReturnType<typeof setTimeout> | null = null;

  const start = async () => {
    // Connect to database
    await prisma.$connect();
    app.log.info('Connected to database');

    // Start webhook delivery worker
    const workerIntervalMs = config.webhookWorkerIntervalMs ?? 5000;
    const batchSize = config.webhookBatchSize ?? 10;

    webhookWorkerInterval = setInterval(async () => {
      try {
        await webhookDispatcher.processPendingDeliveries(batchSize);
      } catch (error) {
        app.log.error({ err: error }, 'Webhook worker error');
      }
    }, workerIntervalMs);

    app.log.info({ workerIntervalMs, batchSize }, 'Webhook worker started');

    // Start Google Classroom scheduled jobs if configured
    if (googleClassroom) {
      googleClassroom.startScheduledJobs();
      app.log.info('Google Classroom scheduled jobs started');
    }

    // Start server
    await app.listen({ port: config.port, host: config.host || '0.0.0.0' });
    app.log.info({ port: config.port }, 'Integration service listening');
  };

  const stop = async () => {
    // Stop Google Classroom scheduled jobs
    if (googleClassroom) {
      googleClassroom.stopScheduledJobs();
    }

    // Stop webhook worker
    if (webhookWorkerInterval) {
      clearInterval(webhookWorkerInterval);
      webhookWorkerInterval = null;
    }

    // Close server
    await app.close();

    // Disconnect from database
    await prisma.$disconnect();
  };

  return { app, prisma, webhookDispatcher, start, stop };
}
