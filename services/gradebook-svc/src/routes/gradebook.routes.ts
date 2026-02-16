/**
 * Gradebook Routes
 *
 * RESTful API endpoints for gradebook operations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { validateBody, validateParams, validateRequest } from '../middleware/validation.js';
import {
  classroomIdParamsSchema,
  idParamsSchema,
  studentClassroomParamsSchema,
  upsertGradebookConfigBodySchema,
  createCategoryBodySchema,
  updateCategoryWeightsBodySchema,
  createAssignmentBodySchema,
  updateAssignmentBodySchema,
  submitGradeBodySchema,
  gradeIdParamsSchema,
  updateGradeBodySchema,
  bulkImportGradesBodySchema,
} from '../schemas/gradebook.schemas.js';
import { gradebookService } from '../services/gradebook.service.js';
import type {
  CreateAssignmentInput,
  UpdateGradeInput,
  BulkGradeImport,
} from '../services/gradebook.service.js';

async function gradebookRoutes(app: FastifyInstance) {
  /**
   * GET /gradebook/classroom/:classroomId
   * Get classroom gradebook with all students and grades
   */
  app.get(
    '/classroom/:classroomId',
    async (request: FastifyRequest<{ Params: { classroomId: string } }>, reply: FastifyReply) => {
      const params = validateParams(reply, classroomIdParamsSchema, request.params);
      if (!params) return;
      try {
        const gradebook = await gradebookService.getClassroomGradebook(params.classroomId);
        return gradebook;
      } catch (error) {
        console.error('Error fetching gradebook:', error);
        reply.status(500);
        return { error: 'Failed to fetch gradebook' };
      }
    }
  );

  /**
   * GET /gradebook/config/:classroomId
   * Get gradebook configuration
   */
  app.get(
    '/config/:classroomId',
    async (request: FastifyRequest<{ Params: { classroomId: string } }>, reply: FastifyReply) => {
      const params = validateParams(reply, classroomIdParamsSchema, request.params);
      if (!params) return;
      try {
        const config = await gradebookService.getGradebookConfig(params.classroomId);
        if (!config) {
          reply.status(404);
          return { error: 'Gradebook config not found' };
        }
        return config;
      } catch (error) {
        console.error('Error fetching gradebook config:', error);
        reply.status(500);
        return { error: 'Failed to fetch gradebook config' };
      }
    }
  );

  /**
   * POST /gradebook/config
   * Create or update gradebook configuration
   */
  app.post('/config', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validateBody(reply, upsertGradebookConfigBodySchema, request.body);
    if (!body) return;
    try {
      const { classroomId, teacherId, tenantId, ...config } = body;
      const result = await gradebookService.upsertGradebookConfig(
        classroomId,
        teacherId,
        tenantId,
        config
      );
      return result;
    } catch (error) {
      console.error('Error upserting gradebook config:', error);
      reply.status(500);
      return { error: 'Failed to save gradebook config' };
    }
  });

  /**
   * POST /gradebook/categories
   * Create grade category
   */
  app.post('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validateBody(reply, createCategoryBodySchema, request.body);
    if (!body) return;
    try {
      const { gradebookConfigId, name, weight, color, dropLowest, orderIndex } = body;
      const category = await gradebookService.createCategory(gradebookConfigId, name, weight, {
        color,
        dropLowest,
        orderIndex,
      });
      return category;
    } catch (error) {
      console.error('Error creating category:', error);
      reply.status(500);
      return { error: 'Failed to create category' };
    }
  });

  /**
   * PUT /gradebook/categories/weights
   * Update category weights
   */
  app.put('/categories/weights', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validateBody(reply, updateCategoryWeightsBodySchema, request.body);
    if (!body) return;
    try {
      await gradebookService.updateCategoryWeights(
        body.categories as { id: string; weight: number }[]
      );
      return { success: true };
    } catch (error) {
      console.error('Error updating category weights:', error);
      reply.status(500);
      return { error: 'Failed to update category weights' };
    }
  });

  /**
   * POST /gradebook/assignments
   * Create assignment
   */
  app.post('/assignments', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validateBody(reply, createAssignmentBodySchema, request.body);
    if (!body) return;
    try {
      const assignment = await gradebookService.createAssignment(body as CreateAssignmentInput);
      return assignment;
    } catch (error) {
      console.error('Error creating assignment:', error);
      reply.status(500);
      return { error: 'Failed to create assignment' };
    }
  });

  /**
   * GET /gradebook/assignments/:id
   * Get assignment details
   */
  app.get(
    '/assignments/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = validateParams(reply, idParamsSchema, request.params);
      if (!params) return;
      try {
        const assignment = await gradebookService.getAssignment(params.id);
        if (!assignment) {
          reply.status(404);
          return { error: 'Assignment not found' };
        }
        return assignment;
      } catch (error) {
        console.error('Error fetching assignment:', error);
        reply.status(500);
        return { error: 'Failed to fetch assignment' };
      }
    }
  );

  /**
   * PUT /gradebook/assignments/:id
   * Update assignment
   */
  app.put(
    '/assignments/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const validated = validateRequest(
        reply,
        { params: idParamsSchema, body: updateAssignmentBodySchema },
        { params: request.params, body: request.body }
      );
      if (!validated) return;
      try {
        const { id } = validated.params as { id: string };
        const body = validated.body as Record<string, unknown>;
        const updateData = {
          ...body,
          type: body.type as string | undefined,
        };
        const assignment = await gradebookService.updateAssignment(id, updateData);
        return assignment;
      } catch (error) {
        console.error('Error updating assignment:', error);
        reply.status(500);
        return { error: 'Failed to update assignment' };
      }
    }
  );

  /**
   * POST /gradebook/assignments/:id/publish
   * Publish assignment
   */
  app.post(
    '/assignments/:id/publish',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = validateParams(reply, idParamsSchema, request.params);
      if (!params) return;
      try {
        const assignment = await gradebookService.publishAssignment(params.id);
        return assignment;
      } catch (error) {
        console.error('Error publishing assignment:', error);
        reply.status(500);
        return { error: 'Failed to publish assignment' };
      }
    }
  );

  /**
   * DELETE /gradebook/assignments/:id
   * Delete assignment
   */
  app.delete(
    '/assignments/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = validateParams(reply, idParamsSchema, request.params);
      if (!params) return;
      try {
        await gradebookService.deleteAssignment(params.id);
        return { success: true };
      } catch (error) {
        console.error('Error deleting assignment:', error);
        reply.status(500);
        return { error: 'Failed to delete assignment' };
      }
    }
  );

  /**
   * POST /gradebook/grades
   * Submit or update grade
   */
  app.post('/grades', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validateBody(reply, submitGradeBodySchema, request.body);
    if (!body) return;
    try {
      const grade = await gradebookService.submitGrade(body as UpdateGradeInput);
      return grade;
    } catch (error) {
      console.error('Error submitting grade:', error);
      reply.status(500);
      return { error: 'Failed to submit grade' };
    }
  });

  /**
   * PUT /gradebook/grades/:id
   * Update grade
   */
  app.put(
    '/grades/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const validated = validateRequest(
        reply,
        { params: gradeIdParamsSchema, body: updateGradeBodySchema },
        { params: request.params, body: request.body }
      );
      if (!validated) return;
      try {
        const { id } = validated.params as { id: string };
        const grade = await gradebookService.submitGrade({
          gradeId: id,
          ...validated.body,
        } as UpdateGradeInput);
        return grade;
      } catch (error) {
        console.error('Error updating grade:', error);
        reply.status(500);
        return { error: 'Failed to update grade' };
      }
    }
  );

  /**
   * GET /gradebook/grades/:id/history
   * Get grade history (audit log)
   */
  app.get(
    '/grades/:id/history',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = validateParams(reply, gradeIdParamsSchema, request.params);
      if (!params) return;
      try {
        const history = await gradebookService.getGradeHistory(params.id);
        return history;
      } catch (error) {
        console.error('Error fetching grade history:', error);
        reply.status(500);
        return { error: 'Failed to fetch grade history' };
      }
    }
  );

  /**
   * GET /gradebook/student/:studentId/classroom/:classroomId
   * Get student grades
   */
  app.get(
    '/student/:studentId/classroom/:classroomId',
    async (
      request: FastifyRequest<{ Params: { studentId: string; classroomId: string } }>,
      reply: FastifyReply
    ) => {
      const params = validateParams(reply, studentClassroomParamsSchema, request.params);
      if (!params) return;
      try {
        const result = await gradebookService.getStudentGrades(
          params.classroomId,
          params.studentId
        );
        return result;
      } catch (error) {
        console.error('Error fetching student grades:', error);
        reply.status(500);
        return { error: 'Failed to fetch student grades' };
      }
    }
  );

  /**
   * POST /gradebook/import
   * Bulk import grades
   */
  app.post('/import', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validateBody(reply, bulkImportGradesBodySchema, request.body);
    if (!body) return;
    try {
      const result = await gradebookService.bulkImportGrades(body as BulkGradeImport);
      return result;
    } catch (error) {
      console.error('Error importing grades:', error);
      reply.status(500);
      return { error: 'Failed to import grades' };
    }
  });

  /**
   * GET /gradebook/export/:classroomId
   * Export gradebook as CSV
   */
  app.get(
    '/export/:classroomId',
    async (request: FastifyRequest<{ Params: { classroomId: string } }>, reply: FastifyReply) => {
      const params = validateParams(reply, classroomIdParamsSchema, request.params);
      if (!params) return;
      try {
        const csv = await gradebookService.exportGradebook(params.classroomId);
        reply.header('Content-Type', 'text/csv');
        reply.header(
          'Content-Disposition',
          `attachment; filename="gradebook-${params.classroomId}.csv"`
        );
        return csv;
      } catch (error) {
        console.error('Error exporting gradebook:', error);
        reply.status(500);
        return { error: 'Failed to export gradebook' };
      }
    }
  );
}

export default gradebookRoutes;
