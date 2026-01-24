/**
 * AIVO Platform - Baseline Service Seed Data (Family Accounts)
 *
 * Creates:
 * - Baseline profiles for all 6 learners
 * - Parent assessment responses linked to profiles
 * - Completed baseline attempts with domain scores
 *
 * Run with: npx prisma db seed
 * Or directly: npx tsx prisma/seed-families.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  TENANTS,
  LEARNERS,
  LEARNER_PROFILES,
  PARENT_ASSESSMENTS,
  PARENT_ASSESSMENT_DATA,
} from '@aivo/seed-data';

const prisma = new PrismaClient();

// Define enum values directly (matching schema.prisma)
const BaselineDomain = {
  ELA: 'ELA',
  MATH: 'MATH',
  SCIENCE: 'SCIENCE',
  SPEECH: 'SPEECH',
  SEL: 'SEL',
} as const;

const GradeBand = {
  K5: 'K5',
  G6_8: 'G6_8',
  G9_12: 'G9_12',
} as const;

const BaselineStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  RETEST_ALLOWED: 'RETEST_ALLOWED',
  FINAL_ACCEPTED: 'FINAL_ACCEPTED',
} as const;

type GradeBandType = (typeof GradeBand)[keyof typeof GradeBand];

// Map grade to grade band (using actual schema values: K5, G6_8, G9_12)
function getGradeBand(grade: string): GradeBandType {
  const gradeNum = parseInt(grade) || 0;
  if (gradeNum <= 5) return GradeBand.K5;
  if (gradeNum <= 8) return GradeBand.G6_8;
  return GradeBand.G9_12;
}

// Generate realistic domain scores based on functioning level
function generateDomainScores(functioningLevel: string) {
  const baseScores = {
    PROFOUND: { math: 15, ela: 12, sel: 20 },
    SEVERE: { math: 25, ela: 22, sel: 28 },
    MODERATE: { math: 45, ela: 42, sel: 50 },
    MILD: { math: 68, ela: 65, sel: 70 },
    TYPICAL: { math: 75, ela: 78, sel: 80 },
  };

  const scores = baseScores[functioningLevel as keyof typeof baseScores] || baseScores.MILD;

  return {
    [BaselineDomain.MATH]: {
      raw: Math.floor(scores.math * 0.3),
      scaled: scores.math + Math.floor(Math.random() * 10) - 5,
      percentile: Math.floor(scores.math * 0.9),
    },
    [BaselineDomain.ELA]: {
      raw: Math.floor(scores.ela * 0.3),
      scaled: scores.ela + Math.floor(Math.random() * 10) - 5,
      percentile: Math.floor(scores.ela * 0.9),
    },
    [BaselineDomain.SEL]: {
      raw: Math.floor(scores.sel * 0.3),
      scaled: scores.sel + Math.floor(Math.random() * 10) - 5,
      percentile: Math.floor(scores.sel * 0.9),
    },
  };
}

async function main() {
  console.log('🌱 Seeding baseline-svc with family assessment data...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Baseline Profiles FIRST (ParentAssessment depends on this)
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating baseline profiles...');

  const profileMap: Record<string, string> = {};

  for (const [key, learner] of Object.entries(LEARNER_PROFILES)) {
    const profileId = `00000000-0000-0000-ba00-${learner.id.slice(-12)}`;
    
    const profile = await prisma.baselineProfile.upsert({
      where: { 
        tenantId_learnerId: {
          tenantId: TENANTS.ANOKA_HENNEPIN,
          learnerId: learner.id,
        }
      },
      update: {},
      create: {
        id: profileId,
        tenantId: TENANTS.ANOKA_HENNEPIN,
        learnerId: learner.id,
        gradeBand: getGradeBand(learner.grade),
        status: BaselineStatus.COMPLETED,
        attemptCount: 1,
      },
    });
    
    profileMap[key] = profile.id;
    console.log(`  ✅ Created baseline profile for ${learner.firstName} ${learner.lastName}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Parent Assessment Records (linked to BaselineProfile)
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating parent assessment records...');

  for (const [key, assessmentData] of Object.entries(PARENT_ASSESSMENT_DATA)) {
    const learner = LEARNER_PROFILES[key as keyof typeof LEARNER_PROFILES];
    const baselineProfileId = profileMap[key];

    // Create parent assessment record linked to the baseline profile
    const assessment = await prisma.parentAssessment.upsert({
      where: { baselineProfileId },
      update: {},
      create: {
        id: assessmentData.id,
        baselineProfileId,
        parentUserId: assessmentData.parentId,
        status: 'COMPLETED',
        completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        hasExistingIep: assessmentData.hasExistingIep,
        hasExisting504: assessmentData.hasExisting504,
        disabilityCategoriesJson: assessmentData.disabilityCategories,
        currentServicesJson: assessmentData.currentServices,
        responsesJson: assessmentData.responsesJson,
        strengthsNotes: assessmentData.strengths,
        challengesNotes: assessmentData.challenges,
        learningStyleNotes: assessmentData.learningStyleNotes,
        assessmentType: assessmentData.assessmentType as any,
        supportLevel: assessmentData.supportLevel,
        enrolledByRole: 'parent',
      },
    });

    console.log(`  ✅ Created parent assessment for ${learner.firstName} ${learner.lastName} (Support Level: ${assessmentData.supportLevel})`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Baseline Attempts with Domain Scores
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating baseline attempts...');

  for (const [key, learner] of Object.entries(LEARNER_PROFILES)) {
    const profileId = profileMap[key];
    const attemptId = `00000000-0000-0000-ba10-${learner.id.slice(-12)}`;

    const domainScores = generateDomainScores(learner.functioningLevel);

    // Check if attempt exists
    const existingAttempt = await prisma.baselineAttempt.findFirst({
      where: { baselineProfileId: profileId, attemptNumber: 1 }
    });

    if (!existingAttempt) {
      const attempt = await prisma.baselineAttempt.create({
        data: {
          id: attemptId,
          baselineProfileId: profileId,
          attemptNumber: 1,
          startedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), // 29 days ago
          completedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // 45 min later
          domainScoresJson: domainScores,
          overallEstimateJson: {
            compositeScore: Math.floor(
              (domainScores[BaselineDomain.MATH].scaled +
                domainScores[BaselineDomain.ELA].scaled +
                domainScores[BaselineDomain.SEL].scaled) /
                3
            ),
            gradeEquivalent: `${Math.max(1, parseInt(learner.grade) - 1)}.${Math.floor(Math.random() * 9)}`,
            confidenceInterval: [
              Math.floor(domainScores[BaselineDomain.MATH].scaled * 0.9),
              Math.floor(domainScores[BaselineDomain.MATH].scaled * 1.1),
            ],
            assessmentDuration: 45,
            assessmentType: learner.assessmentType,
          },
        },
      });

      // Update profile with final attempt ID
      await prisma.baselineProfile.update({
        where: { id: profileId },
        data: { finalAttemptId: attempt.id },
      });
    }

    console.log(`  ✅ Created baseline attempt for ${learner.firstName} ${learner.lastName} (${learner.functioningLevel})`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════════

  console.log('');
  console.log('✅ baseline-svc family seeding complete!');
  console.log('');
  console.log('Created:');
  console.log(`  - 6 Parent assessment records`);
  console.log(`  - 6 Baseline profiles`);
  console.log(`  - 6 Completed baseline attempts`);
  console.log('');
  console.log('Learner Assessments:');
  for (const [key, learner] of Object.entries(LEARNER_PROFILES)) {
    const assessmentData = PARENT_ASSESSMENT_DATA[key as keyof typeof PARENT_ASSESSMENT_DATA];
    console.log(`  - ${learner.firstName} ${learner.lastName}: ${learner.assessmentType} (Support Level: ${assessmentData.supportLevel})`);
  }
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
