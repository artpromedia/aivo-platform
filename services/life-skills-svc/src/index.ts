/**
 * Life Skills Service Entry Point
 *
 * Agentic AI-driven interactive life skills teaching module.
 * Provides step-by-step guidance for daily living skills,
 * safety awareness, and social skills.
 */

import { buildApp } from './app.js';
import { config } from './config.js';
import { prisma } from './prisma.js';

async function start() {
  const app = await buildApp();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Received shutdown signal');
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`🧠 Life Skills Service running on http://${config.host}:${config.port}`);
    console.log(`   - Skills library, task analyses, and safety scenarios`);
    console.log(`   - Agentic AI guidance for step-by-step learning`);
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
