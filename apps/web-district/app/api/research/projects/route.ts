/**
 * Research Projects API Route Handler
 * 
 * Proxies requests to the research-svc microservice.
 */

import { NextRequest, NextResponse } from 'next/server';

const RESEARCH_SVC_URL = process.env.RESEARCH_SVC_URL || 'http://localhost:4020';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  
  try {
    const res = await fetch(
      `${RESEARCH_SVC_URL}/research/projects${queryString ? `?${queryString}` : ''}`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Research projects fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${RESEARCH_SVC_URL}/research/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Research project create error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
