/**
 * Server-side Authentication Utilities — web-learner
 *
 * Delegates to @aivo/auth-web for proper JWT verification.
 * Learner-specific: supports PIN-based login where some fields may be null.
 */

import { getServerSession, requireSession, type AuthSession } from '@aivo/auth-web';

export type { AuthSession };

/**
 * Get the current authentication session.
 * Returns null if not authenticated or token is invalid.
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  return getServerSession();
}

/**
 * Require authentication — redirects to /login if not authenticated.
 */
export async function requireAuth(): Promise<AuthSession> {
  return requireSession();
}
