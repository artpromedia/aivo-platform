/**
 * Content Safety Types
 *
 * Type definitions for the AI Content Safety Guardrails system.
 * Used across content-safety.service, safety middleware, admin routes, and event publisher.
 */

// ══════════════════════════════════════════════════════════════════════════════
// SAFETY RESULT
// ══════════════════════════════════════════════════════════════════════════════

export type SafetyFlagLayer = 'pattern' | 'age' | 'ferpa' | 'toxicity';

export type SafetyFlagSeverity = 'low' | 'medium' | 'high' | 'critical';

export type SafetyContext =
  | 'homework'
  | 'tutoring'
  | 'assessment'
  | 'curriculum'
  | 'chat';

export interface SafetyFlag {
  layer: SafetyFlagLayer;
  type: string;
  severity: SafetyFlagSeverity;
  detail: string;
}

export interface SafetyResult {
  /** Whether the content is safe to deliver to the student */
  safe: boolean;
  /** Safety score from 0.0 (unsafe) to 1.0 (safe) */
  score: number;
  /** List of safety flags raised during analysis */
  flags: SafetyFlag[];
  /** Content with PII redacted (always populated if PII found) */
  sanitizedContent?: string;
  /** Human-readable reason if content was blocked */
  blockedReason?: string;
  /** Time taken for safety processing in milliseconds */
  processingMs: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// SAFETY CONFIG
// ══════════════════════════════════════════════════════════════════════════════

export interface SafetyConfig {
  enabled: boolean;
  /** Block content with critical-severity flags (default: true) */
  blockOnCritical: boolean;
  /** Block content with high-severity flags (default: true) */
  blockOnHigh: boolean;
  /** Block content with medium-severity flags (default: false) */
  blockOnMedium: boolean;
  /** Replace PII with [REDACTED] in output (default: true) */
  sanitizePii: boolean;
  /** Minimum safety score to pass (default: 0.6) */
  minimumSafetyScore: number;
  /** Per-tenant grade level cap for age-appropriateness */
  maxGradeLevel?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION PARAMS
// ══════════════════════════════════════════════════════════════════════════════

export interface SafetyValidationParams {
  content: string;
  studentAge?: number;
  tenantId: string;
  userId: string;
  context: SafetyContext;
}

// ══════════════════════════════════════════════════════════════════════════════
// SAFETY VIOLATION EVENT (NATS)
// ══════════════════════════════════════════════════════════════════════════════

export interface SafetyViolationEvent {
  tenantId: string;
  userId: string;
  context: SafetyContext;
  flags: SafetyFlag[];
  score: number;
  timestamp: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface SafetyStatsResponse {
  tenantId: string;
  blocks24h: number;
  blocks7d: number;
  blocks30d: number;
  topFlagTypes: Array<{ type: string; count: number }>;
}

export interface SafetyViolationRecord {
  id: string;
  tenantId: string;
  userId: string;
  context: SafetyContext;
  flags: SafetyFlag[];
  score: number;
  blockedReason: string;
  contentHash: string;
  timestamp: string;
}
