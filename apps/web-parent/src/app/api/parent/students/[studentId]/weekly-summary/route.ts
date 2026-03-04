import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params;

  try {
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://parent-svc:3000'}/api/v1/parent/students/${studentId}/weekly-summary`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch weekly summary:', error);
    return NextResponse.json({ error: 'Failed to fetch weekly summary' }, { status: 500 });
  }
}
