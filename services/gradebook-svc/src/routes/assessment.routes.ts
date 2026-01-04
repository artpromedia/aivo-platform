/**
 * Assessment Builder Routes
 *
 * RESTful API endpoints for assessment building
 */

import { Router } from 'express';
import { assessmentBuilderService } from '../services/assessment-builder.service.js';
import type { Request, Response } from 'express';

const router = Router();

/**
 * POST /assessments
 * Create new assessment
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const assessment = await assessmentBuilderService.createAssessment(req.body);
    res.json(assessment);
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ error: 'Failed to create assessment' });
  }
});

/**
 * GET /assessments/:id
 * Get assessment by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assessment = await assessmentBuilderService.getAssessment(id);

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    res.json(assessment);
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

/**
 * PUT /assessments/:id
 * Update assessment
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assessment = await assessmentBuilderService.updateAssessment(id, req.body);
    res.json(assessment);
  } catch (error) {
    console.error('Error updating assessment:', error);
    res.status(500).json({ error: 'Failed to update assessment' });
  }
});

/**
 * POST /assessments/:id/publish
 * Publish assessment
 */
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assessment = await assessmentBuilderService.publishAssessment(id);
    res.json(assessment);
  } catch (error) {
    console.error('Error publishing assessment:', error);
    res.status(500).json({ error: 'Failed to publish assessment' });
  }
});

/**
 * DELETE /assessments/:id
 * Delete assessment
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await assessmentBuilderService.deleteAssessment(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

/**
 * POST /assessments/:id/questions
 * Add question to assessment
 */
router.post('/:id/questions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const question = await assessmentBuilderService.addQuestion({
      assessmentId: id,
      ...req.body
    });
    res.json(question);
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

/**
 * PUT /assessments/questions/:questionId
 * Update question
 */
router.put('/questions/:questionId', async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const question = await assessmentBuilderService.updateQuestion(questionId, req.body);
    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

/**
 * DELETE /assessments/questions/:questionId
 * Delete question
 */
router.delete('/questions/:questionId', async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    await assessmentBuilderService.deleteQuestion(questionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

/**
 * PUT /assessments/:id/questions/reorder
 * Reorder questions
 */
router.put('/:id/questions/reorder', async (req: Request, res: Response) => {
  try {
    const { questions } = req.body;

    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions must be an array' });
    }

    await assessmentBuilderService.reorderQuestions(questions);
    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering questions:', error);
    res.status(500).json({ error: 'Failed to reorder questions' });
  }
});

/**
 * GET /assessments/:id/submissions
 * Get assessment submissions
 */
router.get('/:id/submissions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const submissions = await assessmentBuilderService.getSubmissions(id);
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * POST /assessments/submissions/:submissionId/grade
 * Grade assessment submission
 */
router.post('/submissions/:submissionId/grade', async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { gradedBy, feedback } = req.body;

    if (!gradedBy) {
      return res.status(400).json({ error: 'gradedBy is required' });
    }

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
});

/**
 * POST /assessments/:id/import
 * Import questions from another assessment
 */
router.post('/:id/import', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sourceAssessmentId } = req.body;

    if (!sourceAssessmentId) {
      return res.status(400).json({ error: 'sourceAssessmentId is required' });
    }

    const questions = await assessmentBuilderService.importQuestions(id, sourceAssessmentId);
    res.json(questions);
  } catch (error) {
    console.error('Error importing questions:', error);
    res.status(500).json({ error: 'Failed to import questions' });
  }
});

/**
 * POST /assessments/auto-generate
 * Auto-generate assessment from question bank
 */
router.post('/auto-generate', async (req: Request, res: Response) => {
  try {
    const assessment = await assessmentBuilderService.autoGenerateAssessment(req.body);
    res.json(assessment);
  } catch (error) {
    console.error('Error auto-generating assessment:', error);
    res.status(500).json({ error: 'Failed to auto-generate assessment' });
  }
});

/**
 * GET /question-bank
 * Browse question bank
 */
router.get('/question-bank', async (req: Request, res: Response) => {
  try {
    const { teacherId, tenantId, tags, type, subjectId, gradeLevel, difficulty } = req.query;

    if (!teacherId || !tenantId) {
      return res.status(400).json({ error: 'teacherId and tenantId are required' });
    }

    const questions = await assessmentBuilderService.browseQuestionBank({
      teacherId: teacherId as string,
      tenantId: tenantId as string,
      tags: tags ? (tags as string).split(',') : undefined,
      type: type as any,
      subjectId: subjectId as string,
      gradeLevel: gradeLevel as string,
      difficulty: difficulty as string
    });

    res.json(questions);
  } catch (error) {
    console.error('Error browsing question bank:', error);
    res.status(500).json({ error: 'Failed to browse question bank' });
  }
});

/**
 * POST /question-bank
 * Add question to question bank
 */
router.post('/question-bank', async (req: Request, res: Response) => {
  try {
    const question = await assessmentBuilderService.addToQuestionBank(req.body);
    res.json(question);
  } catch (error) {
    console.error('Error adding to question bank:', error);
    res.status(500).json({ error: 'Failed to add to question bank' });
  }
});

/**
 * GET /rubrics
 * List rubrics
 */
router.get('/rubrics', async (req: Request, res: Response) => {
  try {
    const { teacherId, tenantId } = req.query;

    if (!teacherId || !tenantId) {
      return res.status(400).json({ error: 'teacherId and tenantId are required' });
    }

    const rubrics = await assessmentBuilderService.listRubrics(
      teacherId as string,
      tenantId as string
    );
    res.json(rubrics);
  } catch (error) {
    console.error('Error listing rubrics:', error);
    res.status(500).json({ error: 'Failed to list rubrics' });
  }
});

/**
 * POST /rubrics
 * Create rubric
 */
router.post('/rubrics', async (req: Request, res: Response) => {
  try {
    const rubric = await assessmentBuilderService.createRubric(req.body);
    res.json(rubric);
  } catch (error) {
    console.error('Error creating rubric:', error);
    res.status(500).json({ error: 'Failed to create rubric' });
  }
});

/**
 * GET /rubrics/:id
 * Get rubric
 */
router.get('/rubrics/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rubric = await assessmentBuilderService.getRubric(id);

    if (!rubric) {
      return res.status(404).json({ error: 'Rubric not found' });
    }

    res.json(rubric);
  } catch (error) {
    console.error('Error fetching rubric:', error);
    res.status(500).json({ error: 'Failed to fetch rubric' });
  }
});

export default router;
