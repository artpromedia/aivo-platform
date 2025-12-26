/**
 * Reward Service
 *
 * Manages rewards and the virtual shop:
 * - Level-up rewards
 * - Shop items (avatars, frames, boosters, etc.)
 * - Virtual currency management
 * - Item purchases and inventory
 */

import { prisma } from '../prisma.js';
import { eventEmitter } from '../events/event-emitter.js';
import {
  ShopItem,
  ShopCategory,
  PurchaseResult,
  ShopResponse,
  LevelReward,
} from '../types/gamification.types.js';
import { LEVEL_CONFIG } from './gamification.service.js';

// ============================================================================
// LEVEL REWARDS CONFIGURATION
// ============================================================================

const LEVEL_REWARDS: Record<number, LevelReward[]> = {
  2: [{ type: 'coins', amount: 50 }],
  3: [{ type: 'coins', amount: 75 }],
  4: [{ type: 'coins', amount: 100 }, { type: 'freeze', amount: 1 }],
  5: [{ type: 'coins', amount: 150 }, { type: 'gems', amount: 5 }],
  6: [{ type: 'coins', amount: 200 }],
  7: [{ type: 'coins', amount: 250 }, { type: 'freeze', amount: 2 }],
  8: [{ type: 'coins', amount: 300 }, { type: 'gems', amount: 10 }],
  9: [{ type: 'coins', amount: 400 }],
  10: [{ type: 'coins', amount: 500 }, { type: 'gems', amount: 25 }, { type: 'freeze', amount: 3 }],
  // Special milestone levels
  15: [{ type: 'coins', amount: 1000 }, { type: 'gems', amount: 50 }],
  20: [{ type: 'coins', amount: 2000 }, { type: 'gems', amount: 100 }, { type: 'title', itemId: 'ultimate_legend' }],
};

// ============================================================================
// DEFAULT SHOP ITEMS
// ============================================================================

