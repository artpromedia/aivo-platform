/**
 * Server-side Authentication Utilities — web-platform-admin
 *
 * Delegates to @aivo/auth-web for JWT verification.
 * Adds `requirePlatformAdmin()` for admin-only routes.
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

const authSvcUrl = (() => {
  const url = process.env.AUTH_SVC_URL;
  if (url) return url;
  const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build';
  if (isNextBuild) return 'http://localhost:4001';
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SVC_URL environment variable is required in production');
  }
  return 'http://localhost:4001';
})();

export function getAuthServiceUrl() {
  return authSvcUrl;
}

export async function getAuthSession(): Promise<AuthSession | null> {
  return getServerSession();
}

export async function requireAuth(): Promise<AuthSession> {
  return requireSession();
}

/**
 * Require PLATFORM_ADMIN role — full access (create, modify, delete)
 */
export async function requirePlatformAdmin(): Promise<AuthSession | 'forbidden'> {
  const session = await requireAuth();
  if (!session.roles.includes('PLATFORM_ADMIN')) {
    return 'forbidden';
  }
  return session;
}

/**
 * Require PLATFORM_ADMIN or SUPPORT role — read-only views
 * Use this for audit logs, compliance, system health, tenant list (read-only)
 */
export async function requirePlatformStaff(): Promise<AuthSession | 'forbidden'> {
  const session = await requireAuth();
  const staffRoles = ['PLATFORM_ADMIN', 'SUPPORT'];
  if (!session.roles.some((r) => staffRoles.includes(r))) {
    return 'forbidden';
  }
  return session;
}

/**
 * Check if current session has write access (PLATFORM_ADMIN only)
 */
export function hasWriteAccess(session: AuthSession): boolean {
  return session.roles.includes('PLATFORM_ADMIN');
}

type CookieResponse = Pick<NextResponse, 'cookies'>;

export function setAuthCookies(res: CookieResponse, accessToken: string, refreshToken: string) {
  // NextResponse.cookies.set overload is structurally compatible at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _setAuthCookies(res as any, accessToken, refreshToken);
}

export function clearAuthCookies(res: CookieResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _clearAuthCookies(res as any);
}
