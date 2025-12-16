/**
 * AIVO Platform - SIS Sync Service Seed Data
 *
 * Creates:
 * - SIS provider configurations (Clever, ClassLink, Google)
 * - Sample sync runs
 * - Field mappings
 */

import {
  PrismaClient,
  SisProviderType,
  IntegrationStatus,
  SyncStatus,
  SisEntityType,
} from '@prisma/client';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000002';

// Provider IDs
const CLEVER_PROVIDER = 'clr_00000000000000000001';
const GOOGLE_PROVIDER = 'clr_00000000000000000002';
const ONEROSTER_PROVIDER = 'clr_00000000000000000003';

async function main() {
  console.log('🌱 Seeding sis-sync-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create SIS Providers
  // ══════════════════════════════════════════════════════════════════════════

  const providers = [
    {
      id: CLEVER_PROVIDER,
      tenantId: DEV_TENANT_ID,
      providerType: SisProviderType.CLEVER,
      name: 'Clever District Integration',
      configJson: JSON.stringify({
        clientId: 'clever_client_demo',
        districtId: 'district_12345',
        apiVersion: 'v3.0',
      }),
      enabled: true,
      integrationStatus: IntegrationStatus.CONNECTED,
      secretsRef: 'vault://secrets/sis/clever/dev-tenant',
      ssoEnabled: true,
      domainFilter: ['students.demo.edu', 'staff.demo.edu'],
      autoProvisionUsers: true,
      autoProvisionLearners: true,
      defaultRole: 'LEARNER',
      oauthMetadata: {
        scopesGranted: ['read:district_admins', 'read:teachers', 'read:students', 'read:sections'],
        tokenRefreshedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
      lastConnectionCheck: new Date(Date.now() - 1 * 60 * 60 * 1000),
      lastSyncAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      syncSchedule: '0 2 * * *', // 2 AM daily
    },
    {
      id: GOOGLE_PROVIDER,
      tenantId: DEV_TENANT_ID,
      providerType: SisProviderType.GOOGLE_WORKSPACE,
      name: 'Google Workspace SSO',
      configJson: JSON.stringify({
        domain: 'demo.edu',
        customerId: 'C12345',
        classroomIntegration: true,
      }),
      enabled: true,
      integrationStatus: IntegrationStatus.CONNECTED,
      secretsRef: 'vault://secrets/sis/google/dev-tenant',
      ssoEnabled: true,
      domainFilter: ['demo.edu'],
      autoProvisionUsers: true,
      autoProvisionLearners: false, // Teachers only
      defaultRole: 'TEACHER',
      oauthMetadata: {
        scopesGranted: [
          'https://www.googleapis.com/auth/admin.directory.user.readonly',
          'https://www.googleapis.com/auth/classroom.rosters.readonly',
        ],
      },
      lastConnectionCheck: new Date(Date.now() - 30 * 60 * 1000),
      lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      syncSchedule: '0 3 * * *', // 3 AM daily
    },
    {
      id: ONEROSTER_PROVIDER,
      tenantId: DEMO_TENANT_ID,
      providerType: SisProviderType.ONEROSTER_API,
      name: 'OneRoster API (Demo District)',
      configJson: JSON.stringify({
        baseUrl: 'https://sis.demodist.edu/ims/oneroster/v1p1',
        apiVersion: '1.1',
      }),
      enabled: false, // Disabled for demo
      integrationStatus: IntegrationStatus.DISCONNECTED,
      secretsRef: null,
      ssoEnabled: false,
      domainFilter: [],
      autoProvisionUsers: false,
      autoProvisionLearners: false,
      defaultRole: 'TEACHER',
      syncSchedule: null,
    },
  ];

  for (const provider of providers) {
    await prisma.sisProvider.upsert({
      where: { id: provider.id },
      update: {},
      create: provider,
    });
  }
  console.log(`  ✅ Created ${providers.length} SIS providers`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Sync Runs
  // ══════════════════════════════════════════════════════════════════════════

  const syncRuns = [
    {
      id: 'sync_00000000000000000001',
      providerId: CLEVER_PROVIDER,
      status: SyncStatus.SUCCESS,
      startedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 6 * 60 * 60 * 1000 + 5 * 60 * 1000),
      entityCounts: {
        schools: { fetched: 3, created: 0, updated: 1, errors: 0 },
        classes: { fetched: 25, created: 2, updated: 5, errors: 0 },
        teachers: { fetched: 15, created: 1, updated: 3, errors: 0 },
        students: { fetched: 350, created: 12, updated: 45, errors: 2 },
        enrollments: { fetched: 875, created: 30, updated: 15, errors: 0 },
      },
      errorLog: [],
      triggeredBy: 'SCHEDULE',
    },
    {
      id: 'sync_00000000000000000002',
      providerId: CLEVER_PROVIDER,
      status: SyncStatus.PARTIAL,
      startedAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 30 * 60 * 60 * 1000 + 8 * 60 * 1000),
      entityCounts: {
        schools: { fetched: 3, created: 0, updated: 0, errors: 0 },
        classes: { fetched: 25, created: 0, updated: 2, errors: 1 },
        teachers: { fetched: 15, created: 0, updated: 0, errors: 0 },
        students: { fetched: 350, created: 0, updated: 10, errors: 5 },
        enrollments: { fetched: 875, created: 5, updated: 8, errors: 0 },
      },
      errorLog: [
        { entity: 'class', externalId: 'cls_789', error: 'Missing required field: name' },
        { entity: 'student', externalId: 'stu_123', error: 'Invalid grade level: 13' },
        { entity: 'student', externalId: 'stu_456', error: 'Duplicate email: john.doe@demo.edu' },
      ],
      triggeredBy: 'SCHEDULE',
    },
    // Google sync
    {
      id: 'sync_00000000000000000003',
      providerId: GOOGLE_PROVIDER,
      status: SyncStatus.SUCCESS,
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2 * 60 * 1000),
      entityCounts: {
        teachers: { fetched: 12, created: 0, updated: 2, errors: 0 },
        classes: { fetched: 18, created: 1, updated: 3, errors: 0 },
      },
      errorLog: [],
      triggeredBy: 'MANUAL',
      triggeredByUserId: '00000000-0000-0000-1000-000000000001',
    },
  ];

  for (const run of syncRuns) {
    await prisma.sisSyncRun.upsert({
      where: { id: run.id },
      update: {},
      create: run,
    });
  }
  console.log(`  ✅ Created ${syncRuns.length} sync runs`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Field Mappings
  // ══════════════════════════════════════════════════════════════════════════

  const fieldMappings = [
    // Clever student mappings
    {
      id: 'map_00000000000000000001',
      providerId: CLEVER_PROVIDER,
      entityType: SisEntityType.STUDENT,
      sourceField: 'data.name.first',
      targetField: 'firstName',
      transformRule: null,
      isRequired: true,
    },
    {
      id: 'map_00000000000000000002',
      providerId: CLEVER_PROVIDER,
      entityType: SisEntityType.STUDENT,
      sourceField: 'data.name.last',
      targetField: 'lastName',
      transformRule: null,
      isRequired: true,
    },
    {
      id: 'map_00000000000000000003',
      providerId: CLEVER_PROVIDER,
      entityType: SisEntityType.STUDENT,
      sourceField: 'data.grade',
      targetField: 'gradeLevel',
      transformRule: JSON.stringify({
        type: 'lookup',
        mappings: {
          'Kindergarten': 'K',
          '1': '1',
          '2': '2',
          '3': '3',
          '4': '4',
          '5': '5',
        },
      }),
      isRequired: true,
    },
    {
      id: 'map_00000000000000000004',
      providerId: CLEVER_PROVIDER,
      entityType: SisEntityType.STUDENT,
      sourceField: 'data.email',
      targetField: 'email',
      transformRule: JSON.stringify({
        type: 'lowercase',
      }),
      isRequired: false,
    },
    // Google teacher mappings
    {
      id: 'map_00000000000000000010',
      providerId: GOOGLE_PROVIDER,
      entityType: SisEntityType.TEACHER,
      sourceField: 'primaryEmail',
      targetField: 'email',
      transformRule: null,
      isRequired: true,
    },
    {
      id: 'map_00000000000000000011',
      providerId: GOOGLE_PROVIDER,
      entityType: SisEntityType.TEACHER,
      sourceField: 'name.givenName',
      targetField: 'firstName',
      transformRule: null,
      isRequired: true,
    },
    {
      id: 'map_00000000000000000012',
      providerId: GOOGLE_PROVIDER,
      entityType: SisEntityType.TEACHER,
      sourceField: 'name.familyName',
      targetField: 'lastName',
      transformRule: null,
      isRequired: true,
    },
  ];

  for (const mapping of fieldMappings) {
    await prisma.sisFieldMapping.upsert({
      where: { id: mapping.id },
      update: {},
      create: mapping,
    });
  }
  console.log(`  ✅ Created ${fieldMappings.length} field mappings`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create Sample Raw Data (from last sync)
  // ══════════════════════════════════════════════════════════════════════════

  const rawSchools = [
    {
      id: 'raw_sch_00000001',
      providerId: CLEVER_PROVIDER,
      externalId: 'school_riverside_001',
      rawData: {
        id: 'school_riverside_001',
        name: 'Riverside Elementary',
        nces_id: '123456789',
        state_id: 'ST-001',
        low_grade: 'K',
        high_grade: '5',
        address: '123 River Lane',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
      },
      mappedToId: '00000000-0000-0000-0001-000000000001', // Links to tenant-svc school
      lastSyncedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      syncStatus: 'SYNCED',
    },
    {
      id: 'raw_sch_00000002',
      providerId: CLEVER_PROVIDER,
      externalId: 'school_westside_002',
      rawData: {
        id: 'school_westside_002',
        name: 'Westside Academy',
        nces_id: '987654321',
        low_grade: 'K',
        high_grade: '8',
      },
      mappedToId: '00000000-0000-0000-0001-000000000002',
      lastSyncedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      syncStatus: 'SYNCED',
    },
  ];

  for (const school of rawSchools) {
    await prisma.sisRawSchool.upsert({
      where: { id: school.id },
      update: {},
      create: school,
    });
  }
  console.log(`  ✅ Created ${rawSchools.length} raw school records`);

  console.log('');
  console.log('✅ sis-sync-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 3 SIS providers (Clever connected, Google connected, OneRoster disabled)');
  console.log('  - 3 sync runs (2 Clever, 1 Google)');
  console.log('  - 7 field mappings');
  console.log('  - 2 raw school records');
  console.log('');
  console.log('Demonstrates:');
  console.log('  - Multi-provider SIS integration');
  console.log('  - OAuth-based connection management');
  console.log('  - Scheduled and manual sync runs');
  console.log('  - Field mapping with transformations');
  console.log('  - Auto-provisioning configuration');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
