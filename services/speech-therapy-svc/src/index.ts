import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
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
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for audio files
  });

  // Health checks
  app.get('/health', async () => ({ status: 'ok', service: 'speech-therapy-svc' }));

  // Placeholder routes - full implementation would include:
  // - /goals - CRUD for speech therapy goals
  // - /sessions - Session management
  // - /activities - Activity tracking
  // - /recordings - Audio upload and analysis
  // - /stimuli - Word/phrase library
  // - /home-practice - Home assignments
  // - /reports - Progress reports

  app.get('/goals/:learnerId', async (request, reply) => {
    reply.send({ message: 'Speech therapy goals endpoint - implementation pending' });
  });

  app.post('/recordings/upload', async (request, reply) => {
    reply.send({ message: 'Audio recording upload endpoint - implementation pending' });
  });

  app.post('/recordings/:id/analyze', async (request, reply) => {
    reply.send({ message: 'Speech analysis endpoint - implementation pending' });
  });

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`Speech Therapy Service listening on ${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
