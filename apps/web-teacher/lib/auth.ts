/**
 * Server-side Authentication Utilities
 *
 * Provides authentication functions for server components and API routes.
 * Uses JWT verification with the platform auth service.
 *
 * Enterprise UI Audit: RE-AUDIT-AUTH-001
 * - Replaces hardcoded mock user data with proper auth context
 */
import { Role } from '@aivo/ts-rbac';
import { importSPKI, jwtVerify, type KeyLike } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'aivo_access_token';
const REFRESH_COOKIE = 'aivo_refresh_token';

const authSvcUrl = process.env.AUTH_SVC_URL ?? 'http://localhost:4001';
const authPublicKey = process.env.AUTH_PUBLIC_KEY;

let publicKeyPromise: Promise<KeyLike> | null = null;

async function getPublicKey() {
  if (!authPublicKey) return null;
  if (!publicKeyPromise) {
    publicKeyPromise = importSPKI(authPublicKey, 'RS256');
  }
  return publicKeyPromise;
}

export interface AuthSession {
  userId: string;
  tenantId: string;
  roles: Role[];
  accessToken: string;
  userName: string | null;
  userEmail: string | null;
  userInitials: string | null;
  userRole: string | null;
}

export function getAuthServiceUrl() {
  return authSvcUrl;
}

/**
 * Get the current authentication session from cookies
 * Returns null if not authenticated or token is invalid
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  try {
    const key = await getPublicKey();
    if (!key) return null;

    const { payload } = await jwtVerify(token, key);

    if (typeof payload.sub !== 'string' || typeof payload.tenant_id !== 'string') {
      return null;
    }

    const roles = Array.isArray(payload.roles)
      ? (payload.roles.filter((r) => Object.values(Role).includes(r as Role)) as Role[])
      : [];

    // Extract user info from token claims
    const userName = (payload.name as string) || null;
    const userEmail = (payload.email as string) || null;
    const userInitials = userName
      ? userName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : null;

    // Map role to user-friendly display
    const userRole = roles.includes(Role.TEACHER)
      ? 'Teacher'
      : roles.includes(Role.DISTRICT_ADMIN)
        ? 'Administrator'
        : roles.includes(Role.PARENT)
          ? 'Parent'
          : null;

    return {
      userId: payload.sub,
      tenantId: payload.tenant_id,
      roles,
      accessToken: token,
      userName,
      userEmail,
      userInitials,
      userRole,
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getAuthSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

type CookieResponse = Pick<NextResponse, 'cookies'>;

export function setAuthCookies(res: CookieResponse, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
  });
  res.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
  });
}

export function clearAuthCookies(res: CookieResponse) {
  res.cookies.set(ACCESS_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
  res.cookies.set(REFRESH_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
}
