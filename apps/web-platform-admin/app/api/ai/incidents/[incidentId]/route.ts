import { NextResponse, type NextRequest } from 'next/server';

import { updateIncident } from '../../../../../lib/api';
import { getAuthSession } from '../../../../../lib/auth';
import type { UpdateIncidentInput } from '../../../../../lib/types';

interface RouteParams {
  params: Promise<{ incidentId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { incidentId } = await params;
  const auth = await getAuthSession();
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const input = (await request.json()) as UpdateIncidentInput;
    const incident = await updateIncident(auth.accessToken, incidentId, input);
    return NextResponse.json(incident);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to update incident' },
      { status: 500 }
    );
  }
}
