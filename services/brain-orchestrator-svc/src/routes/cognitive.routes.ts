import { Router, Request, Response, NextFunction } from 'express';
import { CognitiveLoadManager } from '../cognitive/cognitive-load-manager.js';
import { AttentionTracker } from '../cognitive/attention-tracker.js';
import { FatigueDetector } from '../cognitive/fatigue-detector.js';
import { BreakScheduler } from '../cognitive/break-scheduler.js';
import { getContext } from '../middleware/auth.js';
import { LearnerInteractionSchema, SessionDataSchema } from '../validators/index.js';
import { prisma } from '../prisma.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Initialize components
const cognitiveManager = new CognitiveLoadManager();
const attentionTracker = new AttentionTracker();
const fatigueDetector = new FatigueDetector();
const breakScheduler = new BreakScheduler();

/**
 * Get cognitive state for a learner
 * GET /api/v1/brain/learners/:learnerId/cognitive-state
 */
router.get(
  '/learners/:learnerId/cognitive-state',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getContext(req);
      const { learnerId } = req.params;

      const cognitiveState = await cognitiveManager.assessCurrentLoad(learnerId, []);

      res.json({
        success: true,
        data: cognitiveState,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Track a learner interaction
 * POST /api/v1/brain/learners/:learnerId/track-interaction
 */
router.post(
  '/learners/:learnerId/track-interaction',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getContext(req);
      const { learnerId } = req.params;
      const input = LearnerInteractionSchema.parse(req.body);

      const interaction = {
        ...input,
        id: input.id ?? uuidv4(),
        learnerId,
        tenantId,
        timestamp: input.timestamp ?? new Date(),
        data: input.data ?? {},
      };

      // Track the interaction
      await attentionTracker.trackInteraction(interaction);

      // Update cognitive state
      const cognitiveState = await cognitiveManager.trackInteraction(interaction);

      // Check for disengagement
      const disengagementAlert = await attentionTracker.detectDisengagement(learnerId);

      // Get break recommendation
      const breakRecommendation = await cognitiveManager.shouldTakeBreak(cognitiveState);

      // Get difficulty adjustment
      const currentDifficulty = (req.body.currentDifficulty as number) ?? 5;
      const difficultyAdjustment = await cognitiveManager.adjustDifficulty(
        currentDifficulty,
        cognitiveState
      );

      res.json({
        success: true,
        data: {
          cognitiveState,
          recommendations: {
            breakRecommendation,
            difficultyAdjustment,
            disengagementAlert,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get break recommendation for a learner
 * GET /api/v1/brain/learners/:learnerId/break-recommendation
 */
router.get(
  '/learners/:learnerId/break-recommendation',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { learnerId } = req.params;

      const cognitiveState = await cognitiveManager.assessCurrentLoad(learnerId, []);
      const breakRecommendation = await cognitiveManager.shouldTakeBreak(cognitiveState);

      res.json({
        success: true,
        data: breakRecommendation,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get attention metrics for a learner
 * GET /api/v1/brain/learners/:learnerId/attention-metrics
 */
router.get(
  '/learners/:learnerId/attention-metrics',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { learnerId } = req.params;

      const metrics = await attentionTracker.getAttentionMetrics(learnerId);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Detect fatigue for a learner
 * POST /api/v1/brain/learners/:learnerId/detect-fatigue
 */
router.post(
  '/learners/:learnerId/detect-fatigue',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getContext(req);
      const { learnerId } = req.params;
      const sessionInput = SessionDataSchema.parse(req.body);

      // Get session interactions
      const interactions = await prisma.cognitiveInteraction.findMany({
        where: {
          learnerId,
          sessionId: sessionInput.sessionId,
        },
        orderBy: { timestamp: 'asc' },
      });

      // Get cognitive state history
      const session = await prisma.cognitiveSession.findFirst({
        where: {
          learnerId,
          id: sessionInput.sessionId,
        },
        include: {
          cognitiveStates: true,
          breaks: true,
        },
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
          type: i.type as any,
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
        cognitiveStateHistory: session?.cognitiveStates.map((s) => ({
          currentLoad: s.loadLevel as any,
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
        breaks: session?.breaks.map((b) => ({
          id: b.id,
          sessionId: b.sessionId,
          startedAt: b.startedAt,
          endedAt: b.endedAt ?? undefined,
          plannedDuration: b.plannedDuration,
          actualDuration: b.actualDuration ?? undefined,
          activity: b.activityType
            ? {
                type: b.activityType as any,
                duration: b.plannedDuration,
                instructions: b.activityInstructions ?? undefined,
              }
            : undefined,
        })) ?? [],
      };

      const fatigueAssessment = await fatigueDetector.detectFatigue(learnerId, sessionData);

      res.json({
        success: true,
        data: fatigueAssessment,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get fatigue history patterns
 * GET /api/v1/brain/learners/:learnerId/fatigue-history
 */
router.get(
  '/learners/:learnerId/fatigue-history',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { learnerId } = req.params;
      const days = parseInt(req.query.days as string) || 7;

      const history = await fatigueDetector.getFatigueHistory(learnerId, days);

      res.json({
        success: true,
        data: {
          averageFatigueByHour: Object.fromEntries(history.averageFatigueByHour),
          fatiguePatterns: history.fatiguePatterns,
          recommendations: history.recommendations,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Start a break
 * POST /api/v1/brain/learners/:learnerId/breaks/start
 */
router.post(
  '/learners/:learnerId/breaks/start',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { learnerId } = req.params;
      const { sessionId, fatigueLevel } = req.body;

      // Get suggested break activity
      const duration = parseInt(req.body.duration as string) || 5;
      const suggestedActivity = await breakScheduler.suggestBreakActivity(
        fatigueLevel ?? 50,
        duration
      );

      // Record the break
      const breakRecord = await breakScheduler.recordBreak(sessionId, suggestedActivity);

      res.json({
        success: true,
        data: breakRecord,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * End a break
 * POST /api/v1/brain/breaks/:breakId/end
 */
router.post('/breaks/:breakId/end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { breakId } = req.params;

    const breakRecord = await breakScheduler.endBreak(breakId);

    res.json({
      success: true,
      data: breakRecord,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get break recommendation for current session
 * GET /api/v1/brain/sessions/:sessionId/break-recommendation
 */
router.get(
  '/sessions/:sessionId/break-recommendation',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      // Get session info
      const session = await prisma.cognitiveSession.findUnique({
        where: { id: sessionId },
        include: {
          breaks: {
            orderBy: { endedAt: 'desc' },
            take: 1,
          },
          cognitiveStates: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Session not found',
        });
        return;
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

      res.json({
        success: true,
        data: recommendation,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Create or continue a cognitive session
 * POST /api/v1/brain/learners/:learnerId/sessions
 */
router.post(
  '/learners/:learnerId/sessions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getContext(req);
      const { learnerId } = req.params;

      // Check for existing active session
      let session = await prisma.cognitiveSession.findFirst({
        where: {
          learnerId,
          tenantId,
          endedAt: null,
        },
        orderBy: { startedAt: 'desc' },
      });

      if (!session) {
        // Create new session
        session = await prisma.cognitiveSession.create({
          data: {
            learnerId,
            tenantId,
            startedAt: new Date(),
          },
        });
      }

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * End a cognitive session
 * POST /api/v1/brain/sessions/:sessionId/end
 */
router.post(
  '/sessions/:sessionId/end',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      const session = await prisma.cognitiveSession.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
      });

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as cognitiveRoutes };
