/**
 * AIVO Platform - Profile Service Seed Data (Family Accounts)
 *
 * Creates:
 * - 6 Learner profiles with neurodiversity-aligned preferences
 * - Learning style and sensory profiles
 * - Accommodations based on IEP data
 *
 * Run with: npx prisma db seed
 * Or directly: npx tsx prisma/seed-families.ts
 */

import {
  PrismaClient,
  ProfileOrigin,
} from '../generated/prisma-client/index.js';
import {
  TENANTS,
  LEARNER_PROFILES,
  PARENT_ASSESSMENT_DATA,
} from '@aivo/seed-data';

const prisma = new PrismaClient();

// System user ID for seeding
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('🌱 Seeding profile-svc with family learner profiles...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Learner Profiles
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n📍 Creating learner profiles...');

  const profileConfigs = {
    EMMA_HANSON: {
      summary: 'Emma benefits from sensory activities and responds well to music. She needs full support with picture symbols and AAC devices.',
      learningStyleJson: {
        prefersVisual: true,
        prefersAudio: true,
        prefersText: false,
        prefersKinesthetic: true,
        needsChunking: true,
        benefitsFromRepetition: true,
      },
      sensoryProfileJson: {
        noiseSensitivity: 'HIGH',
        lightSensitivity: 'MEDIUM',
        prefersLowContrast: true,
        prefersWarmColors: true,
        benefitsFromMovementBreaks: true,
        preferredBreakDurationMinutes: 5,
      },
      origin: ProfileOrigin.IMPORTED,
    },
    JAYDEN_OFEM: {
      summary: 'Jayden is academically capable and creative. He benefits from visual schedules, advance notice of transitions, and clear expectations.',
      learningStyleJson: {
        prefersVisual: true,
        prefersAudio: false,
        prefersText: true,
        prefersKinesthetic: false,
        needsChunking: false,
        benefitsFromRepetition: false,
      },
      sensoryProfileJson: {
        noiseSensitivity: 'MEDIUM',
        lightSensitivity: 'LOW',
        prefersLowContrast: false,
        prefersWarmColors: false,
        benefitsFromMovementBreaks: false,
        preferredBreakDurationMinutes: 5,
      },
      origin: ProfileOrigin.IMPORTED,
    },
    ADEBAYO_OLUWOLE: {
      summary: 'Adebayo has strong visual memory and is motivated by special interests (dinosaurs, space). He needs visual supports and transition warnings.',
      learningStyleJson: {
        prefersVisual: true,
        prefersAudio: false,
        prefersText: false,
        prefersKinesthetic: false,
        needsChunking: true,
        benefitsFromRepetition: true,
      },
      sensoryProfileJson: {
        noiseSensitivity: 'HIGH',
        lightSensitivity: 'LOW',
        prefersLowContrast: false,
        prefersWarmColors: false,
        benefitsFromMovementBreaks: true,
        preferredBreakDurationMinutes: 5,
      },
      origin: ProfileOrigin.IMPORTED,
    },
    TYLER_KOTZ: {
      summary: 'Tyler is creative and excels at hands-on learning. He needs text-to-speech support and a quiet testing environment.',
      learningStyleJson: {
        prefersVisual: false,
        prefersAudio: true,
        prefersText: false,
        prefersKinesthetic: true,
        needsChunking: false,
        benefitsFromRepetition: false,
      },
      sensoryProfileJson: {
        noiseSensitivity: 'LOW',
        lightSensitivity: 'LOW',
        prefersLowContrast: false,
        prefersWarmColors: false,
        benefitsFromMovementBreaks: true,
        preferredBreakDurationMinutes: 10,
      },
      origin: ProfileOrigin.IMPORTED,
    },
    SOPHIE_ANDERSON: {
      summary: 'Sophie is bright and creative but needs organizational support. Visual checklists, timers, and movement breaks help her stay on track.',
      learningStyleJson: {
        prefersVisual: true,
        prefersAudio: false,
        prefersText: true,
        prefersKinesthetic: false,
        needsChunking: true,
        benefitsFromRepetition: false,
      },
      sensoryProfileJson: {
        noiseSensitivity: 'MEDIUM',
        lightSensitivity: 'LOW',
        prefersLowContrast: false,
        prefersWarmColors: false,
        benefitsFromMovementBreaks: true,
        preferredBreakDurationMinutes: 5,
      },
      origin: ProfileOrigin.IMPORTED,
    },
    ETHAN_HUGHES: {
      summary: 'Ethan is extremely intelligent in STEM. He needs a quiet environment, advance notice of changes, and clear, direct instructions.',
      learningStyleJson: {
        prefersVisual: true,
        prefersAudio: false,
        prefersText: true,
        prefersKinesthetic: false,
        needsChunking: false,
        benefitsFromRepetition: false,
      },
      sensoryProfileJson: {
        noiseSensitivity: 'HIGH',
        lightSensitivity: 'MEDIUM',
        prefersLowContrast: true,
        prefersWarmColors: false,
        benefitsFromMovementBreaks: false,
        preferredBreakDurationMinutes: 10,
      },
      origin: ProfileOrigin.IMPORTED,
    },
  };

  for (const [key, learner] of Object.entries(LEARNER_PROFILES)) {
    const config = profileConfigs[key as keyof typeof profileConfigs];
    const profileId = `00000000-0000-0000-7000-${learner.id.slice(-12)}`;

    const profile = await prisma.learnerProfile.upsert({
      where: {
        tenantId_learnerId: {
          tenantId: TENANTS.ANOKA_HENNEPIN,
          learnerId: learner.id,
        },
      },
      update: {},
      create: {
        id: profileId,
        tenantId: TENANTS.ANOKA_HENNEPIN,
        learnerId: learner.id,
        summary: config.summary,
        learningStyleJson: config.learningStyleJson,
        sensoryProfileJson: config.sensoryProfileJson,
        origin: config.origin,
        createdByUserId: SYSTEM_USER_ID,
      },
    });

    console.log(`  ✅ Created profile for ${learner.firstName} ${learner.lastName} (${learner.functioningLevel})`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════════

  console.log('');
  console.log('✅ profile-svc family seeding complete!');
  console.log('');
  console.log('Created learner profiles:');
  for (const [key, learner] of Object.entries(LEARNER_PROFILES)) {
    console.log(`  - ${learner.firstName} ${learner.lastName} (Grade ${learner.grade}, ${learner.functioningLevel})`);
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
