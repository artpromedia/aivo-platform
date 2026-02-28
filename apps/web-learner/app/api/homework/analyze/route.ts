/**
 * POST /api/homework/analyze
 *
 * Accepts a homework problem (text and/or image) and proxies to the
 * AI Orchestrator for step-by-step analysis.
 *
 * Body: { text?: string; imageBase64?: string; subject?: string }
 * Response: { steps: Array<{ number, title, explanation, visual? }>, relatedLessons: [] }
 */

import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken } from '../../../../lib/api-route-helpers';

const AI_ORCHESTRATOR_URL =
  process.env.AI_ORCHESTRATOR_URL || 'http://localhost:3420';

interface AnalyzeBody {
  text?: string;
  imageBase64?: string;
  subject?: string;
}

interface SolutionStep {
  number: number;
  title: string;
  explanation: string;
  visual?: string;
}

interface RelatedLesson {
  id: string;
  title: string;
  href: string;
}

interface AnalyzeResponse {
  steps: SolutionStep[];
  relatedLessons: RelatedLesson[];
}

export async function POST(request: Request) {
  const payload = await getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as AnalyzeBody;

  if (!body.text && !body.imageBase64) {
    return NextResponse.json(
      { error: 'Please provide a problem (text or image).' },
      { status: 400 },
    );
  }

  const token = await getRawToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Internal-Service': 'web-learner',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${AI_ORCHESTRATOR_URL}/api/homework/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: body.text,
        imageBase64: body.imageBase64,
        subject: body.subject,
        learnerId: payload.sub,
      }),
    });

    if (!res.ok) {
      const msg =
        res.status === 429
          ? 'Too many requests — please wait a moment and try again.'
          : 'Failed to analyze the problem. Please try again.';
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const data = (await res.json()) as AnalyzeResponse;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the homework helper service.' },
      { status: 502 },
    );
  }
}
