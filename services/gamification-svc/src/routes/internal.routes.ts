/**
 * Internal Routes for DSR (Data Subject Request) Compliance
 *
 * These endpoints are called by the dsr-svc during GDPR Article 17
 * "Right to Erasure" requests. They implement soft delete to maintain
 * audit trails while marking data as deleted.
 *
 * @module gamification-svc/routes/internal
 */

import { Router } from 'express';
import type { Request, Response, NextFunction, IRouter } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma.js';

const router: IRouter = Router();

// ════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

const DeleteLearnerSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  parentId: z.string().uuid(),
  mode: z.enum(['SOFT', 'HARD']).default('SOFT'),
});

interface DeleteResult {
  success: boolean;
  recordsDeleted: number;
  details: {
    playerProfiles: number;
    xpTransactions: number;
    earnedAchievements: number;
    activeChallenges: number;
    dailyActivity: number;
    dailyLogins: number;
    ownedItems: number;
  };
  mode: 'SOFT' | 'HARD';
  deletedAt?: string;
}

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ════════════════════════════════════════════════════════════════════════════
// INTERNAL DELETE ENDPOINT
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /internal/delete-learner
 *
 * Called by dsr-svc to delete or soft-delete all gamification data for a learner.
 *
 * SOFT mode: Sets deletedAt timestamp (preserves for audit, excludes from queries)
 * HARD mode: Permanently deletes records (full GDPR Article 17 compliance)
 */
router.post(
  '/delete-learner',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Verify internal request header
    const internalHeader = req.headers['x-internal-request'];
    if (internalHeader !== 'true') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'This endpoint is for internal service-to-service calls only',
      });
      return;
    }

    // Validate request body
    const parseResult = DeleteLearnerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.issues,
      });
      return;
    }

    const { tenantId, learnerId, mode } = parseResult.data;
    const deletedAt = new Date();

    console.log(
      JSON.stringify({
        event: 'delete_learner_request',
        tenantId,
        learnerId,
        mode,
        timestamp: new Date().toISOString(),
      })
    );

    const details: DeleteResult['details'] = {
      playerProfiles: 0,
      xpTransactions: 0,
      earnedAchievements: 0,
      activeChallenges: 0,
      dailyActivity: 0,
      dailyLogins: 0,
      ownedItems: 0,
    };

    try {
      // Find the player profile first
      const playerProfile = await prisma.playerProfile.findUnique({
        where: {
          tenantId_studentId: {
            tenantId,
            studentId: learnerId,
          },
        },
      });

      if (!playerProfile) {
        // No data to delete
        res.json({
          success: true,
          recordsDeleted: 0,
          details,
          mode,
          message: 'No gamification data found for learner',
        } as DeleteResult);
        return;
      }

      if (mode === 'SOFT') {
        // ══════════════════════════════════════════════════════════════════
        // SOFT DELETE - Set deletedAt timestamp
        // ══════════════════════════════════════════════════════════════════

        // 1. Soft delete active challenges
        const challengeResult = await prisma.activeChallenge.deleteMany({
          where: { studentId: learnerId },
        });
        details.activeChallenges = challengeResult.count;

        // 2. Soft delete daily activity records
        const dailyActivityResult = await prisma.dailyActivity.deleteMany({
          where: { studentId: learnerId },
        });
        details.dailyActivity = dailyActivityResult.count;

        // 3. Soft delete daily logins
        const dailyLoginResult = await prisma.dailyLogin.deleteMany({
          where: { studentId: learnerId },
        });
        details.dailyLogins = dailyLoginResult.count;

        // 4. Soft delete owned items
        const ownedItemsResult = await prisma.ownedItem.deleteMany({
          where: { studentId: learnerId },
        });
        details.ownedItems = ownedItemsResult.count;

        // 5. Soft delete earned achievements
        const achievementsResult = await prisma.earnedAchievement.updateMany({
          where: {
            playerId: playerProfile.id,
            deletedAt: null,
          },
          data: { deletedAt },
        });
        details.earnedAchievements = achievementsResult.count;

        // 6. Soft delete XP transactions
        const xpResult = await prisma.xPTransaction.updateMany({
          where: {
            playerId: playerProfile.id,
            deletedAt: null,
          },
          data: { deletedAt },
        });
        details.xpTransactions = xpResult.count;

        // 7. Soft delete player profile
        const profileResult = await prisma.playerProfile.updateMany({
          where: {
            id: playerProfile.id,
            deletedAt: null,
          },
          data: { deletedAt },
        });
        details.playerProfiles = profileResult.count;

      } else {
        // ══════════════════════════════════════════════════════════════════
        // HARD DELETE - Permanently remove records
        // ══════════════════════════════════════════════════════════════════

        // Delete in order respecting foreign key constraints

        // 1. Delete active challenges
        const challengeResult = await prisma.activeChallenge.deleteMany({
          where: { studentId: learnerId },
        });
        details.activeChallenges = challengeResult.count;

        // 2. Delete daily activity records
        const dailyActivityResult = await prisma.dailyActivity.deleteMany({
          where: { studentId: learnerId },
        });
        details.dailyActivity = dailyActivityResult.count;

        // 3. Delete daily logins
        const dailyLoginResult = await prisma.dailyLogin.deleteMany({
          where: { studentId: learnerId },
        });
        details.dailyLogins = dailyLoginResult.count;

        // 4. Delete owned items
        const ownedItemsResult = await prisma.ownedItem.deleteMany({
          where: { studentId: learnerId },
        });
        details.ownedItems = ownedItemsResult.count;

        // 3. Delete earned achievements
        const achievementsResult = await prisma.earnedAchievement.deleteMany({
          where: { playerId: playerProfile.id },
        });
        details.earnedAchievements = achievementsResult.count;

        // 4. Delete XP transactions
        const xpResult = await prisma.xPTransaction.deleteMany({
          where: { playerId: playerProfile.id },
        });
        details.xpTransactions = xpResult.count;

        // 5. Delete player profile
        const profileResult = await prisma.playerProfile.deleteMany({
          where: { id: playerProfile.id },
        });
        details.playerProfiles = profileResult.count;
      }

      const totalRecordsDeleted =
        details.playerProfiles +
        details.xpTransactions +
        details.earnedAchievements +
        details.activeChallenges +
        details.dailyActivity +
        details.dailyLogins +
        details.ownedItems;

      console.log(
        JSON.stringify({
          event: 'delete_learner_completed',
          tenantId,
          learnerId,
          mode,
          totalRecordsDeleted,
          details,
          timestamp: new Date().toISOString(),
        })
      );

      res.json({
        success: true,
        recordsDeleted: totalRecordsDeleted,
        details,
        mode,
        deletedAt: mode === 'SOFT' ? deletedAt.toISOString() : undefined,
      } as DeleteResult);

    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'delete_learner_error',
          tenantId,
          learnerId,
          mode,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        })
      );

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete learner data',
      });
    }
  })
);

export default router;
