/**
 * Users API Routes
 *
 * CRUD operations for district user management
 */

import { NextRequest, NextResponse } from 'next/server';

const USER_SVC_URL = process.env.USER_SVC_URL || 'http://user-svc:3000';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'TEACHER' | 'ADMIN' | 'LEARNER' | 'PARENT';
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'SUSPENDED';
  schoolId?: string;
  schoolName?: string;
  gradeLevel?: string;
  createdAt: string;
  lastLoginAt?: string;
}

// GET /api/users - List all users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '50';

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const params = new URLSearchParams({ tenantId, page, limit });
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    if (search) params.set('search', search);

    const response = await fetch(`${USER_SVC_URL}/users?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, email, firstName, lastName, role, schoolId } = body;

    if (!tenantId || !email || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, email, firstName, lastName, role' },
        { status: 400 }
      );
    }

    const response = await fetch(`${USER_SVC_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId,
        email,
        firstName,
        lastName,
        role,
        schoolId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: error || 'Failed to create user' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
