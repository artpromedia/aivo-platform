/**
 * AIVO Platform - Device Management Service Seed Data
 *
 * Creates:
 * - Sample devices (iPads, Chromebooks)
 * - Device pools
 * - Pool memberships
 * - Device policies
 * - Device events
 */

import { PrismaClient, DeviceType, GradeBand } from '@prisma/client';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const RIVERSIDE_SCHOOL_ID = '00000000-0000-0000-0001-000000000001';
const WESTSIDE_SCHOOL_ID = '00000000-0000-0000-0001-000000000002';

// Device pool IDs
const LAB_A_POOL = '00000000-0000-0000-dm00-000000000001';
const GRADE3_POOL = '00000000-0000-0000-dm00-000000000002';
const CHECKOUT_POOL = '00000000-0000-0000-dm00-000000000003';

// Device IDs
const DEVICE_IPAD_1 = '00000000-0000-0000-dm10-000000000001';
const DEVICE_IPAD_2 = '00000000-0000-0000-dm10-000000000002';
const DEVICE_IPAD_3 = '00000000-0000-0000-dm10-000000000003';
const DEVICE_CHROMEBOOK_1 = '00000000-0000-0000-dm10-000000000004';
const DEVICE_CHROMEBOOK_2 = '00000000-0000-0000-dm10-000000000005';

