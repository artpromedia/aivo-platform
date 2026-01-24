import { NextRequest, NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const studentId = url.searchParams.get('studentId') || 'student-1';

  // In development, return mock data
  if (isDev) {
    return NextResponse.json({
      updates: [
        {
          id: 'update-1',
          studentId,
          type: 'lesson_complete',
          title: 'Completed Math Lesson',
          description: 'TestChild completed "Addition with Carrying" with a score of 95%',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: 'update-2',
          studentId,
          type: 'achievement',
          title: 'New Badge Earned!',
          description: 'TestChild earned the "Math Whiz" badge for completing 10 math lessons',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          read: true,
        },
        {
          id: 'update-3',
          studentId,
          type: 'streak',
          title: 'Learning Streak',
          description: 'TestChild has been learning for 5 days in a row!',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          read: true,
        },
      ],
      total: 3,
      unreadCount: 1,
    });
  }

  // In production, proxy to analytics service
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
