import { type FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

const tenantCreateSchema = z.object({
  type: z.enum(['CONSUMER', 'DISTRICT', 'CLINIC']),
  name: z.string().min(2),
  primary_domain: z.string().min(3),
});

const tenantUpdateSchema = z.object({
  type: z.enum(['CONSUMER', 'DISTRICT', 'CLINIC']).optional(),
  name: z.string().min(2).optional(),
  primary_domain: z.string().min(3).optional(),
  settings: z.record(z.any()).optional(),
});

export async function registerTenantRoutes(app: FastifyInstance) {
  app.post('/tenants', async (request, reply) => {
    const parsed = tenantCreateSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid payload' });
    const { type, name, primary_domain } = parsed.data;

    const tenant = await prisma.tenant.create({
      data: {
        type,
        name,
        primaryDomain: primary_domain,
        settingsJson: {},
      },
    });
    return reply.status(201).send(tenant);
  });

  app.get('/tenants', async (request, reply) => {
    const querySchema = z.object({
      type: z.enum(['CONSUMER', 'DISTRICT', 'CLINIC']).optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0),
    });
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid query' });
    const { type, limit, offset } = parsed.data;

    const where = type ? { type } : {};
    const [items, total] = await Promise.all([
      prisma.tenant.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.tenant.count({ where }),
    ]);

    return reply.send({ total, items, limit, offset });
  });

  app.get('/tenants/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'Invalid id' });

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.data.id },
      include: {
        schools: {
          include: {
            classrooms: true,
          },
        },
      },
    });
    if (!tenant) return reply.status(404).send({ error: 'Not found' });

    const stats = {
      schools: tenant.schools.length,
      classrooms: tenant.schools.reduce(
        (acc: number, s: (typeof tenant.schools)[number]) => acc + s.classrooms.length,
        0
      ),
    };

    return reply.send({ ...tenant, stats });
  });

  app.patch('/tenants/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'Invalid id' });
    const body = tenantUpdateSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid payload' });

    const data: any = {};
    if (body.data.type) data.type = body.data.type;
    if (body.data.name) data.name = body.data.name;
    if (body.data.primary_domain) data.primaryDomain = body.data.primary_domain;
    if (body.data.settings) data.settingsJson = body.data.settings;

    try {
      const updated = await prisma.tenant.update({ where: { id: params.data.id }, data });
      return reply.send(updated);
    } catch (err) {
      return reply.status(404).send({ error: 'Not found' });
    }
  });
}
