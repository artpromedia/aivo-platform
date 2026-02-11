import { setAuthCookies } from '@aivo/auth-web';
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
    const body = (await request.json()) as CodeRequest;
    const { code, type } = body;

    if (!code || code.length < 6) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    let response: Response;

    const isPin = type === 'pin' || /^\d{6}$/.test(code);

    if (isPin) {
      // PIN-based login (6 digits from parent)
      try {
        response = await fetch(`${PARENT_SVC_URL}/api/v1/learner/pin-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: code }),
        });
      } catch (fetchError) {
        console.error('[Auth Code] Parent service unavailable:', fetchError);
        return NextResponse.json(
          { error: 'Login service is temporarily unavailable. Please try again in a moment.' },
          { status: 503 }
        );
      }
    } else {
      // Class code login (alphanumeric from teacher)
      try {
        response = await fetch(`${TEACHER_SVC_URL}/api/v1/class/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classCode: code }),
        });
      } catch (fetchError) {
        console.error('[Auth Code] Teacher service unavailable:', fetchError);
        return NextResponse.json(
          { error: 'Login service is temporarily unavailable. Please try again in a moment.' },
          { status: 503 }
        );
      }
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ message: '' }))) as {
        message?: string;
      };
      return NextResponse.json(
        { error: errorData.message || 'Invalid code. Please check and try again.' },
        { status: response.status }
      );
    }

    const data = (await response.json()) as CodeAuthResponse;

    if (!data.accessToken) {
      return NextResponse.json(
        { error: 'Unable to verify code. Please try again.' },
        { status: 500 }
      );
    }

    // Set httpOnly cookies via auth-web
    const res = NextResponse.json({
      success: true,
      learner: {
        id: data.learner.id,
        firstName: data.learner.firstName,
        avatarUrl: data.learner.avatarUrl,
      },
      needsBaseline: data.learner.baselineStatus === 'not_started',
    });

    setAuthCookies(res, data.accessToken, data.refreshToken);

    return res;
  } catch (error) {
    console.error('Code auth error:', error);
    return NextResponse.json(
      { error: 'Unable to verify code. Please try again.' },
      { status: 500 }
    );
  }
}
