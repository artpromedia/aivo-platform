import { createApp } from './app.js';
import { initNats, closeNats } from './events/index.js';
import { prisma } from './prisma.js';

const PORT = process.env.PORT ?? 3006;

try {
  // Connect to database
  await prisma.$connect();
  console.log('Connected to database');

  // Connect to NATS (optional in development)
  if (process.env.NATS_URL || process.env.NODE_ENV === 'production') {
    await initNats();
  }

  // Create and start Express app
  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`Assessment service listening on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');

    server.close(async () => {
      await closeNats();
      await prisma.$disconnect();
      console.log('Shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
