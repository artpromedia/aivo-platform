/**
 * Changelog API Proxy
 *
 * Proxies requests from the browser to the changelog-svc.
 */
import { type NextRequest, NextResponse } from 'next/server';

const UPSTREAM = process.env.CHANGELOG_SVC_URL ?? 'http://localhost:4060';

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string,
) {
  const upstream = `${UPSTREAM}/api/changelog/${pathSegments.join('/')}${request.nextUrl.search}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const auth = request.headers.get('Authorization');
    if (auth) headers['Authorization'] = auth;
    const cookie = request.headers.get('Cookie');
    if (cookie) headers['Cookie'] = cookie;

    const fetchOpts: RequestInit = { method, headers, cache: 'no-store' };

    if (method !== 'GET' && method !== 'HEAD') {
      const body = await request.text();
      if (body) fetchOpts.body = body;
    }

    const res = await fetch(upstream, fetchOpts);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { message: 'Changelog service unreachable' },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path ?? [], 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path ?? [], 'POST');
}
