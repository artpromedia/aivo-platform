/**
 * Gamification Service - Entry Point
 */

import buildApp from './app.js';
import { config } from './config.js';
import { eventEmitter } from './events/event-emitter.js';
import { createLearningConsumer, type LearningEventConsumer } from './events/learning-consumer.js';
import { startScheduledJobs } from './jobs/scheduled-jobs.js';
import { prisma } from './prisma.js';
import { redis, isRedisAvailable } from './redis.js';
import { startWebSocketServer } from './websocket/ws-server.js';

const PORT = Number.parseInt(process.env.PORT || '3006', 10);

async function main() {
  console.log('Starting Gamification Service...');

  // Test database connection
  try {
    await prisma.$connect();
    console.log('✓ Database connected');
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    process.exit(1);
  }

  // Test Redis connection
  if (await isRedisAvailable()) {
    console.log('✓ Redis connected');
  } else {
    console.log('⚠ Redis not available, using database fallback for leaderboards');
  }

  // Start scheduled jobs
  startScheduledJobs();
  console.log('✓ Scheduled jobs started');

  // Start NATS learning-event consumer (non-blocking)
  let learningConsumer: LearningEventConsumer | null = null;
  try {
    learningConsumer = createLearningConsumer(config.natsUrl);
    // start() is a blocking async iterator — run in background
    learningConsumer.start().catch((err) => {
      console.error('✗ NATS consumer crashed:', err);
    });
    console.log('✓ NATS learning-event consumer started');
  } catch (err) {
    console.error('⚠ NATS consumer failed to start (gamification will miss live events):', err);
  }

  // Build and start Fastify server
  const app = await buildApp();
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`✓ HTTP server listening on port ${PORT}`);

  // Start WebSocket server on the underlying HTTP server
  startWebSocketServer(app.server);
  console.log('✓ WebSocket server started');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);

    if (learningConsumer) {
      learningConsumer.stop();
      await learningConsumer.close();
      console.log('NATS consumer closed');
    }

    await app.close();
    console.log('HTTP server closed');

    await prisma.$disconnect();
    console.log('Database disconnected');

    redis.quit();
    console.log('Redis disconnected');

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Event logging
  eventEmitter.on('xp.awarded', (data: any) => {
    console.log(`XP awarded: ${data.amount} to ${data.studentId}`);
  });

  eventEmitter.on('level.up', (data: any) => {
    console.log(`Level up: ${data.studentId} reached level ${data.newLevel}`);
  });

  eventEmitter.on('achievement.earned', (data: any) => {
    console.log(`Achievement: ${data.studentId} earned "${data.achievementId}"`);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
