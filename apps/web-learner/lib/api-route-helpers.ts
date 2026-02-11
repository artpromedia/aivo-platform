/**
 * Shared server-side helpers for API routes.
 *
 * Provides token parsing and backend proxy utilities so that
 * each route handler stays lean.
 */

import { cookies } from 'next/headers';

const COOKIE_NAME = 'aivo_access_token';

export interface TokenPayload {
  sub: string;
  firstName?: string;
  lastName?: string;
  tenantId?: string;
  role?: string;
  grade?: string;
}

/**
 * Read the JWT from the request cookie and decode the payload.
 * Returns null if no token or malformed.
 */
export function getTokenPayload(): TokenPayload | null {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString(),
    ) as Record<string, unknown>;
    const str = (v: unknown): string =>
      typeof v === 'string' ? v : '';
    return {
      sub: str(payload.sub),
      firstName: str(payload.firstName ?? payload.given_name),
      lastName: str(payload.lastName ?? payload.family_name),
      tenantId: str(payload.tenantId ?? payload.tenant_id),
      role: str(payload.role),
      grade: str(payload.grade ?? payload.gradeLevel),
    };
  } catch {
    return null;
  }
}

/**
 * Get the raw access token string for proxying to backend services.
 */
export function getRawToken(): string | undefined {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

/**
 * Proxy a GET request to a backend service.
 * Forwards the access token as a Bearer header.
 */
export async function proxyGet<T>(
  serviceUrl: string,
  path: string,
  token?: string,
): Promise<T | null> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Internal-Service': 'web-learner',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${serviceUrl}${path}`, { headers, cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
