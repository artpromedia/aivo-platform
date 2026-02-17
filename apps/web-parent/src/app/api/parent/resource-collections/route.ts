import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const parentId = url.searchParams.get('parentId') || 'parent-1';

  try {
    const response = await fetch(
      `${process.env.CONTENT_SERVICE_URL || 'http://localhost:4020'}/api/v1/parent/resource-collections?parentId=${parentId}`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(
      `${process.env.CONTENT_SERVICE_URL || 'http://localhost:4020'}/api/v1/parent/resource-collections`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: request.headers.get('Authorization') || '',
        },
        body: JSON.stringify(body),
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to create collection:', error);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}
