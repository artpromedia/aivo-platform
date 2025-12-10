import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set('aivo_access_token', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });
  response.cookies.set('aivo_refresh_token', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });

  return response;
}
