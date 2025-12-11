/**
 * Integration Service Entry Point
 */

import 'dotenv/config';
import { createServer } from './server.js';

const port = parseInt(process.env.PORT || '3009', 10);

const { start } = await createServer({
  port,
  webhookWorkerIntervalMs: parseInt(process.env.WEBHOOK_WORKER_INTERVAL_MS || '5000', 10),
  webhookBatchSize: parseInt(process.env.WEBHOOK_BATCH_SIZE || '10', 10),
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the server
void start();
