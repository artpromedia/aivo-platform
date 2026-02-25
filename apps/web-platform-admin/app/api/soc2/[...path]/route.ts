/**
 * SOC 2 Evidence API Proxy
 *
 * Proxies requests from the browser to the compliance-evidence-svc
 * to avoid CORS issues in production.
 */
import { type NextRequest, NextResponse } from 'next/server';

const UPSTREAM =
  process.env.COMPLIANCE_EVIDENCE_SVC_URL ?? 'http://localhost:3092';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const upstream = `${UPSTREAM}/api/${path.join('/')}${request.nextUrl.search}`;

  try {
    const res = await fetch(upstream, {
      headers: {
        Authorization: request.headers.get('Authorization') ?? '',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { message: 'Compliance evidence service unreachable' },
      { status: 502 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const upstream = `${UPSTREAM}/api/${path.join('/')}${request.nextUrl.search}`;

  try {
    const body = await request.text();
    const res = await fetch(upstream, {
      method: 'POST',
      headers: {
        Authorization: request.headers.get('Authorization') ?? '',
        'Content-Type': 'application/json',
      },
      body,
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { message: 'Compliance evidence service unreachable' },
      { status: 502 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const upstream = `${UPSTREAM}/api/${path.join('/')}${request.nextUrl.search}`;

  try {
    const body = await request.text();
    const res = await fetch(upstream, {
      method: 'PATCH',
      headers: {
        Authorization: request.headers.get('Authorization') ?? '',
        'Content-Type': 'application/json',
      },
      body,
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { message: 'Compliance evidence service unreachable' },
      { status: 502 },
    );
  }
}
