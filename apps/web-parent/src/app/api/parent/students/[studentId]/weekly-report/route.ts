import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params;

  try {
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/parent/students/${studentId}/weekly-report`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch weekly report:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}
