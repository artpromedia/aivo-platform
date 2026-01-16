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

async function main() {
  const app = createApp();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);

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

      console.log('Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    // Connect to database
    await prisma.$connect();
    console.log('Connected to database');

    // Initialize services
    await ingestService.initIngest();
    await routingService.initRouting();
    metricsService.initMetrics();

    // Start the batch processor
    await processorService.startProcessor();

    // Start server
    await app.listen({ port: config.port, host: config.host });
    console.log(`Event Collector Service listening on ${config.host}:${config.port}`);
    console.log(`Instance ID: ${config.instanceId}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
