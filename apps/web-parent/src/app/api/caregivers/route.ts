import { NextRequest, NextResponse } from 'next/server';

const PARENT_SERVICE_URL = process.env.PARENT_SERVICE_URL || 'http://parent-svc:4000';

/**
 * GET /api/caregivers?studentId=xxx
 *
 * Get caregivers for a student (including pending invites)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: { code: 'MISSING_STUDENT_ID', message: 'Student ID is required' } },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // Return mock data in development
      return NextResponse.json(getMockStudentCaregivers(studentId));
    }

    const response = await fetch(`${PARENT_SERVICE_URL}/caregiver/students/${studentId}`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || { code: 'FETCH_FAILED', message: 'Failed to fetch caregivers' } },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/caregivers
 *
 * Create a caregiver invitation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, caregiverEmail, caregiverName, relationship, permissions, message } = body;

    if (!studentId || !caregiverEmail) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELDS', message: 'Student ID and caregiver email are required' } },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      return NextResponse.json({
        inviteId: `invite_${Date.now()}`,
        inviteCode: 'mock-invite-code-12345',
        inviteUrl: `http://localhost:3000/caregiver/accept-invite?code=mock-invite-code-12345`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    const response = await fetch(`${PARENT_SERVICE_URL}/caregiver/invite`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId,
        caregiverEmail,
        caregiverName,
        relationship,
        permissions,
        message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || { code: 'INVITE_FAILED', message: 'Failed to create invitation' } },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// Mock data for development
function getMockStudentCaregivers(studentId: string) {
  return {
    studentId,
    studentName: 'Emma Johnson',
    maxCaregivers: 2,
    currentCount: 1,
    remainingSlots: 1,
    caregivers: [
      {
        id: 'cg_1',
        email: 'grandma@example.com',
        givenName: 'Mary',
        familyName: 'Johnson',
        photoUrl: null,
        relationship: 'grandparent',
        status: 'active',
        permissions: {
          viewProgress: true,
          viewGrades: true,
          viewActivity: true,
          viewAchievements: true,
          receiveNotifications: true,
          viewTeacherNotes: false,
        },
        delegatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    pendingInvites: [
      {
        id: 'inv_1',
        caregiverEmail: 'auntie@example.com',
        caregiverName: 'Susan Smith',
        relationship: 'aunt_uncle',
        status: 'pending',
        permissions: {
          viewProgress: true,
          viewGrades: true,
          viewActivity: true,
          viewAchievements: true,
          receiveNotifications: false,
          viewTeacherNotes: false,
        },
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  };
}
