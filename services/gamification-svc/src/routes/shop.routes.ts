/**
 * Shop Routes
 *
 * Handles shop and inventory API endpoints
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { rewardService } from '../services/index.js';

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

const extractStudentId = (request: FastifyRequest): string => {
  const studentId = request.headers['x-student-id'] as string;
  if (!studentId) {
    throw new Error('Student ID required');
  }
  return studentId;
};

// ============================================================================
// ROUTES
// ============================================================================

async function shopRoutes(app: FastifyInstance) {
  /**
   * GET /api/gamification/shop
   * Get shop items
   */
  app.get('/', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const shop = await rewardService.getShopItems(studentId);
    return { success: true, data: shop };
  });

  /**
   * GET /api/gamification/shop/featured
   * Get featured shop items
   */
  app.get('/featured', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const shop = await rewardService.getShopItems(studentId);
    return { success: true, data: shop.featured };
  });

  /**
   * GET /api/gamification/shop/category/:category
   * Get items by category
   */
  app.get(
    '/category/:category',
    async (request: FastifyRequest<{ Params: { category: string } }>, reply: FastifyReply) => {
      const studentId = extractStudentId(request);
      const category = request.params.category;

      const shop = await rewardService.getShopItems(studentId);
      const categoryData = shop.categories.find((c) => c.id === category);

      if (!categoryData) {
        reply.status(404);
        return { success: false, error: 'Category not found' };
      }

      return { success: true, data: categoryData };
    }
  );

  /**
   * POST /api/gamification/shop/purchase
   * Purchase an item
   */
  app.post('/purchase', async (request: FastifyRequest, reply: FastifyReply) => {
    const studentId = extractStudentId(request);
    const { itemId } = purchaseSchema.parse(request.body);

    const result = await rewardService.purchaseItem(studentId, itemId);

    if (result.success) {
      return { success: true, data: result };
    } else {
      reply.status(400);
      return { success: false, error: result.message };
    }
  });

  /**
   * GET /api/gamification/shop/inventory
   * Get player's inventory
   */
  app.get('/inventory', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const inventory = await rewardService.getInventory(studentId);
    return { success: true, data: inventory };
  });

  /**
   * POST /api/gamification/shop/equip
   * Equip an item
   */
  app.post('/equip', async (request: FastifyRequest, reply: FastifyReply) => {
    const studentId = extractStudentId(request);
    const { itemId, slot } = equipSchema.parse(request.body);

    const success = await rewardService.equipItem(studentId, itemId, slot);

    if (success) {
      return { success: true, message: 'Item equipped' };
    } else {
      reply.status(400);
      return { success: false, error: 'Unable to equip item' };
    }
  });

  /**
   * GET /api/gamification/shop/equipped
   * Get currently equipped items
   */
  app.get('/equipped', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);

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

    return { success: true, data: result };
  });

  /**
   * GET /api/gamification/shop/balance
   * Get player's currency balance
   */
  app.get('/balance', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);

    const { prisma } = await import('../prisma.js');
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: { coins: true, gems: true },
    });

    return {
      success: true,
      data: {
        coins: profile?.coins || 0,
        gems: profile?.gems || 0,
      },
    };
  });
}

export default shopRoutes;