const DEFAULT_SHOP_ITEMS: Omit<ShopItem, 'id'>[] = [
  // Avatar Frames
  {
    name: 'Bronze Frame',
    description: 'A simple bronze frame for your avatar',
    category: 'frames',
    type: 'avatar_frame',
    imageUrl: '/shop/frames/bronze.svg',
    price: 100,
    currency: 'coins',
    rarity: 'common',
  },
  {
    name: 'Silver Frame',
    description: 'An elegant silver frame',
    category: 'frames',
    type: 'avatar_frame',
    imageUrl: '/shop/frames/silver.svg',
    price: 250,
    currency: 'coins',
    rarity: 'uncommon',
  },
  {
    name: 'Gold Frame',
    description: 'A prestigious gold frame',
    category: 'frames',
    type: 'avatar_frame',
    imageUrl: '/shop/frames/gold.svg',
    price: 500,
    currency: 'coins',
    rarity: 'rare',
  },
  {
    name: 'Diamond Frame',
    description: 'The ultimate diamond frame',
    category: 'frames',
    type: 'avatar_frame',
    imageUrl: '/shop/frames/diamond.svg',
    price: 25,
    currency: 'gems',
    rarity: 'legendary',
    requiredLevel: 10,
  },

  // Backgrounds
  {
    name: 'Ocean Background',
    description: 'A calming ocean scene',
    category: 'backgrounds',
    type: 'profile_background',
    imageUrl: '/shop/backgrounds/ocean.jpg',
    price: 150,
    currency: 'coins',
    rarity: 'common',
  },
  {
    name: 'Mountain Background',
    description: 'Majestic mountain peaks',
    category: 'backgrounds',
    type: 'profile_background',
    imageUrl: '/shop/backgrounds/mountain.jpg',
    price: 150,
    currency: 'coins',
    rarity: 'common',
  },
  {
    name: 'Space Background',
    description: 'Journey through the cosmos',
    category: 'backgrounds',
    type: 'profile_background',
    imageUrl: '/shop/backgrounds/space.jpg',
    price: 300,
    currency: 'coins',
    rarity: 'uncommon',
  },
  {
    name: 'Aurora Background',
    description: 'Beautiful northern lights',
    category: 'backgrounds',
    type: 'profile_background',
    imageUrl: '/shop/backgrounds/aurora.jpg',
    price: 15,
    currency: 'gems',
    rarity: 'rare',
  },

  // Celebration Effects
  {
    name: 'Confetti Burst',
    description: 'Colorful confetti celebration',
    category: 'effects',
    type: 'celebration_effect',
    imageUrl: '/shop/effects/confetti.gif',
    price: 200,
    currency: 'coins',
    rarity: 'common',
  },
  {
    name: 'Fireworks',
    description: 'Spectacular fireworks display',
    category: 'effects',
    type: 'celebration_effect',
    imageUrl: '/shop/effects/fireworks.gif',
    price: 400,
    currency: 'coins',
    rarity: 'uncommon',
  },
  {
    name: 'Star Explosion',
    description: 'A dazzling star explosion',
    category: 'effects',
    type: 'celebration_effect',
    imageUrl: '/shop/effects/stars.gif',
    price: 20,
    currency: 'gems',
    rarity: 'rare',
  },

  // XP Boosters
  {
    name: '2x XP Booster (1 hour)',
    description: 'Double XP for 1 hour',
    category: 'boosters',
    type: 'xp_booster',
    imageUrl: '/shop/boosters/xp_2x.svg',
    price: 100,
    currency: 'coins',
    rarity: 'common',
    metadata: { multiplier: 2, durationMinutes: 60 },
  },
  {
    name: '2x XP Booster (3 hours)',
    description: 'Double XP for 3 hours',
    category: 'boosters',
    type: 'xp_booster',
    imageUrl: '/shop/boosters/xp_2x.svg',
    price: 250,
    currency: 'coins',
    rarity: 'uncommon',
    metadata: { multiplier: 2, durationMinutes: 180 },
  },
  {
    name: '3x XP Booster (1 hour)',
    description: 'Triple XP for 1 hour',
    category: 'boosters',
    type: 'xp_booster',
    imageUrl: '/shop/boosters/xp_3x.svg',
    price: 15,
    currency: 'gems',
    rarity: 'rare',
    metadata: { multiplier: 3, durationMinutes: 60 },
  },

  // Streak Freezes
  {
    name: 'Streak Freeze',
    description: 'Protect your streak for one day',
    category: 'freezes',
    type: 'streak_freeze',
    imageUrl: '/shop/freezes/freeze.svg',
    price: 200,
    currency: 'coins',
    rarity: 'common',
  },
  {
    name: 'Streak Freeze Pack (3)',
    description: 'Three streak freezes',
    category: 'freezes',
    type: 'streak_freeze',
    imageUrl: '/shop/freezes/freeze_pack.svg',
    price: 500,
    currency: 'coins',
    rarity: 'uncommon',
    metadata: { quantity: 3 },
  },
];

// ============================================================================
// REWARD SERVICE
// ============================================================================

class RewardService {
  /**
   * Award level-up rewards
   */
  async awardLevelUpRewards(studentId: string, newLevel: number): Promise<void> {
    const rewards = LEVEL_REWARDS[newLevel];
    if (!rewards) return;

    const updates: Record<string, number> = {};

    for (const reward of rewards) {
      switch (reward.type) {
        case 'coins':
          updates.coins = (updates.coins || 0) + (reward.amount || 0);
          break;
        case 'gems':
          updates.gems = (updates.gems || 0) + (reward.amount || 0);
          break;
        case 'freeze':
          updates.streakFreezes = (updates.streakFreezes || 0) + (reward.amount || 0);
          break;
        case 'title':
          if (reward.itemId) {
            await this.awardTitle(studentId, reward.itemId);
          }
          break;
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.playerProfile.update({
        where: { studentId },
        data: {
          coins: { increment: updates.coins || 0 },
          gems: { increment: updates.gems || 0 },
          streakFreezes: { increment: updates.streakFreezes || 0 },
        },
      });
    }

    eventEmitter.emit('rewards.levelUp', {
      studentId,
      level: newLevel,
      rewards,
    });

    console.log(`Level-up rewards awarded: ${studentId} level ${newLevel}`);
  }

  /**
   * Award a title to a player
   */
  async awardTitle(studentId: string, titleId: string): Promise<void> {
    const levelConfig = LEVEL_CONFIG.find((l) => l.title.toLowerCase().replace(/\s+/g, '_') === titleId);
    
    let title = await prisma.playerTitle.findFirst({
      where: { name: levelConfig?.title || titleId },
    });

    if (!title) {
      title = await prisma.playerTitle.create({
        data: {
          name: levelConfig?.title || titleId,
          color: levelConfig?.color,
          source: 'level',
        },
      });
    }

    await prisma.ownedTitle.upsert({
      where: {
        studentId_titleId: { studentId, titleId: title.id },
      },
      create: {
        studentId,
        titleId: title.id,
      },
      update: {},
    });
  }

  /**
   * Get shop items
   */
  async getShopItems(studentId: string): Promise<ShopResponse> {
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: { coins: true, gems: true, level: true },
    });

