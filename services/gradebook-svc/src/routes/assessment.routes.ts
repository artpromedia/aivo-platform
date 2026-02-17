/**
 * Assessment Builder Routes
 *
 * RESTful API endpoints for assessment building
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  validateBody,
  validateParams,
  validateQuery,
  validateRequest,
} from '../middleware/validation.js';
import {
  assessmentIdParamsSchema,
  questionIdParamsSchema,
  submissionIdParamsSchema,
  rubricIdParamsSchema,
  createAssessmentBodySchema,
  updateAssessmentBodySchema,
  addQuestionBodySchema,
  updateQuestionBodySchema,
  reorderQuestionsBodySchema,
  gradeSubmissionBodySchema,
  importQuestionsBodySchema,
  autoGenerateBodySchema,
  questionBankQuerySchema,
  addToQuestionBankBodySchema,
  rubricQuerySchema,
  createRubricBodySchema,
} from '../schemas/assessment.schemas.js';
import { assessmentBuilderService } from '../services/assessment-builder.service.js';
import type {
  CreateAssessmentInput,
  CreateQuestionInput,
  AutoGenerateInput,
  CreateRubricInput,
} from '../services/assessment-builder.service.js';

async function assessmentRoutes(app: FastifyInstance) {
  /**
   * POST /assessments
   * Create new assessment
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validateBody(reply, createAssessmentBodySchema, request.body);
    if (!body) return;
    try {
      const assessment = await assessmentBuilderService.createAssessment(
        body as CreateAssessmentInput
      );
      return assessment;
    } catch (error) {
      console.error('Error creating assessment:', error);
      reply.status(500);
      return { error: 'Failed to create assessment' };
    }
  });

  /**
   * GET /assessments/:id
   * Get assessment by ID
   */
  app.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = validateParams(reply, assessmentIdParamsSchema, request.params);
      if (!params) return;
      try {
        const assessment = await assessmentBuilderService.getAssessment(params.id);
        if (!assessment) {
          reply.status(404);
          return { error: 'Assessment not found' };
        }
        return assessment;
      } catch (error) {
        console.error('Error fetching assessment:', error);
        reply.status(500);
        return { error: 'Failed to fetch assessment' };
      }
    }
  );

  /**
   * PUT /assessments/:id
   * Update assessment
   */
  app.put(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const validated = validateRequest(
        reply,
        { params: assessmentIdParamsSchema, body: updateAssessmentBodySchema },
        { params: request.params, body: request.body }
      );
      if (!validated) return;
      try {
        const { id } = validated.params as { id: string };
        const assessment = await assessmentBuilderService.updateAssessment(
          id,
          validated.body as Record<string, unknown>
        );
        return assessment;
      } catch (error) {
        console.error('Error updating assessment:', error);
        reply.status(500);
        return { error: 'Failed to update assessment' };
      }
    }
  );

  /**
   * POST /assessments/:id/publish
   * Publish assessment
   */
  app.post(
    '/:id/publish',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = validateParams(reply, assessmentIdParamsSchema, request.params);
      if (!params) return;
      try {
        const assessment = await assessmentBuilderService.publishAssessment(params.id);
        return assessment;
      } catch (error) {
        console.error('Error publishing assessment:', error);
        reply.status(500);
        return { error: 'Failed to publish assessment' };
      }
    }
  );

  /**
   * DELETE /assessments/:id
   * Delete assessment
   */
  app.delete(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = validateParams(reply, assessmentIdParamsSchema, request.params);
      if (!params) return;
      try {
        await assessmentBuilderService.deleteAssessment(params.id);
        return { success: true };
      } catch (error) {
        console.error('Error deleting assessment:', error);
        reply.status(500);
        return { error: 'Failed to delete assessment' };
      }
    }
  );

  /**
   * POST /assessments/:id/questions
   * Add question to assessment
   */
  app.post(
    '/:id/questions',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const validated = validateRequest(
        reply,
        { params: assessmentIdParamsSchema, body: addQuestionBodySchema },
        { params: request.params, body: request.body }
      );
      if (!validated) return;
      try {
        const { id } = validated.params as { id: string };
        const question = await assessmentBuilderService.addQuestion({
          assessmentId: id,
          ...validated.body,
        } as CreateQuestionInput);
        return question;
      } catch (error) {
        console.error('Error adding question:', error);
        reply.status(500);
        return { error: 'Failed to add question' };
      }
    }
  );

  /**
   * PUT /assessments/questions/:questionId
   * Update question
   */
  app.put(
    '/questions/:questionId',
    async (request: FastifyRequest<{ Params: { questionId: string } }>, reply: FastifyReply) => {
      const validated = validateRequest(
        reply,
        { params: questionIdParamsSchema, body: updateQuestionBodySchema },
        { params: request.params, body: request.body }
      );
      if (!validated) return;
      try {
        const { questionId } = validated.params as { questionId: string };
        const question = await assessmentBuilderService.updateQuestion(
          questionId,
          validated.body as Record<string, unknown>
        );
        return question;
      } catch (error) {
        console.error('Error updating question:', error);
        reply.status(500);
        return { error: 'Failed to update question' };
      }
    }
  );

  /**
   * DELETE /assessments/questions/:questionId
   * Delete question
   */
  app.delete(
    '/questions/:questionId',
    async (request: FastifyRequest<{ Params: { questionId: string } }>, reply: FastifyReply) => {
      const params = validateParams(reply, questionIdParamsSchema, request.params);
      if (!params) return;
      try {
        await assessmentBuilderService.deleteQuestion(params.questionId);
        return { success: true };
      } catch (error) {
        console.error('Error deleting question:', error);
        reply.status(500);
        return { error: 'Failed to delete question' };
      }
    }
  );

  /**
   * PUT /assessments/:id/questions/reorder
   * Reorder questions
   */
  app.put(
    '/:id/questions/reorder',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const validated = validateRequest(
        reply,
        { params: assessmentIdParamsSchema, body: reorderQuestionsBodySchema },
        { params: request.params, body: request.body }
      );
      if (!validated) return;
      try {
        const body = validated.body as { questions: { id: string; orderIndex: number }[] };
        await assessmentBuilderService.reorderQuestions(body.questions);
        return { success: true };
      } catch (error) {
        console.error('Error reordering questions:', error);
        reply.status(500);
        return { error: 'Failed to reorder questions' };
      }
    }
  );

  /**
   * GET /assessments/:id/submissions
   * Get assessment submissions
   */
  app.get(
    '/:id/submissions',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = validateParams(reply, assessmentIdParamsSchema, request.params);
      if (!params) return;
      try {
        const submissions = await assessmentBuilderService.getSubmissions(params.id);
        return submissions;
      } catch (error) {
        console.error('Error fetching submissions:', error);
        reply.status(500);
        return { error: 'Failed to fetch submissions' };
      }
    }
  );

  /**
   * POST /assessments/submissions/:submissionId/grade
   * Grade assessment submission
   */
  app.post(
    '/submissions/:submissionId/grade',
    async (request: FastifyRequest<{ Params: { submissionId: string } }>, reply: FastifyReply) => {
      const validated = validateRequest(
        reply,
        { params: submissionIdParamsSchema, body: gradeSubmissionBodySchema },
        { params: request.params, body: request.body }
      );
      if (!validated) return;
      try {
        const { submissionId } = validated.params as { submissionId: string };
        const { gradedBy, feedback } = validated.body as { gradedBy: string; feedback?: string };
        const submission = await assessmentBuilderService.gradeSubmission(
          submissionId,
          gradedBy,
          feedback
        );
        return submission;
      } catch (error) {
        console.error('Error grading submission:', error);
        reply.status(500);
        return { error: 'Failed to grade submission' };
      }
    }
  );

  /**
   * POST /assessments/:id/import
   * Import questions from another assessment
   */
  app.post(
    '/:id/import',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const validated = validateRequest(
        reply,
        { params: assessmentIdParamsSchema, body: importQuestionsBodySchema },
        { params: request.params, body: request.body }
      );
      if (!validated) return;
      try {
        const { id } = validated.params as { id: string };
        const { sourceAssessmentId } = validated.body as { sourceAssessmentId: string };
        const questions = await assessmentBuilderService.importQuestions(id, sourceAssessmentId);
        return questions;
      } catch (error) {
        console.error('Error importing questions:', error);
        reply.status(500);
        return { error: 'Failed to import questions' };
      }
    }
  );

  /**
   * POST /assessments/auto-generate
   * Auto-generate assessment from question bank
   */
  app.post('/auto-generate', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validateBody(reply, autoGenerateBodySchema, request.body);
    if (!body) return;
    try {
      const assessment = await assessmentBuilderService.autoGenerateAssessment(
        body as AutoGenerateInput
      );
      return assessment;
    } catch (error) {
      console.error('Error auto-generating assessment:', error);
      reply.status(500);
      return { error: 'Failed to auto-generate assessment' };
    }
  });

  /**
   * GET /question-bank
   * Browse question bank
   */
  app.get('/question-bank', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = validateQuery(reply, questionBankQuerySchema, request.query);
    if (!query) return;
    try {
      const questions = await assessmentBuilderService.browseQuestionBank({
        teacherId: query.teacherId,
        tenantId: query.tenantId,
        tags: query.tags ? query.tags.split(',') : undefined,
        type: query.type,
        subjectId: query.subjectId,
        gradeLevel: query.gradeLevel,
        difficulty: query.difficulty,
      });
      return questions;
    } catch (error) {
      console.error('Error browsing question bank:', error);
      reply.status(500);
      return { error: 'Failed to browse question bank' };
    }
  });

  /**
   * POST /question-bank
   * Add question to question bank
   */
  app.post('/question-bank', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validateBody(reply, addToQuestionBankBodySchema, request.body);
    if (!body) return;
    try {
      const question = await assessmentBuilderService.addToQuestionBank(body as any);
      return question;
    } catch (error) {
      console.error('Error adding to question bank:', error);
      reply.status(500);
      return { error: 'Failed to add to question bank' };
    }
  });

  /**
   * GET /rubrics
   * List rubrics
   */
  app.get('/rubrics', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = validateQuery(reply, rubricQuerySchema, request.query);
    if (!query) return;
    try {
      const rubrics = await assessmentBuilderService.listRubrics(query.teacherId, query.tenantId);
      return rubrics;
    } catch (error) {
      console.error('Error listing rubrics:', error);
      reply.status(500);
      return { error: 'Failed to list rubrics' };
    }
  });

  /**
   * POST /rubrics
   * Create rubric
   */
  app.post('/rubrics', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validateBody(reply, createRubricBodySchema, request.body);
    if (!body) return;
    try {
      const rubric = await assessmentBuilderService.createRubric(body as CreateRubricInput);
      return rubric;
    } catch (error) {
      console.error('Error creating rubric:', error);
      reply.status(500);
      return { error: 'Failed to create rubric' };
    }
  });

  /**
   * GET /rubrics/:id
   * Get rubric
   */
  app.get(
    '/rubrics/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = validateParams(reply, rubricIdParamsSchema, request.params);
      if (!params) return;
      try {
        const rubric = await assessmentBuilderService.getRubric(params.id);
        if (!rubric) {
          reply.status(404);
          return { error: 'Rubric not found' };
        }
        return rubric;
      } catch (error) {
        console.error('Error fetching rubric:', error);
        reply.status(500);
        return { error: 'Failed to fetch rubric' };
      }
    }
  );
}

export default assessmentRoutes;
