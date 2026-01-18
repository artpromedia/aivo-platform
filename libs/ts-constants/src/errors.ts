/**
 * Error Message Constants
 *
 * Shared error messages to avoid string duplication.
 */

// ══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION ERRORS
// ══════════════════════════════════════════════════════════════════════════════

/** Unauthorized access error */
export const ERROR_UNAUTHORIZED = 'Unauthorized';

/** Forbidden access error */
export const ERROR_FORBIDDEN = 'Forbidden';

/** Invalid token error */
export const ERROR_INVALID_TOKEN = 'Invalid token';

/** Token expired error */
export const ERROR_TOKEN_EXPIRED = 'Token expired';

/** Missing authorization header */
export const ERROR_MISSING_AUTH = 'Missing authorization header';

/** Invalid authorization format */
export const ERROR_INVALID_AUTH_FORMAT = 'Invalid authorization format';

// ══════════════════════════════════════════════════════════════════════════════
// RESOURCE ERRORS
// ══════════════════════════════════════════════════════════════════════════════

/** Resource not found error */
export const ERROR_NOT_FOUND = 'Not found';

/** Resource already exists error */
export const ERROR_ALREADY_EXISTS = 'Already exists';

/** Resource conflict error */
export const ERROR_CONFLICT = 'Conflict';

// ══════════════════════════════════════════════════════════════════════════════
// SERVER ERRORS
// ══════════════════════════════════════════════════════════════════════════════

/** Internal server error */
export const ERROR_INTERNAL_SERVER = 'Internal server error';

/** Service unavailable error */
export const ERROR_SERVICE_UNAVAILABLE = 'Service unavailable';

/** Bad request error */
export const ERROR_BAD_REQUEST = 'Bad request';

/** Validation error */
export const ERROR_VALIDATION = 'Validation error';

// ══════════════════════════════════════════════════════════════════════════════
// TENANT ERRORS
// ══════════════════════════════════════════════════════════════════════════════

/** Missing tenant ID error */
export const ERROR_MISSING_TENANT = 'Missing tenant ID';

/** Invalid tenant ID error */
export const ERROR_INVALID_TENANT = 'Invalid tenant ID';

// ══════════════════════════════════════════════════════════════════════════════
// USER ERRORS
// ══════════════════════════════════════════════════════════════════════════════

/** User not found error */
export const ERROR_USER_NOT_FOUND = 'User not found';

/** Missing user ID error */
export const ERROR_MISSING_USER = 'Missing user ID';
