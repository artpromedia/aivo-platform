/**
 * Integration Service Server
 * 
 * Fastify server setup for the integration service.
 */

import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { registerRoutes } from './routes.js';
import { ApiKeyService } from './api-key-service.js';
import { WebhookDispatcher } from './webhook-dispatcher.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export interface ServerConfig {
  port: number;
  host?: string;
  webhookWorkerIntervalMs?: number;
  webhookBatchSize?: number;
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

  // Register routes
  await registerRoutes(app, {
    prisma,
    apiKeyService,
    webhookDispatcher,
  });

  // Webhook worker interval
  let webhookWorkerInterval: NodeJS.Timeout | null = null;

  const start = async () => {
    // Connect to database
    await prisma.$connect();
    console.log('Connected to database');

    // Start webhook delivery worker
    const workerIntervalMs = config.webhookWorkerIntervalMs ?? 5000;
    const batchSize = config.webhookBatchSize ?? 10;

    webhookWorkerInterval = setInterval(async () => {
      try {
        await webhookDispatcher.processPendingDeliveries(batchSize);
      } catch (error) {
        console.error('Webhook worker error:', error);
      }
    }, workerIntervalMs);

    console.log(`Webhook worker started (interval: ${workerIntervalMs}ms, batch: ${batchSize})`);

    // Start server
    await app.listen({ port: config.port, host: config.host || '0.0.0.0' });
    console.log(`Integration service listening on port ${config.port}`);
  };

  const stop = async () => {
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
