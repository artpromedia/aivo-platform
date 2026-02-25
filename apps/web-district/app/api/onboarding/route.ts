/**
 * Onboarding API Proxy (root endpoint)
 */
import { type NextRequest, NextResponse } from 'next/server';

const UPSTREAM = process.env.ONBOARDING_SVC_URL ?? 'http://localhost:4061';

export async function GET(request: NextRequest) {
  const upstream = `${UPSTREAM}/api/onboarding${request.nextUrl.search}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const auth = request.headers.get('Authorization');
    if (auth) headers['Authorization'] = auth;
    const cookie = request.headers.get('Cookie');
    if (cookie) headers['Cookie'] = cookie;

    const res = await fetch(upstream, { headers, cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { message: 'Onboarding service unreachable' },
      { status: 502 },
    );
  }
}
