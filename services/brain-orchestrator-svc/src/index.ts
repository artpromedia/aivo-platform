import { createApp } from './app.js';
import { config } from './config.js';
import { initNats, closeNats } from './events/publisher.js';
import { startEventSubscriber, stopEventSubscriber } from './events/subscriber.js';
import { prisma } from './prisma.js';

const app = createApp();
let server: ReturnType<typeof app.listen>;

async function start(): Promise<void> {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('Connected to database');

    // Initialize NATS connection
    if (process.env.NODE_ENV !== 'test') {
      await initNats();
      console.log('Connected to NATS');

      // Start event subscriber
      await startEventSubscriber();
      console.log('Event subscriber started');
    }

    // Start HTTP server
    server = app.listen(config.port, () => {
      console.log(`Brain Orchestrator Service listening on port ${config.port}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  console.log('Shutting down gracefully...');

  try {
    // Stop accepting new requests
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      console.log('HTTP server closed');
    }

    // Stop event subscriber
    await stopEventSubscriber();
    console.log('Event subscriber stopped');

    // Close NATS connection
    await closeNats();
    console.log('NATS connection closed');

    // Disconnect from database
    await prisma.$disconnect();
    console.log('Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

start();

export { app };
