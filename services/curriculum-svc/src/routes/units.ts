/**
 * Units routes for Curriculum Service
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma } from '../db.js';
import { CurriculumService } from '../services/curriculum.service.js';

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
    // Get curriculum with units included
    const curriculum = await curriculumService.getCurriculum(curriculumId);
    return curriculum?.units ?? [];
  });

  // Get unit by ID
  app.get('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    return curriculumService.getUnit(id);
  });

  // Create unit
  app.post('/curriculum/:curriculumId', async (request: FastifyRequest<{
    Params: { curriculumId: string };
    Body: z.infer<typeof CreateUnitSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { curriculumId } = request.params;
    const data = CreateUnitSchema.parse(request.body);
    return curriculumService.createUnit({
      curriculumId,
      title: data.title,
      description: data.description,
      orderIndex: data.orderIndex,
      durationDays: data.estimatedDuration ?? 0,
      essentialQuestions: data.objectives,
    });
  });

  // Update unit
  app.put('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof UpdateUnitSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    const data = UpdateUnitSchema.parse(request.body);
    return curriculumService.updateUnit(id, {
      title: data.title,
      description: data.description,
      orderIndex: data.orderIndex,
      durationDays: data.estimatedDuration,
    });
  });

  // Delete unit
  app.delete('/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string }
  }>) => {
    const { id } = request.params;
    await curriculumService.deleteUnit(id);
    return { success: true };
  });

  // Reorder units
  app.post('/curriculum/:curriculumId/reorder', async (request: FastifyRequest<{
    Params: { curriculumId: string };
    Body: z.infer<typeof ReorderUnitsSchema>;
    Querystring: { tenantId: string }
  }>) => {
    const { unitOrder } = ReorderUnitsSchema.parse(request.body);
    // Extract unit IDs in order
    const unitIds = unitOrder
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(item => item.unitId);
    await curriculumService.reorderUnits(unitIds);
    return { success: true };
  });
}
