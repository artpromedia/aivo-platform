/**
 * Public API Routes - Sandbox versions of Aivo APIs
 * 
 * These endpoints mirror the production API but serve synthetic sandbox data
 */

import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

/**
 * API Key authentication hook
 */
async function authenticateApiKey(request: any, reply: any, prisma: PrismaClient) {
  const apiKey = request.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return reply.status(401).send({
      error: 'unauthorized',
      message: 'Missing X-API-Key header',
    });
  }

  const keyHash = createHash('sha256').update(apiKey).digest('hex');

  const key = await prisma.sandboxApiKey.findUnique({
    where: { keyHash },
    include: {
      tenant: true,
    },
  });

  if (!key) {
    return reply.status(401).send({
      error: 'unauthorized',
      message: 'Invalid API key',
    });
  }

  if (key.status !== 'ACTIVE') {
    return reply.status(401).send({
      error: 'unauthorized',
      message: `API key is ${key.status.toLowerCase()}`,
    });
  }

  if (key.expiresAt && key.expiresAt < new Date()) {
    return reply.status(401).send({
      error: 'unauthorized',
      message: 'API key has expired',
    });
  }

  // Update last used timestamp
  await prisma.sandboxApiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  // Log API usage
  await prisma.sandboxApiUsageLog.create({
    data: {
      tenantId: key.tenantId,
      apiKeyId: key.id,
      endpoint: request.url,
      method: request.method,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? 'unknown',
    },
  });

  request.apiKey = key;
  request.tenant = key.tenant;
}

