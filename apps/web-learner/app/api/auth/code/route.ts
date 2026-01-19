import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Service URLs
const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://localhost:3010';
const TEACHER_SVC_URL = process.env.TEACHER_SVC_URL || 'http://localhost:3002';

interface LearnerData {
  id: string;
  firstName: string;
  lastName?: string;
  avatarUrl?: string;
  baselineStatus: 'not_started' | 'in_progress' | 'completed';
}

interface CodeAuthResponse {
  accessToken: string;
  refreshToken: string;
  learner: LearnerData;
}

interface CodeRequest {
  code: string;
  type?: 'pin' | 'class';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CodeRequest;
    const { code, type } = body;

    if (!code || code.length < 6) {
      return NextResponse.json(
        { error: 'Invalid code format' },
        { status: 400 }
      );
    }

    let response: Response;

    if (type === 'pin' || /^\d{6}$/.test(code)) {
      // PIN-based login (6 digits from parent)
      response = await fetch(`${PARENT_SVC_URL}/api/v1/learner/pin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: code }),
      });
    } else {
      // Class code login (alphanumeric from teacher)
      response = await fetch(`${TEACHER_SVC_URL}/api/v1/class/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classCode: code }),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: '' })) as { message?: string };
      return NextResponse.json(
        { error: errorData.message || 'Invalid code. Please check and try again.' },
        { status: response.status }
      );
    }

    const data = await response.json() as CodeAuthResponse;

    // Store tokens in httpOnly cookies
    const cookieStore = cookies();
    
    cookieStore.set('auth-token', data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    cookieStore.set('refresh-token', data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Determine if learner needs baseline assessment
    const needsBaseline = data.learner.baselineStatus === 'not_started';

    return NextResponse.json({
      success: true,
      learner: {
        id: data.learner.id,
        firstName: data.learner.firstName,
        avatarUrl: data.learner.avatarUrl,
      },
      needsBaseline,
    });
  } catch (error) {
    console.error('Code auth error:', error);
    return NextResponse.json(
      { error: 'Unable to verify code. Please try again.' },
      { status: 500 }
    );
  }
}
