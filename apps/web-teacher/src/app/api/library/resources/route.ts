/**
 * Library Resources API Route
 *
 * GET    /api/library/resources — fetch teacher resources with optional filters
 * POST   /api/library/resources — upload a new resource (multipart or JSON)
 * DELETE /api/library/resources?id=<id> — remove a resource
 *
 * Proxies to content-svc (services/content-svc).
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const CONTENT_SVC_URL =
  process.env.NEXT_PUBLIC_CONTENT_SVC_URL || 'http://localhost:3010';

const EMPTY_RESPONSE = { resources: [], total: 0 };

function authHeaders(session: { accessToken: string; tenantId: string; userId: string }) {
  return {
    Authorization: `Bearer ${session.accessToken}`,
    'X-Tenant-Id': session.tenantId,
    'X-User-Id': session.userId,
    'X-Internal-Service': 'web-teacher',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/library/resources
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Forward query params to content-svc
    const { searchParams } = request.nextUrl;
    const params = new URLSearchParams();

    const type = searchParams.get('type');
    const subject = searchParams.get('subject');
    const grade = searchParams.get('grade');
    const search = searchParams.get('q');
    const category = searchParams.get('category');
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '24';

    if (type) params.set('type', type);
    if (subject) params.set('subject', subject);
    if (grade) params.set('grade', grade);
    if (search) params.set('q', search);
    if (category) params.set('category', category);
    params.set('page', page);
    params.set('pageSize', pageSize);

    const res = await fetch(
      `${CONTENT_SVC_URL}/resources?${params.toString()}`,
      { headers: authHeaders(session) },
    );

    if (!res.ok) {
      console.error('[Library API] content-svc returned', res.status);
      return NextResponse.json(EMPTY_RESPONSE);
    }

    const json = (await res.json()) as {
      data?: unknown[];
      pagination?: { total?: number };
    };

    return NextResponse.json({
      resources: json.data ?? [],
      total: json.pagination?.total ?? 0,
    });
  } catch (error) {
    console.error('[Library API] Failed to fetch resources:', error);
    return NextResponse.json(EMPTY_RESPONSE);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/library/resources
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let backendRes: Response;

    if (contentType.includes('multipart/form-data')) {
      // Forward multipart form data as-is (file uploads)
      const formData = await request.formData();
      backendRes = await fetch(`${CONTENT_SVC_URL}/resources`, {
        method: 'POST',
        headers: authHeaders(session),
        body: formData,
      });
    } else {
      // JSON body
      const body = await request.json();
      backendRes = await fetch(`${CONTENT_SVC_URL}/resources`, {
        method: 'POST',
        headers: {
          ...authHeaders(session),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    }

    if (!backendRes.ok) {
      const errorText = await backendRes.text();
      console.error('[Library API] Upload failed:', backendRes.status, errorText);
      return NextResponse.json(
        { error: 'Failed to upload resource' },
        { status: backendRes.status },
      );
    }

    const data = await backendRes.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[Library API] Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload resource' },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/library/resources?id=<resourceId>
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resourceId = request.nextUrl.searchParams.get('id');
  if (!resourceId) {
    return NextResponse.json({ error: 'Resource id required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${CONTENT_SVC_URL}/resources/${resourceId}`, {
      method: 'DELETE',
      headers: authHeaders(session),
    });

    if (!res.ok) {
      console.error('[Library API] Delete failed:', res.status);
      return NextResponse.json(
        { error: 'Failed to delete resource' },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Library API] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete resource' },
      { status: 500 },
    );
  }
}
