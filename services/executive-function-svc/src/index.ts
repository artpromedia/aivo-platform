import Fastify from 'fastify';
import cors from '@fastify/cors';
import 'dotenv/config';

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
};

async function main() {
  const app = Fastify({
    logger: { level: config.logLevel },
  });

  await app.register(cors, { origin: true, credentials: true });

  // Health checks
  app.get('/health', async () => ({ status: 'ok', service: 'executive-function-svc' }));

  // ═══════════════════════════════════════════════════════════════════════════
  // EF PROFILE
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/profile/:learnerId', async (request, reply) => {
    reply.send({ message: 'Get EF profile endpoint' });
  });

  app.put('/profile/:learnerId', async (request, reply) => {
    reply.send({ message: 'Update EF profile endpoint' });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/tasks', async (request, reply) => {
    reply.send({ message: 'List tasks endpoint' });
  });

  app.post('/tasks', async (request, reply) => {
    reply.send({ message: 'Create task endpoint' });
  });

  app.patch('/tasks/:id', async (request, reply) => {
    reply.send({ message: 'Update task endpoint' });
  });

  app.post('/tasks/:id/complete', async (request, reply) => {
    reply.send({ message: 'Complete task endpoint' });
  });

  app.post('/tasks/:id/check-in', async (request, reply) => {
    reply.send({ message: 'Task check-in endpoint' });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK BREAKDOWN (AI-assisted)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/planning/breakdown', async (request, reply) => {
    reply.send({ message: 'AI task breakdown endpoint' });
  });

  app.post('/planning/sessions', async (request, reply) => {
    reply.send({ message: 'Create planning session endpoint' });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VISUAL SCHEDULES
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/schedules/today', async (request, reply) => {
    reply.send({ message: 'Get today\'s schedule endpoint' });
  });

  app.get('/schedules/:date', async (request, reply) => {
    reply.send({ message: 'Get schedule for date endpoint' });
  });

  app.post('/schedules', async (request, reply) => {
    reply.send({ message: 'Create schedule endpoint' });
  });

  app.post('/schedules/:id/blocks/:blockId/complete', async (request, reply) => {
    reply.send({ message: 'Complete schedule block endpoint' });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/templates', async (request, reply) => {
    reply.send({ message: 'List schedule templates endpoint' });
  });

  app.post('/templates', async (request, reply) => {
    reply.send({ message: 'Create schedule template endpoint' });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STRATEGIES
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/strategies', async (request, reply) => {
    reply.send({ message: 'List EF strategies endpoint' });
  });

  app.get('/strategies/recommended', async (request, reply) => {
    reply.send({ message: 'Get recommended strategies endpoint' });
  });

  app.post('/strategies/:id/use', async (request, reply) => {
    reply.send({ message: 'Record strategy usage endpoint' });
  });

  app.post('/strategies/:id/rate', async (request, reply) => {
    reply.send({ message: 'Rate strategy endpoint' });
  });

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`Executive Function Service listening on ${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
