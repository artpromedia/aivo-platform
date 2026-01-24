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
      currentDifficulty: 'medium',
      recommendations: [
        {
          subject: 'Math',
          currentLevel: 'medium',
          recommendedLevel: 'medium-high',
          reason: 'Student has shown consistent improvement and high accuracy',
        },
        {
          subject: 'Reading',
          currentLevel: 'medium',
          recommendedLevel: 'medium',
          reason: 'Current level matches student performance well',
        },
        {
          subject: 'Science',
          currentLevel: 'easy',
          recommendedLevel: 'medium',
          reason: 'Student is ready for more challenging content',
        },
      ],
      lastUpdated: new Date().toISOString(),
    });
  }

  // In production, proxy to parent-svc
  try {
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/parent/students/${studentId}/difficulty/recommendations`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch difficulty recommendations:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}
