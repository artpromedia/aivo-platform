import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/parent/children/with-teachers`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data: unknown = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch children with teachers:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
