/**
 * Teacher Logout API Route
 *
 * Clears auth cookies.
 */

import { clearAuthCookies } from '@aivo/auth-web';
import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearAuthCookies(res);
  return res;
}
