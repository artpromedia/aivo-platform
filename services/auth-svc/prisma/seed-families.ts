/**
 * AIVO Platform - Auth Service Seed Data (Family Accounts)
 *
 * Creates:
 * - 6 Parent user accounts (Hanson, Ofem, Oluwole, Kotz, Anderson, Hughes)
 * - 6 Learner user accounts
 * - 6 Teacher user accounts
 * - 1 District admin account
 *
 * Run with: npx prisma db seed
 * Or directly: npx tsx prisma/seed-families.ts
 */

import { PrismaClient, UserStatus, UserRoleEnum } from '../generated/prisma-client/index.js';
import bcrypt from 'bcryptjs';
import {
  TENANTS,
  PARENTS,
  LEARNERS,
  TEACHERS,
  DISTRICT_ADMIN,
  PARENT_PROFILES,
  LEARNER_PROFILES,
  TEACHER_PROFILES,
  TEST_PASSWORD,
} from '@aivo/seed-data';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Seeding auth-svc with family accounts...');

  const passwordHash = await hashPassword(TEST_PASSWORD);

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Parent Users
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating parent accounts...');

  for (const [key, parent] of Object.entries(PARENT_PROFILES)) {
    const user = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: TENANTS.ANOKA_HENNEPIN,
          email: parent.email,
        },
      },
      update: {},
      create: {
        id: parent.id,
        tenantId: TENANTS.ANOKA_HENNEPIN,
        email: parent.email,
        passwordHash,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        roles: {
          create: [{ role: UserRoleEnum.PARENT }],
        },
      },
    });
    console.log(`  ✅ Created parent: ${user.email} (${parent.givenName} ${parent.familyName})`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Learner Users
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating learner accounts...');

  for (const [key, learner] of Object.entries(LEARNER_PROFILES)) {
    // Create email from learner name
    const email = `${learner.firstName.toLowerCase()}.${learner.lastName.toLowerCase()}@learner.aivo.dev`;

    const user = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: TENANTS.ANOKA_HENNEPIN,
          email,
        },
      },
      update: {},
      create: {
        id: learner.id,
        tenantId: TENANTS.ANOKA_HENNEPIN,
        email,
        passwordHash,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        roles: {
          create: [{ role: UserRoleEnum.LEARNER }],
        },
      },
    });
    console.log(`  ✅ Created learner: ${user.email} (${learner.firstName} ${learner.lastName} - Grade ${learner.grade}, ${learner.functioningLevel})`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Teacher Users
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating teacher accounts...');

  for (const [key, teacher] of Object.entries(TEACHER_PROFILES)) {
    const user = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: TENANTS.ANOKA_HENNEPIN,
          email: teacher.email,
        },
      },
      update: {},
      create: {
        id: teacher.id,
        tenantId: TENANTS.ANOKA_HENNEPIN,
        email: teacher.email,
        passwordHash,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        roles: {
          create: [{ role: UserRoleEnum.TEACHER }],
        },
      },
    });
    console.log(`  ✅ Created teacher: ${user.email} (${teacher.givenName} ${teacher.familyName} - ${teacher.role})`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create District Admin
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating district admin account...');

  const districtAdmin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: TENANTS.ANOKA_HENNEPIN,
        email: DISTRICT_ADMIN.email,
      },
    },
    update: {},
    create: {
      id: DISTRICT_ADMIN.id,
      tenantId: TENANTS.ANOKA_HENNEPIN,
      email: DISTRICT_ADMIN.email,
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      roles: {
        create: [{ role: UserRoleEnum.DISTRICT_ADMIN }],
      },
    },
  });
  console.log(`  ✅ Created district admin: ${districtAdmin.email}`);

  // ══════════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════════

  console.log('');
  console.log('✅ auth-svc family seeding complete!');
  console.log('');
  console.log('Created accounts:');
  console.log('');
  console.log('PARENTS:');
  for (const [key, parent] of Object.entries(PARENT_PROFILES)) {
    const learner = Object.values(LEARNER_PROFILES).find((l) => l.id === parent.learnerId);
    console.log(`  - ${parent.email} / ${TEST_PASSWORD} (Parent of ${learner?.firstName})`);
  }
  console.log('');
  console.log('LEARNERS:');
  for (const [key, learner] of Object.entries(LEARNER_PROFILES)) {
    const email = `${learner.firstName.toLowerCase()}.${learner.lastName.toLowerCase()}@learner.aivo.dev`;
    console.log(`  - ${email} / ${TEST_PASSWORD} (Grade ${learner.grade}, ${learner.functioningLevel})`);
  }
  console.log('');
  console.log('TEACHERS:');
  for (const [key, teacher] of Object.entries(TEACHER_PROFILES)) {
    console.log(`  - ${teacher.email} / ${TEST_PASSWORD} (${teacher.role})`);
  }
  console.log('');
  console.log('ADMIN:');
  console.log(`  - ${DISTRICT_ADMIN.email} / ${TEST_PASSWORD} (District Administrator)`);
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
