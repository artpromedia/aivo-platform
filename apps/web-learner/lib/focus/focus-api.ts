/**
 * Focus Monitoring API Client
 *
 * Connects to the focus-svc microservice for focus monitoring functionality.
 * Matches the mobile implementation in mobile-learner/lib/focus/focus_service.dart
 */

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const FOCUS_SVC_BASE = process.env.NEXT_PUBLIC_FOCUS_SVC_URL || 'http://localhost:4026';

// ══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Self-reported mood states that learners can indicate.
 */
export type SelfReportedMood = 'happy' | 'okay' | 'frustrated' | 'tired' | 'confused';

/**
 * Grade bands for age-appropriate recommendations.
 */
export type GradeBand = 'K5' | 'G6_8' | 'G9_12';

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
 * Types of regulation activities.
 */
export type RegulationActivityType =
  | 'breathing'
  | 'stretching'
  | 'movement'
  | 'grounding'
  | 'mindful_pause'
  | 'simple_game';

/**
 * Telemetry data sent with each ping.
 */
export interface FocusTelemetry {
  idleMs: number;
  appInBackground: boolean;
  selfReportedMood?: SelfReportedMood;
  rapidExit?: boolean;
}

/**
 * Result from focus ping endpoint.
 */
export interface FocusPingResult {
  received: boolean;
  detection: {
    focusLossDetected: boolean;
    reasons: FocusLossReason[];
    suggestedIntervention: 'none' | 'light_prompt' | 'regulation_break';
    confidence: number;
  };
}

/**
 * A regulation activity recommendation.
 */
export interface RegulationActivity {
  activityType: RegulationActivityType;
  title: string;
  description: string;
  estimatedDurationSeconds: number;
  instructions?: string[];
  source: 'static' | 'ai';
}

/**
 * Context for requesting a recommendation.
 */
export interface RecommendationContext {
  currentActivityId?: string;
  gradeBand: GradeBand;
  mood?: SelfReportedMood;
  focusLossReasons?: FocusLossReason[];
}

/**
 * Response from break complete endpoint.
 */
export interface BreakCompleteResponse {
  success: boolean;
  eventId?: string;
  message: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Send a focus ping to the backend with telemetry data.
 * Called periodically (every 30 seconds) during active learning sessions.
 */
export async function sendFocusPing(
  sessionId: string,
  learnerId: string,
  activityId: string,
  telemetry: FocusTelemetry
): Promise<FocusPingResult> {
  const response = await fetch(`${FOCUS_SVC_BASE}/focus/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      learnerId,
      activityId,
      timestamp: new Date().toISOString(),
      idleMs: telemetry.idleMs,
      appInBackground: telemetry.appInBackground,
      selfReportedMood: telemetry.selfReportedMood,
      rapidExit: telemetry.rapidExit,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Focus ping failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Get a break recommendation based on current context.
 * Called when focus loss is detected or learner requests a break.
 */
export async function getBreakRecommendation(
  sessionId: string,
  learnerId: string,
  context: RecommendationContext
): Promise<RegulationActivity> {
  const response = await fetch(`${FOCUS_SVC_BASE}/focus/recommendation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      learnerId,
      context,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get recommendation: ${errorText}`);
  }

  const result = await response.json();
  return result.recommendation;
}

/**
 * Report that the learner has started a break activity.
 * Called when learner begins a regulation activity.
 */
export async function reportBreakStarted(
  sessionId: string,
  learnerId: string,
  activityType: RegulationActivityType
): Promise<{ success: boolean; eventId?: string }> {
  const response = await fetch(`${FOCUS_SVC_BASE}/focus/break-started`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      learnerId,
      activityType,
      startedAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to report break started: ${errorText}`);
  }

  return response.json();
}

/**
 * Report that the learner has completed a break activity.
 * Called when learner finishes a regulation activity.
 */
export async function reportBreakComplete(
  sessionId: string,
  learnerId: string,
  activityType: RegulationActivityType,
  durationSeconds: number,
  completedFully: boolean,
  helpfulnessRating?: number
): Promise<BreakCompleteResponse> {
  const response = await fetch(`${FOCUS_SVC_BASE}/focus/break-complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      learnerId,
      activityType,
      completedFully,
      actualDurationSeconds: durationSeconds,
      helpfulnessRating,
      completedAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to report break complete: ${errorText}`);
  }

  return response.json();
}

/**
 * Report a mood change from the learner.
 * Called when learner uses the mood selector.
 */
export async function reportMoodChange(
  sessionId: string,
  learnerId: string,
  mood: SelfReportedMood,
  context?: { activityId?: string; triggeredBy?: 'user' | 'prompt' }
): Promise<{ success: boolean }> {
  const response = await fetch(`${FOCUS_SVC_BASE}/focus/mood`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      learnerId,
      mood,
      context,
      reportedAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to report mood change: ${errorText}`);
  }

  return response.json();
}

/**
 * Get available regulation activities for a grade band.
 * Useful for displaying activity options to learners.
 */
export async function getRegulationActivities(
  gradeBand: GradeBand
): Promise<RegulationActivity[]> {
  const response = await fetch(`${FOCUS_SVC_BASE}/focus/activities/${gradeBand}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get activities: ${errorText}`);
  }

  const result = await response.json();
  return result.activities;
}
