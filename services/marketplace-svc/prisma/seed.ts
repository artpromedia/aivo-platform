/**
 * AIVO Platform - Marketplace Service Seed Data
 *
 * Creates:
 * - Vendors (Aivo and third-party)
 * - Marketplace items (content packs and embedded tools)
 * - Sample installations
 */

import {
  PrismaClient,
  VendorType,
  MarketplaceItemType,
  MarketplaceSubject,
  MarketplaceGradeBand,
  MarketplaceModality,
  MarketplaceVersionStatus,
  InstallationStatus,
  PricingModel,
  MarketplaceBillingModel,
  SafetyCertification,
} from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('🌱 Seeding marketplace-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Vendors
  // ══════════════════════════════════════════════════════════════════════════

  const vendors = [
    {
      id: '00000000-0000-0000-a000-000000000001',
      type: VendorType.AIVO,
      name: 'AIVO Learning',
      slug: 'aivo',
      description: 'First-party content from the AIVO team',
      websiteUrl: 'https://aivo.com',
      contactEmail: 'support@aivo.com',
      logoUrl: '/vendors/aivo-logo.png',
      isVerified: true,
      isActive: true,
    },
    {
      id: '00000000-0000-0000-a000-000000000002',
      type: VendorType.THIRD_PARTY,
      name: 'MathVentures',
      slug: 'mathventures',
      description: 'Interactive math games and activities for K-8',
      websiteUrl: 'https://mathventures.example.com',
      contactEmail: 'help@mathventures.example.com',
      logoUrl: '/vendors/mathventures-logo.png',
      isVerified: true,
      isActive: true,
    },
    {
      id: '00000000-0000-0000-a000-000000000003',
      type: VendorType.THIRD_PARTY,
      name: 'ReadingRocket',
      slug: 'readingrocket',
      description: 'Leveled reading passages and comprehension tools',
      websiteUrl: 'https://readingrocket.example.com',
      contactEmail: 'support@readingrocket.example.com',
      logoUrl: '/vendors/readingrocket-logo.png',
      isVerified: true,
      isActive: true,
    },
    {
      id: '00000000-0000-0000-a000-000000000004',
      type: VendorType.THIRD_PARTY,
      name: 'ScienceLab VR',
      slug: 'sciencelab-vr',
      description: 'Virtual science experiments and simulations',
      websiteUrl: 'https://sciencelabvr.example.com',
      contactEmail: 'hello@sciencelabvr.example.com',
      logoUrl: '/vendors/sciencelab-logo.png',
      isVerified: false,
      isActive: true,
    },
  ];

  for (const vendor of vendors) {
    await prisma.vendor.upsert({
      where: { id: vendor.id },
      update: {},
      create: vendor,
    });
    console.log(`  ✅ Created vendor: ${vendor.name}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Marketplace Items
  // ══════════════════════════════════════════════════════════════════════════

  const items = [
    {
      id: '00000000-0000-0000-a100-000000000001',
      vendorId: vendors[0].id, // AIVO
      itemType: MarketplaceItemType.CONTENT_PACK,
      title: 'AIVO Core Math Pack',
      slug: 'aivo-core-math',
      shortDescription: 'Essential math content for grades K-5',
      longDescription:
        'A comprehensive collection of math lessons, practice activities, and assessments covering the core curriculum for elementary grades.',
      subjects: [MarketplaceSubject.MATH],
      gradeBands: [MarketplaceGradeBand.K_2, MarketplaceGradeBand.G3_5],
      modalities: [MarketplaceModality.DRILL, MarketplaceModality.GAME],
      pricingModel: PricingModel.FREE,
      billingModel: MarketplaceBillingModel.FREE,
      safetyCertification: SafetyCertification.AIVO_CERTIFIED,
      isFeatured: true,
      isActive: true,
    },
    {
      id: '00000000-0000-0000-a100-000000000002',
      vendorId: vendors[0].id, // AIVO
      itemType: MarketplaceItemType.CONTENT_PACK,
      title: 'AIVO SEL Foundations',
      slug: 'aivo-sel-foundations',
      shortDescription: 'Social-emotional learning activities',
      longDescription:
        'Interactive lessons and activities focused on emotional awareness, self-regulation, and social skills.',
      subjects: [MarketplaceSubject.SEL],
      gradeBands: [MarketplaceGradeBand.K_2, MarketplaceGradeBand.G3_5, MarketplaceGradeBand.G6_8],
      modalities: [MarketplaceModality.SEL_ACTIVITY, MarketplaceModality.VIDEO],
      pricingModel: PricingModel.FREE,
      billingModel: MarketplaceBillingModel.FREE,
      safetyCertification: SafetyCertification.AIVO_CERTIFIED,
      isFeatured: true,
      isActive: true,
    },
    {
      id: '00000000-0000-0000-a100-000000000003',
      vendorId: vendors[1].id, // MathVentures
      itemType: MarketplaceItemType.EMBEDDED_TOOL,
      title: 'Fraction Fighters',
      slug: 'fraction-fighters',
      shortDescription: 'Game-based fraction practice',
      longDescription:
        'An engaging game where students practice fraction operations while battling through levels. Adaptive difficulty based on performance.',
      subjects: [MarketplaceSubject.MATH],
      gradeBands: [MarketplaceGradeBand.G3_5, MarketplaceGradeBand.G6_8],
      modalities: [MarketplaceModality.GAME],
      pricingModel: PricingModel.FREEMIUM,
      billingModel: MarketplaceBillingModel.PER_SEAT,
      safetyCertification: SafetyCertification.AIVO_CERTIFIED,
      isFeatured: true,
      isActive: true,
    },
    {
      id: '00000000-0000-0000-a100-000000000004',
      vendorId: vendors[2].id, // ReadingRocket
      itemType: MarketplaceItemType.CONTENT_PACK,
      title: 'ReadingRocket Leveled Library',
      slug: 'readingrocket-library',
      shortDescription: '500+ leveled reading passages',
      longDescription:
        'A comprehensive library of leveled reading passages with built-in comprehension questions and vocabulary support.',
      subjects: [MarketplaceSubject.ELA],
      gradeBands: [MarketplaceGradeBand.K_2, MarketplaceGradeBand.G3_5, MarketplaceGradeBand.G6_8],
      modalities: [MarketplaceModality.READING, MarketplaceModality.ASSESSMENT],
      pricingModel: PricingModel.PAID_PER_SEAT,
      billingModel: MarketplaceBillingModel.PER_SEAT,
      safetyCertification: SafetyCertification.VENDOR_ATTESTED,
      isFeatured: false,
      isActive: true,
    },
    {
      id: '00000000-0000-0000-a100-000000000005',
      vendorId: vendors[3].id, // ScienceLab VR
      itemType: MarketplaceItemType.EMBEDDED_TOOL,
      title: 'Virtual Chemistry Lab',
      slug: 'virtual-chemistry-lab',
      shortDescription: 'Safe virtual chemistry experiments',
      longDescription:
        'Students can conduct chemistry experiments in a safe virtual environment. Perfect for demonstrating reactions without safety concerns.',
      subjects: [MarketplaceSubject.SCIENCE],
      gradeBands: [MarketplaceGradeBand.G6_8, MarketplaceGradeBand.G9_12],
      modalities: [MarketplaceModality.SIMULATION],
      pricingModel: PricingModel.FREE_TRIAL,
      billingModel: MarketplaceBillingModel.TENANT_FLAT,
      safetyCertification: SafetyCertification.PENDING_REVIEW,
      isFeatured: false,
      isActive: true,
    },
  ];

  for (const item of items) {
    await prisma.marketplaceItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
    console.log(`  ✅ Created marketplace item: ${item.title}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Marketplace Versions (Published)
  // ══════════════════════════════════════════════════════════════════════════

  // Store version IDs for installations
  const versionIds: Record<string, string> = {};

  for (const item of items) {
    const versionId = `${item.id.slice(0, -1)}v`; // Generate version ID based on item ID
    versionIds[item.id] = versionId;

    await prisma.marketplaceItemVersion.upsert({
      where: {
        marketplaceItemId_version: {
          marketplaceItemId: item.id,
          version: '1.0.0',
        },
      },
      update: {},
      create: {
        id: versionId,
        marketplaceItemId: item.id,
        version: '1.0.0',
        status: MarketplaceVersionStatus.PUBLISHED,
        changelog: 'Initial release',
        publishedAt: new Date(),
      },
    });
  }

  console.log(`  ✅ Created published versions for all items`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create Sample Installations for Dev Tenant
  // ══════════════════════════════════════════════════════════════════════════

  const installations = [
    {
      id: '00000000-0000-0000-a200-000000000001',
      tenantId: DEV_TENANT_ID,
      marketplaceItemId: items[0].id, // AIVO Core Math
      marketplaceItemVersionId: versionIds[items[0].id],
      status: InstallationStatus.ACTIVE,
      installedByUserId: '00000000-0000-0000-1000-000000000001', // admin
    },
    {
      id: '00000000-0000-0000-a200-000000000002',
      tenantId: DEV_TENANT_ID,
      marketplaceItemId: items[1].id, // AIVO SEL
      marketplaceItemVersionId: versionIds[items[1].id],
      status: InstallationStatus.ACTIVE,
      installedByUserId: '00000000-0000-0000-1000-000000000001', // admin
    },
    {
      id: '00000000-0000-0000-a200-000000000003',
      tenantId: DEV_TENANT_ID,
      marketplaceItemId: items[2].id, // Fraction Fighters
      marketplaceItemVersionId: versionIds[items[2].id],
      status: InstallationStatus.ACTIVE,
      installedByUserId: '00000000-0000-0000-1000-000000000001', // admin
    },
  ];

  for (const installation of installations) {
    await prisma.marketplaceInstallation.upsert({
      where: { id: installation.id },
      update: {},
      create: installation,
    });
  }

  console.log(`  ✅ Created ${installations.length} marketplace installations`);

  console.log('');
  console.log('✅ marketplace-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log(`  - ${vendors.length} vendors`);
  console.log(`  - ${items.length} marketplace items`);
  console.log(`  - ${installations.length} marketplace installations`);
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
