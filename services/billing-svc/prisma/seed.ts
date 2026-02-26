/**
 * AIVO Platform - Billing Service Seed Data
 *
 * Creates:
 * - Plans (parent base, add-ons, district)
 * - Billing accounts
 * - Sample subscriptions
 */

import {
  PrismaClient,
  BillingAccountType,
  PlanType,
  BillingPeriod,
  PaymentProvider,
  SubscriptionStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000002';
const PARENT_USER_ID = '00000000-0000-0000-1000-000000000005';

// Billing accounts
const PARENT_BILLING_ACCOUNT = '00000000-0000-0000-bb00-000000000001';
const DISTRICT_BILLING_ACCOUNT = '00000000-0000-0000-bb00-000000000002';

// Plans
const PLAN_PARENT_BASE_MONTHLY = '00000000-0000-0000-bb10-000000000001';
const PLAN_PARENT_BASE_YEARLY = '00000000-0000-0000-bb10-000000000002';
const PLAN_ADDON_SEL = '00000000-0000-0000-bb10-000000000010';
const PLAN_ADDON_SPEECH = '00000000-0000-0000-bb10-000000000011';
const PLAN_ADDON_SCIENCE = '00000000-0000-0000-bb10-000000000012';
const PLAN_DISTRICT_BASE = '00000000-0000-0000-bb10-000000000020';
const PLAN_DISTRICT_SEL = '00000000-0000-0000-bb10-000000000021';

// Tutor Add-on Plans
const PLAN_ADDON_TUTOR_MATH = '00000000-0000-0000-bb10-000000000030';
const PLAN_ADDON_TUTOR_ELA = '00000000-0000-0000-bb10-000000000031';
const PLAN_ADDON_TUTOR_SCIENCE = '00000000-0000-0000-bb10-000000000032';
const PLAN_ADDON_TUTOR_HISTORY = '00000000-0000-0000-bb10-000000000033';
const PLAN_ADDON_TUTOR_CODING = '00000000-0000-0000-bb10-000000000034';
const PLAN_ADDON_TUTOR_BUNDLE = '00000000-0000-0000-bb10-000000000035';

async function main() {
  console.log('🌱 Seeding billing-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Plans
  // ══════════════════════════════════════════════════════════════════════════

  const plans = [
    // Parent Plans
    {
      id: PLAN_PARENT_BASE_MONTHLY,
      sku: 'PARENT_BASE_MONTHLY',
      planType: PlanType.PARENT_BASE,
      name: 'AIVO Family - Monthly',
      description: 'Complete access to ELA and Math with up to 5 learners',
      unitPriceCents: 1999, // $19.99/month
      billingPeriod: BillingPeriod.MONTHLY,
      isActive: true,
      trialDays: 14,
      metadataJson: {
        modules: ['ELA', 'MATH'],
        maxLearners: 5,
        features: ['progress_reports', 'parent_dashboard'],
      },
    },
    {
      id: PLAN_PARENT_BASE_YEARLY,
      sku: 'PARENT_BASE_YEARLY',
      planType: PlanType.PARENT_BASE,
      name: 'AIVO Family - Annual',
      description: 'Complete access to ELA and Math with up to 5 learners (20% savings)',
      unitPriceCents: 19190, // $191.90/year ($15.99/month equivalent)
      billingPeriod: BillingPeriod.YEARLY,
      isActive: true,
      trialDays: 14,
      metadataJson: {
        modules: ['ELA', 'MATH'],
        maxLearners: 5,
        features: ['progress_reports', 'parent_dashboard'],
        savings: '20%',
      },
    },
    // Parent Add-ons
    {
      id: PLAN_ADDON_SEL,
      sku: 'ADDON_SEL_MONTHLY',
      planType: PlanType.PARENT_ADDON,
      name: 'Social-Emotional Learning Add-on',
      description: 'Add SEL content and focus tools',
      unitPriceCents: 499, // $4.99/month
      billingPeriod: BillingPeriod.MONTHLY,
      isActive: true,
      trialDays: 7,
      metadataJson: {
        modules: ['SEL'],
        features: ['focus_tools', 'emotion_tracking'],
      },
    },
    {
      id: PLAN_ADDON_SPEECH,
      sku: 'ADDON_SPEECH_MONTHLY',
      planType: PlanType.PARENT_ADDON,
      name: 'Speech Therapy Add-on',
      description: 'Speech and language therapy activities',
      unitPriceCents: 799, // $7.99/month
      billingPeriod: BillingPeriod.MONTHLY,
      isActive: true,
      trialDays: 7,
      metadataJson: {
        modules: ['SPEECH'],
        features: ['articulation_practice', 'therapist_collaboration'],
      },
    },
    {
      id: PLAN_ADDON_SCIENCE,
      sku: 'ADDON_SCIENCE_MONTHLY',
      planType: PlanType.PARENT_ADDON,
      name: 'Science Add-on',
      description: 'Science curriculum aligned activities',
      unitPriceCents: 499, // $4.99/month
      billingPeriod: BillingPeriod.MONTHLY,
      isActive: true,
      trialDays: 7,
      metadataJson: {
        modules: ['SCIENCE'],
        features: ['experiments', 'virtual_labs'],
      },
    },
    // District Plans
    {
      id: PLAN_DISTRICT_BASE,
      sku: 'DISTRICT_BASE_ANNUAL',
      planType: PlanType.DISTRICT_BASE,
      name: 'AIVO District License - Annual',
      description: 'Full platform access for school districts (per-seat)',
      unitPriceCents: 4500, // $45/seat/year
      billingPeriod: BillingPeriod.YEARLY,
      isActive: true,
      trialDays: 30,
      metadataJson: {
        modules: ['ELA', 'MATH'],
        features: [
          'teacher_dashboard',
          'class_management',
          'admin_analytics',
          'rostering',
          'lti_integration',
        ],
        minSeats: 100,
      },
    },
    {
      id: PLAN_DISTRICT_SEL,
      sku: 'DISTRICT_ADDON_SEL_ANNUAL',
      planType: PlanType.DISTRICT_ADDON,
      name: 'District SEL Add-on',
      description: 'Social-Emotional Learning for districts',
      unitPriceCents: 1500, // $15/seat/year
      billingPeriod: BillingPeriod.YEARLY,
      isActive: true,
      trialDays: 0,
      metadataJson: {
        modules: ['SEL'],
        features: ['sel_curriculum', 'behavior_tracking', 'intervention_tools'],
      },
    },
    // Tutor Add-on Plans
    {
      id: PLAN_ADDON_TUTOR_MATH,
      sku: 'ADDON_TUTOR_MATH',
      planType: PlanType.PARENT_ADDON,
      name: 'AI Math Tutor - Nova',
      description: 'AI-powered math tutor with space-themed persona',
      unitPriceCents: 499,
      billingPeriod: BillingPeriod.MONTHLY,
      isActive: true,
      trialDays: 7,
      metadataJson: {
        tutorPersona: 'nova-math',
        subject: 'MATH',
        features: ['unlimited_sessions', 'voice_responses', 'progress_tracking'],
        parentCategory: 'ai_tutor',
      },
    },
    {
      id: PLAN_ADDON_TUTOR_ELA,
      sku: 'ADDON_TUTOR_ELA',
      planType: PlanType.PARENT_ADDON,
      name: 'AI ELA Tutor - Sage',
      description: 'AI-powered reading and writing tutor',
      unitPriceCents: 499,
      billingPeriod: BillingPeriod.MONTHLY,
      isActive: true,
      trialDays: 7,
      metadataJson: {
        tutorPersona: 'sage-ela',
        subject: 'ELA',
        features: ['unlimited_sessions', 'voice_responses', 'progress_tracking'],
        parentCategory: 'ai_tutor',
      },
    },
    {
      id: PLAN_ADDON_TUTOR_SCIENCE,
      sku: 'ADDON_TUTOR_SCIENCE',
      planType: PlanType.PARENT_ADDON,
      name: 'AI Science Tutor - Spark',
      description: 'AI-powered science tutor with inventor persona',
      unitPriceCents: 499,
      billingPeriod: BillingPeriod.MONTHLY,
      isActive: true,
      trialDays: 7,
      metadataJson: {
        tutorPersona: 'spark-science',
        subject: 'SCIENCE',
        features: ['unlimited_sessions', 'voice_responses', 'progress_tracking'],
        parentCategory: 'ai_tutor',
      },
    },
    {
      id: PLAN_ADDON_TUTOR_HISTORY,
      sku: 'ADDON_TUTOR_HISTORY',
      planType: PlanType.PARENT_ADDON,
      name: 'AI History Tutor - Chrono',
      description: 'AI-powered history tutor with time-travel persona',
      unitPriceCents: 499,
      billingPeriod: BillingPeriod.MONTHLY,
      isActive: true,
      trialDays: 7,
      metadataJson: {
        tutorPersona: 'chrono-history',
        subject: 'HISTORY',
        features: ['unlimited_sessions', 'voice_responses', 'progress_tracking'],
        parentCategory: 'ai_tutor',
      },
    },
    {
      id: PLAN_ADDON_TUTOR_CODING,
      sku: 'ADDON_TUTOR_CODING',
      planType: PlanType.PARENT_ADDON,
      name: 'AI Coding Tutor - Pixel',
      description: 'AI-powered coding tutor with robot persona',
      unitPriceCents: 499,
      billingPeriod: BillingPeriod.MONTHLY,
      isActive: true,
      trialDays: 7,
      metadataJson: {
        tutorPersona: 'pixel-coding',
        subject: 'CODING',
        features: ['unlimited_sessions', 'voice_responses', 'progress_tracking'],
        parentCategory: 'ai_tutor',
      },
    },
    {
      id: PLAN_ADDON_TUTOR_BUNDLE,
      sku: 'ADDON_TUTOR_BUNDLE',
      planType: PlanType.PARENT_ADDON,
      name: 'AI Tutor Bundle - All Subjects',
      description: 'All 5 AI tutors at a discounted price',
      unitPriceCents: 1499,
      billingPeriod: BillingPeriod.MONTHLY,
      isActive: true,
      trialDays: 7,
      metadataJson: {
        tutorPersonas: ['nova-math', 'sage-ela', 'spark-science', 'chrono-history', 'pixel-coding'],
        subjects: ['MATH', 'ELA', 'SCIENCE', 'HISTORY', 'CODING'],
        features: ['unlimited_sessions', 'voice_responses', 'progress_tracking', 'priority_support'],
        parentCategory: 'ai_tutor',
        isBundle: true,
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {},
      create: plan,
    });
  }
  console.log(`  ✅ Created ${plans.length} plans`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Billing Accounts
  // ══════════════════════════════════════════════════════════════════════════

  // Parent billing account
  await prisma.billingAccount.upsert({
    where: { id: PARENT_BILLING_ACCOUNT },
    update: {},
    create: {
      id: PARENT_BILLING_ACCOUNT,
      tenantId: DEV_TENANT_ID,
      accountType: BillingAccountType.PARENT_CONSUMER,
      ownerUserId: PARENT_USER_ID,
      displayName: 'Johnson Family',
      provider: PaymentProvider.STRIPE,
      providerCustomerId: 'cus_test_johnsonfamily',
      billingEmail: 'parent@aivo.dev',
      defaultCurrency: 'USD',
      metadataJson: {
        signupSource: 'organic',
        referralCode: null,
      },
    },
  });
  console.log('  ✅ Created billing account: Johnson Family (Parent)');

  // District billing account
  await prisma.billingAccount.upsert({
    where: { id: DISTRICT_BILLING_ACCOUNT },
    update: {},
    create: {
      id: DISTRICT_BILLING_ACCOUNT,
      tenantId: DEMO_TENANT_ID,
      accountType: BillingAccountType.DISTRICT,
      displayName: 'Springfield School District',
      provider: PaymentProvider.MANUAL_INVOICE,
      billingEmail: 'billing@springfield.k12.us',
      defaultCurrency: 'USD',
      metadataJson: {
        taxExempt: true,
        einNumber: '12-3456789',
        purchaseOrderRequired: true,
      },
    },
  });
  console.log('  ✅ Created billing account: Springfield School District');

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Subscriptions
  // ══════════════════════════════════════════════════════════════════════════

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Parent subscription (in trial)
  await prisma.subscription.upsert({
    where: { id: '00000000-0000-0000-bb20-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-bb20-000000000001',
      billingAccountId: PARENT_BILLING_ACCOUNT,
      planId: PLAN_PARENT_BASE_MONTHLY,
      status: SubscriptionStatus.IN_TRIAL,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialStart: now,
      trialEnd: trialEnd,
      cancelAtPeriodEnd: false,
      providerSubscriptionId: 'sub_test_parent_trial',
      metadataJson: {
        trialType: 'standard_14_day',
        learnerCount: 2,
      },
    },
  });
  console.log('  ✅ Created subscription: Parent trial');

  // SEL add-on subscription
  await prisma.subscription.upsert({
    where: { id: '00000000-0000-0000-bb20-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-bb20-000000000002',
      billingAccountId: PARENT_BILLING_ACCOUNT,
      planId: PLAN_ADDON_SEL,
      status: SubscriptionStatus.IN_TRIAL,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialStart: now,
      trialEnd: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days for add-ons
      cancelAtPeriodEnd: false,
      providerSubscriptionId: 'sub_test_sel_addon',
    },
  });
  console.log('  ✅ Created subscription: SEL add-on trial');

  // District subscription (active)
  const yearStart = new Date('2024-01-01');
  const yearEnd = new Date('2024-12-31');

  await prisma.subscription.upsert({
    where: { id: '00000000-0000-0000-bb20-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-bb20-000000000010',
      billingAccountId: DISTRICT_BILLING_ACCOUNT,
      planId: PLAN_DISTRICT_BASE,
      status: SubscriptionStatus.ACTIVE,
      quantity: 500, // 500 seats
      currentPeriodStart: yearStart,
      currentPeriodEnd: yearEnd,
      cancelAtPeriodEnd: false,
      metadataJson: {
        contractNumber: 'CONTRACT-2024-001',
        seatType: 'named_user',
        schoolsIncluded: ['Elementary School', 'Middle School'],
      },
    },
  });
  console.log('  ✅ Created subscription: District annual (500 seats)');

  console.log('');
  console.log('✅ billing-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 14 plans (parent base/addons, tutor addons, district base/addons)');
  console.log('  - 2 billing accounts (parent, district)');
  console.log('  - 3 subscriptions (parent trial with SEL, district active)');
  console.log('');
  console.log('Pricing:');
  console.log('  - Parent Base: $19.99/mo or $191.90/yr');
  console.log('  - SEL Add-on: $4.99/mo');
  console.log('  - District: $45/seat/year');
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
