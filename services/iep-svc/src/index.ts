/**
 * AIVO IEP Service - Entry Point
 */

import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './prisma.js';
import { ComplianceCronScheduler, setComplianceCronScheduler } from './services/compliance-cron.js';

async function main() {
  const app = createApp();

  // Compliance cron scheduler — initialised after the app is ready
  let complianceCron: ComplianceCronScheduler | null = null;

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down...`);
    complianceCron?.shutdown();
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await prisma.$connect();
    console.log('Connected to database');
  } catch (error) {
    console.error('Failed to connect to database (will retry on first request):', error);
  }

  await app.listen({ port: config.port, host: config.host });
  console.log(`IEP Service listening on ${config.host}:${config.port}`);

  // Start compliance cron after the server is up
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  complianceCron = new ComplianceCronScheduler(app.log as any);
  setComplianceCronScheduler(complianceCron);
  complianceCron.initialize();
}

main().catch((err: unknown) => {
  console.error('iep-svc fatal:', err);
  process.exit(1);
});
