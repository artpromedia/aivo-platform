/**
 * AIVO Platform - Teacher Planning Service Seed Data
 *
 * Creates:
 * - Goals with objectives for learners
 * - Session plans with activities
 * - Progress notes
 */

import {
  PrismaClient,
  GoalDomain,
  GoalStatus,
  ObjectiveStatus,
  SessionPlanType,
  SessionPlanStatus,
  Visibility,
} from '@prisma/client';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Users
const TEACHER_USER_ID = '00000000-0000-0000-1000-000000000003';
const THERAPIST_USER_ID = '00000000-0000-0000-1000-000000000004';

// Learners
const ALEX_USER_ID = '00000000-0000-0000-2000-000000000001';
const JORDAN_USER_ID = '00000000-0000-0000-2000-000000000002';
const SAM_USER_ID = '00000000-0000-0000-2000-000000000003';

// Skills (from learner-model-svc)
const SKILL_FRACTIONS = '00000000-0000-0000-f100-000000000006';
const SKILL_READING = '00000000-0000-0000-f100-000000000014';
const SKILL_SEL_AWARENESS = '00000000-0000-0000-f100-000000000020';
const SKILL_SEL_MANAGEMENT = '00000000-0000-0000-f100-000000000021';

// Goals
const ALEX_GOAL_MATH = '00000000-0000-0000-tp00-000000000001';
const ALEX_GOAL_SEL = '00000000-0000-0000-tp00-000000000002';
const JORDAN_GOAL_READING = '00000000-0000-0000-tp00-000000000010';
const SAM_GOAL_SEL = '00000000-0000-0000-tp00-000000000020';

// Session Plans
const ALEX_SESSION_PLAN_1 = '00000000-0000-0000-tp10-000000000001';
const ALEX_SESSION_PLAN_2 = '00000000-0000-0000-tp10-000000000002';
const JORDAN_SESSION_PLAN_1 = '00000000-0000-0000-tp10-000000000010';

