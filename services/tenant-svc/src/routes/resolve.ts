import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma';

export async function registerResolveRoutes(app: FastifyInstance) {
  app.get('/tenant/resolve', async (request, reply) => {
    const parsed = z.object({ host: z.string().min(3) }).safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid host' });
    const host = parsed.data.host.toLowerCase();

    const tenant = await prisma.tenant.findFirst({ where: { primaryDomain: host } });
    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });

    return reply.send({
      tenant_id: tenant.id,
      name: tenant.name,
      type: tenant.type,
      primary_domain: tenant.primaryDomain,
    });
  });
}
