/**
 * Focus telemetry types for client-to-backend communication.
 */

// ══════════════════════════════════════════════════════════════════════════════
// TELEMETRY TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Self-reported mood states that learners can indicate.
 * Kept simple and non-clinical.
 */
export type SelfReportedMood = 'happy' | 'okay' | 'frustrated' | 'tired' | 'confused';

/**
 * Grade bands for age-appropriate recommendations.
 */
export type GradeBand = 'K5' | 'G6_8' | 'G9_12';

/**
 * Focus ping telemetry sent by the client app.
 * Sent periodically (e.g., every 10-30 seconds) during active sessions.
 */
export interface FocusPing {
  /** The active session ID */
  sessionId: string;

  /** The learner's ID */
  learnerId: string;

  /** Client-side timestamp of the ping */
  timestamp: string;

  /** Current activity the learner is working on */
  activityId: string;

  /** Milliseconds since last user interaction (touch, tap, scroll) */
  idleMs: number;

  /** Whether the app is currently in the background */
  appInBackground: boolean;

  /** Optional self-reported mood from the learner */
  selfReportedMood?: SelfReportedMood;

  /** Optional: rapid exit indicator (back button pressed quickly) */
  rapidExit?: boolean;
}

/**
 * Stored focus sample with additional metadata.
 */
export interface FocusSample extends FocusPing {
  /** Server-assigned ID */
  id: string;

  /** Tenant ID from auth context */
  tenantId: string;

  /** Server receive timestamp */
  receivedAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// DETECTION TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Reasons why focus loss was detected.
 */
export type FocusLossReason =
  | 'extended_idle'
  | 'rapid_switching'
  | 'self_reported_frustrated'
  | 'self_reported_tired'
  | 'app_backgrounded'
  | 'rapid_exit';

/**
 * Result of focus loss detection analysis.
 */
export interface FocusLossDetection {
  /** Whether focus loss was detected */
  detected: boolean;

  /** Reasons for detection (if any) */
  reasons: FocusLossReason[];

  /** Confidence score 0-1 */
  confidence: number;

  /** Suggested intervention intensity: light, moderate, or break */
  suggestedIntervention: 'none' | 'light_prompt' | 'regulation_break';

  /** Timestamp of detection */
  detectedAt?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Types of regulation activities.
 * All activities are simple, non-clinical, and age-appropriate.
 */
export type RegulationActivityType =
  | 'breathing'
  | 'stretching'
  | 'movement'
  | 'grounding'
  | 'mindful_pause'
  | 'simple_game';

/**
 * Request for a regulation recommendation.
 */
export interface RegulationRecommendationRequest {
  /** The active session ID */
  sessionId: string;

  /** The learner's ID */
  learnerId: string;

  /** Context for the recommendation */
  context: {
    /** Current activity being worked on */
    currentActivityId?: string;

    /** Learner's grade band */
    gradeBand: GradeBand;

    /** Current or recent mood */
    mood?: SelfReportedMood;

    /** Focus loss reasons that triggered this */
    focusLossReasons?: FocusLossReason[];
  };
}

/**
 * A regulation activity recommendation.
 */
export interface RegulationRecommendation {
  /** Type of activity */
  activityType: RegulationActivityType;

  /** User-friendly title */
  title: string;

  /** Brief description of the activity */
  description: string;

  /** Estimated duration in seconds */
  estimatedDurationSeconds: number;

  /** Age-appropriate instructions */
  instructions?: string[];

  /** Whether this was AI-generated or from static catalog */
  source: 'static' | 'ai';
}

// ══════════════════════════════════════════════════════════════════════════════
// BREAK COMPLETION TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Request to mark a focus break as completed.
 */
export interface BreakCompleteRequest {
  /** The active session ID */
  sessionId: string;

  /** The learner's ID */
  learnerId: string;

  /** The activity type that was completed */
  activityType: RegulationActivityType;

  /** Whether the learner completed the full activity */
  completedFully: boolean;

  /** Optional perceived helpfulness (1-5) */
  helpfulnessRating?: number;

  /** Actual duration in seconds */
  actualDurationSeconds?: number;
}

/**
 * Response after completing a focus break.
 */
export interface BreakCompleteResponse {
  /** Success indicator */
  success: boolean;

  /** Event ID logged */
  eventId?: string;

  /** Encouraging message */
  message: string;
}
