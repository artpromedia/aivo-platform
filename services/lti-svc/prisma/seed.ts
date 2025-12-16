/**
 * AIVO Platform - LTI Service Seed Data
 *
 * Creates:
 * - LTI Tool configurations for Canvas and Schoology
 * - Sample LTI Links (assignments)
 */

import { PrismaClient, LtiPlatformType, LtiUserRole, LtiLaunchStatus, LtiGradeStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000002';
const TEACHER_USER_ID = '00000000-0000-0000-1000-000000000003';

// Classrooms
const CLASSROOM_3A_ID = '00000000-0000-0000-0002-000000000001';
const CLASSROOM_3B_ID = '00000000-0000-0000-0002-000000000002';

// Learning Objects (from content-svc)
const LO_FRACTIONS_V1 = '00000000-0000-0000-ca10-000000000001';
const LO_READING_V1 = '00000000-0000-0000-ca10-000000000010';

// LTI Tools
const CANVAS_TOOL_ID = '00000000-0000-0000-lt00-000000000001';
const SCHOOLOGY_TOOL_ID = '00000000-0000-0000-lt00-000000000002';

async function main() {
  console.log('🌱 Seeding lti-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create LTI Tool Configurations
  // ══════════════════════════════════════════════════════════════════════════

  // Canvas LTI Tool
  await prisma.ltiTool.upsert({
    where: { id: CANVAS_TOOL_ID },
    update: {},
    create: {
      id: CANVAS_TOOL_ID,
      tenantId: DEV_TENANT_ID,
      platformType: LtiPlatformType.CANVAS,
      platformName: 'Springfield District Canvas',
      clientId: '10000000000001',
      deploymentId: '1',
      issuer: 'https://canvas.springfield.k12.us',
      authLoginUrl: 'https://canvas.springfield.k12.us/api/lti/authorize_redirect',
      authTokenUrl: 'https://canvas.springfield.k12.us/login/oauth2/token',
      jwksUrl: 'https://canvas.springfield.k12.us/api/lti/security/jwks',
      toolPrivateKeyRef: 'vault://lti/canvas-springfield/private-key',
      toolPublicKeyId: 'aivo-canvas-key-001',
      lineItemsUrl: 'https://canvas.springfield.k12.us/api/lti/courses/{context_id}/line_items',
      membershipsUrl: 'https://canvas.springfield.k12.us/api/lti/courses/{context_id}/names_and_roles',
      deepLinkingUrl: 'https://canvas.springfield.k12.us/api/lti/deep_linking',
      enabled: true,
      configJson: {
        defaultAssignmentPoints: 100,
        syncGrades: true,
        syncRoster: true,
        autoProvisionStudents: true,
      },
    },
  });
  console.log('  ✅ Created LTI tool: Canvas (Springfield District)');

  // Schoology LTI Tool
  await prisma.ltiTool.upsert({
    where: { id: SCHOOLOGY_TOOL_ID },
    update: {},
    create: {
      id: SCHOOLOGY_TOOL_ID,
      tenantId: DEMO_TENANT_ID,
      platformType: LtiPlatformType.SCHOOLOGY,
      platformName: 'Demo School Schoology',
      clientId: 'aivo-demo-schoology',
      deploymentId: 'demo-1',
      issuer: 'https://demo.schoology.com',
      authLoginUrl: 'https://demo.schoology.com/lti/authorize',
      authTokenUrl: 'https://demo.schoology.com/oauth2/token',
      jwksUrl: 'https://demo.schoology.com/.well-known/jwks.json',
      toolPrivateKeyRef: 'vault://lti/schoology-demo/private-key',
      toolPublicKeyId: 'aivo-schoology-key-001',
      enabled: true,
      configJson: {
        defaultAssignmentPoints: 100,
        syncGrades: true,
        gradeSyncFormat: 'percentage',
      },
    },
  });
  console.log('  ✅ Created LTI tool: Schoology (Demo School)');

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create LTI Links (Assignments)
  // ══════════════════════════════════════════════════════════════════════════

  const links = [
    // Canvas: Fractions Assignment for 3rd Grade
    {
      id: '00000000-0000-0000-lt10-000000000001',
      tenantId: DEV_TENANT_ID,
      ltiToolId: CANVAS_TOOL_ID,
      lmsContextId: 'course_math_3rd',
      lmsResourceLinkId: 'assignment_fractions_intro',
      classroomId: CLASSROOM_3A_ID,
      loVersionId: LO_FRACTIONS_V1,
      title: 'Introduction to Fractions',
      description: 'Complete the interactive fractions lesson',
      maxPoints: 100,
      gradingEnabled: true,
      lineItemId: 'https://canvas.springfield.k12.us/api/lti/courses/course_math_3rd/line_items/1',
      createdByUserId: TEACHER_USER_ID,
      configJson: {
        dueDate: '2024-02-15T23:59:59Z',
        allowLateSubmissions: true,
      },
    },
    // Canvas: Reading Assignment for 3rd Grade
    {
      id: '00000000-0000-0000-lt10-000000000002',
      tenantId: DEV_TENANT_ID,
      ltiToolId: CANVAS_TOOL_ID,
      lmsContextId: 'course_ela_3rd',
      lmsResourceLinkId: 'assignment_reading_detective',
      classroomId: CLASSROOM_3B_ID,
      loVersionId: LO_READING_V1,
      title: 'Reading Detective Activity',
      description: 'Read the story and answer comprehension questions',
      maxPoints: 50,
      gradingEnabled: true,
      lineItemId: 'https://canvas.springfield.k12.us/api/lti/courses/course_ela_3rd/line_items/2',
      createdByUserId: TEACHER_USER_ID,
      configJson: {
        dueDate: '2024-02-20T23:59:59Z',
        allowLateSubmissions: false,
      },
    },
    // Canvas: Dynamic Math Practice (no specific LO)
    {
      id: '00000000-0000-0000-lt10-000000000003',
      tenantId: DEV_TENANT_ID,
      ltiToolId: CANVAS_TOOL_ID,
      lmsContextId: 'course_math_3rd',
      lmsResourceLinkId: 'assignment_math_practice',
      classroomId: CLASSROOM_3A_ID,
      subject: 'MATH',
      gradeBand: 'G3_5',
      title: 'Weekly Math Practice',
      description: 'Complete personalized math practice activities',
      maxPoints: null,
      gradingEnabled: false,
      createdByUserId: TEACHER_USER_ID,
      configJson: {
        activityType: 'practice',
        duration: 15,
      },
    },
    // Schoology: Demo Assignment
    {
      id: '00000000-0000-0000-lt10-000000000010',
      tenantId: DEMO_TENANT_ID,
      ltiToolId: SCHOOLOGY_TOOL_ID,
      lmsContextId: 'demo_course_1',
      lmsResourceLinkId: 'demo_assignment_1',
      title: 'AIVO Demo Activity',
      description: 'Try out AIVO adaptive learning',
      gradingEnabled: false,
      createdByUserId: TEACHER_USER_ID,
      configJson: {
        demoMode: true,
      },
    },
  ];

  for (const link of links) {
    await prisma.ltiLink.upsert({
      where: { id: link.id },
      update: {},
      create: link,
    });
  }
  console.log(`  ✅ Created ${links.length} LTI links (assignments)`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Sample LTI Launch (for demo)
  // ══════════════════════════════════════════════════════════════════════════

  const sampleLaunch = {
    id: '00000000-0000-0000-lt20-000000000001',
    tenantId: DEV_TENANT_ID,
    ltiToolId: CANVAS_TOOL_ID,
    ltiLinkId: '00000000-0000-0000-lt10-000000000001',
    lmsUserId: 'canvas_student_001',
    lmsUserEmail: 'alex.j@springfield.k12.us',
    lmsUserName: 'Alex Johnson',
    userRole: LtiUserRole.LEARNER,
    aivoUserId: '00000000-0000-0000-2000-000000000001', // Alex
    aivoLearnerId: '00000000-0000-0000-2000-000000000001',
    lmsContextId: 'course_math_3rd',
    lmsContextTitle: '3rd Grade Math - Ms. Smith',
    lmsResourceLinkId: 'assignment_fractions_intro',
    status: LtiLaunchStatus.COMPLETED,
    nonce: 'nonce_sample_001_' + Date.now(),
    aivoSessionId: '00000000-0000-0000-6000-000000000001', // Alex's session
    gradeStatus: LtiGradeStatus.SENT,
    gradeValue: 85,
    gradeSentAt: new Date('2024-01-15T15:30:00Z'),
  };

  await prisma.ltiLaunch.upsert({
    where: { id: sampleLaunch.id },
    update: {},
    create: sampleLaunch,
  });
  console.log('  ✅ Created sample LTI launch');

  console.log('');
  console.log('✅ lti-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 2 LTI tool configurations (Canvas, Schoology)');
  console.log('  - 4 LTI links (assignments)');
  console.log('  - 1 sample LTI launch with grade passback');
  console.log('');
  console.log('LTI 1.3 Integration:');
  console.log('  - Canvas: Full AGS + NRPS + Deep Linking support');
  console.log('  - Schoology: Basic LTI 1.3 with grade sync');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
