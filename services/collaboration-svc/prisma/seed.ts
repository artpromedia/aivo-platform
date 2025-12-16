/**
 * AIVO Platform - Collaboration Service Seed Data
 *
 * Creates:
 * - Care team members for learners
 * - Action plans with tasks
 * - Care notes
 * - Sample meetings
 */

import {
  PrismaClient,
  CareTeamRole,
  ActionPlanStatus,
  TaskContext,
  TaskFrequency,
  TaskCompletionStatus,
  CareNoteType,
  NoteVisibility,
  MeetingStatus,
  MeetingType,
} from '@prisma/client';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Users
const TEACHER_USER_ID = '00000000-0000-0000-1000-000000000003';
const THERAPIST_USER_ID = '00000000-0000-0000-1000-000000000004';
const PARENT_USER_ID = '00000000-0000-0000-1000-000000000005';

// Learners
const ALEX_USER_ID = '00000000-0000-0000-2000-000000000001';
const JORDAN_USER_ID = '00000000-0000-0000-2000-000000000002';

// Care team members
const ALEX_TEAM_TEACHER = '00000000-0000-0000-co00-000000000001';
const ALEX_TEAM_THERAPIST = '00000000-0000-0000-co00-000000000002';
const ALEX_TEAM_PARENT = '00000000-0000-0000-co00-000000000003';

// Action plans
const ALEX_ACTION_PLAN_FOCUS = '00000000-0000-0000-co10-000000000001';

