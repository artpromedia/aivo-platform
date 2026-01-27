import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  // In development, return mock data
  if (isDev) {
    return NextResponse.json({
      notifications: {
        email: true,
        push: true,
        sms: false,
        weeklyReport: true,
        progressAlerts: true,
        homeworkReminders: true,
      },
      privacy: {
        shareProgressWithTeachers: true,
        allowAnonymousAnalytics: true,
      },
      display: {
        theme: 'system',
        language: 'en',
        timezone: 'America/New_York',
      },
      children: [
        {
          id: 'learner_test123',
          name: 'TestChild User',
          dailyLimit: 120, // minutes
          allowedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          contentFilters: {
            difficulty: 'auto',
            subjects: ['math', 'reading', 'science'],
          },
        },
      ],
    });
  }

  // In production, proxy to parent-svc
  try {
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/parent/settings`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data: unknown = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // In development, return success
  if (isDev) {
    const body: unknown = await request.json();
    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      ...(body as object),
    });
  }

  // In production, proxy to parent-svc
  try {
    const body: unknown = await request.json();
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/parent/settings`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: request.headers.get('Authorization') || '',
        },
        body: JSON.stringify(body),
      }
    );
    const data: unknown = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
