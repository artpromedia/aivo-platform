/**
 * Integration tests for the engagement service
 * Tests the flow: event ingestion → XP award → level up → badge check → NATS publish
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

import { applyEvent, getProfile } from '../services/engagementService.js';
import { checkAndAwardBadges, getBadgeProgress } from '../services/badgeAwardEngine.js';
import * as publisher from '../events/publisher.js';

// Mock NATS publisher
vi.mock('../events/publisher.js', () => ({
  publishEngagementEvent: vi.fn(),
  publishBadgeAwarded: vi.fn(),
  publishLevelUp: vi.fn(),
  publishStreakMilestone: vi.fn(),
}));

const prisma = new PrismaClient();

const TEST_TENANT_ID = 'test-tenant-engagement';
const TEST_LEARNER_ID = 'test-learner-001';

describe('Engagement Service Integration', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.engagementEvent.deleteMany({
      where: { learnerId: TEST_LEARNER_ID },
    });
    await prisma.learnerBadge.deleteMany({
      where: { learnerId: TEST_LEARNER_ID },
    });
    await prisma.kudos.deleteMany({
      where: { learnerId: TEST_LEARNER_ID },
    });
    await prisma.engagementProfile.deleteMany({
      where: { learnerId: TEST_LEARNER_ID },
    });

    // Create gamification settings for tenant
    await prisma.gamificationSettings.upsert({
      where: { tenantId: TEST_TENANT_ID },
      create: {
        tenantId: TEST_TENANT_ID,
        enabled: true,
        xpEnabled: true,
        streaksEnabled: true,
        badgesEnabled: true,
        kudosEnabled: true,
        showLeaderboards: false,
        defaultRewardStyle: 'growth',
      },
      update: {},
    });

    // Create test badges
    await prisma.badge.upsert({
      where: { code: 'first_session' },
      create: {
        code: 'first_session',
        name: 'First Steps',
        description: 'Complete your first session',
        category: 'milestone',
        icon: '🌟',
        criteria: {
          type: 'event_count',
          eventType: 'session_complete',
          threshold: 1,
        },
        xpReward: 50,
        isActive: true,
      },
      update: {},
    });

    await prisma.badge.upsert({
      where: { code: 'streak_3' },
      create: {
        code: 'streak_3',
        name: '3-Day Streak',
        description: 'Practice 3 days in a row',
        category: 'streak',
        icon: '🔥',
        criteria: {
          type: 'streak',
          threshold: 3,
        },
        xpReward: 100,
        isActive: true,
      },
      update: {},
    });

    await prisma.badge.upsert({
      where: { code: 'sessions_10' },
      create: {
        code: 'sessions_10',
        name: 'Dedicated Learner',
        description: 'Complete 10 sessions',
        category: 'milestone',
        icon: '📚',
        criteria: {
          type: 'event_count',
          eventType: 'session_complete',
          threshold: 10,
        },
        xpReward: 200,
        isActive: true,
      },
      update: {},
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.engagementEvent.deleteMany({
      where: { learnerId: TEST_LEARNER_ID },
    });
    await prisma.learnerBadge.deleteMany({
      where: { learnerId: TEST_LEARNER_ID },
    });
    await prisma.kudos.deleteMany({
      where: { learnerId: TEST_LEARNER_ID },
    });
    await prisma.engagementProfile.deleteMany({
      where: { learnerId: TEST_LEARNER_ID },
    });
    await prisma.$disconnect();
  });

  describe('Event Processing Flow', () => {
    it('should create profile and award XP on first event', async () => {
      const result = await applyEvent({
        tenantId: TEST_TENANT_ID,
        learnerId: TEST_LEARNER_ID,
        eventType: 'session_complete',
        xpAwarded: 25,
        metadata: { sessionId: 'session-001', durationMinutes: 15 },
      });

      expect(result.profile.totalXp).toBe(25);
      expect(result.profile.level).toBe(1);
      expect(result.profile.streakDays).toBeGreaterThanOrEqual(1);

      // Verify NATS event was published
      expect(publisher.publishEngagementEvent).toHaveBeenCalled();
    });

    it('should award first_session badge after first session', async () => {
      const awardedBadges = await checkAndAwardBadges(
        TEST_LEARNER_ID,
        TEST_TENANT_ID,
        'session_complete',
      );

      expect(awardedBadges.some((b) => b.code === 'first_session')).toBe(true);
      expect(publisher.publishBadgeAwarded).toHaveBeenCalled();
    });

    it('should accumulate XP across multiple events', async () => {
      // Apply several more events
      for (let i = 0; i < 5; i++) {
        await applyEvent({
          tenantId: TEST_TENANT_ID,
          learnerId: TEST_LEARNER_ID,
          eventType: 'activity_complete',
          xpAwarded: 10,
          metadata: { activityId: `activity-00${i}` },
        });
      }

      const profile = await getProfile(TEST_LEARNER_ID, TEST_TENANT_ID);
      expect(profile!.totalXp).toBeGreaterThanOrEqual(75); // 25 + 5*10 + bonus from badge
    });

    it('should level up when XP threshold is reached', async () => {
      // Award enough XP to level up (level 2 requires 100 XP typically)
      const result = await applyEvent({
        tenantId: TEST_TENANT_ID,
        learnerId: TEST_LEARNER_ID,
        eventType: 'session_complete',
        xpAwarded: 200,
        metadata: { sessionId: 'session-level-up' },
      });

      expect(result.profile.level).toBeGreaterThan(1);
      expect(result.leveledUp).toBe(true);
      expect(publisher.publishLevelUp).toHaveBeenCalled();
    });

    it('should track badge progress correctly', async () => {
      const progress = await getBadgeProgress(TEST_LEARNER_ID, TEST_TENANT_ID);

      const sessions10Progress = progress.find((p) => p.badge.code === 'sessions_10');
      expect(sessions10Progress).toBeDefined();
      expect(sessions10Progress!.currentValue).toBeGreaterThanOrEqual(2);
      expect(sessions10Progress!.targetValue).toBe(10);
    });

    it('should not award the same badge twice', async () => {
      const awardedBadges = await checkAndAwardBadges(
        TEST_LEARNER_ID,
        TEST_TENANT_ID,
        'session_complete',
      );

      // first_session badge should not be awarded again
      const firstSessionAwards = awardedBadges.filter((b) => b.code === 'first_session');
      expect(firstSessionAwards.length).toBe(0);
    });
  });

  describe('Profile Retrieval', () => {
    it('should return complete profile with all fields', async () => {
      const profile = await getProfile(TEST_LEARNER_ID, TEST_TENANT_ID);

      expect(profile).toBeDefined();
      expect(profile!.learnerId).toBe(TEST_LEARNER_ID);
      expect(profile!.tenantId).toBe(TEST_TENANT_ID);
      expect(typeof profile!.totalXp).toBe('number');
      expect(typeof profile!.level).toBe('number');
      expect(typeof profile!.streakDays).toBe('number');
      expect(profile!.streakStartDate).toBeDefined();
    });

    it('should return null for non-existent learner', async () => {
      const profile = await getProfile('non-existent-learner', TEST_TENANT_ID);
      expect(profile).toBeNull();
    });
  });

  describe('Badge Progress', () => {
    it('should return progress for all available badges', async () => {
      const progress = await getBadgeProgress(TEST_LEARNER_ID, TEST_TENANT_ID);

      expect(Array.isArray(progress)).toBe(true);
      expect(progress.length).toBeGreaterThan(0);

      // Each progress item should have badge info and current/target values
      progress.forEach((p) => {
        expect(p.badge).toBeDefined();
        expect(p.badge.code).toBeDefined();
        expect(typeof p.currentValue).toBe('number');
        expect(typeof p.targetValue).toBe('number');
      });
    });
  });

  describe('Streak Handling', () => {
    it('should maintain streak for consecutive days', async () => {
      const profile = await getProfile(TEST_LEARNER_ID, TEST_TENANT_ID);
      expect(profile!.streakDays).toBeGreaterThanOrEqual(1);
    });

    // Note: Testing streak break would require time manipulation
    // which is complex in integration tests. Consider unit tests for that.
  });
});

describe('Settings API', () => {
  it('should have gamification settings for test tenant', async () => {
    const settings = await prisma.gamificationSettings.findUnique({
      where: { tenantId: TEST_TENANT_ID },
    });

    expect(settings).toBeDefined();
    expect(settings!.enabled).toBe(true);
    expect(settings!.xpEnabled).toBe(true);
    expect(settings!.badgesEnabled).toBe(true);
  });
});
