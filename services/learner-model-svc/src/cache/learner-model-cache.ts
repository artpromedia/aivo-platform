/**
 * Learner Model Cache
 *
 * High-level cache wrapper specifically for learner model data.
 * Provides typed methods for caching learner states, recommendations, etc.
 */

import type { EngagementAnalysis } from '../models/analytics/engagement-detector.js';
import type { KnowledgeState } from '../models/bkt/types.js';
import type { LearnerModelState, ActivityRecommendation } from '../models/learner-model-types.js';
import type { SessionPlan } from '../services/activity-sequencer-types.js';

import type { CacheClient } from './types.js';
import { CACHE_PREFIXES, DEFAULT_TTL } from './types.js';

/**
 * Learner model-specific cache operations.
 */
export class LearnerModelCache {
  constructor(private readonly cache: CacheClient) {}

  /**
   * Build cache key for learner model state.
   */
  private learnerModelKey(learnerId: string): string {
    return `${CACHE_PREFIXES.LEARNER_MODEL}${learnerId}`;
  }

  /**
   * Build cache key for BKT skill state.
   */
  private bktStateKey(learnerId: string, skillId: string): string {
    return `${CACHE_PREFIXES.BKT_STATE}${learnerId}:${skillId}`;
  }

  /**
   * Build cache key for engagement state.
   */
  private engagementKey(learnerId: string): string {
    return `${CACHE_PREFIXES.ENGAGEMENT}${learnerId}`;
  }

  /**
   * Build cache key for session plan.
   */
  private sessionPlanKey(learnerId: string, sessionId: string): string {
    return `${CACHE_PREFIXES.SESSION_PLAN}${learnerId}:${sessionId}`;
  }

  /**
   * Build cache key for recommendations.
   */
  private recommendationsKey(learnerId: string): string {
    return `${CACHE_PREFIXES.RECOMMENDATIONS}${learnerId}`;
  }

  // ── Learner Model State ──────────────────────────────────────────────────

  /**
   * Get cached learner model state.
   */
  async getLearnerModelState(learnerId: string): Promise<LearnerModelState | null> {
    return this.cache.get<LearnerModelState>(this.learnerModelKey(learnerId));
  }

  /**
   * Cache learner model state.
   */
  async setLearnerModelState(
    learnerId: string,
    state: LearnerModelState,
    ttlSeconds: number = DEFAULT_TTL.LEARNER_MODEL
  ): Promise<void> {
    await this.cache.set(this.learnerModelKey(learnerId), state, ttlSeconds);
  }

  /**
   * Invalidate cached learner model state.
   */
  async invalidateLearnerModelState(learnerId: string): Promise<void> {
    await this.cache.delete(this.learnerModelKey(learnerId));
  }

  // ── BKT Skill State ──────────────────────────────────────────────────────

  /**
   * Get cached BKT state for a skill.
   */
  async getBKTState(learnerId: string, skillId: string): Promise<KnowledgeState | null> {
    return this.cache.get<KnowledgeState>(this.bktStateKey(learnerId, skillId));
  }

  /**
   * Cache BKT state for a skill.
   */
  async setBKTState(
    learnerId: string,
    skillId: string,
    state: KnowledgeState,
    ttlSeconds: number = DEFAULT_TTL.BKT_STATE
  ): Promise<void> {
    await this.cache.set(this.bktStateKey(learnerId, skillId), state, ttlSeconds);
  }

  /**
   * Get multiple BKT states at once.
   */
  async getBKTStates(
    learnerId: string,
    skillIds: string[]
  ): Promise<Map<string, KnowledgeState | null>> {
    const keys = skillIds.map((id) => this.bktStateKey(learnerId, id));
    const results = await this.cache.mget<KnowledgeState>(keys);

    // Remap to skillId keys
    const mapped = new Map<string, KnowledgeState | null>();
    skillIds.forEach((skillId, index) => {
      const key = keys[index];
      if (key === undefined) {
        mapped.set(skillId, null);
      } else {
        mapped.set(skillId, results.get(key) ?? null);
      }
    });
    return mapped;
  }

