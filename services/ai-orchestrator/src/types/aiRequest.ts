/**
 * Enterprise AI Request/Response Types
 *
 * Central type definitions for the AI orchestration pipeline.
 * All AI calls must go through this typed interface for:
 * - Safety filtering
 * - Usage tracking
 * - Incident logging
 * - Provider failover
 */

// ────────────────────────────────────────────────────────────────────────────
// AGENT TYPES
// ────────────────────────────────────────────────────────────────────────────

export const AI_AGENT_TYPES = [
  'BASELINE',
  'TUTOR',
  'HOMEWORK_HELPER',
  'FOCUS',
  'INSIGHTS',
  'VIRTUAL_BRAIN',
  'LESSON_PLANNER',
  'PROGRESS',
  'SAFETY',
  'OTHER',
] as const;

export type AiAgentType = (typeof AI_AGENT_TYPES)[number];

// ────────────────────────────────────────────────────────────────────────────
// PROVIDER TYPES
// ────────────────────────────────────────────────────────────────────────────

export const AI_PROVIDERS = ['OPENAI', 'ANTHROPIC', 'GEMINI', 'MOCK'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

// ────────────────────────────────────────────────────────────────────────────
// SAFETY ACTIONS
// ────────────────────────────────────────────────────────────────────────────

export const SAFETY_ACTIONS = [
  // Pre-filter actions
  'REDACTED_PII',
  'BLOCKED_SELF_HARM',
  'BLOCKED_EXPLICIT_CONTENT',
  'BLOCKED_ABUSE',
  'BLOCKED_VIOLENCE',
  'BLOCKED_MEDICAL_DIAGNOSIS',
  'BLOCKED_DISALLOWED_CONTENT',

  // Post-filter actions
  'BLOCKED_HOMEWORK_ANSWER',
  'BLOCKED_DIAGNOSIS_ATTEMPT',
  'MODIFIED_UNSAFE_RESPONSE',
  'ESCALATED_TO_ADULT',
] as const;

export type SafetyAction = (typeof SAFETY_ACTIONS)[number];

// ────────────────────────────────────────────────────────────────────────────
// INCIDENT CATEGORIES (Extended)
// ────────────────────────────────────────────────────────────────────────────

export const INCIDENT_CATEGORIES = [
  'SELF_HARM',
  'DIAGNOSIS_ATTEMPT',
  'EXPLICIT_CONTENT',
  'HOMEWORK_ANSWER_BLOCKED',
  'PII_DETECTED',
  'ABUSE_DETECTED',
  'VIOLENCE_DETECTED',
  'AI_FAILURE',
  'COST_ANOMALY',
  'LATENCY_ANOMALY',
  'OTHER',
] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

// ────────────────────────────────────────────────────────────────────────────
// AI REQUEST
// ────────────────────────────────────────────────────────────────────────────

/**
 * Standard AI request that all agents use.
 * Every AI call must be wrapped in this structure.
 */
export interface AiRequest {
  /** Tenant identifier - mandatory for multi-tenancy */
  tenantId: string;

  /** User who triggered the request (parent, teacher, etc.) */
  userId?: string;

  /** Learner context if applicable */
  learnerId?: string;

  /** Agent type being invoked */
  agentType: AiAgentType;

  /** Locale for age-appropriate responses */
  locale: string;

  /** The user's input text */
  input: string;

  /** Session ID for context tracking */
  sessionId?: string;

  /** Request correlation ID for tracing */
  correlationId?: string;

  /** Additional metadata (subject, gradeBand, difficulty, etc.) */
  meta?: AiRequestMeta;
}

/**
 * Metadata for enriching AI requests with educational context.
 */
export interface AiRequestMeta {
  /** Academic subject (MATH, ELA, SCIENCE, etc.) */
  subject?: string;

  /** Grade band for age-appropriate responses (K5, G6_8, G9_12) */
  gradeBand?: 'K5' | 'G6_8' | 'G9_12';

  /** Difficulty level (1-5) */
  difficultyLevel?: number;

  /** Use case identifier for fine-grained tracking */
  useCase?: string;

  /** Whether the input came from OCR/image */
  isFromOCR?: boolean;

  /** Previous conversation context */
  conversationHistory?: ConversationTurn[];

  /** Additional custom metadata */
  [key: string]: unknown;
}

/**
 * A single turn in a conversation for context.
 */
export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// ────────────────────────────────────────────────────────────────────────────
// AI RESPONSE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Standard AI response from the orchestration pipeline.
 */
export interface AiResponse {
  /** The processed output (may be transformed by safety filters) */
  output: string;

  /** The original input after pre-filter redaction (if applicable) */
  redactedInput?: string;

  /** Which provider handled the request */
  provider: AiProvider;

  /** Which model was used */
  model: string;

  /** Input tokens consumed */
  tokensInput: number;

  /** Output tokens generated */
  tokensOutput: number;

  /** Total estimated cost in cents (USD) */
  costCents: number;

  /** Safety actions that were applied */
  safetyActions: SafetyAction[];

  /** Whether the response was blocked entirely */
  wasBlocked: boolean;

  /** Whether failover to another provider occurred */
  failoverOccurred: boolean;

  /** Original provider if failover occurred */
  originalProvider?: AiProvider;

  /** Request ID for correlation */
  requestId: string;

  /** Latency in milliseconds */
  latencyMs: number;

  /** Additional metadata from the pipeline */
  metadata?: Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────────────────
// SAFETY FILTER TYPES
// ────────────────────────────────────────────────────────────────────────────

export type PreFilterAction = 'ALLOW' | 'REDACT' | 'BLOCK';

/**
 * Result from the safety pre-filter.
 */
export interface PreFilterResult {
  /** What action to take */
  action: PreFilterAction;

  /** Sanitized/redacted input (if REDACT or ALLOW) */
  sanitizedInput: string;

  /** Detected safety flags */
  flags: SafetyFlag[];

  /** If BLOCK, the safe response to return */
  safeResponse?: string;

  /** Incident to log (if any) */
  incident?: IncidentInput;
}

/**
 * A detected safety flag from analysis.
 */
export interface SafetyFlag {
  category: IncidentCategory;
  severity: IncidentSeverity;
  confidence: number; // 0-1
  matchedPattern?: string;
}

export type PostFilterAction = 'PASS' | 'TRANSFORM' | 'BLOCK';

/**
 * Result from the safety post-filter.
 */
export interface PostFilterResult {
  /** What action was taken */
  action: PostFilterAction;

  /** Final output (may be transformed) */
  finalOutput: string;

  /** Safety actions applied */
  safetyActions: SafetyAction[];

  /** Incidents to log (if any) */
  incidents: IncidentInput[];
}

// ────────────────────────────────────────────────────────────────────────────
// INCIDENT INPUT
// ────────────────────────────────────────────────────────────────────────────

/**
 * Input for creating a safety incident.
 */
export interface IncidentInput {
  tenantId: string;
  learnerId?: string;
  userId?: string;
  agentType: AiAgentType;
  severity: IncidentSeverity;
  category: IncidentCategory;
  /** Short, redacted summary of what triggered the incident */
  inputSummary: string;
  /** Short, redacted summary of the response (if any) */
  outputSummary?: string;
  /** Additional context */
  metadata?: Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────────────────
// USAGE TRACKING
// ────────────────────────────────────────────────────────────────────────────

/**
 * Daily usage record for per-tenant tracking.
 */
export interface UsageRecord {
  tenantId: string;
  date: string; // ISO date (YYYY-MM-DD)
  provider: AiProvider;
  model: string;
  agentType: AiAgentType;
  tokensInput: number;
  tokensOutput: number;
  estimatedCostCents: number;
  callCount: number;
}

// ────────────────────────────────────────────────────────────────────────────
// PROVIDER SELECTION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Provider selection result.
 */
export interface ProviderSelection {
  provider: AiProvider;
  model: string;
  priority: number;
}

/**
 * Tenant-specific AI configuration.
 */
export interface TenantAiConfig {
  /** Allowed providers for this tenant */
  allowedProviders: AiProvider[];

  /** Default provider priority order */
  providerPriority: AiProvider[];

  /** Model overrides per agent type */
  modelOverrides?: Partial<Record<AiAgentType, { provider: AiProvider; model: string }>>;

  /** Daily token limit (0 = unlimited) */
  dailyTokenLimit: number;

  /** Content filter level */
  contentFilterLevel: 'STRICT' | 'STANDARD' | 'RELAXED';

  /** Whether PII redaction is enabled */
  enablePiiRedaction: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// VIRTUAL BRAIN TYPES
// ────────────────────────────────────────────────────────────────────────────

/**
 * Request to update learner's Virtual Brain from events.
 */
export interface BrainUpdateRequest {
  tenantId: string;
  learnerId: string;
  /** Start of event window */
  from: Date;
  /** End of event window */
  to: Date;
}

/**
 * A structured recommendation from the Virtual Brain.
 */
export interface LearnerRecommendation {
  type: 'DIFFICULTY_CHANGE' | 'FOCUS_INTERVENTION' | 'SKILL_REVIEW' | 'MASTERY_ADVANCE';
  subject: string;
  skill?: string;
  /** Current value */
  fromValue: number;
  /** Recommended value */
  toValue: number;
  /** Confidence in the recommendation */
  confidence: number;
  /** Machine-readable reason */
  reason: string;
}

/**
 * Result from updating the Virtual Brain.
 */
export interface BrainUpdateResult {
  learnerId: string;
  updatedSkills: number;
  recommendations: LearnerRecommendation[];
  /** Event count processed */
  eventsProcessed: number;
}
