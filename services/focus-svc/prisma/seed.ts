/**
 * AIVO Platform - Focus Service Seed Data
 *
 * Creates:
 * - Learner focus state snapshots
 * - Sample focus ping logs
 * - Sample intervention records
 */

import {
  PrismaClient,
  FocusState,
  InterventionType,
  FocusLossReason,
} from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Learner IDs from auth-svc
const LEARNER_IDS = [
  '00000000-0000-0000-2000-000000000001', // alex
  '00000000-0000-0000-2000-000000000002', // jordan
  '00000000-0000-0000-2000-000000000003', // sam
];

// Session IDs from session-svc
const SESSION_IDS = [
  '00000000-0000-0000-6000-000000000001',
  '00000000-0000-0000-6000-000000000099', // in-progress session
];

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function main() {
  console.log('🌱 Seeding focus-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Learner Focus States
  // ══════════════════════════════════════════════════════════════════════════

  const focusStates = [
    {
      id: '00000000-0000-0000-8000-000000000001',
      learnerId: LEARNER_IDS[0], // alex - currently in session
      currentState: FocusState.FOCUSED,
      sessionId: SESSION_IDS[1], // in-progress session
      focusScore: 0.92,
      consecutiveFocusedPings: 15,
      consecutiveDistractedPings: 0,
      lastBreakAt: minutesAgo(30),
      breaksTakenToday: 1,
      lastPingAt: minutesAgo(1),
      lastInteractionAt: minutesAgo(0.5),
    },
    {
      id: '00000000-0000-0000-8000-000000000002',
      learnerId: LEARNER_IDS[1], // jordan - not in session
      currentState: FocusState.AWAY,
      sessionId: null,
      focusScore: 1,
      consecutiveFocusedPings: 0,
      consecutiveDistractedPings: 0,
      lastBreakAt: null,
      breaksTakenToday: 0,
      lastPingAt: minutesAgo(60 * 24), // 1 day ago
      lastInteractionAt: minutesAgo(60 * 24),
    },
    {
      id: '00000000-0000-0000-8000-000000000003',
      learnerId: LEARNER_IDS[2], // sam - just finished session
      currentState: FocusState.AWAY,
      sessionId: null,
      focusScore: 0.88,
      consecutiveFocusedPings: 0,
      consecutiveDistractedPings: 0,
      lastBreakAt: minutesAgo(45),
      breaksTakenToday: 2,
      lastPingAt: minutesAgo(15),
      lastInteractionAt: minutesAgo(15),
    },
  ];

  for (const state of focusStates) {
    await prisma.learnerFocusState.upsert({
      where: { learnerId: state.learnerId },
      update: {},
      create: {
        ...state,
        tenantId: DEV_TENANT_ID,
      },
    });
    console.log(`  ✅ Created focus state for learner: ${state.learnerId.slice(-1)}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Sample Focus Ping Logs (for Alex's in-progress session)
  // ══════════════════════════════════════════════════════════════════════════

  const pingLogs = [];
  for (let i = 0; i < 20; i++) {
    const focusScore = 0.7 + Math.random() * 0.3; // 0.7 - 1.0
    const isOnTask = focusScore > 0.6;

    pingLogs.push({
      tenantId: DEV_TENANT_ID,
      learnerId: LEARNER_IDS[0],
      sessionId: SESSION_IDS[1],
      focusScore,
      isOnTask,
      focusLossDetected: !isOnTask,
      lossReasons: isOnTask ? [] : [FocusLossReason.EXTENDED_IDLE],
      idleTimeMs: isOnTask ? Math.floor(Math.random() * 5000) : Math.floor(Math.random() * 30000),
      interactionCount: Math.floor(Math.random() * 10),
      errorCount: Math.floor(Math.random() * 2),
      recordedAt: minutesAgo(20 - i),
    });
  }

  await prisma.focusPingLog.createMany({
    data: pingLogs,
    skipDuplicates: true,
  });

  console.log(`  ✅ Created ${pingLogs.length} focus ping logs for Alex`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Sample Interventions
  // ══════════════════════════════════════════════════════════════════════════

  const interventions = [
    {
      id: '00000000-0000-0000-8100-000000000001',
      tenantId: DEV_TENANT_ID,
      learnerId: LEARNER_IDS[0],
      sessionId: SESSION_IDS[0],
      interventionType: InterventionType.GENTLE_NUDGE,
      triggerReasons: [FocusLossReason.EXTENDED_IDLE],
      triggeredAt: minutesAgo(120),
      acknowledgedAt: minutesAgo(119),
      completedAt: minutesAgo(119),
      wasAccepted: true,
      focusScoreBefore: 0.45,
      focusScoreAfter: 0.78,
    },
    {
      id: '00000000-0000-0000-8100-000000000002',
      tenantId: DEV_TENANT_ID,
      learnerId: LEARNER_IDS[0],
      sessionId: SESSION_IDS[0],
      interventionType: InterventionType.BREAK_SUGGESTION,
      triggerReasons: [FocusLossReason.ERROR_FRUSTRATION],
      triggeredAt: minutesAgo(90),
      acknowledgedAt: minutesAgo(89),
      completedAt: minutesAgo(84),
      wasAccepted: true,
      focusScoreBefore: 0.35,
      focusScoreAfter: 0.85,
      regulationActivityId: 'breathing-exercise',
      regulationDurationMs: 5 * 60 * 1000,
    },
    {
      id: '00000000-0000-0000-8100-000000000003',
      tenantId: DEV_TENANT_ID,
      learnerId: LEARNER_IDS[2],
      sessionId: SESSION_IDS[0],
      interventionType: InterventionType.DIFFICULTY_ADJUST,
      triggerReasons: [FocusLossReason.ERROR_FRUSTRATION],
      triggeredAt: minutesAgo(60),
      acknowledgedAt: minutesAgo(59),
      completedAt: minutesAgo(59),
      wasAccepted: true,
      focusScoreBefore: 0.42,
      focusScoreAfter: 0.75,
      metadataJson: { previousDifficulty: 'hard', newDifficulty: 'medium' },
    },
  ];

  for (const intervention of interventions) {
    await prisma.focusIntervention.upsert({
      where: { id: intervention.id },
      update: {},
      create: intervention,
    });
  }

  console.log(`  ✅ Created ${interventions.length} focus interventions`);

  console.log('');
  console.log('✅ focus-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log(`  - ${focusStates.length} learner focus states`);
  console.log(`  - ${pingLogs.length} focus ping logs`);
  console.log(`  - ${interventions.length} focus interventions`);
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
