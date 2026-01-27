import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Gets an environment URL, with production safety checks.
 *
 * In production runtime:
 * - If required=true and env var is not set, throws an error
 * - If required=false and env var is not set, returns empty string (caller should handle)
 *
 * In development/test:
 * - Falls back to the provided localhost URL for convenience
 *
 * During Next.js build (static generation):
 * - Uses fallback to allow build to complete (pages using API should be dynamic anyway)
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

  // During Next.js build phase (static generation), use fallback to allow build to complete
  // Pages that actually need API data should use 'force-dynamic' or client-side fetching
  const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build';
  if (isNextBuild) {
    return devFallback;
  }

  // In production runtime, enforce that required env vars are set
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

/**
 * Generate a unique ID using crypto.randomUUID with fallback
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
