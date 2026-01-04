/**
 * Math Recognition API Routes
 *
 * REST API endpoints for math handwriting recognition
 * and scratch pad session management.
 */

import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { z } from 'zod';
import { MathRecognitionService } from '../recognition/math-recognition.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schemas
// ══════════════════════════════════════════════════════════════════════════════

const StrokePointSchema = z.object({
  x: z.number(),
  y: z.number(),
  t: z.number(),
  p: z.number().optional(),
});

const StrokeSchema = z.object({
  id: z.string(),
  points: z.array(StrokePointSchema),
});

const RecognitionOptionsSchema = z.object({
  evaluateExpression: z.boolean().optional().default(true),
  includeAlternatives: z.boolean().optional().default(true),
  maxAlternatives: z.number().min(1).max(10).optional().default(3),
  context: z.string().optional(),
});

const StrokeRecognitionSchema = z.object({
  strokes: z.array(StrokeSchema),
  canvasWidth: z.number().positive(),
  canvasHeight: z.number().positive(),
  options: RecognitionOptionsSchema.optional(),
});

const ImageRecognitionSchema = z.object({
  image: z.string(), // base64
  options: RecognitionOptionsSchema.optional(),
});

const ValidateAnswerSchema = z.object({
  submittedAnswer: z.string(),
  expectedAnswer: z.string(),
  allowEquivalent: z.boolean().optional().default(true),
  tolerance: z.number().optional().default(0.0001),
});

