/**
 * AIVO Platform - Homework Helper Service Seed Data
 *
 * Creates:
 * - Sample homework submissions
 * - Scaffolded steps for homework assistance
 */

import {
  PrismaClient,
  Subject,
  GradeBand,
  SourceType,
  SubmissionStatus,
} from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Learner IDs from auth-svc
const LEARNER_IDS = [
  '00000000-0000-0000-2000-000000000001', // alex
  '00000000-0000-0000-2000-000000000002', // jordan
];

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function main() {
  console.log('🌱 Seeding homework-helper-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Completed Homework Submission (Alex)
  // ══════════════════════════════════════════════════════════════════════════

  const mathSubmission = await prisma.homeworkSubmission.upsert({
    where: { id: '00000000-0000-0000-9000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-9000-000000000001',
      tenantId: DEV_TENANT_ID,
      learnerId: LEARNER_IDS[0],
      sessionId: null,
      subject: Subject.MATH,
      gradeBand: GradeBand.K5,
      sourceType: SourceType.IMAGE,
      sourceUrl: '/uploads/homework/alex-math-001.jpg',
      rawText:
        'A farmer has 24 apples. He wants to put them in bags with 6 apples in each bag. How many bags does he need?',
      status: SubmissionStatus.COMPLETED,
      stepCount: 4,
      stepsCompleted: 4,
      aiCorrelationId: 'ai-corr-001',
      createdAt: hoursAgo(24),
      updatedAt: hoursAgo(23),
    },
  });

  // Create scaffolding steps for math problem
  const mathSteps = [
    {
      id: '00000000-0000-0000-9100-000000000001',
      submissionId: mathSubmission.id,
      stepOrder: 1,
      promptText: 'What information does the problem give us? What do we know?',
      hintText: 'Look for the numbers in the problem. What do they represent?',
      expectedConcept: 'Identify given: 24 apples total, 6 apples per bag',
      isStarted: true,
      isCompleted: true,
      hintRevealed: false,
    },
    {
      id: '00000000-0000-0000-9100-000000000002',
      submissionId: mathSubmission.id,
      stepOrder: 2,
      promptText: 'What is the problem asking us to find?',
      hintText: 'What does "how many" usually mean we need to calculate?',
      expectedConcept: 'Identify question: Find number of bags needed',
      isStarted: true,
      isCompleted: true,
      hintRevealed: false,
    },
    {
      id: '00000000-0000-0000-9100-000000000003',
      submissionId: mathSubmission.id,
      stepOrder: 3,
      promptText: "If we're putting equal groups into bags, what math operation should we use?",
      hintText: 'When we split things into equal groups, we use division.',
      expectedConcept: 'Recognize division: 24 ÷ 6',
      isStarted: true,
      isCompleted: true,
      hintRevealed: true,
    },
    {
      id: '00000000-0000-0000-9100-000000000004',
      submissionId: mathSubmission.id,
      stepOrder: 4,
      promptText: 'Now solve: 24 divided by 6 equals what?',
      hintText: 'Think: 6 times what number equals 24?',
      expectedConcept: '24 ÷ 6 = 4 bags',
      isStarted: true,
      isCompleted: true,
      hintRevealed: false,
    },
  ];

  for (const step of mathSteps) {
    await prisma.homeworkStep.upsert({
      where: { id: step.id },
      update: {},
      create: step,
    });
  }

  console.log(`  ✅ Created completed homework submission for Alex (${mathSteps.length} steps)`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create In-Progress Homework Submission (Alex)
  // ══════════════════════════════════════════════════════════════════════════

  const elaSubmission = await prisma.homeworkSubmission.upsert({
    where: { id: '00000000-0000-0000-9000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-9000-000000000002',
      tenantId: DEV_TENANT_ID,
      learnerId: LEARNER_IDS[0],
      sessionId: null,
      subject: Subject.ELA,
      gradeBand: GradeBand.K5,
      sourceType: SourceType.TEXT,
      rawText:
        'Write a paragraph about your favorite season. Include at least 3 reasons why it is your favorite.',
      status: SubmissionStatus.SCAFFOLDED,
      stepCount: 5,
      stepsCompleted: 2,
      aiCorrelationId: 'ai-corr-002',
      createdAt: hoursAgo(2),
      updatedAt: hoursAgo(1),
    },
  });

  const elaSteps = [
    {
      id: '00000000-0000-0000-9100-000000000010',
      submissionId: elaSubmission.id,
      stepOrder: 1,
      promptText: 'First, which season is your favorite? Summer, Fall, Winter, or Spring?',
      expectedConcept: 'Choose a season',
      isStarted: true,
      isCompleted: true,
    },
    {
      id: '00000000-0000-0000-9100-000000000011',
      submissionId: elaSubmission.id,
      stepOrder: 2,
      promptText:
        "Great choice! Now, can you think of your first reason? What's one thing you love about this season?",
      expectedConcept: 'First reason',
      isStarted: true,
      isCompleted: true,
    },
    {
      id: '00000000-0000-0000-9100-000000000012',
      submissionId: elaSubmission.id,
      stepOrder: 3,
      promptText: "What's another thing that makes this season special to you?",
      hintText: 'Think about activities, weather, holidays, or foods you enjoy during this time.',
      expectedConcept: 'Second reason',
      isStarted: true,
      isCompleted: false,
    },
    {
      id: '00000000-0000-0000-9100-000000000013',
      submissionId: elaSubmission.id,
      stepOrder: 4,
      promptText:
        'Can you think of one more reason? Three reasons will make your paragraph strong!',
      expectedConcept: 'Third reason',
      isStarted: false,
      isCompleted: false,
    },
    {
      id: '00000000-0000-0000-9100-000000000014',
      submissionId: elaSubmission.id,
      stepOrder: 5,
      promptText:
        'Now let\'s put it all together! Start with "My favorite season is..." and include all three reasons.',
      expectedConcept: 'Complete paragraph',
      isStarted: false,
      isCompleted: false,
    },
  ];

  for (const step of elaSteps) {
    await prisma.homeworkStep.upsert({
      where: { id: step.id },
      update: {},
      create: step,
    });
  }

  console.log(`  ✅ Created in-progress homework submission for Alex (${elaSteps.length} steps)`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create New Homework Submission (Jordan)
  // ══════════════════════════════════════════════════════════════════════════

  const scienceSubmission = await prisma.homeworkSubmission.upsert({
    where: { id: '00000000-0000-0000-9000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-9000-000000000003',
      tenantId: DEV_TENANT_ID,
      learnerId: LEARNER_IDS[1],
      sessionId: null,
      subject: Subject.SCIENCE,
      gradeBand: GradeBand.K5,
      sourceType: SourceType.IMAGE,
      sourceUrl: '/uploads/homework/jordan-science-001.jpg',
      rawText: 'Explain the three states of matter and give an example of each.',
      status: SubmissionStatus.SCAFFOLDED,
      stepCount: 4,
      stepsCompleted: 0,
      aiCorrelationId: 'ai-corr-003',
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
    },
  });

  const scienceSteps = [
    {
      id: '00000000-0000-0000-9100-000000000020',
      submissionId: scienceSubmission.id,
      stepOrder: 1,
      promptText: 'Do you know the three states of matter? What are they called?',
      hintText:
        'Think about water - it can be ice, liquid water, or steam. What are these three forms called?',
      expectedConcept: 'Solid, liquid, gas',
      isStarted: false,
      isCompleted: false,
    },
    {
      id: '00000000-0000-0000-9100-000000000021',
      submissionId: scienceSubmission.id,
      stepOrder: 2,
      promptText: "Let's start with solids. What makes something a solid? Can you give an example?",
      hintText: "Solids have a definite shape. They don't flow like liquids.",
      expectedConcept: 'Solid: definite shape, example like ice or rock',
      isStarted: false,
      isCompleted: false,
    },
    {
      id: '00000000-0000-0000-9100-000000000022',
      submissionId: scienceSubmission.id,
      stepOrder: 3,
      promptText: "Now think about liquids. How are they different from solids? What's an example?",
      hintText: 'Liquids flow and take the shape of their container.',
      expectedConcept: 'Liquid: flows, takes container shape, example like water or juice',
      isStarted: false,
      isCompleted: false,
    },
    {
      id: '00000000-0000-0000-9100-000000000023',
      submissionId: scienceSubmission.id,
      stepOrder: 4,
      promptText:
        "Finally, what about gases? How are they special? What's an example you can think of?",
      hintText: "Gases spread out to fill any space. You can't always see them!",
      expectedConcept: 'Gas: spreads to fill space, example like air or steam',
      isStarted: false,
      isCompleted: false,
    },
  ];

  for (const step of scienceSteps) {
    await prisma.homeworkStep.upsert({
      where: { id: step.id },
      update: {},
      create: step,
    });
  }

  console.log(`  ✅ Created new homework submission for Jordan (${scienceSteps.length} steps)`);

  console.log('');
  console.log('✅ homework-helper-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 1 completed submission (Alex - Math)');
  console.log('  - 1 in-progress submission (Alex - ELA)');
  console.log('  - 1 new submission (Jordan - Science)');
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
