import { NextRequest, NextResponse } from 'next/server';

const OONRUMAIL_BASE_URL = process.env.OONRUMAIL_BASE_URL || 'https://api.oonrumail.com';
const OONRUMAIL_API_KEY = process.env.OONRUMAIL_API_KEY || '';

/**
 * GET /api/newsletter/confirm?token=xxx
 *
 * Proxies the double-opt-in confirmation to OonruMail so the browser
 * never talks directly to a third-party API.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Missing confirmation token' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `${OONRUMAIL_BASE_URL}/api/v1/transactional/aivolearning/newsletter/subscribe?token=${encodeURIComponent(token)}`,
      {
        headers: {
          ...(OONRUMAIL_API_KEY && { Authorization: `Bearer ${OONRUMAIL_API_KEY}` }),
          Accept: 'application/json',
        },
      },
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('[Newsletter Confirm] OonruMail error:', res.status, data);
      return NextResponse.json(
        { status: 'error', message: data.message || 'Confirmation failed' },
        { status: res.status },
      );
    }

    return NextResponse.json({
      status: data.status ?? 'confirmed',
      message: data.message ?? 'Your subscription has been confirmed!',
    });
  } catch (error) {
    console.error('[Newsletter Confirm] Error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Unable to confirm subscription' },
      { status: 500 },
    );
  }
}
