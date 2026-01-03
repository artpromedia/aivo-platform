import { NextRequest, NextResponse } from 'next/server';

import { CachePresets } from '@aivo/caching';

const DEVICE_MGMT_SVC_URL = process.env.DEVICE_MGMT_SVC_URL ?? 'http://localhost:3010';

// GET /api/devices/policies - List all policies for a tenant
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  try {
    const response = await fetch(
      `${DEVICE_MGMT_SVC_URL}/policies/policies?${searchParams.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to fetch policies' },
        { status: response.status }
      );
    }

    const data = await response.json();
    // Cache policy list for 5 minutes with stale-while-revalidate
    return NextResponse.json(data, {
      headers: {
        ...CachePresets.publicMedium,
        Vary: 'Authorization',
      },
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/devices/policies - Create a new policy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${DEVICE_MGMT_SVC_URL}/policies/policies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to create policy' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
