/**
 * AI Safety API Route
 *
 * Proxy to ai-orchestrator for safety configuration and violation logs,
 * and to analytics-svc for AI usage statistics.
 *
 *   GET  /api/ai/safety?type=config      → GET  AI_SERVICE_URL/admin/safety/config
 *   POST /api/ai/safety  (body)          → POST AI_SERVICE_URL/admin/safety/config
 *   GET  /api/ai/safety?type=violations  → GET  AI_SERVICE_URL/admin/safety/violations
 *   GET  /api/ai/safety?type=usage       → GET  ANALYTICS_SERVICE_URL/ai/usage
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:4080';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3010';

// ---------------------------------------------------------------------------
// GET — fetch safety config, violations, or usage stats
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('Authorization') || '';
    const type = searchParams.get('type') || 'config';

    let url: string;

    switch (type) {
      case 'violations': {
        const params = new URLSearchParams();
        const page = searchParams.get('page');
        const pageSize = searchParams.get('pageSize');
        if (page) params.set('page', page);
        if (pageSize) params.set('pageSize', pageSize);
        url = `${AI_SERVICE_URL}/admin/safety/violations?${params.toString()}`;
        break;
      }
      case 'usage': {
        const params = new URLSearchParams();
        const page = searchParams.get('page');
        const pageSize = searchParams.get('pageSize');
        if (page) params.set('page', page);
        if (pageSize) params.set('pageSize', pageSize);
        url = `${ANALYTICS_SERVICE_URL}/ai/usage?${params.toString()}`;
        break;
      }
      default:
        url = `${AI_SERVICE_URL}/admin/safety/config`;
        break;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `Service error: ${text}` },
        { status: response.status },
      );
    }

    const data: unknown = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch AI safety data' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — save safety config (feature toggles + safety threshold)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const body: unknown = await request.json();

    const response = await fetch(`${AI_SERVICE_URL}/admin/safety/config`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `Service error: ${text}` },
        { status: response.status },
      );
    }

    const data: unknown = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to save AI safety config' }, { status: 500 });
  }
}
