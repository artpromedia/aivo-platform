import { type FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

export async function registerSchoolRoutes(app: FastifyInstance) {
  app.post('/tenants/:id/schools', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'Invalid tenant id' });
    const body = z
      .object({
        name: z.string().min(2),
        address: z.string().optional(),
        external_id: z.string().optional(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid payload' });

    const school = await prisma.school.create({
      data: {
        tenantId: params.data.id,
        name: body.data.name,
        address: body.data.address ?? null,
        externalId: body.data.external_id ?? null,
      },
    });
    return reply.status(201).send(school);
  });

  app.get('/tenants/:id/schools', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'Invalid tenant id' });

    const schools = await prisma.school.findMany({
      where: { tenantId: params.data.id },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ total: schools.length, items: schools });
  });

  app.post('/schools/:schoolId/classrooms', async (request, reply) => {
    const params = z.object({ schoolId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'Invalid school id' });
    const body = z
      .object({ name: z.string().min(1), grade: z.string().min(1) })
      .safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid payload' });

    const classroom = await prisma.classroom.create({
      data: {
        schoolId: params.data.schoolId,
        name: body.data.name,
        grade: body.data.grade,
      },
    });
    return reply.status(201).send(classroom);
  });

  app.get('/schools/:schoolId/classrooms', async (request, reply) => {
    const params = z.object({ schoolId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'Invalid school id' });

    const classrooms = await prisma.classroom.findMany({
      where: { schoolId: params.data.schoolId },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ total: classrooms.length, items: classrooms });
  });
}
