import { NextResponse } from 'next/server';

import { getAuthSession } from '../../../../lib/auth';

// ============================================================================
// API Keys Management API
//
// GET    /api/settings/api-keys — List all API keys for the tenant
// POST   /api/settings/api-keys — Generate a new API key
// DELETE /api/settings/api-keys — Revoke an API key (body: { id })
//
// Proxies to tenant-svc via TENANT_SVC_URL.
// ============================================================================

const TENANT_SVC_URL =
  process.env.TENANT_SVC_URL || 'http://localhost:4002';

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${TENANT_SVC_URL}/tenants/${session.tenantId}/api-keys`,
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
        { error: text || 'Failed to fetch API keys' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[api-keys API] Error fetching keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.text();

    const res = await fetch(
      `${TENANT_SVC_URL}/tenants/${session.tenantId}/api-keys`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId,
          'x-user-id': session.userId,
        },
        body,
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to create API key' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[api-keys API] Error creating key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = (await request.json()) as { id: string };

    const res = await fetch(
      `${TENANT_SVC_URL}/tenants/${session.tenantId}/api-keys/${id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId,
          'x-user-id': session.userId,
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to revoke API key' },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api-keys API] Error revoking key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
