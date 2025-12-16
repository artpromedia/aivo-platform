/**
 * Database Seed Script
 *
 * Seeds the analytics database with sample data for development and testing.
 */

import { PrismaClient } from '../src/generated/prisma-client/index.js';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const TENANT_ID = 'tenant-001';
const USER_COUNT = 20;
const DAYS_OF_DATA = 30;

const SUBJECTS = [
  { id: 'math', name: 'Mathematics' },
  { id: 'science', name: 'Science' },
  { id: 'english', name: 'English' },
  { id: 'history', name: 'History' },
];

const TOPICS_PER_SUBJECT = [
  { subjectId: 'math', topics: ['algebra', 'geometry', 'calculus', 'statistics'] },
  { subjectId: 'science', topics: ['biology', 'chemistry', 'physics', 'earth-science'] },
  { subjectId: 'english', topics: ['grammar', 'literature', 'writing', 'vocabulary'] },
  { subjectId: 'history', topics: ['ancient', 'medieval', 'modern', 'american'] },
];

const CONTENT_TYPES = ['video', 'article', 'interactive', 'quiz', 'exercise'];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateUserId(index: number): string {
  return `user-${String(index).padStart(3, '0')}`;
}

function generateContentId(type: string, index: number): string {
  return `${type}-${String(index).padStart(4, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEED FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedLearningEvents(): Promise<void> {
  console.log('Seeding learning events...');

  const eventTypes = [
    'CONTENT_VIEWED',
    'CONTENT_COMPLETED',
    'VIDEO_PLAY',
    'VIDEO_COMPLETE',
    'ASSESSMENT_STARTED',
    'ASSESSMENT_COMPLETED',
    'QUESTION_ANSWERED',
    'SESSION_STARTED',
    'SESSION_ENDED',
    'XP_EARNED',
  ] as const;

  const eventCategories: Record<string, string> = {
    CONTENT_VIEWED: 'LEARNING',
    CONTENT_COMPLETED: 'LEARNING',
    VIDEO_PLAY: 'LEARNING',
    VIDEO_COMPLETE: 'LEARNING',
    ASSESSMENT_STARTED: 'ASSESSMENT',
    ASSESSMENT_COMPLETED: 'ASSESSMENT',
    QUESTION_ANSWERED: 'ASSESSMENT',
    SESSION_STARTED: 'LEARNING',
    SESSION_ENDED: 'LEARNING',
    XP_EARNED: 'ENGAGEMENT',
  };

  const events = [];
  const now = new Date();

  for (let day = 0; day < DAYS_OF_DATA; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);

    for (let userIdx = 0; userIdx < USER_COUNT; userIdx++) {
      const userId = generateUserId(userIdx);
      const sessionId = `session-${userId}-${date.toISOString().split('T')[0]}`;

      // Skip some days randomly for realistic patterns
      if (Math.random() < 0.2) continue;

      // Generate 5-20 events per user per day
      const eventCount = randomInt(5, 20);

      for (let e = 0; e < eventCount; e++) {
        const eventType = randomElement(eventTypes);
        const subject = randomElement(SUBJECTS);
        const topicData = TOPICS_PER_SUBJECT.find((t) => t.subjectId === subject.id);
        const topic = topicData ? randomElement(topicData.topics) : null;
        const contentType = randomElement(CONTENT_TYPES);
        const contentId = generateContentId(contentType, randomInt(1, 100));

        const timestamp = new Date(date);
        timestamp.setHours(randomInt(8, 22));
        timestamp.setMinutes(randomInt(0, 59));
        timestamp.setSeconds(randomInt(0, 59));

        events.push({
          tenantId: TENANT_ID,
          userId,
          sessionId,
          eventType: eventType as any,
          eventCategory: eventCategories[eventType] as any,
          contentId,
          contentType,
          subjectId: subject.id,
          topicId: topic ? `${subject.id}-${topic}` : null,
          data: {},
          duration: ['VIDEO_COMPLETE', 'CONTENT_VIEWED', 'ASSESSMENT_COMPLETED'].includes(eventType)
            ? randomInt(60, 1800)
            : null,
          score: ['ASSESSMENT_COMPLETED', 'QUESTION_ANSWERED', 'XP_EARNED'].includes(eventType)
            ? randomInt(0, 100)
            : null,
          deviceType: randomElement(['desktop', 'tablet', 'mobile']),
          platform: randomElement(['web', 'ios', 'android']),
          appVersion: '1.0.0',
          timestamp,
          processedAt: new Date(),
        });
      }
    }
  }

  // Insert in batches
  const batchSize = 1000;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    await prisma.learningEvent.createMany({ data: batch });
    console.log(`  Inserted ${Math.min(i + batchSize, events.length)}/${events.length} events`);
  }

  console.log(`  Created ${events.length} learning events`);
}

async function seedDailyUserMetrics(): Promise<void> {
  console.log('Seeding daily user metrics...');

  const metrics = [];
  const now = new Date();

  for (let day = 0; day < DAYS_OF_DATA; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);

    for (let userIdx = 0; userIdx < USER_COUNT; userIdx++) {
      // Skip some days randomly
      if (Math.random() < 0.15) continue;

      const userId = generateUserId(userIdx);
      const sessionsCount = randomInt(1, 5);
      const contentViewed = randomInt(3, 15);
      const contentCompleted = randomInt(0, contentViewed);
      const videosWatched = randomInt(0, 5);
      const assessmentsStarted = randomInt(0, 3);
      const assessmentsCompleted = randomInt(0, assessmentsStarted);
      const questionsAnswered = assessmentsCompleted * randomInt(5, 15);
      const questionsCorrect = Math.round(questionsAnswered * randomFloat(0.5, 0.95));

      metrics.push({
        tenantId: TENANT_ID,
        userId,
        date,
        totalTimeSeconds: randomInt(600, 7200),
        activeTimeSeconds: randomInt(300, 5400),
        sessionsCount,
        contentViewed,
        contentCompleted,
        videosWatched,
        videoTimeSeconds: videosWatched * randomInt(120, 600),
        assessmentsStarted,
        assessmentsCompleted,
        questionsAnswered,
        questionsCorrect,
        averageScore: assessmentsCompleted > 0 ? randomFloat(60, 95) : null,
        xpEarned: randomInt(50, 500),
        badgesEarned: Math.random() < 0.1 ? 1 : 0,
        aiInteractions: randomInt(0, 10),
      });
    }
  }

  await prisma.dailyUserMetrics.createMany({ data: metrics });
  console.log(`  Created ${metrics.length} daily user metrics`);
}

async function seedDailyContentMetrics(): Promise<void> {
  console.log('Seeding daily content metrics...');

  const metrics = [];
  const now = new Date();
  const contentItems = 50;

  for (let day = 0; day < DAYS_OF_DATA; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);

    for (let contentIdx = 0; contentIdx < contentItems; contentIdx++) {
      // Skip some content on some days
      if (Math.random() < 0.3) continue;

      const contentType = randomElement(CONTENT_TYPES);
      const contentId = generateContentId(contentType, contentIdx);
      const views = randomInt(5, 100);
      const completions = Math.round(views * randomFloat(0.3, 0.8));
      const attempts = contentType === 'quiz' ? randomInt(0, 20) : 0;

      metrics.push({
        tenantId: TENANT_ID,
        contentId,
        contentType,
        date,
        views,
        uniqueViewers: randomInt(Math.round(views * 0.7), views),
        completions,
        attempts,
        totalTimeSeconds: views * randomInt(60, 300),
        averageScore: attempts > 0 ? randomFloat(60, 90) : null,
        ratings: Math.random() < 0.2 ? randomInt(1, 10) : 0,
        averageRating: Math.random() < 0.2 ? randomFloat(3.5, 5) : null,
        bookmarks: Math.random() < 0.1 ? randomInt(1, 5) : 0,
        shares: Math.random() < 0.05 ? randomInt(1, 3) : 0,
      });
    }
  }

  await prisma.dailyContentMetrics.createMany({ data: metrics });
  console.log(`  Created ${metrics.length} daily content metrics`);
}

async function seedTopicProgress(): Promise<void> {
  console.log('Seeding topic progress...');

  const progress = [];

  for (let userIdx = 0; userIdx < USER_COUNT; userIdx++) {
    const userId = generateUserId(userIdx);

    for (const subject of SUBJECTS) {
      const topicData = TOPICS_PER_SUBJECT.find((t) => t.subjectId === subject.id);
      if (!topicData) continue;

      for (const topic of topicData.topics) {
        // Skip some topics randomly
        if (Math.random() < 0.3) continue;

        const topicId = `${subject.id}-${topic}`;
        const progressPercent = randomFloat(10, 100);
        const masteryLevel = randomFloat(0, progressPercent / 100);

        const firstAccessedAt = new Date();
        firstAccessedAt.setDate(firstAccessedAt.getDate() - randomInt(7, 60));

        const lastAccessedAt = new Date();
        lastAccessedAt.setDate(lastAccessedAt.getDate() - randomInt(0, 7));

        progress.push({
          tenantId: TENANT_ID,
          userId,
          subjectId: subject.id,
          topicId,
          progressPercent,
          masteryLevel,
          totalTimeSeconds: randomInt(1800, 36000),
          totalContent: randomInt(5, 20),
          completedContent: Math.round(randomInt(5, 20) * (progressPercent / 100)),
          assessmentsTaken: randomInt(0, 10),
          averageScore: randomFloat(60, 95),
          firstAccessedAt,
          lastAccessedAt,
        });
      }
    }
  }

  await prisma.topicProgress.createMany({ data: progress });
  console.log(`  Created ${progress.length} topic progress records`);
}

async function seedPeriodMetrics(): Promise<void> {
  console.log('Seeding period metrics...');

  const now = new Date();
  const periodTypes = ['WEEKLY', 'MONTHLY'] as const;

  for (const periodType of periodTypes) {
    const periodCount = periodType === 'WEEKLY' ? 8 : 3;
    const periodDays = periodType === 'WEEKLY' ? 7 : 30;

    for (let i = 0; i < periodCount; i++) {
      const periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - (i + 1) * periodDays);
      periodStart.setHours(0, 0, 0, 0);

      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + periodDays);

      const metricData = {
        totalTimeSeconds: randomInt(100000, 500000),
        activeTimeSeconds: randomInt(50000, 250000),
        sessionsCount: randomInt(100, 500),
        contentViewed: randomInt(500, 2000),
        contentCompleted: randomInt(200, 1000),
        videosWatched: randomInt(100, 500),
        videoTimeSeconds: randomInt(20000, 100000),
        assessmentsStarted: randomInt(50, 200),
        assessmentsCompleted: randomInt(40, 180),
        questionsAnswered: randomInt(500, 2000),
        questionsCorrect: randomInt(350, 1600),
        xpEarned: randomInt(10000, 50000),
        badgesEarned: randomInt(5, 30),
        aiInteractions: randomInt(100, 500),
        uniqueUsers: randomInt(15, USER_COUNT),
        averageScore: randomFloat(65, 85),
        engagementScore: randomFloat(50, 90),
      };

      await prisma.periodMetrics.create({
        data: {
          tenantId: TENANT_ID,
          periodType: periodType as any,
          scope: 'TENANT',
          scopeId: TENANT_ID,
          periodStart,
          periodEnd,
          metricData,
        },
      });
    }
  }

  console.log('  Created period metrics');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log('Starting analytics database seed...\n');

  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await prisma.learningEvent.deleteMany({ where: { tenantId: TENANT_ID } });
    await prisma.dailyUserMetrics.deleteMany({ where: { tenantId: TENANT_ID } });
    await prisma.dailyContentMetrics.deleteMany({ where: { tenantId: TENANT_ID } });
    await prisma.topicProgress.deleteMany({ where: { tenantId: TENANT_ID } });
    await prisma.periodMetrics.deleteMany({ where: { tenantId: TENANT_ID } });
    console.log('  Cleared existing data\n');

    // Seed new data
    await seedLearningEvents();
    await seedDailyUserMetrics();
    await seedDailyContentMetrics();
    await seedTopicProgress();
    await seedPeriodMetrics();

    console.log('\n✅ Seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
