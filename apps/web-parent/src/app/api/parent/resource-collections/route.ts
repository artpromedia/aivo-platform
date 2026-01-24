import { NextRequest, NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const parentId = url.searchParams.get('parentId') || 'parent-1';

  // In development, return mock data
  if (isDev) {
    return NextResponse.json({
      collections: [
        {
          id: 'col-1',
          parentId,
          name: 'Math Resources',
          description: 'Saved math practice materials',
          resourceCount: 5,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'col-2',
          parentId,
          name: 'Reading List',
          description: 'Books and reading materials for summer',
          resourceCount: 8,
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      total: 2,
    });
  }

  // In production, proxy to content service
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
  // In development, return mock response
  if (isDev) {
    const body = await request.json();
    return NextResponse.json({
      id: `col-${Date.now()}`,
      ...body,
      resourceCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // In production, proxy to content service
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
