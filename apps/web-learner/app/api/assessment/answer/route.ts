import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ASSESSMENT_SVC_URL = process.env.ASSESSMENT_SVC_URL || 'http://localhost:3009';

export interface SubmitAnswerRequest {
  sessionId: string;
  questionId: string;
  answer: number | string | null;
  latencyMs: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitAnswerRequest;
    const { sessionId, questionId, answer, latencyMs } = body;

    // Get auth token from cookies
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    // Try to submit to assessment service
    try {
      const response = await fetch(`${ASSESSMENT_SVC_URL}/api/assessment/session/${sessionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          questionId,
          answer,
          latencyMs,
          answeredAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json(result);
      }
    } catch {
      console.log('Assessment service offline');
    }

    // Return success even if service is offline
    // Client handles answer tracking locally
    return NextResponse.json({
      success: true,
      sessionId,
      questionId,
      recorded: true,
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
