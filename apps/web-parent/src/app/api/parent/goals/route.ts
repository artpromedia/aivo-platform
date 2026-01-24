import { NextRequest, NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const studentId = url.searchParams.get('studentId') || 'student-1';

  // In development, return mock data
  if (isDev) {
    return NextResponse.json({
      goals: [
        {
          id: 'goal-1',
          studentId,
          title: 'Complete 20 Math Lessons',
          description: 'Finish 20 math lessons this month',
          type: 'academic',
          progress: 65,
          target: 20,
          current: 13,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'in-progress',
          createdBy: 'parent',
        },
        {
          id: 'goal-2',
          studentId,
          title: 'Maintain 5-Day Streak',
          description: 'Learn every day for a week',
          type: 'habit',
          progress: 100,
          target: 5,
          current: 5,
          deadline: new Date().toISOString(),
          status: 'completed',
          completedAt: new Date().toISOString(),
          createdBy: 'teacher',
        },
        {
          id: 'goal-3',
          studentId,
          title: 'Improve Reading Score',
          description: 'Increase reading comprehension score by 10%',
          type: 'improvement',
          progress: 40,
          target: 10,
          current: 4,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'in-progress',
          createdBy: 'parent',
        },
      ],
      total: 3,
      completedCount: 1,
      inProgressCount: 2,
    });
  }

  // In production, proxy to goals service
  try {
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/parent/goals?studentId=${studentId}`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // In development, return mock response
  if (isDev) {
    const body = await request.json();
    return NextResponse.json({
      id: `goal-${Date.now()}`,
      ...body,
      progress: 0,
      current: 0,
      status: 'in-progress',
      createdAt: new Date().toISOString(),
    });
  }

  // In production, proxy to goals service
  try {
    const body = await request.json();
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/parent/goals`,
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
    console.error('Failed to create goal:', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}
