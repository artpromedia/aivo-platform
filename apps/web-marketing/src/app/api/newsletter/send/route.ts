import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const OONRUMAIL_BASE_URL = process.env.OONRUMAIL_BASE_URL || 'https://api.oonrumail.com';
const OONRUMAIL_API_KEY = process.env.OONRUMAIL_API_KEY || '';
const NEWSLETTER_ADMIN_SECRET = process.env.NEWSLETTER_ADMIN_SECRET || '';

const RecipientSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

const SendSchema = z.object({
  list: z.string().min(1),
  subject: z.string().min(1),
  headerTitle: z.string().optional(),
  previewText: z.string().optional(),
  contentHtml: z.string().min(1),
  contentText: z.string().optional(),
  /** When provided, send to these specific recipients instead of the full list. */
  recipients: z.array(RecipientSchema).optional(),
});

/**
 * POST /api/newsletter/send
 *
 * Admin-only endpoint to dispatch a newsletter issue via OonruMail.
 * Protected by the X-Admin-Secret header.
 *
 * If `recipients` is omitted OonruMail will send to all confirmed
 * subscribers of the given `list` automatically.
 */
export async function POST(request: NextRequest) {
  // ── Auth gate ──────────────────────────────────────────────────────────
  const secret = request.headers.get('X-Admin-Secret');
  if (!NEWSLETTER_ADMIN_SECRET || secret !== NEWSLETTER_ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = SendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body.', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { list, subject, headerTitle, previewText, contentHtml, contentText, recipients } =
      parsed.data;

    // ── Forward to OonruMail send endpoint ─────────────────────────────
    const payload: Record<string, unknown> = {
      list,
      subject,
      contentHtml,
    };
    if (headerTitle) payload.headerTitle = headerTitle;
    if (previewText) payload.previewText = previewText;
    if (contentText) payload.contentText = contentText;
    if (recipients && recipients.length > 0) payload.recipients = recipients;

    const res = await fetch(
      `${OONRUMAIL_BASE_URL}/api/v1/transactional/aivolearning/newsletter/send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': OONRUMAIL_API_KEY,
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[Newsletter Send] OonruMail error:', res.status, data);
      return NextResponse.json(
        { error: data.message || 'Failed to send newsletter.', details: data },
        { status: res.status },
      );
    }

    console.log('[Newsletter Send] Dispatched:', {
      list,
      subject,
      recipientCount: recipients?.length ?? 'all-confirmed',
      response: data,
    });

    return NextResponse.json({
      status: 'sent',
      message: data.message ?? 'Newsletter dispatched successfully.',
      ...data,
    });
  } catch (error) {
    console.error('[Newsletter Send] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process send request.' },
      { status: 500 },
    );
  }
}
