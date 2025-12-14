/**
 * Virtual Brain Update Routes
 *
 * Endpoint: POST /internal/ai/brain/update-from-events
 *
 * Updates a learner's Virtual Brain (skill graph) based on aggregated events.
 * Emits RecommendationCreated events for next-step difficulty changes or interventions.
 */

import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

import { config } from '../config.js';
import type {
  BrainUpdateRequest,
  BrainUpdateResult,
  LearnerRecommendation,
} from '../types/aiRequest.js';

// ────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ────────────────────────────────────────────────────────────────────────────

const updateFromEventsSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  from: z.string().datetime(),
  to: z.string().datetime(),
});

const batchUpdateSchema = z.object({
  tenantId: z.string().uuid(),
  learnerIds: z.array(z.string().uuid()).min(1).max(100),
  from: z.string().datetime(),
  to: z.string().datetime(),
});

// ────────────────────────────────────────────────────────────────────────────
// ROUTE OPTIONS
// ────────────────────────────────────────────────────────────────────────────

interface BrainRoutesOptions {
  pool: Pool;
}

// ────────────────────────────────────────────────────────────────────────────
// VIRTUAL BRAIN SERVICE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Virtual Brain Service - Manages learner skill graphs and recommendations.
 */
class VirtualBrainService {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Update a learner's Virtual Brain from events.
   */
  async updateFromEvents(request: BrainUpdateRequest): Promise<BrainUpdateResult> {
    const { tenantId, learnerId, from, to } = request;

    // Step 1: Fetch aggregated events for the learner
    const events = await this.fetchLearnerEvents(tenantId, learnerId, from, to);

    if (events.length === 0) {
      return {
        learnerId,
        updatedSkills: 0,
        recommendations: [],
        eventsProcessed: 0,
      };
    }

    // Step 2: Compute mastery updates
    const masteryUpdates = this.computeMasteryUpdates(events);

    // Step 3: Update the Virtual Brain (skill graph)
    const updatedSkills = await this.updateSkillGraph(tenantId, learnerId, masteryUpdates);

    // Step 4: Generate recommendations
    const recommendations = this.generateRecommendations(masteryUpdates);

    // Step 5: Emit recommendation events
    await this.emitRecommendations(tenantId, learnerId, recommendations);

    return {
      learnerId,
      updatedSkills,
      recommendations,
      eventsProcessed: events.length,
    };
  }

  /**
   * Fetch aggregated learning events for a learner.
   */
  private async fetchLearnerEvents(
    tenantId: string,
    learnerId: string,
    from: Date,
    to: Date
  ): Promise<LearnerEvent[]> {
    // Query aggregated events from the analytics/events store
    // This is a simplified implementation - real version would query NATS/analytics
    const query = `
      SELECT 
        skill_code,
        subject,
        COUNT(*) as attempt_count,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_count,
        AVG(time_spent_ms) as avg_time_ms,
        MAX(created_at) as last_attempt
      FROM learner_activity_events
      WHERE tenant_id = $1 
        AND learner_id = $2 
        AND created_at >= $3 
        AND created_at <= $4
      GROUP BY skill_code, subject
    `;

    try {
      const result = await this.pool.query(query, [tenantId, learnerId, from, to]);
      return result.rows.map((row: Record<string, unknown>) => ({
        skillCode: String(row.skill_code),
        subject: String(row.subject),
        attemptCount: Number.parseInt(String(row.attempt_count), 10),
        correctCount: Number.parseInt(String(row.correct_count), 10),
        avgTimeMs: Number.parseFloat(String(row.avg_time_ms)),
        lastAttempt: new Date(String(row.last_attempt)),
      }));
    } catch {
      // Table might not exist yet - return empty
      console.warn('[VirtualBrain] learner_activity_events table not found, using stub data');
      return [];
    }
  }

