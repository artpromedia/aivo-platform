/**
 * Gamification Service — Prisma Seed
 *
 * Seeds the database with:
 *  1. Default shop items (avatars, backgrounds, effects, boosters, freezes)
 *  2. Achievement definitions stored in a reference table (optional — the
 *     service uses in-memory ACHIEVEMENT_DEFINITIONS, but this provides a
 *     DB record for analytics / admin dashboards)
 *
 * Run:  pnpm --filter @aivo/gamification-svc db:seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Default shop items (mirrors reward.service.ts DEFAULT_SHOP_ITEMS)
// ---------------------------------------------------------------------------

const DEFAULT_SHOP_ITEMS = [
  // Avatar Frames
  {
    id: 'frame_bronze',
    name: 'Bronze Frame',
    description: 'A simple bronze avatar frame',
    category: 'frame',
    rarity: 'common',
    priceCoins: 100,
    priceGems: 0,
    iconUrl: '/shop/frame_bronze.svg',
    isDefault: true,
  },
  {
    id: 'frame_silver',
    name: 'Silver Frame',
    description: 'A sleek silver avatar frame',
    category: 'frame',
    rarity: 'uncommon',
    priceCoins: 250,
    priceGems: 0,
    iconUrl: '/shop/frame_silver.svg',
    isDefault: true,
  },
  {
    id: 'frame_gold',
    name: 'Gold Frame',
    description: 'A prestigious gold avatar frame',
    category: 'frame',
    rarity: 'rare',
    priceCoins: 500,
    priceGems: 0,
    iconUrl: '/shop/frame_gold.svg',
    isDefault: true,
  },
  {
    id: 'frame_diamond',
    name: 'Diamond Frame',
    description: 'The ultimate diamond avatar frame',
    category: 'frame',
    rarity: 'legendary',
    priceCoins: 0,
    priceGems: 25,
    levelRequired: 10,
    iconUrl: '/shop/frame_diamond.svg',
    isDefault: true,
  },

  // Backgrounds
  {
    id: 'bg_ocean',
    name: 'Ocean View',
    description: 'A calming ocean background',
    category: 'background',
    rarity: 'common',
    priceCoins: 150,
    priceGems: 0,
    iconUrl: '/shop/bg_ocean.svg',
    isDefault: true,
  },
  {
    id: 'bg_mountain',
    name: 'Mountain Peak',
    description: 'A majestic mountain background',
    category: 'background',
    rarity: 'common',
    priceCoins: 150,
    priceGems: 0,
    iconUrl: '/shop/bg_mountain.svg',
    isDefault: true,
  },
  {
    id: 'bg_space',
    name: 'Deep Space',
    description: 'An out-of-this-world space background',
    category: 'background',
    rarity: 'rare',
    priceCoins: 300,
    priceGems: 0,
    iconUrl: '/shop/bg_space.svg',
    isDefault: true,
  },
  {
    id: 'bg_aurora',
    name: 'Northern Lights',
    description: 'A mesmerizing aurora background',
    category: 'background',
    rarity: 'epic',
    priceCoins: 0,
    priceGems: 15,
    iconUrl: '/shop/bg_aurora.svg',
    isDefault: true,
  },

  // Effects
  {
    id: 'effect_confetti',
    name: 'Confetti Burst',
    description: 'Celebrate with confetti!',
    category: 'effect',
    rarity: 'uncommon',
    priceCoins: 200,
    priceGems: 0,
    iconUrl: '/shop/effect_confetti.svg',
    isDefault: true,
  },
  {
    id: 'effect_fireworks',
    name: 'Fireworks',
    description: 'Light up the sky!',
    category: 'effect',
    rarity: 'rare',
    priceCoins: 400,
    priceGems: 0,
    iconUrl: '/shop/effect_fireworks.svg',
    isDefault: true,
  },
  {
    id: 'effect_stars',
    name: 'Star Explosion',
    description: 'A stellar celebration!',
    category: 'effect',
    rarity: 'epic',
    priceCoins: 0,
    priceGems: 20,
    iconUrl: '/shop/effect_stars.svg',
    isDefault: true,
  },

  // XP Boosters
  {
    id: 'booster_2x_1h',
    name: '2x XP (1 hour)',
    description: 'Double XP for 1 hour',
    category: 'booster',
    rarity: 'uncommon',
    priceCoins: 100,
    priceGems: 0,
    iconUrl: '/shop/booster_2x.svg',
    isDefault: true,
  },
  {
    id: 'booster_2x_3h',
    name: '2x XP (3 hours)',
    description: 'Double XP for 3 hours',
    category: 'booster',
    rarity: 'rare',
    priceCoins: 250,
    priceGems: 0,
    iconUrl: '/shop/booster_2x_3h.svg',
    isDefault: true,
  },
  {
    id: 'booster_3x_1h',
    name: '3x XP (1 hour)',
    description: 'Triple XP for 1 hour!',
    category: 'booster',
    rarity: 'epic',
    priceCoins: 0,
    priceGems: 15,
    iconUrl: '/shop/booster_3x.svg',
    isDefault: true,
  },

  // Streak Freezes
  {
    id: 'freeze_single',
    name: 'Streak Freeze',
    description: 'Protect your streak for 1 day',
    category: 'freeze',
    rarity: 'common',
    priceCoins: 200,
    priceGems: 0,
    iconUrl: '/shop/freeze.svg',
    isDefault: true,
  },
  {
    id: 'freeze_pack',
    name: 'Streak Freeze Pack (3)',
    description: 'Protect your streak for 3 days',
    category: 'freeze',
    rarity: 'uncommon',
    priceCoins: 500,
    priceGems: 0,
    iconUrl: '/shop/freeze_pack.svg',
    isDefault: true,
  },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding gamification database...');

  // 1. Upsert shop items
  let shopCreated = 0;
  for (const item of DEFAULT_SHOP_ITEMS) {
    await prisma.shopItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        rarity: item.rarity,
        priceCoins: item.priceCoins,
        priceGems: item.priceGems,
        iconUrl: item.iconUrl,
        isDefault: item.isDefault,
        levelRequired: item.levelRequired ?? 0,
      },
    });
    shopCreated++;
  }
  console.log(`  ✓ ${shopCreated} shop items seeded`);

  console.log('Seeding complete.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
