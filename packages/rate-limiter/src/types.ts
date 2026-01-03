/**
 * Rate Limiter Types
 */

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** The maximum number of requests allowed in the window */
  limit: number;
  /** The number of requests remaining in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the limit resets */
  reset: number;
  /** Seconds until retry is allowed (only when blocked) */
  retryAfter?: number;
  /** Standard rate limit headers */
  headers: RateLimitHeaders;
  /** The rule that was applied */
  ruleId?: string;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Policy'?: string;
  'Retry-After'?: string;
}

export interface RateLimitRule {
  /** Unique identifier for the rule */
  id: string;
  /** Human-readable name */
  name?: string;
  /** Description of the rule */
  description?: string;

  /** What to limit (scope) */
  scope?: RateLimitScope;

  /** Maximum requests allowed in the window */
  limit?: number;
  /** Window duration in seconds */
  window?: number;

  /** Limits configuration object (alternative to limit/window) */
  limits?: {
    limit: number;
    windowSeconds: number;
    burstLimit?: number;
  };

  /** Algorithm to use */
  algorithm?: RateLimitAlgorithm;

  /** Optional burst allowance (for token bucket) */
  burst?: number;

  /** Optional refill/leak rate (for token bucket, leaky bucket) */
  refillRate?: number;

  /** Match conditions - when this rule applies */
  match?: RateLimitMatch;

  /** Priority (higher = checked first) */
  priority?: number;

  /** Action when limit is exceeded */
  action?: RateLimitAction;

  /** Whether to skip this rule */
  skip?: (context: RateLimitContext) => boolean | Promise<boolean>;

  /** Cost per request (default: 1) */
  cost?: number | ((context: RateLimitContext) => number | Promise<number>);

  /** Whether this rule is enabled */
  enabled?: boolean;
}

export type RateLimitAlgorithm =
  | 'token_bucket'
  | 'sliding_window'
  | 'fixed_window'
  | 'leaky_bucket'
  | 'token-bucket'
  | 'sliding-window'
  | 'fixed-window'
  | 'leaky-bucket';

export interface RateLimitScopeObject {
  /** The type of scope */
  type: RateLimitScopeType;
  /** Custom key generator (for 'custom' type) */
  key?: string | ((context: RateLimitContext) => string | Promise<string>);
}

export type RateLimitScope = RateLimitScopeObject | RateLimitScopeType[];

export type RateLimitScopeType =
  | 'global'
  | 'ip'
  | 'user'
  | 'api_key'
  | 'tenant'
  | 'endpoint'
  | 'custom';

export interface RateLimitMatch {
  /** URL path pattern (glob supported) */
  path?: string;
  /** URL path patterns (glob supported) */
  paths?: string[];
  /** HTTP method */
  method?: string;
  /** HTTP methods */
  methods?: string[];
  /** Header conditions */
  headers?: Record<string, string | RegExp>;
  /** User roles that match */
  userRoles?: string[];
  /** Subscription tiers that match */
  tiers?: string[];
  /** Custom matcher function */
  custom?: (context: RateLimitContext) => boolean | Promise<boolean>;
}

export interface RateLimitAction {
  /** What to do when limit is exceeded */
  type: 'reject' | 'throttle' | 'queue' | 'degrade';
  /** HTTP status code for rejection */
  statusCode?: number;
  /** Custom error message */
  message?: string;
  /** Queue timeout in ms (for 'queue' action) */
  queueTimeout?: number;
  /** Degradation level (for 'degrade' action) */
  degradeLevel?: number;
}

export interface RateLimitContext {
  /** Client IP address */
  ip: string;
  /** Authenticated user ID */
  userId?: string;
  /** API key used */
  apiKey?: string;
  /** Tenant/organization ID */
  tenantId?: string;
  /** User's role */
  userRole?: string;
  /** Subscription tier */
  tier?: string;
  /** Request path */
  path: string;
  /** HTTP method */
  method: string;
  /** Request headers */
  headers: Record<string, string | string[] | undefined>;
  /** Request timestamp */
  timestamp: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface RateLimitTier {
  /** Tier identifier */
  id: string;
  /** Display name */
  name: string;
  /** Rate limits for this tier */
  limits: TierLimits;
  /** Long-term quotas */
  quotas?: TierQuotas;
  /** Features available in this tier */
  features?: string[];
  /** Priority for request handling */
  priority?: number;
}

export interface TierLimits {
  /** Requests per second */
  requestsPerSecond?: number;
  /** Requests per minute */
  requestsPerMinute: number;
  /** Requests per hour */
  requestsPerHour: number;
  /** Requests per day */
  requestsPerDay: number;
  /** Burst limit (max concurrent) */
  burstLimit: number;
  /** Maximum concurrent requests */
  concurrentRequests?: number;
}

export interface TierQuotas {
  /** Daily request quota */
  dailyRequests?: number;
  /** Monthly request quota */
  monthlyRequests?: number;
  /** Maximum concurrent requests */
  concurrentRequests?: number;
  /** Daily quota with reset info */
  daily?: { limit: number; resetAt: string };
  /** Monthly quota with reset info */
  monthly?: { limit: number; resetAt: string };
}

export interface QuotaUsage {
  /** Amount used */
  used: number;
  /** Total limit */
  limit: number;
  /** Amount remaining */
  remaining: number;
  /** When the quota resets */
  resetAt: Date;
  /** Usage percentage (0-100) */
  percentage: number;
}

export interface CircuitState {
  /** Current state of the circuit */
  state: 'closed' | 'open' | 'half_open';
  /** Number of failures in current window */
  failures: number;
  /** Number of successes in half-open state */
  successes: number;
  /** Last failure timestamp */
  lastFailure?: Date;
  /** When to attempt next request (if open) */
  nextRetry?: Date;
}

export interface AlgorithmCheckResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests */
  remaining: number;
  /** Reset timestamp (ms) */
  reset: number;
  /** Current count/tokens */
  current?: number;
}

export interface AlgorithmOptions {
  /** Burst limit (token bucket) */
  burst?: number;
  /** Refill rate (token bucket, leaky bucket) */
  refillRate?: number;
  /** Leak rate (leaky bucket) */
  leakRate?: number;
}
