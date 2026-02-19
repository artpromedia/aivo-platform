import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const OONRUMAIL_BASE_URL = process.env.OONRUMAIL_BASE_URL || 'https://api.oonrumail.com';
const OONRUMAIL_API_KEY = process.env.OONRUMAIL_API_KEY || '';

const UnsubscribeSchema = z.object({
  email: z.string().email(),
  list: z.string().min(1),
});

/**
 * DELETE /api/newsletter/unsubscribe
 *
 * Proxies the unsubscribe request to OonruMail so the browser
 * never talks directly to the third-party API.
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UnsubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid email or list.' },
        { status: 400 },
      );
    }

    const { email, list } = parsed.data;

    const res = await fetch(
      `${OONRUMAIL_BASE_URL}/api/v1/transactional/aivolearning/newsletter/subscribe`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(OONRUMAIL_API_KEY && { Authorization: `Bearer ${OONRUMAIL_API_KEY}` }),
        },
        body: JSON.stringify({ email, list }),
      },
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[Newsletter Unsubscribe] OonruMail error:', res.status, data);
      return NextResponse.json(
        { status: 'error', message: data.message || 'Unsubscribe failed.' },
        { status: res.status },
      );
    }

    return NextResponse.json({
      status: 'unsubscribed',
      message: data.message ?? 'You have been unsubscribed.',
    });
  } catch (error) {
    console.error('[Newsletter Unsubscribe] Error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Unable to process unsubscribe request.' },
      { status: 500 },
    );
  }
}
