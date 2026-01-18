/**
 * AIVO Event Collector Service - Entry Point
 *
 * High-throughput event ingestion, batching, and routing service.
 */

import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './prisma.js';
import * as routingService from './services/routingService.js';
import * as processorService from './services/processorService.js';
import * as metricsService from './services/metricsService.js';
import * as ingestService from './services/ingestService.js';
import { createLogger } from '@aivo/ts-api-utils';

const logger = createLogger('event-collector-svc');

async function main() {
  const app = createApp();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal, shutting down gracefully');

    try {
      // Stop accepting new events
      await processorService.stopProcessor();

      // Shutdown services
      await routingService.shutdownRouting();
      await metricsService.shutdownMetrics();
      await ingestService.shutdownIngest();

      // Close server
      await app.close();

      // Disconnect database
      await prisma.$disconnect();

      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Connected to database');

    // Initialize services
    await ingestService.initIngest();
    await routingService.initRouting();
    metricsService.initMetrics();

    // Start the batch processor
    await processorService.startProcessor();

    // Start server
    await app.listen({ port: config.port, host: config.host });
    logger.info({ host: config.host, port: config.port }, 'Event Collector Service listening');
    logger.info({ instanceId: config.instanceId }, 'Instance ID');
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

main();
