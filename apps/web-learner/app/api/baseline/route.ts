import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ASSESSMENT_SVC_URL = process.env.ASSESSMENT_SVC_URL || 'http://localhost:3009';
const BASELINE_SVC_URL = process.env.BASELINE_SVC_URL || 'http://localhost:4011';

// Legacy format (just learning style answers)
interface LegacyBaselineAnswers {
  answers: Record<string, string | string[]>;
}

// New comprehensive format
interface ComprehensiveBaselineAnswers {
  learningStyleAnswers: Record<string, string | string[]>;
  domainAnswers: Record<string, { answer: number | string; latencyMs: number; correctAnswer?: number; domain?: string }>;
  completedAt: string;
}

type BaselineRequestBody = LegacyBaselineAnswers | ComprehensiveBaselineAnswers;

interface LearningProfile {
  preferredLearningStyle: string[];
  interests: string[];
  strengths: string[];
  challenges: string[];
  breakPreference: string;
  optimalLearningTime: string;
}

interface DomainScore {
  domain: string;
  questionsAnswered: number;
  correctAnswers: number;
  averageLatency: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BaselineRequestBody;

    // Get auth token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    // Determine format and extract answers
    let learningStyleAnswers: Record<string, string | string[]>;
    let domainAnswers: Record<string, { answer: number | string; latencyMs: number }> | undefined;
    let completedAt: string;

    if ('learningStyleAnswers' in body && 'domainAnswers' in body) {
      // Comprehensive format
      const comprehensiveBody = body;
      learningStyleAnswers = comprehensiveBody.learningStyleAnswers;
      domainAnswers = comprehensiveBody.domainAnswers;
      completedAt = comprehensiveBody.completedAt;
    } else if ('answers' in body) {
      // Legacy format
      const legacyBody = body;
      learningStyleAnswers = legacyBody.answers;
      domainAnswers = undefined;
      completedAt = new Date().toISOString();
    } else {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    // Transform learning style answers into a profile
    const learningProfile = transformToLearningProfile(learningStyleAnswers);

    // Calculate domain scores if we have domain answers
    let domainScores: DomainScore[] | undefined;
    if (domainAnswers) {
      domainScores = calculateDomainScores(domainAnswers);
    }

    // In dev mode without auth, still process the request
    const isDevMode = process.env.NODE_ENV === 'development';

    if (!authToken && !isDevMode) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Try to send to baseline service (if available)
    try {
      const baselineResponse = await fetch(`${BASELINE_SVC_URL}/api/baseline/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          type: 'COMPREHENSIVE_BASELINE',
          learningStyleAnswers,
          domainAnswers,
          learningProfile,
          domainScores,
          completedAt,
        }),
      });

      if (!baselineResponse.ok) {
        console.log('Baseline service not available, continuing with local processing');
      }
    } catch {
      console.log('Baseline service offline, storing locally');
    }

    // Try to send to assessment service (legacy support)
    try {
      await fetch(`${ASSESSMENT_SVC_URL}/api/baseline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          type: 'BASELINE_ASSESSMENT',
          answers: learningStyleAnswers,
          learningProfile,
          completedAt,
        }),
      });
    } catch {
      console.log('Assessment service offline');
    }

    // Update learner's baseline status (if authenticated)
    if (authToken) {
      try {
        await fetch(
          `${process.env.PARENT_SVC_URL || 'http://localhost:3010'}/api/learner/baseline-status`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              status: 'completed',
              learningProfile,
              domainScores,
            }),
          }
        );
      } catch {
        console.log('Parent service offline');
      }
    }

    return NextResponse.json({
      success: true,
      learningProfile,
      domainScores,
      completedAt,
    });
  } catch (error) {
    console.error('Baseline submission error:', error);
    return NextResponse.json({ error: 'Failed to save baseline assessment' }, { status: 500 });
  }
}

/**
 * Calculate domain scores from domain answers
 */
function calculateDomainScores(
  domainAnswers: Record<string, { answer: number | string; latencyMs: number; correctAnswer?: number; domain?: string }>
): DomainScore[] {
  const domainMap = new Map<string, { count: number; correct: number; totalLatency: number }>();

  for (const [questionId, answerData] of Object.entries(domainAnswers)) {
    // Use domain from enriched data, or extract from question ID as fallback
    const domainPrefix = answerData.domain || questionId.split('-')[0]?.toUpperCase() || 'UNKNOWN';
    let domain = domainPrefix;
    if (domainPrefix === 'CW') {
      domain = 'CREATIVE_WRITING';
    } else if (domainPrefix === 'LIFE') {
      domain = 'LIFE_SKILLS';
    } else if (domainPrefix === 'SPELL') {
      domain = 'SPELLING';
    }

    const existing = domainMap.get(domain) || { count: 0, correct: 0, totalLatency: 0 };
    const isCorrect = answerData.correctAnswer !== undefined
      ? answerData.answer === answerData.correctAnswer
      : false;
    domainMap.set(domain, {
      count: existing.count + 1,
      correct: existing.correct + (isCorrect ? 1 : 0),
      totalLatency: existing.totalLatency + answerData.latencyMs,
    });
  }

  return Array.from(domainMap.entries()).map(([domain, data]) => ({
    domain,
    questionsAnswered: data.count,
    correctAnswers: data.correct,
    averageLatency: Math.round(data.totalLatency / data.count),
  }));
}

/**
 * Transform raw answers into a structured learning profile
 */
function transformToLearningProfile(answers: Record<string, string | string[]>): LearningProfile {
  const profile: LearningProfile = {
    preferredLearningStyle: [],
    interests: [],
    strengths: [],
    challenges: [],
    breakPreference: 'okay',
    optimalLearningTime: 'anytime',
  };

  // Map answers to profile by category prefix
  for (const [key, value] of Object.entries(answers)) {
    if (key.startsWith('ls-') && typeof value === 'string') {
      profile.preferredLearningStyle.push(value);
    } else if (key.startsWith('int-') && Array.isArray(value)) {
      profile.interests.push(...value);
    } else if (key.startsWith('str-') && Array.isArray(value)) {
      profile.strengths.push(...value);
    } else if (key.startsWith('ch-') && Array.isArray(value)) {
      profile.challenges.push(...value.filter((v) => v !== 'none'));
    } else if (key === 'pref-1' && typeof value === 'string') {
      profile.breakPreference = value;
    } else if (key === 'pref-2' && typeof value === 'string') {
      profile.optimalLearningTime = value;
    }
  }

  return profile;
}
