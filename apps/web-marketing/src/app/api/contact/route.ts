import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema
const ContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

// Environment variables
const NOTIFY_SERVICE_URL = process.env.NOTIFY_SERVICE_URL || 'http://notify-svc:4040';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'hello@aivolearning.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const result = ContactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = result.data;

    // Try to send via notification service
    try {
      const notifyResponse = await fetch(`${NOTIFY_SERVICE_URL}/api/v1/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'web-marketing',
          'X-Tenant-Id': 'system',
        },
        body: JSON.stringify({
          templateName: 'transactional/contact-form',
          to: CONTACT_EMAIL,
          context: {
            subject: `Contact Form: ${subject}`,
            senderName: name,
            senderEmail: email,
            topic: subject,
            message: message,
            submittedAt: new Date().toISOString(),
          },
          category: 'contact',
          tags: ['contact-form', subject],
        }),
      });

      if (!notifyResponse.ok) {
        console.error('[Contact API] Failed to send via notify service:', await notifyResponse.text());
        // Fall through to log the submission anyway
      }
    } catch (notifyError) {
      console.error('[Contact API] Notify service error:', notifyError);
      // Continue - we'll still log the submission
    }

    // Log the submission for record-keeping
    console.log('[Contact API] Form submission:', {
      name,
      email,
      subject,
      messageLength: message.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for contacting us. We will respond within 24-48 hours.',
    });
  } catch (error) {
    console.error('[Contact API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process contact form' },
      { status: 500 }
    );
  }
}
