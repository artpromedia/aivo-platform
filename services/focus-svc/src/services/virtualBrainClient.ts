/**
 * Virtual Brain Client
 *
 * Client for fetching learner skill data from the learner-model-svc.
 * Used to personalize learning break games based on the learner's
 * current skill levels in their Virtual Brain.
 *
 * @author AIVO Platform Team
 */

import { config } from '../config.js';
import type { GradeBand } from '../types/telemetry.js';
import type { LearnerSkillSnapshot, SkillDomain } from './learning-break-generator.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface VirtualBrainResponse {
  id: string;
  learnerId: string;
  gradeBand: GradeBand;
  skillStates: SkillStateResponse[];
}

interface SkillStateResponse {
  skillId: string;
  skillCode: string;
  domain: string;
  masteryLevel: number;
  confidence: number;
  lastAssessedAt: string;
  practiceCount: number;
}

interface LearnerSkillsResult {
  success: boolean;
  gradeBand?: GradeBand;
  skills: LearnerSkillSnapshot[];
  error?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Virtual Brain Client
 *
 * Fetches learner skill data to personalize learning breaks.
 */
class VirtualBrainClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.learnerModelSvcUrl;
    this.apiKey = config.learnerModelSvcApiKey;
  }

  /**
   * Fetch learner skills from their Virtual Brain
   */
  async getLearnerSkills(
    tenantId: string,
    learnerId: string,
    authToken?: string
  ): Promise<LearnerSkillsResult> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Use service API key for internal calls, or user's auth token
      if (this.apiKey) {
        headers['x-internal-api-key'] = this.apiKey;
      } else if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(
        `${this.baseUrl}/virtual-brains/learner/${learnerId}/skills`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // No Virtual Brain yet - return empty skills
          return {
            success: true,
            skills: [],
          };
        }

        const error = await response.text();
        console.warn(`[VirtualBrainClient] Failed to fetch skills: ${response.status} - ${error}`);
        return {
          success: false,
          skills: [],
          error: `Failed to fetch skills: ${response.status}`,
        };
      }

      const data = (await response.json()) as VirtualBrainResponse;

      // Transform to LearnerSkillSnapshot format
      const skills: LearnerSkillSnapshot[] = data.skillStates.map((state) => ({
        domain: state.domain as SkillDomain,
        skillCode: state.skillCode,
        masteryLevel: state.masteryLevel,
        recentlyPracticed: this.isRecentlyPracticed(state.lastAssessedAt, state.practiceCount),
      }));

      return {
        success: true,
        gradeBand: data.gradeBand,
        skills,
      };
    } catch (err) {
      console.error('[VirtualBrainClient] Error fetching skills:', err);
      return {
        success: false,
        skills: [],
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Get skills by domain
   */
  async getSkillsByDomain(
    tenantId: string,
    learnerId: string,
    domain: SkillDomain,
    authToken?: string
  ): Promise<LearnerSkillsResult> {
    const result = await this.getLearnerSkills(tenantId, learnerId, authToken);

    if (!result.success) {
      return result;
    }

    return {
      ...result,
      skills: result.skills.filter((s) => s.domain === domain),
    };
  }

  /**
   * Get skills that need reinforcement (mastery 3-7 range)
   */
  async getReinforcementSkills(
    tenantId: string,
    learnerId: string,
    authToken?: string
  ): Promise<LearnerSkillsResult> {
    const result = await this.getLearnerSkills(tenantId, learnerId, authToken);

    if (!result.success) {
      return result;
    }

    // Skills in the "reinforcement zone" - not too easy, not too hard
    return {
      ...result,
      skills: result.skills.filter((s) => s.masteryLevel >= 3 && s.masteryLevel <= 7),
    };
  }

  /**
   * Check if a skill was recently practiced
   */
  private isRecentlyPracticed(lastAssessedAt: string, practiceCount: number): boolean {
    if (practiceCount === 0) return false;

    const lastPractice = new Date(lastAssessedAt);
    const now = new Date();
    const hoursSince = (now.getTime() - lastPractice.getTime()) / (1000 * 60 * 60);

    // Consider "recently practiced" if within the last 24 hours
    return hoursSince < 24;
  }
}

// Export singleton
export const virtualBrainClient = new VirtualBrainClient();

// ══════════════════════════════════════════════════════════════════════════════
// FALLBACK SKILLS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate default skills when Virtual Brain is not available.
 * Used as fallback to still provide learning breaks.
 */
export function getDefaultSkills(gradeBand: GradeBand): LearnerSkillSnapshot[] {
  const domains: SkillDomain[] = ['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL'];

  return domains.map((domain) => ({
    domain,
    skillCode: `${domain}_GENERAL`,
    masteryLevel: 5, // Default to medium mastery
    recentlyPracticed: false,
  }));
}
