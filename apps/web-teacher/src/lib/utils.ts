import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Gets an environment URL, with production safety checks.
 *
 * In production:
 * - If required=true and env var is not set, throws an error
 * - If required=false and env var is not set, returns empty string (caller should handle)
 *
 * In development/test:
 * - Falls back to the provided localhost URL for convenience
 *
 * @param envVar The environment variable name (e.g., 'NEXT_PUBLIC_API_URL')
 * @param devFallback The localhost URL to use in development
 * @param options Configuration options
 */
export function getEnvUrl(
  envVar: string,
  devFallback: string,
  options: { required?: boolean; serviceName?: string } = {}
): string {
  const { required = true, serviceName = envVar } = options;
  const value = process.env[envVar];

  if (value) {
    return value;
  }

  // In production, enforce that required env vars are set
  if (process.env.NODE_ENV === 'production') {
    if (required) {
      throw new Error(
        `[${serviceName}] Missing required environment variable: ${envVar}. ` +
        'This must be configured for production deployments.'
      );
    }
    // Non-required URL returns empty, caller should handle gracefully
    return '';
  }

  // In development/test, use the fallback
  return devFallback;
}
