/**
 * Assessment Builder Routes
 *
 * RESTful API endpoints for assessment building
 */

import { Router } from 'express';
import type { Request, Response } from 'express';

import { validate, validateBody, validateParams, validateQuery } from '../middleware/validation.js';
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
  type AssessmentIdParams,
  type QuestionIdParams,
  type SubmissionIdParams,
  type RubricIdParams,
  type CreateAssessmentBody,
  type UpdateAssessmentBody,
  type AddQuestionBody,
  type UpdateQuestionBody,
  type ReorderQuestionsBody,
  type GradeSubmissionBody,
  type ImportQuestionsBody,
  type AutoGenerateBody,
  type QuestionBankQuery,
  type AddToQuestionBankBody,
  type RubricQuery,
  type CreateRubricBody,
} from '../schemas/assessment.schemas.js';
import { assessmentBuilderService } from '../services/assessment-builder.service.js';
import type {
  CreateAssessmentInput,
  CreateQuestionInput,
  AutoGenerateInput,
  CreateRubricInput,
} from '../services/assessment-builder.service.js';

const router = Router();

/**
 * POST /assessments
 * Create new assessment
 */
router.post(
  '/',
  validateBody(createAssessmentBodySchema),
  async (req: Request<{}, {}, CreateAssessmentBody>, res: Response) => {
    try {
      // Type assertion is safe here because Zod has validated the data
      const assessment = await assessmentBuilderService.createAssessment(req.body as CreateAssessmentInput);
      res.json(assessment);
    } catch (error) {
      console.error('Error creating assessment:', error);
      res.status(500).json({ error: 'Failed to create assessment' });
    }
  }
);

/**
 * GET /assessments/:id
 * Get assessment by ID
 */
router.get(
  '/:id',
  validateParams(assessmentIdParamsSchema),
  async (req: Request<AssessmentIdParams>, res: Response) => {
    try {
      const { id } = req.params;
      const assessment = await assessmentBuilderService.getAssessment(id);

      if (!assessment) {
        res.status(404).json({ error: 'Assessment not found' });
        return;
      }

      res.json(assessment);
    } catch (error) {
      console.error('Error fetching assessment:', error);
      res.status(500).json({ error: 'Failed to fetch assessment' });
    }
  }
);

/**
 * PUT /assessments/:id
 * Update assessment
 */
router.put(
  '/:id',
  validate({
    params: assessmentIdParamsSchema,
    body: updateAssessmentBodySchema,
  }),
  async (req: Request<AssessmentIdParams, {}, UpdateAssessmentBody>, res: Response) => {
    try {
      const { id } = req.params;
      const assessment = await assessmentBuilderService.updateAssessment(id, req.body);
      res.json(assessment);
    } catch (error) {
      console.error('Error updating assessment:', error);
      res.status(500).json({ error: 'Failed to update assessment' });
    }
  }
);

/**
 * POST /assessments/:id/publish
 * Publish assessment
 */
router.post(
  '/:id/publish',
  validateParams(assessmentIdParamsSchema),
  async (req: Request<AssessmentIdParams>, res: Response) => {
    try {
      const { id } = req.params;
      const assessment = await assessmentBuilderService.publishAssessment(id);
      res.json(assessment);
    } catch (error) {
      console.error('Error publishing assessment:', error);
      res.status(500).json({ error: 'Failed to publish assessment' });
    }
  }
);

/**
 * DELETE /assessments/:id
 * Delete assessment
 */
