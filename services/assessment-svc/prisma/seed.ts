/**
 * AIVO Platform - Assessment Service Seed Data
 *
 * Creates:
 * - Baseline profiles for learners
 * - Baseline attempts with domain scores
 * - Sample baseline items and responses
 * - Skill estimates
 * - Assessments (Quiz, Test, Practice)
 * - Questions with various types
 * - Sample attempts and responses
 * - Question pools
 */

import { PrismaClient } from '../generated/prisma-client/index.js';
import type {
  GradeBand,
  BaselineStatus,
  BaselineDomain,
  RetestReasonType,
} from '../generated/prisma-client/index.js';

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

  // ══════════════════════════════════════════════════════════════════════════
  // NEW: Assessment Service Data
  // ══════════════════════════════════════════════════════════════════════════

  await seedAssessmentData();

  console.log('');
  console.log('✅ assessment-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 5 baseline profiles (2 completed, 1 in-progress, 2 not started)');
  console.log('  - 4 baseline attempts (including 1 retest)');
  console.log('  - 5 sample assessment items (Math, ELA, SEL)');
  console.log('  - 5 learner responses with scores');
  console.log('  - 8 skill estimates linked to Common Core standards');
  console.log('  - 3 assessments (Quiz, Test, Practice)');
  console.log('  - 15+ questions with various types');
  console.log('  - Sample attempts and responses');
}

// ══════════════════════════════════════════════════════════════════════════════
// Assessment Data Seeding
// ══════════════════════════════════════════════════════════════════════════════

// Assessment IDs
const MATH_QUIZ_ID = '00000000-0000-0000-a000-000000000001';
const READING_TEST_ID = '00000000-0000-0000-a000-000000000002';
const SCIENCE_PRACTICE_ID = '00000000-0000-0000-a000-000000000003';

// Question IDs
const QUESTION_MC_1 = '00000000-0000-0000-a100-000000000001';
const QUESTION_MC_2 = '00000000-0000-0000-a100-000000000002';
const QUESTION_TF_1 = '00000000-0000-0000-a100-000000000003';
const QUESTION_TF_2 = '00000000-0000-0000-a100-000000000004';
const QUESTION_SHORT_1 = '00000000-0000-0000-a100-000000000005';
const QUESTION_NUMERIC_1 = '00000000-0000-0000-a100-000000000006';
const QUESTION_ORDER_1 = '00000000-0000-0000-a100-000000000007';
const QUESTION_MATCH_1 = '00000000-0000-0000-a100-000000000008';
const QUESTION_FILL_1 = '00000000-0000-0000-a100-000000000009';
const QUESTION_SELECT_1 = '00000000-0000-0000-a100-000000000010';

// Teacher ID (from auth-svc)
const TEACHER_USER_ID = '00000000-0000-0000-1000-000000000001';