async function main() {
  console.log('🌱 Seeding collaboration-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Care Team Members for Alex
  // ══════════════════════════════════════════════════════════════════════════

  const careTeamMembers = [
    {
      id: ALEX_TEAM_TEACHER,
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      userId: TEACHER_USER_ID,
      displayName: 'Ms. Smith',
      role: CareTeamRole.TEACHER,
      title: '3rd Grade Teacher',
      contactEmail: 'teacher@aivo.dev',
      isActive: true,
      addedByUserId: TEACHER_USER_ID,
    },
    {
      id: ALEX_TEAM_THERAPIST,
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      userId: THERAPIST_USER_ID,
      displayName: 'Dr. Johnson',
      role: CareTeamRole.THERAPIST,
      title: 'Occupational Therapist',
      contactEmail: 'therapist@aivo.dev',
      isActive: true,
      addedByUserId: TEACHER_USER_ID,
      notes: 'Focus on sensory processing and self-regulation',
    },
    {
      id: ALEX_TEAM_PARENT,
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      userId: PARENT_USER_ID,
      displayName: 'Alex\'s Mom',
      role: CareTeamRole.PARENT,
      contactEmail: 'parent@aivo.dev',
      contactPhone: '555-123-4567',
      isActive: true,
      addedByUserId: TEACHER_USER_ID,
    },
  ];

  for (const member of careTeamMembers) {
    await prisma.careTeamMember.upsert({
      where: { id: member.id },
      update: {},
      create: member,
    });
  }
  console.log(`  ✅ Created ${careTeamMembers.length} care team members`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Action Plan
  // ══════════════════════════════════════════════════════════════════════════

  await prisma.actionPlan.upsert({
    where: { id: ALEX_ACTION_PLAN_FOCUS },
    update: {},
    create: {
      id: ALEX_ACTION_PLAN_FOCUS,
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      creatorId: ALEX_TEAM_THERAPIST,
      title: 'Building Focus & Self-Regulation',
      description: 'A coordinated plan to help Alex improve focus during learning activities and develop self-regulation skills across home and school settings.',
      status: ActionPlanStatus.ACTIVE,
      startDate: new Date('2024-01-15'),
      targetEndDate: new Date('2024-04-30'),
      metadataJson: {
        category: 'self_regulation',
        relatedGoalId: '00000000-0000-0000-tp00-000000000002',
      },
    },
  });
  console.log('  ✅ Created action plan: Building Focus & Self-Regulation');

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Action Plan Tasks
  // ══════════════════════════════════════════════════════════════════════════

  const tasks = [
    // School tasks
    {
      id: '00000000-0000-0000-co11-000000000001',
      actionPlanId: ALEX_ACTION_PLAN_FOCUS,
      title: 'Provide visual timer for tasks',
      description: 'Use a visual timer to show Alex how much time remains for each activity. Start with 10-minute segments.',
      context: TaskContext.SCHOOL,
      frequency: TaskFrequency.DAILY,
      assigneeId: ALEX_TEAM_TEACHER,
      orderIndex: 0,
      isActive: true,
      metadataJson: { strategy: 'visual_support' },
    },
    {
      id: '00000000-0000-0000-co11-000000000002',
      actionPlanId: ALEX_ACTION_PLAN_FOCUS,
      title: 'Offer sensory breaks',
      description: 'Proactively offer a 2-minute sensory break every 15 minutes during focused work.',
      context: TaskContext.SCHOOL,
      frequency: TaskFrequency.DAILY,
      assigneeId: ALEX_TEAM_TEACHER,
      orderIndex: 1,
      isActive: true,
      metadataJson: { strategy: 'sensory_break' },
    },
    // Therapy tasks
    {
      id: '00000000-0000-0000-co11-000000000003',
      actionPlanId: ALEX_ACTION_PLAN_FOCUS,
      title: 'Practice deep breathing exercises',
      description: 'Work on "belly breathing" technique for 5 minutes at the start of each session.',
      context: TaskContext.THERAPY,
      frequency: TaskFrequency.TWICE_WEEKLY,
      assigneeId: ALEX_TEAM_THERAPIST,
      orderIndex: 0,
      isActive: true,
      metadataJson: { strategy: 'breathing', technique: 'belly_breathing' },
    },
    // Home tasks
    {
      id: '00000000-0000-0000-co11-000000000010',
      actionPlanId: ALEX_ACTION_PLAN_FOCUS,
      title: 'Use visual schedule for homework',
      description: 'Create a simple visual checklist for homework time. Break tasks into 10-minute blocks.',
      context: TaskContext.HOME,
      frequency: TaskFrequency.DAILY,
      assigneeId: ALEX_TEAM_PARENT,
      orderIndex: 0,
      isActive: true,
      metadataJson: { strategy: 'visual_support' },
    },
    {
      id: '00000000-0000-0000-co11-000000000011',
      actionPlanId: ALEX_ACTION_PLAN_FOCUS,
      title: 'Celebrate focus wins',
      description: 'When Alex completes a 10-minute focus block, provide specific praise about what they did well.',
      context: TaskContext.SHARED,
      frequency: TaskFrequency.AS_NEEDED,
      orderIndex: 10,
      isActive: true,
      metadataJson: { strategy: 'positive_reinforcement' },
    },
  ];

  for (const task of tasks) {
    await prisma.actionPlanTask.upsert({
      where: { id: task.id },
      update: {},
      create: task,
    });
  }
  console.log(`  ✅ Created ${tasks.length} action plan tasks`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create Task Completions
  // ══════════════════════════════════════════════════════════════════════════

  const completions = [
    {
      id: '00000000-0000-0000-co12-000000000001',
      taskId: '00000000-0000-0000-co11-000000000001',
      completedByUserId: TEACHER_USER_ID,
      status: TaskCompletionStatus.COMPLETED,
      dueDate: new Date('2024-01-16'),
      completedAt: new Date('2024-01-16T14:30:00Z'),
      notes: 'Used 10-minute timer for math practice. Alex asked for one extra minute to finish problem.',
      rating: 4, // 1-5 effectiveness
    },
    {
      id: '00000000-0000-0000-co12-000000000002',
      taskId: '00000000-0000-0000-co11-000000000002',
      completedByUserId: TEACHER_USER_ID,
      status: TaskCompletionStatus.COMPLETED,
      dueDate: new Date('2024-01-16'),
      completedAt: new Date('2024-01-16T14:45:00Z'),
      notes: 'Offered break after 15 min of reading. Alex used squeeze ball and returned focused.',
      rating: 5,
    },
    {
      id: '00000000-0000-0000-co12-000000000003',
      taskId: '00000000-0000-0000-co11-000000000010',
      completedByUserId: PARENT_USER_ID,
      status: TaskCompletionStatus.COMPLETED,
      dueDate: new Date('2024-01-16'),
      completedAt: new Date('2024-01-16T17:00:00Z'),
      notes: 'Made checklist with stickers. Alex checked off each item and was excited to finish!',
      rating: 5,
    },
  ];

  for (const completion of completions) {
    await prisma.taskCompletion.upsert({
      where: { id: completion.id },
      update: {},
      create: completion,
    });
  }
  console.log(`  ✅ Created ${completions.length} task completions`);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Create Care Notes
  // ══════════════════════════════════════════════════════════════════════════

  const careNotes = [
    {
      id: '00000000-0000-0000-co20-000000000001',
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      authorId: ALEX_TEAM_TEACHER,
      noteType: CareNoteType.PROGRESS_UPDATE,
      visibility: NoteVisibility.TEAM,
      title: 'Great week for focus!',
      content: 'Alex had a really strong week with focus. Used the visual timer independently 3 times and asked for breaks before getting frustrated. Math scores improved too!',
      actionPlanId: ALEX_ACTION_PLAN_FOCUS,
      isPinned: true,
    },
    {
      id: '00000000-0000-0000-co20-000000000002',
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      authorId: ALEX_TEAM_PARENT,
      noteType: CareNoteType.HOME_UPDATE,
      visibility: NoteVisibility.TEAM,
      title: 'Homework going smoother',
      content: 'The visual checklist is working great at home. Alex even made their own checklist for cleaning their room! Less meltdowns during homework time.',
    },
    {
      id: '00000000-0000-0000-co20-000000000003',
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      authorId: ALEX_TEAM_THERAPIST,
      noteType: CareNoteType.THERAPY_UPDATE,
      visibility: NoteVisibility.TEAM,
      title: 'OT Session - Breathing Practice',
      content: 'Practiced belly breathing today. Alex can now do 5 deep breaths independently. Introduced the "calm down corner" concept for home and school.',
      metadataJson: { sessionType: 'occupational_therapy', duration: 30 },
    },
    {
      id: '00000000-0000-0000-co20-000000000004',
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      authorId: ALEX_TEAM_THERAPIST,
      noteType: CareNoteType.QUESTION,
      visibility: NoteVisibility.TEAM,
      title: 'Sensory tools at home?',
      content: 'Does Alex have access to any sensory tools at home? Squeeze balls, fidgets, weighted blanket? Would be helpful for homework time.',
    },
    {
      id: '00000000-0000-0000-co20-000000000005',
      tenantId: DEV_TENANT_ID,
      learnerId: ALEX_USER_ID,
      authorId: ALEX_TEAM_TEACHER,
      noteType: CareNoteType.CELEBRATION,
      visibility: NoteVisibility.TEAM,
      title: '🎉 Focus Milestone!',
      content: 'AMAZING NEWS! Alex focused for 18 minutes straight during independent reading today - a new personal best! They were so proud of themselves.',
      isPinned: true,
    },
  ];

  for (const note of careNotes) {
    await prisma.careNote.upsert({
      where: { id: note.id },
      update: {},
      create: note,
    });
  }
  console.log(`  ✅ Created ${careNotes.length} care notes`);

  // ══════════════════════════════════════════════════════════════════════════
  // 6. Create Meeting
  // ══════════════════════════════════════════════════════════════════════════

  const meeting = {
    id: '00000000-0000-0000-co30-000000000001',
    tenantId: DEV_TENANT_ID,
    learnerId: ALEX_USER_ID,
    createdByUserId: TEACHER_USER_ID,
    title: 'Monthly Progress Check-In',
    description: 'Review Alex\'s progress on the focus action plan and discuss next steps.',
    meetingType: MeetingType.PROGRESS_REVIEW,
    status: MeetingStatus.SCHEDULED,
    scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
    durationMinutes: 30,
    location: 'Virtual - Zoom link will be sent',
    actionPlanId: ALEX_ACTION_PLAN_FOCUS,
    agendaItems: [
      'Review task completion data',
      'Discuss what strategies are working',
      'Plan for next month',
      'Parent questions/concerns',
    ],
  };

  await prisma.meeting.upsert({
    where: { id: meeting.id },
    update: {},
    create: meeting,
  });
  console.log('  ✅ Created meeting: Monthly Progress Check-In');

  // Add participants
  const participants = [
    { id: '00000000-0000-0000-co31-000000000001', meetingId: meeting.id, careTeamMemberId: ALEX_TEAM_TEACHER, isRequired: true, hasAccepted: true },
    { id: '00000000-0000-0000-co31-000000000002', meetingId: meeting.id, careTeamMemberId: ALEX_TEAM_THERAPIST, isRequired: true, hasAccepted: true },
    { id: '00000000-0000-0000-co31-000000000003', meetingId: meeting.id, careTeamMemberId: ALEX_TEAM_PARENT, isRequired: true, hasAccepted: null },
  ];

  for (const participant of participants) {
    await prisma.meetingParticipant.upsert({
      where: { id: participant.id },
      update: {},
      create: participant,
    });
  }
  console.log('  ✅ Created meeting participants');

  console.log('');
  console.log('✅ collaboration-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 3 care team members (Teacher, Therapist, Parent)');
  console.log('  - 1 action plan with 5 tasks across contexts');
  console.log('  - 3 task completions with notes and ratings');
  console.log('  - 5 care notes (progress, questions, celebrations)');
  console.log('  - 1 scheduled progress review meeting');
  console.log('');
  console.log('Demonstrates:');
  console.log('  - Multi-stakeholder care team collaboration');
  console.log('  - Cross-context action plans (home/school/therapy)');
  console.log('  - Asynchronous communication via care notes');
  console.log('  - Meeting scheduling and coordination');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
