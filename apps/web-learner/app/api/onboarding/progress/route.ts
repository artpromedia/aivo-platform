import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const LEARNER_MODEL_SVC_URL = process.env.LEARNER_MODEL_SVC_URL || 'http://localhost:3012';

export interface OnboardingProgressRequest {
  learnerId: string;
  currentStep: string;
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OnboardingProgressRequest;
    const { learnerId, currentStep, data } = body;

    // Get auth token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    const isDevMode = process.env.NODE_ENV === 'development';

    if (!authToken && !isDevMode) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Try to save to learner model service
    try {
      const response = await fetch(`${LEARNER_MODEL_SVC_URL}/api/learner/${learnerId}/onboarding-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          currentStep,
          data,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json(result);
      }
    } catch (error) {
      console.log('Learner model service offline, progress stored locally');
    }

    // Return success even if service is offline (client stores locally)
    return NextResponse.json({
      success: true,
      learnerId,
      currentStep,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Onboarding progress error:', error);
    return NextResponse.json(
      { error: 'Failed to save onboarding progress' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const learnerId = searchParams.get('learnerId');

    if (!learnerId) {
      return NextResponse.json({ error: 'Missing learnerId' }, { status: 400 });
    }

    // Get auth token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    // Try to get from learner model service
    try {
      const response = await fetch(
        `${LEARNER_MODEL_SVC_URL}/api/learner/${learnerId}/onboarding-progress`,
        {
          headers: {
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
        }
      );

      if (response.ok) {
        const progress = await response.json();
        return NextResponse.json(progress);
      }
    } catch {
      console.log('Learner model service offline');
    }

    return NextResponse.json({ progress: null });
  } catch (error) {
    console.error('Get onboarding progress error:', error);
    return NextResponse.json(
      { error: 'Failed to get onboarding progress' },
      { status: 500 }
    );
  }
}
