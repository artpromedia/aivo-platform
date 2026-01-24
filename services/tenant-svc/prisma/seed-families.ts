/**
 * AIVO Platform - Tenant Service Seed Data (Family Accounts)
 *
 * Creates:
 * - Anoka-Hennepin School District tenant
 * - Schools within the district
 * - Classrooms for learners
 *
 * Run with: npx prisma db seed
 * Or directly: npx tsx prisma/seed-families.ts
 */

import { PrismaClient, TenantType, TenantStatus } from '../generated/prisma-client/index.js';
import { TENANTS, SCHOOLS } from '@aivo/seed-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding tenant-svc with Anoka-Hennepin School District...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Anoka-Hennepin School District Tenant
  // ══════════════════════════════════════════════════════════════════════════

  const anokaHennepin = await prisma.tenant.upsert({
    where: { id: TENANTS.ANOKA_HENNEPIN },
    update: {},
    create: {
      id: TENANTS.ANOKA_HENNEPIN,
      type: TenantType.DISTRICT,
      name: 'Anoka-Hennepin School District',
      primaryDomain: 'anoka.k12.mn.us',
      subdomain: 'anoka',
      region: 'us-central-1',
      status: TenantStatus.ACTIVE,
      isActive: true,
      settingsJson: {
        features: ['ai_tutor', 'gamification', 'analytics', 'iep_integration', 'parent_portal', 'homework_helper'],
        branding: {
          primaryColor: '#003366',
          secondaryColor: '#FFD700',
          logo: null,
          appName: 'Anoka-Hennepin Learning',
        },
        limits: {
          maxUsers: 50000,
          maxContent: 100000,
          maxStorageGb: 1000,
        },
        districtInfo: {
          state: 'MN',
          county: 'Anoka',
          ncesId: '2700870',
        },
      },
      logoUrl: null,
      primaryColor: '#003366',
    },
  });

  console.log(`  ✅ Created district tenant: ${anokaHennepin.name}`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Schools in Anoka-Hennepin District
  // ══════════════════════════════════════════════════════════════════════════

  const schools = [
    {
      id: SCHOOLS.LINCOLN_ELEMENTARY,
      tenantId: anokaHennepin.id,
      name: 'Lincoln Elementary School',
      address: '1234 Lincoln Avenue, Coon Rapids, MN 55433',
      externalId: 'AH-LINCOLN-001',
      city: 'Coon Rapids',
      stateCode: 'MN',
      zipCode: '55433',
    },
    {
      id: SCHOOLS.COON_RAPIDS_MIDDLE,
      tenantId: anokaHennepin.id,
      name: 'Coon Rapids Middle School',
      address: '2001 Coon Rapids Boulevard, Coon Rapids, MN 55433',
      externalId: 'AH-CRMS-001',
      city: 'Coon Rapids',
      stateCode: 'MN',
      zipCode: '55433',
    },
    {
      id: SCHOOLS.ANOKA_MIDDLE,
      tenantId: anokaHennepin.id,
      name: 'Anoka Middle School for the Arts',
      address: '3500 7th Avenue, Anoka, MN 55303',
      externalId: 'AH-AMSA-001',
      city: 'Anoka',
      stateCode: 'MN',
      zipCode: '55303',
    },
    {
      id: SCHOOLS.CHAMPLIN_PARK_HIGH,
      tenantId: anokaHennepin.id,
      name: 'Champlin Park High School',
      address: '6025 109th Avenue N, Champlin, MN 55316',
      externalId: 'AH-CPHS-001',
      city: 'Champlin',
      stateCode: 'MN',
      zipCode: '55316',
    },
  ];

  for (const school of schools) {
    const created = await prisma.school.upsert({
      where: { id: school.id },
      update: {},
      create: school,
    });
    console.log(`  ✅ Created school: ${created.name}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Classrooms
  // ══════════════════════════════════════════════════════════════════════════

  const classrooms = [
    // Lincoln Elementary classrooms
    {
      id: '00000000-0000-0000-0002-000000000101',
      schoolId: SCHOOLS.LINCOLN_ELEMENTARY,
      name: "Mrs. Martinez's SpEd K-2",
      grade: 'K-2',
    },
    {
      id: '00000000-0000-0000-0002-000000000102',
      schoolId: SCHOOLS.LINCOLN_ELEMENTARY,
      name: "Mr. Chen's SpEd 3-5",
      grade: '3-5',
    },
    {
      id: '00000000-0000-0000-0002-000000000103',
      schoolId: SCHOOLS.LINCOLN_ELEMENTARY,
      name: "Mr. Washington's 3rd Grade",
      grade: '3',
    },
    {
      id: '00000000-0000-0000-0002-000000000104',
      schoolId: SCHOOLS.LINCOLN_ELEMENTARY,
      name: '4th Grade Homeroom',
      grade: '4',
    },
    // Coon Rapids Middle School
    {
      id: '00000000-0000-0000-0002-000000000201',
      schoolId: SCHOOLS.COON_RAPIDS_MIDDLE,
      name: "Ms. Thompson's SpEd 6-8",
      grade: '6-8',
    },
    {
      id: '00000000-0000-0000-0002-000000000202',
      schoolId: SCHOOLS.COON_RAPIDS_MIDDLE,
      name: '6th Grade Homeroom A',
      grade: '6',
    },
    // Anoka Middle School
    {
      id: '00000000-0000-0000-0002-000000000301',
      schoolId: SCHOOLS.ANOKA_MIDDLE,
      name: 'SpEd Resource Room',
      grade: '6-8',
    },
    {
      id: '00000000-0000-0000-0002-000000000302',
      schoolId: SCHOOLS.ANOKA_MIDDLE,
      name: '7th Grade Homeroom B',
      grade: '7',
    },
  ];

  for (const classroom of classrooms) {
    const created = await prisma.classroom.upsert({
      where: { id: classroom.id },
      update: {},
      create: classroom,
    });
    console.log(`  ✅ Created classroom: ${created.name}`);
  }

  console.log('');
  console.log('✅ tenant-svc family seeding complete!');
  console.log('');
  console.log('Created:');
  console.log(`  - 1 district: Anoka-Hennepin School District`);
  console.log(`  - ${schools.length} schools`);
  console.log(`  - ${classrooms.length} classrooms`);
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
