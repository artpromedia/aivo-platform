import type { FastifyPluginAsync } from 'fastify';

export const registerHealthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (_request, reply) => {
    reply.code(200).send({ status: 'ok', service: 'focus-svc' });
  });

  app.get('/ready', async (_request, reply) => {
    reply.code(200).send({ status: 'ready' });
  });
};
