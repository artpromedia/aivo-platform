import { NextRequest, NextResponse } from 'next/server';

const PARENT_SERVICE_URL = process.env.PARENT_SERVICE_URL || 'http://parent-svc:4000';

/**
 * PUT /api/caregivers/permissions
 *
 * Update caregiver permissions for a student
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { caregiverId, studentId, ...permissions } = body;

    if (!caregiverId || !studentId) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELDS', message: 'Caregiver ID and Student ID are required' } },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      console.log('[DEV] Updating mock caregiver permissions');
      return NextResponse.json({
        id: 'link_123',
        caregiverId,
        studentId,
        relationship: 'grandparent',
        status: 'active',
        permissions: {
          viewProgress: permissions.viewProgress ?? true,
          viewGrades: permissions.viewGrades ?? true,
          viewActivity: permissions.viewActivity ?? true,
          viewAchievements: permissions.viewAchievements ?? true,
          receiveNotifications: permissions.receiveNotifications ?? true,
          viewTeacherNotes: permissions.viewTeacherNotes ?? false,
        },
        delegatedById: 'parent_123',
        delegatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    const response = await fetch(`${PARENT_SERVICE_URL}/caregiver/permissions`, {
      method: 'PUT',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caregiverId, studentId, ...permissions }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || { code: 'UPDATE_FAILED', message: 'Failed to update permissions' } },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Caregiver permissions update error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
