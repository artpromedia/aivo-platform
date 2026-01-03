import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema
const DemoRequestSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  organization: z.string().optional(),
  studentCount: z.string().optional(),
  message: z.string().optional(),
});

// Environment variables
const NOTIFY_SERVICE_URL = process.env.NOTIFY_SERVICE_URL || 'http://notify-svc:4040';
const SALES_EMAIL = process.env.SALES_EMAIL || 'sales@aivolearning.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const result = DemoRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;
    const fullName = `${data.firstName} ${data.lastName}`;

    // Try to send notification to sales team
    try {
      const notifyResponse = await fetch(`${NOTIFY_SERVICE_URL}/api/v1/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'web-marketing',
          'X-Tenant-Id': 'system',
        },
        body: JSON.stringify({
          templateName: 'transactional/demo-request',
          to: SALES_EMAIL,
          context: {
            subject: `Demo Request: ${fullName} (${data.role})`,
            contactName: fullName,
            contactEmail: data.email,
            contactPhone: data.phone || 'Not provided',
            role: data.role,
            organization: data.organization || 'Not provided',
            studentCount: data.studentCount || 'Not provided',
            message: data.message || 'No additional message',
            submittedAt: new Date().toISOString(),
          },
          category: 'sales',
          tags: ['demo-request', data.role],
        }),
      });

      if (!notifyResponse.ok) {
        console.error('[Demo API] Failed to send via notify service:', await notifyResponse.text());
      }
    } catch (notifyError) {
      console.error('[Demo API] Notify service error:', notifyError);
    }

    // Send confirmation email to the requester
    try {
      const confirmResponse = await fetch(`${NOTIFY_SERVICE_URL}/api/v1/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'web-marketing',
          'X-Tenant-Id': 'system',
        },
        body: JSON.stringify({
          templateName: 'transactional/demo-confirmation',
          to: data.email,
          context: {
            subject: 'Your AIVO Demo Request Received',
            firstName: data.firstName,
            supportUrl: 'https://aivolearning.com/support',
          },
          category: 'transactional',
          tags: ['demo-confirmation'],
        }),
      });

      if (!confirmResponse.ok) {
        console.error('[Demo API] Failed to send confirmation:', await confirmResponse.text());
      }
    } catch (confirmError) {
      console.error('[Demo API] Confirmation email error:', confirmError);
    }

    // Log the submission for record-keeping
    console.log('[Demo API] Demo request:', {
      name: fullName,
      email: data.email,
      role: data.role,
      organization: data.organization,
      studentCount: data.studentCount,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you! Our team will contact you within 24 hours to schedule your demo.',
    });
  } catch (error) {
    console.error('[Demo API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process demo request' },
      { status: 500 }
    );
  }
}
