/**
 * Units routes for Curriculum Service
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CurriculumService } from '../services/curriculum.service.js';
import { prisma } from '../db.js';

const curriculumService = new CurriculumService(prisma);

const CreateUnitSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  orderIndex: z.number().int().min(0),
  estimatedDuration: z.number().int().optional(),
  objectives: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const UpdateUnitSchema = CreateUnitSchema.partial();

const ReorderUnitsSchema = z.object({
  unitOrder: z.array(z.object({
    unitId: z.string(),
    orderIndex: z.number().int().min(0),
  })),
});

export async function unitsRoutes(app: FastifyInstance) {
  // List units for a curriculum
  app.get('/curriculum/:curriculumId', async (request: FastifyRequest<{
    Params: { curriculumId: string };
    Querystring: { tenantId: string }
  }>) => {
    const { curriculumId } = request.params;
    const { tenantId } = request.query;
    return curriculumService.listUnits(curriculumId, tenantId);
  });

  // Get unit by ID
  app.get('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    return curriculumService.getUnitById(id, tenantId);
  });

  // Create unit
  app.post('/curriculum/:curriculumId', async (request: FastifyRequest<{
    Params: { curriculumId: string };
    Body: z.infer<typeof CreateUnitSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { curriculumId } = request.params;
    const { tenantId } = request.query;
    const data = CreateUnitSchema.parse(request.body);
    return curriculumService.createUnit({
      ...data,
      curriculumId,
      tenantId,
    });
  });

  // Update unit
  app.put('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof UpdateUnitSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    const data = UpdateUnitSchema.parse(request.body);
    return curriculumService.updateUnit(id, tenantId, data);
  });

  // Delete unit
  app.delete('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    await curriculumService.deleteUnit(id, tenantId);
    return { success: true };
  });

  // Reorder units
  app.post('/curriculum/:curriculumId/reorder', async (request: FastifyRequest<{
    Params: { curriculumId: string };
    Body: z.infer<typeof ReorderUnitsSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { curriculumId } = request.params;
    const { tenantId } = request.query;
    const { unitOrder } = ReorderUnitsSchema.parse(request.body);
    return curriculumService.reorderUnits(curriculumId, tenantId, unitOrder);
  });
}