const CanvasSnapshotSchema = z.object({
  strokes: z.array(z.object({
    id: z.string(),
    points: z.array(StrokePointSchema),
    color: z.number(),
    strokeWidth: z.number(),
    createdAt: z.string(),
  })),
  canvasSize: z.object({
    width: z.number(),
    height: z.number(),
  }),
  backgroundColor: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const StartSessionSchema = z.object({
  learnerId: z.string().uuid(),
  activityId: z.string().uuid().optional(),
  questionId: z.string().uuid().optional(),
});

const SaveSnapshotSchema = z.object({
  snapshot: CanvasSnapshotSchema,
  recognition: z.object({
    recognizedText: z.string(),
    confidence: z.number(),
  }).optional(),
});

const SubmitAnswerSchema = z.object({
  answer: z.string(),
  questionId: z.string().uuid().optional(),
  workShown: CanvasSnapshotSchema,
});

// ══════════════════════════════════════════════════════════════════════════════
// In-memory session storage (replace with Redis/DB in production)
// ══════════════════════════════════════════════════════════════════════════════

interface ScratchPadSession {
  id: string;
  learnerId: string;
  activityId?: string;
  questionId?: string;
  snapshots: unknown[];
  recognitions: unknown[];
  startedAt: string;
  completedAt?: string;
  status: 'active' | 'completed' | 'submitted';
}

const sessions = new Map<string, ScratchPadSession>();

// ══════════════════════════════════════════════════════════════════════════════
// Routes
// ══════════════════════════════════════════════════════════════════════════════

export async function mathRecognitionRoutes(fastify: FastifyInstance) {
  const recognitionService = new MathRecognitionService();

  /**
   * POST /api/v1/math-recognition/recognize
   * Recognize math expression from stroke data
   */
  fastify.post(
    '/api/v1/math-recognition/recognize',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof StrokeRecognitionSchema> }>,
      reply: FastifyReply
    ) => {
      const parsed = StrokeRecognitionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parsed.error.flatten(),
        });
      }

      try {
        const result = await recognitionService.recognizeFromStrokes({
          strokes: parsed.data.strokes,
          canvasWidth: parsed.data.canvasWidth,
          canvasHeight: parsed.data.canvasHeight,
          options: parsed.data.options,
        });

        return reply.send(result);
      } catch (error) {
        console.error('Recognition error:', error);
        return reply.status(500).send({
          error: 'Recognition failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /api/v1/math-recognition/recognize-image
   * Recognize math expression from image
   */
  fastify.post(
    '/api/v1/math-recognition/recognize-image',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof ImageRecognitionSchema> }>,
      reply: FastifyReply
    ) => {
      const parsed = ImageRecognitionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parsed.error.flatten(),
        });
      }

      try {
        const result = await recognitionService.recognizeFromImage({
          image: parsed.data.image,
          options: parsed.data.options,
        });

        return reply.send(result);
      } catch (error) {
        console.error('Image recognition error:', error);
        return reply.status(500).send({
          error: 'Recognition failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /api/v1/math-recognition/validate
   * Validate a submitted answer against expected answer
   */
  fastify.post(
    '/api/v1/math-recognition/validate',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof ValidateAnswerSchema> }>,
      reply: FastifyReply
    ) => {
      const parsed = ValidateAnswerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parsed.error.flatten(),
        });
      }

      try {
        const result = await recognitionService.validateAnswer(
          parsed.data.submittedAnswer,
          parsed.data.expectedAnswer,
          {
            allowEquivalent: parsed.data.allowEquivalent,
            tolerance: parsed.data.tolerance,
          }
        );

        return reply.send(result);
      } catch (error) {
        console.error('Validation error:', error);
        return reply.status(500).send({
          error: 'Validation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // Scratch Pad Session Management
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/v1/scratch-pad/sessions
   * Start a new scratch pad session
   */
  fastify.post(
    '/api/v1/scratch-pad/sessions',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof StartSessionSchema> }>,
      reply: FastifyReply
    ) => {
      const parsed = StartSessionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parsed.error.flatten(),
        });
      }

      const session: ScratchPadSession = {
        id: `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        learnerId: parsed.data.learnerId,
        activityId: parsed.data.activityId,
        questionId: parsed.data.questionId,
        snapshots: [],
        recognitions: [],
        startedAt: new Date().toISOString(),
        status: 'active',
      };

      sessions.set(session.id, session);

      return reply.status(201).send(session);
    }
  );

  /**
   * GET /api/v1/scratch-pad/sessions
   * Get session history for a learner
   */
  fastify.get(
    '/api/v1/scratch-pad/sessions',
    async (
      request: FastifyRequest<{
        Querystring: { learnerId: string; activityId?: string; limit?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId, activityId, limit = '20' } = request.query;

      if (!learnerId) {
        return reply.status(400).send({ error: 'learnerId is required' });
      }

      const learnerSessions = Array.from(sessions.values())
        .filter((s) => {
          if (s.learnerId !== learnerId) return false;
          if (activityId && s.activityId !== activityId) return false;
          return true;
        })
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, parseInt(limit, 10));

      return reply.send({ sessions: learnerSessions });
    }
  );

  /**
   * GET /api/v1/scratch-pad/sessions/:sessionId
   * Get a specific session
   */
  fastify.get(
    '/api/v1/scratch-pad/sessions/:sessionId',
    async (
      request: FastifyRequest<{ Params: { sessionId: string } }>,
      reply: FastifyReply
    ) => {
      const { sessionId } = request.params;
      const session = sessions.get(sessionId);

      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      return reply.send(session);
    }
  );

  /**
   * POST /api/v1/scratch-pad/sessions/:sessionId/snapshots
   * Save a canvas snapshot to a session
   */
  fastify.post(
    '/api/v1/scratch-pad/sessions/:sessionId/snapshots',
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Body: z.infer<typeof SaveSnapshotSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { sessionId } = request.params;
      const session = sessions.get(sessionId);

      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      const parsed = SaveSnapshotSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parsed.error.flatten(),
        });
      }

      session.snapshots.push({
        ...parsed.data.snapshot,
        savedAt: new Date().toISOString(),
      });

      if (parsed.data.recognition) {
        session.recognitions.push({
          ...parsed.data.recognition,
          recognizedAt: new Date().toISOString(),
        });
      }

      return reply.status(201).send({ success: true });
    }
  );

  /**
   * POST /api/v1/scratch-pad/sessions/:sessionId/submit
   * Submit an answer from scratch pad
   */
  fastify.post(
    '/api/v1/scratch-pad/sessions/:sessionId/submit',
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Body: z.infer<typeof SubmitAnswerSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { sessionId } = request.params;
      const session = sessions.get(sessionId);

      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      const parsed = SubmitAnswerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parsed.error.flatten(),
        });
      }

      // Save final work
      session.snapshots.push({
        ...parsed.data.workShown,
        savedAt: new Date().toISOString(),
        isFinal: true,
      });

      session.status = 'submitted';
      session.completedAt = new Date().toISOString();

      // In a real implementation, we would:
      // 1. Look up the question/activity to get expected answer
      // 2. Validate the answer
      // 3. Record the attempt in assessment-svc

      return reply.send({
        isCorrect: true, // Placeholder - would validate against actual answer
        feedback: 'Answer submitted successfully',
        workAnalysis: {
          strokeCount: parsed.data.workShown.strokes.length,
          showedWork: parsed.data.workShown.strokes.length > 0,
        },
      });
    }
  );

  /**
   * PATCH /api/v1/scratch-pad/sessions/:sessionId/complete
   * Mark a session as completed
   */
  fastify.patch(
    '/api/v1/scratch-pad/sessions/:sessionId/complete',
    async (
      request: FastifyRequest<{ Params: { sessionId: string } }>,
      reply: FastifyReply
    ) => {
      const { sessionId } = request.params;
      const session = sessions.get(sessionId);

      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      session.status = 'completed';
      session.completedAt = new Date().toISOString();

      return reply.send({ success: true });
    }
  );
}