async function seedAssessmentData() {
  console.log('');
  console.log('📝 Seeding Assessment data...');

  // Create Questions
  const questions = [
    {
      id: QUESTION_MC_1,
      tenantId: DEV_TENANT_ID,
      authorId: TEACHER_USER_ID,
      type: 'MULTIPLE_CHOICE' as const,
      stem: 'What is 2 + 2?',
      options: [
        { id: 'a', text: '3' },
        { id: 'b', text: '4' },
        { id: 'c', text: '5' },
        { id: 'd', text: '6' },
      ],
      correctAnswer: { optionId: 'b' },
      explanation: 'Two plus two equals four.',
      difficulty: 'EASY' as const,
      points: 1,
      tags: ['math', 'addition', 'basic'],
      stats: {
        timesAnswered: 100,
        correctRate: 95,
        averageTimeSeconds: 10,
        discriminationIndex: 0.3,
      },
    },
    {
      id: QUESTION_MC_2,
      tenantId: DEV_TENANT_ID,
      authorId: TEACHER_USER_ID,
      type: 'MULTIPLE_CHOICE' as const,
      stem: 'What is the capital of France?',
      options: [
        { id: 'a', text: 'London' },
        { id: 'b', text: 'Berlin' },
        { id: 'c', text: 'Paris' },
        { id: 'd', text: 'Madrid' },
      ],
      correctAnswer: { optionId: 'c' },
      explanation: 'Paris is the capital city of France.',
      difficulty: 'EASY' as const,
      points: 1,
      tags: ['geography', 'capitals', 'europe'],
      stats: {
        timesAnswered: 80,
        correctRate: 90,
        averageTimeSeconds: 8,
        discriminationIndex: 0.25,
      },
    },
    {
      id: QUESTION_TF_1,
      tenantId: DEV_TENANT_ID,
      authorId: TEACHER_USER_ID,
      type: 'TRUE_FALSE' as const,
      stem: 'The sun rises in the east.',
      correctAnswer: { value: true },
      explanation: 'The sun rises in the east and sets in the west.',
      difficulty: 'BEGINNER' as const,
      points: 1,
      tags: ['science', 'astronomy', 'basic'],
      stats: {
        timesAnswered: 120,
        correctRate: 98,
        averageTimeSeconds: 5,
        discriminationIndex: 0.1,
      },
    },
    {
      id: QUESTION_TF_2,
      tenantId: DEV_TENANT_ID,
      authorId: TEACHER_USER_ID,
      type: 'TRUE_FALSE' as const,
      stem: 'Water boils at 50 degrees Celsius at sea level.',
      correctAnswer: { value: false },
      explanation: 'Water boils at 100 degrees Celsius (212°F) at sea level.',
      difficulty: 'MEDIUM' as const,
      points: 1,
      tags: ['science', 'chemistry', 'water'],
      stats: {
        timesAnswered: 60,
        correctRate: 75,
        averageTimeSeconds: 12,
        discriminationIndex: 0.45,
      },
    },
    {
      id: QUESTION_SHORT_1,
      tenantId: DEV_TENANT_ID,
      authorId: TEACHER_USER_ID,
      type: 'SHORT_ANSWER' as const,
      stem: 'What is the chemical symbol for water?',
      correctAnswer: { acceptedAnswers: ['H2O', 'h2o'], caseSensitive: false },
      explanation: 'Water is composed of two hydrogen atoms and one oxygen atom.',
      difficulty: 'EASY' as const,
      points: 1,
      tags: ['science', 'chemistry', 'elements'],
      stats: {
        timesAnswered: 50,
        correctRate: 85,
        averageTimeSeconds: 15,
        discriminationIndex: 0.35,
      },
    },
    {
      id: QUESTION_NUMERIC_1,
      tenantId: DEV_TENANT_ID,
      authorId: TEACHER_USER_ID,
      type: 'NUMERIC' as const,
      stem: 'What is the square root of 144?',
      correctAnswer: { value: 12, tolerance: 0 },
      explanation: '12 × 12 = 144, so the square root of 144 is 12.',
      difficulty: 'MEDIUM' as const,
      points: 2,
      tags: ['math', 'square-roots', 'algebra'],
      stats: {
        timesAnswered: 40,
        correctRate: 70,
        averageTimeSeconds: 20,
        discriminationIndex: 0.5,
      },
    },
    {
      id: QUESTION_ORDER_1,
      tenantId: DEV_TENANT_ID,
      authorId: TEACHER_USER_ID,
      type: 'ORDERING' as const,
      stem: 'Arrange these planets in order from closest to the sun to farthest:',
      options: [
        { id: 'mercury', text: 'Mercury' },
        { id: 'venus', text: 'Venus' },
        { id: 'earth', text: 'Earth' },
        { id: 'mars', text: 'Mars' },
      ],
      correctAnswer: { correctOrder: ['mercury', 'venus', 'earth', 'mars'] },
      explanation: 'Mercury is closest, followed by Venus, Earth, then Mars.',
      difficulty: 'MEDIUM' as const,
      points: 2,
      tags: ['science', 'astronomy', 'planets'],
      stats: {
        timesAnswered: 30,
        correctRate: 60,
        averageTimeSeconds: 30,
        discriminationIndex: 0.55,
      },
    },
    {
      id: QUESTION_MATCH_1,
      tenantId: DEV_TENANT_ID,
      authorId: TEACHER_USER_ID,
      type: 'MATCHING' as const,
      stem: 'Match each country to its capital city:',
      options: [
        { id: 'uk', text: 'United Kingdom' },
        { id: 'japan', text: 'Japan' },
        { id: 'canada', text: 'Canada' },
      ],
      correctAnswer: {
        pairs: [
          { left: 'United Kingdom', right: 'London' },
          { left: 'Japan', right: 'Tokyo' },
          { left: 'Canada', right: 'Ottawa' },
        ],
      },
      explanation: 'London is the capital of the UK, Tokyo of Japan, and Ottawa of Canada.',
      difficulty: 'MEDIUM' as const,
      points: 3,
      tags: ['geography', 'capitals', 'world'],
      stats: {
        timesAnswered: 25,
        correctRate: 65,
        averageTimeSeconds: 45,
        discriminationIndex: 0.48,
      },
    },
    {
      id: QUESTION_FILL_1,
      tenantId: DEV_TENANT_ID,
      authorId: TEACHER_USER_ID,
      type: 'FILL_BLANK' as const,
      stem: 'The mitochondria is the _____ of the cell.',
      correctAnswer: {
        blanks: [
          { position: 0, acceptedAnswers: ['powerhouse', 'power house'], caseSensitive: false },
        ],
      },
      explanation: 'Mitochondria produce ATP, which is the energy currency of cells.',
      difficulty: 'MEDIUM' as const,
      points: 1,
      tags: ['biology', 'cells', 'organelles'],
      stats: {
        timesAnswered: 70,
        correctRate: 80,
        averageTimeSeconds: 18,
        discriminationIndex: 0.4,
      },
    },
    {
      id: QUESTION_SELECT_1,
      tenantId: DEV_TENANT_ID,
      authorId: TEACHER_USER_ID,
      type: 'MULTIPLE_SELECT' as const,
      stem: 'Which of the following are primary colors? (Select all that apply)',
      options: [
        { id: 'red', text: 'Red' },
        { id: 'green', text: 'Green' },
        { id: 'blue', text: 'Blue' },
        { id: 'yellow', text: 'Yellow' },
        { id: 'purple', text: 'Purple' },
      ],
      correctAnswer: { optionIds: ['red', 'blue', 'yellow'] },
      explanation: 'The primary colors in traditional color theory are red, blue, and yellow.',
      difficulty: 'EASY' as const,
      points: 2,
      tags: ['art', 'colors', 'basics'],
      stats: {
        timesAnswered: 45,
        correctRate: 55,
        averageTimeSeconds: 25,
        discriminationIndex: 0.52,
      },
    },
  ];

  for (const question of questions) {
    await prisma.question.upsert({
      where: { id: question.id },
      update: {},
      create: question,
    });
  }
  console.log(`  ✅ Created ${questions.length} questions`);

  // Create Assessments
  const assessments = [
    {
      id: MATH_QUIZ_ID,
      tenantId: DEV_TENANT_ID,
      authorId: TEACHER_USER_ID,
      title: 'Basic Math Skills Quiz',
      description: 'A quick quiz to test basic arithmetic skills.',
      type: 'QUIZ' as const,
      status: 'PUBLISHED' as const,
      settings: {
        timeLimit: 10,
        passingScore: 70,
        maxAttempts: 3,
        shuffleQuestions: true,
        showCorrectAnswers: true,
        showExplanations: true,
      },
      difficulty: 'EASY' as const,
      estimatedMinutes: 10,
      totalPoints: 5,
      publishedAt: new Date(),
    },
    {
      id: READING_TEST_ID,
      tenantId: DEV_TENANT_ID,
      authorId: TEACHER_USER_ID,
      title: 'Science Knowledge Test',
      description: 'A comprehensive test covering basic science concepts.',
      type: 'TEST' as const,
      status: 'PUBLISHED' as const,
      settings: {
        timeLimit: 30,
        passingScore: 60,
        maxAttempts: 2,
        shuffleQuestions: false,
        showCorrectAnswers: false,
        showExplanations: false,
        allowReview: true,
      },
      difficulty: 'MEDIUM' as const,
      estimatedMinutes: 25,
      totalPoints: 10,
      publishedAt: new Date(),
    },
    {
      id: SCIENCE_PRACTICE_ID,
      tenantId: DEV_TENANT_ID,
      authorId: TEACHER_USER_ID,
      title: 'Geography Practice',
      description: 'Practice questions on world geography and capitals.',
      type: 'PRACTICE' as const,
      status: 'PUBLISHED' as const,
      settings: {
        showCorrectAnswers: true,
        showExplanations: true,
        adaptiveDifficulty: true,
      },
      difficulty: 'MEDIUM' as const,
      estimatedMinutes: 15,
      totalPoints: 6,
      publishedAt: new Date(),
    },
  ];

  for (const assessment of assessments) {
    await prisma.assessment.upsert({
      where: { id: assessment.id },
      update: {},
      create: assessment,
    });
  }
  console.log(`  ✅ Created ${assessments.length} assessments`);

  // Link questions to assessments
  const assessmentQuestions = [
    // Math Quiz
    { assessmentId: MATH_QUIZ_ID, questionId: QUESTION_MC_1, orderIndex: 0 },
    { assessmentId: MATH_QUIZ_ID, questionId: QUESTION_NUMERIC_1, orderIndex: 1 },
    { assessmentId: MATH_QUIZ_ID, questionId: QUESTION_TF_1, orderIndex: 2 },

    // Science Test
    { assessmentId: READING_TEST_ID, questionId: QUESTION_TF_1, orderIndex: 0 },
    { assessmentId: READING_TEST_ID, questionId: QUESTION_TF_2, orderIndex: 1 },
    { assessmentId: READING_TEST_ID, questionId: QUESTION_SHORT_1, orderIndex: 2 },
    { assessmentId: READING_TEST_ID, questionId: QUESTION_ORDER_1, orderIndex: 3 },
    { assessmentId: READING_TEST_ID, questionId: QUESTION_FILL_1, orderIndex: 4 },

    // Geography Practice
    { assessmentId: SCIENCE_PRACTICE_ID, questionId: QUESTION_MC_2, orderIndex: 0 },
    { assessmentId: SCIENCE_PRACTICE_ID, questionId: QUESTION_MATCH_1, orderIndex: 1 },
    { assessmentId: SCIENCE_PRACTICE_ID, questionId: QUESTION_SELECT_1, orderIndex: 2 },
  ];

  for (const aq of assessmentQuestions) {
    await prisma.assessmentQuestion.upsert({
      where: {
        assessmentId_questionId: {
          assessmentId: aq.assessmentId,
          questionId: aq.questionId,
        },
      },
      update: {},
      create: {
        ...aq,
        required: true,
      },
    });
  }
  console.log(`  ✅ Linked ${assessmentQuestions.length} questions to assessments`);

  // Create sample attempts
  const ATTEMPT_1_ID = '00000000-0000-0000-a200-000000000001';

  await prisma.attempt.upsert({
    where: { id: ATTEMPT_1_ID },
    update: {},
    create: {
      id: ATTEMPT_1_ID,
      assessmentId: MATH_QUIZ_ID,
      userId: ALEX_USER_ID,
      tenantId: DEV_TENANT_ID,
      status: 'GRADED',
      attemptNumber: 1,
      startedAt: new Date(Date.now() - 1000 * 60 * 10),
      submittedAt: new Date(Date.now() - 1000 * 60 * 5),
      timeSpentSeconds: 300,
      score: 80,
      pointsEarned: 4,
      pointsPossible: 5,
      passed: true,
      gradedAt: new Date(),
    },
  });

  // Create sample responses for the attempt
  const responses = [
    {
      attemptId: ATTEMPT_1_ID,
      questionId: QUESTION_MC_1,
      response: { optionId: 'b' },
      isCorrect: true,
      pointsEarned: 1,
      timeSpentSeconds: 60,
    },
    {
      attemptId: ATTEMPT_1_ID,
      questionId: QUESTION_NUMERIC_1,
      response: { value: 12 },
      isCorrect: true,
      pointsEarned: 2,
      timeSpentSeconds: 120,
    },
    {
      attemptId: ATTEMPT_1_ID,
      questionId: QUESTION_TF_1,
      response: { value: true },
      isCorrect: true,
      pointsEarned: 1,
      timeSpentSeconds: 30,
    },
  ];

  for (const response of responses) {
    await prisma.questionResponse.upsert({
      where: {
        attemptId_questionId: {
          attemptId: response.attemptId,
          questionId: response.questionId,
        },
      },
      update: {},
      create: {
        ...response,
        partialCredit: false,
        answeredAt: new Date(),
      },
    });
  }
  console.log(`  ✅ Created 1 sample attempt with ${responses.length} responses`);

  // Create question pool
  const POOL_1_ID = '00000000-0000-0000-a300-000000000001';
  await prisma.questionPool.upsert({
    where: { id: POOL_1_ID },
    update: {},
    create: {
      id: POOL_1_ID,
      tenantId: DEV_TENANT_ID,
      name: 'Easy Science Questions',
      description: 'A pool of easy science questions for practice assessments.',
      criteria: {
        difficulties: ['BEGINNER', 'EASY'],
        tags: ['science'],
        minCorrectRate: 70,
      },
    },
  });
  console.log('  ✅ Created 1 question pool');
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
