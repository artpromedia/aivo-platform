import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'aivo_access_token';
const REFRESH_COOKIE = 'aivo_refresh_token';

/**
 * POST /api/auth/logout
 *
 * Clears auth cookies and returns success.
 */
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  return NextResponse.json({ ok: true });
}
