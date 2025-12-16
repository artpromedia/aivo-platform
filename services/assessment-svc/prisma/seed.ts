/**
 * AIVO Platform - Assessment Service Seed Data
 *
 * Creates:
 * - Baseline profiles for learners
 * - Baseline attempts with domain scores
 * - Sample baseline items and responses
 * - Skill estimates
 */

import {
  PrismaClient,
  GradeBand,
  BaselineStatus,
  BaselineDomain,
  RetestReasonType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Learners (from auth-svc)
const ALEX_USER_ID = '00000000-0000-0000-2000-000000000001';
const JORDAN_USER_ID = '00000000-0000-0000-2000-000000000002';
const SAM_USER_ID = '00000000-0000-0000-2000-000000000003';
const TAYLOR_USER_ID = '00000000-0000-0000-2000-000000000004';
const MORGAN_USER_ID = '00000000-0000-0000-2000-000000000005';

// Baseline profiles
const ALEX_PROFILE_ID = '00000000-0000-0000-e000-000000000001';
const JORDAN_PROFILE_ID = '00000000-0000-0000-e000-000000000002';
const SAM_PROFILE_ID = '00000000-0000-0000-e000-000000000003';
const TAYLOR_PROFILE_ID = '00000000-0000-0000-e000-000000000004';
const MORGAN_PROFILE_ID = '00000000-0000-0000-e000-000000000005';

// Attempts
const ALEX_ATTEMPT_1 = '00000000-0000-0000-e100-000000000001';
const ALEX_ATTEMPT_2 = '00000000-0000-0000-e100-000000000002';
const SAM_ATTEMPT_1 = '00000000-0000-0000-e100-000000000010';
const TAYLOR_ATTEMPT_1 = '00000000-0000-0000-e100-000000000020';

async function main() {
  console.log('🌱 Seeding assessment-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Baseline Profiles
  // ══════════════════════════════════════════════════════════════════════════

  // Alex - completed baseline, multiple attempts
  await prisma.baselineProfile.upsert({
    where: { id: ALEX_PROFILE_ID },
    update: {},
    create: {
      id: ALEX_PROFILE_ID,
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      gradeBand: GradeBand.K5,
      status: BaselineStatus.FINAL_ACCEPTED,
      attemptCount: 2,
      finalAttemptId: ALEX_ATTEMPT_2,
    },
  });
  console.log('  ✅ Created baseline profile: Alex (completed, 2 attempts)');

  // Jordan - not started
  await prisma.baselineProfile.upsert({
    where: { id: JORDAN_PROFILE_ID },
    update: {},
    create: {
      id: JORDAN_PROFILE_ID,
      tenantId: DEV_TENANT_ID,
      learnerId: JORDAN_USER_ID,
      gradeBand: GradeBand.K5,
      status: BaselineStatus.NOT_STARTED,
      attemptCount: 0,
    },
  });
  console.log('  ✅ Created baseline profile: Jordan (not started)');

  // Sam - completed on first attempt
  await prisma.baselineProfile.upsert({
    where: { id: SAM_PROFILE_ID },
    update: {},
    create: {
      id: SAM_PROFILE_ID,
      tenantId: DEV_TENANT_ID,
      learnerId: SAM_USER_ID,
      gradeBand: GradeBand.K5,
      status: BaselineStatus.FINAL_ACCEPTED,
      attemptCount: 1,
      finalAttemptId: SAM_ATTEMPT_1,
    },
  });
  console.log('  ✅ Created baseline profile: Sam (completed)');

  // Taylor - in progress
  await prisma.baselineProfile.upsert({
    where: { id: TAYLOR_PROFILE_ID },
    update: {},
    create: {
      id: TAYLOR_PROFILE_ID,
      tenantId: DEV_TENANT_ID,
      learnerId: TAYLOR_USER_ID,
      gradeBand: GradeBand.K5,
      status: BaselineStatus.IN_PROGRESS,
      attemptCount: 1,
    },
  });
  console.log('  ✅ Created baseline profile: Taylor (in progress)');

  // Morgan - not started
  await prisma.baselineProfile.upsert({
    where: { id: MORGAN_PROFILE_ID },
    update: {},
    create: {
      id: MORGAN_PROFILE_ID,
      tenantId: DEV_TENANT_ID,
      learnerId: MORGAN_USER_ID,
      gradeBand: GradeBand.K5,
      status: BaselineStatus.NOT_STARTED,
      attemptCount: 0,
    },
  });
  console.log('  ✅ Created baseline profile: Morgan (not started)');

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Baseline Attempts
  // ══════════════════════════════════════════════════════════════════════════

  // Alex's first attempt (retest allowed due to distraction)
  await prisma.baselineAttempt.upsert({
    where: { id: ALEX_ATTEMPT_1 },
    update: {},
    create: {
      id: ALEX_ATTEMPT_1,
      baselineProfileId: ALEX_PROFILE_ID,
      attemptNumber: 1,
      startedAt: new Date('2024-01-10T09:00:00Z'),
      completedAt: new Date('2024-01-10T09:25:00Z'),
      retestReasonType: RetestReasonType.DISTRACTED,
      retestReasonNotes: 'Learner was distracted by fire drill during assessment',
      domainScoresJson: {
        MATH: { score: 45, confidence: 0.6 },
        ELA: { score: 62, confidence: 0.7 },
      },
      overallEstimateJson: {
        compositeScore: 53,
        confidence: 0.65,
        gradeLevelEquivalent: '3.2',
      },
    },
  });
  console.log('  ✅ Created attempt: Alex #1 (retest allowed)');

  // Alex's second attempt (final)
  await prisma.baselineAttempt.upsert({
    where: { id: ALEX_ATTEMPT_2 },
    update: {},
    create: {
      id: ALEX_ATTEMPT_2,
      baselineProfileId: ALEX_PROFILE_ID,
      attemptNumber: 2,
      startedAt: new Date('2024-01-12T10:00:00Z'),
      completedAt: new Date('2024-01-12T10:30:00Z'),
      domainScoresJson: {
        MATH: { score: 58, confidence: 0.85 },
        ELA: { score: 71, confidence: 0.88 },
        SEL: { score: 65, confidence: 0.75 },
      },
      overallEstimateJson: {
        compositeScore: 65,
        confidence: 0.83,
        gradeLevelEquivalent: '3.8',
      },
    },
  });
  console.log('  ✅ Created attempt: Alex #2 (final)');

  // Sam's attempt
  await prisma.baselineAttempt.upsert({
    where: { id: SAM_ATTEMPT_1 },
    update: {},
    create: {
      id: SAM_ATTEMPT_1,
      baselineProfileId: SAM_PROFILE_ID,
      attemptNumber: 1,
      startedAt: new Date('2024-01-08T14:00:00Z'),
      completedAt: new Date('2024-01-08T14:35:00Z'),
      domainScoresJson: {
        MATH: { score: 72, confidence: 0.9 },
        ELA: { score: 68, confidence: 0.88 },
        SCIENCE: { score: 75, confidence: 0.85 },
        SEL: { score: 80, confidence: 0.82 },
      },
      overallEstimateJson: {
        compositeScore: 74,
        confidence: 0.86,
        gradeLevelEquivalent: '4.2',
      },
    },
  });
  console.log('  ✅ Created attempt: Sam #1 (completed)');

  // Taylor's in-progress attempt
  await prisma.baselineAttempt.upsert({
    where: { id: TAYLOR_ATTEMPT_1 },
    update: {},
    create: {
      id: TAYLOR_ATTEMPT_1,
      baselineProfileId: TAYLOR_PROFILE_ID,
      attemptNumber: 1,
      startedAt: new Date('2024-01-15T11:00:00Z'),
      completedAt: null, // Not completed
      domainScoresJson: null,
      overallEstimateJson: null,
    },
  });
  console.log('  ✅ Created attempt: Taylor #1 (in progress)');

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Sample Baseline Items (for Alex's final attempt)
  // ══════════════════════════════════════════════════════════════════════════

  const items = [
    {
      id: '00000000-0000-0000-e200-000000000001',
      baselineAttemptId: ALEX_ATTEMPT_2,
      sequenceIndex: 0,
      domain: BaselineDomain.MATH,
      gradeBand: GradeBand.K5,
      promptJson: {
        type: 'multiple_choice',
        question: 'What is 24 + 18?',
        options: ['32', '42', '52', '62'],
        correctIndex: 1,
      },
      correctAnswerJson: { value: '42', index: 1 },
      aiMetadataJson: {
        difficulty: 0.4,
        skill: 'addition-2digit',
        irtParams: { a: 1.2, b: -0.3, c: 0.25 },
      },
    },
    {
      id: '00000000-0000-0000-e200-000000000002',
      baselineAttemptId: ALEX_ATTEMPT_2,
      sequenceIndex: 1,
      domain: BaselineDomain.MATH,
      gradeBand: GradeBand.K5,
      promptJson: {
        type: 'multiple_choice',
        question: 'What is 1/2 + 1/4?',
        options: ['1/4', '2/6', '3/4', '1/6'],
        correctIndex: 2,
      },
      correctAnswerJson: { value: '3/4', index: 2 },
      aiMetadataJson: {
        difficulty: 0.65,
        skill: 'fraction-addition',
        irtParams: { a: 1.4, b: 0.5, c: 0.25 },
      },
    },
    {
      id: '00000000-0000-0000-e200-000000000003',
      baselineAttemptId: ALEX_ATTEMPT_2,
      sequenceIndex: 2,
      domain: BaselineDomain.ELA,
      gradeBand: GradeBand.K5,
      promptJson: {
        type: 'multiple_choice',
        question: 'Which word is a synonym for "happy"?',
        options: ['sad', 'joyful', 'angry', 'tired'],
        correctIndex: 1,
      },
      correctAnswerJson: { value: 'joyful', index: 1 },
      aiMetadataJson: {
        difficulty: 0.3,
        skill: 'vocabulary-synonyms',
        irtParams: { a: 1.1, b: -0.5, c: 0.25 },
      },
    },
    {
      id: '00000000-0000-0000-e200-000000000004',
      baselineAttemptId: ALEX_ATTEMPT_2,
      sequenceIndex: 3,
      domain: BaselineDomain.ELA,
      gradeBand: GradeBand.K5,
      promptJson: {
        type: 'reading_comprehension',
        passage: 'The cat sat on the mat. It was a sunny day.',
        question: 'Where did the cat sit?',
        options: ['on the bed', 'on the mat', 'on the chair', 'on the floor'],
        correctIndex: 1,
      },
      correctAnswerJson: { value: 'on the mat', index: 1 },
      aiMetadataJson: {
        difficulty: 0.25,
        skill: 'reading-literal',
        irtParams: { a: 1, b: -0.8, c: 0.25 },
      },
    },
    {
      id: '00000000-0000-0000-e200-000000000005',
      baselineAttemptId: ALEX_ATTEMPT_2,
      sequenceIndex: 4,
      domain: BaselineDomain.SEL,
      gradeBand: GradeBand.K5,
      promptJson: {
        type: 'scenario',
        scenario: 'Your friend accidentally breaks your favorite toy. How do you feel?',
        options: [
          'I would yell at them',
          'I would feel sad but talk to them about it',
          'I would never speak to them again',
          'I would break their toy',
        ],
        correctIndex: 1,
      },
      correctAnswerJson: { value: 'I would feel sad but talk to them about it', index: 1 },
      aiMetadataJson: {
        difficulty: 0.4,
        skill: 'emotional-regulation',
        irtParams: { a: 0.9, b: -0.2, c: 0.25 },
      },
    },
  ];

  for (const item of items) {
    await prisma.baselineItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`  ✅ Created ${items.length} baseline items`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create Baseline Responses
  // ══════════════════════════════════════════════════════════════════════════

  const responses = [
    {
      id: '00000000-0000-0000-e300-000000000001',
      baselineItemId: '00000000-0000-0000-e200-000000000001',
      learnerId: ALEX_USER_ID,
      responseJson: { selectedIndex: 1, value: '42' },
      isCorrect: true,
      score: new Decimal(1),
      latencyMs: 8500,
    },
    {
      id: '00000000-0000-0000-e300-000000000002',
      baselineItemId: '00000000-0000-0000-e200-000000000002',
      learnerId: ALEX_USER_ID,
      responseJson: { selectedIndex: 0, value: '1/4' },
      isCorrect: false,
      score: new Decimal(0),
      latencyMs: 15200,
    },
    {
      id: '00000000-0000-0000-e300-000000000003',
      baselineItemId: '00000000-0000-0000-e200-000000000003',
      learnerId: ALEX_USER_ID,
      responseJson: { selectedIndex: 1, value: 'joyful' },
      isCorrect: true,
      score: new Decimal(1),
      latencyMs: 4200,
    },
    {
      id: '00000000-0000-0000-e300-000000000004',
      baselineItemId: '00000000-0000-0000-e200-000000000004',
      learnerId: ALEX_USER_ID,
      responseJson: { selectedIndex: 1, value: 'on the mat' },
      isCorrect: true,
      score: new Decimal(1),
      latencyMs: 12300,
    },
    {
      id: '00000000-0000-0000-e300-000000000005',
      baselineItemId: '00000000-0000-0000-e200-000000000005',
      learnerId: ALEX_USER_ID,
      responseJson: { selectedIndex: 1, value: 'I would feel sad but talk to them about it' },
      isCorrect: true,
      score: new Decimal(1),
      latencyMs: 9800,
    },
  ];

  for (const response of responses) {
    await prisma.baselineResponse.upsert({
      where: { id: response.id },
      update: {},
      create: response,
    });
  }
  console.log(`  ✅ Created ${responses.length} baseline responses`);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Create Skill Estimates
  // ══════════════════════════════════════════════════════════════════════════

  const skillEstimates = [
    // Alex's skills from final attempt
    {
      id: '00000000-0000-0000-e400-000000000001',
      baselineAttemptId: ALEX_ATTEMPT_2,
      skillCode: 'MATH.NBT.2',
      domain: BaselineDomain.MATH,
      estimatedLevel: new Decimal(3.5),
      confidence: new Decimal(0.85),
    },
    {
      id: '00000000-0000-0000-e400-000000000002',
      baselineAttemptId: ALEX_ATTEMPT_2,
      skillCode: 'MATH.NF.1',
      domain: BaselineDomain.MATH,
      estimatedLevel: new Decimal(2.8),
      confidence: new Decimal(0.78),
    },
    {
      id: '00000000-0000-0000-e400-000000000003',
      baselineAttemptId: ALEX_ATTEMPT_2,
      skillCode: 'ELA.L.4',
      domain: BaselineDomain.ELA,
      estimatedLevel: new Decimal(4.2),
      confidence: new Decimal(0.88),
    },
    {
      id: '00000000-0000-0000-e400-000000000004',
      baselineAttemptId: ALEX_ATTEMPT_2,
      skillCode: 'ELA.RL.1',
      domain: BaselineDomain.ELA,
      estimatedLevel: new Decimal(3.9),
      confidence: new Decimal(0.82),
    },
    {
      id: '00000000-0000-0000-e400-000000000005',
      baselineAttemptId: ALEX_ATTEMPT_2,
      skillCode: 'SEL.SA.1',
      domain: BaselineDomain.SEL,
      estimatedLevel: new Decimal(3.7),
      confidence: new Decimal(0.75),
    },
    // Sam's skills
    {
      id: '00000000-0000-0000-e400-000000000010',
      baselineAttemptId: SAM_ATTEMPT_1,
      skillCode: 'MATH.NBT.2',
      domain: BaselineDomain.MATH,
      estimatedLevel: new Decimal(4.5),
      confidence: new Decimal(0.92),
    },
    {
      id: '00000000-0000-0000-e400-000000000011',
      baselineAttemptId: SAM_ATTEMPT_1,
      skillCode: 'MATH.NF.1',
      domain: BaselineDomain.MATH,
      estimatedLevel: new Decimal(4),
      confidence: new Decimal(0.88),
    },
    {
      id: '00000000-0000-0000-e400-000000000012',
      baselineAttemptId: SAM_ATTEMPT_1,
      skillCode: 'ELA.L.4',
      domain: BaselineDomain.ELA,
      estimatedLevel: new Decimal(4),
      confidence: new Decimal(0.85),
    },
  ];

  for (const estimate of skillEstimates) {
    await prisma.baselineSkillEstimate.upsert({
      where: { id: estimate.id },
      update: {},
      create: estimate,
    });
  }
  console.log(`  ✅ Created ${skillEstimates.length} skill estimates`);

  console.log('');
  console.log('✅ assessment-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 5 baseline profiles (2 completed, 1 in-progress, 2 not started)');
  console.log('  - 4 baseline attempts (including 1 retest)');
  console.log('  - 5 sample assessment items (Math, ELA, SEL)');
  console.log('  - 5 learner responses with scores');
  console.log('  - 8 skill estimates linked to Common Core standards');
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
