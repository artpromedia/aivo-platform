/**
 * Professional Development Activities Routes
 *
 * Handles logging, retrieving, and verifying PD activities for teachers.
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma } from '../db.js';
import { ProfessionalDevService } from '../services/pd.service.js';

const service = new ProfessionalDevService(prisma);

const logActivitySchema = z.object({
  teacherId: z.string().uuid(),
  enrollmentId: z.string().uuid().optional(),
  activityType: z.string().min(1),
  description: z.string().min(1),
  hours: z.number().positive(),
  activityDate: z.string().datetime(),
  evidenceUrl: z.string().url().optional(),
});

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const activitiesRoutes: FastifyPluginAsync = async (app) => {
  // Log a new activity
  app.post<{ Body: z.infer<typeof logActivitySchema> }>('/', async (request, reply) => {
    const user = getUser(request);
    const body = logActivitySchema.parse(request.body);

    try {
      const activity = await service.logActivity(user.tenantId, {
        ...body,
        activityDate: new Date(body.activityDate),
      });
      return reply.code(201).send(activity);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // Get activities for a teacher
  app.get<{
    Querystring: {
      teacherId: string;
      startDate?: string;
      endDate?: string;
      limit?: string;
    };
  }>('/', async (request, reply) => {
    const user = getUser(request);
    const { teacherId, startDate, endDate, limit } = request.query;

    if (!teacherId) {
      return reply.code(400).send({ error: 'teacherId is required' });
    }

    const activities = await service.getTeacherActivities(user.tenantId, teacherId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });

    return reply.send({ activities });
  });

  // Get activities for the current user
  app.get('/me', async (request, reply) => {
    const user = getUser(request);

    if (!user.sub) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const activities = await service.getTeacherActivities(user.tenantId, user.sub, {
      limit: 50,
    });

    return reply.send({ activities });
  });

  // Verify an activity (admin/supervisor action)
  app.post<{ Params: { activityId: string } }>(
    '/:activityId/verify',
    async (request, reply) => {
      const user = getUser(request);
      const { activityId } = request.params;

      // Check if user has permission to verify (admin or supervisor)
      if (!['admin', 'supervisor', 'pd_coordinator'].includes(user.role)) {
        return reply.code(403).send({ error: 'Only administrators and supervisors can verify activities' });
      }

      try {
        const activity = await service.verifyActivity(activityId, user.sub);
        return reply.send(activity);
      } catch (error) {
        return reply.code(404).send({ error: 'Activity not found' });
      }
    }
  );

  // Get unverified activities (for admin review)
  app.get('/pending-verification', async (request, reply) => {
    const user = getUser(request);

    // Check if user has permission to view pending activities
    if (!['admin', 'supervisor', 'pd_coordinator'].includes(user.role)) {
      return reply.code(403).send({ error: 'Only administrators and supervisors can view pending activities' });
    }

    // Get unverified activities - using raw query since service doesn't have this method
    const activities = await prisma.pDActivity.findMany({
      where: {
        tenantId: user.tenantId,
        isVerified: false,
      },
      include: {
        enrollment: {
          include: { program: true },
        },
      },
      orderBy: { activityDate: 'desc' },
      take: 100,
    });

    return reply.send({ activities });
  });

  // Get activity summary for a teacher
  app.get<{ Params: { teacherId: string }; Querystring: { startDate?: string; endDate?: string } }>(
    '/summary/:teacherId',
    async (request, reply) => {
      const user = getUser(request);
      const { teacherId } = request.params;
      const { startDate, endDate } = request.query;

      const activities = await service.getTeacherActivities(user.tenantId, teacherId, {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      // Calculate summary
      const totalHours = activities.reduce((sum, a) => sum + a.hours, 0);
      const verifiedHours = activities.filter((a) => a.isVerified).reduce((sum, a) => sum + a.hours, 0);
      const unverifiedHours = totalHours - verifiedHours;

      const byType = activities.reduce((acc, a) => {
        const type = a.activityType;
        if (!acc[type]) {
          acc[type] = { type, count: 0, hours: 0 };
        }
        acc[type].count++;
        acc[type].hours += a.hours;
        return acc;
      }, {} as Record<string, { type: string; count: number; hours: number }>);

      return reply.send({
        teacherId,
        totalActivities: activities.length,
        totalHours,
        verifiedHours,
        unverifiedHours,
        byType: Object.values(byType).sort((a, b) => b.hours - a.hours),
      });
    }
  );

  // Bulk verify activities (admin action)
  app.post<{ Body: { activityIds: string[] } }>(
    '/bulk-verify',
    async (request, reply) => {
      const user = getUser(request);
      const { activityIds } = request.body;

      // Check if user has permission to verify
      if (!['admin', 'supervisor', 'pd_coordinator'].includes(user.role)) {
        return reply.code(403).send({ error: 'Only administrators and supervisors can verify activities' });
      }

      if (!activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
        return reply.code(400).send({ error: 'activityIds array is required' });
      }

      const results = await Promise.allSettled(
        activityIds.map((activityId) => service.verifyActivity(activityId, user.sub))
      );

      const verified = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      return reply.send({
        verified,
        failed,
        total: activityIds.length,
      });
    }
  );
};
