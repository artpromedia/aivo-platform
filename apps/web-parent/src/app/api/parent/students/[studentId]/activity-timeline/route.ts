import { NextRequest, NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '15', 10);

  // In development, return mock data
  if (isDev) {
    const activities = [
      {
        id: 'act-1',
        type: 'lesson_completed',
        title: 'Completed Math Lesson: Addition Basics',
        subject: 'Math',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        details: { score: 95, duration: '15m' },
      },
      {
        id: 'act-2',
        type: 'quiz_completed',
        title: 'Finished Reading Quiz',
        subject: 'Reading',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        details: { score: 88, questions: 10 },
      },
      {
        id: 'act-3',
        type: 'achievement',
        title: 'Earned "Math Whiz" Badge',
        subject: 'Math',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        details: { badge: 'Math Whiz' },
      },
      {
        id: 'act-4',
        type: 'lesson_started',
        title: 'Started Science Unit: Plants',
        subject: 'Science',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        details: {},
      },
      {
        id: 'act-5',
        type: 'streak',
        title: '5 Day Streak Achieved!',
        subject: 'General',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        details: { streakDays: 5 },
      },
    ];

    return NextResponse.json({
      studentId,
      activities: activities.slice(0, limit),
      total: activities.length,
      hasMore: activities.length > limit,
    });
  }

  // In production, proxy to parent-svc
  try {
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/parent/students/${studentId}/activity-timeline?limit=${limit}`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch activity timeline:', error);
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
  }
}
