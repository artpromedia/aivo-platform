/**
 * Environment URL Utilities
 *
 * Production-safe helpers for handling service URLs.
 * Ensures localhost fallbacks are NEVER used in production.
 */

/**
 * Gets an environment URL with production safety checks.
 *
 * In production:
 * - Throws an error if the environment variable is not set
 *
 * In development/test:
 * - Falls back to the provided localhost URL for convenience
 *
 * @param envVar The environment variable name
 * @param devFallback The localhost URL to use in development
 * @param serviceName Service name for error messages
 */
export function getServiceUrl(
  envVar: string,
  devFallback: string,
  serviceName: string
): string {
  const value = process.env[envVar];

  if (value) {
    return value;
  }

  // In production, require the env var to be set
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[${serviceName}] Missing required environment variable: ${envVar}. ` +
      'Configure this in your production environment.'
    );
  }

  // In development/test, use the fallback
  return devFallback;
}
