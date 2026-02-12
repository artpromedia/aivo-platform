/**
 * AI Transparency API for Teachers
 *
 * Provides teachers with visibility into how AI decisions are made for their students,
 * including what data influenced the AI response and what safety measures were applied.
 *
 * CRITICAL: This addresses HIGH-001 - AI explanation transparency for teachers
 *
 * Backend Services:
 * - ai-orchestrator (port 3060) - AI call logs and explanations
 * - analytics-svc (port 4030) - Explanation events
 */

const AI_ORCHESTRATOR_URL = process.env.NEXT_PUBLIC_AI_ORCHESTRATOR_URL || 'http://localhost:3060';
const ANALYTICS_API_URL = process.env.NEXT_PUBLIC_ANALYTICS_URL || 'http://localhost:4030';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * AI decision factors that influenced a response
 */
export interface AiDecisionFactors {
  /** Student's current mastery level for the subject */
  masteryLevel?: number;
  /** Recent accuracy in the subject area */
  recentAccuracy?: number;
  /** Number of attempts on the current topic */
  attemptCount?: number;
  /** Active learning goals related to the response */
  learningGoals?: string[];
  /** IEP/504 accommodations applied */
  accommodations?: string[];
  /** Focus/engagement score if available */
  focusScore?: number;
  /** Session duration when the response was generated */
  sessionDurationMinutes?: number;
}

/**
 * Safety measures applied to the AI response
 */
