/**
 * HTTP Constants
 *
 * Shared HTTP-related constants to avoid string duplication.
 */

// ══════════════════════════════════════════════════════════════════════════════
// HTTP HEADERS
// ══════════════════════════════════════════════════════════════════════════════

/** Standard Content-Type header for JSON responses */
export const CONTENT_TYPE_JSON = 'application/json';

/** Authorization header name */
export const HEADER_AUTHORIZATION = 'Authorization';

/** Tenant ID header name */
export const HEADER_TENANT_ID = 'x-tenant-id';

/** User ID header name */
export const HEADER_USER_ID = 'x-user-id';

/** Correlation ID header name */
export const HEADER_CORRELATION_ID = 'x-correlation-id';

/** Request ID header name */
export const HEADER_REQUEST_ID = 'x-request-id';

// ══════════════════════════════════════════════════════════════════════════════
// HTTP HEADER VALUES
// ══════════════════════════════════════════════════════════════════════════════

/** Bearer token prefix */
export const BEARER_PREFIX = 'Bearer ';

// ══════════════════════════════════════════════════════════════════════════════
// COMMON JSON HEADERS OBJECT
// ══════════════════════════════════════════════════════════════════════════════

/** Standard headers for JSON requests */
export const JSON_HEADERS = {
  'Content-Type': CONTENT_TYPE_JSON,
} as const;
