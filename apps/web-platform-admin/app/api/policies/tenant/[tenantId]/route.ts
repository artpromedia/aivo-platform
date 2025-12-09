import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { deleteTenantPolicy, upsertTenantPolicy } from '../../../../../lib/api';
import { requirePlatformAdmin } from '../../../../../lib/auth';

interface RouteParams {
  params: Promise<{ tenantId: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePlatformAdmin();
    if (auth === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tenantId } = await params;
    const body = (await request.json()) as { policyJson: Record<string, unknown> };

    if (!body.policyJson || typeof body.policyJson !== 'object') {
      return NextResponse.json(
        { error: 'policyJson is required and must be an object' },
        { status: 400 }
      );
    }

    const policy = await upsertTenantPolicy(auth.accessToken, tenantId, body.policyJson);
    return NextResponse.json(policy);
  } catch (error) {
    console.error('Error upserting tenant policy:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save policy' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePlatformAdmin();
    if (auth === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tenantId } = await params;

    await deleteTenantPolicy(auth.accessToken, tenantId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tenant policy:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete policy' },
      { status: 500 }
    );
  }
}
