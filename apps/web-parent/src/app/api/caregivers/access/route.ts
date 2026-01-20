import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

const PARENT_SERVICE_URL = process.env.PARENT_SERVICE_URL || 'http://parent-svc:4000';

/**
 * DELETE /api/caregivers/access
 *
 * Revoke caregiver access to a student
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { caregiverId, studentId, reason } = body;

    if (!caregiverId || !studentId) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELDS', message: 'Caregiver ID and Student ID are required' } },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      return NextResponse.json({
        success: true,
        message: 'Caregiver access revoked successfully',
      });
    }

    const response = await fetch(`${PARENT_SERVICE_URL}/caregiver/access`, {
      method: 'DELETE',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caregiverId, studentId, reason }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || { code: 'REVOKE_FAILED', message: 'Failed to revoke access' } },
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
