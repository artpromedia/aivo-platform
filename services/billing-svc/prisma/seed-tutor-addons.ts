/**
 * Tutor Add-on Plan Seeds
 *
 * Seeds the billing database with tutor add-on plans
 * that parents can purchase to enable AI tutor features.
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

const TUTOR_ADDON_PLANS = [
  {
    id: 'PLAN_ADDON_TUTOR_MATH',
    sku: 'ADDON_TUTOR_MATH',
    planType: 'ADDON',
    name: 'AI Math Tutor - Nova',
    description: 'Unlock Nova, your personal AI math tutor who makes math feel like a space adventure.',
    unitPriceCents: 499,
    currency: 'USD',
    interval: 'MONTHLY',
    trialDays: 7,
    isActive: true,
    metadataJson: {
      tutorPersona: 'nova-math',
      subject: 'MATH',
      features: ['unlimited_sessions', 'voice_responses', 'progress_tracking'],
      parentCategory: 'ai_tutor',
    },
  },
  {
    id: 'PLAN_ADDON_TUTOR_ELA',
    sku: 'ADDON_TUTOR_ELA',
    planType: 'ADDON',
    name: 'AI ELA Tutor - Sage',
    description: 'Unlock Sage, your personal AI reading and writing tutor who brings stories to life.',
    unitPriceCents: 499,
    currency: 'USD',
    interval: 'MONTHLY',
    trialDays: 7,
    isActive: true,
    metadataJson: {
      tutorPersona: 'sage-ela',
      subject: 'ELA',
      features: ['unlimited_sessions', 'voice_responses', 'progress_tracking'],
      parentCategory: 'ai_tutor',
    },
  },
  {
    id: 'PLAN_ADDON_TUTOR_SCIENCE',
    sku: 'ADDON_TUTOR_SCIENCE',
    planType: 'ADDON',
    name: 'AI Science Tutor - Spark',
    description: 'Unlock Spark, your personal AI science tutor who turns learning into experiments.',
    unitPriceCents: 499,
    currency: 'USD',
    interval: 'MONTHLY',
    trialDays: 7,
    isActive: true,
    metadataJson: {
      tutorPersona: 'spark-science',
      subject: 'SCIENCE',
      features: ['unlimited_sessions', 'voice_responses', 'progress_tracking'],
      parentCategory: 'ai_tutor',
    },
  },
  {
    id: 'PLAN_ADDON_TUTOR_HISTORY',
    sku: 'ADDON_TUTOR_HISTORY',
    planType: 'ADDON',
    name: 'AI History Tutor - Chrono',
    description: 'Unlock Chrono, your personal AI history tutor who brings the past to life.',
    unitPriceCents: 499,
    currency: 'USD',
    interval: 'MONTHLY',
    trialDays: 7,
    isActive: true,
    metadataJson: {
      tutorPersona: 'chrono-history',
      subject: 'HISTORY',
      features: ['unlimited_sessions', 'voice_responses', 'progress_tracking'],
      parentCategory: 'ai_tutor',
    },
  },
  {
    id: 'PLAN_ADDON_TUTOR_CODING',
    sku: 'ADDON_TUTOR_CODING',
    planType: 'ADDON',
    name: 'AI Coding Tutor - Pixel',
    description: 'Unlock Pixel, your personal AI coding tutor who makes programming a game.',
    unitPriceCents: 499,
    currency: 'USD',
    interval: 'MONTHLY',
    trialDays: 7,
    isActive: true,
    metadataJson: {
      tutorPersona: 'pixel-coding',
      subject: 'CODING',
      features: ['unlimited_sessions', 'voice_responses', 'progress_tracking'],
      parentCategory: 'ai_tutor',
    },
  },
  {
    id: 'PLAN_ADDON_TUTOR_BUNDLE',
    sku: 'ADDON_TUTOR_BUNDLE',
    planType: 'ADDON',
    name: 'AI Tutor Bundle - All Subjects',
    description: 'Unlock ALL 5 AI tutors at a discounted price. Math, ELA, Science, History, and Coding!',
    unitPriceCents: 1499,
    currency: 'USD',
    interval: 'MONTHLY',
    trialDays: 7,
    isActive: true,
    metadataJson: {
      tutorPersonas: ['nova-math', 'sage-ela', 'spark-science', 'chrono-history', 'pixel-coding'],
      subjects: ['MATH', 'ELA', 'SCIENCE', 'HISTORY', 'CODING'],
      features: ['unlimited_sessions', 'voice_responses', 'progress_tracking', 'priority_support'],
      parentCategory: 'ai_tutor',
      isBundle: true,
    },
  },
];

export async function seedTutorAddons() {
  console.log('Seeding tutor add-on plans...');

  for (const plan of TUTOR_ADDON_PLANS) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        name: plan.name,
        description: plan.description,
        unitPriceCents: plan.unitPriceCents,
        metadataJson: plan.metadataJson,
      },
      create: plan,
    });
  }

  console.log(`  Created ${TUTOR_ADDON_PLANS.length} tutor add-on plans`);
}

// Allow running directly
if (process.argv[1]?.includes('seed-tutor-addons')) {
  seedTutorAddons()
    .then(() => {
      console.log('Tutor add-on seeding complete!');
      process.exit(0);
    })
    .catch((e) => {
      console.error('Seeding failed:', e);
      process.exit(1);
    });
}