  /**
   * Cache multiple BKT states at once.
   */
  async setBKTStates(
    learnerId: string,
    states: Map<string, KnowledgeState>,
    ttlSeconds: number = DEFAULT_TTL.BKT_STATE
  ): Promise<void> {
    const entries = new Map<string, KnowledgeState>();
    for (const [skillId, state] of states) {
      entries.set(this.bktStateKey(learnerId, skillId), state);
    }
    await this.cache.mset(entries, ttlSeconds);
  }

  /**
   * Invalidate BKT state for a skill.
   */
  async invalidateBKTState(learnerId: string, skillId: string): Promise<void> {
    await this.cache.delete(this.bktStateKey(learnerId, skillId));
  }

  // ── Engagement ───────────────────────────────────────────────────────────

  /**
   * Get cached engagement analysis.
   */
  async getEngagement(learnerId: string): Promise<EngagementAnalysis | null> {
    return this.cache.get<EngagementAnalysis>(this.engagementKey(learnerId));
  }

  /**
   * Cache engagement analysis.
   */
  async setEngagement(
    learnerId: string,
    engagement: EngagementAnalysis,
    ttlSeconds: number = DEFAULT_TTL.ENGAGEMENT
  ): Promise<void> {
    await this.cache.set(this.engagementKey(learnerId), engagement, ttlSeconds);
  }

  /**
   * Invalidate cached engagement.
   */
  async invalidateEngagement(learnerId: string): Promise<void> {
    await this.cache.delete(this.engagementKey(learnerId));
  }

  // ── Session Plans ────────────────────────────────────────────────────────

  /**
   * Get cached session plan.
   */
  async getSessionPlan(learnerId: string, sessionId: string): Promise<SessionPlan | null> {
    return this.cache.get<SessionPlan>(this.sessionPlanKey(learnerId, sessionId));
  }

  /**
   * Cache session plan.
   */
  async setSessionPlan(
    learnerId: string,
    sessionId: string,
    plan: SessionPlan,
    ttlSeconds: number = DEFAULT_TTL.SESSION_PLAN
  ): Promise<void> {
    await this.cache.set(this.sessionPlanKey(learnerId, sessionId), plan, ttlSeconds);
  }

  /**
   * Invalidate cached session plan.
   */
  async invalidateSessionPlan(learnerId: string, sessionId: string): Promise<void> {
    await this.cache.delete(this.sessionPlanKey(learnerId, sessionId));
  }

  // ── Recommendations ──────────────────────────────────────────────────────

  /**
   * Get cached recommendations.
   */
  async getRecommendations(learnerId: string): Promise<ActivityRecommendation[] | null> {
    return this.cache.get<ActivityRecommendation[]>(this.recommendationsKey(learnerId));
  }

  /**
   * Cache recommendations.
   */
  async setRecommendations(
    learnerId: string,
    recommendations: ActivityRecommendation[],
    ttlSeconds: number = DEFAULT_TTL.RECOMMENDATIONS
  ): Promise<void> {
    await this.cache.set(this.recommendationsKey(learnerId), recommendations, ttlSeconds);
  }

  /**
   * Invalidate cached recommendations.
   */
  async invalidateRecommendations(learnerId: string): Promise<void> {
    await this.cache.delete(this.recommendationsKey(learnerId));
  }

  // ── Utility ──────────────────────────────────────────────────────────────

  /**
   * Invalidate all cached data for a learner.
   */
  async invalidateAllForLearner(learnerId: string, skillIds: string[] = []): Promise<void> {
    const keysToDelete = [
      this.learnerModelKey(learnerId),
      this.engagementKey(learnerId),
      this.recommendationsKey(learnerId),
      ...skillIds.map((id) => this.bktStateKey(learnerId, id)),
    ];
    await this.cache.mdelete(keysToDelete);
  }

  /**
   * Close the underlying cache connection.
   */
  async close(): Promise<void> {
    await this.cache.close();
  }
}
