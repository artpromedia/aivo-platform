import { createApp } from './app.js';
import { config } from './config.js';
import { initializeFirebaseAuth } from './lib/firebase.js';
import { connectDatabase, disconnectDatabase } from './prisma.js';

const hasDatabaseUrl = !!process.env.DATABASE_URL;

async function main() {
  const app = createApp();

  // Connect to database resiliently
  if (hasDatabaseUrl) {
    await connectDatabase();
  }

  // Initialize Firebase Auth (non-blocking — falls back to custom tokens)
  await initializeFirebaseAuth();

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
      if (hasDatabaseUrl) {
        await disconnectDatabase();
      }
      app.log.info('Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`auth-svc running on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
