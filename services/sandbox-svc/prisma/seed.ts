/**
 * AIVO Platform - Sandbox Service Seed Data
 *
 * Creates:
 * - Sample partners (approved, pending)
 * - Partner applications
 * - Sandbox tenants with API keys
 * - Synthetic learners and teachers
 * - Webhook endpoints
 */

import { PrismaClient, PartnerStatus, ApiKeyStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Partner IDs
const EDTECH_PARTNER = '00000000-0000-0000-sb00-000000000001';
const RESEARCH_PARTNER = '00000000-0000-0000-sb00-000000000002';
const PENDING_PARTNER = '00000000-0000-0000-sb00-000000000003';

// Sandbox tenant IDs
const EDTECH_SANDBOX = '00000000-0000-0000-sb10-000000000001';
const RESEARCH_SANDBOX = '00000000-0000-0000-sb10-000000000002';

async function main() {
  console.log('🌱 Seeding sandbox-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Partners
  // ══════════════════════════════════════════════════════════════════════════

  const partners = [
    {
      id: EDTECH_PARTNER,
      name: 'LearnTech Solutions',
      website: 'https://learntech.example.com',
      contactName: 'Sarah Developer',
      contactEmail: 'sarah@learntech.example.com',
      contactRole: 'CTO',
      status: PartnerStatus.APPROVED,
      tier: 'standard',
      approvedAt: new Date('2024-01-05'),
      approvedBy: '00000000-0000-0000-1000-000000000001',
      approvalNotes: 'Verified EdTech company with strong privacy practices',
    },
    {
      id: RESEARCH_PARTNER,
      name: 'University Learning Lab',
      website: 'https://learning.university.edu',
      contactName: 'Dr. Research',
      contactEmail: 'research@university.edu',
      contactRole: 'Principal Investigator',
      status: PartnerStatus.APPROVED,
      tier: 'enterprise',
      approvedAt: new Date('2024-01-10'),
      approvedBy: '00000000-0000-0000-1000-000000000001',
      approvalNotes: 'Academic research partner with IRB approval',
    },
    {
      id: PENDING_PARTNER,
      name: 'New Startup Inc',
      website: 'https://newstartup.io',
      contactName: 'Alex Founder',
      contactEmail: 'alex@newstartup.io',
      contactRole: 'CEO',
      status: PartnerStatus.PENDING,
      tier: 'free',
    },
  ];

  for (const partner of partners) {
    await prisma.partner.upsert({
      where: { id: partner.id },
      update: {},
      create: partner,
    });
  }
  console.log(`  ✅ Created ${partners.length} partners`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Partner Applications
  // ══════════════════════════════════════════════════════════════════════════

  const applications = [
    {
      id: '00000000-0000-0000-sb01-000000000001',
      partnerId: EDTECH_PARTNER,
      integrationType: ['api', 'webhooks'],
      useCase:
        'Build a companion app that tracks student progress and provides supplementary content recommendations based on AIVO learning data.',
      expectedVolume: '1000 API calls/day',
      timeline: 'Q2 2024 launch',
      reviewNotes: 'Clear use case, appropriate data access requests',
      reviewedBy: '00000000-0000-0000-1000-000000000001',
      reviewedAt: new Date('2024-01-05'),
    },
    {
      id: '00000000-0000-0000-sb01-000000000002',
      partnerId: RESEARCH_PARTNER,
      integrationType: ['api'],
      useCase:
        'Research study on adaptive learning efficacy. Need read-only access to de-identified learning analytics for academic publication.',
      expectedVolume: '100 API calls/day',
      timeline: '2-year research grant',
      reviewNotes: 'IRB approved, data use agreement signed',
      reviewedBy: '00000000-0000-0000-1000-000000000001',
      reviewedAt: new Date('2024-01-10'),
    },
    {
      id: '00000000-0000-0000-sb01-000000000003',
      partnerId: PENDING_PARTNER,
      integrationType: ['api', 'webhooks', 'lti'],
      useCase: 'Gamification overlay for AIVO - add achievements and leaderboards.',
      expectedVolume: '5000 API calls/day',
      timeline: 'ASAP',
    },
  ];

  for (const app of applications) {
    await prisma.partnerApplication.upsert({
      where: { id: app.id },
      update: {},
      create: app,
    });
  }
  console.log(`  ✅ Created ${applications.length} partner applications`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Sandbox Tenants
  // ══════════════════════════════════════════════════════════════════════════

  const sandboxTenants = [
    {
      id: EDTECH_SANDBOX,
      partnerId: EDTECH_PARTNER,
      name: 'LearnTech Dev Environment',
      tenantCode: 'learntech-sandbox',
      webhookSecret: 'whsec_sandbox_learntech_demo_secret',
      isActive: true,
    },
    {
      id: RESEARCH_SANDBOX,
      partnerId: RESEARCH_PARTNER,
      name: 'University Research Sandbox',
      tenantCode: 'uniresearch-sandbox',
      webhookSecret: 'whsec_sandbox_research_demo_secret',
      isActive: true,
    },
  ];

  for (const tenant of sandboxTenants) {
    await prisma.sandboxTenant.upsert({
      where: { id: tenant.id },
      update: {},
      create: tenant,
    });
  }
  console.log(`  ✅ Created ${sandboxTenants.length} sandbox tenants`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create Sandbox API Keys
  // ══════════════════════════════════════════════════════════════════════════

  const apiKeys = [
    {
      id: '00000000-0000-0000-sb20-000000000001',
      tenantId: EDTECH_SANDBOX,
      name: 'Development Key',
      keyHash: 'sha256:sandbox_learntech_dev_key_hash',
      keyPrefix: 'sb_lt_dev_',
      scopes: ['read:learner_progress', 'read:session_data'],
      status: ApiKeyStatus.ACTIVE,
      lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: '00000000-0000-0000-sb20-000000000002',
      tenantId: EDTECH_SANDBOX,
      name: 'Staging Key',
      keyHash: 'sha256:sandbox_learntech_staging_key_hash',
      keyPrefix: 'sb_lt_stg_',
      scopes: ['read:learner_progress', 'read:session_data', 'write:external_events'],
      status: ApiKeyStatus.ACTIVE,
    },
    {
      id: '00000000-0000-0000-sb20-000000000003',
      tenantId: RESEARCH_SANDBOX,
      name: 'Research API Key',
      keyHash: 'sha256:sandbox_research_key_hash',
      keyPrefix: 'sb_uni_res_',
      scopes: ['read:learner_progress', 'read:session_data', 'read:analytics'],
      status: ApiKeyStatus.ACTIVE,
      lastUsedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ];

  for (const key of apiKeys) {
    await prisma.sandboxApiKey.upsert({
      where: { id: key.id },
      update: {},
      create: key,
    });
  }
  console.log(`  ✅ Created ${apiKeys.length} sandbox API keys`);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Create Synthetic Learners
  // ══════════════════════════════════════════════════════════════════════════

  const syntheticLearners = [
    // LearnTech sandbox learners
    {
      id: '00000000-0000-0000-sb30-000000000001',
      tenantId: EDTECH_SANDBOX,
      externalId: 'synth_learner_001',
      displayName: 'Demo Learner Alex',
      gradeLevel: '3',
      profileJson: {
        learningStyle: 'visual',
        readingLevel: 3.2,
        mathLevel: 2.8,
        preferredSubjects: ['MATH', 'SCIENCE'],
      },
    },
    {
      id: '00000000-0000-0000-sb30-000000000002',
      tenantId: EDTECH_SANDBOX,
      externalId: 'synth_learner_002',
      displayName: 'Demo Learner Jordan',
      gradeLevel: '4',
      profileJson: {
        learningStyle: 'kinesthetic',
        readingLevel: 4.5,
        mathLevel: 3.5,
        preferredSubjects: ['ELA', 'ART'],
      },
    },
    // Research sandbox learners (de-identified)
    {
      id: '00000000-0000-0000-sb30-000000000010',
      tenantId: RESEARCH_SANDBOX,
      externalId: 'participant_001',
      displayName: 'Participant A',
      gradeLevel: '3',
      profileJson: {
        cohort: 'control',
        enrollmentDate: '2024-01-15',
      },
    },
    {
      id: '00000000-0000-0000-sb30-000000000011',
      tenantId: RESEARCH_SANDBOX,
      externalId: 'participant_002',
      displayName: 'Participant B',
      gradeLevel: '3',
      profileJson: {
        cohort: 'treatment',
        enrollmentDate: '2024-01-15',
      },
    },
  ];

  for (const learner of syntheticLearners) {
    await prisma.sandboxSyntheticLearner.upsert({
      where: { id: learner.id },
      update: {},
      create: learner,
    });
  }
  console.log(`  ✅ Created ${syntheticLearners.length} synthetic learners`);

  // ══════════════════════════════════════════════════════════════════════════
  // 6. Create Synthetic Teachers
  // ══════════════════════════════════════════════════════════════════════════

  const syntheticTeachers = [
    {
      id: '00000000-0000-0000-sb31-000000000001',
      tenantId: EDTECH_SANDBOX,
      externalId: 'synth_teacher_001',
      displayName: 'Demo Teacher Smith',
      email: 'smith@sandbox.learntech.example.com',
      role: 'TEACHER',
    },
    {
      id: '00000000-0000-0000-sb31-000000000002',
      tenantId: RESEARCH_SANDBOX,
      externalId: 'research_admin',
      displayName: 'Research Admin',
      email: 'admin@sandbox.research.edu',
      role: 'ADMIN',
    },
  ];

  for (const teacher of syntheticTeachers) {
    await prisma.sandboxSyntheticTeacher.upsert({
      where: { id: teacher.id },
      update: {},
      create: teacher,
    });
  }
  console.log(`  ✅ Created ${syntheticTeachers.length} synthetic teachers`);

  // ══════════════════════════════════════════════════════════════════════════
  // 7. Create Webhook Endpoints
  // ══════════════════════════════════════════════════════════════════════════

  const webhookEndpoints = [
    {
      id: '00000000-0000-0000-sb40-000000000001',
      tenantId: EDTECH_SANDBOX,
      name: 'LearnTech Dev Webhook',
      url: 'https://dev.learntech.example.com/webhooks/aivo',
      eventTypes: ['SESSION_COMPLETED', 'ACHIEVEMENT_UNLOCKED'],
      isActive: true,
      secretHash: 'sha256:webhook_secret_hash_lt_dev',
    },
    {
      id: '00000000-0000-0000-sb40-000000000002',
      tenantId: RESEARCH_SANDBOX,
      name: 'Research Data Collector',
      url: 'https://data.research.university.edu/collect',
      eventTypes: ['SESSION_COMPLETED', 'ASSESSMENT_COMPLETED'],
      isActive: true,
      secretHash: 'sha256:webhook_secret_hash_research',
    },
  ];

  for (const endpoint of webhookEndpoints) {
    await prisma.sandboxWebhookEndpoint.upsert({
      where: { id: endpoint.id },
      update: {},
      create: endpoint,
    });
  }
  console.log(`  ✅ Created ${webhookEndpoints.length} webhook endpoints`);

  console.log('');
  console.log('✅ sandbox-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 3 partners (2 approved, 1 pending)');
  console.log('  - 3 partner applications');
  console.log('  - 2 sandbox tenants');
  console.log('  - 3 sandbox API keys');
  console.log('  - 4 synthetic learners');
  console.log('  - 2 synthetic teachers');
  console.log('  - 2 webhook endpoints');
  console.log('');
  console.log('Demonstrates:');
  console.log('  - Partner onboarding workflow');
  console.log('  - Sandbox environment provisioning');
  console.log('  - Synthetic data for testing');
  console.log('  - API key and webhook management');
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
