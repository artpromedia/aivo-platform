/**
 * AIVO Platform - Embedded Tools Service Seed Data
 *
 * Creates:
 * - Tool definitions (registered third-party tools)
 * - Tool scopes and permissions
 * - Sample tool sessions
 */

import {
  PrismaClient,
  ToolSessionStatus,
  SessionEventType,
} from '@prisma/client';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ALEX_USER_ID = '00000000-0000-0000-2000-000000000001';
const SAM_USER_ID = '00000000-0000-0000-2000-000000000003';

// Marketplace vendors/items (from marketplace-svc)
const MATHVENTURES_VENDOR = '00000000-0000-0000-a000-000000000002';
const SCIENCELABVR_VENDOR = '00000000-0000-0000-a000-000000000004';

// Tools
const TOOL_FRACTION_BUILDER = '00000000-0000-0000-et00-000000000001';
const TOOL_VR_LAB = '00000000-0000-0000-et00-000000000002';
const TOOL_SPELLING_BEE = '00000000-0000-0000-et00-000000000003';

async function main() {
  console.log('🌱 Seeding embedded-tools-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Tool Definitions
  // ══════════════════════════════════════════════════════════════════════════

  const tools = [
    {
      id: TOOL_FRACTION_BUILDER,
      tenantId: null, // Global tool
      vendorId: MATHVENTURES_VENDOR,
      slug: 'fraction-builder',
      name: 'Interactive Fraction Builder',
      description: 'Visual tool for building and manipulating fractions with pizza and pie models',
      version: '2.1.0',
      embedUrl: 'https://tools.mathventures.com/fraction-builder/embed',
      sandboxConfig: {
        allowScripts: true,
        allowPopups: false,
        allowForms: true,
        allowTopNavigation: false,
      },
      defaultScopes: [
        'LEARNER_PROFILE_MIN',
        'SESSION_EVENTS_WRITE',
        'PROGRESS_WRITE',
        'THEME_READ',
      ],
      ageRangeMin: 6,
      ageRangeMax: 12,
      subjects: ['MATH'],
      skills: ['MATH.NF.1', 'MATH.NF.2', 'MATH.NF.3'],
      isActive: true,
      isApproved: true,
      approvedAt: new Date('2024-01-01'),
      metadataJson: {
        screenshots: ['fraction-builder-1.png', 'fraction-builder-2.png'],
        estimatedMinutes: 10,
        accessibility: ['screen_reader', 'high_contrast', 'keyboard_nav'],
      },
    },
    {
      id: TOOL_VR_LAB,
      tenantId: null,
      vendorId: SCIENCELABVR_VENDOR,
      slug: 'vr-science-lab',
      name: 'Virtual Science Laboratory',
      description: 'Immersive VR environment for safe science experiments',
      version: '1.5.0',
      embedUrl: 'https://embed.sciencelabvr.edu/lab',
      sandboxConfig: {
        allowScripts: true,
        allowPopups: false,
        allowForms: true,
        allowTopNavigation: false,
        allowXr: true, // WebXR for VR
      },
      defaultScopes: [
        'LEARNER_PROFILE_MIN',
        'SESSION_EVENTS_WRITE',
        'PROGRESS_WRITE',
        'THEME_READ',
        'CLASSROOM_CONTEXT',
      ],
      ageRangeMin: 8,
      ageRangeMax: 18,
      subjects: ['SCIENCE'],
      skills: ['SCI.PS.1', 'SCI.LS.1'],
      isActive: true,
      isApproved: true,
      approvedAt: new Date('2024-01-15'),
      metadataJson: {
        requiresWebXR: true,
        experiments: ['chemistry', 'physics', 'biology'],
        safetyRating: 'E_FOR_EVERYONE',
      },
    },
    {
      id: TOOL_SPELLING_BEE,
      tenantId: DEV_TENANT_ID, // Tenant-specific tool
      vendorId: null, // Custom tenant tool
      slug: 'spelling-bee-game',
      name: 'Spelling Bee Challenge',
      description: 'Fun spelling practice game with audio pronunciation',
      version: '1.0.0',
      embedUrl: 'https://spelling.aivo.dev/embed',
      sandboxConfig: {
        allowScripts: true,
        allowPopups: false,
        allowForms: false,
        allowTopNavigation: false,
      },
      defaultScopes: [
        'LEARNER_PSEUDONYM',
        'SESSION_EVENTS_WRITE',
        'THEME_READ',
      ],
      ageRangeMin: 5,
      ageRangeMax: 10,
      subjects: ['ELA'],
      skills: ['ELA.RF.2', 'ELA.RF.3'],
      isActive: true,
      isApproved: true,
      approvedAt: new Date('2024-01-10'),
    },
  ];

  for (const tool of tools) {
    await prisma.tool.upsert({
      where: { id: tool.id },
      update: {},
      create: tool,
    });
  }
  console.log(`  ✅ Created ${tools.length} tool definitions`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Tool Sessions
  // ══════════════════════════════════════════════════════════════════════════

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

  const sessions = [
    // Alex's completed Fraction Builder session
    {
      id: '00000000-0000-0000-et10-000000000001',
      tenantId: DEV_TENANT_ID,
      toolId: TOOL_FRACTION_BUILDER,
      learnerId: ALEX_USER_ID,
      sessionToken: 'tok_alex_fractions_001',
      status: ToolSessionStatus.COMPLETED,
      grantedScopes: ['LEARNER_PROFILE_MIN', 'SESSION_EVENTS_WRITE', 'PROGRESS_WRITE', 'THEME_READ'],
      startedAt: oneHourAgo,
      endedAt: thirtyMinutesAgo,
      expiresAt: new Date(oneHourAgo.getTime() + 2 * 60 * 60 * 1000),
      aivoSessionId: '00000000-0000-0000-6000-000000000001',
      contextJson: {
        classroomId: '00000000-0000-0000-0002-000000000001',
        assignmentId: null,
        launchSource: 'learning_session',
      },
      metadataJson: {
        toolVersion: '2.1.0',
        userAgent: 'Mozilla/5.0 (iPad)',
      },
    },
    // Sam's active VR Lab session
    {
      id: '00000000-0000-0000-et10-000000000002',
      tenantId: DEV_TENANT_ID,
      toolId: TOOL_VR_LAB,
      learnerId: SAM_USER_ID,
      sessionToken: 'tok_sam_vrlab_001',
      status: ToolSessionStatus.ACTIVE,
      grantedScopes: ['LEARNER_PROFILE_MIN', 'SESSION_EVENTS_WRITE', 'PROGRESS_WRITE', 'THEME_READ', 'CLASSROOM_CONTEXT'],
      startedAt: thirtyMinutesAgo,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      contextJson: {
        classroomId: '00000000-0000-0000-0002-000000000002',
        experiment: 'chemistry_reactions',
      },
    },
  ];

  for (const session of sessions) {
    await prisma.toolSession.upsert({
      where: { id: session.id },
      update: {},
      create: session,
    });
  }
  console.log(`  ✅ Created ${sessions.length} tool sessions`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Session Events
  // ══════════════════════════════════════════════════════════════════════════

  const events = [
    // Alex's Fraction Builder events
    {
      id: '00000000-0000-0000-et20-000000000001',
      sessionId: '00000000-0000-0000-et10-000000000001',
      eventType: SessionEventType.SESSION_STARTED,
      eventTime: oneHourAgo,
      dataJson: { toolVersion: '2.1.0' },
    },
    {
      id: '00000000-0000-0000-et20-000000000002',
      sessionId: '00000000-0000-0000-et10-000000000001',
      eventType: SessionEventType.ACTIVITY_STARTED,
      eventTime: new Date(oneHourAgo.getTime() + 1000),
      dataJson: { activityId: 'intro_fractions', activityName: 'Introduction to Fractions' },
    },
    {
      id: '00000000-0000-0000-et20-000000000003',
      sessionId: '00000000-0000-0000-et10-000000000001',
      eventType: SessionEventType.HINT_REQUESTED,
      eventTime: new Date(oneHourAgo.getTime() + 5 * 60 * 1000),
      dataJson: { hintLevel: 1, question: 'fraction_comparison_1' },
    },
    {
      id: '00000000-0000-0000-et20-000000000004',
      sessionId: '00000000-0000-0000-et10-000000000001',
      eventType: SessionEventType.ACTIVITY_COMPLETED,
      eventTime: new Date(oneHourAgo.getTime() + 15 * 60 * 1000),
      dataJson: { activityId: 'intro_fractions', score: 85, timeSpentSeconds: 900 },
    },
    {
      id: '00000000-0000-0000-et20-000000000005',
      sessionId: '00000000-0000-0000-et10-000000000001',
      eventType: SessionEventType.SCORE_RECORDED,
      eventTime: new Date(oneHourAgo.getTime() + 15 * 60 * 1000),
      dataJson: { score: 85, maxScore: 100, skillCode: 'MATH.NF.1', masteryDelta: 0.05 },
    },
    {
      id: '00000000-0000-0000-et20-000000000006',
      sessionId: '00000000-0000-0000-et10-000000000001',
      eventType: SessionEventType.SESSION_ENDED,
      eventTime: thirtyMinutesAgo,
      dataJson: { reason: 'user_completed', totalTimeSeconds: 1800 },
    },
    // Sam's VR Lab events (ongoing)
    {
      id: '00000000-0000-0000-et20-000000000010',
      sessionId: '00000000-0000-0000-et10-000000000002',
      eventType: SessionEventType.SESSION_STARTED,
      eventTime: thirtyMinutesAgo,
      dataJson: { experiment: 'chemistry_reactions' },
    },
    {
      id: '00000000-0000-0000-et20-000000000011',
      sessionId: '00000000-0000-0000-et10-000000000002',
      eventType: SessionEventType.ACTIVITY_PROGRESS,
      eventTime: new Date(thirtyMinutesAgo.getTime() + 10 * 60 * 1000),
      dataJson: { experimentStep: 2, completionPct: 40 },
    },
  ];

  for (const event of events) {
    await prisma.sessionEvent.upsert({
      where: { id: event.id },
      update: {},
      create: event,
    });
  }
  console.log(`  ✅ Created ${events.length} session events`);

  console.log('');
  console.log('✅ embedded-tools-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 3 tool definitions (Fraction Builder, VR Lab, Spelling Bee)');
  console.log('  - 2 tool sessions (1 completed, 1 active)');
  console.log('  - 8 session events (lifecycle, activity, hints, scores)');
  console.log('');
  console.log('Demonstrates:');
  console.log('  - COPPA-compliant scope-based data sharing');
  console.log('  - Sandboxed tool embedding');
  console.log('  - Event tracking for learning analytics');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
