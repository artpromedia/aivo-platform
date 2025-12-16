/**
 * AIVO Platform - Tenant Service Seed Data
 *
 * Creates:
 * - Development tenant for local development
 * - Demo tenant for showcasing features
 * - Sample schools and classrooms
 */

import { PrismaClient, TenantType, TenantStatus } from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding tenant-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Development Tenant
  // ══════════════════════════════════════════════════════════════════════════

  const devTenant = await prisma.tenant.upsert({
    where: { primaryDomain: 'dev.aivo.local' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      type: TenantType.CONSUMER,
      name: 'AIVO Development',
      primaryDomain: 'dev.aivo.local',
      subdomain: 'dev',
      region: 'us-east-1',
      status: TenantStatus.ACTIVE,
      isActive: true,
      settingsJson: {
        features: ['ai_tutor', 'gamification', 'analytics', 'homework_helper', 'focus_tracking'],
        branding: {
          primaryColor: '#6366f1',
          logo: null,
          appName: 'AIVO Dev',
        },
        limits: {
          maxUsers: 1000,
          maxContent: 5000,
          maxStorageGb: 100,
        },
      },
      logoUrl: null,
      primaryColor: '#6366f1',
    },
  });

  console.log(`  ✅ Created development tenant: ${devTenant.name}`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Demo Tenant
  // ══════════════════════════════════════════════════════════════════════════

  const demoTenant = await prisma.tenant.upsert({
    where: { primaryDomain: 'demo.aivo.local' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      type: TenantType.DISTRICT,
      name: 'AIVO Demo School District',
      primaryDomain: 'demo.aivo.local',
      subdomain: 'demo',
      region: 'us-east-1',
      status: TenantStatus.ACTIVE,
      isActive: true,
      settingsJson: {
        features: ['ai_tutor', 'gamification', 'analytics'],
        branding: {
          primaryColor: '#10b981',
          logo: null,
          appName: 'Demo District Learning',
        },
        limits: {
          maxUsers: 500,
          maxContent: 2000,
          maxStorageGb: 50,
        },
      },
      logoUrl: null,
      primaryColor: '#10b981',
    },
  });

  console.log(`  ✅ Created demo tenant: ${demoTenant.name}`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Sample Schools
  // ══════════════════════════════════════════════════════════════════════════

  const schools = [
    {
      id: '00000000-0000-0000-0001-000000000001',
      tenantId: devTenant.id,
      name: 'Springfield Elementary',
      address: '742 Evergreen Terrace, Springfield, IL 62701',
      externalId: 'SPR-ELEM-001',
    },
    {
      id: '00000000-0000-0000-0001-000000000002',
      tenantId: devTenant.id,
      name: 'Springfield Middle School',
      address: '123 Main Street, Springfield, IL 62702',
      externalId: 'SPR-MID-001',
    },
    {
      id: '00000000-0000-0000-0001-000000000003',
      tenantId: demoTenant.id,
      name: 'Demo Elementary School',
      address: '456 Demo Avenue, Demo City, DC 10001',
      externalId: 'DEMO-ELEM-001',
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
  // 4. Create Sample Classrooms
  // ══════════════════════════════════════════════════════════════════════════

  const classrooms = [
    // Springfield Elementary classrooms
    {
      id: '00000000-0000-0000-0002-000000000001',
      schoolId: schools[0].id,
      name: "Mrs. Johnson's 3rd Grade",
      grade: '3',
    },
    {
      id: '00000000-0000-0000-0002-000000000002',
      schoolId: schools[0].id,
      name: "Mr. Smith's 4th Grade",
      grade: '4',
    },
    {
      id: '00000000-0000-0000-0002-000000000003',
      schoolId: schools[0].id,
      name: "Ms. Davis's 5th Grade",
      grade: '5',
    },
    // Springfield Middle School classrooms
    {
      id: '00000000-0000-0000-0002-000000000004',
      schoolId: schools[1].id,
      name: 'Math 6A',
      grade: '6',
    },
    {
      id: '00000000-0000-0000-0002-000000000005',
      schoolId: schools[1].id,
      name: 'Science 7B',
      grade: '7',
    },
    // Demo school classroom
    {
      id: '00000000-0000-0000-0002-000000000006',
      schoolId: schools[2].id,
      name: 'Demo Classroom',
      grade: '4',
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
  console.log('✅ tenant-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log(`  - 2 tenants (dev, demo)`);
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
