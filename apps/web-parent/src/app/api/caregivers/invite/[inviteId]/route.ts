import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

const PARENT_SERVICE_URL = process.env.PARENT_SERVICE_URL || 'http://parent-svc:4000';

/**
 * POST /api/caregivers/invite/[inviteId]
 *
 * Resend a caregiver invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { inviteId } = await params;

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      return NextResponse.json({
        success: true,
        message: 'Invitation resent successfully',
      });
    }

    const response = await fetch(`${PARENT_SERVICE_URL}/caregiver/invite/resend`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inviteId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || { code: 'RESEND_FAILED', message: 'Failed to resend invitation' } },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/caregivers/invite/[inviteId]
 *
 * Cancel a pending caregiver invitation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { inviteId } = await params;

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      return NextResponse.json({
        success: true,
        message: 'Invitation cancelled successfully',
      });
    }

    const response = await fetch(`${PARENT_SERVICE_URL}/caregiver/invite/${inviteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || { code: 'CANCEL_FAILED', message: 'Failed to cancel invitation' } },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
