/**
 * Anti-Addiction Routes
 *
 * API endpoints for session tracking and break management
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { antiAddictionService } from '../services/anti-addiction.service.js';

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

async function sessionRoutes(app: FastifyInstance) {
  /**
   * Start a new learning session
   * POST /api/gamification/session/start
   */
  app.post('/start', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { studentId, classId } = StartSessionSchema.parse(request.body);
      const result = await antiAddictionService.startSession(studentId, classId);
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400);
        return { error: 'Invalid request', details: error.errors };
      } else {
        console.error('Error starting session:', error);
        reply.status(500);
        return { error: 'Failed to start session' };
      }
    }
  });

  /**
   * End a learning session
   * POST /api/gamification/session/end
   */
  app.post('/end', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { sessionId } = EndSessionSchema.parse(request.body);
      const result = await antiAddictionService.endSession(sessionId);
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400);
        return { error: 'Invalid request', details: error.errors };
      } else {
        console.error('Error ending session:', error);
        reply.status(500);
        return { error: 'Failed to end session' };
      }
    }
  });

  /**
   * Session heartbeat - keeps session alive and checks for breaks
   * POST /api/gamification/session/heartbeat
   */
  app.post('/heartbeat', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { sessionId } = HeartbeatSchema.parse(request.body);
      const result = await antiAddictionService.heartbeat(sessionId);
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400);
        return { error: 'Invalid request', details: error.errors };
      } else {
        console.error('Error processing heartbeat:', error);
        reply.status(500);
        return { error: 'Failed to process heartbeat' };
      }
    }
  });

  /**
   * Check if student can start a session
   * GET /api/gamification/session/can-start
   */
  app.get('/can-start', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const studentId = (request.query as any).studentId as string;
      const classId = (request.query as any).classId as string | undefined;

      if (!studentId) {
        reply.status(400);
        return { error: 'studentId is required' };
      }

      const result = await antiAddictionService.canStartSession(studentId, classId);
      return result;
    } catch (error) {
      console.error('Error checking session status:', error);
      reply.status(500);
      return { error: 'Failed to check session status' };
    }
  });

  /**
   * Get today's usage for a student
   * GET /api/gamification/session/today-usage
   */
  app.get('/today-usage', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const studentId = (request.query as any).studentId as string;

      if (!studentId) {
        reply.status(400);
        return { error: 'studentId is required' };
      }

      const minutes = await antiAddictionService.getTodayUsage(studentId);
      return { minutes };
    } catch (error) {
      console.error('Error getting today usage:', error);
      reply.status(500);
      return { error: 'Failed to get today usage' };
    }
  });

  /**
   * Get usage statistics for a student
   * GET /api/gamification/session/usage-stats
   */
  app.get('/usage-stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const studentId = (request.query as any).studentId as string;
      const days = (request.query as any).days
        ? Number.parseInt((request.query as any).days as string)
        : 7;

      if (!studentId) {
        reply.status(400);
        return { error: 'studentId is required' };
      }

      const stats = await antiAddictionService.getUsageStats(studentId, days);
      return stats;
    } catch (error) {
      console.error('Error getting usage stats:', error);
      reply.status(500);
      return { error: 'Failed to get usage stats' };
    }
  });
}

export default sessionRoutes;
