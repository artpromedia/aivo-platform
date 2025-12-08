import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { detectFocusLoss } from '../engine/focusDetection.js';
import { getRecommendation, getAvailableActivities } from '../engine/regulationCatalog.js';
import { sessionServiceClient } from '../services/sessionServiceClient.js';
import type {
  FocusPing,
  FocusLossReason,
  GradeBand,
  SelfReportedMood,
  BreakCompleteResponse,
} from '../types/telemetry.js';

// ══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY PING STORE (for MVP - would use Redis/DB in production)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Simple in-memory store for recent focus pings.
 * In production, this would be Redis or a time-series database.
 */
const pingStore = new Map<string, FocusPing[]>();

const MAX_PINGS_PER_SESSION = 100;
const PING_TTL_MS = 10 * 60 * 1000; // 10 minutes

function storePing(sessionId: string, ping: FocusPing): void {
  const pings = pingStore.get(sessionId) ?? [];
  pings.unshift(ping); // Add to front (newest first)

  // Trim old pings
  const cutoff = Date.now() - PING_TTL_MS;
  const filtered = pings
    .filter((p) => new Date(p.timestamp).getTime() > cutoff)
    .slice(0, MAX_PINGS_PER_SESSION);

  pingStore.set(sessionId, filtered);
}

function getRecentPings(sessionId: string): FocusPing[] {
  return pingStore.get(sessionId) ?? [];
}

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const FocusPingSchema = z.object({
  sessionId: z.string().uuid(),
  learnerId: z.string().uuid(),
  timestamp: z.string().datetime(),
  activityId: z.string(),
  idleMs: z.number().int().min(0),
  appInBackground: z.boolean(),
  selfReportedMood: z.enum(['happy', 'okay', 'frustrated', 'tired', 'confused']).optional(),
  rapidExit: z.boolean().optional(),
});

const RecommendationRequestSchema = z.object({
  sessionId: z.string().uuid(),
  learnerId: z.string().uuid(),
  context: z.object({
    currentActivityId: z.string().optional(),
    gradeBand: z.enum(['K5', 'G6_8', 'G9_12']),
    mood: z.enum(['happy', 'okay', 'frustrated', 'tired', 'confused']).optional(),
    focusLossReasons: z.array(z.string()).optional(),
  }),
});

const BreakStartedSchema = z.object({
  sessionId: z.string().uuid(),
  learnerId: z.string().uuid(),
  activityType: z.enum([
    'breathing',
    'stretching',
    'movement',
    'grounding',
    'mindful_pause',
    'simple_game',
  ]),
  activityTitle: z.string().optional(),
});

const BreakCompleteSchema = z.object({
  sessionId: z.string().uuid(),
  learnerId: z.string().uuid(),
  activityType: z.enum([
    'breathing',
    'stretching',
    'movement',
    'grounding',
    'mindful_pause',
    'simple_game',
  ]),
  completedFully: z.boolean(),
  helpfulnessRating: z.number().int().min(1).max(5).optional(),
  actualDurationSeconds: z.number().int().min(0).optional(),
});

