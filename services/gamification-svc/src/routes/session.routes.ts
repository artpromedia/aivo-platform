/**
 * Anti-Addiction Routes
 *
 * API endpoints for session tracking and break management
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */

import { Router, Request, Response, IRouter } from 'express';
import { antiAddictionService } from '../services/anti-addiction.service.js';
import { z } from 'zod';

const router: IRouter = Router();

const StartSessionSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid().optional(),
});

const EndSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

const HeartbeatSchema = z.object({
  sessionId: z.string().uuid(),
});

/**
 * Start a new learning session
 * POST /api/gamification/session/start
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { studentId, classId } = StartSessionSchema.parse(req.body);
    const result = await antiAddictionService.startSession(studentId, classId);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
    } else {
      console.error('Error starting session:', error);
      res.status(500).json({ error: 'Failed to start session' });
    }
  }
});

/**
 * End a learning session
 * POST /api/gamification/session/end
 */
router.post('/end', async (req: Request, res: Response) => {
  try {
    const { sessionId } = EndSessionSchema.parse(req.body);
    const result = await antiAddictionService.endSession(sessionId);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
    } else {
      console.error('Error ending session:', error);
      res.status(500).json({ error: 'Failed to end session' });
    }
  }
});

/**
 * Session heartbeat - keeps session alive and checks for breaks
 * POST /api/gamification/session/heartbeat
 */
router.post('/heartbeat', async (req: Request, res: Response) => {
  try {
    const { sessionId } = HeartbeatSchema.parse(req.body);
    const result = await antiAddictionService.heartbeat(sessionId);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
    } else {
      console.error('Error processing heartbeat:', error);
      res.status(500).json({ error: 'Failed to process heartbeat' });
    }
  }
});

/**
 * Check if student can start a session
 * GET /api/gamification/session/can-start
 */
router.get('/can-start', async (req: Request, res: Response) => {
  try {
    const studentId = req.query.studentId as string;
    const classId = req.query.classId as string | undefined;

    if (!studentId) {
      res.status(400).json({ error: 'studentId is required' });
      return;
    }

    const result = await antiAddictionService.canStartSession(studentId, classId);
    res.json(result);
  } catch (error) {
    console.error('Error checking session status:', error);
    res.status(500).json({ error: 'Failed to check session status' });
  }
});

/**
 * Get today's usage for a student
 * GET /api/gamification/session/today-usage
 */
router.get('/today-usage', async (req: Request, res: Response) => {
  try {
    const studentId = req.query.studentId as string;

    if (!studentId) {
      res.status(400).json({ error: 'studentId is required' });
      return;
    }

    const minutes = await antiAddictionService.getTodayUsage(studentId);
    res.json({ minutes });
  } catch (error) {
    console.error('Error getting today usage:', error);
    res.status(500).json({ error: 'Failed to get today usage' });
  }
});

/**
 * Get usage statistics for a student
 * GET /api/gamification/session/usage-stats
 */
router.get('/usage-stats', async (req: Request, res: Response) => {
  try {
    const studentId = req.query.studentId as string;
    const days = req.query.days ? parseInt(req.query.days as string) : 7;

    if (!studentId) {
      res.status(400).json({ error: 'studentId is required' });
      return;
    }

    const stats = await antiAddictionService.getUsageStats(studentId, days);
    res.json(stats);
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

export default router;
