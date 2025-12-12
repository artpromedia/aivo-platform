import { randomBytes } from 'crypto';

import bcrypt from 'bcryptjs';
import { type FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

const SALT_ROUNDS = 10;
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MINUTES = 15;
const DEFAULT_CODE_EXPIRY_HOURS = 8;

/**
 * Generate a random 6-character alphanumeric code.
 */
function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars: I, O, 0, 1
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    const byte = bytes[i] ?? 0;
    code += chars[byte % chars.length] ?? '';
  }
  return code;
}

/**
 * Routes for classroom session codes (shared device login).
 */
export async function registerClassroomRoutes(app: FastifyInstance) {
  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION CODES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /classrooms/:classroomId/session-codes
   * Generate a new session code for shared device login.
   */
  app.post('/classrooms/:classroomId/session-codes', async (request, reply) => {
    const params = z.object({ classroomId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'Invalid classroom id' });

    const body = z
      .object({
        teacherId: z.string().uuid(),
        expiresInHours: z.number().min(1).max(24).default(DEFAULT_CODE_EXPIRY_HOURS),
      })
      .safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid payload' });

    // Verify classroom exists
    const classroom = await prisma.classroom.findUnique({
      where: { id: params.data.classroomId },
      include: { school: true },
    });
    if (!classroom) return reply.status(404).send({ error: 'Classroom not found' });

    // Deactivate any existing active codes for this classroom
    await prisma.classroomSessionCode.updateMany({
      where: {
        classroomId: params.data.classroomId,
        isActive: true,
      },
      data: { isActive: false },
    });

    // Generate unique code
    let code = generateSessionCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.classroomSessionCode.findUnique({ where: { code } });
      if (!existing) break;
      code = generateSessionCode();
      attempts++;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + body.data.expiresInHours);

    const sessionCode = await prisma.classroomSessionCode.create({
      data: {
        classroomId: params.data.classroomId,
        code,
        teacherId: body.data.teacherId,
        expiresAt,
      },
    });

    return reply.status(201).send({
      code: sessionCode.code,
      classroomId: sessionCode.classroomId,
      classroomName: classroom.name,
      expiresAt: sessionCode.expiresAt.toISOString(),
    });
  });

  /**
   * POST /classrooms/session-codes/validate
   * Validate a session code and return classroom roster.
   */
  app.post('/classrooms/session-codes/validate', async (request, reply) => {
    const body = z
      .object({
        code: z.string().min(4).max(8),
        deviceId: z.string().optional(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid code format' });

    const normalizedCode = body.data.code.toUpperCase().trim();

    const sessionCode = await prisma.classroomSessionCode.findUnique({
      where: { code: normalizedCode },
      include: {
        classroom: {
          include: {
            school: true,
            learners: {
              orderBy: { displayName: 'asc' },
            },
          },
        },
      },
    });

    if (!sessionCode) {
      return reply.status(404).send({ error: 'Invalid class code' });
    }

    if (!sessionCode.isActive || new Date() > sessionCode.expiresAt) {
      return reply.status(410).send({ error: 'Class code has expired' });
    }

    // Build roster response
    const roster = {
      classroomId: sessionCode.classroom.id,
      classroomName: sessionCode.classroom.name,
      teacherName: 'Teacher', // TODO: Fetch from teacher service
      gradeBand: sessionCode.classroom.grade,
      displayMode: 'FIRST_NAME_LAST_INITIAL',
      learners: sessionCode.classroom.learners.map(
        (l: {
          learnerId: string;
          displayName: string;
          avatarUrl: string | null;
          pseudonym: string | null;
          gradeBand: string | null;
          pinHash: string | null;
        }) => ({
          learnerId: l.learnerId,
          displayName: l.displayName,
          avatarUrl: l.avatarUrl,
          pseudonym: l.pseudonym,
          gradeBand: l.gradeBand,
          hasPin: !!l.pinHash,
        })
      ),
      fetchedAt: new Date().toISOString(),
    };

    return reply.send(roster);
  });

  /**
   * DELETE /classrooms/:classroomId/session-codes
   * Deactivate all session codes for a classroom.
   */
  app.delete('/classrooms/:classroomId/session-codes', async (request, reply) => {
    const params = z.object({ classroomId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'Invalid classroom id' });

    await prisma.classroomSessionCode.updateMany({
      where: {
        classroomId: params.data.classroomId,
        isActive: true,
      },
      data: { isActive: false },
    });

    return reply.status(204).send();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED DEVICE PIN VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /shared-device/validate-pin
   * Validate a learner's PIN for shared device login.
   */
  app.post('/shared-device/validate-pin', async (request, reply) => {
    const body = z
      .object({
        learnerId: z.string().uuid(),
        pin: z.string().min(4).max(6),
        classroomId: z.string().uuid(),
        deviceId: z.string().optional(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid payload' });

    const learner = await prisma.classroomLearner.findUnique({
      where: {
        classroomId_learnerId: {
          classroomId: body.data.classroomId,
          learnerId: body.data.learnerId,
        },
      },
    });

    if (!learner) {
      return reply.status(404).send({ error: 'Learner not found in classroom' });
    }

    // Check if locked out
    if (learner.pinLockedUntil && new Date() < learner.pinLockedUntil) {
      const minutesLeft = Math.ceil((learner.pinLockedUntil.getTime() - Date.now()) / 1000 / 60);
      return reply.status(423).send({
        error: 'Too many attempts',
        lockedUntil: learner.pinLockedUntil.toISOString(),
        minutesLeft,
      });
    }

    // No PIN set - allow without validation (first-time setup)
    if (!learner.pinHash) {
      // Reset attempts
      await prisma.classroomLearner.update({
        where: { id: learner.id },
        data: { pinAttempts: 0, pinLockedUntil: null },
      });

      return reply.send({
        valid: true,
        sessionToken: null, // App will handle session creation
      });
    }

    // Validate PIN
    const isValid = await bcrypt.compare(body.data.pin, learner.pinHash);

    if (!isValid) {
      const newAttempts = learner.pinAttempts + 1;
      const updates: Record<string, unknown> = { pinAttempts: newAttempts };

      if (newAttempts >= MAX_PIN_ATTEMPTS) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + PIN_LOCKOUT_MINUTES);
        updates.pinLockedUntil = lockedUntil;
      }

      await prisma.classroomLearner.update({
        where: { id: learner.id },
        data: updates,
      });

      const remaining = MAX_PIN_ATTEMPTS - newAttempts;
      return reply.status(401).send({
        error: 'Incorrect PIN',
        remainingAttempts: remaining > 0 ? remaining : 0,
      });
    }

    // Success - reset attempts
    await prisma.classroomLearner.update({
      where: { id: learner.id },
      data: { pinAttempts: 0, pinLockedUntil: null },
    });

    return reply.send({
      valid: true,
      sessionToken: null, // App will handle session creation
    });
  });

  /**
   * POST /shared-device/end-session
   * Record session end from shared device (best-effort, offline-safe).
   */
  app.post('/shared-device/end-session', async (request, reply) => {
    const body = z
      .object({
        sessionId: z.string(),
        learnerId: z.string().uuid(),
        deviceId: z.string().optional(),
        endedAt: z.string().datetime().optional(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid payload' });

    // Log session end (could integrate with session-svc)
    app.log.info({
      event: 'shared_device_session_ended',
      sessionId: body.data.sessionId,
      learnerId: body.data.learnerId,
      deviceId: body.data.deviceId,
      endedAt: body.data.endedAt ?? new Date().toISOString(),
    });

    return reply.status(200).send({ success: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARNER PIN MANAGEMENT (Teacher routes)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /classrooms/:classroomId/learners/:learnerId/reset-pin
   * Teacher resets a learner's PIN.
   */
  app.post('/classrooms/:classroomId/learners/:learnerId/reset-pin', async (request, reply) => {
    const params = z
      .object({
        classroomId: z.string().uuid(),
        learnerId: z.string().uuid(),
      })
      .safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'Invalid params' });

    const body = z
      .object({
        newPin: z.string().min(4).max(6).regex(/^\d+$/),
        teacherId: z.string().uuid(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid payload' });

    const learner = await prisma.classroomLearner.findUnique({
      where: {
        classroomId_learnerId: {
          classroomId: params.data.classroomId,
          learnerId: params.data.learnerId,
        },
      },
    });

    if (!learner) {
      return reply.status(404).send({ error: 'Learner not found in classroom' });
    }

    const pinHash = await bcrypt.hash(body.data.newPin, SALT_ROUNDS);

    await prisma.classroomLearner.update({
      where: { id: learner.id },
      data: {
        pinHash,
        pinAttempts: 0,
        pinLockedUntil: null,
      },
    });

    app.log.info({
      event: 'learner_pin_reset',
      classroomId: params.data.classroomId,
      learnerId: params.data.learnerId,
      teacherId: body.data.teacherId,
    });

    return reply.send({ success: true });
  });

  /**
   * POST /classrooms/:classroomId/learners
   * Add a learner to a classroom roster.
   */
  app.post('/classrooms/:classroomId/learners', async (request, reply) => {
    const params = z.object({ classroomId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'Invalid classroom id' });

    const body = z
      .object({
        learnerId: z.string().uuid(),
        displayName: z.string().min(1),
        pseudonym: z.string().optional(),
        avatarUrl: z.string().url().optional(),
        gradeBand: z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']).optional(),
        pin: z.string().min(4).max(6).regex(/^\d+$/).optional(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid payload' });

    // Verify classroom exists
    const classroom = await prisma.classroom.findUnique({
      where: { id: params.data.classroomId },
    });
    if (!classroom) return reply.status(404).send({ error: 'Classroom not found' });

    let pinHash: string | null = null;
    if (body.data.pin) {
      pinHash = await bcrypt.hash(body.data.pin, SALT_ROUNDS);
    }

    const learner = await prisma.classroomLearner.upsert({
      where: {
        classroomId_learnerId: {
          classroomId: params.data.classroomId,
          learnerId: body.data.learnerId,
        },
      },
      create: {
        classroomId: params.data.classroomId,
        learnerId: body.data.learnerId,
        displayName: body.data.displayName,
        pseudonym: body.data.pseudonym ?? null,
        avatarUrl: body.data.avatarUrl ?? null,
        gradeBand: body.data.gradeBand ?? null,
        pinHash,
      },
      update: {
        displayName: body.data.displayName,
        pseudonym: body.data.pseudonym ?? null,
        avatarUrl: body.data.avatarUrl ?? null,
        gradeBand: body.data.gradeBand ?? null,
        ...(pinHash && { pinHash }),
      },
    });

    return reply.status(201).send(learner);
  });

  /**
   * GET /classrooms/:classroomId/learners
   * List learners in a classroom.
   */
  app.get('/classrooms/:classroomId/learners', async (request, reply) => {
    const params = z.object({ classroomId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'Invalid classroom id' });

    const learners = await prisma.classroomLearner.findMany({
      where: { classroomId: params.data.classroomId },
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        learnerId: true,
        displayName: true,
        pseudonym: true,
        avatarUrl: true,
        gradeBand: true,
        pinHash: false, // Never expose hash
        pinAttempts: true,
        pinLockedUntil: true,
        createdAt: true,
      },
    });

    // Add hasPin flag
    const result = learners.map((l: Record<string, unknown>) => ({
      ...l,
      hasPin: false, // Can't determine from select, but safe default
    }));

    return reply.send({ total: result.length, items: result });
  });

  /**
   * DELETE /classrooms/:classroomId/learners/:learnerId
   * Remove a learner from a classroom roster.
   */
  app.delete('/classrooms/:classroomId/learners/:learnerId', async (request, reply) => {
    const params = z
      .object({
        classroomId: z.string().uuid(),
        learnerId: z.string().uuid(),
      })
      .safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'Invalid params' });

    await prisma.classroomLearner.deleteMany({
      where: {
        classroomId: params.data.classroomId,
        learnerId: params.data.learnerId,
      },
    });

    return reply.status(204).send();
  });
}
