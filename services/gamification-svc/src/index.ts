/**
 * Gamification Service - Entry Point
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */

import app from './app.js';
import { prisma } from './prisma.js';
import { redis, isRedisAvailable } from './redis.js';
import { eventEmitter } from './events/event-emitter.js';
import { startScheduledJobs } from './jobs/scheduled-jobs.js';
import { startWebSocketServer } from './websocket/ws-server.js';

const PORT = parseInt(process.env.PORT || '3006', 10);

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

  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`✓ HTTP server listening on port ${PORT}`);
  });

  // Start WebSocket server
  startWebSocketServer(server);
  console.log('✓ WebSocket server started');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);

    server.close(() => {
      console.log('HTTP server closed');
    });

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
