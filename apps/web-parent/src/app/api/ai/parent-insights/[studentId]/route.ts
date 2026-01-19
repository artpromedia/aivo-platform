import { NextRequest, NextResponse } from 'next/server';

/**
 * AI Parent Insights API Route
 *
 * Generates AI-powered insights about a student's learning progress.
 * In development, this returns mock insights.
 * In production, this would call the AI Brain service.
 */

interface AIInsight {
  id: string;
  type: 'strength' | 'improvement' | 'concern' | 'celebration';
  title: string;
  description: string;
  actionable?: string;
  actionPath?: string;
  priority: 'high' | 'medium' | 'low';
  subject?: string;
  confidence: number;
  generatedAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    if (!studentId) {
      return NextResponse.json(
        { message: 'Student ID is required' },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // Generate mock insights based on student ID
      const now = new Date().toISOString();
      const isEmma = studentId === 'student-mock-001';

      const mockInsights: AIInsight[] = isEmma
        ? [
            {
              id: `insight-${Date.now()}-1`,
              type: 'strength',
              title: 'Math Problem-Solving Excellence',
              description: 'Emma demonstrates strong analytical thinking in math. She consistently breaks down complex problems into smaller steps and shows above-average performance on multi-step word problems.',
              actionable: 'Consider introducing more challenging math enrichment activities',
              actionPath: '/curriculum/math/advanced',
              priority: 'medium',
              subject: 'Math',
              confidence: 0.92,
              generatedAt: now,
            },
            {
              id: `insight-${Date.now()}-2`,
              type: 'celebration',
              title: '12-Day Learning Streak!',
              description: 'Emma has maintained consistent daily learning for 12 days in a row. This dedication is building strong study habits that will benefit her long-term academic success.',
              priority: 'low',
              confidence: 1.0,
              generatedAt: now,
            },
            {
              id: `insight-${Date.now()}-3`,
              type: 'improvement',
              title: 'Social Studies Engagement Opportunity',
              description: "Emma's engagement with Social Studies content is lower than other subjects. She spends less time on these lessons and occasionally skips optional activities.",
              actionable: 'Explore interactive history games to boost engagement',
              actionPath: '/games?subject=social-studies',
              priority: 'medium',
              subject: 'Social Studies',
              confidence: 0.78,
              generatedAt: now,
            },
          ]
        : [
            {
              id: `insight-${Date.now()}-1`,
              type: 'improvement',
              title: 'Building Math Confidence',
              description: 'Noah sometimes hesitates on math problems even when he knows the answer. Building his confidence through positive reinforcement could help him perform better.',
              actionable: 'Try the confidence-building math games',
              actionPath: '/games?subject=math&type=confidence',
              priority: 'high',
              subject: 'Math',
              confidence: 0.85,
              generatedAt: now,
            },
            {
              id: `insight-${Date.now()}-2`,
              type: 'strength',
              title: 'Strong Visual Learning',
              description: 'Noah learns best through visual content. He shows 30% better retention when lessons include diagrams, videos, and interactive visuals.',
              priority: 'medium',
              confidence: 0.91,
              generatedAt: now,
            },
            {
              id: `insight-${Date.now()}-3`,
              type: 'concern',
              title: 'Attention Span During Long Sessions',
              description: "Noah's performance drops significantly in sessions longer than 15 minutes. Shorter, more frequent learning sessions may be more effective.",
              actionable: 'Adjust session length in learning settings',
              actionPath: '/settings?tab=learning',
              priority: 'high',
              confidence: 0.82,
              generatedAt: now,
            },
          ];

      console.log('[DEV] Returning mock AI insights for student:', studentId);

      return NextResponse.json({
        insights: mockInsights,
        generatedAt: now,
        model: 'aivo-brain-v1-dev',
      });
    }

    // Production: Call AI Brain service
    const aiBrainUrl = process.env.AI_BRAIN_SERVICE_URL || 'http://ai-brain-svc:4010';
    const response = await fetch(`${aiBrainUrl}/insights/parent/${studentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'AI service unavailable' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('AI insights error:', error);
    return NextResponse.json(
      { message: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate new insights on demand
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const body = await request.json();

    if (!studentId) {
      return NextResponse.json(
        { message: 'Student ID is required' },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      console.log('[DEV] Generating new AI insights for student:', studentId, body);

      // In dev mode, just return a success response
      return NextResponse.json({
        message: 'Insights generation queued',
        estimatedCompletion: new Date(Date.now() + 30000).toISOString(),
      });
    }

    // Production: Call AI Brain service to generate new insights
    const aiBrainUrl = process.env.AI_BRAIN_SERVICE_URL || 'http://ai-brain-svc:4010';
    const response = await fetch(`${aiBrainUrl}/insights/parent/${studentId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('AI insights generation error:', error);
    return NextResponse.json(
      { message: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
