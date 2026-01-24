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
      milestones: [
        {
          id: 'ms-1',
          title: 'First 100 Lessons',
          description: 'Complete 100 lessons',
          progress: 75,
          target: 100,
          current: 75,
          completed: false,
          category: 'lessons',
        },
        {
          id: 'ms-2',
          title: 'Quiz Master',
          description: 'Score 90%+ on 10 quizzes',
          progress: 100,
          target: 10,
          current: 10,
          completed: true,
          completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'quizzes',
        },
        {
          id: 'ms-3',
          title: '30 Day Streak',
          description: 'Learn for 30 days in a row',
          progress: 17,
          target: 30,
          current: 5,
          completed: false,
          category: 'streak',
        },
        {
          id: 'ms-4',
          title: 'Reading Champion',
          description: 'Complete all reading levels',
          progress: 60,
          target: 10,
          current: 6,
          completed: false,
          category: 'reading',
        },
      ],
      completedCount: 1,
      totalCount: 4,
    });
  }

  // In production, proxy to parent-svc
  try {
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/parent/students/${studentId}/milestones`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch milestones:', error);
    return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
  }
}