async function main() {
  console.log('🌱 Seeding teacher-planning-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Goals
  // ══════════════════════════════════════════════════════════════════════════

  const goals = [
    // Alex's Math Goal (IEP-style)
    {
      id: ALEX_GOAL_MATH,
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      createdByUserId: TEACHER_USER_ID,
      title: 'Master fraction concepts and operations',
      description:
        'By end of Q2, Alex will demonstrate understanding of fractions including identifying, comparing, and adding fractions with like denominators.',
      domain: GoalDomain.MATH,
      skillId: SKILL_FRACTIONS,
      startDate: new Date('2024-01-15'),
      targetDate: new Date('2024-03-31'),
      status: GoalStatus.ACTIVE,
      progressRating: 45,
      visibility: Visibility.ALL_EDUCATORS,
      metadataJson: {
        iepGoal: true,
        category: 'Academic',
        measurementMethod: 'Curriculum-based assessment',
      },
    },
    // Alex's SEL Goal
    {
      id: ALEX_GOAL_SEL,
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      createdByUserId: THERAPIST_USER_ID,
      title: 'Improve focus and self-regulation',
      description:
        'Alex will increase on-task behavior during learning sessions to 15+ minutes with appropriate break requests.',
      domain: GoalDomain.SEL,
      skillId: SKILL_SEL_MANAGEMENT,
      startDate: new Date('2024-01-15'),
      targetDate: new Date('2024-04-30'),
      status: GoalStatus.ACTIVE,
      progressRating: 60,
      visibility: Visibility.ALL_EDUCATORS,
      metadataJson: {
        behaviorPlan: true,
        category: 'Self-Regulation',
      },
    },
    // Jordan's Reading Goal
    {
      id: JORDAN_GOAL_READING,
      tenantId: DEV_TENANT_ID,
      learnerId: JORDAN_USER_ID,
      createdByUserId: TEACHER_USER_ID,
      title: 'Develop reading comprehension skills',
      description:
        'Jordan will demonstrate improved reading comprehension by accurately answering inferential questions about grade-level texts.',
      domain: GoalDomain.ELA,
      skillId: SKILL_READING,
      startDate: new Date('2024-01-20'),
      targetDate: new Date('2024-05-31'),
      status: GoalStatus.ACTIVE,
      progressRating: 25,
      visibility: Visibility.ALL_EDUCATORS,
    },
    // Sam's SEL Goal (completed)
    {
      id: SAM_GOAL_SEL,
      tenantId: DEV_TENANT_ID,
      learnerId: SAM_USER_ID,
      createdByUserId: THERAPIST_USER_ID,
      title: 'Build emotional awareness vocabulary',
      description: 'Sam will identify and label emotions accurately using appropriate vocabulary.',
      domain: GoalDomain.SEL,
      skillId: SKILL_SEL_AWARENESS,
      startDate: new Date('2023-09-01'),
      targetDate: new Date('2023-12-15'),
      status: GoalStatus.COMPLETED,
      progressRating: 100,
      visibility: Visibility.ALL_EDUCATORS,
    },
  ];

  for (const goal of goals) {
    await prisma.goal.upsert({
      where: { id: goal.id },
      update: {},
      create: goal,
    });
  }
  console.log(`  ✅ Created ${goals.length} goals`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Goal Objectives
  // ══════════════════════════════════════════════════════════════════════════

  const objectives = [
    // Alex's Math Goal objectives
    {
      id: '00000000-0000-0000-tp01-000000000001',
      goalId: ALEX_GOAL_MATH,
      description: 'Identify fractions as parts of a whole',
      successCriteria: '8/10 correct on 3 consecutive assessments',
      status: ObjectiveStatus.MET,
      progressRating: 100,
      orderIndex: 0,
    },
    {
      id: '00000000-0000-0000-tp01-000000000002',
      goalId: ALEX_GOAL_MATH,
      description: 'Compare fractions with like denominators',
      successCriteria: '8/10 correct on 3 consecutive assessments',
      status: ObjectiveStatus.IN_PROGRESS,
      progressRating: 65,
      orderIndex: 1,
    },
    {
      id: '00000000-0000-0000-tp01-000000000003',
      goalId: ALEX_GOAL_MATH,
      description: 'Add fractions with like denominators',
      successCriteria: '8/10 correct on 3 consecutive assessments',
      status: ObjectiveStatus.NOT_STARTED,
      progressRating: 0,
      orderIndex: 2,
    },
    // Alex's SEL Goal objectives
    {
      id: '00000000-0000-0000-tp01-000000000010',
      goalId: ALEX_GOAL_SEL,
      description: 'Recognize when focus is fading',
      successCriteria: 'Self-reports need for break before disengagement',
      status: ObjectiveStatus.IN_PROGRESS,
      progressRating: 70,
      orderIndex: 0,
    },
    {
      id: '00000000-0000-0000-tp01-000000000011',
      goalId: ALEX_GOAL_SEL,
      description: 'Use calming strategies independently',
      successCriteria: 'Uses 2+ strategies without prompting',
      status: ObjectiveStatus.IN_PROGRESS,
      progressRating: 50,
      orderIndex: 1,
    },
    // Jordan's Reading Goal objectives
    {
      id: '00000000-0000-0000-tp01-000000000020',
      goalId: JORDAN_GOAL_READING,
      description: 'Answer literal questions about text',
      successCriteria: '9/10 accuracy',
      status: ObjectiveStatus.IN_PROGRESS,
      progressRating: 75,
      orderIndex: 0,
    },
    {
      id: '00000000-0000-0000-tp01-000000000021',
      goalId: JORDAN_GOAL_READING,
      description: 'Answer inferential questions about text',
      successCriteria: '7/10 accuracy',
      status: ObjectiveStatus.NOT_STARTED,
      progressRating: 0,
      orderIndex: 1,
    },
    // Sam's completed objectives
    {
      id: '00000000-0000-0000-tp01-000000000030',
      goalId: SAM_GOAL_SEL,
      description: 'Identify basic emotions (happy, sad, angry, scared)',
      successCriteria: 'Labels correctly in self and others',
      status: ObjectiveStatus.MET,
      progressRating: 100,
      orderIndex: 0,
    },
    {
      id: '00000000-0000-0000-tp01-000000000031',
      goalId: SAM_GOAL_SEL,
      description: 'Identify complex emotions (frustrated, excited, nervous)',
      successCriteria: 'Uses vocabulary appropriately in context',
      status: ObjectiveStatus.MET,
      progressRating: 100,
      orderIndex: 1,
    },
  ];

  for (const objective of objectives) {
    await prisma.goalObjective.upsert({
      where: { id: objective.id },
      update: {},
      create: objective,
    });
  }
  console.log(`  ✅ Created ${objectives.length} goal objectives`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Session Plans
  // ══════════════════════════════════════════════════════════════════════════

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const sessionPlans = [
    // Alex: Math + SEL combo session (completed)
    {
      id: ALEX_SESSION_PLAN_1,
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      createdByUserId: TEACHER_USER_ID,
      sessionTemplateName: 'Math Learning + Check-in',
      scheduledFor: new Date('2024-01-15T10:00:00Z'),
      estimatedDurationMinutes: 30,
      sessionType: SessionPlanType.LEARNING,
      status: SessionPlanStatus.COMPLETED,
      sessionId: '00000000-0000-0000-6000-000000000001', // Alex's session
      metadataJson: {
        actualDurationMinutes: 28,
        notes: 'Good engagement overall',
      },
    },
    // Alex: Upcoming therapy session
    {
      id: ALEX_SESSION_PLAN_2,
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      createdByUserId: THERAPIST_USER_ID,
      sessionTemplateName: 'Focus Skills Practice',
      scheduledFor: tomorrow,
      estimatedDurationMinutes: 20,
      sessionType: SessionPlanType.THERAPY,
      status: SessionPlanStatus.PLANNED,
      metadataJson: {
        therapyType: 'behavioral',
        focusAreas: ['self-regulation', 'break-taking'],
      },
    },
    // Jordan: Reading assessment session
    {
      id: JORDAN_SESSION_PLAN_1,
      tenantId: DEV_TENANT_ID,
      learnerId: JORDAN_USER_ID,
      createdByUserId: TEACHER_USER_ID,
      sessionTemplateName: 'Reading Comprehension Check',
      scheduledFor: nextWeek,
      estimatedDurationMinutes: 25,
      sessionType: SessionPlanType.ASSESSMENT,
      status: SessionPlanStatus.PLANNED,
      metadataJson: {
        assessmentType: 'reading_comprehension',
        passages: 2,
      },
    },
  ];

  for (const plan of sessionPlans) {
    await prisma.sessionPlan.upsert({
      where: { id: plan.id },
      update: {},
      create: plan,
    });
  }
  console.log(`  ✅ Created ${sessionPlans.length} session plans`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create Session Plan Items
  // ══════════════════════════════════════════════════════════════════════════

  const planItems = [
    // Alex's completed session items
    {
      id: '00000000-0000-0000-tp11-000000000001',
      sessionPlanId: ALEX_SESSION_PLAN_1,
      orderIndex: 0,
      goalId: ALEX_GOAL_SEL,
      activityType: 'check_in',
      activityDescription: 'Emotion check-in and focus rating',
      estimatedDurationMinutes: 3,
    },
    {
      id: '00000000-0000-0000-tp11-000000000002',
      sessionPlanId: ALEX_SESSION_PLAN_1,
      orderIndex: 1,
      goalId: ALEX_GOAL_MATH,
      goalObjectiveId: '00000000-0000-0000-tp01-000000000002',
      skillId: SKILL_FRACTIONS,
      activityType: 'practice',
      activityDescription: 'Fraction comparison exercises',
      estimatedDurationMinutes: 15,
      aiMetadataJson: { recommendedDifficulty: 3, adaptiveContent: true },
    },
    {
      id: '00000000-0000-0000-tp11-000000000003',
      sessionPlanId: ALEX_SESSION_PLAN_1,
      orderIndex: 2,
      activityType: 'break',
      activityDescription: 'Movement break with timer',
      estimatedDurationMinutes: 2,
    },
    {
      id: '00000000-0000-0000-tp11-000000000004',
      sessionPlanId: ALEX_SESSION_PLAN_1,
      orderIndex: 3,
      goalId: ALEX_GOAL_MATH,
      skillId: SKILL_FRACTIONS,
      activityType: 'game',
      activityDescription: 'Fraction matching game',
      estimatedDurationMinutes: 10,
    },
    // Alex's upcoming therapy session items
    {
      id: '00000000-0000-0000-tp11-000000000010',
      sessionPlanId: ALEX_SESSION_PLAN_2,
      orderIndex: 0,
      goalId: ALEX_GOAL_SEL,
      goalObjectiveId: '00000000-0000-0000-tp01-000000000010',
      activityType: 'instruction',
      activityDescription: 'Review focus awareness strategies',
      estimatedDurationMinutes: 5,
    },
    {
      id: '00000000-0000-0000-tp11-000000000011',
      sessionPlanId: ALEX_SESSION_PLAN_2,
      orderIndex: 1,
      goalId: ALEX_GOAL_SEL,
      goalObjectiveId: '00000000-0000-0000-tp01-000000000011',
      activityType: 'practice',
      activityDescription: 'Guided breathing and grounding exercises',
      estimatedDurationMinutes: 10,
    },
    {
      id: '00000000-0000-0000-tp11-000000000012',
      sessionPlanId: ALEX_SESSION_PLAN_2,
      orderIndex: 2,
      activityType: 'reflection',
      activityDescription: 'Discuss what strategies worked',
      estimatedDurationMinutes: 5,
    },
  ];

  for (const item of planItems) {
    await prisma.sessionPlanItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`  ✅ Created ${planItems.length} session plan items`);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Create Progress Notes
  // ══════════════════════════════════════════════════════════════════════════

  const progressNotes = [
    {
      id: '00000000-0000-0000-tp20-000000000001',
      tenantId: DEV_TENANT_ID,
      sessionPlanId: ALEX_SESSION_PLAN_1,
      goalId: ALEX_GOAL_MATH,
      goalObjectiveId: '00000000-0000-0000-tp01-000000000002',
      createdByUserId: TEACHER_USER_ID,
      noteType: 'SESSION_SUMMARY',
      noteText:
        'Alex showed good understanding of fraction comparison today. Struggled a bit with 4ths vs 8ths but improved with visual support. Requested one break appropriately.',
      visibleToParents: true,
      metadataJson: { mood: 'positive', engagement: 'high' },
    },
    {
      id: '00000000-0000-0000-tp20-000000000002',
      tenantId: DEV_TENANT_ID,
      goalId: ALEX_GOAL_SEL,
      goalObjectiveId: '00000000-0000-0000-tp01-000000000010',
      createdByUserId: THERAPIST_USER_ID,
      noteType: 'PROGRESS_UPDATE',
      noteText:
        'Alex is making good progress on self-identifying when focus is dropping. Used the "focus meter" successfully 3/4 times this week.',
      visibleToParents: true,
    },
    {
      id: '00000000-0000-0000-tp20-000000000003',
      tenantId: DEV_TENANT_ID,
      goalId: SAM_GOAL_SEL,
      createdByUserId: THERAPIST_USER_ID,
      noteType: 'GOAL_COMPLETE',
      noteText:
        'Goal completed! Sam consistently identifies and labels both basic and complex emotions. Ready to advance to emotion regulation strategies.',
      visibleToParents: true,
    },
  ];

  for (const note of progressNotes) {
    await prisma.progressNote.upsert({
      where: { id: note.id },
      update: {},
      create: note,
    });
  }
  console.log(`  ✅ Created ${progressNotes.length} progress notes`);

  console.log('');
  console.log('✅ teacher-planning-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 4 goals (IEP-style academic + SEL goals)');
  console.log('  - 9 goal objectives with progress tracking');
  console.log('  - 3 session plans (completed, planned)');
  console.log('  - 7 session plan items (activities)');
  console.log('  - 3 progress notes');
  console.log('');
  console.log('Demonstrates:');
  console.log('  - IEP goal structure with measurable objectives');
  console.log('  - Multi-disciplinary planning (teacher + therapist)');
  console.log('  - Session planning with activity sequencing');
  console.log('  - Progress documentation for parent visibility');
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