export const publicApiRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify;

  // Authentication hook for all routes
  fastify.addHook('preHandler', async (request, reply) => {
    await authenticateApiKey(request, reply, prisma);
  });

  // =====================
  // LEARNERS
  // =====================

  // List learners
  fastify.get('/learners', async (request: any, reply) => {
    const { limit = '50', offset = '0', search } = request.query as {
      limit?: string;
      offset?: string;
      search?: string;
    };

    const tenant = request.tenant;

    const where: any = { tenantId: tenant.id };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const learners = await prisma.sandboxSyntheticLearner.findMany({
      where,
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      orderBy: { lastName: 'asc' },
    });

    const total = await prisma.sandboxSyntheticLearner.count({ where });

    return {
      data: learners.map(l => ({
        id: l.id,
        externalId: l.externalId,
        firstName: l.firstName,
        lastName: l.lastName,
        email: l.email,
        gradeLevel: l.gradeLevel,
        metadata: l.metadataJson,
      })),
      pagination: {
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        hasMore: parseInt(offset, 10) + parseInt(limit, 10) < total,
      },
    };
  });

  // Get learner by ID
  fastify.get('/learners/:learnerId', async (request: any, reply) => {
    const { learnerId } = request.params as { learnerId: string };
    const tenant = request.tenant;

    const learner = await prisma.sandboxSyntheticLearner.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [{ id: learnerId }, { externalId: learnerId }],
      },
      include: {
        enrollments: {
          include: {
            class: {
              select: { id: true, name: true, externalId: true },
            },
          },
        },
      },
    });

    if (!learner) {
      return reply.status(404).send({ error: 'learner_not_found' });
    }

    return {
      id: learner.id,
      externalId: learner.externalId,
      firstName: learner.firstName,
      lastName: learner.lastName,
      email: learner.email,
      gradeLevel: learner.gradeLevel,
      metadata: learner.metadataJson,
      enrollments: learner.enrollments.map(e => ({
        classId: e.class.id,
        classExternalId: e.class.externalId,
        className: e.class.name,
        role: e.role,
        enrolledAt: e.createdAt,
      })),
    };
  });

  // Get learner progress
  fastify.get('/learners/:learnerId/progress', async (request: any, reply) => {
    const { learnerId } = request.params as { learnerId: string };
    const { startDate, endDate, skillDomain } = request.query as {
      startDate?: string;
      endDate?: string;
      skillDomain?: string;
    };
    const tenant = request.tenant;

    const learner = await prisma.sandboxSyntheticLearner.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [{ id: learnerId }, { externalId: learnerId }],
      },
    });

    if (!learner) {
      return reply.status(404).send({ error: 'learner_not_found' });
    }

    const progress = await prisma.sandboxSyntheticLearnerProgress.findMany({
      where: {
        learnerId: learner.id,
        ...(skillDomain && { skillDomain }),
        ...(startDate && endDate && {
          recordedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });

    return {
      learnerId: learner.id,
      progress: progress.map(p => ({
        skillDomain: p.skillDomain,
        skillId: p.skillId,
        masteryLevel: p.masteryLevel,
        progressPct: p.progressPct,
        lastPracticed: p.lastPracticed,
        recordedAt: p.recordedAt,
      })),
    };
  });

  // =====================
  // CLASSES
  // =====================

  // List classes
  fastify.get('/classes', async (request: any, reply) => {
    const { limit = '50', offset = '0' } = request.query as {
      limit?: string;
      offset?: string;
    };
    const tenant = request.tenant;

    const classes = await prisma.sandboxSyntheticClass.findMany({
      where: { tenantId: tenant.id },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    const total = await prisma.sandboxSyntheticClass.count({
      where: { tenantId: tenant.id },
    });

    return {
      data: classes.map(c => ({
        id: c.id,
        externalId: c.externalId,
        name: c.name,
        subject: c.subject,
        gradeLevel: c.gradeLevel,
        teacher: c.teacher ? {
          id: c.teacher.id,
          name: `${c.teacher.firstName} ${c.teacher.lastName}`,
        } : null,
        studentCount: c._count.enrollments,
      })),
      pagination: {
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    };
  });

  // Get class details
  fastify.get('/classes/:classId', async (request: any, reply) => {
    const { classId } = request.params as { classId: string };
    const tenant = request.tenant;

    const cls = await prisma.sandboxSyntheticClass.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [{ id: classId }, { externalId: classId }],
      },
      include: {
        teacher: true,
        enrollments: {
          include: {
            learner: {
              select: { id: true, externalId: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!cls) {
      return reply.status(404).send({ error: 'class_not_found' });
    }

    return {
      id: cls.id,
      externalId: cls.externalId,
      name: cls.name,
      subject: cls.subject,
      gradeLevel: cls.gradeLevel,
      teacher: cls.teacher ? {
        id: cls.teacher.id,
        firstName: cls.teacher.firstName,
        lastName: cls.teacher.lastName,
        email: cls.teacher.email,
      } : null,
      students: cls.enrollments.map(e => ({
        id: e.learner.id,
        externalId: e.learner.externalId,
        firstName: e.learner.firstName,
        lastName: e.learner.lastName,
        enrolledAt: e.createdAt,
      })),
    };
  });

  // =====================
  // SESSIONS
  // =====================

  // List sessions for a learner
  fastify.get('/learners/:learnerId/sessions', async (request: any, reply) => {
    const { learnerId } = request.params as { learnerId: string };
    const { limit = '20', offset = '0', startDate, endDate } = request.query as {
      limit?: string;
      offset?: string;
      startDate?: string;
      endDate?: string;
    };
    const tenant = request.tenant;

    const learner = await prisma.sandboxSyntheticLearner.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [{ id: learnerId }, { externalId: learnerId }],
      },
    });

    if (!learner) {
      return reply.status(404).send({ error: 'learner_not_found' });
    }

    const where: any = { learnerId: learner.id };
    if (startDate && endDate) {
      where.startedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const sessions = await prisma.sandboxSyntheticSession.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    });

    const total = await prisma.sandboxSyntheticSession.count({ where });

    return {
      data: sessions.map(s => ({
        id: s.id,
        sessionType: s.sessionType,
        skillDomain: s.skillDomain,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        durationSeconds: s.durationSeconds,
        questionsAttempted: s.questionsAttempted,
        questionsCorrect: s.questionsCorrect,
        accuracyPct: s.accuracyPct,
        xpEarned: s.xpEarned,
      })),
      pagination: {
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    };
  });

  // Get session details
  fastify.get('/sessions/:sessionId', async (request: any, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const tenant = request.tenant;

    const session = await prisma.sandboxSyntheticSession.findFirst({
      where: {
        id: sessionId,
        learner: { tenantId: tenant.id },
      },
      include: {
        learner: {
          select: { id: true, externalId: true, firstName: true, lastName: true },
        },
      },
    });

    if (!session) {
      return reply.status(404).send({ error: 'session_not_found' });
    }

    return {
      id: session.id,
      learner: session.learner,
      sessionType: session.sessionType,
      skillDomain: session.skillDomain,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      durationSeconds: session.durationSeconds,
      questionsAttempted: session.questionsAttempted,
      questionsCorrect: session.questionsCorrect,
      accuracyPct: session.accuracyPct,
      xpEarned: session.xpEarned,
      eventsJson: session.eventsJson,
    };
  });

  // =====================
  // ANALYTICS
  // =====================

  // Class analytics
  fastify.get('/classes/:classId/analytics', async (request: any, reply) => {
    const { classId } = request.params as { classId: string };
    const { startDate, endDate } = request.query as {
      startDate?: string;
      endDate?: string;
    };
    const tenant = request.tenant;

    const cls = await prisma.sandboxSyntheticClass.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [{ id: classId }, { externalId: classId }],
      },
      include: {
        enrollments: {
          include: {
            learner: {
              include: {
                sessions: {
                  where: startDate && endDate ? {
                    startedAt: {
                      gte: new Date(startDate),
                      lte: new Date(endDate),
                    },
                  } : undefined,
                },
                progress: true,
              },
            },
          },
        },
      },
    });

    if (!cls) {
      return reply.status(404).send({ error: 'class_not_found' });
    }

    // Calculate class-level metrics
    const allSessions = cls.enrollments.flatMap(e => e.learner.sessions);
    const allProgress = cls.enrollments.flatMap(e => e.learner.progress);

    const totalMinutes = allSessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0) / 60, 0);
    const totalQuestions = allSessions.reduce((sum, s) => sum + s.questionsAttempted, 0);
    const totalCorrect = allSessions.reduce((sum, s) => sum + s.questionsCorrect, 0);

    // Group progress by skill domain
    const skillDomainAverages: Record<string, { total: number; count: number }> = {};
    allProgress.forEach(p => {
      if (!skillDomainAverages[p.skillDomain]) {
        skillDomainAverages[p.skillDomain] = { total: 0, count: 0 };
      }
      skillDomainAverages[p.skillDomain].total += p.progressPct;
      skillDomainAverages[p.skillDomain].count += 1;
    });

    return {
      classId: cls.id,
      className: cls.name,
      period: { startDate, endDate },
      metrics: {
        totalStudents: cls.enrollments.length,
        totalSessions: allSessions.length,
        totalMinutesPracticed: Math.round(totalMinutes),
        avgMinutesPerStudent: Math.round(totalMinutes / (cls.enrollments.length || 1)),
        totalQuestionsAttempted: totalQuestions,
        totalQuestionsCorrect: totalCorrect,
        avgAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      },
      skillDomainProgress: Object.entries(skillDomainAverages).map(([domain, data]) => ({
        skillDomain: domain,
        avgProgress: Math.round(data.total / data.count),
      })),
      studentSummaries: cls.enrollments.map(e => {
        const studentSessions = e.learner.sessions;
        const studentMins = studentSessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0) / 60, 0);
        const studentQuestions = studentSessions.reduce((sum, s) => sum + s.questionsAttempted, 0);
        const studentCorrect = studentSessions.reduce((sum, s) => sum + s.questionsCorrect, 0);

        return {
          learnerId: e.learner.id,
          firstName: e.learner.firstName,
          lastName: e.learner.lastName,
          sessions: studentSessions.length,
          minutesPracticed: Math.round(studentMins),
          questionsAttempted: studentQuestions,
          accuracy: studentQuestions > 0 ? Math.round((studentCorrect / studentQuestions) * 100) : 0,
        };
      }),
    };
  });
};
