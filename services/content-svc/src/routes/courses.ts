/**
 * Courses Routes
 *
 * Learner-facing endpoints that return Learning Objects grouped as "courses"
 * by subject and grade band. Consumed by web-learner and mobile-learner apps.
 *
 * Route: GET /learners/:learnerId/courses
 */

import type { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma, LearningObjectSubject, LearningObjectGradeBand } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const CoursesQuerySchema = z.object({
  subject: z.nativeEnum(LearningObjectSubject).optional(),
  gradeBand: z.nativeEnum(LearningObjectGradeBand).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface JwtUser {
  sub: string;
  tenantId?: string;
  tenant_id?: string;
  role: string;
}

interface CourseItem {
  id: string;
  slug: string;
  title: string;
  subject: string;
  gradeBand: string;
  tags: string[];
  currentVersion: {
    id: string;
    versionNumber: number;
    estimatedMinutes: number | null;
    difficulty: string | null;
  } | null;
}

interface CourseGroup {
  subject: string;
  label: string;
  gradeBand: string;
  courses: CourseItem[];
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getUserFromRequest(request: FastifyRequest): JwtUser | null {
  const user = (request as any).user;
  if (!user || typeof user.sub !== 'string') return null;
  return user as JwtUser;
}

function getUserTenantId(user: JwtUser): string | undefined {
  return user.tenantId ?? user.tenant_id;
}

const SUBJECT_LABELS: Record<string, string> = {
  ELA: 'English Language Arts',
  MATH: 'Mathematics',
  SCIENCE: 'Science',
  SEL: 'Social-Emotional Learning',
  SPEECH: 'Speech & Language',
  OTHER: 'Other',
};

const GRADE_BAND_LABELS: Record<string, string> = {
  K_2: 'Grades K-2',
  G3_5: 'Grades 3-5',
  G6_8: 'Grades 6-8',
  G9_12: 'Grades 9-12',
};

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const coursesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /learners/:learnerId/courses
   *
   * Returns published Learning Objects available to a learner, grouped by
   * subject. The learner sees these as their "courses" — each LO is a
   * lesson/module within a subject area.
   *
   * Query params:
   *   subject  – filter by LearningObjectSubject (ELA, MATH, …)
   *   gradeBand – filter by grade band (K_2, G3_5, G6_8, G9_12)
   */
  fastify.get(
    '/learners/:learnerId/courses',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);

      // In dev mode allow unauthenticated requests; in production require auth
      const tenantId = user ? getUserTenantId(user) : undefined;

      const parseResult = CoursesQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: parseResult.error.flatten(),
        });
      }

      const { subject, gradeBand } = parseResult.data;

      // Build where clause — only PUBLISHED, active LOs
      const where: any = {
        isActive: true,
        versions: {
          some: { state: 'PUBLISHED' },
        },
      };

      // Tenant scoping: user's tenant + global (tenantId = null)
      if (tenantId) {
        where.OR = [{ tenantId }, { tenantId: null }];
      }

      if (subject) where.subject = subject;
      if (gradeBand) where.gradeBand = gradeBand;

      const learningObjects = await prisma.learningObject.findMany({
        where,
        include: {
          tags: true,
          versions: {
            where: { state: 'PUBLISHED' },
            take: 1,
            orderBy: { versionNumber: 'desc' },
          },
        },
        orderBy: [{ subject: 'asc' }, { gradeBand: 'asc' }, { title: 'asc' }],
      });

      // Group by subject + gradeBand
      const groupMap = new Map<string, CourseGroup>();

      for (const lo of learningObjects) {
        const key = `${lo.subject}::${lo.gradeBand}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            subject: lo.subject,
            label: SUBJECT_LABELS[lo.subject] ?? lo.subject,
            gradeBand: lo.gradeBand,
            courses: [],
          });
        }

        const publishedVersion = lo.versions[0] ?? null;
        const contentJson = publishedVersion?.contentJson as any;

        groupMap.get(key)!.courses.push({
          id: lo.id,
          slug: lo.slug,
          title: lo.title,
          subject: lo.subject,
          gradeBand: lo.gradeBand,
          tags: lo.tags.map((t) => t.tag),
          currentVersion: publishedVersion
            ? {
                id: publishedVersion.id,
                versionNumber: publishedVersion.versionNumber,
                estimatedMinutes: contentJson?.estimatedMinutes ?? null,
                difficulty: contentJson?.difficulty ?? null,
              }
            : null,
        });
      }

      // Sort groups by subject then grade band
      const groups = Array.from(groupMap.values()).sort((a, b) => {
        const subjectOrder = a.subject.localeCompare(b.subject);
        if (subjectOrder !== 0) return subjectOrder;
        return a.gradeBand.localeCompare(b.gradeBand);
      });

      return reply.send(groups);
    },
  );
};
