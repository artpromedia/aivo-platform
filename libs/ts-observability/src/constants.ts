/**
 * Standard attribute names for Aivo observability
 *
 * These constants ensure consistent naming across all services
 * for traces, metrics, and logs.
 */

// ══════════════════════════════════════════════════════════════════════════════
// SPAN ATTRIBUTE NAMES
// ══════════════════════════════════════════════════════════════════════════════

export const AIVO_ATTRIBUTES = {
  // Core identifiers (used in traces, logs, and metrics)
  SERVICE_NAME: 'service.name',
  TENANT_ID: 'aivo.tenant_id',
  USER_ID: 'aivo.user_id',
  LEARNER_ID: 'aivo.learner_id',
  REQUEST_ID: 'aivo.request_id',
  CORRELATION_ID: 'aivo.correlation_id',

  // HTTP attributes (OpenTelemetry semantic conventions)
  HTTP_METHOD: 'http.method',
  HTTP_ROUTE: 'http.route',
  HTTP_STATUS_CODE: 'http.status_code',
  HTTP_URL: 'http.url',
  HTTP_TARGET: 'http.target',
  HTTP_HOST: 'http.host',
  HTTP_USER_AGENT: 'http.user_agent',

  // AI-specific attributes
  AI_AGENT_TYPE: 'aivo.ai.agent_type',
  AI_PROVIDER: 'aivo.ai.provider',
  AI_MODEL: 'aivo.ai.model',
  AI_TOKENS_INPUT: 'aivo.ai.tokens_input',
  AI_TOKENS_OUTPUT: 'aivo.ai.tokens_output',
  AI_TOKENS_TOTAL: 'aivo.ai.tokens_total',
  AI_COST_USD: 'aivo.ai.cost_usd',
  AI_FAILOVER_FROM: 'aivo.ai.failover_from',
  AI_FAILOVER_TO: 'aivo.ai.failover_to',
  AI_SAFETY_STATUS: 'aivo.ai.safety_status',
  AI_SAFETY_REASON: 'aivo.ai.safety_reason',

  // Session attributes
  SESSION_ID: 'aivo.session.id',
  SESSION_TYPE: 'aivo.session.type',
  SESSION_SUBJECT: 'aivo.session.subject',
  SESSION_GRADE: 'aivo.session.grade',

  // Focus attributes
  FOCUS_INTERVENTION_TYPE: 'aivo.focus.intervention_type',
  FOCUS_SCORE_BEFORE: 'aivo.focus.score_before',
  FOCUS_SCORE_AFTER: 'aivo.focus.score_after',

  // Recommendation attributes
  RECOMMENDATION_ID: 'aivo.recommendation.id',
  RECOMMENDATION_TYPE: 'aivo.recommendation.type',
  RECOMMENDATION_STATUS: 'aivo.recommendation.status',

  // Error attributes
  ERROR_TYPE: 'error.type',
  ERROR_MESSAGE: 'error.message',
  EXCEPTION_STACKTRACE: 'exception.stacktrace',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// METRIC NAMES
// ══════════════════════════════════════════════════════════════════════════════

export const METRIC_NAMES = {
  // HTTP Metrics (Golden Signals)
  HTTP_REQUEST_DURATION: 'aivo_http_request_duration_seconds',
  HTTP_REQUESTS_TOTAL: 'aivo_http_requests_total',
  HTTP_REQUEST_SIZE: 'aivo_http_request_size_bytes',
  HTTP_RESPONSE_SIZE: 'aivo_http_response_size_bytes',
  HTTP_ACTIVE_REQUESTS: 'aivo_http_active_requests',

  // AI Metrics
  AI_REQUEST_DURATION: 'aivo_ai_request_duration_seconds',
  AI_REQUESTS_TOTAL: 'aivo_ai_requests_total',
  AI_TOKENS_TOTAL: 'aivo_ai_tokens_total',
  AI_COST_USD_TOTAL: 'aivo_ai_cost_usd_total',
  AI_FAILOVER_TOTAL: 'aivo_ai_failover_total',
  AI_SAFETY_BLOCKS_TOTAL: 'aivo_ai_safety_blocks_total',
  AI_ERRORS_TOTAL: 'aivo_ai_errors_total',

  // Session Metrics
  SESSIONS_STARTED_TOTAL: 'aivo_sessions_started_total',
  SESSIONS_COMPLETED_TOTAL: 'aivo_sessions_completed_total',
  SESSIONS_ABANDONED_TOTAL: 'aivo_sessions_abandoned_total',
  SESSION_DURATION_SECONDS: 'aivo_session_duration_seconds',
  SESSIONS_ACTIVE: 'aivo_sessions_active',

  // Focus Metrics
  FOCUS_INTERVENTIONS_TOTAL: 'aivo_focus_interventions_total',
  FOCUS_SCORE: 'aivo_focus_score',
  FOCUS_INTERVENTION_EFFECTIVENESS: 'aivo_focus_intervention_effectiveness',

  // Recommendation Metrics
  RECOMMENDATIONS_CREATED_TOTAL: 'aivo_recommendations_created_total',
  RECOMMENDATIONS_ACCEPTED_TOTAL: 'aivo_recommendations_accepted_total',
  RECOMMENDATIONS_DECLINED_TOTAL: 'aivo_recommendations_declined_total',
  RECOMMENDATIONS_EXPIRED_TOTAL: 'aivo_recommendations_expired_total',

  // Auth Metrics
  AUTH_REQUESTS_TOTAL: 'aivo_auth_requests_total',
  AUTH_FAILURES_TOTAL: 'aivo_auth_failures_total',
  AUTH_TOKEN_REFRESHES_TOTAL: 'aivo_auth_token_refreshes_total',

  // Event Pipeline Metrics
  EVENTS_PUBLISHED_TOTAL: 'aivo_events_published_total',
  EVENTS_PROCESSED_TOTAL: 'aivo_events_processed_total',
  EVENTS_FAILED_TOTAL: 'aivo_events_failed_total',
  EVENTS_DLQ_DEPTH: 'aivo_events_dlq_depth',
  EVENT_PROCESSING_DURATION: 'aivo_event_processing_duration_seconds',

  // Database Metrics
  DB_QUERY_DURATION: 'aivo_db_query_duration_seconds',
  DB_CONNECTIONS_ACTIVE: 'aivo_db_connections_active',
  DB_CONNECTIONS_IDLE: 'aivo_db_connections_idle',
  DB_CONNECTIONS_WAITING: 'aivo_db_connections_waiting',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// METRIC LABEL NAMES
// ══════════════════════════════════════════════════════════════════════════════

export const METRIC_LABELS = {
  // Common labels
  SERVICE: 'service',
  ENVIRONMENT: 'environment',
  TENANT_ID: 'tenant_id',

  // HTTP labels
  METHOD: 'method',
  ROUTE: 'route',
  STATUS_CODE: 'status_code',
  STATUS_CLASS: 'status_class', // 2xx, 4xx, 5xx

  // AI labels
  AGENT_TYPE: 'agent_type',
  PROVIDER: 'provider',
  MODEL: 'model',
  TOKEN_TYPE: 'token_type', // input, output
  SAFETY_STATUS: 'safety_status',
  SAFETY_REASON: 'safety_reason',
  FAILOVER_FROM: 'failover_from',
  FAILOVER_TO: 'failover_to',

  // Session labels
  SESSION_TYPE: 'session_type',
  SUBJECT: 'subject',
  GRADE: 'grade',
  COMPLETION_STATUS: 'completion_status',

  // Focus labels
  INTERVENTION_TYPE: 'intervention_type',
  EFFECTIVENESS: 'effectiveness', // improved, unchanged, declined

  // Recommendation labels
  RECOMMENDATION_TYPE: 'recommendation_type',

  // Auth labels
  AUTH_METHOD: 'auth_method', // jwt, saml, oauth
  FAILURE_REASON: 'failure_reason',

  // Event labels
  EVENT_TYPE: 'event_type',
  EVENT_SOURCE: 'event_source',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// HISTOGRAM BUCKETS
// ══════════════════════════════════════════════════════════════════════════════

export const HISTOGRAM_BUCKETS = {
  // HTTP request latency (in seconds)
  HTTP_DURATION: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],

  // AI request latency (in seconds) - longer tail for LLM calls
  AI_DURATION: [0.1, 0.25, 0.5, 1, 2, 4, 8, 15, 30, 60],

  // Session duration (in seconds) - minutes to hours
  SESSION_DURATION: [60, 300, 600, 900, 1800, 3600, 7200, 14400],

  // Event processing duration (in seconds)
  EVENT_DURATION: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 5],

  // Database query duration (in seconds)
  DB_DURATION: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],

  // Request/response size (in bytes)
  SIZE_BYTES: [100, 1000, 10000, 100000, 1000000, 10000000],
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE NAMES
// ══════════════════════════════════════════════════════════════════════════════

export const SERVICE_NAMES = {
  AI_ORCHESTRATOR: 'ai-orchestrator',
  AUTH_SVC: 'auth-svc',
  SESSION_SVC: 'session-svc',
  FOCUS_SVC: 'focus-svc',
  LEARNER_SVC: 'learner-svc',
  GOAL_SVC: 'goal-svc',
  BILLING_SVC: 'billing-svc',
  PAYMENTS_SVC: 'payments-svc',
  NOTIFY_SVC: 'notify-svc',
  MESSAGING_SVC: 'messaging-svc',
  CONTENT_SVC: 'content-svc',
  ANALYTICS_SVC: 'analytics-svc',
  REPORTS_SVC: 'reports-svc',
  BASELINE_SVC: 'baseline-svc',
  ASSESSMENT_SVC: 'assessment-svc',
  PERSONALIZATION_SVC: 'personalization-svc',
  KONG_GATEWAY: 'kong-gateway',
  APOLLO_ROUTER: 'apollo-router',
} as const;
