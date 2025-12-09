import { NextResponse, type NextRequest } from 'next/server';

import { updateFeatureFlag } from '../../../../../../lib/api';
import { getAuthSession } from '../../../../../../lib/auth';

interface RouteParams {
  params: Promise<{ tenantId: string; flagKey: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { tenantId, flagKey } = await params;
  const auth = await getAuthSession();
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { enabled: boolean; rolloutPercentage?: number };
    const flag = await updateFeatureFlag(
      auth.accessToken,
      tenantId,
      flagKey,
      body.enabled,
      body.rolloutPercentage
    );
    return NextResponse.json(flag);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to update feature flag' },
      { status: 500 }
    );
  }
}