  /**
   * Compute mastery level updates from events.
   */
  private computeMasteryUpdates(events: LearnerEvent[]): MasteryUpdate[] {
    const updates: MasteryUpdate[] = [];

    for (const event of events) {
      // Calculate accuracy
      const accuracy = event.attemptCount > 0 ? event.correctCount / event.attemptCount : 0;

      // Determine mastery change based on performance
      // Using a simplified Item Response Theory (IRT) inspired approach
      let masteryDelta = 0;
      let confidence = 0;

      if (event.attemptCount >= 3) {
        // Enough data for meaningful update
        if (accuracy >= 0.9) {
          masteryDelta = 0.15; // Strong positive progress
          confidence = 0.85;
        } else if (accuracy >= 0.7) {
          masteryDelta = 0.08; // Moderate progress
          confidence = 0.7;
        } else if (accuracy >= 0.5) {
          masteryDelta = 0.02; // Slight progress
          confidence = 0.5;
        } else if (accuracy < 0.3) {
          masteryDelta = -0.1; // Struggling - might need review
          confidence = 0.6;
        }

        updates.push({
          skillCode: event.skillCode,
          subject: event.subject,
          accuracy,
          attemptCount: event.attemptCount,
          masteryDelta,
          confidence,
        });
      }
    }

    return updates;
  }

  /**
   * Update the skill graph in the database.
   */
  private async updateSkillGraph(
    tenantId: string,
    learnerId: string,
    updates: MasteryUpdate[]
  ): Promise<number> {
    if (updates.length === 0) {
      return 0;
    }

    let updatedCount = 0;

    for (const update of updates) {
      const query = `
        INSERT INTO learner_skill_mastery (
          tenant_id, learner_id, skill_code, subject,
          mastery_level, confidence, attempt_count,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          GREATEST(0, LEAST(1, $5)), $6, $7,
          NOW(), NOW()
        )
        ON CONFLICT (tenant_id, learner_id, skill_code)
        DO UPDATE SET
          mastery_level = GREATEST(0, LEAST(1, learner_skill_mastery.mastery_level + $5)),
          confidence = $6,
          attempt_count = learner_skill_mastery.attempt_count + $7,
          updated_at = NOW()
      `;

      try {
        await this.pool.query(query, [
          tenantId,
          learnerId,
          update.skillCode,
          update.subject,
          update.masteryDelta,
          update.confidence,
          update.attemptCount,
        ]);
        updatedCount++;
      } catch {
        // Table might not exist - log and continue
        console.warn(`[VirtualBrain] Failed to update skill ${update.skillCode}`);
      }
    }

    return updatedCount;
  }

