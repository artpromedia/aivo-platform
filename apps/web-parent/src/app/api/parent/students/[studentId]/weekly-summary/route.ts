import { NextRequest, NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params;

  // In development, return mock data
  if (isDev) {
    return NextResponse.json({
      studentId,
      weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      weekEnd: new Date().toISOString(),
      summary: {
        totalLessons: 15,
        completedLessons: 12,
        totalQuizzes: 8,
        completedQuizzes: 6,
        averageScore: 82,
        timeSpent: '5h 45m',
        streak: 5,
      },
      dailyActivity: [
        { day: 'Mon', lessons: 2, minutes: 45 },
        { day: 'Tue', lessons: 3, minutes: 60 },
        { day: 'Wed', lessons: 2, minutes: 30 },
        { day: 'Thu', lessons: 2, minutes: 50 },
        { day: 'Fri', lessons: 3, minutes: 55 },
        { day: 'Sat', lessons: 0, minutes: 0 },
        { day: 'Sun', lessons: 0, minutes: 0 },
      ],
      highlights: [
        'Completed all math assignments',
        'Improved reading score by 15%',
        'Started new science unit',
      ],
    });
  }

  // In production, proxy to parent-svc
  try {
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/parent/students/${studentId}/weekly-summary`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch weekly summary:', error);
    return NextResponse.json({ error: 'Failed to fetch weekly summary' }, { status: 500 });
  }
}
