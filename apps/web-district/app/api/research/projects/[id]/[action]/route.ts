/**
 * Research Project Actions API Route Handler
 * 
 * Handles submit, approve, reject, close actions.
 */

import { NextRequest, NextResponse } from 'next/server';

const RESEARCH_SVC_URL = process.env.RESEARCH_SVC_URL || 'http://localhost:4020';

interface Params {
  params: { id: string; action: string };
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id, action } = params;

  // Validate action
  const validActions = ['submit', 'approve', 'reject', 'close'];
  if (!validActions.includes(action)) {
    return NextResponse.json(
      { error: `Invalid action: ${action}` },
      { status: 400 }
    );
  }

  try {
    let body: string | undefined;
    try {
      body = await request.text();
    } catch {
      // No body
    }

    const res = await fetch(`${RESEARCH_SVC_URL}/research/projects/${id}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
      },
      body: body || undefined,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(`Research project ${action} error:`, error);
    return NextResponse.json(
      { error: `Failed to ${action} project` },
      { status: 500 }
    );
  }
}
