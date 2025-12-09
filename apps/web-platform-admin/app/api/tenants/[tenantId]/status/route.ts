import { NextResponse, type NextRequest } from 'next/server';

import { updateTenantStatus } from '../../../../../lib/api';
import { getAuthSession } from '../../../../../lib/auth';

interface RouteParams {
  params: Promise<{ tenantId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { tenantId } = await params;
  const auth = await getAuthSession();
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { status } = (await request.json()) as { status: 'ACTIVE' | 'SUSPENDED' };
    const tenant = await updateTenantStatus(auth.accessToken, tenantId, status);
    return NextResponse.json(tenant);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to update tenant status' },
      { status: 500 }
    );
  }
}
