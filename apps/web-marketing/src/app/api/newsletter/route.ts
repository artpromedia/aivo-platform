import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema
const NewsletterSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
  list: z.string().optional(),   // e.g. "weekly-digest", "course-announcements"
  source: z.string().optional(), // Where the signup came from (footer, popup, etc.)
});

// Environment variables
const NOTIFY_SERVICE_URL = process.env.NOTIFY_SERVICE_URL || 'http://notify-svc:4040';
const NEWSLETTER_LIST_EMAIL = process.env.NEWSLETTER_LIST_EMAIL || 'newsletter@aivolearning.com';
const OONRUMAIL_BASE_URL = process.env.OONRUMAIL_BASE_URL || 'https://api.oonrumail.com';
const OONRUMAIL_API_KEY = process.env.OONRUMAIL_API_KEY || '';

/**
 * GET /api/newsletter — Fetch available newsletter lists from OonruMail
 */
export async function GET() {
  try {
    const res = await fetch(
      `${OONRUMAIL_BASE_URL}/api/v1/transactional/aivolearning/newsletter/lists`,
      {
        headers: {
          ...(OONRUMAIL_API_KEY && { Authorization: `Bearer ${OONRUMAIL_API_KEY}` }),
          Accept: 'application/json',
        },
        next: { revalidate: 300 }, // cache for 5 minutes
      },
    );

    if (!res.ok) {
      console.error('[Newsletter API] Failed to fetch lists:', res.status, await res.text());
      return NextResponse.json(
        { error: 'Unable to load newsletter lists' },
        { status: 502 },
      );
    }

    const { lists } = await res.json();

    return NextResponse.json({ lists });
  } catch (error) {
    console.error('[Newsletter API] Error fetching lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch newsletter lists' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const result = NewsletterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    const { email, name, list, source } = result.data;

    // ── 1. Subscribe via OonruMail API ─────────────────────────────────────
    try {
      const subscribeRes = await fetch(
        `${OONRUMAIL_BASE_URL}/api/v1/transactional/aivolearning/newsletter/subscribe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(OONRUMAIL_API_KEY && { Authorization: `Bearer ${OONRUMAIL_API_KEY}` }),
          },
          body: JSON.stringify({
            email,
            ...(name && { name }),
            list: list || 'weekly-digest',
            ...(source && { source }),
          }),
        },
      );

      if (!subscribeRes.ok) {
        console.error(
          '[Newsletter API] OonruMail subscribe failed:',
          subscribeRes.status,
          await subscribeRes.text(),
        );
      }
    } catch (oonruErr) {
      console.error('[Newsletter API] OonruMail subscribe error:', oonruErr);
    }

    // ── 2. Send welcome email via notify service ───────────────────────────
    try {
      const notifyResponse = await fetch(`${NOTIFY_SERVICE_URL}/api/v1/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'web-marketing',
          'X-Tenant-Id': 'system',
        },
        body: JSON.stringify({
          templateName: 'transactional/newsletter-welcome',
          to: email,
          context: {
            subject: 'Welcome to the AIVO Newsletter!',
            unsubscribeUrl: `https://aivolearning.com/newsletter/unsubscribe?email=${encodeURIComponent(email)}&list=${encodeURIComponent(list || 'weekly-digest')}`,
            preferencesUrl: `https://aivolearning.com/newsletter/preferences?email=${encodeURIComponent(email)}`,
          },
          category: 'marketing',
          tags: ['newsletter', 'welcome', source || 'direct'],
        }),
      });

      if (!notifyResponse.ok) {
        console.error('[Newsletter API] Failed to send welcome email:', await notifyResponse.text());
      }
    } catch (notifyError) {
      console.error('[Newsletter API] Notify service error:', notifyError);
    }

    // ── 3. Notify the newsletter management system ──────────────────────
    try {
      await fetch(`${NOTIFY_SERVICE_URL}/api/v1/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'web-marketing',
          'X-Tenant-Id': 'system',
        },
        body: JSON.stringify({
          templateName: 'internal/newsletter-signup',
          to: NEWSLETTER_LIST_EMAIL,
          context: {
            subject: 'New Newsletter Signup',
            subscriberEmail: email,
            source: source || 'direct',
            submittedAt: new Date().toISOString(),
          },
          category: 'internal',
          tags: ['newsletter-signup'],
        }),
      });
    } catch (internalError) {
      console.error('[Newsletter API] Internal notification error:', internalError);
    }

    // ── 4. Log the subscription ──────────────────────────────────────────
    console.log('[Newsletter API] New subscription:', {
      email,
      name,
      list: list || 'weekly-digest',
      source,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "You're subscribed! Check your inbox for a welcome email.",
    });
  } catch (error) {
    console.error('[Newsletter API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}
