/**
 * Vitest Setup File
 *
 * This file runs before any test files are loaded, allowing us to set up
 * environment variables before modules are imported.
 */

// Set up environment variables needed for SSO state encryption
// This MUST happen before any module imports the state.ts file
process.env.NODE_ENV = 'development';
process.env.SSO_DEV_INSECURE_MODE = 'true';
process.env.SSO_STATE_ENCRYPTION_KEY = 'test-encryption-key-must-be-at-least-32-characters-long';

// Auth service test configuration
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-must-be-long-enough';
process.env.REDIS_URL = 'redis://localhost:6379';
