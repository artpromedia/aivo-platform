/**
 * AIVO Platform - Session Service Seed Data
 *
 * Creates:
 * - Sample completed sessions for test learners
 * - Session events showing learning activity
 */

import { PrismaClient, SessionType, SessionOrigin, SessionEventType } from '@prisma/client';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Learner IDs from auth-svc
const LEARNER_IDS = [
  '00000000-0000-0000-2000-000000000001', // alex
  '00000000-0000-0000-2000-000000000002', // jordan
  '00000000-0000-0000-2000-000000000003', // sam
];

function randomMinutesAgo(min: number, max: number): Date {
  const minutes = Math.floor(Math.random() * (max - min) + min);
  return new Date(Date.now() - minutes * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log('🌱 Seeding session-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Sample Sessions for Alex (active learner)
  // ══════════════════════════════════════════════════════════════════════════

  const alexSessions = [
    {
      id: '00000000-0000-0000-6000-000000000001',
      sessionType: SessionType.LEARNING,
      origin: SessionOrigin.MOBILE_LEARNER,
      startedAt: daysAgo(0),
      durationMs: 25 * 60 * 1000, // 25 minutes
      metadataJson: { planId: 'plan-001', targetSkills: ['fractions', 'addition'] },
    },
    {
      id: '00000000-0000-0000-6000-000000000002',
      sessionType: SessionType.HOMEWORK,
      origin: SessionOrigin.HOMEWORK_HELPER,
      startedAt: daysAgo(1),
      durationMs: 15 * 60 * 1000, // 15 minutes
      metadataJson: { homeworkSubject: 'math', grade: 4 },
    },
    {
      id: '00000000-0000-0000-6000-000000000003',
      sessionType: SessionType.PRACTICE,
      origin: SessionOrigin.MOBILE_LEARNER,
      startedAt: daysAgo(2),
      durationMs: 10 * 60 * 1000, // 10 minutes
      metadataJson: { skillDrill: 'multiplication' },
    },
  ];

  for (const session of alexSessions) {
    const endedAt = new Date(session.startedAt.getTime() + session.durationMs);

    const created = await prisma.session.upsert({
      where: { id: session.id },
      update: {},
      create: {
        id: session.id,
        tenantId: DEV_TENANT_ID,
        learnerId: LEARNER_IDS[0],
        sessionType: session.sessionType,
        origin: session.origin,
        startedAt: session.startedAt,
        endedAt,
        durationMs: session.durationMs,
        metadataJson: session.metadataJson,
      },
    });

    // Add session events
    await prisma.sessionEvent.createMany({
      data: [
        {
          sessionId: created.id,
          tenantId: DEV_TENANT_ID,
          learnerId: LEARNER_IDS[0],
          eventType: SessionEventType.SESSION_STARTED,
          eventTime: session.startedAt,
          metadataJson: {},
        },
        {
          sessionId: created.id,
          tenantId: DEV_TENANT_ID,
          learnerId: LEARNER_IDS[0],
          eventType: SessionEventType.ACTIVITY_STARTED,
          eventTime: new Date(session.startedAt.getTime() + 1000),
          metadataJson: { activityId: 'activity-001' },
        },
        {
          sessionId: created.id,
          tenantId: DEV_TENANT_ID,
          learnerId: LEARNER_IDS[0],
          eventType: SessionEventType.ACTIVITY_COMPLETED,
          eventTime: new Date(session.startedAt.getTime() + session.durationMs / 2),
          metadataJson: {
            activityId: 'activity-001',
            score: 0.85,
            durationMs: session.durationMs / 2,
          },
        },
        {
          sessionId: created.id,
          tenantId: DEV_TENANT_ID,
          learnerId: LEARNER_IDS[0],
          eventType: SessionEventType.SESSION_ENDED,
          eventTime: endedAt,
          metadataJson: { reason: 'completed' },
        },
      ],
      skipDuplicates: true,
    });

    console.log(`  ✅ Created session: ${session.sessionType} for Alex`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Sample Sessions for Jordan (new learner)
  // ══════════════════════════════════════════════════════════════════════════

  const jordanSession = {
    id: '00000000-0000-0000-6000-000000000010',
    sessionType: SessionType.BASELINE,
    origin: SessionOrigin.MOBILE_LEARNER,
    startedAt: daysAgo(1),
    durationMs: 20 * 60 * 1000, // 20 minutes
    metadataJson: { baselineType: 'initial', subjects: ['math', 'ela'] },
  };

  const jordanEndedAt = new Date(jordanSession.startedAt.getTime() + jordanSession.durationMs);

  await prisma.session.upsert({
    where: { id: jordanSession.id },
    update: {},
    create: {
      id: jordanSession.id,
      tenantId: DEV_TENANT_ID,
      learnerId: LEARNER_IDS[1],
      sessionType: jordanSession.sessionType,
      origin: jordanSession.origin,
      startedAt: jordanSession.startedAt,
      endedAt: jordanEndedAt,
      durationMs: jordanSession.durationMs,
      metadataJson: jordanSession.metadataJson,
    },
  });

  await prisma.sessionEvent.createMany({
    data: [
      {
        sessionId: jordanSession.id,
        tenantId: DEV_TENANT_ID,
        learnerId: LEARNER_IDS[1],
        eventType: SessionEventType.SESSION_STARTED,
        eventTime: jordanSession.startedAt,
        metadataJson: {},
      },
      {
        sessionId: jordanSession.id,
        tenantId: DEV_TENANT_ID,
        learnerId: LEARNER_IDS[1],
        eventType: SessionEventType.SESSION_ENDED,
        eventTime: jordanEndedAt,
        metadataJson: { reason: 'completed' },
      },
    ],
    skipDuplicates: true,
  });

  console.log(`  ✅ Created session: BASELINE for Jordan`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Sample Sessions for Sam (consistent learner)
  // ══════════════════════════════════════════════════════════════════════════

  // Sam has many sessions - create a batch
  for (let i = 0; i < 5; i++) {
    const sessionId = `00000000-0000-0000-6000-00000000002${i}`;
    const startedAt = daysAgo(i);
    const durationMs = (15 + Math.floor(Math.random() * 20)) * 60 * 1000;
    const endedAt = new Date(startedAt.getTime() + durationMs);

    await prisma.session.upsert({
      where: { id: sessionId },
      update: {},
      create: {
        id: sessionId,
        tenantId: DEV_TENANT_ID,
        learnerId: LEARNER_IDS[2],
        sessionType: SessionType.LEARNING,
        origin: SessionOrigin.MOBILE_LEARNER,
        startedAt,
        endedAt,
        durationMs,
        metadataJson: { day: i },
      },
    });

    await prisma.sessionEvent.createMany({
      data: [
        {
          sessionId,
          tenantId: DEV_TENANT_ID,
          learnerId: LEARNER_IDS[2],
          eventType: SessionEventType.SESSION_STARTED,
          eventTime: startedAt,
          metadataJson: {},
        },
        {
          sessionId,
          tenantId: DEV_TENANT_ID,
          learnerId: LEARNER_IDS[2],
          eventType: SessionEventType.SESSION_ENDED,
          eventTime: endedAt,
          metadataJson: { reason: 'completed' },
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log(`  ✅ Created 5 sessions for Sam`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create an in-progress session (not ended)
  // ══════════════════════════════════════════════════════════════════════════

  const inProgressSession = {
    id: '00000000-0000-0000-6000-000000000099',
    sessionType: SessionType.LEARNING,
    origin: SessionOrigin.MOBILE_LEARNER,
    startedAt: randomMinutesAgo(5, 15),
    metadataJson: { status: 'in_progress', activity: 'fractions-practice' },
  };

  await prisma.session.upsert({
    where: { id: inProgressSession.id },
    update: {},
    create: {
      id: inProgressSession.id,
      tenantId: DEV_TENANT_ID,
      learnerId: LEARNER_IDS[0],
      sessionType: inProgressSession.sessionType,
      origin: inProgressSession.origin,
      startedAt: inProgressSession.startedAt,
      endedAt: null, // Not ended yet
      durationMs: null,
      metadataJson: inProgressSession.metadataJson,
    },
  });

  await prisma.sessionEvent.create({
    data: {
      sessionId: inProgressSession.id,
      tenantId: DEV_TENANT_ID,
      learnerId: LEARNER_IDS[0],
      eventType: SessionEventType.SESSION_STARTED,
      eventTime: inProgressSession.startedAt,
      metadataJson: {},
    },
  });

  console.log(`  ✅ Created in-progress session for Alex`);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Create System Transition Routines
  // ══════════════════════════════════════════════════════════════════════════

  const systemRoutines = [
    {
      id: '00000000-0000-0000-7000-000000000001',
      name: 'Quick Calm (K-5)',
      description: 'A short routine with breathing and movement for younger learners',
      isSystemRoutine: true,
      stepsJson: [
        {
          id: 'step-1',
          type: 'breathing',
          duration: 15,
          instruction:
            'Take 3 big balloon breaths - breathe in through your nose, out through your mouth',
          requiresCompletion: false,
        },
        {
          id: 'step-2',
          type: 'movement',
          duration: 10,
          instruction:
            'Wiggle your fingers and toes, then stretch your arms up high like a giraffe!',
          requiresCompletion: false,
        },
        {
          id: 'step-3',
          type: 'preview',
          duration: 10,
          instruction: "Let's see what fun thing is coming next!",
          requiresCompletion: false,
        },
        {
          id: 'step-4',
          type: 'ready_check',
          duration: 5,
          instruction: "Give a thumbs up when you're ready! 👍",
          requiresCompletion: true,
        },
      ],
    },
    {
      id: '00000000-0000-0000-7000-000000000002',
      name: 'Sensory Reset (K-5)',
      description: 'Grounding routine for learners who need sensory breaks',
      isSystemRoutine: true,
      stepsJson: [
        {
          id: 'step-1',
          type: 'sensory',
          duration: 10,
          instruction: 'Put your feet flat on the floor and feel how solid it is',
          requiresCompletion: false,
        },
        {
          id: 'step-2',
          type: 'sensory',
          duration: 10,
          instruction: 'Squeeze your hands tight for 3 seconds, then let go and feel them relax',
          requiresCompletion: false,
        },
        {
          id: 'step-3',
          type: 'breathing',
          duration: 10,
          instruction: "Take a slow deep breath and let it out like you're blowing a dandelion",
          requiresCompletion: false,
        },
        {
          id: 'step-4',
          type: 'ready_check',
          duration: 5,
          instruction: 'Tap the screen when your body feels calm and ready',
          requiresCompletion: true,
        },
      ],
    },
    {
      id: '00000000-0000-0000-7000-000000000003',
      name: 'Quick Reset (6-8)',
      description: 'Brief transition routine for middle schoolers',
      isSystemRoutine: true,
      stepsJson: [
        {
          id: 'step-1',
          type: 'breathing',
          duration: 15,
          instruction: 'Take 3 box breaths: in for 4, hold for 4, out for 4, hold for 4',
          requiresCompletion: false,
        },
        {
          id: 'step-2',
          type: 'movement',
          duration: 10,
          instruction: 'Roll your shoulders back 3 times and shake out your hands',
          requiresCompletion: false,
        },
        {
          id: 'step-3',
          type: 'preview',
          duration: 5,
          instruction: "Here's what's coming up next",
          requiresCompletion: false,
        },
      ],
    },
    {
      id: '00000000-0000-0000-7000-000000000004',
      name: 'Brief Pause (9-12)',
      description: 'Quick, non-intrusive transition for high schoolers',
      isSystemRoutine: true,
      stepsJson: [
        {
          id: 'step-1',
          type: 'breathing',
          duration: 10,
          instruction: 'Take a moment: 3 deep breaths',
          requiresCompletion: false,
        },
        {
          id: 'step-2',
          type: 'preview',
          duration: 10,
          instruction: "Review what's next and mentally prepare",
          requiresCompletion: false,
        },
      ],
    },
    {
      id: '00000000-0000-0000-7000-000000000005',
      name: 'Quiz Preparation',
      description: 'Helps learners prepare mentally before assessments',
      isSystemRoutine: true,
      stepsJson: [
        {
          id: 'step-1',
          type: 'breathing',
          duration: 15,
          instruction: "Take a few calming breaths - you've got this!",
          requiresCompletion: false,
        },
        {
          id: 'step-2',
          type: 'preview',
          duration: 15,
          instruction:
            "Coming up: a quiz. Remember, it's just to help us understand what you know.",
          requiresCompletion: false,
        },
        {
          id: 'step-3',
          type: 'sensory',
          duration: 10,
          instruction: 'Shake out any nervous energy - wiggle your fingers, roll your shoulders',
          requiresCompletion: false,
        },
        {
          id: 'step-4',
          type: 'ready_check',
          duration: 5,
          instruction: "I'm ready to show what I know!",
          requiresCompletion: true,
        },
      ],
    },
  ];

  for (const routine of systemRoutines) {
    await prisma.transitionRoutine.upsert({
      where: { id: routine.id },
      update: {},
      create: {
        id: routine.id,
        tenantId: DEV_TENANT_ID,
        learnerId: null, // System routines have no learner
        name: routine.name,
        description: routine.description,
        isSystemRoutine: routine.isSystemRoutine,
        stepsJson: routine.stepsJson,
        isActive: true,
      },
    });
    console.log(`  ✅ Created system routine: ${routine.name}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 6. Create Sample Transition Preferences for Alex
  // ══════════════════════════════════════════════════════════════════════════

  await prisma.transitionPreferences.upsert({
    where: {
      tenantId_learnerId: {
        tenantId: DEV_TENANT_ID,
        learnerId: LEARNER_IDS[0],
      },
    },
    update: {},
    create: {
      tenantId: DEV_TENANT_ID,
      learnerId: LEARNER_IDS[0],
      warningStyle: 'visual_audio',
      defaultWarningSeconds: [30, 15, 5],
      visualSettingsJson: {
        style: 'circle',
        colorScheme: 'green_yellow_red',
        showTimer: true,
        showText: true,
        animationSpeed: 'normal',
      },
      audioSettingsJson: {
        enabled: true,
        warningType: 'gentle_chime',
        volume: 0.7,
        voiceType: null,
      },
      hapticSettingsJson: {
        enabled: true,
        intensity: 'medium',
        pattern: 'double_tap',
      },
      preferredRoutineId: systemRoutines[0].id, // Quick Calm (K-5)
      showFirstThenBoard: true,
      requireAcknowledgment: true,
      allowSkipTransition: false,
      extendedTimeMultiplier: 1.5,
    },
  });
  console.log(`  ✅ Created transition preferences for Alex`);

  // ══════════════════════════════════════════════════════════════════════════
  // 7. Create Sample Transition Events
  // ══════════════════════════════════════════════════════════════════════════

  const transitionEvents = [
    {
      id: '00000000-0000-0000-7100-000000000001',
      sessionId: alexSessions[0].id,
      learnerId: LEARNER_IDS[0],
      fromActivityId: 'activity-001',
      toActivityId: 'activity-002',
      plannedDuration: 30,
      actualDuration: 28,
      warningsDelivered: 3,
      warningsAcknowledged: 2,
      routineStepsCompleted: 4,
      routineStepsTotal: 4,
      learnerInteractions: 3,
      outcome: 'smooth' as const,
    },
    {
      id: '00000000-0000-0000-7100-000000000002',
      sessionId: alexSessions[0].id,
      learnerId: LEARNER_IDS[0],
      fromActivityId: 'activity-002',
      toActivityId: 'activity-003',
      plannedDuration: 30,
      actualDuration: 45,
      warningsDelivered: 3,
      warningsAcknowledged: 1,
      routineStepsCompleted: 2,
      routineStepsTotal: 4,
      learnerInteractions: 5,
      outcome: 'struggled' as const,
    },
  ];

  for (const event of transitionEvents) {
    await prisma.transitionEvent.upsert({
      where: { id: event.id },
      update: {},
      create: {
        id: event.id,
        tenantId: DEV_TENANT_ID,
        sessionId: event.sessionId,
        learnerId: event.learnerId,
        fromActivityId: event.fromActivityId,
        toActivityId: event.toActivityId,
        plannedDuration: event.plannedDuration,
        actualDuration: event.actualDuration,
        warningsDelivered: event.warningsDelivered,
        warningsAcknowledged: event.warningsAcknowledged,
        routineStepsCompleted: event.routineStepsCompleted,
        routineStepsTotal: event.routineStepsTotal,
        learnerInteractions: event.learnerInteractions,
        outcome: event.outcome,
        metadataJson: {},
      },
    });
    console.log(`  ✅ Created transition event: ${event.fromActivityId} → ${event.toActivityId}`);
  }

  console.log('');
  console.log('✅ session-svc seeding complete!');
  console.log('');
  console.log('Created sessions:');
  console.log('  - Alex: 3 completed + 1 in-progress');
  console.log('  - Jordan: 1 baseline session');
  console.log('  - Sam: 5 learning sessions');
  console.log('');
  console.log('Created transition support:');
  console.log('  - 5 system transition routines');
  console.log('  - Transition preferences for Alex');
  console.log('  - 2 sample transition events');
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
