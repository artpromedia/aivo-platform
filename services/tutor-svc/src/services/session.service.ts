import { prisma, SessionStatus, TutorSubject, MessageRole, EmotionType } from '../prisma.js';

export class SessionService {
  async create(params: {
    tenantId: string;
    learnerId: string;
    personaId: string;
    subject: string;
    topic?: string;
  }) {
    const session = await prisma.tutorSession.create({
      data: {
        tenantId: params.tenantId,
        learnerId: params.learnerId,
        personaId: params.personaId,
        subject: params.subject as TutorSubject,
        topic: params.topic ?? null,
        status: SessionStatus.ACTIVE,
      },
      include: { persona: true },
    });

    // Create initial analytics record
    await prisma.tutorSessionAnalytics.create({
      data: { sessionId: session.id },
    });

    // Create system greeting message
    const persona = session.persona;
    const greeting = `Hi there! I'm ${persona.name}, your ${persona.subject.toLowerCase()} tutor. ${params.topic ? `I see you'd like to work on ${params.topic}. ` : ''}How can I help you today?`;

    await prisma.tutorMessage.create({
      data: {
        sessionId: session.id,
        role: MessageRole.ASSISTANT,
        content: greeting,
        emotion: EmotionType.HAPPY,
      },
    });

    return session;
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
      ...(params.status ? { status: params.status as SessionStatus } : {}),
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
        status: SessionStatus.COMPLETED,
        endedAt: new Date(),
      },
      include: { persona: true },
    });

    // Update analytics with duration
    const durationSeconds = session.endedAt && session.startedAt
      ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000)
      : 0;

    const messageCount = await prisma.tutorMessage.count({
      where: { sessionId },
    });

    const userMessageCount = await prisma.tutorMessage.count({
      where: { sessionId, role: MessageRole.USER },
    });

    await prisma.tutorSessionAnalytics.update({
      where: { sessionId },
      data: { durationSeconds, messageCount, userMessageCount },
    });

    return session;
  }

  async updateLastActive(sessionId: string) {
    await prisma.tutorSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });
  }
}

export const sessionService = new SessionService();