const AnalyzeRequestSchema = z.object({
  sessionId: z.string().uuid(),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  learnerId?: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const registerFocusRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /focus/ping
   * Receive focus telemetry from the client app.
   * Stores the ping and optionally triggers focus loss detection.
   */
  app.post('/ping', async (request, reply) => {
    const parsed = FocusPingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const _user = getUser(request);
    const ping = parsed.data;

    // Store the ping in memory
    storePing(ping.sessionId, ping as FocusPing);

    // Also emit as a session event for persistence
    try {
      await sessionServiceClient.emitEvent(ping.sessionId, 'FOCUS_INTERVENTION_SHOWN', {
        type: 'FOCUS_PING',
        activityId: ping.activityId,
        idleMs: ping.idleMs,
        appInBackground: ping.appInBackground,
        selfReportedMood: ping.selfReportedMood,
        rapidExit: ping.rapidExit,
        clientTimestamp: ping.timestamp,
        learnerId: ping.learnerId,
      });
    } catch (err) {
      request.log.warn({ err }, 'Failed to emit FOCUS_PING event to session-svc');
    }

    // Run detection on recent pings
    const recentPings = getRecentPings(ping.sessionId);
    const detection = detectFocusLoss(recentPings);

    // If focus loss detected, emit event
    if (detection.detected) {
      try {
        await sessionServiceClient.emitEvent(ping.sessionId, 'FOCUS_LOSS_DETECTED', {
          reasons: detection.reasons,
          confidence: detection.confidence,
          suggestedIntervention: detection.suggestedIntervention,
          learnerId: ping.learnerId,
        });
      } catch (err) {
        request.log.warn({ err }, 'Failed to emit FOCUS_LOSS_DETECTED event');
      }
    }

    return reply.send({
      received: true,
      detection: {
        focusLossDetected: detection.detected,
        reasons: detection.reasons,
        suggestedIntervention: detection.suggestedIntervention,
        confidence: detection.confidence,
      },
    });
  });

  /**
   * POST /focus/analyze
   * Explicitly analyze focus state for a session.
   * Called when client wants to check if intervention is needed.
   */
  app.post('/analyze', async (request, reply) => {
    const parsed = AnalyzeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const { sessionId } = parsed.data;
    const recentPings = getRecentPings(sessionId);
    const detection = detectFocusLoss(recentPings);

    return reply.send({
      sessionId,
      pingSampleCount: recentPings.length,
      detection,
    });
  });

  /**
   * POST /focus/recommendation
   * Get a regulation activity recommendation.
   * Uses context to select the most appropriate activity.
   */
  app.post('/recommendation', async (request, reply) => {
    const parsed = RecommendationRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const { sessionId, learnerId, context } = parsed.data;

    // Get recommendation from catalog
    const recommendation = getRecommendation({
      gradeBand: context.gradeBand as GradeBand,
      mood: context.mood as SelfReportedMood | undefined,
      focusLossReasons: context.focusLossReasons as FocusLossReason[] | undefined,
    });

    // Log that intervention was shown
    try {
      await sessionServiceClient.emitEvent(sessionId, 'FOCUS_INTERVENTION_SHOWN', {
        learnerId,
        activityType: recommendation.activityType,
        activityTitle: recommendation.title,
        gradeBand: context.gradeBand,
        mood: context.mood,
        source: recommendation.source,
      });
    } catch (err) {
      request.log.warn({ err }, 'Failed to emit FOCUS_INTERVENTION_SHOWN event');
    }

    return reply.send({
      recommendation,
    });
  });

  /**
   * GET /focus/activities/:gradeBand
   * Get all available activities for a grade band.
   * Allows learner to choose their own regulation activity.
   */
  app.get<{ Params: { gradeBand: string } }>('/activities/:gradeBand', async (request, reply) => {
    const gradeBand = request.params.gradeBand as GradeBand;

    if (!['K5', 'G6_8', 'G9_12'].includes(gradeBand)) {
      return reply.code(400).send({ error: 'Invalid grade band' });
    }

    const activities = getAvailableActivities(gradeBand);

    return reply.send({
      gradeBand,
      activities,
      count: activities.length,
    });
  });

  /**
   * POST /focus/break-started
   * Client notifies that learner has started a regulation break.
   */
  app.post('/break-started', async (request, reply) => {
    const parsed = BreakStartedSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const { sessionId, learnerId, activityType, activityTitle } = parsed.data;

    // Log break started event
    try {
      const event = await sessionServiceClient.emitEvent(sessionId, 'FOCUS_BREAK_STARTED', {
        learnerId,
        activityType,
        activityTitle,
        startedAt: new Date().toISOString(),
      });

      return reply.send({
        success: true,
        eventId: event.id,
        message: 'Break started! Take your time.',
      });
    } catch (err) {
      request.log.error({ err }, 'Failed to emit FOCUS_BREAK_STARTED event');
      return reply.code(500).send({ error: 'Failed to log break start' });
    }
  });

  /**
   * POST /focus/break-complete
   * Client notifies that learner has completed a regulation break.
   */
  app.post('/break-complete', async (request, reply) => {
    const parsed = BreakCompleteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const {
      sessionId,
      learnerId,
      activityType,
      completedFully,
      helpfulnessRating,
      actualDurationSeconds,
    } = parsed.data;

    // Log break ended event
    try {
      const event = await sessionServiceClient.emitEvent(sessionId, 'FOCUS_BREAK_ENDED', {
        learnerId,
        activityType,
        completedFully,
        helpfulnessRating,
        actualDurationSeconds,
        endedAt: new Date().toISOString(),
      });

      // Determine encouraging message based on completion
      let message: string;
      if (completedFully) {
        message = 'Great job taking that break! Ready to continue?';
      } else {
        message = "That's okay! Even a short break can help. Ready when you are!";
      }

      const response: BreakCompleteResponse = {
        success: true,
        eventId: event.id,
        message,
      };

      return reply.send(response);
    } catch (err) {
      request.log.error({ err }, 'Failed to emit FOCUS_BREAK_ENDED event');
      return reply.code(500).send({ error: 'Failed to log break completion' });
    }
  });

  /**
   * POST /focus/mood-report
   * Allow learner to explicitly report their mood.
   * This is a lightweight way to get emotional state without full ping.
   */
  app.post('/mood-report', async (request, reply) => {
    const schema = z.object({
      sessionId: z.string().uuid(),
      learnerId: z.string().uuid(),
      mood: z.enum(['happy', 'okay', 'frustrated', 'tired', 'confused']),
      activityId: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const { sessionId, learnerId, mood, activityId } = parsed.data;

    // Store as a focus ping with mood
    const moodPing: FocusPing = {
      sessionId,
      learnerId,
      timestamp: new Date().toISOString(),
      activityId: activityId ?? 'unknown',
      idleMs: 0,
      appInBackground: false,
      selfReportedMood: mood as SelfReportedMood,
    };

    storePing(sessionId, moodPing);

    // Check if mood warrants intervention
    const shouldIntervene = mood === 'frustrated' || mood === 'tired';

    return reply.send({
      received: true,
      mood,
      shouldOfferBreak: shouldIntervene,
      message: shouldIntervene
        ? 'Would you like to take a quick break?'
        : 'Thanks for sharing how you feel!',
    });
  });
};

// Export for testing
export { pingStore, storePing, getRecentPings };
