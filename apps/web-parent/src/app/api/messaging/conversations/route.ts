import { NextRequest, NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  // In development, return mock data
  if (isDev) {
    return NextResponse.json({
      conversations: [
        {
          id: 'conv-1',
          participants: [
            { id: 'parent-1', name: 'Demo Parent', role: 'parent' },
            { id: 'teacher-1', name: 'Ms. Johnson', role: 'teacher' },
          ],
          lastMessage: {
            content: 'TestChild is doing great in class!',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            senderId: 'teacher-1',
          },
          unreadCount: 1,
          subject: 'Weekly Update',
        },
        {
          id: 'conv-2',
          participants: [
            { id: 'parent-1', name: 'Demo Parent', role: 'parent' },
            { id: 'teacher-2', name: 'Mr. Smith', role: 'teacher' },
          ],
          lastMessage: {
            content: 'Thank you for your help with the project!',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            senderId: 'parent-1',
          },
          unreadCount: 0,
          subject: 'Science Project',
        },
      ],
      total: 2,
    });
  }

  // In production, proxy to messaging service
  try {
    const response = await fetch(
      `${process.env.MESSAGING_SERVICE_URL || 'http://localhost:4040'}/api/v1/messaging/conversations`,
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
      id: `conv-${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString(),
    });
  }

  // In production, proxy to messaging service
  try {
    const body = await request.json();
    const response = await fetch(
      `${process.env.MESSAGING_SERVICE_URL || 'http://localhost:4040'}/api/v1/messaging/conversations`,
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
