/**
 * Gradebook Routes
 *
 * RESTful API endpoints for gradebook operations
 */

import { Router } from 'express';
import { gradebookService } from '../services/gradebook.service.js';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /gradebook/classroom/:classroomId
 * Get classroom gradebook with all students and grades
 */
router.get('/classroom/:classroomId', async (req: Request, res: Response) => {
  try {
    const { classroomId } = req.params;
    const gradebook = await gradebookService.getClassroomGradebook(classroomId);
    res.json(gradebook);
  } catch (error) {
    console.error('Error fetching gradebook:', error);
    res.status(500).json({ error: 'Failed to fetch gradebook' });
  }
});

/**
 * GET /gradebook/config/:classroomId
 * Get gradebook configuration
 */
router.get('/config/:classroomId', async (req: Request, res: Response) => {
  try {
    const { classroomId } = req.params;
    const config = await gradebookService.getGradebookConfig(classroomId);

    if (!config) {
      return res.status(404).json({ error: 'Gradebook config not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching gradebook config:', error);
    res.status(500).json({ error: 'Failed to fetch gradebook config' });
  }
});

/**
 * POST /gradebook/config
 * Create or update gradebook configuration
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const { classroomId, teacherId, tenantId, ...config } = req.body;

    if (!classroomId || !teacherId || !tenantId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await gradebookService.upsertGradebookConfig(
      classroomId,
      teacherId,
      tenantId,
      config
    );

    res.json(result);
  } catch (error) {
    console.error('Error upserting gradebook config:', error);
    res.status(500).json({ error: 'Failed to save gradebook config' });
  }
});

/**
 * POST /gradebook/categories
 * Create grade category
 */
router.post('/categories', async (req: Request, res: Response) => {
  try {
    const { gradebookConfigId, name, weight, color, dropLowest, orderIndex } = req.body;

    if (!gradebookConfigId || !name || weight === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const category = await gradebookService.createCategory(
      gradebookConfigId,
      name,
      weight,
      { color, dropLowest, orderIndex }
    );

    res.json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * PUT /gradebook/categories/weights
 * Update category weights
 */
router.put('/categories/weights', async (req: Request, res: Response) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'Categories must be an array' });
    }

    await gradebookService.updateCategoryWeights(categories);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating category weights:', error);
    res.status(500).json({ error: 'Failed to update category weights' });
  }
});

/**
 * POST /gradebook/assignments
 * Create assignment
 */
router.post('/assignments', async (req: Request, res: Response) => {
  try {
    const assignment = await gradebookService.createAssignment(req.body);
    res.json(assignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

/**
 * GET /gradebook/assignments/:id
 * Get assignment details
 */
router.get('/assignments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await gradebookService.updateAssignment(id, {});

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

/**
 * PUT /gradebook/assignments/:id
 * Update assignment
 */
router.put('/assignments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await gradebookService.updateAssignment(id, req.body);
    res.json(assignment);
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

/**
 * POST /gradebook/assignments/:id/publish
 * Publish assignment
 */
router.post('/assignments/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await gradebookService.publishAssignment(id);
    res.json(assignment);
  } catch (error) {
    console.error('Error publishing assignment:', error);
    res.status(500).json({ error: 'Failed to publish assignment' });
  }
});

/**
 * DELETE /gradebook/assignments/:id
 * Delete assignment
 */
router.delete('/assignments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await gradebookService.deleteAssignment(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

/**
 * POST /gradebook/grades
 * Submit or update grade
 */
router.post('/grades', async (req: Request, res: Response) => {
  try {
    const grade = await gradebookService.submitGrade(req.body);
    res.json(grade);
  } catch (error) {
    console.error('Error submitting grade:', error);
    res.status(500).json({ error: 'Failed to submit grade' });
  }
});

/**
 * PUT /gradebook/grades/:id
 * Update grade
 */
router.put('/grades/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const grade = await gradebookService.submitGrade({
      gradeId: id,
      ...req.body
    });
    res.json(grade);
  } catch (error) {
    console.error('Error updating grade:', error);
    res.status(500).json({ error: 'Failed to update grade' });
  }
});

/**
 * GET /gradebook/grades/:id/history
 * Get grade history (audit log)
 */
router.get('/grades/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await gradebookService.getGradeHistory(id);
    res.json(history);
  } catch (error) {
    console.error('Error fetching grade history:', error);
    res.status(500).json({ error: 'Failed to fetch grade history' });
  }
});

/**
 * GET /gradebook/student/:studentId/classroom/:classroomId
 * Get student grades
 */
router.get('/student/:studentId/classroom/:classroomId', async (req: Request, res: Response) => {
  try {
    const { studentId, classroomId } = req.params;
    const result = await gradebookService.getStudentGrades(classroomId, studentId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ error: 'Failed to fetch student grades' });
  }
});

/**
 * POST /gradebook/import
 * Bulk import grades
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const result = await gradebookService.bulkImportGrades(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error importing grades:', error);
    res.status(500).json({ error: 'Failed to import grades' });
  }
});

/**
 * GET /gradebook/export/:classroomId
 * Export gradebook as CSV
 */
router.get('/export/:classroomId', async (req: Request, res: Response) => {
  try {
    const { classroomId } = req.params;
    const csv = await gradebookService.exportGradebook(classroomId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="gradebook-${classroomId}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting gradebook:', error);
    res.status(500).json({ error: 'Failed to export gradebook' });
  }
});

export default router;
