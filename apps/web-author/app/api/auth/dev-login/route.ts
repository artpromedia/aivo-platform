import { SignJWT } from 'jose';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// This endpoint is only for development - block in production
if (process.env.NODE_ENV === 'production') {
  throw new Error('dev-login endpoint is not available in production');
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = new TextEncoder().encode(jwtSecret);

const ROLE_MAP: Record<string, string[]> = {
  author: ['CURRICULUM_AUTHOR'],
  reviewer: ['CURRICULUM_REVIEWER'],
  admin: ['DISTRICT_CONTENT_ADMIN', 'CURRICULUM_AUTHOR', 'CURRICULUM_REVIEWER'],
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { role?: string };
  const role = body.role;

  if (!role || !ROLE_MAP[role]) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const roles = ROLE_MAP[role];
  const userId = `dev-${role}-${Date.now()}`;
  const tenantId = 'dev-tenant-001';

  const token = await new SignJWT({
    sub: userId,
    tenant_id: tenantId,
    roles,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  const response = NextResponse.json({ success: true });

  response.cookies.set('aivo_access_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
}