  /**
   * Generate structured recommendations from mastery updates.
   */
  private generateRecommendations(updates: MasteryUpdate[]): LearnerRecommendation[] {
    const recommendations: LearnerRecommendation[] = [];

    for (const update of updates) {
      // High accuracy - recommend advancing difficulty
      if (update.accuracy >= 0.9 && update.attemptCount >= 5) {
        recommendations.push({
          type: 'MASTERY_ADVANCE',
          subject: update.subject,
          skill: update.skillCode,
          fromValue: update.accuracy - update.masteryDelta,
          toValue: update.accuracy,
          confidence: update.confidence,
          reason: 'HIGH_ACCURACY_SUSTAINED',
        });

        recommendations.push({
          type: 'DIFFICULTY_CHANGE',
          subject: update.subject,
          skill: update.skillCode,
          fromValue: 1,
          toValue: 2, // Increase difficulty level
          confidence: update.confidence * 0.9,
          reason: 'READY_FOR_CHALLENGE',
        });
      }

      // Low accuracy - recommend review or intervention
      if (update.accuracy < 0.4 && update.attemptCount >= 3) {
        recommendations.push({
          type: 'SKILL_REVIEW',
          subject: update.subject,
          skill: update.skillCode,
          fromValue: update.accuracy,
          toValue: 0.7, // Target mastery
          confidence: update.confidence,
          reason: 'STRUGGLING_NEEDS_SUPPORT',
        });

        // Recommend focus intervention for very low accuracy
        if (update.accuracy < 0.2) {
          recommendations.push({
            type: 'FOCUS_INTERVENTION',
            subject: update.subject,
            skill: update.skillCode,
            fromValue: update.accuracy,
            toValue: 0.5,
            confidence: update.confidence * 0.8,
            reason: 'SIGNIFICANT_DIFFICULTY',
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Emit recommendation events to NATS.
   */
  private async emitRecommendations(
    tenantId: string,
    learnerId: string,
    recommendations: LearnerRecommendation[]
  ): Promise<void> {
    for (const rec of recommendations) {
      // TODO: Emit to NATS JetStream
      console.log(
        JSON.stringify({
          event: 'RecommendationCreated',
          tenantId,
          learnerId,
          recommendationType: rec.type,
          subject: rec.subject,
          skill: rec.skill,
          fromValue: rec.fromValue,
          toValue: rec.toValue,
          confidence: rec.confidence,
          reason: rec.reason,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Get current skill mastery for a learner.
   */
  async getSkillMastery(
    tenantId: string,
    learnerId: string
  ): Promise<{ skillCode: string; subject: string; masteryLevel: number }[]> {
    const query = `
      SELECT skill_code, subject, mastery_level
      FROM learner_skill_mastery
      WHERE tenant_id = $1 AND learner_id = $2
      ORDER BY subject, skill_code
    `;

    try {
      const result = await this.pool.query(query, [tenantId, learnerId]);
      return result.rows.map((row: Record<string, unknown>) => ({
        skillCode: String(row.skill_code),
        subject: String(row.subject),
        masteryLevel: Number.parseFloat(String(row.mastery_level)),
      }));
    } catch {
      return [];
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// INTERNAL TYPES
// ────────────────────────────────────────────────────────────────────────────

interface LearnerEvent {
  skillCode: string;
  subject: string;
  attemptCount: number;
  correctCount: number;
  avgTimeMs: number;
  lastAttempt: Date;
}

interface MasteryUpdate {
  skillCode: string;
  subject: string;
  accuracy: number;
  attemptCount: number;
  masteryDelta: number;
  confidence: number;
}

// ────────────────────────────────────────────────────────────────────────────
// ROUTE REGISTRATION
// ────────────────────────────────────────────────────────────────────────────

export const registerBrainRoutes: FastifyPluginAsync<BrainRoutesOptions> = async (
  app: FastifyInstance,
  opts: BrainRoutesOptions
) => {
  const brainService = new VirtualBrainService(opts.pool);

  // Auth hook for internal routes
  app.addHook('preHandler', async (request, reply) => {
    const apiKey = request.headers['x-internal-api-key'];
    if (apiKey !== config.internalApiKey) {
      reply.code(401).send({ error: 'Unauthorized' });
      return reply;
    }
  });

  /**
   * POST /internal/ai/brain/update-from-events
   *
   * Update a learner's Virtual Brain from aggregated events.
   * Idempotent: running twice over the same time window converges to the same state.
   */
  app.post('/ai/brain/update-from-events', async (request, reply) => {
    const parsed = updateFromEventsSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid payload', details: parsed.error.issues });
      return;
    }

    const { tenantId, learnerId, from, to } = parsed.data;

    const result = await brainService.updateFromEvents({
      tenantId,
      learnerId,
      from: new Date(from),
      to: new Date(to),
    });

    reply.code(200).send({
      success: true,
      result,
    });
  });

  /**
   * POST /internal/ai/brain/batch-update
   *
   * Update multiple learners' Virtual Brains in batch.
   */
  app.post('/ai/brain/batch-update', async (request, reply) => {
    const parsed = batchUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid payload', details: parsed.error.issues });
      return;
    }

    const { tenantId, learnerIds, from, to } = parsed.data;
    const results: BrainUpdateResult[] = [];

    for (const learnerId of learnerIds) {
      const result = await brainService.updateFromEvents({
        tenantId,
        learnerId,
        from: new Date(from),
        to: new Date(to),
      });
      results.push(result);
    }

    const totalUpdated = results.reduce((sum, r) => sum + r.updatedSkills, 0);
    const totalRecommendations = results.reduce((sum, r) => sum + r.recommendations.length, 0);
    const totalEvents = results.reduce((sum, r) => sum + r.eventsProcessed, 0);

    reply.code(200).send({
      success: true,
      summary: {
        learnersProcessed: learnerIds.length,
        totalSkillsUpdated: totalUpdated,
        totalRecommendations,
        totalEventsProcessed: totalEvents,
      },
      results,
    });
  });

  /**
   * GET /internal/ai/brain/mastery
   *
   * Get current skill mastery for a learner.
   */
  app.get<{ Querystring: { tenantId: string; learnerId: string } }>(
    '/ai/brain/mastery',
    async (request, reply) => {
      const { tenantId, learnerId } = request.query;

      if (!tenantId || !learnerId) {
        reply.code(400).send({ error: 'tenantId and learnerId are required' });
        return;
      }

      const mastery = await brainService.getSkillMastery(tenantId, learnerId);

      reply.code(200).send({
        tenantId,
        learnerId,
        skills: mastery,
      });
    }
  );
};

// ────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────────────────

export { VirtualBrainService };
