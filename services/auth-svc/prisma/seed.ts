/**
 * AIVO Platform - Auth Service Seed Data
 *
 * Creates:
 * - Default roles and permissions
 * - Admin user
 * - Sample teacher and author users
 * - Sample learner users
 */

import { PrismaClient, UserStatus, UserRoleEnum } from '../generated/prisma-client/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Fixed tenant IDs from tenant-svc seed
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000002';

// System service account IDs - used by internal services for automated operations
const SYSTEM_TENANT_ID = '00000000-0000-0000-0000-000000000000'; // Platform-level tenant
const LTI_SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001'; // LTI service account
const CONSENT_SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000002'; // Consent service account
const SCHEDULER_SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000003'; // Scheduler service account

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Seeding auth-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Admin User
  // ══════════════════════════════════════════════════════════════════════════

  const adminPassword = await hashPassword('Admin123!@#');
  const admin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: DEV_TENANT_ID,
        email: 'admin@aivo.dev',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-1000-000000000001',
      tenantId: DEV_TENANT_ID,
      email: 'admin@aivo.dev',
      passwordHash: adminPassword,
      status: UserStatus.ACTIVE,
      roles: {
        create: [{ role: UserRoleEnum.PLATFORM_ADMIN }],
      },
    },
  });

  console.log(`  ✅ Created admin user: ${admin.email}`);

  // ══════════════════════════════════════════════════════════════════════════
  // 1b. Create System Service Accounts
  // These are dedicated service accounts with limited permissions for internal
  // automated operations. They should never be used for interactive login.
  // ══════════════════════════════════════════════════════════════════════════

  // Create system tenant first (for platform-level service accounts)
  await prisma.tenant.upsert({
    where: { id: SYSTEM_TENANT_ID },
    update: {},
    create: {
      id: SYSTEM_TENANT_ID,
      slug: 'system',
      name: 'AIVO System',
      ssoEnabled: false,
      ssoRequired: false,
    },
  });

  console.log('  ✅ Created system tenant');

  // System password (long random string - these accounts never use password auth)
  const systemPassword = await hashPassword('SYSTEM_ACCOUNT_NO_LOGIN_' + Date.now());

  // LTI System Service Account
  // Used by LTI service for creating links before user context is established
  const ltiSystem = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: SYSTEM_TENANT_ID,
        email: 'lti-service@system.aivo.internal',
      },
    },
    update: {},
    create: {
      id: LTI_SYSTEM_USER_ID,
      tenantId: SYSTEM_TENANT_ID,
      email: 'lti-service@system.aivo.internal',
      passwordHash: systemPassword,
      status: UserStatus.ACTIVE,
      roles: {
        create: [{ role: UserRoleEnum.SUPPORT }],
      },
    },
  });

  console.log(`  ✅ Created LTI system service account: ${ltiSystem.email} (${LTI_SYSTEM_USER_ID})`);

  // Consent System Service Account
  // Used by consent service for automated consent renewal notifications
  const consentSystem = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: SYSTEM_TENANT_ID,
        email: 'consent-service@system.aivo.internal',
      },
    },
    update: {},
    create: {
      id: CONSENT_SYSTEM_USER_ID,
      tenantId: SYSTEM_TENANT_ID,
      email: 'consent-service@system.aivo.internal',
      passwordHash: systemPassword,
      status: UserStatus.ACTIVE,
      roles: {
        create: [{ role: UserRoleEnum.SUPPORT }],
      },
    },
  });

  console.log(`  ✅ Created Consent system service account: ${consentSystem.email}`);

  // Scheduler System Service Account
  // Used by scheduled jobs (cleanup, expiration, etc.)
  const schedulerSystem = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: SYSTEM_TENANT_ID,
        email: 'scheduler-service@system.aivo.internal',
      },
    },
    update: {},
    create: {
      id: SCHEDULER_SYSTEM_USER_ID,
      tenantId: SYSTEM_TENANT_ID,
      email: 'scheduler-service@system.aivo.internal',
      passwordHash: systemPassword,
      status: UserStatus.ACTIVE,
      roles: {
        create: [{ role: UserRoleEnum.SUPPORT }],
      },
    },
  });

  console.log(`  ✅ Created Scheduler system service account: ${schedulerSystem.email}`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Author User
  // ══════════════════════════════════════════════════════════════════════════

  const authorPassword = await hashPassword('Author123!@#');
  const author = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: DEV_TENANT_ID,
        email: 'author@aivo.dev',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-1000-000000000002',
      tenantId: DEV_TENANT_ID,
      email: 'author@aivo.dev',
      passwordHash: authorPassword,
      status: UserStatus.ACTIVE,
      roles: {
        create: [{ role: UserRoleEnum.TEACHER }],
      },
    },
  });

  console.log(`  ✅ Created author user: ${author.email}`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Teacher Users
  // ══════════════════════════════════════════════════════════════════════════

  const teacherPassword = await hashPassword('Teacher123!@#');

  const teachers = [
    { id: '00000000-0000-0000-1000-000000000003', email: 'teacher@aivo.dev', name: 'Jane Teacher' },
    {
      id: '00000000-0000-0000-1000-000000000004',
      email: 'mrs.johnson@aivo.dev',
      name: 'Mrs. Johnson',
    },
    { id: '00000000-0000-0000-1000-000000000005', email: 'mr.smith@aivo.dev', name: 'Mr. Smith' },
  ];

  for (const teacher of teachers) {
    const created = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: DEV_TENANT_ID,
          email: teacher.email,
        },
      },
      update: {},
      create: {
        id: teacher.id,
        tenantId: DEV_TENANT_ID,
        email: teacher.email,
        passwordHash: teacherPassword,
        status: UserStatus.ACTIVE,
        roles: {
          create: [{ role: UserRoleEnum.TEACHER }],
        },
      },
    });
    console.log(`  ✅ Created teacher user: ${created.email}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create Therapist User
  // ══════════════════════════════════════════════════════════════════════════

  const therapistPassword = await hashPassword('Therapist123!@#');
  const therapist = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: DEV_TENANT_ID,
        email: 'therapist@aivo.dev',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-1000-000000000006',
      tenantId: DEV_TENANT_ID,
      email: 'therapist@aivo.dev',
      passwordHash: therapistPassword,
      status: UserStatus.ACTIVE,
      roles: {
        create: [{ role: UserRoleEnum.THERAPIST }],
      },
    },
  });

  console.log(`  ✅ Created therapist user: ${therapist.email}`);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Create Parent User
  // ══════════════════════════════════════════════════════════════════════════

  const parentPassword = await hashPassword('Parent123!@#');
  const parent = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: DEV_TENANT_ID,
        email: 'parent@aivo.dev',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-1000-000000000007',
      tenantId: DEV_TENANT_ID,
      email: 'parent@aivo.dev',
      passwordHash: parentPassword,
      status: UserStatus.ACTIVE,
      roles: {
        create: [{ role: UserRoleEnum.PARENT }],
      },
    },
  });

  console.log(`  ✅ Created parent user: ${parent.email}`);

  // ══════════════════════════════════════════════════════════════════════════
  // 6. Create Learner Users
  // ══════════════════════════════════════════════════════════════════════════

  const learnerPassword = await hashPassword('Learner123!@#');

  const learners = [
    { id: '00000000-0000-0000-2000-000000000001', email: 'alex@aivo.dev', name: 'Alex Student' },
    {
      id: '00000000-0000-0000-2000-000000000002',
      email: 'jordan@aivo.dev',
      name: 'Jordan Learner',
    },
    { id: '00000000-0000-0000-2000-000000000003', email: 'sam@aivo.dev', name: 'Sam Scholar' },
    { id: '00000000-0000-0000-2000-000000000004', email: 'taylor@aivo.dev', name: 'Taylor Pupil' },
    {
      id: '00000000-0000-0000-2000-000000000005',
      email: 'morgan@aivo.dev',
      name: 'Morgan Apprentice',
    },
  ];

  for (const learner of learners) {
    const created = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: DEV_TENANT_ID,
          email: learner.email,
        },
      },
      update: {},
      create: {
        id: learner.id,
        tenantId: DEV_TENANT_ID,
        email: learner.email,
        passwordHash: learnerPassword,
        status: UserStatus.ACTIVE,
        roles: {
          create: [{ role: UserRoleEnum.LEARNER }],
        },
      },
    });
    console.log(`  ✅ Created learner user: ${created.email}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 7. Create Demo Tenant Users
  // ══════════════════════════════════════════════════════════════════════════

  const demoAdmin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: DEMO_TENANT_ID,
        email: 'admin@demo.aivo.dev',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-3000-000000000001',
      tenantId: DEMO_TENANT_ID,
      email: 'admin@demo.aivo.dev',
      passwordHash: adminPassword,
      status: UserStatus.ACTIVE,
      roles: {
        create: [{ role: UserRoleEnum.DISTRICT_ADMIN }],
      },
    },
  });

  console.log(`  ✅ Created demo admin user: ${demoAdmin.email}`);

  console.log('');
  console.log('✅ auth-svc seeding complete!');
  console.log('');
  console.log('Created users:');
  console.log('  - admin@aivo.dev / Admin123!@# (PLATFORM_ADMIN)');
  console.log('  - author@aivo.dev / Author123!@# (TEACHER)');
  console.log('  - teacher@aivo.dev / Teacher123!@# (TEACHER)');
  console.log('  - therapist@aivo.dev / Therapist123!@# (THERAPIST)');
  console.log('  - parent@aivo.dev / Parent123!@# (PARENT)');
  console.log('  - alex@aivo.dev / Learner123!@# (LEARNER)');
  console.log('  - jordan@aivo.dev / Learner123!@# (LEARNER)');
  console.log('  - sam@aivo.dev / Learner123!@# (LEARNER)');
  console.log('  - taylor@aivo.dev / Learner123!@# (LEARNER)');
  console.log('  - morgan@aivo.dev / Learner123!@# (LEARNER)');
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
