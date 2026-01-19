import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const LEARNER_MODEL_SVC_URL = process.env.LEARNER_MODEL_SVC_URL || 'http://localhost:3012';
const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://localhost:3010';

export interface OnboardingCompleteRequest {
  learnerId: string;
  onboardingData: {
    displayName?: string;
    avatar?: string;
    gradeLevel?: string;
    textSize?: string;
    highContrast?: boolean;
    reducedMotion?: boolean;
    dyslexiaFont?: boolean;
    soundSensitivity?: string;
    visualBusyness?: string;
    breakFrequency?: string;
    favoriteSubjects?: string[];
    hobbies?: string[];
    learningGoals?: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OnboardingCompleteRequest;
    const { learnerId, onboardingData } = body;

    // Get auth token from cookies
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    const isDevMode = process.env.NODE_ENV === 'development';

    if (!authToken && !isDevMode) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const completedAt = new Date().toISOString();

    // Save to learner model service
    try {
      await fetch(`${LEARNER_MODEL_SVC_URL}/api/learner/${learnerId}/onboarding-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          onboardingData,
          completedAt,
        }),
      });
    } catch {
      console.log('Learner model service offline');
    }

    // Update learner profile in parent service
    try {
      await fetch(`${PARENT_SVC_URL}/api/learner/${learnerId}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          displayName: onboardingData.displayName,
          avatar: onboardingData.avatar,
          gradeLevel: onboardingData.gradeLevel,
          onboardingCompletedAt: completedAt,
          accessibilitySettings: {
            textSize: onboardingData.textSize,
            highContrast: onboardingData.highContrast,
            reducedMotion: onboardingData.reducedMotion,
            dyslexiaFont: onboardingData.dyslexiaFont,
          },
          sensoryProfile: {
            soundSensitivity: onboardingData.soundSensitivity,
            visualBusyness: onboardingData.visualBusyness,
            breakFrequency: onboardingData.breakFrequency,
          },
          interests: {
            subjects: onboardingData.favoriteSubjects,
            hobbies: onboardingData.hobbies,
            goals: onboardingData.learningGoals,
          },
        }),
      });
    } catch {
      console.log('Parent service offline');
    }

    return NextResponse.json({
      success: true,
      learnerId,
      completedAt,
    });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
