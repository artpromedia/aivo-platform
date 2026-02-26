import { prisma, TutorSessionStatus, TutorMessageRole } from '../prisma.js';

export class SessionService {
  async create(params: {
    tenantId: string;
    learnerId: string;
    parentUserId?: string;
    personaId: string;
    subject: string;
    topic?: string;
    locale?: string;
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

    // Create system greeting message
    const persona = session.persona;
    const greeting = `Hi there! I'm ${persona.name}, your ${persona.subject.toLowerCase()} tutor. ${params.topic ? `I see you'd like to work on ${params.topic}. ` : ''}How can I help you today?`;

    await prisma.tutorMessage.create({
      data: {
        sessionId: session.id,
        role: TutorMessageRole.ASSISTANT,
        content: greeting,
        emotionTag: 'cheerful',
        avatarState: 'talking',
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
