import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'aivo_access_token';

/**
 * GET /api/auth/session
 *
 * Returns the current session info and raw access token.
 * Used by the API client to inject Bearer auth headers.
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Decode JWT payload (without verification — verification happens in middleware/backend)
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) throw new Error('Invalid token');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as {
      sub?: string;
      email?: string;
      name?: string;
      roles?: string[];
      vendorId?: string;
      vendorSlug?: string;
      vendorName?: string;
      vendorType?: string;
    };

    return NextResponse.json({
      user: {
        id: payload.sub ?? '',
        email: payload.email ?? '',
        name: payload.name ?? '',
        vendorId: payload.vendorId ?? '',
        vendorSlug: payload.vendorSlug ?? '',
        vendorName: payload.vendorName ?? '',
        vendorType: payload.vendorType ?? 'AIVO',
        roles: payload.roles ?? [],
      },
      accessToken: token,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
