import { NextResponse, type NextRequest } from 'next/server';

import { getAuthServiceUrl, setAuthCookies } from '../../../../lib/auth';

// NOTE: In production this call will route through the gateway (e.g., Kong) rather than hitting auth-svc directly.

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const resp = await fetch(`${getAuthServiceUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!resp.ok) {
    const message = await resp.text();
    return NextResponse.json({ error: message || 'Invalid credentials' }, { status: resp.status });
  }

  const data = await resp.json();
  const next = NextResponse.json({ user: data.user });
  setAuthCookies(next, data.accessToken, data.refreshToken);
  return next;
}
