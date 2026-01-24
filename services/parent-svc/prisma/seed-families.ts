/**
 * AIVO Platform - Parent Service Seed Data (Family Accounts)
 *
 * Creates:
 * - 6 Parent accounts with full profiles
 * - Parent-student links
 * - Consent records (COPPA compliance)
 *
 * Run with: npx prisma db seed
 * Or directly: npx tsx prisma/seed-families.ts
 */

import { PrismaClient } from '../generated/prisma-client/index.js';
import bcrypt from 'bcryptjs';
import {
  PARENTS,
  LEARNERS,
  PARENT_PROFILES,
  LEARNER_PROFILES,
  TEST_PASSWORD,
} from '@aivo/seed-data';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Seeding parent-svc with family accounts...');

  const passwordHash = await hashPassword(TEST_PASSWORD);

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Parent Accounts
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating parent accounts...');

  for (const [key, parent] of Object.entries(PARENT_PROFILES)) {
    const created = await prisma.parent.upsert({
      where: { id: parent.id },
      update: {},
      create: {
        id: parent.id,
        email: parent.email,
        passwordHash,
        givenName: parent.givenName,
        familyName: parent.familyName,
        phone: parent.phone,
        language: 'en',
        timezone: 'America/Chicago',
        status: 'active',
        emailVerified: true,
        digestFrequency: 'weekly',
        notificationPreferences: {
          email: true,
          push: true,
          sms: false,
          progressUpdates: true,
          homeworkReminders: true,
          iepMeetings: true,
          messages: true,
        },
        lastLoginAt: new Date(),
      },
    });
    console.log(`  ✅ Created parent: ${created.givenName} ${created.familyName} (${created.email})`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Student Profiles in parent-svc (for linking)
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating student profiles for linking...');

  for (const [key, learner] of Object.entries(LEARNER_PROFILES)) {
    const created = await prisma.profile.upsert({
      where: { id: learner.id },
      update: {},
      create: {
        id: learner.id,
        email: `${learner.firstName.toLowerCase()}.${learner.lastName.toLowerCase()}@learner.aivo.dev`,
        givenName: learner.firstName,
        familyName: learner.lastName,
        grade: learner.grade,
        dateOfBirth: new Date(learner.dateOfBirth),
        baselineStatus: 'completed',
        status: 'active',
      },
    });
    console.log(`  ✅ Created profile: ${created.givenName} ${created.familyName} (Grade ${created.grade})`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Parent-Student Links
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating parent-student links...');

  for (const [key, parent] of Object.entries(PARENT_PROFILES)) {
    // Find the learner whose parentId matches this parent's id
    const learner = Object.values(LEARNER_PROFILES).find((l) => l.parentId === parent.id);
    
    if (!learner) {
      console.log(`  ⚠️ No learner found for parent: ${parent.givenName} ${parent.familyName}`);
      continue;
    }

    const linkId = `link-${parent.id.slice(-12)}-${learner.id.slice(-12)}`;

    const link = await prisma.parentStudentLink.upsert({
      where: { id: linkId },
      update: {},
      create: {
        id: linkId,
        parentId: parent.id,
        studentId: learner.id,
        relationship: parent.relationship,
        isPrimary: true,
        status: 'active',
        consentStatus: 'granted',
        consentGrantedAt: new Date(),
        permissions: {
          viewProgress: true,
          viewGrades: true,
          viewAttendance: true,
          viewIep: true,
          messageTeachers: true,
          modifySettings: true,
        },
      },
    });
    console.log(`  ✅ Linked ${parent.givenName} ${parent.familyName} → ${learner.firstName} ${learner.lastName}`);

    // ══════════════════════════════════════════════════════════════════════════
    // 4. Create Consent Records (COPPA compliance)
    // ══════════════════════════════════════════════════════════════════════════

    const consentTypes = ['coppa', 'data_collection', 'communication'];

    for (const consentType of consentTypes) {
      await prisma.consentRecord.upsert({
        where: {
          id: `consent-${consentType}-${parent.id.slice(-8)}`,
        },
        update: {},
        create: {
          id: `consent-${consentType}-${parent.id.slice(-8)}`,
          parentId: parent.id,
          studentId: learner.id,
          linkId: link.id,
          consentType,
          granted: true,
          consentVersion: '1.0',
          grantedAt: new Date(),
        },
      });
    }
    console.log(`    ✅ Created consent records for ${learner.firstName}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════════

  console.log('');
  console.log('✅ parent-svc family seeding complete!');
  console.log('');
  console.log('Created:');
  console.log(`  - 6 Parent accounts`);
  console.log(`  - 6 Student profiles`);
  console.log(`  - 6 Parent-student links`);
  console.log(`  - 18 Consent records`);
  console.log('');
  console.log('Parent-Child Relationships:');
  for (const [key, parent] of Object.entries(PARENT_PROFILES)) {
    const learner = Object.values(LEARNER_PROFILES).find((l) => l.parentId === parent.id);
    if (learner) {
      console.log(`  - ${parent.givenName} ${parent.familyName} (${parent.relationship}) → ${learner.firstName} ${learner.lastName}`);
    }
  }
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
