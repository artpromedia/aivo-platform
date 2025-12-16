/**
 * Research Dataset Templates API Route Handler
 */

import { NextRequest, NextResponse } from 'next/server';

const RESEARCH_SVC_URL = process.env.RESEARCH_SVC_URL || 'http://localhost:4020';

export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${RESEARCH_SVC_URL}/research/dataset-templates`, {
      headers: {
        Authorization: request.headers.get('Authorization') || '',
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Research dataset-templates fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dataset templates' },
      { status: 500 }
    );
  }
}
