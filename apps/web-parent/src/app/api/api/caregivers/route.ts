import { NextRequest, NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const studentId = url.searchParams.get('studentId') || 'student_001';

  // In development, return mock data
  if (isDev) {
    return NextResponse.json({
      caregivers: [
        {
          id: 'caregiver-1',
          name: 'Demo Parent',
          email: 'demo@example.com',
          relationship: 'parent',
          isPrimary: true,
          permissions: ['view_progress', 'manage_settings', 'contact_teachers'],
          addedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      pendingInvites: [
        {
          id: 'inv_1',
          caregiverEmail: 'auntie@example.com',
          caregiverName: 'Susan Smith',
          relationship: 'aunt_uncle',
          status: 'pending',
          permissions: ['view_progress', 'view_grades'],
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      studentId,
      studentName: 'Emma Johnson',
      maxCaregivers: 3,
      currentCount: 1,
      remainingSlots: 1,
    });
  }

  // In production, proxy to parent-svc
  try {
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/caregivers?studentId=${studentId}`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch caregivers:', error);
    return NextResponse.json({ error: 'Failed to fetch caregivers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // In development, return mock response
  if (isDev) {
    const body = await request.json();
    return NextResponse.json({
      id: `caregiver-${Date.now()}`,
      ...body,
      addedAt: new Date().toISOString(),
    });
  }

  // In production, proxy to parent-svc
  try {
    const body = await request.json();
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/caregivers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: request.headers.get('Authorization') || '',
        },
        body: JSON.stringify(body),
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to add caregiver:', error);
    return NextResponse.json({ error: 'Failed to add caregiver' }, { status: 500 });
  }
}
