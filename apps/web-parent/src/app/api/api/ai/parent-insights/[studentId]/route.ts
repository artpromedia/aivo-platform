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
      insights: [
        {
          id: 'insight-1',
          type: 'achievement',
          title: 'Math Progress',
          message: 'TestChild has improved their math scores by 15% this week!',
          timestamp: new Date().toISOString(),
          priority: 'high',
        },
        {
          id: 'insight-2',
          type: 'suggestion',
          title: 'Reading Practice',
          message: 'Consider encouraging more reading time - 15 minutes a day can make a big difference.',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
        },
        {
          id: 'insight-3',
          type: 'pattern',
          title: 'Learning Style',
          message: 'TestChild learns best with visual content. Try interactive videos for new concepts.',
          timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          priority: 'low',
        },
      ],
      generatedAt: new Date().toISOString(),
    });
  }

  // In production, proxy to AI service
  try {
    const response = await fetch(
      `${process.env.AI_SERVICE_URL || 'http://localhost:4010'}/api/v1/ai/parent-insights/${studentId}`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch AI insights:', error);
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }
}
