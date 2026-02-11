/**
 * Server-side Authentication Utilities — web-teacher
 *
 * Delegates to @aivo/auth-web for JWT verification.
 * Re-exports auth-web's session utilities with teacher-specific helpers.
 */

import {
  getServerSession,
  requireSession,
  setAuthCookies as _setAuthCookies,
  clearAuthCookies as _clearAuthCookies,
  type AuthSession,
} from '@aivo/auth-web';
import type { NextResponse } from 'next/server';

export type { AuthSession };

const authSvcUrl = process.env.AUTH_SVC_URL ?? 'http://localhost:4001';

export function getAuthServiceUrl() {
  return authSvcUrl;
}

/**
 * Get the current authentication session from cookies.
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

type CookieResponse = Pick<NextResponse, 'cookies'>;

export function setAuthCookies(res: CookieResponse, accessToken: string, refreshToken: string) {
  _setAuthCookies(res, accessToken, refreshToken);
}

export function clearAuthCookies(res: CookieResponse) {
  _clearAuthCookies(res);
}
