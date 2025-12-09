/**
 * AI Call Logging and Incident Management Types
 *
 * Shared types for the logging and incident system.
 * These align with the PostgreSQL schema in migrations/0003_ai_logging_and_incidents.sql
 */

import type { AgentType, ProviderType } from '../types/agentConfig.js';

// ────────────────────────────────────────────────────────────────────────────
// Safety Labels (more granular than SafetyStatus)
// ────────────────────────────────────────────────────────────────────────────

export const SAFETY_LABELS = ['SAFE', 'LOW', 'MEDIUM', 'HIGH'] as const;
export type SafetyLabel = (typeof SAFETY_LABELS)[number];

// ────────────────────────────────────────────────────────────────────────────
// Incident Enums
// ────────────────────────────────────────────────────────────────────────────

export const INCIDENT_SEVERITIES = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_CATEGORIES = [
  'SAFETY',
  'PRIVACY',
  'COMPLIANCE',
  'PERFORMANCE',
  'COST',
] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const INCIDENT_STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const LINK_REASONS = ['TRIGGER', 'RELATED', 'CONTEXT'] as const;
export type LinkReason = (typeof LINK_REASONS)[number];

// ────────────────────────────────────────────────────────────────────────────
// AI Call Log Types
// ────────────────────────────────────────────────────────────────────────────

/**
 * Input for logging an AI call.
 * All fields except tenantId and agentType are optional for flexibility.
 */
export interface LogAiCallInput {
  // Required context
  tenantId: string;
  agentType: AgentType;

  // Optional context (nullable in DB)
  userId?: string;
  learnerId?: string;
  sessionId?: string;

  // Call metadata
  useCase?: string;
  modelName: string;
  provider: ProviderType;
  version: string;
  requestId: string;

  // Timing
  startedAt: Date;
  completedAt: Date;
  latencyMs: number;

  // Token usage
  inputTokens: number;
  outputTokens: number;

  // Summaries (must be redacted - NO PII)
  promptSummary?: string;
  responseSummary?: string;

  // Safety classification
  safetyLabel: SafetyLabel;
  safetyMetadata?: Record<string, unknown>;

  // Cost
  costCentsEstimate: number;

  // Status (for error tracking)
  status: 'SUCCESS' | 'ERROR';
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Stored AI call log record (matches DB schema).
 */
export interface AiCallLog extends LogAiCallInput {
  id: string;
  createdAt: Date;
}

// ────────────────────────────────────────────────────────────────────────────
// Incident Types
// ────────────────────────────────────────────────────────────────────────────

/**
 * Input for creating a new incident.
 */
export interface CreateIncidentInput {
  tenantId: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  title: string;
  description?: string;
  metadataJson?: Record<string, unknown>;
  createdBySystem?: boolean;
  createdByUserId?: string;
}

/**
 * Stored incident record (matches DB schema).
 */
export interface AiIncident {
  id: string;
  tenantId: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  status: IncidentStatus;
  title: string;
  description: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  occurrenceCount: number;
  createdBySystem: boolean;
  createdByUserId: string | null;
  assignedToUserId: string | null;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  resolutionNotes: string | null;
  metadataJson: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for linking an AI call to an incident.
 */
export interface LinkCallToIncidentInput {
  incidentId: string;
  aiCallLogId: string;
  linkReason: LinkReason;
}

// ────────────────────────────────────────────────────────────────────────────
// Incident Rule Types
// ────────────────────────────────────────────────────────────────────────────

/**
 * Describes a rule that was triggered for incident creation.
 */
export interface TriggeredRule {
  ruleName: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
}

/**
 * Result of evaluating incident rules against a call log.
 */
export interface RuleEvaluationResult {
  shouldCreateIncident: boolean;
  triggeredRules: TriggeredRule[];
}
