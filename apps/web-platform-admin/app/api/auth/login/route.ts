import { NextResponse, type NextRequest } from 'next/server';

import { getAuthServiceUrl, setAuthCookies } from '../../../../lib/auth';

// NOTE: In production this call will go through the gateway (Kong) rather than direct auth-svc.

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
    const errorData = await resp.json().catch(() => ({})) as {
      message?: string;
      error?: string;
      canResend?: boolean;
    };
    return NextResponse.json(
      {
        error: errorData.message || errorData.error || 'Invalid credentials',
        code: errorData.error,
        canResend: errorData.canResend,
      },
      { status: resp.status },
    );
  }

  const data = await resp.json();
  const next = NextResponse.json({ user: data.user });
  setAuthCookies(next, data.accessToken, data.refreshToken);
  return next;
}
