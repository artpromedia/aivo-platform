/**
 * Explanation API client for Teacher Web App.
 *
 * Provides functions to fetch explanation events from the analytics service.
 * Used by the WhyThis modal component.
 */

import type { AuthSession } from './auth';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ExplanationReason {
  label: string;
  description: string;
}

export interface ExplanationInput {
  label: string;
  value: string;
  unit?: string;
}

export interface ExplanationDetails {
  reasons: ExplanationReason[];
  inputs: ExplanationInput[];
  additionalContext?: string;
}

export interface Explanation {
  id: string;
  sourceType: string;
  actionType: string;
  relatedEntityType: string;
  relatedEntityId: string;
  summary: string;
  details: ExplanationDetails;
  createdAt: string;
}

export interface ExplanationsResponse {
  explanations: Explanation[];
  hasFallback: boolean;
}

export interface RecentExplanationsResponse {
  learnerId: string;
  total: number;
  explanations: Explanation[];
  byActionType: Record<string, Explanation[]>;
  actionTypeLabels: Record<string, string>;
}

// ══════════════════════════════════════════════════════════════════════════════
// FALLBACKS
// ══════════════════════════════════════════════════════════════════════════════

const FALLBACK_MESSAGES: Record<string, string> = {
  LEARNING_OBJECT_VERSION:
    "This activity was selected based on the learner's current progress and learning goals. More detailed explanations are being developed.",
  SKILL:
    "This skill was identified through analysis of the learner's performance data and curriculum alignment.",
  MODULE:
    "This module was recommended based on prerequisite completion and learning path progression.",
  RECOMMENDATION:
    "This recommendation was generated using learning analytics. We're enhancing our explanation system.",
  DEFAULT:
    "This decision was made based on learning data and educational goals. Detailed explanations coming soon.",
};

function createFallbackExplanation(
  entityType: string,
  entityId: string
): Explanation {
  return {
    id: 'fallback',
    sourceType: 'SYSTEM',
    actionType: 'UNKNOWN',
    relatedEntityType: entityType,
    relatedEntityId: entityId,
    summary: FALLBACK_MESSAGES[entityType] ?? FALLBACK_MESSAGES.DEFAULT,
    details: {
      reasons: [],
      inputs: [],
    },
    createdAt: new Date().toISOString(),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

const ANALYTICS_API_URL = process.env.NEXT_PUBLIC_ANALYTICS_API_URL ?? '/api/analytics';

/**
 * Fetch explanations for a specific entity.
 *
 * @param entityType - Type of entity (e.g., LEARNING_OBJECT_VERSION, SKILL)
 * @param entityId - ID of the entity
 * @param session - Auth session for API calls
 * @param options - Optional filters
 */
export async function getExplanationsByEntity(
  entityType: string,
  entityId: string,
  session: AuthSession,
  options?: {
    learnerId?: string;
    limit?: number;
  }
): Promise<ExplanationsResponse> {
  const params = new URLSearchParams({
    relatedEntityType: entityType,
    relatedEntityId: entityId,
    limit: String(options?.limit ?? 3),
  });

  if (options?.learnerId) {
    params.set('learnerId', options.learnerId);
  }

  try {
    const response = await fetch(
      `${ANALYTICS_API_URL}/explanations/by-entity?${params}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // Return fallback on error
      return {
        explanations: [createFallbackExplanation(entityType, entityId)],
        hasFallback: true,
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch explanations:', error);
    return {
      explanations: [createFallbackExplanation(entityType, entityId)],
      hasFallback: true,
    };
  }
}

/**
 * Fetch recent explanations for a learner.
 *
 * @param learnerId - Learner ID
 * @param session - Auth session for API calls
 * @param options - Optional filters
 */
export async function getRecentExplanations(
  learnerId: string,
  session: AuthSession,
  options?: {
    actionTypes?: string[];
    limit?: number;
  }
): Promise<RecentExplanationsResponse | null> {
  const params = new URLSearchParams({
    limit: String(options?.limit ?? 10),
  });

  if (options?.actionTypes && options.actionTypes.length > 0) {
    params.set('actionTypes', options.actionTypes.join(','));
  }

  try {
    const response = await fetch(
      `${ANALYTICS_API_URL}/explanations/learners/${learnerId}/recent?${params}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch recent explanations:', error);
    return null;
  }
}

/**
 * Fetch a single explanation by ID.
 *
 * @param id - Explanation ID
 * @param session - Auth session for API calls
 */
export async function getExplanationById(
  id: string,
  session: AuthSession
): Promise<Explanation | null> {
  try {
    const response = await fetch(`${ANALYTICS_API_URL}/explanations/${id}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.explanation;
  } catch (error) {
    console.error('Failed to fetch explanation:', error);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get human-readable label for action type.
 */
export function getActionTypeLabel(actionType: string): string {
  const labels: Record<string, string> = {
    CONTENT_SELECTION: 'Activity Selection',
    DIFFICULTY_CHANGE: 'Difficulty Adjustment',
    FOCUS_BREAK_TRIGGER: 'Focus Break',
    FOCUS_INTERVENTION: 'Focus Support',
    MODULE_RECOMMENDATION: 'Module Suggestion',
    LEARNING_PATH_ADJUSTMENT: 'Learning Path Update',
    SKILL_PROGRESSION: 'Skill Progress',
    SCAFFOLDING_DECISION: 'Learning Support',
    POLICY_ENFORCEMENT: 'Policy Action',
  };
  return labels[actionType] ?? actionType.replace(/_/g, ' ');
}

/**
 * Get icon name for action type (for use with Lucide icons).
 */
export function getActionTypeIcon(actionType: string): string {
  const icons: Record<string, string> = {
    CONTENT_SELECTION: 'sparkles',
    DIFFICULTY_CHANGE: 'sliders-horizontal',
    FOCUS_BREAK_TRIGGER: 'timer',
    FOCUS_INTERVENTION: 'hand',
    MODULE_RECOMMENDATION: 'graduation-cap',
    LEARNING_PATH_ADJUSTMENT: 'route',
    SKILL_PROGRESSION: 'trending-up',
    SCAFFOLDING_DECISION: 'life-buoy',
    POLICY_ENFORCEMENT: 'shield',
  };
  return icons[actionType] ?? 'lightbulb';
}

/**
 * Format a date relative to now.
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}
