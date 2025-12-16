/**
 * AIVO Platform - Engagement Service Seed Data
 *
 * Creates:
 * - Badge definitions for achievements
 * - XP level definitions
 * - Sample engagement profiles for test learners
 */

import { PrismaClient, BadgeCategory, RewardStyle } from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Learner IDs from auth-svc
const LEARNER_IDS = [
  '00000000-0000-0000-2000-000000000001', // alex
  '00000000-0000-0000-2000-000000000002', // jordan
  '00000000-0000-0000-2000-000000000003', // sam
  '00000000-0000-0000-2000-000000000004', // taylor
  '00000000-0000-0000-2000-000000000005', // morgan
];

async function main() {
  console.log('🌱 Seeding engagement-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Badge Definitions
  // ══════════════════════════════════════════════════════════════════════════

  const badges = [
    // Milestone badges
    {
      id: '00000000-0000-0000-5000-000000000001',
      code: 'FIRST_SESSION',
      name: 'First Steps',
      description: 'Completed your first learning session!',
      category: BadgeCategory.MILESTONE,
      iconKey: 'footprints',
      criteriaJson: { eventType: 'SESSION_COMPLETED', count: 1 },
      sortOrder: 1,
      isSecret: false,
    },
    {
      id: '00000000-0000-0000-5000-000000000002',
      code: 'TEN_SESSIONS',
      name: 'Getting Started',
      description: 'Completed 10 learning sessions!',
      category: BadgeCategory.MILESTONE,
      iconKey: 'rocket',
      criteriaJson: { eventType: 'SESSION_COMPLETED', count: 10 },
      sortOrder: 2,
      isSecret: false,
    },
    {
      id: '00000000-0000-0000-5000-000000000003',
      code: 'FIFTY_SESSIONS',
      name: 'Dedicated Learner',
      description: 'Completed 50 learning sessions!',
      category: BadgeCategory.MILESTONE,
      iconKey: 'trophy',
      criteriaJson: { eventType: 'SESSION_COMPLETED', count: 50 },
      sortOrder: 3,
      isSecret: false,
    },
    {
      id: '00000000-0000-0000-5000-000000000004',
      code: 'HUNDRED_SESSIONS',
      name: 'Century Club',
      description: 'Completed 100 learning sessions!',
      category: BadgeCategory.MILESTONE,
      iconKey: 'crown',
      criteriaJson: { eventType: 'SESSION_COMPLETED', count: 100 },
      sortOrder: 4,
      isSecret: false,
    },

    // Streak badges
    {
      id: '00000000-0000-0000-5000-000000000010',
      code: 'STREAK_3',
      name: 'On a Roll',
      description: 'Maintained a 3-day learning streak!',
      category: BadgeCategory.CONSISTENCY,
      iconKey: 'fire',
      criteriaJson: { streakDays: 3 },
      sortOrder: 10,
      isSecret: false,
    },
    {
      id: '00000000-0000-0000-5000-000000000011',
      code: 'STREAK_7',
      name: 'Week Warrior',
      description: 'Maintained a 7-day learning streak!',
      category: BadgeCategory.CONSISTENCY,
      iconKey: 'fire',
      criteriaJson: { streakDays: 7 },
      sortOrder: 11,
      isSecret: false,
    },
    {
      id: '00000000-0000-0000-5000-000000000012',
      code: 'STREAK_30',
      name: 'Month Master',
      description: 'Maintained a 30-day learning streak!',
      category: BadgeCategory.CONSISTENCY,
      iconKey: 'fire',
      criteriaJson: { streakDays: 30 },
      sortOrder: 12,
      isSecret: false,
    },

    // Effort badges
    {
      id: '00000000-0000-0000-5000-000000000020',
      code: 'TRY_AGAIN',
      name: 'Never Give Up',
      description: 'Tried again after getting something wrong',
      category: BadgeCategory.EFFORT,
      iconKey: 'refresh',
      criteriaJson: { eventType: 'RETRY_AFTER_ERROR', count: 1 },
      sortOrder: 20,
      isSecret: false,
    },
    {
      id: '00000000-0000-0000-5000-000000000021',
      code: 'PERFECT_SCORE',
      name: 'Perfect!',
      description: 'Got 100% on an activity',
      category: BadgeCategory.EFFORT,
      iconKey: 'star',
      criteriaJson: { activityScore: 100 },
      sortOrder: 21,
      isSecret: false,
    },

    // Focus badges
    {
      id: '00000000-0000-0000-5000-000000000030',
      code: 'FOCUS_RETURNED',
      name: 'Back on Track',
      description: 'Returned to learning after a focus break',
      category: BadgeCategory.FOCUS,
      iconKey: 'target',
      criteriaJson: { eventType: 'FOCUS_BREAK_RETURNED', count: 1 },
      sortOrder: 30,
      isSecret: false,
    },
    {
      id: '00000000-0000-0000-5000-000000000031',
      code: 'FOCUS_MASTER',
      name: 'Laser Focus',
      description: 'Completed 10 sessions with no focus breaks needed',
      category: BadgeCategory.FOCUS,
      iconKey: 'bullseye',
      criteriaJson: { sessionsWithoutBreaks: 10 },
      sortOrder: 31,
      isSecret: false,
    },

    // Growth badges
    {
      id: '00000000-0000-0000-5000-000000000040',
      code: 'SKILL_UP',
      name: 'Skill Up!',
      description: 'Improved a skill by one level',
      category: BadgeCategory.GROWTH,
      iconKey: 'trending-up',
      criteriaJson: { eventType: 'SKILL_LEVEL_UP', count: 1 },
      sortOrder: 40,
      isSecret: false,
    },
    {
      id: '00000000-0000-0000-5000-000000000041',
      code: 'XP_1000',
      name: 'Rising Star',
      description: 'Earned 1,000 XP total',
      category: BadgeCategory.GROWTH,
      iconKey: 'sparkles',
      criteriaJson: { xpTotal: 1000 },
      sortOrder: 41,
      isSecret: false,
    },
    {
      id: '00000000-0000-0000-5000-000000000042',
      code: 'XP_5000',
      name: 'XP Champion',
      description: 'Earned 5,000 XP total',
      category: BadgeCategory.GROWTH,
      iconKey: 'medal',
      criteriaJson: { xpTotal: 5000 },
      sortOrder: 42,
      isSecret: false,
    },

    // Secret/special badges
    {
      id: '00000000-0000-0000-5000-000000000050',
      code: 'NIGHT_OWL',
      name: 'Night Owl',
      description: 'Completed a lesson after 10 PM',
      category: BadgeCategory.MILESTONE,
      iconKey: 'moon',
      criteriaJson: { timeBasedAfter: '22:00' },
      sortOrder: 50,
      isSecret: true,
    },
    {
      id: '00000000-0000-0000-5000-000000000051',
      code: 'EARLY_BIRD',
      name: 'Early Bird',
      description: 'Completed a lesson before 7 AM',
      category: BadgeCategory.MILESTONE,
      iconKey: 'sun',
      criteriaJson: { timeBasedBefore: '07:00' },
      sortOrder: 51,
      isSecret: true,
    },
    {
      id: '00000000-0000-0000-5000-000000000052',
      code: 'WEEKEND_WARRIOR',
      name: 'Weekend Warrior',
      description: 'Learned on a Saturday and Sunday',
      category: BadgeCategory.CONSISTENCY,
      iconKey: 'calendar',
      criteriaJson: { weekendLearning: true },
      sortOrder: 52,
      isSecret: true,
    },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { id: badge.id },
      update: {},
      create: {
        ...badge,
        tenantId: null, // Global badges available to all tenants
        isActive: true,
      },
    });
    console.log(`  ✅ Created badge: ${badge.name}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Engagement Profiles for Test Learners
  // ══════════════════════════════════════════════════════════════════════════

  const learnerProfiles = [
    {
      learnerId: LEARNER_IDS[0], // alex - active learner
      level: 5,
      xpTotal: 1250,
      xpThisWeek: 350,
      currentStreakDays: 7,
      maxStreakDays: 14,
      sessionsCompleted: 23,
      totalMinutesLearned: 460,
      preferredRewardStyle: RewardStyle.VISUAL_BADGES,
    },
    {
      learnerId: LEARNER_IDS[1], // jordan - new learner
      level: 1,
      xpTotal: 75,
      xpThisWeek: 75,
      currentStreakDays: 2,
      maxStreakDays: 2,
      sessionsCompleted: 3,
      totalMinutesLearned: 45,
      preferredRewardStyle: RewardStyle.PRAISE_MESSAGES,
    },
    {
      learnerId: LEARNER_IDS[2], // sam - consistent learner
      level: 8,
      xpTotal: 3200,
      xpThisWeek: 500,
      currentStreakDays: 21,
      maxStreakDays: 30,
      sessionsCompleted: 45,
      totalMinutesLearned: 900,
      preferredRewardStyle: RewardStyle.POINTS_AND_LEVELS,
    },
    {
      learnerId: LEARNER_IDS[3], // taylor - prefers minimal feedback
      level: 3,
      xpTotal: 600,
      xpThisWeek: 100,
      currentStreakDays: 1,
      maxStreakDays: 5,
      sessionsCompleted: 12,
      totalMinutesLearned: 180,
      preferredRewardStyle: RewardStyle.MINIMAL,
      muteCelebrations: true,
      reducedVisuals: true,
    },
    {
      learnerId: LEARNER_IDS[4], // morgan - brand new
      level: 1,
      xpTotal: 0,
      xpThisWeek: 0,
      currentStreakDays: 0,
      maxStreakDays: 0,
      sessionsCompleted: 0,
      totalMinutesLearned: 0,
      preferredRewardStyle: RewardStyle.VISUAL_BADGES,
    },
  ];

  for (const profile of learnerProfiles) {
    await prisma.engagementProfile.upsert({
      where: { learnerId: profile.learnerId },
      update: {},
      create: {
        tenantId: DEV_TENANT_ID,
        ...profile,
      },
    });
    console.log(`  ✅ Created engagement profile for learner: ${profile.learnerId.slice(-1)}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Award some badges to test learners
  // ══════════════════════════════════════════════════════════════════════════

  // Alex has earned several badges
  const alexBadges = [
    'FIRST_SESSION',
    'TEN_SESSIONS',
    'STREAK_3',
    'STREAK_7',
    'TRY_AGAIN',
    'XP_1000',
  ];
  for (const badgeCode of alexBadges) {
    const badge = badges.find((b) => b.code === badgeCode);
    if (badge) {
      await prisma.learnerBadge.upsert({
        where: {
          learnerId_badgeId: {
            learnerId: LEARNER_IDS[0],
            badgeId: badge.id,
          },
        },
        update: {},
        create: {
          tenantId: DEV_TENANT_ID,
          learnerId: LEARNER_IDS[0],
          badgeId: badge.id,
          source: 'SYSTEM',
          awardedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log(`  ✅ Awarded ${alexBadges.length} badges to Alex`);

  // Sam has earned many badges
  const samBadges = [
    'FIRST_SESSION',
    'TEN_SESSIONS',
    'FIFTY_SESSIONS',
    'STREAK_3',
    'STREAK_7',
    'STREAK_30',
    'SKILL_UP',
    'XP_1000',
  ];
  for (const badgeCode of samBadges) {
    const badge = badges.find((b) => b.code === badgeCode);
    if (badge) {
      await prisma.learnerBadge.upsert({
        where: {
          learnerId_badgeId: {
            learnerId: LEARNER_IDS[2],
            badgeId: badge.id,
          },
        },
        update: {},
        create: {
          tenantId: DEV_TENANT_ID,
          learnerId: LEARNER_IDS[2],
          badgeId: badge.id,
          source: 'SYSTEM',
          awardedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log(`  ✅ Awarded ${samBadges.length} badges to Sam`);

  // Jordan has first steps badge
  const jordanBadges = ['FIRST_SESSION', 'STREAK_3'];
  for (const badgeCode of jordanBadges) {
    const badge = badges.find((b) => b.code === badgeCode);
    if (badge) {
      await prisma.learnerBadge.upsert({
        where: {
          learnerId_badgeId: {
            learnerId: LEARNER_IDS[1],
            badgeId: badge.id,
          },
        },
        update: {},
        create: {
          tenantId: DEV_TENANT_ID,
          learnerId: LEARNER_IDS[1],
          badgeId: badge.id,
          source: 'SYSTEM',
          awardedAt: new Date(),
        },
      });
    }
  }
  console.log(`  ✅ Awarded ${jordanBadges.length} badges to Jordan`);

  console.log('');
  console.log('✅ engagement-svc seeding complete!');
  console.log('');
  console.log(`Created ${badges.length} badge definitions`);
  console.log(`Created ${learnerProfiles.length} engagement profiles`);
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
