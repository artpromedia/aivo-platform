/**
 * Export Worker
 *
 * NATS JetStream consumer for processing export jobs asynchronously.
 */

import type { NatsConnection, JetStreamClient, ConsumerConfig } from 'nats';
import { connect, StringCodec, RetentionPolicy, AckPolicy } from 'nats';

import { config } from './config.js';
import { logger } from './logger.js';
import { prisma } from './prisma.js';
import { processExportJob } from './services/exportService.js';

const sc = StringCodec();

let nc: NatsConnection | null = null;
let js: JetStreamClient | null = null;

// ═══════════════════════════════════════════════════════════════════════════════
// Worker Setup
// ═══════════════════════════════════════════════════════════════════════════════

export async function startWorker(): Promise<void> {
  logger.info('Starting export worker...');

  try {
    nc = await connect({
      servers: config.NATS_URL,
      name: 'research-export-worker',
    });

    logger.info({ natsUrl: config.NATS_URL }, 'Connected to NATS');

    js = nc.jetstream();

    // Ensure stream exists
    const jsm = await nc.jetstreamManager();
    try {
      await jsm.streams.info('RESEARCH');
    } catch {
      // Create stream if it doesn't exist
      await jsm.streams.add({
        name: 'RESEARCH',
        subjects: ['research.>'],
        retention: RetentionPolicy.Limits,
        max_msgs: 100000,
        max_age: 7 * 24 * 60 * 60 * 1000000000, // 7 days in nanoseconds
      });
      logger.info('Created RESEARCH stream');
    }

    // Create durable consumer
    const consumerConfig: Partial<ConsumerConfig> = {
      durable_name: 'export-processor',
      ack_policy: AckPolicy.Explicit,
      max_deliver: 3,
      ack_wait: 5 * 60 * 1000000000, // 5 minutes
      filter_subject: 'research.export.requested',
    };

    try {
      await jsm.consumers.info('RESEARCH', 'export-processor');
    } catch {
      await jsm.consumers.add('RESEARCH', consumerConfig);
      logger.info('Created export-processor consumer');
    }

    // Subscribe and process
    const consumer = await js.consumers.get('RESEARCH', 'export-processor');
    const messages = await consumer.consume();

    logger.info('Listening for export jobs...');

    for await (const msg of messages) {
      const data = JSON.parse(sc.decode(msg.data));
      logger.info({ exportJobId: data.exportJobId }, 'Processing export job');

      try {
        await processExportJob(data.exportJobId);
        msg.ack();
        logger.info({ exportJobId: data.exportJobId }, 'Completed export job');
      } catch (error) {
        logger.error({ err: error, exportJobId: data.exportJobId }, 'Failed export job');

        // Mark job as failed in database
        await prisma.researchExportJob.update({
          where: { id: data.exportJobId },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          },
        });

        // Negative ack for retry or dead letter
        // Check if message has been redelivered multiple times
        const deliveryCount = msg.info?.deliveryCount ?? 1;
        if (msg.redelivered && deliveryCount >= 3) {
          msg.term(); // Terminal - don't retry
        } else {
          msg.nak(); // Retry
        }
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Worker error');
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Graceful Shutdown
// ═══════════════════════════════════════════════════════════════════════════════

export async function stopWorker(): Promise<void> {
  logger.info('Stopping export worker...');

  if (nc) {
    await nc.drain();
    await nc.close();
  }

  await prisma.$disconnect();
  logger.info('Worker stopped');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Standalone Execution
// ═══════════════════════════════════════════════════════════════════════════════

const isMainModule = import.meta.url === `file://${(process.argv[1] ?? '').replaceAll('\\', '/')}`;

if (isMainModule) {
  process.on('SIGTERM', async () => {
    await stopWorker();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await stopWorker();
    process.exit(0);
  });

  await startWorker().catch((error: unknown) => {
    logger.error({ err: error }, 'Worker failed to start');
    process.exit(1);
  });
}
