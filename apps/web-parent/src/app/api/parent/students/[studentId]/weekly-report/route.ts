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
      studentName: 'TestChild User',
      reportDate: new Date().toISOString(),
      weekRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
      overview: {
        grade: 'A-',
        overallProgress: 85,
        timeSpent: '6h 30m',
        lessonsCompleted: 15,
        quizzesCompleted: 8,
        averageScore: 87,
      },
      subjectBreakdown: [
        { subject: 'Math', grade: 'A', progress: 90, timeSpent: '2h 15m' },
        { subject: 'Reading', grade: 'B+', progress: 82, timeSpent: '2h' },
        { subject: 'Science', grade: 'A-', progress: 85, timeSpent: '1h 30m' },
        { subject: 'Writing', grade: 'B', progress: 78, timeSpent: '45m' },
      ],
      teacherNotes: [
        {
          teacher: 'Ms. Johnson',
          subject: 'Math',
          note: 'Excellent progress this week! Keep up the good work.',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      recommendations: [
        'Practice multiplication tables for 10 minutes daily',
        'Read for at least 20 minutes before bed',
        'Try the new science experiments in Unit 4',
      ],
    });
  }

  // In production, proxy to parent-svc
  try {
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/parent/students/${studentId}/weekly-report`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch weekly report:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}
