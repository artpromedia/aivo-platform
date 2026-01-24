import { NextRequest, NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const studentId = url.searchParams.get('studentId') || 'student-1';

  // In development, return mock data
  if (isDev) {
    return NextResponse.json({
      studentId,
      summary: {
        totalUpdates: 15,
        unreadUpdates: 3,
        lastWeekProgress: 85,
        thisWeekProgress: 92,
        progressChange: 7,
        lessonsCompleted: 12,
        quizzesCompleted: 5,
        averageScore: 88,
        timeSpent: '4h 30m',
        streak: 5,
      },
      highlights: [
        'Improved math score by 15%',
        'Completed all reading assignments',
        'Started new science unit',
      ],
    });
  }

  // In production, proxy to analytics service
  try {
    const response = await fetch(
      `${process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4030'}/api/v1/parent/progress-updates/summary?studentId=${studentId}`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch progress summary:', error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}
