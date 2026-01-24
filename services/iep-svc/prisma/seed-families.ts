/**
 * AIVO Platform - IEP Service Seed Data (Family Accounts)
 *
 * Creates:
 * - 6 Student records with IEPs
 * - IEP Goals for each student
 * - Accommodations and modifications
 * - Services (Speech, OT, PT, Counseling, etc.)
 *
 * Run with: npx prisma db seed
 * Or directly: npx tsx prisma/seed-families.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  TENANTS,
  SCHOOLS,
  IEPS,
  LEARNER_PROFILES,
  PARENT_ASSESSMENT_DATA,
  IEP_GOALS,
  ACCOMMODATIONS,
  SERVICES,
} from '@aivo/seed-data';

const prisma = new PrismaClient();

// Define enum values locally (matching schema.prisma)
const StudentStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  GRADUATED: 'GRADUATED',
  TRANSFERRED: 'TRANSFERRED',
  EXITED: 'EXITED',
} as const;

const IEPType = {
  INITIAL: 'INITIAL',
  ANNUAL: 'ANNUAL',
  TRIENNIAL: 'TRIENNIAL',
  AMENDMENT: 'AMENDMENT',
  TRANSFER: 'TRANSFER',
} as const;

const IEPStatus = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  PENDING_MEETING: 'PENDING_MEETING',
  PENDING_CONSENT: 'PENDING_CONSENT',
  ACTIVE: 'ACTIVE',
  AMENDED: 'AMENDED',
  EXPIRED: 'EXPIRED',
  ARCHIVED: 'ARCHIVED',
} as const;

const GoalStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  MASTERED: 'MASTERED',
  DISCONTINUED: 'DISCONTINUED',
  MODIFIED: 'MODIFIED',
} as const;

// Map school ID to school name
const schoolNames: Record<string, string> = {
  [SCHOOLS.LINCOLN_ELEMENTARY]: 'Lincoln Elementary School',
  [SCHOOLS.COON_RAPIDS_MIDDLE]: 'Coon Rapids Middle School',
  [SCHOOLS.ANOKA_MIDDLE]: 'Anoka Middle School for the Arts',
  [SCHOOLS.CHAMPLIN_PARK_HIGH]: 'Champlin Park High School',
};

async function main() {
  console.log('🌱 Seeding iep-svc with family IEP data...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Student Records
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating student records...');

  for (const [key, learner] of Object.entries(LEARNER_PROFILES)) {
    const assessmentData = PARENT_ASSESSMENT_DATA[key as keyof typeof PARENT_ASSESSMENT_DATA];

    const student = await prisma.student.upsert({
      where: {
        tenantId_studentId: {
          tenantId: TENANTS.ANOKA_HENNEPIN,
          studentId: learner.id,
        },
      },
      update: {},
      create: {
        id: learner.id,
        tenantId: TENANTS.ANOKA_HENNEPIN,
        studentId: learner.id,
        stateId: `MN-${learner.id.slice(-8).toUpperCase()}`,
        firstName: learner.firstName,
        lastName: learner.lastName,
        dateOfBirth: new Date(learner.dateOfBirth),
        grade: learner.grade,
        school: schoolNames[learner.school] || 'Unknown School',
        district: 'Anoka-Hennepin School District',
        primaryLanguage: 'English',
        eligibilityDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        primaryDisability: learner.primaryDisability,
        secondaryDisabilities: learner.secondaryDisabilities,
        status: StudentStatus.ACTIVE,
        metadata: {
          functioningLevel: learner.functioningLevel,
          assessmentType: learner.assessmentType,
          supportLevel: assessmentData.supportLevel,
        },
      },
    });

    console.log(`  ✅ Created student: ${student.firstName} ${student.lastName} (Grade ${student.grade})`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create IEP Documents
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating IEP documents...');

  for (const [key, learner] of Object.entries(LEARNER_PROFILES)) {
    const assessmentData = PARENT_ASSESSMENT_DATA[key as keyof typeof PARENT_ASSESSMENT_DATA];
    const iepId = IEPS[key as keyof typeof IEPS];

    const iep = await prisma.iEP.upsert({
      where: { id: iepId },
      update: {},
      create: {
        id: iepId,
        tenantId: TENANTS.ANOKA_HENNEPIN,
        studentId: learner.id,
        iepNumber: '2025-001',
        version: 1,
        iepType: IEPType.ANNUAL,
        status: IEPStatus.ACTIVE,
        meetingDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        effectiveDate: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000), // 55 days ago
        annualReviewDate: new Date(Date.now() + 310 * 24 * 60 * 60 * 1000), // In ~10 months
        reevaluationDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // In 2 years
        academicLevel: `${learner.firstName} is currently performing at ${getAcademicLevel(learner.functioningLevel)} in academic areas.`,
        functionalLevel: `${learner.firstName} demonstrates ${getFunctionalLevel(learner.functioningLevel)} in daily living and self-care skills.`,
        parentConcerns: assessmentData.challenges,
        studentStrengths: assessmentData.strengths,
        stateTestingAccommodations: getTestingAccommodations(learner.assessmentType),
        districtTestingAccommodations: getTestingAccommodations(learner.assessmentType),
        participatesInGenEd: learner.functioningLevel !== 'PROFOUND',
        genEdPercentage: getGenEdPercentage(learner.functioningLevel),
        placementType: getPlacement(learner.functioningLevel),
        leastRestrictiveEnv: getLREStatement(learner.functioningLevel),
        esyEligible: learner.functioningLevel === 'PROFOUND' || learner.functioningLevel === 'SEVERE',
        esyJustification: learner.functioningLevel === 'PROFOUND' || learner.functioningLevel === 'SEVERE'
          ? `${learner.firstName} demonstrates significant regression during breaks.`
          : null,
        parentConsent: true,
        parentConsentDate: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
        createdBy: 'seed-script',
        submittedAt: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
        approvedBy: 'district-admin',
      },
    });

    console.log(`  ✅ Created IEP for ${learner.firstName} ${learner.lastName} (${iep.status})`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create IEP Goals
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating IEP goals...');

  for (const [key, goals] of Object.entries(IEP_GOALS)) {
    const learner = LEARNER_PROFILES[key as keyof typeof LEARNER_PROFILES];

    for (const goal of goals) {
      await prisma.iEPGoal.upsert({
        where: { id: goal.id },
        update: {},
        create: {
          id: goal.id,
          iepId: goal.iepId,
          goalNumber: goal.goalNumber,
          domain: goal.domain as any,
          description: goal.description,
          baseline: goal.baseline,
          targetCriteria: goal.targetCriteria,
          measurementMethod: goal.measurementMethod,
          targetDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000), // ~10 months from now
          status: goal.status as any,
        },
      });
    }

    console.log(`  ✅ Created ${goals.length} goals for ${learner.firstName} ${learner.lastName}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create Accommodations
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating accommodations...');

  for (const [key, accommodations] of Object.entries(ACCOMMODATIONS)) {
    const learner = LEARNER_PROFILES[key as keyof typeof LEARNER_PROFILES];

    for (const accommodation of accommodations) {
      await prisma.accommodation.upsert({
        where: { id: accommodation.id },
        update: {},
        create: {
          id: accommodation.id,
          iepId: accommodation.iepId,
          category: accommodation.category,
          name: accommodation.name,
          description: accommodation.description,
          settings: accommodation.settings,
          isActive: true,
        },
      });
    }

    console.log(`  ✅ Created ${accommodations.length} accommodations for ${learner.firstName} ${learner.lastName}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Create Services
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating services...');

  for (const [key, services] of Object.entries(SERVICES)) {
    const learner = LEARNER_PROFILES[key as keyof typeof LEARNER_PROFILES];

    for (const service of services) {
      await prisma.service.upsert({
        where: { id: service.id },
        update: {},
        create: {
          id: service.id,
          iepId: service.iepId,
          serviceType: service.serviceType,
          frequency: service.frequency,
          duration: service.duration,
          providerType: service.providerType,
          location: 'School',
          startDate: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 310 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });
    }

    console.log(`  ✅ Created ${services.length} services for ${learner.firstName} ${learner.lastName}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════════

  console.log('');
  console.log('✅ iep-svc family seeding complete!');
  console.log('');
  console.log('Created:');
  console.log(`  - 6 Student records`);
  console.log(`  - 6 Active IEPs`);
  console.log(`  - ${Object.values(IEP_GOALS).flat().length} IEP Goals`);
  console.log(`  - ${Object.values(ACCOMMODATIONS).flat().length} Accommodations`);
  console.log(`  - ${Object.values(SERVICES).flat().length} Services`);
  console.log('');
  console.log('Students with IEPs:');
  for (const [key, learner] of Object.entries(LEARNER_PROFILES)) {
    const goals = IEP_GOALS[key as keyof typeof IEP_GOALS] || [];
    const services = SERVICES[key as keyof typeof SERVICES] || [];
    console.log(`  - ${learner.firstName} ${learner.lastName}: ${goals.length} goals, ${services.length} services`);
  }
}

// Helper functions
function getAcademicLevel(functioningLevel: string): string {
  switch (functioningLevel) {
    case 'PROFOUND':
      return 'pre-academic levels, engaging primarily through sensory activities';
    case 'SEVERE':
      return 'early developmental levels, working on foundational skills';
    case 'MODERATE':
      return 'below grade level, typically 1-2 years behind peers';
    case 'MILD':
      return 'near grade level with accommodations';
    default:
      return 'grade level';
  }
}

function getFunctionalLevel(functioningLevel: string): string {
  switch (functioningLevel) {
    case 'PROFOUND':
      return 'significant needs for full physical assistance';
    case 'SEVERE':
      return 'substantial needs requiring consistent adult support';
    case 'MODERATE':
      return 'moderate independence with verbal prompts';
    case 'MILD':
      return 'good independence with occasional reminders';
    default:
      return 'age-appropriate independence';
  }
}

function getTestingAccommodations(assessmentType: string): string[] {
  switch (assessmentType) {
    case 'ALTERNATE':
      return ['Alternate assessment', 'One-on-one administration', 'Unlimited time', 'Frequent breaks'];
    case 'MODIFIED':
      return ['Extended time (2x)', 'Separate setting', 'Read aloud', 'Visual supports'];
    case 'STANDARD_WITH_ACCOMMODATIONS':
      return ['Extended time (1.5x)', 'Preferential seating', 'Breaks as needed'];
    default:
      return [];
  }
}

function getGenEdPercentage(functioningLevel: string): number {
  switch (functioningLevel) {
    case 'PROFOUND':
      return 20;
    case 'SEVERE':
      return 40;
    case 'MODERATE':
      return 60;
    case 'MILD':
      return 80;
    default:
      return 100;
  }
}

function getPlacement(functioningLevel: string): string {
  switch (functioningLevel) {
    case 'PROFOUND':
      return 'Self-contained special education classroom';
    case 'SEVERE':
      return 'Self-contained with general education specials';
    case 'MODERATE':
      return 'Resource room with general education inclusion';
    case 'MILD':
      return 'General education with resource support';
    default:
      return 'General education';
  }
}

function getLREStatement(functioningLevel: string): string {
  switch (functioningLevel) {
    case 'PROFOUND':
      return 'The IEP team has determined that the student requires intensive supports that cannot be provided in a general education setting. The student will participate in school-wide activities and specials with support.';
    case 'SEVERE':
      return 'The IEP team has determined that the student requires substantial supports. The student will participate in general education for specials, lunch, and recess with paraprofessional support.';
    case 'MODERATE':
      return 'The IEP team has determined that the student benefits from both specialized instruction and general education inclusion. The student will receive core instruction in the resource room and participate in general education for science, social studies, and specials.';
    case 'MILD':
      return 'The IEP team has determined that the student can be successful in general education with appropriate accommodations and support. The student will receive specialized instruction in the resource room for targeted skill development.';
    default:
      return 'The student is educated in the least restrictive environment appropriate to their needs.';
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
