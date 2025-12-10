import { importSPKI, jwtVerify, type KeyLike } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextResponse } from 'next/server';

import type { ContentRole } from './types';

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
  tenantId: string | null;
  roles: ContentRole[];
  accessToken: string;
}

export function getAuthServiceUrl() {
  return authSvcUrl;
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const store = cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const key = await getPublicKey();
    if (!key) {
      // Dev mode: decode without verification for local testing
      const [, payloadB64] = token.split('.');
      if (!payloadB64) return null;
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as {
        sub?: string;
        tenant_id?: string;
        roles?: unknown[];
      };
      const contentRoles: ContentRole[] = [
        'CURRICULUM_AUTHOR',
        'CURRICULUM_REVIEWER',
        'DISTRICT_CONTENT_ADMIN',
        'PLATFORM_ADMIN',
      ];
      const roles = Array.isArray(payload.roles)
        ? payload.roles.filter(
            (r): r is ContentRole =>
              typeof r === 'string' && contentRoles.includes(r as ContentRole)
          )
        : [];
      return {
        userId: payload.sub ?? 'dev-user',
        tenantId: payload.tenant_id ?? null,
        roles,
        accessToken: token,
      };
    }
    const { payload } = await jwtVerify(token, key);
    if (typeof payload.sub !== 'string') return null;
    const contentRoles: ContentRole[] = [
      'CURRICULUM_AUTHOR',
      'CURRICULUM_REVIEWER',
      'DISTRICT_CONTENT_ADMIN',
      'PLATFORM_ADMIN',
    ];
    const roles = Array.isArray(payload.roles)
      ? (payload.roles.filter((r: unknown) =>
          contentRoles.includes(r as ContentRole)
        ) as ContentRole[])
      : [];
    return {
      userId: payload.sub,
      tenantId: typeof payload.tenant_id === 'string' ? payload.tenant_id : null,
      roles,
      accessToken: token,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getAuthSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

export function hasRole(session: AuthSession, ...roles: ContentRole[]): boolean {
  return roles.some((r) => session.roles.includes(r));
}

export function isAuthor(session: AuthSession): boolean {
  return hasRole(session, 'CURRICULUM_AUTHOR', 'DISTRICT_CONTENT_ADMIN', 'PLATFORM_ADMIN');
}

export function isReviewer(session: AuthSession): boolean {
  return hasRole(session, 'CURRICULUM_REVIEWER', 'DISTRICT_CONTENT_ADMIN', 'PLATFORM_ADMIN');
}

export function isAdmin(session: AuthSession): boolean {
  return hasRole(session, 'DISTRICT_CONTENT_ADMIN', 'PLATFORM_ADMIN');
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
