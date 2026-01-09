import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { config } from './config.js';
import { connectDatabase, disconnectDatabase } from './prisma.js';
import { SyncEventEmitter } from './services/sync-events.js';
import { syncRoutes } from './routes/sync-routes.js';
import { webSocketHandler } from './websocket/websocket-handler.js';
import { authMiddleware } from './middleware/auth.js';
import { logger } from './logger.js';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  },
});

async function main() {
  try {
    // Register CORS
    await fastify.register(fastifyCors, {
      origin: true,
      credentials: true,
    });

    // Register auth middleware
    await fastify.register(authMiddleware);

    // Connect to database
    await connectDatabase();

    // Connect to Redis for pub/sub
    const eventEmitter = SyncEventEmitter.getInstance();
    await eventEmitter.connect();

    // Register routes
    await fastify.register(syncRoutes, { prefix: '/api/v1/sync' });

    // Register WebSocket handler
    if (config.features.websocketSync) {
      await webSocketHandler.register(fastify);
    }

    // Health check endpoint
    fastify.get('/health', async () => ({
      status: 'ok',
      service: 'sync-svc',
      timestamp: new Date().toISOString(),
      websocketClients: webSocketHandler.getClientCount(),
    }));

    // Start server
    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    logger.info(
      {
        host: config.server.host,
        port: config.server.port,
        deltaSync: config.features.deltaSync,
        autoConflictResolution: config.features.autoConflictResolution,
      },
      'Sync Service started'
    );
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');

  webSocketHandler.disconnectAll();

  await SyncEventEmitter.getInstance().disconnect();
  await disconnectDatabase();
  await fastify.close();

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main();
