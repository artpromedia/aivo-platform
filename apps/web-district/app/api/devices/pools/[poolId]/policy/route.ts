import { NextRequest, NextResponse } from 'next/server';

const DEVICE_MGMT_SVC_URL = process.env.DEVICE_MGMT_SVC_URL ?? 'http://localhost:3010';

// GET /api/devices/pools/[poolId]/policy - Get pool policy
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const { poolId } = await params;

  try {
    const response = await fetch(
      `${DEVICE_MGMT_SVC_URL}/policies/policies/pool/${poolId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 404) {
      // No policy exists yet - return defaults
      const defaultsResponse = await fetch(
        `${DEVICE_MGMT_SVC_URL}/policies/policies/defaults`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!defaultsResponse.ok) {
        return NextResponse.json({ defaults: {} });
      }

      const defaults = await defaultsResponse.json();
      return NextResponse.json({ policy: null, defaults: defaults.defaults });
    }

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to fetch policy' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching pool policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/devices/pools/[poolId]/policy - Create or update pool policy
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const { poolId } = await params;

  try {
    const body = await request.json();

    const response = await fetch(`${DEVICE_MGMT_SVC_URL}/policies/policies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        devicePoolId: poolId,
        config: body.config,
      }),
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
    console.error('Error creating pool policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/devices/pools/[poolId]/policy - Delete pool policy
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const { poolId } = await params;

  try {
    // First get the policy ID
    const getResponse = await fetch(
      `${DEVICE_MGMT_SVC_URL}/policies/policies/pool/${poolId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (getResponse.status === 404) {
      return new NextResponse(null, { status: 204 });
    }

    if (!getResponse.ok) {
      const error = await getResponse.text();
      return NextResponse.json(
        { error: error || 'Failed to get policy' },
        { status: getResponse.status }
      );
    }

    const policy = await getResponse.json();

    // Now delete it
    const deleteResponse = await fetch(
      `${DEVICE_MGMT_SVC_URL}/policies/policies/${policy.id}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!deleteResponse.ok) {
      const error = await deleteResponse.text();
      return NextResponse.json(
        { error: error || 'Failed to delete policy' },
        { status: deleteResponse.status }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting pool policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
