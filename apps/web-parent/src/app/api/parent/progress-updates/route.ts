import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const studentId = url.searchParams.get('studentId') || 'student-1';

  try {
    const response = await fetch(
      `${process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4030'}/api/v1/parent/progress-updates?studentId=${studentId}`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch progress updates:', error);
    return NextResponse.json({ error: 'Failed to fetch updates' }, { status: 500 });
  }
}
