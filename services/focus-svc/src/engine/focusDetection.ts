/**
 * Focus Loss Detection Rule Engine
 *
 * Analyzes recent focus ping telemetry to detect disengagement patterns.
 * Uses simple, configurable rules without complex ML.
 *
 * Detection triggers:
 * 1. Extended idle time (no interaction)
 * 2. Rapid activity switching (struggling/unfocused)
 * 3. Self-reported negative mood (frustrated, tired)
 * 4. App backgrounding patterns
 * 5. Rapid exit attempts
 */

import { config } from '../config.js';
import type { FocusPing, FocusLossDetection, FocusLossReason } from '../types/telemetry.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export interface DetectionConfig {
  /** Idle time threshold in ms to consider as disengagement */
  idleThresholdMs: number;

  /** Number of activity switches in window to trigger rapid switching */
  rapidSwitchThreshold: number;

  /** Time window in ms for counting rapid switches */
  rapidSwitchWindowMs: number;

  /** Number of consecutive high-idle pings to trigger */
  consecutiveIdlePingsThreshold: number;

  /** Minimum pings needed for analysis */
  minPingsForAnalysis: number;
}

const DEFAULT_CONFIG: DetectionConfig = {
  idleThresholdMs: config.idleThresholdMs,
  rapidSwitchThreshold: config.rapidSwitchThreshold,
  rapidSwitchWindowMs: config.rapidSwitchWindowMs,
  consecutiveIdlePingsThreshold: 2,
  minPingsForAnalysis: 3,
};

// ══════════════════════════════════════════════════════════════════════════════
// RULE ENGINE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze focus ping history and detect focus loss patterns.
 *
 * @param pings - Recent focus pings, sorted by timestamp (newest first)
 * @param configOverrides - Optional config overrides for testing
 * @returns Detection result with reasons and confidence
 */
