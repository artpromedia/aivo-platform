import Fastify from 'fastify';

import { config } from './config.js';

const app = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    transport:
      config.nodeEnv !== 'production'
        ? {
            target: 'pino-pretty',
            options: { colorize: true },
          }
        : undefined,
  },
});

// Health check
app.get('/health', async () => ({ status: 'ok', service: 'goal-svc' }));

// Placeholder for routes
app.get('/', async () => ({
  service: 'goal-svc',
  version: '0.1.0',
  description: 'Goals & Session Planning Service',
}));

async function start() {
  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`🎯 Goal Service running on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