router.delete(
  '/:id',
  validateParams(assessmentIdParamsSchema),
  async (req: Request<AssessmentIdParams>, res: Response) => {
    try {
      const { id } = req.params;
      await assessmentBuilderService.deleteAssessment(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting assessment:', error);
      res.status(500).json({ error: 'Failed to delete assessment' });
    }
  }
);

/**
 * POST /assessments/:id/questions
 * Add question to assessment
 */
router.post(
  '/:id/questions',
  validate({
    params: assessmentIdParamsSchema,
    body: addQuestionBodySchema,
  }),
  async (req: Request<AssessmentIdParams, {}, AddQuestionBody>, res: Response) => {
    try {
      const { id } = req.params;
      // Type assertion is safe here because Zod has validated the data
      const question = await assessmentBuilderService.addQuestion({
        assessmentId: id,
        ...req.body,
      } as CreateQuestionInput);
      res.json(question);
    } catch (error) {
      console.error('Error adding question:', error);
      res.status(500).json({ error: 'Failed to add question' });
    }
  }
);

/**
 * PUT /assessments/questions/:questionId
 * Update question
 */
router.put(
  '/questions/:questionId',
  validate({
    params: questionIdParamsSchema,
    body: updateQuestionBodySchema,
  }),
  async (req: Request<QuestionIdParams, {}, UpdateQuestionBody>, res: Response) => {
    try {
      const { questionId } = req.params;
      const question = await assessmentBuilderService.updateQuestion(questionId, req.body);
      res.json(question);
    } catch (error) {
      console.error('Error updating question:', error);
      res.status(500).json({ error: 'Failed to update question' });
    }
  }
);

/**
 * DELETE /assessments/questions/:questionId
 * Delete question
 */
router.delete(
  '/questions/:questionId',
  validateParams(questionIdParamsSchema),
  async (req: Request<QuestionIdParams>, res: Response) => {
    try {
      const { questionId } = req.params;
      await assessmentBuilderService.deleteQuestion(questionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting question:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  }
);

/**
 * PUT /assessments/:id/questions/reorder
 * Reorder questions
 */
router.put(
  '/:id/questions/reorder',
  validate({
    params: assessmentIdParamsSchema,
    body: reorderQuestionsBodySchema,
  }),
  async (req: Request<AssessmentIdParams, {}, ReorderQuestionsBody>, res: Response) => {
    try {
      const { questions } = req.body;

      // Type assertion is safe here because Zod has validated the data
      await assessmentBuilderService.reorderQuestions(questions as { id: string; orderIndex: number }[]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error reordering questions:', error);
      res.status(500).json({ error: 'Failed to reorder questions' });
    }
  }
);

/**
 * GET /assessments/:id/submissions
 * Get assessment submissions
 */
router.get(
  '/:id/submissions',
  validateParams(assessmentIdParamsSchema),
  async (req: Request<AssessmentIdParams>, res: Response) => {
    try {
      const { id } = req.params;
      const submissions = await assessmentBuilderService.getSubmissions(id);
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  }
);

/**
 * POST /assessments/submissions/:submissionId/grade
 * Grade assessment submission
 */
router.post(
  '/submissions/:submissionId/grade',
  validate({
    params: submissionIdParamsSchema,
    body: gradeSubmissionBodySchema,
  }),
  async (req: Request<SubmissionIdParams, {}, GradeSubmissionBody>, res: Response) => {
    try {
      const { submissionId } = req.params;
      const { gradedBy, feedback } = req.body;

      const submission = await assessmentBuilderService.gradeSubmission(
        submissionId,
        gradedBy,
        feedback
      );
      res.json(submission);
    } catch (error) {
      console.error('Error grading submission:', error);
      res.status(500).json({ error: 'Failed to grade submission' });
    }
  }
);

/**
 * POST /assessments/:id/import
 * Import questions from another assessment
 */
router.post(
  '/:id/import',
  validate({
    params: assessmentIdParamsSchema,
    body: importQuestionsBodySchema,
  }),
  async (req: Request<AssessmentIdParams, {}, ImportQuestionsBody>, res: Response) => {
    try {
      const { id } = req.params;
      const { sourceAssessmentId } = req.body;

      const questions = await assessmentBuilderService.importQuestions(id, sourceAssessmentId);
      res.json(questions);
    } catch (error) {
      console.error('Error importing questions:', error);
      res.status(500).json({ error: 'Failed to import questions' });
    }
  }
);

/**
 * POST /assessments/auto-generate
 * Auto-generate assessment from question bank
 */
router.post(
  '/auto-generate',
  validateBody(autoGenerateBodySchema),
  async (req: Request<{}, {}, AutoGenerateBody>, res: Response) => {
    try {
      // Type assertion is safe here because Zod has validated the data
      const assessment = await assessmentBuilderService.autoGenerateAssessment(req.body as AutoGenerateInput);
      res.json(assessment);
    } catch (error) {
      console.error('Error auto-generating assessment:', error);
      res.status(500).json({ error: 'Failed to auto-generate assessment' });
    }
  }
);

/**
 * GET /question-bank
 * Browse question bank
 */
router.get(
  '/question-bank',
  validateQuery(questionBankQuerySchema),
  async (req: Request<{}, {}, {}, QuestionBankQuery>, res: Response) => {
    try {
      const { teacherId, tenantId, tags, type, subjectId, gradeLevel, difficulty } = req.query;

      const questions = await assessmentBuilderService.browseQuestionBank({
        teacherId,
        tenantId,
        tags: tags ? tags.split(',') : undefined,
        type,
        subjectId,
        gradeLevel,
        difficulty,
      });

      res.json(questions);
    } catch (error) {
      console.error('Error browsing question bank:', error);
      res.status(500).json({ error: 'Failed to browse question bank' });
    }
  }
);

/**
 * POST /question-bank
 * Add question to question bank
 */
router.post(
  '/question-bank',
  validateBody(addToQuestionBankBodySchema),
  async (req: Request<{}, {}, AddToQuestionBankBody>, res: Response) => {
    try {
      // Parse body through schema to ensure all required fields and defaults
      const parsed = addToQuestionBankBodySchema.parse(req.body);
      const question = await assessmentBuilderService.addToQuestionBank(parsed as any);
      res.json(question);
    } catch (error) {
      console.error('Error adding to question bank:', error);
      res.status(500).json({ error: 'Failed to add to question bank' });
    }
  }
);

/**
 * GET /rubrics
 * List rubrics
 */
router.get(
  '/rubrics',
  validateQuery(rubricQuerySchema),
  async (req: Request<{}, {}, {}, RubricQuery>, res: Response) => {
    try {
      const { teacherId, tenantId } = req.query;

      const rubrics = await assessmentBuilderService.listRubrics(teacherId, tenantId);
      res.json(rubrics);
    } catch (error) {
      console.error('Error listing rubrics:', error);
      res.status(500).json({ error: 'Failed to list rubrics' });
    }
  }
);

/**
 * POST /rubrics
 * Create rubric
 */
router.post(
  '/rubrics',
  validateBody(createRubricBodySchema),
  async (req: Request<{}, {}, CreateRubricBody>, res: Response) => {
    try {
      // Type assertion is safe here because Zod has validated the data
      const rubric = await assessmentBuilderService.createRubric(req.body as CreateRubricInput);
      res.json(rubric);
    } catch (error) {
      console.error('Error creating rubric:', error);
      res.status(500).json({ error: 'Failed to create rubric' });
    }
  }
);

/**
 * GET /rubrics/:id
 * Get rubric
 */
router.get(
  '/rubrics/:id',
  validateParams(rubricIdParamsSchema),
  async (req: Request<RubricIdParams>, res: Response) => {
    try {
      const { id } = req.params;
      const rubric = await assessmentBuilderService.getRubric(id);

      if (!rubric) {
        res.status(404).json({ error: 'Rubric not found' });
        return;
      }

      res.json(rubric);
    } catch (error) {
      console.error('Error fetching rubric:', error);
      res.status(500).json({ error: 'Failed to fetch rubric' });
    }
  }
);

export default router;
