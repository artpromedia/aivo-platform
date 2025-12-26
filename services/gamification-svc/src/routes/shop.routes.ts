/**
 * Shop Routes
 *
 * Handles shop and inventory API endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { rewardService } from '../services/index.js';

const router = Router();

// ============================================================================
// VALIDATION
// ============================================================================

const purchaseSchema = z.object({
  itemId: z.string().uuid(),
});

const equipSchema = z.object({
  itemId: z.string().uuid(),
  slot: z.enum(['avatar_frame', 'profile_background', 'celebration_effect', 'title']),
});

// ============================================================================
// HELPERS
// ============================================================================

const extractStudentId = (req: Request): string => {
  const studentId = req.headers['x-student-id'] as string;
  if (!studentId) {
    throw new Error('Student ID required');
  }
  return studentId;
};

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/gamification/shop
 * Get shop items
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const shop = await rewardService.getShopItems(studentId);
    res.json({ success: true, data: shop });
  })
);

/**
 * GET /api/gamification/shop/featured
 * Get featured shop items
 */
router.get(
  '/featured',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const shop = await rewardService.getShopItems(studentId);
    res.json({ success: true, data: shop.featured });
  })
);

/**
 * GET /api/gamification/shop/category/:category
 * Get items by category
 */
router.get(
  '/category/:category',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const category = req.params.category;

    const shop = await rewardService.getShopItems(studentId);
    const categoryData = shop.categories.find((c) => c.id === category);

    if (!categoryData) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }

    res.json({ success: true, data: categoryData });
  })
);

/**
 * POST /api/gamification/shop/purchase
 * Purchase an item
 */
router.post(
  '/purchase',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const { itemId } = purchaseSchema.parse(req.body);

    const result = await rewardService.purchaseItem(studentId, itemId);

    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  })
);

/**
 * GET /api/gamification/shop/inventory
 * Get player's inventory
 */
router.get(
  '/inventory',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const inventory = await rewardService.getInventory(studentId);
    res.json({ success: true, data: inventory });
  })
);

/**
 * POST /api/gamification/shop/equip
 * Equip an item
 */
router.post(
  '/equip',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const { itemId, slot } = equipSchema.parse(req.body);

    const success = await rewardService.equipItem(studentId, itemId, slot);

    if (success) {
      res.json({ success: true, message: 'Item equipped' });
    } else {
      res.status(400).json({ success: false, error: 'Unable to equip item' });
    }
  })
);

/**
 * GET /api/gamification/shop/equipped
 * Get currently equipped items
 */
router.get(
  '/equipped',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);

    const { prisma } = await import('../prisma.js');
    const equipped = await prisma.equippedItem.findMany({
      where: { studentId },
      include: { item: true },
    });

    const result: Record<string, unknown> = {};
    for (const eq of equipped) {
      result[eq.slot] = {
        id: eq.item.id,
        name: eq.item.name,
        imageUrl: eq.item.imageUrl,
      };
    }

    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/gamification/shop/balance
 * Get player's currency balance
 */
router.get(
  '/balance',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);

    const { prisma } = await import('../prisma.js');
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: { coins: true, gems: true },
    });

    res.json({
      success: true,
      data: {
        coins: profile?.coins || 0,
        gems: profile?.gems || 0,
      },
    });
  })
);

export default router;
