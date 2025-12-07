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
    if (!key) return null;
    const { payload } = await jwtVerify(token, key);
    if (typeof payload.sub !== 'string' || typeof payload.tenant_id !== 'string') return null;
    const roles = Array.isArray(payload.roles)
      ? (payload.roles.filter((r) => Object.values(Role).includes(r as Role)) as Role[])
      : [];
    return {
      userId: payload.sub,
      tenantId: payload.tenant_id,
      roles,
      accessToken: token,
    };
  } catch (err) {
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

export async function requirePlatformAdmin(): Promise<AuthSession | 'forbidden'> {
  const session = await getAuthSession();
  if (!session) {
    redirect('/login');
  }
  if (!session.roles.includes(Role.PLATFORM_ADMIN)) {
    return 'forbidden';
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
