import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const OONRUMAIL_BASE_URL = process.env.OONRUMAIL_BASE_URL || 'https://api.oonrumail.com';
const OONRUMAIL_API_KEY = process.env.OONRUMAIL_API_KEY || '';

const BASE = `${OONRUMAIL_BASE_URL}/api/v1/transactional/aivolearning/newsletter`;

const UpdateSchema = z.object({
  email: z.string().email(),
  /** Map of list slug → desired subscribed state */
  lists: z.record(z.string(), z.boolean()),
});

/**
 * GET /api/newsletter/preferences?email=user@example.com
 *
 * Returns the user's current subscription state for every available list.
 * Response shape: { preferences: { slug: string; name: string; subscribed: boolean }[] }
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { error: 'Missing email parameter.' },
      { status: 400 },
    );
  }

  try {
    // Fetch all lists
    const listsRes = await fetch(`${BASE}/lists`, {
      headers: {
        ...(OONRUMAIL_API_KEY && { Authorization: `Bearer ${OONRUMAIL_API_KEY}` }),
        Accept: 'application/json',
      },
      next: { revalidate: 300 },
    });

    if (!listsRes.ok) {
      console.error('[Newsletter Preferences] Failed to fetch lists:', listsRes.status);
      return NextResponse.json(
        { error: 'Unable to load newsletter lists.' },
        { status: 502 },
      );
    }

    const { lists } = (await listsRes.json()) as {
      lists: { slug: string; name: string }[];
    };

    // Fetch subscriber status for this email across all lists
    const subscriberRes = await fetch(
      `${BASE}/subscriber?email=${encodeURIComponent(email)}`,
      {
        headers: {
          ...(OONRUMAIL_API_KEY && { Authorization: `Bearer ${OONRUMAIL_API_KEY}` }),
          Accept: 'application/json',
        },
      },
    );

    // If subscriber endpoint returns data, merge; otherwise default to unsubscribed
    let subscribedSlugs: string[] = [];
    if (subscriberRes.ok) {
      const subData = await subscriberRes.json();
      subscribedSlugs = subData.lists?.map((l: { slug: string }) => l.slug) ?? [];
    }

    const preferences = lists.map((l) => ({
      slug: l.slug,
      name: l.name,
      subscribed: subscribedSlugs.includes(l.slug),
    }));

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('[Newsletter Preferences] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load preferences.' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/newsletter/preferences
 *
 * Body: { email: string, lists: { "weekly-digest": true, "course-announcements": false } }
 *
 * Subscribes or unsubscribes the user from each list accordingly.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body.', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { email, lists } = parsed.data;
    const results: { slug: string; action: string; ok: boolean }[] = [];

    // Process each list change in parallel
    const ops = Object.entries(lists).map(async ([slug, subscribe]) => {
      const method = subscribe ? 'POST' : 'DELETE';
      try {
        const res = await fetch(`${BASE}/subscribe`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(OONRUMAIL_API_KEY && { Authorization: `Bearer ${OONRUMAIL_API_KEY}` }),
          },
          body: JSON.stringify({ email, list: slug }),
        });
        results.push({
          slug,
          action: subscribe ? 'subscribed' : 'unsubscribed',
          ok: res.ok,
        });
      } catch {
        results.push({ slug, action: subscribe ? 'subscribe' : 'unsubscribe', ok: false });
      }
    });

    await Promise.all(ops);

    const allOk = results.every((r) => r.ok);

    return NextResponse.json(
      {
        status: allOk ? 'updated' : 'partial',
        message: allOk
          ? 'Your preferences have been saved.'
          : 'Some changes could not be applied.',
        results,
      },
      { status: allOk ? 200 : 207 },
    );
  } catch (error) {
    console.error('[Newsletter Preferences] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences.' },
      { status: 500 },
    );
  }
}
