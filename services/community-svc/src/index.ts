/**
 * Community Service Entry Point
 *
 * A service for teacher community features:
 * - Posts: discussions, tips, questions
 * - Resources: lesson plans, worksheets, presentations
 * - Engagement: likes, comments, downloads
 */

import { config } from './config.js';
import { buildApp } from './app.js';
import { prisma } from './prisma.js';

async function start() {
  const app = await buildApp();

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Received shutdown signal');
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    // Test database connection
    await prisma.$connect();
    app.log.info('Database connected');

    // Start server
    await app.listen({ port: config.port, host: config.host });
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    COMMUNITY SERVICE                           ║
╠════════════════════════════════════════════════════════════════╣
║  Server:     http://${config.host}:${config.port}                          ║
║  Health:     http://${config.host}:${config.port}/health                   ║
║  Environment: ${config.nodeEnv.padEnd(44)}║
╚════════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
