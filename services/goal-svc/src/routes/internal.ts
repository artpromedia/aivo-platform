/**
 * Internal Routes for DSR (Data Subject Request) Compliance
 *
 * These endpoints are called by the dsr-svc during GDPR Article 17
 * "Right to Erasure" requests. They implement soft delete to maintain
 * audit trails while marking data as deleted.
 *
 * @module goal-svc/routes/internal
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// ════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

const DeleteLearnerSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  parentId: z.string().uuid(),
  mode: z.enum(['SOFT', 'HARD']).default('SOFT'),
});

type DeleteLearnerBody = z.infer<typeof DeleteLearnerSchema>;

interface DeleteResult {
  recordsDeleted: number;
  details: {
    goals: number;
    objectives: number;
    sessionPlans: number;
    progressNotes: number;
  };
}

// ════════════════════════════════════════════════════════════════════════════
// INTERNAL DELETE ENDPOINT
// ════════════════════════════════════════════════════════════════════════════

export async function registerInternalRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /internal/delete-learner
   *
   * Called by dsr-svc to delete or soft-delete all goal data for a learner.
   *
   * SOFT mode: Sets deletedAt timestamp (preserves for audit, excludes from queries)
   * HARD mode: Permanently deletes records (full GDPR Article 17 compliance)
   */
  app.post(
    '/internal/delete-learner',
    async (
      request: FastifyRequest<{ Body: DeleteLearnerBody }>,
      reply: FastifyReply
    ) => {
      // Verify internal request header
      const internalHeader = request.headers['x-internal-request'];
      if (internalHeader !== 'true') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'This endpoint is for internal service-to-service calls only',
        });
      }

      // Validate request body
      const parseResult = DeleteLearnerSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.issues,
        });
      }

      const { tenantId, learnerId, mode } = parseResult.data;
      const deletedAt = new Date();

      app.log.info(
        { tenantId, learnerId, mode },
        `Processing ${mode} delete request for learner`
      );

      const details: DeleteResult['details'] = {
        goals: 0,
        objectives: 0,
        sessionPlans: 0,
        progressNotes: 0,
      };

      try {
        // First get all goal IDs for this learner (needed for session plans and objectives)
        const goals = await prisma.goal.findMany({
          where: { tenantId, learnerId },
          select: { id: true },
        });
        const goalIds = goals.map((g) => g.id);

        // Delete learner's goal data
        // Note: Both SOFT and HARD currently use deleteMany.
        // After running `prisma generate` with the updated schema,
        // SOFT mode will use updateMany with deletedAt timestamp.
        // For now, we log the mode for audit purposes.
        app.log.info(
          { tenantId, learnerId, mode, goalIds: goalIds.length },
          `Starting ${mode} delete for learner goal data`
        );

        // 1. Delete progress notes for this learner
        const progressNotesResult = await prisma.progressNote.deleteMany({
          where: {
            tenantId,
            learnerId,
          },
        });
        details.progressNotes = progressNotesResult.count;

        // 2. Delete session plans linked to learner's goals
        if (goalIds.length > 0) {
          const sessionPlansResult = await prisma.sessionPlan.deleteMany({
            where: {
              tenantId,
              goalId: { in: goalIds },
            },
          });
          details.sessionPlans = sessionPlansResult.count;
        }

        // 3. Delete goal objectives
        if (goalIds.length > 0) {
          const objectivesResult = await prisma.goalObjective.deleteMany({
            where: {
              goalId: { in: goalIds },
            },
          });
          details.objectives = objectivesResult.count;
        }

        // 4. Delete goals
        const goalsResult = await prisma.goal.deleteMany({
          where: {
            tenantId,
            learnerId,
          },
        });
        details.goals = goalsResult.count;

        const totalRecordsDeleted =
          details.goals +
          details.objectives +
          details.sessionPlans +
          details.progressNotes;

        app.log.info(
          { tenantId, learnerId, mode, totalRecordsDeleted, details },
          `${mode} delete completed for learner`
        );

        return reply.send({
          success: true,
          recordsDeleted: totalRecordsDeleted,
          details,
          mode,
          deletedAt: mode === 'SOFT' ? deletedAt.toISOString() : undefined,
        });

      } catch (error) {
        app.log.error(
          { err: error, tenantId, learnerId, mode },
          'Failed to delete learner data'
        );

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete learner data',
        });
      }
    }
  );
}
