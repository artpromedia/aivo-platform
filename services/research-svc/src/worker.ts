/**
 * Export Worker
 * 
 * NATS JetStream consumer for processing export jobs asynchronously.
 */

import { connect, StringCodec, NatsConnection, JetStreamClient, ConsumerConfig } from 'nats';
import { config } from './config.js';
import { prisma } from './prisma.js';
import { processExportJob } from './services/exportService.js';

const sc = StringCodec();

let nc: NatsConnection | null = null;
let js: JetStreamClient | null = null;

// ═══════════════════════════════════════════════════════════════════════════════
// Worker Setup
// ═══════════════════════════════════════════════════════════════════════════════

export async function startWorker(): Promise<void> {
  console.log('Starting export worker...');

  try {
    nc = await connect({
      servers: config.NATS_URL,
      name: 'research-export-worker',
    });

    console.log(`Connected to NATS at ${config.NATS_URL}`);

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
        retention: 'limits',
        max_msgs: 100000,
        max_age: 7 * 24 * 60 * 60 * 1000000000, // 7 days in nanoseconds
      });
      console.log('Created RESEARCH stream');
    }

    // Create durable consumer
    const consumerConfig: Partial<ConsumerConfig> = {
      durable_name: 'export-processor',
      ack_policy: 'explicit',
      max_deliver: 3,
      ack_wait: 5 * 60 * 1000000000, // 5 minutes
      filter_subject: 'research.export.requested',
    };

    try {
      await jsm.consumers.info('RESEARCH', 'export-processor');
    } catch {
      await jsm.consumers.add('RESEARCH', consumerConfig);
      console.log('Created export-processor consumer');
    }

    // Subscribe and process
    const consumer = await js.consumers.get('RESEARCH', 'export-processor');
    const messages = await consumer.consume();

    console.log('Listening for export jobs...');

    for await (const msg of messages) {
      const data = JSON.parse(sc.decode(msg.data));
      console.log(`Processing export job: ${data.exportJobId}`);

      try {
        await processExportJob(data.exportJobId);
        msg.ack();
        console.log(`Completed export job: ${data.exportJobId}`);
      } catch (error) {
        console.error(`Failed export job ${data.exportJobId}:`, error);
        
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
        if (msg.redelivered && (msg.info?.redeliveryCount ?? 0) >= 2) {
          msg.term(); // Terminal - don't retry
        } else {
          msg.nak(); // Retry
        }
      }
    }
  } catch (error) {
    console.error('Worker error:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Graceful Shutdown
// ═══════════════════════════════════════════════════════════════════════════════

export async function stopWorker(): Promise<void> {
  console.log('Stopping export worker...');
  
  if (nc) {
    await nc.drain();
    await nc.close();
  }
  
  await prisma.$disconnect();
  console.log('Worker stopped');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Standalone Execution
// ═══════════════════════════════════════════════════════════════════════════════

const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;

if (isMainModule) {
  process.on('SIGTERM', async () => {
    await stopWorker();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await stopWorker();
    process.exit(0);
  });

  startWorker().catch((error) => {
    console.error('Worker failed to start:', error);
    process.exit(1);
  });
}
