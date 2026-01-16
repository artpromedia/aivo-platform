import { NextRequest, NextResponse } from 'next/server';

const LEGAL_HOLD_SVC_URL = process.env.LEGAL_HOLD_SVC_URL ?? 'http://localhost:4061';

interface RouteContext {
  params: Promise<{ holdId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { holdId } = await context.params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${LEGAL_HOLD_SVC_URL}/api/v1/legal-holds/${holdId}/export`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to export legal hold' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="legal-hold-${holdId}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting legal hold:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
