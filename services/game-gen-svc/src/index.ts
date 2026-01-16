import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './prisma.js';

async function main() {
  const app = createApp();
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down...`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  await prisma.$connect();
  await app.listen({ port: config.port, host: config.host });
  console.log(`Game Generation Service listening on ${config.host}:${config.port}`);
}
main();
