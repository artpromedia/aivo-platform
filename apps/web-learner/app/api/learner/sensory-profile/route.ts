/**
 * GET  /api/learner/sensory-profile → fetch sensory preferences
 * PUT  /api/learner/sensory-profile → save sensory preferences
 *
 * Proxies to PROFILE_SVC_URL /api/learners/:learnerId/sensory-profile
 */

import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken, proxyGet } from '../../../../lib/api-route-helpers';

const PROFILE_SVC_URL = process.env.PROFILE_SVC_URL || 'http://localhost:3440';

export interface SensoryProfile {
  brightness: number;     // 0-100
  contrast: number;       // 0-100
  colorOverlay: string;   // 'none' | 'warm' | 'cool' | 'sepia' | 'green'
  volume: number;         // 0-100
  backgroundSounds: boolean;
  fontSize: number;       // 14-24
  lineSpacing: number;    // 1.0-2.5
  dyslexiaFont: boolean;
  reduceAnimations: boolean;
}

export async function GET() {
  const payload = await getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getRawToken();
  const result = await proxyGet<SensoryProfile>(
    PROFILE_SVC_URL,
    `/api/learners/${payload.sub}/sensory-profile`,
    token,
  );

  // Return defaults if profile service has no record yet
  return NextResponse.json(result ?? {
    brightness: 100,
    contrast: 100,
    colorOverlay: 'none',
    volume: 80,
    backgroundSounds: false,
    fontSize: 16,
    lineSpacing: 1.5,
    dyslexiaFont: false,
    reduceAnimations: false,
  });
}

export async function PUT(request: Request) {
  const payload = await getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getRawToken();
  const body = await request.json();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Internal-Service': 'web-learner',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(
      `${PROFILE_SVC_URL}/api/learners/${payload.sub}/sensory-profile`,
      { method: 'PUT', headers, body: JSON.stringify(body) },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to save sensory profile.' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Could not reach profile service.' },
      { status: 502 },
    );
  }
}
