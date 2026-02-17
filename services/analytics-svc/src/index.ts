import { connect } from 'nats';

import { buildApp } from './app.js';
import { config } from './config.js';
import { EventConsumer } from './consumers/event.consumer.js';

let eventConsumer: EventConsumer | null = null;

async function main() {
  const app = await buildApp();

  // ---------------------------------------------------------------------------
  // Start NATS EventConsumer (Session → Analytics pipeline)
  // ---------------------------------------------------------------------------
  if (config.nats.enabled) {
    try {
      const nc = await connect({
        servers: config.nats.servers,
        token: config.nats.token,
        user: config.nats.user,
        pass: config.nats.pass,
        name: 'analytics-svc-consumer',
        reconnect: true,
        maxReconnectAttempts: -1, // unlimited
        reconnectTimeWait: 2_000,
      });

      console.log(`[NATS] Connected to ${config.nats.servers}`);

      eventConsumer = new EventConsumer(nc);
      await eventConsumer.start();
    } catch (err) {
      console.error(
        '[NATS] Failed to connect — analytics will run without event consumption:',
        err
      );
      // Graceful degradation: HTTP still works, events just aren't consumed
    }
  } else {
    console.log('[NATS] Disabled — event consumption skipped');
  }

  // ---------------------------------------------------------------------------
  // Start HTTP server
  // ---------------------------------------------------------------------------
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Analytics service listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Graceful shutdown
  // ---------------------------------------------------------------------------
  const shutdown = async (signal: string) => {
    console.log(`\n[${signal}] Shutting down analytics-svc…`);
    if (eventConsumer) {
      await eventConsumer.stop();
    }
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
