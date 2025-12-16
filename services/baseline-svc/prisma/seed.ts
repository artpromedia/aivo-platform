/**
 * AIVO Platform - Baseline Service Seed Data
 *
 * Creates:
 * - Baseline profiles for learners
 * - Baseline attempts with domain scores
 * - Baseline items and responses
 * - Skill estimates
 */

import { PrismaClient, BaselineDomain, GradeBand, BaselineStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Learners
const ALEX_USER_ID = '00000000-0000-0000-2000-000000000001';
const JORDAN_USER_ID = '00000000-0000-0000-2000-000000000002';
const SAM_USER_ID = '00000000-0000-0000-2000-000000000003';

// Baseline profiles
const ALEX_BASELINE = '00000000-0000-0000-ba00-000000000001';
const JORDAN_BASELINE = '00000000-0000-0000-ba00-000000000002';
const SAM_BASELINE = '00000000-0000-0000-ba00-000000000003';

// Attempts
const ALEX_ATTEMPT_1 = '00000000-0000-0000-ba10-000000000001';
const JORDAN_ATTEMPT_1 = '00000000-0000-0000-ba10-000000000002';
const SAM_ATTEMPT_1 = '00000000-0000-0000-ba10-000000000003';

async function main() {
  console.log('🌱 Seeding baseline-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Baseline Profiles
  // ══════════════════════════════════════════════════════════════════════════

  const profiles = [
    {
      id: ALEX_BASELINE,
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      gradeBand: GradeBand.K5,
      status: BaselineStatus.COMPLETED,
      attemptCount: 1,
      finalAttemptId: ALEX_ATTEMPT_1,
    },
    {
      id: JORDAN_BASELINE,
      tenantId: DEV_TENANT_ID,
      learnerId: JORDAN_USER_ID,
      gradeBand: GradeBand.K5,
      status: BaselineStatus.IN_PROGRESS,
      attemptCount: 1,
    },
    {
      id: SAM_BASELINE,
      tenantId: DEV_TENANT_ID,
      learnerId: SAM_USER_ID,
      gradeBand: GradeBand.K5,
      status: BaselineStatus.NOT_STARTED,
      attemptCount: 0,
    },
  ];

  // Create profiles without finalAttemptId first
  for (const profile of profiles) {
    const { finalAttemptId, ...profileData } = profile;
    await prisma.baselineProfile.upsert({
      where: { id: profile.id },
      update: {},
      create: profileData,
    });
  }
  console.log(`  ✅ Created ${profiles.length} baseline profiles`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Baseline Attempts
  // ══════════════════════════════════════════════════════════════════════════

  const attempts = [
    {
      id: ALEX_ATTEMPT_1,
      baselineProfileId: ALEX_BASELINE,
      attemptNumber: 1,
      startedAt: new Date('2024-01-10T09:00:00Z'),
      completedAt: new Date('2024-01-10T09:35:00Z'),
      domainScoresJson: {
        [BaselineDomain.MATH]: { raw: 18, scaled: 72, percentile: 65 },
        [BaselineDomain.ELA]: { raw: 22, scaled: 78, percentile: 72 },
        [BaselineDomain.SEL]: { raw: 15, scaled: 68, percentile: 55 },
      },
      overallEstimateJson: {
        compositeScore: 73,
        gradeEquivalent: '3.2',
        confidenceInterval: [70, 76],
        assessmentDuration: 35,
      },
    },
    {
      id: JORDAN_ATTEMPT_1,
      baselineProfileId: JORDAN_BASELINE,
      attemptNumber: 1,
      startedAt: new Date('2024-01-12T10:00:00Z'),
      domainScoresJson: {
        [BaselineDomain.MATH]: { raw: 10, scaled: 55, percentile: 40 },
        // ELA not yet completed
      },
      overallEstimateJson: null,
    },
  ];

  for (const attempt of attempts) {
    await prisma.baselineAttempt.upsert({
      where: { id: attempt.id },
      update: {},
      create: attempt,
    });
  }
  console.log(`  ✅ Created ${attempts.length} baseline attempts`);

  // Update Alex's profile with finalAttemptId
  await prisma.baselineProfile.update({
    where: { id: ALEX_BASELINE },
    data: { finalAttemptId: ALEX_ATTEMPT_1 },
  });
  console.log('  ✅ Updated Alex profile with final attempt');

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Baseline Items (sample problems)
  // ══════════════════════════════════════════════════════════════════════════

  const items = [
    // Alex's completed Math items
    {
      id: '00000000-0000-0000-ba20-000000000001',
      baselineAttemptId: ALEX_ATTEMPT_1,
      sequenceIndex: 0,
      domain: BaselineDomain.MATH,
      gradeBand: GradeBand.K5,
      promptJson: {
        type: 'multiple_choice',
        stem: 'What is 15 + 28?',
        options: ['33', '43', '53', '42'],
        difficulty: 0.4,
      },
      correctAnswerJson: { answer: '43', index: 1 },
      aiMetadataJson: { skillId: 'addition-2digit', adaptiveLevel: 3 },
    },
    {
      id: '00000000-0000-0000-ba20-000000000002',
      baselineAttemptId: ALEX_ATTEMPT_1,
      sequenceIndex: 1,
      domain: BaselineDomain.MATH,
      gradeBand: GradeBand.K5,
      promptJson: {
        type: 'multiple_choice',
        stem: 'What is 7 × 8?',
        options: ['54', '56', '48', '64'],
        difficulty: 0.5,
      },
      correctAnswerJson: { answer: '56', index: 1 },
      aiMetadataJson: { skillId: 'multiplication-basic', adaptiveLevel: 4 },
    },
    {
      id: '00000000-0000-0000-ba20-000000000003',
      baselineAttemptId: ALEX_ATTEMPT_1,
      sequenceIndex: 2,
      domain: BaselineDomain.ELA,
      gradeBand: GradeBand.K5,
      promptJson: {
        type: 'multiple_choice',
        stem: 'Which word is a noun? "The small dog ran quickly."',
        options: ['small', 'dog', 'ran', 'quickly'],
        difficulty: 0.3,
      },
      correctAnswerJson: { answer: 'dog', index: 1 },
      aiMetadataJson: { skillId: 'parts-of-speech-nouns', adaptiveLevel: 2 },
    },
    {
      id: '00000000-0000-0000-ba20-000000000004',
      baselineAttemptId: ALEX_ATTEMPT_1,
      sequenceIndex: 3,
      domain: BaselineDomain.SEL,
      gradeBand: GradeBand.K5,
      promptJson: {
        type: 'scale',
        stem: 'When I feel frustrated, I can calm myself down.',
        options: ['Never', 'Sometimes', 'Often', 'Always'],
        difficulty: 0.5,
      },
      correctAnswerJson: { isScaleItem: true, targetRange: [2, 3] },
      aiMetadataJson: { skillId: 'self-regulation', adaptiveLevel: 3 },
    },
    // Jordan's in-progress Math items
    {
      id: '00000000-0000-0000-ba20-000000000010',
      baselineAttemptId: JORDAN_ATTEMPT_1,
      sequenceIndex: 0,
      domain: BaselineDomain.MATH,
      gradeBand: GradeBand.K5,
      promptJson: {
        type: 'multiple_choice',
        stem: 'What is 12 + 15?',
        options: ['25', '27', '37', '17'],
        difficulty: 0.3,
      },
      correctAnswerJson: { answer: '27', index: 1 },
      aiMetadataJson: { skillId: 'addition-2digit', adaptiveLevel: 2 },
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
    // Alex's responses
    {
      id: '00000000-0000-0000-ba30-000000000001',
      baselineItemId: '00000000-0000-0000-ba20-000000000001',
      learnerId: ALEX_USER_ID,
      responseJson: { selectedIndex: 1, selectedAnswer: '43' },
      isCorrect: true,
      score: new Decimal('1.000'),
      latencyMs: 8500,
    },
    {
      id: '00000000-0000-0000-ba30-000000000002',
      baselineItemId: '00000000-0000-0000-ba20-000000000002',
      learnerId: ALEX_USER_ID,
      responseJson: { selectedIndex: 1, selectedAnswer: '56' },
      isCorrect: true,
      score: new Decimal('1.000'),
      latencyMs: 12000,
    },
    {
      id: '00000000-0000-0000-ba30-000000000003',
      baselineItemId: '00000000-0000-0000-ba20-000000000003',
      learnerId: ALEX_USER_ID,
      responseJson: { selectedIndex: 1, selectedAnswer: 'dog' },
      isCorrect: true,
      score: new Decimal('1.000'),
      latencyMs: 5200,
    },
    {
      id: '00000000-0000-0000-ba30-000000000004',
      baselineItemId: '00000000-0000-0000-ba20-000000000004',
      learnerId: ALEX_USER_ID,
      responseJson: { selectedIndex: 1, selectedAnswer: 'Sometimes' },
      isCorrect: null, // Scale items don't have right/wrong
      score: new Decimal('0.333'),
      latencyMs: 4100,
    },
    // Jordan's responses
    {
      id: '00000000-0000-0000-ba30-000000000010',
      baselineItemId: '00000000-0000-0000-ba20-000000000010',
      learnerId: JORDAN_USER_ID,
      responseJson: { selectedIndex: 1, selectedAnswer: '27' },
      isCorrect: true,
      score: new Decimal('1.000'),
      latencyMs: 15000,
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
    // Alex's skill estimates from completed baseline
    {
      id: '00000000-0000-0000-ba40-000000000001',
      baselineAttemptId: ALEX_ATTEMPT_1,
      skillId: 'addition-2digit',
      domain: BaselineDomain.MATH,
      estimate: new Decimal('0.750'),
      standardError: new Decimal('0.120'),
      itemCount: 4,
    },
    {
      id: '00000000-0000-0000-ba40-000000000002',
      baselineAttemptId: ALEX_ATTEMPT_1,
      skillId: 'multiplication-basic',
      domain: BaselineDomain.MATH,
      estimate: new Decimal('0.680'),
      standardError: new Decimal('0.150'),
      itemCount: 3,
    },
    {
      id: '00000000-0000-0000-ba40-000000000003',
      baselineAttemptId: ALEX_ATTEMPT_1,
      skillId: 'parts-of-speech-nouns',
      domain: BaselineDomain.ELA,
      estimate: new Decimal('0.820'),
      standardError: new Decimal('0.100'),
      itemCount: 5,
    },
    {
      id: '00000000-0000-0000-ba40-000000000004',
      baselineAttemptId: ALEX_ATTEMPT_1,
      skillId: 'reading-comprehension',
      domain: BaselineDomain.ELA,
      estimate: new Decimal('0.700'),
      standardError: new Decimal('0.130'),
      itemCount: 4,
    },
    {
      id: '00000000-0000-0000-ba40-000000000005',
      baselineAttemptId: ALEX_ATTEMPT_1,
      skillId: 'self-regulation',
      domain: BaselineDomain.SEL,
      estimate: new Decimal('0.550'),
      standardError: new Decimal('0.180'),
      itemCount: 3,
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
  console.log('✅ baseline-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 3 baseline profiles (Alex=completed, Jordan=in_progress, Sam=not_started)');
  console.log('  - 2 baseline attempts');
  console.log('  - 5 baseline items (sample assessment questions)');
  console.log('  - 5 baseline responses');
  console.log('  - 5 skill estimates for Alex');
  console.log('');
  console.log('Demonstrates:');
  console.log('  - Multi-domain baseline assessment (Math, ELA, SEL)');
  console.log('  - Adaptive item generation with difficulty levels');
  console.log('  - IRT-based skill estimation');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