async function main() {
  console.log('🌱 Seeding device-mgmt-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Device Pools
  // ══════════════════════════════════════════════════════════════════════════

  const pools = [
    {
      id: LAB_A_POOL,
      tenantId: DEV_TENANT_ID,
      schoolId: RIVERSIDE_SCHOOL_ID,
      name: 'Lab A iPads',
      description: 'iPad cart for Computer Lab A - 20 devices',
      gradeBand: GradeBand.K_2,
    },
    {
      id: GRADE3_POOL,
      tenantId: DEV_TENANT_ID,
      schoolId: RIVERSIDE_SCHOOL_ID,
      name: 'Grade 3 Chromebooks',
      description: '1:1 Chromebook devices for 3rd grade classrooms',
      gradeBand: GradeBand.G3_5,
    },
    {
      id: CHECKOUT_POOL,
      tenantId: DEV_TENANT_ID,
      schoolId: WESTSIDE_SCHOOL_ID,
      name: 'Library Checkout',
      description: 'Devices available for library checkout',
      gradeBand: null,
    },
  ];

  for (const pool of pools) {
    await prisma.devicePool.upsert({
      where: { id: pool.id },
      update: {},
      create: pool,
    });
  }
  console.log(`  ✅ Created ${pools.length} device pools`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Devices
  // ══════════════════════════════════════════════════════════════════════════

  const devices = [
    // Lab A iPads
    {
      id: DEVICE_IPAD_1,
      tenantId: DEV_TENANT_ID,
      schoolId: RIVERSIDE_SCHOOL_ID,
      deviceIdentifier: 'aivo-ipad-lab-a-001',
      deviceType: DeviceType.IOS_TABLET,
      appVersion: '2.4.1',
      osVersion: 'iOS 17.2',
      displayName: 'Lab A - iPad 1',
      isActive: true,
      lastCheckInAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      lastIpAddress: '192.168.1.101',
    },
    {
      id: DEVICE_IPAD_2,
      tenantId: DEV_TENANT_ID,
      schoolId: RIVERSIDE_SCHOOL_ID,
      deviceIdentifier: 'aivo-ipad-lab-a-002',
      deviceType: DeviceType.IOS_TABLET,
      appVersion: '2.4.1',
      osVersion: 'iOS 17.2',
      displayName: 'Lab A - iPad 2',
      isActive: true,
      lastCheckInAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      lastIpAddress: '192.168.1.102',
    },
    {
      id: DEVICE_IPAD_3,
      tenantId: DEV_TENANT_ID,
      schoolId: RIVERSIDE_SCHOOL_ID,
      deviceIdentifier: 'aivo-ipad-lab-a-003',
      deviceType: DeviceType.IOS_TABLET,
      appVersion: '2.3.5', // Older version
      osVersion: 'iOS 16.7',
      displayName: 'Lab A - iPad 3',
      isActive: true,
      lastCheckInAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago - stale
      lastIpAddress: '192.168.1.103',
    },
    // Grade 3 Chromebooks
    {
      id: DEVICE_CHROMEBOOK_1,
      tenantId: DEV_TENANT_ID,
      schoolId: RIVERSIDE_SCHOOL_ID,
      deviceIdentifier: 'aivo-cb-g3-smith-001',
      deviceType: DeviceType.CHROMEBOOK,
      appVersion: '2.4.1',
      osVersion: 'ChromeOS 119',
      displayName: 'Ms. Smith - CB 1',
      isActive: true,
      lastCheckInAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      lastIpAddress: '192.168.1.201',
    },
    {
      id: DEVICE_CHROMEBOOK_2,
      tenantId: DEV_TENANT_ID,
      schoolId: RIVERSIDE_SCHOOL_ID,
      deviceIdentifier: 'aivo-cb-g3-smith-002',
      deviceType: DeviceType.CHROMEBOOK,
      appVersion: '2.4.1',
      osVersion: 'ChromeOS 119',
      displayName: 'Ms. Smith - CB 2',
      isActive: true,
      lastCheckInAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
      lastIpAddress: '192.168.1.202',
    },
  ];

  for (const device of devices) {
    await prisma.device.upsert({
      where: { id: device.id },
      update: {},
      create: device,
    });
  }
  console.log(`  ✅ Created ${devices.length} devices`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Pool Memberships
  // ══════════════════════════════════════════════════════════════════════════

  const memberships = [
    // Lab A iPads in Lab A pool
    { id: '00000000-0000-0000-dm20-000000000001', deviceId: DEVICE_IPAD_1, devicePoolId: LAB_A_POOL },
    { id: '00000000-0000-0000-dm20-000000000002', deviceId: DEVICE_IPAD_2, devicePoolId: LAB_A_POOL },
    { id: '00000000-0000-0000-dm20-000000000003', deviceId: DEVICE_IPAD_3, devicePoolId: LAB_A_POOL },
    // Chromebooks in Grade 3 pool
    { id: '00000000-0000-0000-dm20-000000000004', deviceId: DEVICE_CHROMEBOOK_1, devicePoolId: GRADE3_POOL },
    { id: '00000000-0000-0000-dm20-000000000005', deviceId: DEVICE_CHROMEBOOK_2, devicePoolId: GRADE3_POOL },
    // iPad 3 also in checkout pool (multi-pool)
    { id: '00000000-0000-0000-dm20-000000000006', deviceId: DEVICE_IPAD_3, devicePoolId: CHECKOUT_POOL },
  ];

  for (const membership of memberships) {
    await prisma.devicePoolMembership.upsert({
      where: { id: membership.id },
      update: {},
      create: membership,
    });
  }
  console.log(`  ✅ Created ${memberships.length} pool memberships`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create Device Policies
  // ══════════════════════════════════════════════════════════════════════════

  const policies = [
    {
      id: '00000000-0000-0000-dm30-000000000001',
      devicePoolId: LAB_A_POOL,
      policyJson: {
        kioskMode: true,
        allowedApps: ['learner'],
        maxOfflineDays: 7,
        restrictParentSwitching: true,
        gradeBand: 'K_2',
        theme: {
          primaryColor: '#FF6B6B',
          iconSize: 'large',
          fontScale: 1.2,
        },
        accessibility: {
          screenReaderEnabled: true,
          hapticFeedback: true,
        },
      },
      notes: 'Kiosk mode for early elementary - large icons, bright colors',
    },
    {
      id: '00000000-0000-0000-dm30-000000000002',
      devicePoolId: GRADE3_POOL,
      policyJson: {
        kioskMode: false,
        allowedApps: ['learner', 'homework-helper'],
        maxOfflineDays: 14,
        restrictParentSwitching: false,
        gradeBand: 'G3_5',
        theme: {
          primaryColor: '#4ECDC4',
          iconSize: 'medium',
          fontScale: 1.0,
        },
        features: {
          offlineMode: true,
          cameraAccess: true, // For homework scanner
        },
      },
      notes: '1:1 device policy - more features enabled',
    },
    {
      id: '00000000-0000-0000-dm30-000000000003',
      devicePoolId: CHECKOUT_POOL,
      policyJson: {
        kioskMode: false,
        allowedApps: ['learner'],
        maxOfflineDays: 3, // Shorter for checkout devices
        autoWipeOnOfflineLimit: true,
        features: {
          offlineMode: true,
          syncOnReturn: true,
        },
      },
      notes: 'Library checkout - shorter offline limit, auto-wipe',
    },
  ];

  for (const policy of policies) {
    await prisma.devicePolicy.upsert({
      where: { id: policy.id },
      update: {},
      create: policy,
    });
  }
  console.log(`  ✅ Created ${policies.length} device policies`);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Create Device Events (audit log)
  // ══════════════════════════════════════════════════════════════════════════

  const events = [
    // iPad 1 events
    {
      id: '00000000-0000-0000-dm40-000000000001',
      deviceId: DEVICE_IPAD_1,
      eventType: 'REGISTERED',
      eventData: { registeredBy: 'admin@aivo.dev', method: 'mdm' },
      ipAddress: '192.168.1.100',
      createdAt: new Date('2024-01-05T10:00:00Z'),
    },
    {
      id: '00000000-0000-0000-dm40-000000000002',
      deviceId: DEVICE_IPAD_1,
      eventType: 'POLICY_APPLIED',
      eventData: { policyId: '00000000-0000-0000-dm30-000000000001', policyName: 'Lab A iPads' },
      ipAddress: '192.168.1.101',
      createdAt: new Date('2024-01-05T10:01:00Z'),
    },
    {
      id: '00000000-0000-0000-dm40-000000000003',
      deviceId: DEVICE_IPAD_1,
      eventType: 'CHECK_IN',
      eventData: { appVersion: '2.4.1', batteryLevel: 85, freeStorage: '12GB' },
      ipAddress: '192.168.1.101',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    // iPad 3 stale warning
    {
      id: '00000000-0000-0000-dm40-000000000010',
      deviceId: DEVICE_IPAD_3,
      eventType: 'STALE_WARNING',
      eventData: { lastCheckIn: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), thresholdDays: 2 },
      ipAddress: null,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    // App update available
    {
      id: '00000000-0000-0000-dm40-000000000011',
      deviceId: DEVICE_IPAD_3,
      eventType: 'UPDATE_AVAILABLE',
      eventData: { currentVersion: '2.3.5', availableVersion: '2.4.1', mandatory: false },
      ipAddress: null,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ];

  for (const event of events) {
    await prisma.deviceEvent.upsert({
      where: { id: event.id },
      update: {},
      create: event,
    });
  }
  console.log(`  ✅ Created ${events.length} device events`);

  console.log('');
  console.log('✅ device-mgmt-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 3 device pools (Lab A, Grade 3, Checkout)');
  console.log('  - 5 devices (3 iPads, 2 Chromebooks)');
  console.log('  - 6 pool memberships (including multi-pool)');
  console.log('  - 3 device policies with different configurations');
  console.log('  - 5 device events (registration, check-in, warnings)');
  console.log('');
  console.log('Demonstrates:');
  console.log('  - MDM integration patterns');
  console.log('  - Device pool organization');
  console.log('  - Policy-based configuration');
  console.log('  - Device health monitoring');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
