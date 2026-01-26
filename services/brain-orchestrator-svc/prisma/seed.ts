import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding brain-orchestrator-svc database...');

  // Create sample learning path
  const learningPath = await prisma.learningPath.create({
    data: {
      learnerId: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      name: 'Introduction to Mathematics',
      description: 'A comprehensive path covering basic mathematical concepts',
      activities: {
        orderedActivities: [
          {
            activity: {
              id: '33333333-3333-3333-3333-333333333333',
              type: 'lesson-completion',
              title: 'Numbers and Counting',
              description: 'Learn basic number concepts',
              estimatedDuration: 15,
              cognitiveLoad: 'low',
              difficulty: 2,
              skillIds: ['math-numbers'],
              prerequisites: [],
              metadata: {},
            },
            order: 0,
            isRequired: true,
            unlockConditions: [],
          },
          {
            activity: {
              id: '44444444-4444-4444-4444-444444444444',
              type: 'practice-exercise',
              title: 'Number Practice',
              description: 'Practice counting and number recognition',
              estimatedDuration: 10,
              cognitiveLoad: 'medium',
              difficulty: 3,
              skillIds: ['math-numbers'],
              prerequisites: ['33333333-3333-3333-3333-333333333333'],
              metadata: {},
            },
            order: 1,
            isRequired: true,
            unlockConditions: [
              {
                type: 'completion',
                targetId: '33333333-3333-3333-3333-333333333333',
                targetValue: 1,
              },
            ],
          },
          {
            activity: {
              id: '55555555-5555-5555-5555-555555555555',
              type: 'assessment',
              title: 'Numbers Quiz',
              description: 'Test your understanding of numbers',
              estimatedDuration: 15,
              cognitiveLoad: 'high',
              difficulty: 4,
              skillIds: ['math-numbers'],
              prerequisites: ['44444444-4444-4444-4444-444444444444'],
              metadata: {},
            },
            order: 2,
            isRequired: true,
            unlockConditions: [
              {
                type: 'completion',
                targetId: '44444444-4444-4444-4444-444444444444',
                targetValue: 1,
              },
            ],
          },
        ],
        branchingPoints: [],
      },
      estimatedDuration: 40,
      progress: {
        create: {
          completedActivityIds: [],
          totalProgress: 0,
          estimatedTimeRemaining: 40,
        },
      },
    },
  });

  console.log('Created learning path:', learningPath.id);

  // Create sample skill mastery records
  const skillMastery = await prisma.skillMastery.createMany({
    data: [
      {
        learnerId: '11111111-1111-1111-1111-111111111111',
        skillId: 'math-numbers',
        level: 45,
        confidence: 0.7,
        practiceCount: 5,
        trend: 'improving',
      },
      {
        learnerId: '11111111-1111-1111-1111-111111111111',
        skillId: 'math-addition',
        level: 30,
        confidence: 0.5,
        practiceCount: 3,
        trend: 'stable',
      },
      {
        learnerId: '11111111-1111-1111-1111-111111111111',
        skillId: 'math-subtraction',
        level: 20,
        confidence: 0.4,
        practiceCount: 2,
        trend: 'stable',
      },
    ],
  });

  console.log('Created skill mastery records:', skillMastery.count);

  // Create sample cognitive session
  const session = await prisma.cognitiveSession.create({
    data: {
      learnerId: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      interactions: {
        create: [
          {
            learnerId: '11111111-1111-1111-1111-111111111111',
            tenantId: '22222222-2222-2222-2222-222222222222',
            type: 'page_view',
            activityId: '33333333-3333-3333-3333-333333333333',
            duration: 5000,
          },
          {
            learnerId: '11111111-1111-1111-1111-111111111111',
            tenantId: '22222222-2222-2222-2222-222222222222',
            type: 'answer_submit',
            activityId: '33333333-3333-3333-3333-333333333333',
            responseTime: 3500,
            isCorrect: true,
            attemptNumber: 1,
          },
        ],
      },
      cognitiveStates: {
        create: [
          {
            loadLevel: 'medium',
            loadScore: 45,
            fatigueLevel: 30,
            attentionScore: 75,
            errorRate: 0.1,
            responseLatency: 3500,
            engagementScore: 80,
          },
        ],
      },
    },
  });

  console.log('Created cognitive session:', session.id);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
