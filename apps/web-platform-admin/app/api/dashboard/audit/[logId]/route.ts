/**
 * GET /api/dashboard/audit/[logId]
 *
 * Returns details for a specific audit log entry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getAuditLogEntry } from '@/lib/api/audit.api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const session = await requirePlatformAdmin();
    const { logId } = await params;

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const entry = await getAuditLogEntry(logId, accessToken);

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Failed to fetch audit log entry:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch audit log entry' },
      { status: 500 }
    );
  }
}
