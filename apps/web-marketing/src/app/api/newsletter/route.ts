import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema
const NewsletterSchema = z.object({
  email: z.string().email('Invalid email address'),
  source: z.string().optional(), // Where the signup came from (footer, popup, etc.)
});

// Environment variables
const NOTIFY_SERVICE_URL = process.env.NOTIFY_SERVICE_URL || 'http://notify-svc:4040';
const NEWSLETTER_LIST_EMAIL = process.env.NEWSLETTER_LIST_EMAIL || 'newsletter@aivolearning.com';

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

    const { email, source } = result.data;

    // Try to send welcome email via notification service
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
            unsubscribeUrl: `https://aivolearning.com/unsubscribe?email=${encodeURIComponent(email)}`,
            preferencesUrl: 'https://aivolearning.com/email-preferences',
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

    // Notify the newsletter management system
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

    // Log the subscription
    console.log('[Newsletter API] New subscription:', {
      email,
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