export interface AiSafetyActions {
  /** PII elements redacted from input/output */
  piiRedacted: boolean;
  /** Content filters applied */
  contentFilters: string[];
  /** Toxicity level detected (0-1) */
  toxicityScore?: number;
  /** Whether response was modified for safety */
  responseModified: boolean;
  /** Safety classification */
  safetyLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Summary of an AI interaction for teacher review
 */
export interface AiInteractionSummary {
  id: string;
  /** When the AI interaction occurred */
  timestamp: string;
  /** Type of AI request (e.g., 'homework_help', 'explanation', 'hint') */
  requestType: string;
  /** What the student asked about (sanitized) */
  topic: string;
  /** The subject area */
  subject: string;
  /** Factors that influenced the AI response */
  decisionFactors: AiDecisionFactors;
  /** Safety measures applied */
  safetyActions: AiSafetyActions;
  /** AI model used */
  model: string;
  /** Provider (e.g., 'anthropic', 'openai') */
  provider: string;
  /** Human-readable explanation of why the AI responded this way */
  explanation: string;
  /** Confidence score of the response (0-1) */
  confidence?: number;
}

/**
 * Detailed AI transparency report for a student
 */
export interface StudentAiTransparencyReport {
  studentId: string;
  studentName: string;
  /** Total AI interactions in the period */
  totalInteractions: number;
  /** Breakdown by request type */
  interactionsByType: Record<string, number>;
  /** Average decision factors across interactions */
  averageFactors: {
    masteryLevel: number;
    accuracy: number;
    focusScore: number;
  };
  /** Safety summary */
  safetySummary: {
    totalFiltered: number;
    piiRedactionCount: number;
    safetyLevelCounts: Record<string, number>;
  };
  /** Recent interactions (most recent first) */
  recentInteractions: AiInteractionSummary[];
  /** Period covered by this report */
  period: { from: string; to: string };
}

/**
 * Explanation event from the analytics service
 */
export interface ExplanationEvent {
  id: string;
  sourceType: string;
  actionType: string;
  relatedEntityType: string;
  relatedEntityId: string;
  summaryText: string;
  detailsJson: {
    reasons?: Array<{
      code: string;
      weight: number;
      description: string;
    }>;
    inputs?: Record<string, unknown>;
    thresholds?: Record<string, unknown>;
  };
  aiCallLogId?: string;
  confidence?: number;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch AI transparency report for a specific student.
 * This gives teachers insight into how AI has been helping their student.
 *
 * @param studentId - The student's ID
 * @param accessToken - Teacher's access token
 * @param options - Optional filters
 */
export async function fetchStudentAiTransparency(
  studentId: string,
  accessToken: string,
  options?: {
    days?: number;
    limit?: number;
  }
): Promise<StudentAiTransparencyReport> {
  const params = new URLSearchParams();
  if (options?.days) params.set('days', String(options.days));
  if (options?.limit) params.set('limit', String(options.limit));

  const res = await fetch(
    `${AI_ORCHESTRATOR_URL}/teacher/students/${studentId}/ai-transparency?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch AI transparency: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch a single AI interaction with full transparency details.
 *
 * @param interactionId - The AI interaction/call log ID
 * @param accessToken - Teacher's access token
 */
export async function fetchAiInteractionDetails(
  interactionId: string,
  accessToken: string
): Promise<AiInteractionSummary> {
  const res = await fetch(
    `${AI_ORCHESTRATOR_URL}/teacher/ai-interactions/${interactionId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch AI interaction: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch explanation events for a specific activity/learning object.
 * Shows teachers why a particular piece of content was selected or modified.
 *
 * @param entityType - Type of entity (e.g., 'LEARNING_OBJECT_VERSION', 'ACTIVITY')
 * @param entityId - ID of the entity
 * @param accessToken - Teacher's access token
 * @param options - Optional filters
 */
export async function fetchExplanationsForEntity(
  entityType: string,
  entityId: string,
  accessToken: string,
  options?: {
    studentId?: string;
    limit?: number;
  }
): Promise<{ explanations: ExplanationEvent[]; hasFallback: boolean }> {
  const params = new URLSearchParams({
    relatedEntityType: entityType,
    relatedEntityId: entityId,
    limit: String(options?.limit ?? 5),
  });

  if (options?.studentId) {
    params.set('learnerId', options.studentId);
  }

  try {
    const res = await fetch(
      `${ANALYTICS_API_URL}/explanations/by-entity?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      // Return fallback explanation when API fails
      return {
        explanations: [{
          id: 'fallback',
          sourceType: 'SYSTEM',
          actionType: 'UNKNOWN',
          relatedEntityType: entityType,
          relatedEntityId: entityId,
          summaryText: 'Detailed AI decision information is being processed. Check back shortly.',
          detailsJson: {},
          createdAt: new Date().toISOString(),
        }],
        hasFallback: true,
      };
    }

    return res.json();
  } catch (error) {
    console.error('Failed to fetch explanations:', error);
    return {
      explanations: [{
        id: 'fallback',
        sourceType: 'SYSTEM',
        actionType: 'UNKNOWN',
        relatedEntityType: entityType,
        relatedEntityId: entityId,
        summaryText: 'Unable to load AI decision details at this time.',
        detailsJson: {},
        createdAt: new Date().toISOString(),
      }],
      hasFallback: true,
    };
  }
}

/**
 * Fetch recent AI decisions for a student, grouped by type.
 * Helps teachers understand patterns in AI support for their student.
 *
 * @param studentId - The student's ID
 * @param accessToken - Teacher's access token
 * @param options - Optional filters
 */
export async function fetchRecentAiDecisions(
  studentId: string,
  accessToken: string,
  options?: {
    actionTypes?: string[];
    days?: number;
    limit?: number;
  }
): Promise<{
  studentId: string;
  total: number;
  decisions: ExplanationEvent[];
  byActionType: Record<string, ExplanationEvent[]>;
} | null> {
  const params = new URLSearchParams({
    limit: String(options?.limit ?? 20),
    days: String(options?.days ?? 28),
  });

  if (options?.actionTypes?.length) {
    params.set('actionTypes', options.actionTypes.join(','));
  }

  try {
    const res = await fetch(
      `${ANALYTICS_API_URL}/explanations/learners/${studentId}/recent?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Failed to fetch recent AI decisions:', error);
    return null;
  }
}

/**
 * Report a concern about an AI interaction to platform admins.
 * Teachers can flag AI responses that seem inappropriate or incorrect.
 *
 * @param interactionId - The AI interaction ID
 * @param concern - Description of the concern
 * @param accessToken - Teacher's access token
 */
export async function reportAiConcern(
  interactionId: string,
  concern: {
    type: 'INAPPROPRIATE' | 'INCORRECT' | 'SAFETY' | 'OTHER';
    description: string;
  },
  accessToken: string
): Promise<{ reportId: string; status: string }> {
  const res = await fetch(
    `${AI_ORCHESTRATOR_URL}/teacher/ai-interactions/${interactionId}/report`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(concern),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to report concern: ${res.status}`);
  }

  return res.json();
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get human-readable label for AI action type
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
 * Get human-readable label for AI source type
 */
export function getSourceTypeLabel(sourceType: string): string {
  const labels: Record<string, string> = {
    LESSON_PLANNER: 'Lesson Planner',
    VIRTUAL_BRAIN: 'AI Tutor',
    FOCUS_AGENT: 'Focus Monitor',
    RECOMMENDER: 'Content Recommender',
    SYSTEM_POLICY: 'System Policy',
    BASELINE_AGENT: 'Assessment Agent',
    HOMEWORK_HELPER: 'Homework Helper',
  };
  return labels[sourceType] ?? sourceType.replace(/_/g, ' ');
}

/**
 * Get safety level description
 */
export function getSafetyLevelDescription(level: string): string {
  const descriptions: Record<string, string> = {
    SAFE: 'No safety concerns detected',
    LOW: 'Minor adjustments made for appropriateness',
    MEDIUM: 'Content modified for student safety',
    HIGH: 'Response significantly filtered for safety',
  };
  return descriptions[level] ?? 'Safety level unknown';
}

/**
 * Format mastery level as percentage with label
 */
export function formatMasteryLevel(level: number): {
  percentage: string;
  label: string;
  color: string;
} {
  const percentage = `${Math.round(level * 100)}%`;

  if (level >= 0.8) {
    return { percentage, label: 'Advanced', color: 'text-green-600' };
  } else if (level >= 0.6) {
    return { percentage, label: 'Proficient', color: 'text-blue-600' };
  } else if (level >= 0.4) {
    return { percentage, label: 'Developing', color: 'text-yellow-600' };
  } else {
    return { percentage, label: 'Beginning', color: 'text-orange-600' };
  }
}

/**
 * Format reason code as human-readable text
 */
export function formatReasonCode(code: string): string {
  const formats: Record<string, string> = {
    LOW_MASTERY: 'Low mastery in this skill area',
    HIGH_MASTERY: 'High mastery demonstrated',
    MASTERY_PLATEAU: 'Learning progress has plateaued',
    RECENT_STRUGGLE: 'Recent difficulties with this topic',
    RECENT_SUCCESS: 'Recent success with similar content',
    ACCURACY_BELOW_THRESHOLD: 'Accuracy below target level',
    ACCURACY_ABOVE_THRESHOLD: 'Accuracy above target level',
    FOCUS_LOSS_DETECTED: 'Focus loss was detected',
    TIME_BASED_BREAK: 'Time-based break recommended',
    IDLE_DETECTED: 'Extended idle period detected',
    PREREQUISITE_MET: 'Prerequisites completed',
    SKILL_GAP_IDENTIFIED: 'Skill gap was identified',
    REINFORCEMENT_NEEDED: 'Additional practice recommended',
    POLICY_RULE_TRIGGERED: 'Platform policy applied',
    TIME_LIMIT_REACHED: 'Session time limit reached',
    CONTENT_RESTRICTION: 'Content restrictions applied',
    EXPERIMENT_VARIANT: 'Part of learning research study',
  };
  return formats[code] ?? code.replace(/_/g, ' ').toLowerCase();
}

/**
 * Get icon name for action type (Lucide icons)
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
  return icons[actionType] ?? 'brain';
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
