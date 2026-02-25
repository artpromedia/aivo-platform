import { NextResponse, type NextRequest } from 'next/server';

import {
  searchUsersForImpersonation,
  startImpersonation,
  listActiveImpersonationSessions,
  listImpersonationHistory,
} from '../../../../lib/api';
import { getAuthSession } from '../../../../lib/auth';
import type { ImpersonationStartInput } from '../../../../lib/types';

/**
 * GET /api/support/impersonate
 *
 * Query parameters:
 *   - action=sessions  → list active sessions
 *   - action=history   → list paginated history
 *   - action=search&q= → search users
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthSession();
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'sessions') {
      const result = await listActiveImpersonationSessions(auth.accessToken);
      return NextResponse.json(result);
    }

    if (action === 'history') {
      const page = parseInt(searchParams.get('page') ?? '1', 10);
      const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);
      const result = await listImpersonationHistory(auth.accessToken, page, pageSize);
      return NextResponse.json(result);
    }

    if (action === 'search') {
      const q = searchParams.get('q') ?? '';
      if (!q) {
        return NextResponse.json({ users: [] });
      }
      const result = await searchUsersForImpersonation(auth.accessToken, q);
      return NextResponse.json(result);
    }

    return NextResponse.json({ message: 'Invalid action parameter' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Request failed' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/support/impersonate — Start impersonation session
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthSession();
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const input = (await request.json()) as ImpersonationStartInput;
    const result = await startImpersonation(auth.accessToken, input);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to start impersonation' },
      { status: 500 },
    );
  }
}
