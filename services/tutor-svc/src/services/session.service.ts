import { prisma, TutorSessionStatus, TutorMessageRole } from '../prisma.js';
import { config } from '../config.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Service Client Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface LearnerProfile {
  id: string;
  learnerId: string;
  gradeBand: string;
  gradeLevel?: number;
  age?: number;
  learningStyle?: string;
  summary?: {
    totalSkills: number;
    byDomain: Record<string, { count: number; avgMastery: number }>;
  };
  // Accessibility profile fields
  supportsDyslexiaFriendlyFont?: boolean;
  estimatedCognitiveLoad?: 'LOW' | 'MEDIUM' | 'HIGH';
  fontPreference?: string;
  textSizePreference?: string;
}

export interface AiOrchestratorRequest {
  agentType: string;
  subject: string;
  personaSlug: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  context: {
    sessionId: string;
    subject: string;
    topic?: string;
    locale?: string;
    learnerProfile?: LearnerProfile;
  };
}

export interface AiOrchestratorResponse {
  content: string;
  metadata?: {
    model?: string;
    provider?: string;
    tokens?: number;
    latencyMs?: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Accessibility Adaptations
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build additional system-prompt instructions based on the learner's
 * accessibility profile. These are appended to the persona template.
 */
export function buildAccessibilityAdaptations(profile: LearnerProfile | null | undefined): string {
  if (!profile) return '';

  const parts: string[] = [];

  if (profile.supportsDyslexiaFriendlyFont) {
    parts.push(
      'DYSLEXIA-FRIENDLY: Use simpler sentence structure. Prefer short, common words. Avoid walls of text. Break ideas into small paragraphs.',
    );
  }

  if (profile.estimatedCognitiveLoad === 'LOW') {
    parts.push(
      'LOW COGNITIVE LOAD MODE: Keep responses under 3 sentences. Ask only one question at a time. Include frequent encouragement breaks. Use very simple vocabulary.',
    );
  }

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Emotion Detection
// ═══════════════════════════════════════════════════════════════════════════════

const EMOTION_KEYWORDS: Record<string, string[]> = {
  encouraging: ['great', 'awesome', 'excellent', 'fantastic', 'wonderful', 'amazing', 'good job', 'well done', 'keep going', 'you got this', 'proud'],
  celebrating: ['congratulations', 'hooray', 'yay', 'bravo', 'perfect', 'nailed it', 'correct', 'right answer', 'you did it'],
  empathetic: ['understand', 'it\'s okay', 'don\'t worry', 'take your time', 'no rush', 'that\'s alright', 'happens to everyone', 'it\'s normal'],
  curious: ['interesting', 'wonder', 'what if', 'think about', 'imagine', 'explore', 'discover', 'let\'s find out', 'curious'],
  thinking: ['hmm', 'let me think', 'consider', 'let\'s look at', 'let\'s figure', 'let\'s work through', 'step by step'],
  cheerful: ['hello', 'welcome', 'glad', 'happy', 'fun', 'excited', 'let\'s get started', 'ready'],
};

const AVATAR_STATE_MAP: Record<string, string> = {
  encouraging: 'talking',
  celebrating: 'celebrating',
  empathetic: 'thinking',
  curious: 'thinking',
  thinking: 'thinking',
  cheerful: 'talking',
  neutral: 'idle',
};

/**
 * Detect the emotional tone of an AI response using keyword matching
 */
export function detectEmotion(text: string): string {
  const lowerText = text.toLowerCase();
  let bestMatch = 'neutral';
  let bestScore = 0;

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    const score = keywords.filter(kw => lowerText.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = emotion;
    }
  }

  return bestMatch;
}

/**
 * Map an emotion tag to a Rive avatar animation state
 */
export function mapEmotionToAvatarState(emotion: string): string {
  return AVATAR_STATE_MAP[emotion] ?? 'idle';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Service Clients
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch learner profile from learner-model-svc virtual brain API
 */
export async function fetchLearnerProfile(learnerId: string): Promise<LearnerProfile | null> {
  try {
    const response = await fetch(
      `${config.learnerModelUrl}/virtual-brains/${learnerId}`,
      { headers: { 'Content-Type': 'application/json' } },
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      console.warn(`learner-model-svc returned ${response.status} for learnerId=${learnerId}`);
      return null;
    }

    return (await response.json()) as LearnerProfile;
  } catch (error) {
    console.warn('Failed to fetch learner profile:', error);
    return null;
  }
}

/**
 * Call the AI orchestrator to generate a response
 */
export async function callAiOrchestrator(
  request: AiOrchestratorRequest,
): Promise<AiOrchestratorResponse> {
  const response = await fetch(`${config.aiOrchestratorUrl}/api/v1/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`AI orchestrator returned ${response.status}`);
  }

  return (await response.json()) as AiOrchestratorResponse;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Session Service
// ═══════════════════════════════════════════════════════════════════════════════

export class SessionService {
  async create(params: {
    tenantId: string;
    learnerId: string;
    parentUserId?: string;
    personaId: string;
    subject: string;
    topic?: string;
    locale?: string;
    learnerProfile?: LearnerProfile | null;
  }) {
    const session = await prisma.tutorSession.create({
      data: {
        tenantId: params.tenantId,
        learnerId: params.learnerId,
        parentUserId: params.parentUserId ?? null,
        personaId: params.personaId,
        subject: params.subject,
        topic: params.topic ?? null,
        locale: params.locale ?? 'en-US',
        status: TutorSessionStatus.ACTIVE,
        masteryBefore: params.learnerProfile?.summary?.byDomain?.[params.subject]?.avgMastery ?? null,
      },
      include: { persona: true },
    });

    // Create initial analytics record
    await prisma.tutorSessionAnalytics.create({
      data: {
        sessionId: session.id,
        tenantId: params.tenantId,
        learnerId: params.learnerId,
        subject: params.subject,
        date: new Date(),
      },
    });

    // Generate AI-powered opening message via ai-orchestrator
    let greeting: string;
    let emotionTag = 'cheerful';
    let avatarState = 'talking';
    let tokensUsed = 0;
    let latencyMs = 0;

    try {
      const startTime = Date.now();
      const persona = session.persona;

      const aiResponse = await callAiOrchestrator({
        agentType: `TUTOR_${params.subject}_PREMIUM`,
        subject: params.subject,
        personaSlug: persona.slug,
        systemPrompt: persona.systemPromptTemplate,
        messages: [],
        context: {
          sessionId: session.id,
          subject: params.subject,
          topic: params.topic ?? undefined,
          locale: params.locale ?? 'en-US',
          learnerProfile: params.learnerProfile ?? undefined,
        },
      });

      greeting = aiResponse.content;
      tokensUsed = aiResponse.metadata?.tokens ?? 0;
      latencyMs = Date.now() - startTime;
      emotionTag = detectEmotion(greeting);
      avatarState = mapEmotionToAvatarState(emotionTag);
    } catch (error) {
      console.warn('AI opening message failed, using fallback:', error);
      const persona = session.persona;
      greeting = `Hi there! I'm ${persona.name}, your ${persona.subject.toLowerCase()} tutor. ${params.topic ? `I see you'd like to work on ${params.topic}. ` : ''}How can I help you today?`;
    }

    await prisma.tutorMessage.create({
      data: {
        sessionId: session.id,
        role: TutorMessageRole.ASSISTANT,
        content: greeting,
        emotionTag,
        avatarState,
        tokensUsed,
        latencyMs,
      },
    });

    return { session, openingMessage: greeting, emotionTag, avatarState };
  }

  async getById(sessionId: string) {
    return prisma.tutorSession.findUnique({
      where: { id: sessionId },
      include: { persona: true },
    });
  }

  async listByLearner(params: {
    tenantId: string;
    learnerId: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where = {
      tenantId: params.tenantId,
      learnerId: params.learnerId,
      ...(params.status ? { status: params.status as TutorSessionStatus } : {}),
    };

    const [sessions, total] = await Promise.all([
      prisma.tutorSession.findMany({
        where,
        include: { persona: true },
        orderBy: { startedAt: 'desc' },
        take: params.limit ?? 20,
        skip: params.offset ?? 0,
      }),
      prisma.tutorSession.count({ where }),
    ]);

    return { sessions, total };
  }

  async end(sessionId: string) {
    const session = await prisma.tutorSession.update({
      where: { id: sessionId },
      data: {
        status: TutorSessionStatus.COMPLETED,
        endedAt: new Date(),
      },
      include: { persona: true },
    });

    // Calculate duration
    const totalMinutes = session.endedAt && session.startedAt
      ? (session.endedAt.getTime() - session.startedAt.getTime()) / 60_000
      : 0;

    const messageCount = await prisma.tutorMessage.count({
      where: { sessionId },
    });

    const userMessageCount = await prisma.tutorMessage.count({
      where: { sessionId, role: TutorMessageRole.USER },
    });

    const assistantMessageCount = await prisma.tutorMessage.count({
      where: { sessionId, role: TutorMessageRole.ASSISTANT },
    });

    await prisma.tutorSessionAnalytics.update({
      where: { sessionId },
      data: { totalMinutes, messageCount, userMessageCount, assistantMessageCount },
    });

    return session;
  }
}

export const sessionService = new SessionService();
