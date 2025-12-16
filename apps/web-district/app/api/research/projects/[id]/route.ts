/**
 * Research Project by ID API Route Handler
 * 
 * Proxies requests to the research-svc microservice.
 */

import { NextRequest, NextResponse } from 'next/server';

const RESEARCH_SVC_URL = process.env.RESEARCH_SVC_URL || 'http://localhost:4020';

interface Params {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = params;
  
  try {
    const res = await fetch(`${RESEARCH_SVC_URL}/research/projects/${id}`, {
      headers: {
        Authorization: request.headers.get('Authorization') || '',
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Research project fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = params;
  
  try {
    const body = await request.json();

    const res = await fetch(`${RESEARCH_SVC_URL}/research/projects/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Research project update error:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}
