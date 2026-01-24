import { NextRequest, NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const parentId = url.searchParams.get('parentId') || 'parent-1';
  const studentId = url.searchParams.get('studentId') || 'student-1';

  // In development, return mock data
  if (isDev) {
    return NextResponse.json({
      conversations: [
        {
          id: 'thread-1',
          parentId,
          studentId,
          teacherId: 'teacher-1',
          teacherName: 'Ms. Johnson',
          subject: 'Math Progress',
          lastMessage: {
            content: 'TestChild did great on the quiz today!',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            sender: 'teacher',
          },
          unreadCount: 1,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'thread-2',
          parentId,
          studentId,
          teacherId: 'teacher-2',
          teacherName: 'Mr. Smith',
          subject: 'Science Project',
          lastMessage: {
            content: 'Thank you for your help with the materials!',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            sender: 'parent',
          },
          unreadCount: 0,
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      total: 2,
    });
  }

  // In production, proxy to messaging service
  try {
    const response = await fetch(
      `${process.env.MESSAGING_SERVICE_URL || 'http://localhost:4040'}/api/v1/parent/conversations?parentId=${parentId}&studentId=${studentId}`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // In development, return mock response
  if (isDev) {
    const body = await request.json();
    return NextResponse.json({
      id: `thread-${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString(),
    });
  }

  // In production, proxy to messaging service
  try {
    const body = await request.json();
    const response = await fetch(
      `${process.env.MESSAGING_SERVICE_URL || 'http://localhost:4040'}/api/v1/parent/conversations`,
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
    console.error('Failed to create conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
