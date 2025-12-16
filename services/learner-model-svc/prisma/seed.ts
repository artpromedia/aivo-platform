/**
 * AIVO Platform - Learner Model Service Seed Data
 *
 * Creates:
 * - Skill catalog (skills library)
 * - Skill prerequisites (learning graph)
 * - Virtual Brains for learners
 * - Learner skill states
 * - Learning objects catalog
 */

import { PrismaClient, SkillDomain, GradeBand, LearningObjectType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Learners
const ALEX_USER_ID = '00000000-0000-0000-2000-000000000001';
const JORDAN_USER_ID = '00000000-0000-0000-2000-000000000002';
const SAM_USER_ID = '00000000-0000-0000-2000-000000000003';

// Baseline profiles/attempts (from assessment-svc)
const ALEX_BASELINE_PROFILE = '00000000-0000-0000-e000-000000000001';
const ALEX_BASELINE_ATTEMPT = '00000000-0000-0000-e100-000000000002';
const SAM_BASELINE_PROFILE = '00000000-0000-0000-e000-000000000003';
const SAM_BASELINE_ATTEMPT = '00000000-0000-0000-e100-000000000010';

// Virtual brains
const ALEX_BRAIN_ID = '00000000-0000-0000-f000-000000000001';
const JORDAN_BRAIN_ID = '00000000-0000-0000-f000-000000000002';
const SAM_BRAIN_ID = '00000000-0000-0000-f000-000000000003';

async function main() {
  console.log('🌱 Seeding learner-model-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Skills Catalog
  // ══════════════════════════════════════════════════════════════════════════

  const skills = [
    // Math skills (K-5)
    { id: '00000000-0000-0000-f100-000000000001', skillCode: 'MATH.NBT.1', domain: SkillDomain.MATH, gradeBand: GradeBand.K5, displayName: 'Place Value (Ones/Tens)', description: 'Understand place value for ones and tens' },
    { id: '00000000-0000-0000-f100-000000000002', skillCode: 'MATH.NBT.2', domain: SkillDomain.MATH, gradeBand: GradeBand.K5, displayName: 'Multi-digit Addition', description: 'Add multi-digit whole numbers using strategies' },
    { id: '00000000-0000-0000-f100-000000000003', skillCode: 'MATH.NBT.3', domain: SkillDomain.MATH, gradeBand: GradeBand.K5, displayName: 'Multi-digit Subtraction', description: 'Subtract multi-digit whole numbers using strategies' },
    { id: '00000000-0000-0000-f100-000000000004', skillCode: 'MATH.OA.1', domain: SkillDomain.MATH, gradeBand: GradeBand.K5, displayName: 'Multiplication Basics', description: 'Interpret products of whole numbers' },
    { id: '00000000-0000-0000-f100-000000000005', skillCode: 'MATH.OA.2', domain: SkillDomain.MATH, gradeBand: GradeBand.K5, displayName: 'Division Basics', description: 'Interpret whole-number quotients' },
    { id: '00000000-0000-0000-f100-000000000006', skillCode: 'MATH.NF.1', domain: SkillDomain.MATH, gradeBand: GradeBand.K5, displayName: 'Fraction Concepts', description: 'Understand fractions as parts of a whole' },
    { id: '00000000-0000-0000-f100-000000000007', skillCode: 'MATH.NF.2', domain: SkillDomain.MATH, gradeBand: GradeBand.K5, displayName: 'Fraction Addition', description: 'Add fractions with like denominators' },
    { id: '00000000-0000-0000-f100-000000000008', skillCode: 'MATH.NF.3', domain: SkillDomain.MATH, gradeBand: GradeBand.K5, displayName: 'Fraction Subtraction', description: 'Subtract fractions with like denominators' },

    // ELA skills (K-5)
    { id: '00000000-0000-0000-f100-000000000010', skillCode: 'ELA.RF.1', domain: SkillDomain.ELA, gradeBand: GradeBand.K5, displayName: 'Print Concepts', description: 'Demonstrate understanding of organization and basic features of print' },
    { id: '00000000-0000-0000-f100-000000000011', skillCode: 'ELA.RF.2', domain: SkillDomain.ELA, gradeBand: GradeBand.K5, displayName: 'Phonological Awareness', description: 'Demonstrate understanding of spoken words, syllables, and sounds' },
    { id: '00000000-0000-0000-f100-000000000012', skillCode: 'ELA.RF.3', domain: SkillDomain.ELA, gradeBand: GradeBand.K5, displayName: 'Phonics & Word Recognition', description: 'Know and apply grade-level phonics and word analysis skills' },
    { id: '00000000-0000-0000-f100-000000000013', skillCode: 'ELA.RF.4', domain: SkillDomain.ELA, gradeBand: GradeBand.K5, displayName: 'Fluency', description: 'Read with sufficient accuracy and fluency' },
    { id: '00000000-0000-0000-f100-000000000014', skillCode: 'ELA.RL.1', domain: SkillDomain.ELA, gradeBand: GradeBand.K5, displayName: 'Key Ideas & Details', description: 'Ask and answer questions about key details in a text' },
    { id: '00000000-0000-0000-f100-000000000015', skillCode: 'ELA.L.4', domain: SkillDomain.ELA, gradeBand: GradeBand.K5, displayName: 'Vocabulary Acquisition', description: 'Determine or clarify meaning of unknown words' },
    { id: '00000000-0000-0000-f100-000000000016', skillCode: 'ELA.W.1', domain: SkillDomain.ELA, gradeBand: GradeBand.K5, displayName: 'Opinion Writing', description: 'Write opinion pieces on topics or texts' },

    // SEL skills
    { id: '00000000-0000-0000-f100-000000000020', skillCode: 'SEL.SA.1', domain: SkillDomain.SEL, gradeBand: GradeBand.K5, displayName: 'Self-Awareness', description: 'Recognize and label emotions' },
    { id: '00000000-0000-0000-f100-000000000021', skillCode: 'SEL.SM.1', domain: SkillDomain.SEL, gradeBand: GradeBand.K5, displayName: 'Self-Management', description: 'Manage emotions and behaviors to achieve goals' },
    { id: '00000000-0000-0000-f100-000000000022', skillCode: 'SEL.RS.1', domain: SkillDomain.SEL, gradeBand: GradeBand.K5, displayName: 'Relationship Skills', description: 'Form and maintain healthy relationships' },
    { id: '00000000-0000-0000-f100-000000000023', skillCode: 'SEL.RD.1', domain: SkillDomain.SEL, gradeBand: GradeBand.K5, displayName: 'Responsible Decision Making', description: 'Make ethical, constructive choices' },

    // Science skills
    { id: '00000000-0000-0000-f100-000000000030', skillCode: 'SCI.LS.1', domain: SkillDomain.SCIENCE, gradeBand: GradeBand.K5, displayName: 'Life Science Basics', description: 'Understand characteristics of living things' },
    { id: '00000000-0000-0000-f100-000000000031', skillCode: 'SCI.PS.1', domain: SkillDomain.SCIENCE, gradeBand: GradeBand.K5, displayName: 'Physical Science Basics', description: 'Understand properties of matter and energy' },
    { id: '00000000-0000-0000-f100-000000000032', skillCode: 'SCI.ES.1', domain: SkillDomain.SCIENCE, gradeBand: GradeBand.K5, displayName: 'Earth Science Basics', description: 'Understand Earth systems and processes' },
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { id: skill.id },
      update: {},
      create: skill,
    });
  }
  console.log(`  ✅ Created ${skills.length} skills in catalog`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Skill Prerequisites (Learning Graph Edges)
  // ══════════════════════════════════════════════════════════════════════════

  const prerequisites = [
    // Math progression
    { id: '00000000-0000-0000-f200-000000000001', prerequisiteSkillId: '00000000-0000-0000-f100-000000000001', dependentSkillId: '00000000-0000-0000-f100-000000000002' }, // Place Value -> Multi-digit Addition
    { id: '00000000-0000-0000-f200-000000000002', prerequisiteSkillId: '00000000-0000-0000-f100-000000000001', dependentSkillId: '00000000-0000-0000-f100-000000000003' }, // Place Value -> Multi-digit Subtraction
    { id: '00000000-0000-0000-f200-000000000003', prerequisiteSkillId: '00000000-0000-0000-f100-000000000002', dependentSkillId: '00000000-0000-0000-f100-000000000004' }, // Addition -> Multiplication
    { id: '00000000-0000-0000-f200-000000000004', prerequisiteSkillId: '00000000-0000-0000-f100-000000000003', dependentSkillId: '00000000-0000-0000-f100-000000000005' }, // Subtraction -> Division
    { id: '00000000-0000-0000-f200-000000000005', prerequisiteSkillId: '00000000-0000-0000-f100-000000000006', dependentSkillId: '00000000-0000-0000-f100-000000000007' }, // Fraction Concepts -> Fraction Addition
    { id: '00000000-0000-0000-f200-000000000006', prerequisiteSkillId: '00000000-0000-0000-f100-000000000006', dependentSkillId: '00000000-0000-0000-f100-000000000008' }, // Fraction Concepts -> Fraction Subtraction

    // ELA progression
    { id: '00000000-0000-0000-f200-000000000010', prerequisiteSkillId: '00000000-0000-0000-f100-000000000010', dependentSkillId: '00000000-0000-0000-f100-000000000011' }, // Print Concepts -> Phonological Awareness
    { id: '00000000-0000-0000-f200-000000000011', prerequisiteSkillId: '00000000-0000-0000-f100-000000000011', dependentSkillId: '00000000-0000-0000-f100-000000000012' }, // Phonological -> Phonics
    { id: '00000000-0000-0000-f200-000000000012', prerequisiteSkillId: '00000000-0000-0000-f100-000000000012', dependentSkillId: '00000000-0000-0000-f100-000000000013' }, // Phonics -> Fluency
    { id: '00000000-0000-0000-f200-000000000013', prerequisiteSkillId: '00000000-0000-0000-f100-000000000013', dependentSkillId: '00000000-0000-0000-f100-000000000014' }, // Fluency -> Key Ideas
    { id: '00000000-0000-0000-f200-000000000014', prerequisiteSkillId: '00000000-0000-0000-f100-000000000013', dependentSkillId: '00000000-0000-0000-f100-000000000015' }, // Fluency -> Vocabulary
  ];

  for (const prereq of prerequisites) {
    await prisma.skillPrerequisite.upsert({
      where: { id: prereq.id },
      update: {},
      create: prereq,
    });
  }
  console.log(`  ✅ Created ${prerequisites.length} skill prerequisites`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Virtual Brains for Learners
  // ══════════════════════════════════════════════════════════════════════════

  // Alex's virtual brain (initialized from baseline)
  await prisma.virtualBrain.upsert({
    where: { id: ALEX_BRAIN_ID },
    update: {},
    create: {
      id: ALEX_BRAIN_ID,
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      baselineProfileId: ALEX_BASELINE_PROFILE,
      baselineAttemptId: ALEX_BASELINE_ATTEMPT,
      gradeBand: GradeBand.K5,
      initializationJson: {
        source: 'baseline_assessment',
        initializedAt: '2024-01-12T10:35:00Z',
        domainScores: {
          MATH: 58,
          ELA: 71,
          SEL: 65,
        },
      },
    },
  });
  console.log('  ✅ Created virtual brain: Alex (from baseline)');

  // Jordan's virtual brain (new, no baseline yet)
  await prisma.virtualBrain.upsert({
    where: { id: JORDAN_BRAIN_ID },
    update: {},
    create: {
      id: JORDAN_BRAIN_ID,
      tenantId: DEV_TENANT_ID,
      learnerId: JORDAN_USER_ID,
      gradeBand: GradeBand.K5,
      initializationJson: {
        source: 'grade_level_default',
        initializedAt: new Date().toISOString(),
        note: 'Awaiting baseline assessment',
      },
    },
  });
  console.log('  ✅ Created virtual brain: Jordan (default)');

  // Sam's virtual brain (from baseline)
  await prisma.virtualBrain.upsert({
    where: { id: SAM_BRAIN_ID },
    update: {},
    create: {
      id: SAM_BRAIN_ID,
      tenantId: DEV_TENANT_ID,
      learnerId: SAM_USER_ID,
      baselineProfileId: SAM_BASELINE_PROFILE,
      baselineAttemptId: SAM_BASELINE_ATTEMPT,
      gradeBand: GradeBand.K5,
      initializationJson: {
        source: 'baseline_assessment',
        initializedAt: '2024-01-08T14:40:00Z',
        domainScores: {
          MATH: 72,
          ELA: 68,
          SCIENCE: 75,
          SEL: 80,
        },
      },
    },
  });
  console.log('  ✅ Created virtual brain: Sam (from baseline)');

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create Learner Skill States
  // ══════════════════════════════════════════════════════════════════════════

  const now = new Date();
  const skillStates = [
    // Alex's skill states
    { id: '00000000-0000-0000-f300-000000000001', virtualBrainId: ALEX_BRAIN_ID, skillId: '00000000-0000-0000-f100-000000000001', masteryLevel: new Decimal(0.85), confidence: new Decimal(0.9), practiceCount: 25, correctStreak: 8, lastAssessedAt: now },
    { id: '00000000-0000-0000-f300-000000000002', virtualBrainId: ALEX_BRAIN_ID, skillId: '00000000-0000-0000-f100-000000000002', masteryLevel: new Decimal(0.72), confidence: new Decimal(0.85), practiceCount: 18, correctStreak: 5, lastAssessedAt: now },
    { id: '00000000-0000-0000-f300-000000000003', virtualBrainId: ALEX_BRAIN_ID, skillId: '00000000-0000-0000-f100-000000000003', masteryLevel: new Decimal(0.68), confidence: new Decimal(0.8), practiceCount: 15, correctStreak: 3, lastAssessedAt: now },
    { id: '00000000-0000-0000-f300-000000000004', virtualBrainId: ALEX_BRAIN_ID, skillId: '00000000-0000-0000-f100-000000000006', masteryLevel: new Decimal(0.45), confidence: new Decimal(0.7), practiceCount: 8, correctStreak: 1, lastAssessedAt: now },
    { id: '00000000-0000-0000-f300-000000000005', virtualBrainId: ALEX_BRAIN_ID, skillId: '00000000-0000-0000-f100-000000000013', masteryLevel: new Decimal(0.78), confidence: new Decimal(0.88), practiceCount: 22, correctStreak: 6, lastAssessedAt: now },
    { id: '00000000-0000-0000-f300-000000000006', virtualBrainId: ALEX_BRAIN_ID, skillId: '00000000-0000-0000-f100-000000000020', masteryLevel: new Decimal(0.65), confidence: new Decimal(0.75), practiceCount: 10, correctStreak: 2, lastAssessedAt: now },

    // Sam's skill states (more advanced)
    { id: '00000000-0000-0000-f300-000000000010', virtualBrainId: SAM_BRAIN_ID, skillId: '00000000-0000-0000-f100-000000000001', masteryLevel: new Decimal(0.95), confidence: new Decimal(0.95), practiceCount: 30, correctStreak: 15, lastAssessedAt: now },
    { id: '00000000-0000-0000-f300-000000000011', virtualBrainId: SAM_BRAIN_ID, skillId: '00000000-0000-0000-f100-000000000002', masteryLevel: new Decimal(0.88), confidence: new Decimal(0.92), practiceCount: 28, correctStreak: 12, lastAssessedAt: now },
    { id: '00000000-0000-0000-f300-000000000012', virtualBrainId: SAM_BRAIN_ID, skillId: '00000000-0000-0000-f100-000000000004', masteryLevel: new Decimal(0.82), confidence: new Decimal(0.88), practiceCount: 20, correctStreak: 8, lastAssessedAt: now },
    { id: '00000000-0000-0000-f300-000000000013', virtualBrainId: SAM_BRAIN_ID, skillId: '00000000-0000-0000-f100-000000000006', masteryLevel: new Decimal(0.78), confidence: new Decimal(0.85), practiceCount: 18, correctStreak: 6, lastAssessedAt: now },
    { id: '00000000-0000-0000-f300-000000000014', virtualBrainId: SAM_BRAIN_ID, skillId: '00000000-0000-0000-f100-000000000007', masteryLevel: new Decimal(0.72), confidence: new Decimal(0.8), practiceCount: 14, correctStreak: 4, lastAssessedAt: now },
  ];

  for (const state of skillStates) {
    await prisma.learnerSkillState.upsert({
      where: { id: state.id },
      update: {},
      create: state,
    });
  }
  console.log(`  ✅ Created ${skillStates.length} learner skill states`);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Create Learning Objects Catalog
  // ══════════════════════════════════════════════════════════════════════════

  const learningObjects = [
    // Math activities
    {
      id: '00000000-0000-0000-f400-000000000001',
      tenantId: null, // Global
      skillCode: 'MATH.NBT.2',
      domain: SkillDomain.MATH,
      gradeBand: GradeBand.K5,
      difficultyLevel: 1,
      objectType: LearningObjectType.LESSON,
      title: 'Introduction to Addition',
      description: 'Learn the basics of adding single-digit numbers',
      estimatedMinutes: 10,
      isActive: true,
    },
    {
      id: '00000000-0000-0000-f400-000000000002',
      tenantId: null,
      skillCode: 'MATH.NBT.2',
      domain: SkillDomain.MATH,
      gradeBand: GradeBand.K5,
      difficultyLevel: 3,
      objectType: LearningObjectType.GAME,
      title: 'Number Ninja: Addition Challenge',
      description: 'Practice addition with a fun ninja-themed game',
      estimatedMinutes: 15,
      isActive: true,
    },
    {
      id: '00000000-0000-0000-f400-000000000003',
      tenantId: null,
      skillCode: 'MATH.NF.1',
      domain: SkillDomain.MATH,
      gradeBand: GradeBand.K5,
      difficultyLevel: 2,
      objectType: LearningObjectType.VIDEO,
      title: 'Fraction Fundamentals',
      description: 'Visual introduction to fractions using pizza and pie',
      estimatedMinutes: 8,
      isActive: true,
    },
    {
      id: '00000000-0000-0000-f400-000000000004',
      tenantId: null,
      skillCode: 'MATH.NF.2',
      domain: SkillDomain.MATH,
      gradeBand: GradeBand.K5,
      difficultyLevel: 3,
      objectType: LearningObjectType.EXERCISE,
      title: 'Adding Fractions Practice',
      description: 'Interactive exercises for adding fractions with like denominators',
      estimatedMinutes: 12,
      isActive: true,
    },

    // ELA activities
    {
      id: '00000000-0000-0000-f400-000000000010',
      tenantId: null,
      skillCode: 'ELA.RF.3',
      domain: SkillDomain.ELA,
      gradeBand: GradeBand.K5,
      difficultyLevel: 2,
      objectType: LearningObjectType.GAME,
      title: 'Phonics Fun',
      description: 'Match sounds to letters in this engaging phonics game',
      estimatedMinutes: 10,
      isActive: true,
    },
    {
      id: '00000000-0000-0000-f400-000000000011',
      tenantId: null,
      skillCode: 'ELA.RL.1',
      domain: SkillDomain.ELA,
      gradeBand: GradeBand.K5,
      difficultyLevel: 3,
      objectType: LearningObjectType.READING,
      title: 'The Little Red Hen',
      description: 'Read and answer questions about this classic story',
      estimatedMinutes: 15,
      isActive: true,
    },
    {
      id: '00000000-0000-0000-f400-000000000012',
      tenantId: null,
      skillCode: 'ELA.L.4',
      domain: SkillDomain.ELA,
      gradeBand: GradeBand.K5,
      difficultyLevel: 2,
      objectType: LearningObjectType.EXERCISE,
      title: 'Word Detective',
      description: 'Use context clues to figure out word meanings',
      estimatedMinutes: 10,
      isActive: true,
    },

    // SEL activities
    {
      id: '00000000-0000-0000-f400-000000000020',
      tenantId: null,
      skillCode: 'SEL.SA.1',
      domain: SkillDomain.SEL,
      gradeBand: GradeBand.K5,
      difficultyLevel: 1,
      objectType: LearningObjectType.VIDEO,
      title: 'Feelings Check-In',
      description: 'Learn to identify and name your emotions',
      estimatedMinutes: 5,
      isActive: true,
    },
    {
      id: '00000000-0000-0000-f400-000000000021',
      tenantId: null,
      skillCode: 'SEL.SM.1',
      domain: SkillDomain.SEL,
      gradeBand: GradeBand.K5,
      difficultyLevel: 2,
      objectType: LearningObjectType.LESSON,
      title: 'Calm Down Strategies',
      description: 'Learn breathing and grounding techniques',
      estimatedMinutes: 8,
      isActive: true,
    },
  ];

  for (const lo of learningObjects) {
    await prisma.learningObject.upsert({
      where: { id: lo.id },
      update: {},
      create: {
        ...lo,
        metadataJson: { accessibilityFeatures: ['closed_captions', 'text_to_speech'] },
      },
    });
  }
  console.log(`  ✅ Created ${learningObjects.length} learning objects`);

  console.log('');
  console.log('✅ learner-model-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 23 skills in catalog (Math, ELA, SEL, Science)');
  console.log('  - 11 skill prerequisites (learning graph)');
  console.log('  - 3 virtual brains (Alex, Jordan, Sam)');
  console.log('  - 11 learner skill states');
  console.log('  - 10 learning objects (lessons, games, videos, exercises)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
