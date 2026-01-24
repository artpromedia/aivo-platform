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
      name: 'TestChild User',
      grade: '2',
      overallProgress: 75,
      subjects: [
        { name: 'Math', progress: 80, level: 'Proficient' },
        { name: 'Reading', progress: 70, level: 'Developing' },
        { name: 'Science', progress: 75, level: 'Proficient' },
      ],
      recentActivity: {
        lessonsCompleted: 12,
        quizzesCompleted: 5,
        averageScore: 85,
        timeSpent: '4h 30m',
      },
      strengths: ['Problem Solving', 'Reading Comprehension'],
      areasToImprove: ['Writing', 'Time Management'],
      lastActive: new Date().toISOString(),
    });
  }

  // In production, proxy to parent-svc
  try {
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/parent/students/${studentId}/summary`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch student summary:', error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}
