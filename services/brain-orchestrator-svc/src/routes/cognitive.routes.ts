import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

import { AttentionTracker } from '../cognitive/attention-tracker.js';
import { BreakScheduler } from '../cognitive/break-scheduler.js';
import { CognitiveLoadManager } from '../cognitive/cognitive-load-manager.js';
import { FatigueDetector } from '../cognitive/fatigue-detector.js';
import { getContext } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import { LearnerInteractionSchema, SessionDataSchema } from '../validators/index.js';

// Initialize components
const cognitiveManager = new CognitiveLoadManager();
const attentionTracker = new AttentionTracker();
const fatigueDetector = new FatigueDetector();
const breakScheduler = new BreakScheduler();

async function cognitiveRoutes(app: FastifyInstance) {
  /**
   * Get cognitive state for a learner
   * GET /api/v1/brain/learners/:learnerId/cognitive-state
   */
  app.get(
    '/learners/:learnerId/cognitive-state',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>) => {
      const { learnerId } = request.params;
      const cognitiveState = await cognitiveManager.assessCurrentLoad(learnerId, []);
      return { success: true, data: cognitiveState };
    }
  );

  /**
   * Track a learner interaction
   * POST /api/v1/brain/learners/:learnerId/track-interaction
   */
  app.post(
    '/learners/:learnerId/track-interaction',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>) => {
      const { learnerId } = request.params;
      const { tenantId } = getContext(request);
      const input = LearnerInteractionSchema.parse(request.body);

      const interaction = {
        ...input,
        id: input.id ?? uuidv4(),
        learnerId,
        tenantId,
        timestamp: input.timestamp ?? new Date(),
        data: input.data ?? {},
      };

      await attentionTracker.trackInteraction(interaction);
      const cognitiveState = await cognitiveManager.trackInteraction(interaction);
      const disengagementAlert = await attentionTracker.detectDisengagement(learnerId);
      const breakRecommendation = await cognitiveManager.shouldTakeBreak(cognitiveState);
      const currentDifficulty = ((request.body as any).currentDifficulty as number) ?? 5;
      const difficultyAdjustment = await cognitiveManager.adjustDifficulty(
        currentDifficulty,
        cognitiveState
      );

      return {
        success: true,
        data: {
          cognitiveState,
          recommendations: {
            breakRecommendation,
            difficultyAdjustment,
            disengagementAlert,
          },
        },
      };
    }
  );

  /**
   * Get break recommendation for a learner
   * GET /api/v1/brain/learners/:learnerId/break-recommendation
   */
  app.get(
    '/learners/:learnerId/break-recommendation',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>) => {
      const { learnerId } = request.params;
      const cognitiveState = await cognitiveManager.assessCurrentLoad(learnerId, []);
      const breakRecommendation = await cognitiveManager.shouldTakeBreak(cognitiveState);
      return { success: true, data: breakRecommendation };
    }
  );

  /**
   * Get attention metrics for a learner
   * GET /api/v1/brain/learners/:learnerId/attention-metrics
   */
  app.get(
    '/learners/:learnerId/attention-metrics',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>) => {
      const { learnerId } = request.params;
      const metrics = await attentionTracker.getAttentionMetrics(learnerId);
      return { success: true, data: metrics };
    }
  );

  /**
   * Detect fatigue for a learner
   * POST /api/v1/brain/learners/:learnerId/detect-fatigue
   */
  app.post(
    '/learners/:learnerId/detect-fatigue',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>) => {
      const { learnerId } = request.params;
      const sessionInput = SessionDataSchema.parse(request.body);

      const interactions = await prisma.cognitiveInteraction.findMany({
        where: { learnerId, sessionId: sessionInput.sessionId },
        orderBy: { timestamp: 'asc' },
      });

      const session = await prisma.cognitiveSession.findFirst({
        where: { learnerId, id: sessionInput.sessionId },
        include: { cognitiveStates: true, breaks: true },
      });

      const sessionData = {
        sessionId: sessionInput.sessionId,
        learnerId,
        startedAt: sessionInput.startedAt,
        interactions: interactions.map((i) => ({
          id: i.id,
          learnerId: i.learnerId,
          tenantId: i.tenantId,
          sessionId: i.sessionId,
          type: i.type,
          activityId: i.activityId ?? undefined,
          timestamp: i.timestamp,
          duration: i.duration ?? undefined,
          data: {
            responseTime: i.responseTime ?? undefined,
            isCorrect: i.isCorrect ?? undefined,
            attemptNumber: i.attemptNumber ?? undefined,
            errorType: i.errorType ?? undefined,
          },
        })),
        tasksCompleted: [],
        cognitiveStateHistory:
          session?.cognitiveStates.map((s) => ({
            currentLoad: s.loadLevel,
            loadScore: s.loadScore,
            fatigueLevel: s.fatigueLevel,
            attentionScore: s.attentionScore,
            timeSinceBreak: 0,
            tasksCompleted: 0,
            errorRate: s.errorRate,
            responseLatency: s.responseLatency,
            engagementScore: s.engagementScore,
            lastUpdated: s.timestamp,
          })) ?? [],
        breaks:
          session?.breaks.map((b) => ({
            id: b.id,
            sessionId: b.sessionId,
            startedAt: b.startedAt,
            endedAt: b.endedAt ?? undefined,
            plannedDuration: b.plannedDuration,
            actualDuration: b.actualDuration ?? undefined,
            activity: b.activityType
              ? {
                  type: b.activityType,
                  duration: b.plannedDuration,
                  instructions: b.activityInstructions ?? undefined,
                }
              : undefined,
          })) ?? [],
      };

      const fatigueAssessment = await fatigueDetector.detectFatigue(learnerId, sessionData);
      return { success: true, data: fatigueAssessment };
    }
  );

  /**
   * Get fatigue history patterns
   * GET /api/v1/brain/learners/:learnerId/fatigue-history
   */
  app.get(
    '/learners/:learnerId/fatigue-history',
    async (
      request: FastifyRequest<{ Params: { learnerId: string }; Querystring: { days?: string } }>
    ) => {
      const { learnerId } = request.params;
      const days = Number.parseInt(request.query.days as string) || 7;
      const history = await fatigueDetector.getFatigueHistory(learnerId, days);
      return {
        success: true,
        data: {
          averageFatigueByHour: Object.fromEntries(history.averageFatigueByHour),
          fatiguePatterns: history.fatiguePatterns,
          recommendations: history.recommendations,
        },
      };
    }
  );

  /**
   * Start a break
   * POST /api/v1/brain/learners/:learnerId/breaks/start
   */
  app.post(
    '/learners/:learnerId/breaks/start',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>) => {
      const body = request.body as any;
      const { sessionId, fatigueLevel } = body;
      const duration = Number.parseInt(body.duration as string) || 5;
      const suggestedActivity = await breakScheduler.suggestBreakActivity(
        fatigueLevel ?? 50,
        duration
      );
      const breakRecord = await breakScheduler.recordBreak(sessionId, suggestedActivity);
      return { success: true, data: breakRecord };
    }
  );

  /**
   * End a break
   * POST /api/v1/brain/breaks/:breakId/end
   */
  app.post(
    '/breaks/:breakId/end',
    async (request: FastifyRequest<{ Params: { breakId: string } }>) => {
      const { breakId } = request.params;
      const breakRecord = await breakScheduler.endBreak(breakId);
      return { success: true, data: breakRecord };
    }
  );

  /**
   * Get break recommendation for current session
   * GET /api/v1/brain/sessions/:sessionId/break-recommendation
   */
  app.get(
    '/sessions/:sessionId/break-recommendation',
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      const { sessionId } = request.params;

      const session = await prisma.cognitiveSession.findUnique({
        where: { id: sessionId },
        include: {
          breaks: { orderBy: { endedAt: 'desc' }, take: 1 },
          cognitiveStates: { orderBy: { timestamp: 'desc' }, take: 1 },
        },
      });

      if (!session) {
        reply.status(404);
        return { success: false, error: 'Session not found' };
      }

      const lastBreak = session.breaks[0];
      const lastState = session.cognitiveStates[0];

      const timeSinceLastBreak = lastBreak?.endedAt
        ? (Date.now() - lastBreak.endedAt.getTime()) / 60000
        : (Date.now() - session.startedAt.getTime()) / 60000;

      const currentFatigueLevel = lastState?.fatigueLevel ?? 30;

      const recommendation = await breakScheduler.getBreakRecommendation(
        sessionId,
        currentFatigueLevel,
        timeSinceLastBreak
      );

      return { success: true, data: recommendation };
    }
  );

  /**
   * Create or continue a cognitive session
   * POST /api/v1/brain/learners/:learnerId/sessions
   */
  app.post(
    '/learners/:learnerId/sessions',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>) => {
      const { tenantId } = getContext(request);
      const { learnerId } = request.params;

      let session = await prisma.cognitiveSession.findFirst({
        where: { learnerId, tenantId, endedAt: null },
        orderBy: { startedAt: 'desc' },
      });

      if (!session) {
        session = await prisma.cognitiveSession.create({
          data: { learnerId, tenantId, startedAt: new Date() },
        });
      }

      return { success: true, data: session };
    }
  );

  /**
   * End a cognitive session
   * POST /api/v1/brain/sessions/:sessionId/end
   */
  app.post(
    '/sessions/:sessionId/end',
    async (request: FastifyRequest<{ Params: { sessionId: string } }>) => {
      const { sessionId } = request.params;
      const session = await prisma.cognitiveSession.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
      });
      return { success: true, data: session };
    }
  );
}

export { cognitiveRoutes };