export function detectFocusLoss(
  pings: FocusPing[],
  configOverrides?: Partial<DetectionConfig>
): FocusLossDetection {
  const cfg = { ...DEFAULT_CONFIG, ...configOverrides };

  // Need minimum pings for meaningful analysis
  if (pings.length < cfg.minPingsForAnalysis) {
    return {
      detected: false,
      reasons: [],
      confidence: 0,
      suggestedIntervention: 'none',
    };
  }

  const reasons: FocusLossReason[] = [];
  let confidence = 0;

  // Sort by timestamp descending (newest first)
  const sortedPings = [...pings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Rule 1: Extended idle time
  const idleResult = checkExtendedIdle(sortedPings, cfg);
  if (idleResult.triggered) {
    reasons.push('extended_idle');
    confidence += idleResult.confidence;
  }

  // Rule 2: Rapid activity switching
  const switchResult = checkRapidSwitching(sortedPings, cfg);
  if (switchResult.triggered) {
    reasons.push('rapid_switching');
    confidence += switchResult.confidence;
  }

  // Rule 3: Self-reported mood
  const moodResult = checkSelfReportedMood(sortedPings);
  if (moodResult.triggered) {
    reasons.push(...moodResult.reasons);
    confidence += moodResult.confidence;
  }

  // Rule 4: App backgrounding
  const backgroundResult = checkAppBackgrounding(sortedPings);
  if (backgroundResult.triggered) {
    reasons.push('app_backgrounded');
    confidence += backgroundResult.confidence;
  }

  // Rule 5: Rapid exit attempts
  const exitResult = checkRapidExit(sortedPings);
  if (exitResult.triggered) {
    reasons.push('rapid_exit');
    confidence += exitResult.confidence;
  }

  // Normalize confidence to 0-1
  confidence = Math.min(confidence, 1);

  // Determine if we should trigger detection
  const detected = reasons.length > 0 && confidence >= 0.3;

  // Determine intervention level
  let suggestedIntervention: 'none' | 'light_prompt' | 'regulation_break' = 'none';
  if (detected) {
    if (confidence >= 0.7 || reasons.length >= 2) {
      suggestedIntervention = 'regulation_break';
    } else {
      suggestedIntervention = 'light_prompt';
    }
  }

  return {
    detected,
    reasons,
    confidence,
    suggestedIntervention,
    detectedAt: detected ? new Date().toISOString() : undefined,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// INDIVIDUAL RULE CHECKS
// ══════════════════════════════════════════════════════════════════════════════

interface RuleResult {
  triggered: boolean;
  confidence: number;
  reasons?: FocusLossReason[];
}

/**
 * Check for extended idle time patterns.
 * Triggers if multiple consecutive pings show high idle time.
 */
function checkExtendedIdle(pings: FocusPing[], cfg: DetectionConfig): RuleResult {
  let consecutiveHighIdle = 0;
  let totalHighIdle = 0;

  for (const ping of pings) {
    if (ping.idleMs >= cfg.idleThresholdMs) {
      consecutiveHighIdle++;
      totalHighIdle++;
    } else {
      consecutiveHighIdle = 0;
    }

    // If we've seen enough consecutive high-idle pings, trigger
    if (consecutiveHighIdle >= cfg.consecutiveIdlePingsThreshold) {
      const confidence = Math.min(
        0.4 + (consecutiveHighIdle - cfg.consecutiveIdlePingsThreshold) * 0.1,
        0.6
      );
      return { triggered: true, confidence };
    }
  }

  // Also trigger if majority of recent pings are high-idle
  const highIdleRatio = totalHighIdle / pings.length;
  if (highIdleRatio >= 0.6) {
    return { triggered: true, confidence: 0.4 * highIdleRatio };
  }

  return { triggered: false, confidence: 0 };
}

/**
 * Check for rapid activity switching.
 * Triggers if learner switches between activities too frequently.
 */
function checkRapidSwitching(pings: FocusPing[], cfg: DetectionConfig): RuleResult {
  const now = new Date().getTime();
  const windowStart = now - cfg.rapidSwitchWindowMs;

  // Get pings within the window
  const recentPings = pings.filter((p) => new Date(p.timestamp).getTime() >= windowStart);

  if (recentPings.length < 2) {
    return { triggered: false, confidence: 0 };
  }

  // Count unique activities
  const uniqueActivities = new Set(recentPings.map((p) => p.activityId));
  const switchCount = uniqueActivities.size - 1;

  if (switchCount >= cfg.rapidSwitchThreshold) {
    const confidence = Math.min(0.3 + (switchCount - cfg.rapidSwitchThreshold) * 0.15, 0.6);
    return { triggered: true, confidence };
  }

  return { triggered: false, confidence: 0 };
}

/**
 * Check for self-reported negative mood.
 * Triggers on frustrated or tired moods.
 */
function checkSelfReportedMood(pings: FocusPing[]): RuleResult & { reasons: FocusLossReason[] } {
  const reasons: FocusLossReason[] = [];
  let confidence = 0;

  // Check most recent pings for mood reports
  const recentPings = pings.slice(0, 5);

  for (const ping of recentPings) {
    if (ping.selfReportedMood === 'frustrated') {
      reasons.push('self_reported_frustrated');
      confidence = Math.max(confidence, 0.5);
    }
    if (ping.selfReportedMood === 'tired') {
      reasons.push('self_reported_tired');
      confidence = Math.max(confidence, 0.4);
    }
  }

  // Deduplicate reasons
  const uniqueReasons = [...new Set(reasons)];

  return {
    triggered: uniqueReasons.length > 0,
    confidence,
    reasons: uniqueReasons,
  };
}

/**
 * Check for app backgrounding patterns.
 * Triggers if app is repeatedly backgrounded.
 */
function checkAppBackgrounding(pings: FocusPing[]): RuleResult {
  const recentPings = pings.slice(0, 10);
  const backgroundedCount = recentPings.filter((p) => p.appInBackground).length;
  const ratio = backgroundedCount / recentPings.length;

  // Trigger if more than 50% of recent pings are backgrounded
  if (ratio >= 0.5) {
    // Scale confidence: 50% ratio = 0.3, 100% ratio = 0.5
    const confidence = 0.3 + (ratio - 0.5) * 0.4;
    return { triggered: true, confidence };
  }

  return { triggered: false, confidence: 0 };
}

/**
 * Check for rapid exit attempts.
 * Triggers if learner is trying to exit frequently.
 */
function checkRapidExit(pings: FocusPing[]): RuleResult {
  const recentPings = pings.slice(0, 5);
  const exitCount = recentPings.filter((p) => p.rapidExit).length;

  if (exitCount >= 2) {
    return { triggered: true, confidence: 0.3 + exitCount * 0.1 };
  }

  return { triggered: false, confidence: 0 };
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Convert focus ping metadata from session events to FocusPing objects.
 */
export function parseFocusPingsFromEvents(
  events: { metadata?: Record<string, unknown>; occurredAt: string }[]
): FocusPing[] {
  return events
    .filter((e) => e.metadata?.type === 'FOCUS_PING')
    .map((e) => ({
      sessionId: e.metadata?.sessionId as string,
      learnerId: e.metadata?.learnerId as string,
      timestamp: (e.metadata?.clientTimestamp as string) || e.occurredAt,
      activityId: e.metadata?.activityId as string,
      idleMs: e.metadata?.idleMs as number,
      appInBackground: e.metadata?.appInBackground as boolean,
      selfReportedMood: e.metadata?.selfReportedMood as FocusPing['selfReportedMood'],
      rapidExit: e.metadata?.rapidExit as boolean,
    }));
}
