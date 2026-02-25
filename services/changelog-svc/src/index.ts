import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './prisma.js';

async function main() {
  const app = createApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`changelog-svc running on port ${config.port}`);
}

main().catch((err) => {
  console.error('changelog-svc fatal:', err);
  process.exit(1);
});
