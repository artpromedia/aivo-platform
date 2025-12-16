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

  console.log('');
  console.log('✅ session-svc seeding complete!');
  console.log('');
  console.log('Created sessions:');
  console.log('  - Alex: 3 completed + 1 in-progress');
  console.log('  - Jordan: 1 baseline session');
  console.log('  - Sam: 5 learning sessions');
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
