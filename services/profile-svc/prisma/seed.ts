/**
 * AIVO Platform - Profile Service Seed Data
 *
 * Creates:
 * - Learner profiles with neurodiversity-aligned preferences
 * - Sample accommodations
 * - Sensory and learning style preferences
 */

import {
  PrismaClient,
  ProfileOrigin,
  FontPreference,
  TextSizePreference,
  CheckFrequency,
} from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Learner IDs from auth-svc
const LEARNER_IDS = [
  '00000000-0000-0000-2000-000000000001', // alex
  '00000000-0000-0000-2000-000000000002', // jordan
  '00000000-0000-0000-2000-000000000003', // sam
  '00000000-0000-0000-2000-000000000004', // taylor
  '00000000-0000-0000-2000-000000000005', // morgan
];

async function main() {
  console.log('🌱 Seeding profile-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Learner Profiles
  // ══════════════════════════════════════════════════════════════════════════

  const profiles = [
    {
      id: '00000000-0000-0000-7000-000000000001',
      learnerId: LEARNER_IDS[0], // alex
      summary:
        'Alex benefits from visual supports and hands-on activities. Works best with clear, step-by-step instructions.',
      learningStyleJson: {
        prefersVisual: true,
        prefersAudio: false,
        prefersText: false,
        prefersKinesthetic: true,
        needsChunking: true,
        benefitsFromRepetition: false,
      },
      sensoryProfileJson: {
        noiseSensitivity: 'LOW',
        lightSensitivity: 'LOW',
        prefersLowContrast: false,
        prefersWarmColors: false,
        benefitsFromMovementBreaks: true,
        preferredBreakDurationMinutes: 5,
      },
      fontPreference: FontPreference.SYSTEM_DEFAULT,
      textSizePreference: TextSizePreference.MEDIUM,
      checkFrequency: CheckFrequency.MEDIUM,
      origin: ProfileOrigin.PARENT_REPORTED,
    },
    {
      id: '00000000-0000-0000-7000-000000000002',
      learnerId: LEARNER_IDS[1], // jordan
      summary:
        'Jordan is just getting started. Profile will be refined based on learning patterns.',
      learningStyleJson: {
        prefersVisual: true,
        prefersAudio: true,
        prefersText: false,
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
        preferredBreakDurationMinutes: 3,
      },
      fontPreference: FontPreference.SYSTEM_DEFAULT,
      textSizePreference: TextSizePreference.MEDIUM,
      checkFrequency: CheckFrequency.MEDIUM,
      origin: ProfileOrigin.SYSTEM_INFERRED,
    },
    {
      id: '00000000-0000-0000-7000-000000000003',
      learnerId: LEARNER_IDS[2], // sam
      summary:
        'Sam benefits from audio content and read-aloud support. Prefers longer, uninterrupted work periods.',
      learningStyleJson: {
        prefersVisual: false,
        prefersAudio: true,
        prefersText: true,
        prefersKinesthetic: false,
        needsChunking: false,
        benefitsFromRepetition: true,
      },
      sensoryProfileJson: {
        noiseSensitivity: 'HIGH',
        lightSensitivity: 'MEDIUM',
        prefersLowContrast: true,
        prefersWarmColors: true,
        benefitsFromMovementBreaks: false,
        preferredBreakDurationMinutes: 10,
      },
      fontPreference: FontPreference.SANS_SERIF,
      textSizePreference: TextSizePreference.LARGE,
      checkFrequency: CheckFrequency.LOW,
      origin: ProfileOrigin.JOINT,
    },
    {
      id: '00000000-0000-0000-7000-000000000004',
      learnerId: LEARNER_IDS[3], // taylor
      summary:
        'Taylor benefits from dyslexia-friendly fonts and reduced visual clutter. Prefers minimal distractions.',
      learningStyleJson: {
        prefersVisual: true,
        prefersAudio: true,
        prefersText: false,
        prefersKinesthetic: false,
        needsChunking: true,
        benefitsFromRepetition: true,
      },
      sensoryProfileJson: {
        noiseSensitivity: 'HIGH',
        lightSensitivity: 'HIGH',
        prefersLowContrast: true,
        prefersWarmColors: true,
        benefitsFromMovementBreaks: true,
        preferredBreakDurationMinutes: 5,
      },
      fontPreference: FontPreference.DYSLEXIA_FRIENDLY,
      textSizePreference: TextSizePreference.EXTRA_LARGE,
      checkFrequency: CheckFrequency.HIGH,
      origin: ProfileOrigin.IMPORTED,
    },
    {
      id: '00000000-0000-0000-7000-000000000005',
      learnerId: LEARNER_IDS[4], // morgan
      summary: 'Morgan is a new learner. Profile pending initial assessment.',
      learningStyleJson: {},
      sensoryProfileJson: {},
      fontPreference: FontPreference.SYSTEM_DEFAULT,
      textSizePreference: TextSizePreference.MEDIUM,
      checkFrequency: CheckFrequency.MEDIUM,
      origin: ProfileOrigin.SYSTEM_INFERRED,
    },
  ];

  for (const profile of profiles) {
    await prisma.learnerProfile.upsert({
      where: { id: profile.id },
      update: {},
      create: {
        ...profile,
        tenantId: DEV_TENANT_ID,
        profileVersion: 1,
      },
    });
    console.log(`  ✅ Created profile for learner: ${profile.learnerId.slice(-1)}`);
  }

  console.log('');
  console.log('✅ profile-svc seeding complete!');
  console.log('');
  console.log(`Created ${profiles.length} learner profiles with:`);
  console.log('  - Learning style preferences');
  console.log('  - Sensory profiles');
  console.log('  - Accessibility settings');
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
