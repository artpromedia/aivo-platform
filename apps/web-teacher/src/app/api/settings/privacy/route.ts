import { NextResponse } from 'next/server';

import { getAuthSession, getAuthServiceUrl } from '@/lib/auth';

/**
 * GET /api/settings/privacy — Fetch the user's impersonation history
 * Proxies to auth-svc GET /auth/impersonate/my-history
 */
export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') ?? '1';
  const limit = searchParams.get('limit') ?? '20';

  try {
    const authUrl = getAuthServiceUrl();
    const res = await fetch(
      `${authUrl}/auth/impersonate/my-history?page=${page}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to fetch impersonation history' },
        { status: res.status },
      );
    }

    const data = (await res.json()) as Record<string, unknown>;
    return NextResponse.json(data);
  } catch (error) {
    console.error('[privacy API] Error fetching impersonation history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