    const ownedItems = await prisma.ownedItem.findMany({
      where: { studentId },
      select: { itemId: true },
    });

    const ownedItemIds = new Set(ownedItems.map((o) => o.itemId));

    // Get items from database
    let items = await prisma.shopItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    // If no items exist, seed default items
    if (items.length === 0) {
      await this.seedShopItems();
      items = await prisma.shopItem.findMany({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      });
    }

    // Filter items based on requirements
    const availableItems = items.filter((item) => {
      if (item.requiredLevel && profile && item.requiredLevel > profile.level) {
        return false;
      }
      if (item.isLimited && item.limitedUntil && new Date() > item.limitedUntil) {
        return false;
      }
      return true;
    });

    // Group by category
    const categories = new Map<ShopCategory, ShopItem[]>();
    for (const item of availableItems) {
      const category = item.category as ShopCategory;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(this.toShopItem(item));
    }

    // Get featured items (limited time or high rarity)
    const featured = availableItems
      .filter((item) => item.isLimited || item.rarity === 'legendary' || item.rarity === 'epic')
      .slice(0, 6)
      .map((item) => this.toShopItem(item));

    return {
      categories: Array.from(categories.entries()).map(([id, items]) => ({
        id,
        name: this.getCategoryName(id),
        items,
      })),
      featured,
      playerBalance: {
        coins: profile?.coins || 0,
        gems: profile?.gems || 0,
      },
    };
  }

  /**
   * Purchase an item
   */
  async purchaseItem(studentId: string, itemId: string): Promise<PurchaseResult> {
    const item = await prisma.shopItem.findUnique({
      where: { id: itemId },
    });

    if (!item || !item.isActive) {
      return { success: false, message: 'Item not found' };
    }

    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: { coins: true, gems: true, level: true },
    });

    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    // Check requirements
    if (item.requiredLevel && item.requiredLevel > profile.level) {
      return { success: false, message: `Requires level ${item.requiredLevel}` };
    }

    // Check if already owned (for non-consumable items)
    if (item.type !== 'xp_booster' && item.type !== 'streak_freeze') {
      const owned = await prisma.ownedItem.findUnique({
        where: {
          studentId_itemId: { studentId, itemId },
        },
      });

      if (owned) {
        return { success: false, message: 'Already owned' };
      }
    }

    // Check balance
    const balance = item.currency === 'gems' ? profile.gems : profile.coins;
    if (balance < item.price) {
      return { success: false, message: `Not enough ${item.currency}` };
    }

    // Process purchase
    await prisma.$transaction(async (tx) => {
      // Deduct currency
      if (item.currency === 'gems') {
        await tx.playerProfile.update({
          where: { studentId },
          data: { gems: { decrement: item.price } },
        });
      } else {
        await tx.playerProfile.update({
          where: { studentId },
          data: { coins: { decrement: item.price } },
        });
      }

      // Handle different item types
      switch (item.type) {
        case 'xp_booster': {
          const metadata = item.metadata as { multiplier: number; durationMinutes: number } | null;
          const multiplier = metadata?.multiplier || 2;
          const durationMinutes = metadata?.durationMinutes || 60;
          
          await tx.activeBooster.create({
            data: {
              studentId,
              type: `xp_${multiplier}x`,
              multiplier,
              expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
            },
          });
          break;
        }

        case 'streak_freeze': {
          const metadata = item.metadata as { quantity?: number } | null;
          const quantity = metadata?.quantity || 1;
          
          await tx.playerProfile.update({
            where: { studentId },
            data: { streakFreezes: { increment: quantity } },
          });
          break;
        }

        default:
          // Add to owned items
          await tx.ownedItem.create({
            data: {
              studentId,
              itemId,
            },
          });
      }
    });

    // Get updated balance
    const updatedProfile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: { coins: true, gems: true },
    });

    eventEmitter.emit('shop.purchase', {
      studentId,
      itemId,
      itemName: item.name,
      price: item.price,
      currency: item.currency,
    });

    console.log(`Item purchased: ${studentId} - ${item.name}`);

    return {
      success: true,
      message: 'Purchase successful!',
      item: this.toShopItem(item),
      newBalance: {
        coins: updatedProfile?.coins || 0,
        gems: updatedProfile?.gems || 0,
      },
    };
  }

  /**
   * Get player's inventory
   */
  async getInventory(studentId: string): Promise<ShopItem[]> {
    const owned = await prisma.ownedItem.findMany({
      where: { studentId },
      include: { item: true },
    });

    return owned.map((o) => this.toShopItem(o.item));
  }

  /**
   * Equip an item
   */
  async equipItem(studentId: string, itemId: string, slot: string): Promise<boolean> {
    // Verify ownership
    const owned = await prisma.ownedItem.findUnique({
      where: {
        studentId_itemId: { studentId, itemId },
      },
    });

    if (!owned) {
      return false;
    }

    // Update equipped item
    await prisma.equippedItem.upsert({
      where: {
        studentId_slot: { studentId, slot },
      },
      create: {
        studentId,
        slot,
        itemId,
      },
      update: {
        itemId,
      },
    });

    return true;
  }

  /**
   * Seed default shop items
   */
  private async seedShopItems(): Promise<void> {
    for (let i = 0; i < DEFAULT_SHOP_ITEMS.length; i++) {
      const item = DEFAULT_SHOP_ITEMS[i];
      await prisma.shopItem.create({
        data: {
          ...item,
          sortOrder: i,
        },
      });
    }
    console.log('Shop items seeded');
  }

  /**
   * Convert database item to ShopItem type
   */
  private toShopItem(item: {
    id: string;
    name: string;
    description: string;
    category: string;
    type: string;
    imageUrl: string;
    previewUrl?: string | null;
    price: number;
    currency: string;
    rarity: string;
    isLimited: boolean;
    limitedUntil?: Date | null;
    requiredLevel?: number | null;
    requiredAchievement?: string | null;
    metadata?: unknown;
  }): ShopItem {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category as ShopCategory,
      type: item.type as ShopItem['type'],
      imageUrl: item.imageUrl,
      previewUrl: item.previewUrl || undefined,
      price: item.price,
      currency: item.currency as 'coins' | 'gems',
      rarity: item.rarity as ShopItem['rarity'],
      isLimited: item.isLimited,
      limitedUntil: item.limitedUntil || undefined,
      requiredLevel: item.requiredLevel || undefined,
      requiredAchievement: item.requiredAchievement || undefined,
      metadata: item.metadata as Record<string, unknown> | undefined,
    };
  }

  /**
   * Get category display name
   */
  private getCategoryName(category: ShopCategory): string {
    const names: Record<ShopCategory, string> = {
      avatars: 'Avatars',
      frames: 'Avatar Frames',
      backgrounds: 'Backgrounds',
      effects: 'Celebration Effects',
      boosters: 'XP Boosters',
      freezes: 'Streak Freezes',
      titles: 'Titles',
    };
    return names[category] || category;
  }
}

export const rewardService = new RewardService();
