import { NextRequest, NextResponse } from 'next/server';

const PARENT_SERVICE_URL = process.env.PARENT_SERVICE_URL || 'http://parent-svc:4000';

/**
 * GET /api/caregivers/limit/[studentId]
 *
 * Get caregiver limit info for a student
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      return NextResponse.json({
        studentId,
        maxCaregivers: 2,
        currentCount: 1,
        remainingSlots: 1,
        canAddMore: true,
      });
    }

    const response = await fetch(`${PARENT_SERVICE_URL}/caregiver/students/${studentId}/limit`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || { code: 'FETCH_FAILED', message: 'Failed to fetch caregiver limit' } },
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
