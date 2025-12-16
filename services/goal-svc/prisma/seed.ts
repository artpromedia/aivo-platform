/**
 * AIVO Platform - Goal Service Seed Data
 *
 * Creates:
 * - Sample learning goals for learners
 * - Goal objectives with mastery criteria
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const TEACHER_USER_ID = '00000000-0000-0000-1000-000000000003';

// Learner IDs from auth-svc
const LEARNER_IDS = [
  '00000000-0000-0000-2000-000000000001', // alex
  '00000000-0000-0000-2000-000000000002', // jordan
  '00000000-0000-0000-2000-000000000003', // sam
];

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log('🌱 Seeding goal-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Goals for Alex
  // ══════════════════════════════════════════════════════════════════════════

  const alexGoals = [
    {
      id: '00000000-0000-0000-b000-000000000001',
      tenantId: DEV_TENANT_ID,
      learnerId: LEARNER_IDS[0],
      createdByUserId: TEACHER_USER_ID,
      title: 'Master Fraction Operations',
      description: 'Alex will demonstrate proficiency in adding, subtracting, multiplying, and dividing fractions.',
      category: 'ACADEMIC',
      subject: 'MATH',
      targetDate: daysFromNow(30),
      status: 'ACTIVE',
      progressPercent: 45,
      objectives: [
        {
          title: 'Add fractions with like denominators',
          targetValue: 80,
          currentValue: 85,
          unit: 'percent accuracy',
          isComplete: true,
        },
        {
          title: 'Add fractions with unlike denominators',
          targetValue: 80,
          currentValue: 60,
          unit: 'percent accuracy',
          isComplete: false,
        },
        {
          title: 'Subtract fractions',
          targetValue: 80,
          currentValue: 40,
          unit: 'percent accuracy',
          isComplete: false,
        },
        {
          title: 'Multiply fractions',
          targetValue: 80,
          currentValue: 20,
          unit: 'percent accuracy',
          isComplete: false,
        },
      ],
    },
    {
      id: '00000000-0000-0000-b000-000000000002',
      tenantId: DEV_TENANT_ID,
      learnerId: LEARNER_IDS[0],
      createdByUserId: TEACHER_USER_ID,
      title: 'Improve Focus Duration',
      description: 'Alex will increase sustained focus time during learning sessions.',
      category: 'BEHAVIORAL',
      subject: null,
      targetDate: daysFromNow(60),
      status: 'ACTIVE',
      progressPercent: 60,
      objectives: [
        {
          title: 'Complete 15-minute focused sessions',
          targetValue: 5,
          currentValue: 3,
          unit: 'sessions per week',
          isComplete: false,
        },
        {
          title: 'Reduce break frequency',
          targetValue: 2,
          currentValue: 3,
          unit: 'breaks per session',
          isComplete: false,
        },
      ],
    },
  ];

  for (const goal of alexGoals) {
    const { objectives, ...goalData } = goal;
    
    await prisma.goal.upsert({
      where: { id: goal.id },
      update: {},
      create: goalData,
    });

    for (let i = 0; i < objectives.length; i++) {
      await prisma.goalObjective.upsert({
        where: {
          goalId_orderIndex: {
            goalId: goal.id,
            orderIndex: i,
          },
        },
        update: {},
        create: {
          goalId: goal.id,
          orderIndex: i,
          ...objectives[i],
        },
      });
    }

    console.log(`  ✅ Created goal: ${goal.title}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Goals for Jordan (new learner)
  // ══════════════════════════════════════════════════════════════════════════

  const jordanGoal = {
    id: '00000000-0000-0000-b000-000000000010',
    tenantId: DEV_TENANT_ID,
    learnerId: LEARNER_IDS[1],
    createdByUserId: TEACHER_USER_ID,
    title: 'Complete Baseline Assessment',
    description: 'Jordan will complete initial baseline assessments in Math and ELA.',
    category: 'ACADEMIC',
    subject: null,
    targetDate: daysFromNow(7),
    status: 'ACTIVE',
    progressPercent: 50,
  };

  await prisma.goal.upsert({
    where: { id: jordanGoal.id },
    update: {},
    create: jordanGoal,
  });

  await prisma.goalObjective.upsert({
    where: {
      goalId_orderIndex: {
        goalId: jordanGoal.id,
        orderIndex: 0,
      },
    },
    update: {},
    create: {
      goalId: jordanGoal.id,
      orderIndex: 0,
      title: 'Complete Math baseline',
      targetValue: 1,
      currentValue: 1,
      unit: 'assessment',
      isComplete: true,
    },
  });

  await prisma.goalObjective.upsert({
    where: {
      goalId_orderIndex: {
        goalId: jordanGoal.id,
        orderIndex: 1,
      },
    },
    update: {},
    create: {
      goalId: jordanGoal.id,
      orderIndex: 1,
      title: 'Complete ELA baseline',
      targetValue: 1,
      currentValue: 0,
      unit: 'assessment',
      isComplete: false,
    },
  });

  console.log(`  ✅ Created goal: ${jordanGoal.title}`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Completed Goal for Sam
  // ══════════════════════════════════════════════════════════════════════════

  const samGoal = {
    id: '00000000-0000-0000-b000-000000000020',
    tenantId: DEV_TENANT_ID,
    learnerId: LEARNER_IDS[2],
    createdByUserId: TEACHER_USER_ID,
    title: 'Master Multiplication Tables',
    description: 'Sam will memorize multiplication tables 1-12.',
    category: 'ACADEMIC',
    subject: 'MATH',
    targetDate: daysFromNow(-7), // Past date
    status: 'COMPLETED',
    progressPercent: 100,
    completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  };

  await prisma.goal.upsert({
    where: { id: samGoal.id },
    update: {},
    create: samGoal,
  });

  await prisma.goalObjective.upsert({
    where: {
      goalId_orderIndex: {
        goalId: samGoal.id,
        orderIndex: 0,
      },
    },
    update: {},
    create: {
      goalId: samGoal.id,
      orderIndex: 0,
      title: 'Recall 1-6 tables',
      targetValue: 90,
      currentValue: 95,
      unit: 'percent accuracy',
      isComplete: true,
    },
  });

  await prisma.goalObjective.upsert({
    where: {
      goalId_orderIndex: {
        goalId: samGoal.id,
        orderIndex: 1,
      },
    },
    update: {},
    create: {
      goalId: samGoal.id,
      orderIndex: 1,
      title: 'Recall 7-12 tables',
      targetValue: 90,
      currentValue: 92,
      unit: 'percent accuracy',
      isComplete: true,
    },
  });

  console.log(`  ✅ Created goal: ${samGoal.title}`);

  console.log('');
  console.log('✅ goal-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 2 active goals for Alex');
  console.log('  - 1 active goal for Jordan');
  console.log('  - 1 completed goal for Sam');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
