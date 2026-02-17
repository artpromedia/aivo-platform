import 'dotenv/config';
import { createApp } from './app.js';
import { initNats, closeNats } from './events/index.js';
import { prisma } from './prisma.js';

const PORT = Number(process.env.PORT ?? 3006);

try {
  // Connect to database
  await prisma.$connect();
  console.log('Connected to database');

  // Connect to NATS (optional in development)
  if (process.env.NATS_URL || process.env.NODE_ENV === 'production') {
    await initNats();
  }

  // Create and start Fastify app
  const app = createApp();

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Assessment service listening on port ${PORT}`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');

    await app.close();
    await closeNats();
    await prisma.$disconnect();
    console.log('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
