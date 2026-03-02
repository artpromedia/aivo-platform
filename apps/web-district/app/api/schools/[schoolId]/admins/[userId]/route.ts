/**
 * School Admin Remove Route
 *
 * DELETE /api/schools/[schoolId]/admins/[userId] — remove admin assignment
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const TENANT_SVC_URL = process.env.TENANT_SVC_URL || 'http://localhost:4002';

// DELETE /api/schools/[schoolId]/admins/[userId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string; userId: string }> }
) {
  try {
    const { schoolId, userId } = await params;
    const tenantId = new URL(request.url).searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const response = await fetch(
      `${TENANT_SVC_URL}/tenants/${tenantId}/schools/${schoolId}/admins/${userId}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: errText || 'Failed to remove admin' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove school admin' }, { status: 500 });
  }
}
