/**
 * POST /api/billing/pilots/[id]/convert
 *
 * Convert a pilot to a paid contract.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type ConvertPilotInput } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { id } = await params;

    const body = (await request.json().catch(() => ({}))) as ConvertPilotInput;
    const response = await billingApi.convertPilot(id, body, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to convert pilot:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to convert pilot' }, { status: 500 });
  }
}
