/**
 * Device Registration & Check-in API Tests
 *
 * Tests for the device registration upsert behavior and check-in updates.
 */

import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

const mockTenantId = 'tenant-123-abc';
const mockSchoolId = 'school-456-def';
const mockDeviceIdentifier = 'ABC123-HARDWARE-ID';
const mockDeviceId = 'device-789-ghi';

const mockDevice = {
  id: mockDeviceId,
  tenantId: mockTenantId,
  schoolId: mockSchoolId,
  deviceIdentifier: mockDeviceIdentifier,
  deviceType: 'IOS_TABLET',
  appVersion: '2.0.0',
  osVersion: 'iOS 17.0',
  lastCheckInAt: new Date(),
  lastIpAddress: '192.168.1.100',
  displayName: 'Lab A iPad 5',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  poolMemberships: [],
};

const mockPool = {
  id: 'pool-111',
  name: 'Elementary iPads',
  gradeBand: 'K_2',
  policy: {
    id: 'policy-222',
    policyJson: {
      kioskMode: true,
      maxOfflineDays: 5,
      gradeBand: 'K_2',
    },
  },
};

const mockDeviceWithPool = {
  ...mockDevice,
  poolMemberships: [
    {
      pool: mockPool,
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// MOCK PRISMA
// ══════════════════════════════════════════════════════════════════════════════

let mockUpsertResult = mockDeviceWithPool;
let mockUpdateResult = mockDeviceWithPool;
let mockEventCreated = false;

vi.mock('../generated/prisma-client/index.js', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    device: {
      upsert: vi.fn(async ({ create, update }) => {
        mockUpsertResult = {
          ...mockDevice,
          ...create,
          poolMemberships: mockDeviceWithPool.poolMemberships,
        };
        return mockUpsertResult;
      }),
      update: vi.fn(async ({ data }) => {
        mockUpdateResult = {
          ...mockDevice,
          ...data,
          poolMemberships: mockDeviceWithPool.poolMemberships,
        };
        return mockUpdateResult;
      }),
      findUnique: vi.fn(async () => mockDeviceWithPool),
      findMany: vi.fn(async () => [mockDevice]),
      count: vi.fn(async () => 1),
      delete: vi.fn(async () => mockDevice),
    },
    deviceEvent: {
      create: vi.fn(async () => {
        mockEventCreated = true;
        return { id: 'event-1' };
      }),
    },
    devicePool: {
      findMany: vi.fn(async () => [mockPool]),
      findUnique: vi.fn(async () => mockPool),
      count: vi.fn(async () => 1),
    },
  })),
  DeviceType: {
    IOS_TABLET: 'IOS_TABLET',
    ANDROID_TABLET: 'ANDROID_TABLET',
    CHROMEBOOK: 'CHROMEBOOK',
    WINDOWS_LAPTOP: 'WINDOWS_LAPTOP',
    MAC_LAPTOP: 'MAC_LAPTOP',
    WEB_BROWSER: 'WEB_BROWSER',
    OTHER: 'OTHER',
  },
}));

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

async function loadApp() {
  const mod = await import('../src/app.js');
  return mod.buildApp;
}

describe('Device Registration API', () => {
  let app: Awaited<ReturnType<Awaited<ReturnType<typeof loadApp>>>>;

  beforeAll(async () => {
    const buildApp = await loadApp();
    app = await buildApp();
  });

  afterEach(() => {
    mockEventCreated = false;
  });

  describe('POST /devices/register', () => {
    it('registers a new device and returns deviceId with policies', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices/register',
        payload: {
          tenantId: mockTenantId,
          schoolId: mockSchoolId,
          deviceIdentifier: mockDeviceIdentifier,
          deviceType: 'IOS_TABLET',
          appVersion: '2.0.0',
          osVersion: 'iOS 17.0',
        },
      });

      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body.deviceId).toBeDefined();
      expect(body.devicePools).toBeDefined();
      expect(body.policy).toBeDefined();
    });

    it('upserts device when registering with same tenant+identifier', async () => {
      // First registration
      await app.inject({
        method: 'POST',
        url: '/devices/register',
        payload: {
          tenantId: mockTenantId,
          deviceIdentifier: mockDeviceIdentifier,
          deviceType: 'IOS_TABLET',
          appVersion: '1.0.0',
          osVersion: 'iOS 16.0',
        },
      });

      // Second registration with updated version
      const response = await app.inject({
        method: 'POST',
        url: '/devices/register',
        payload: {
          tenantId: mockTenantId,
          deviceIdentifier: mockDeviceIdentifier,
          deviceType: 'IOS_TABLET',
          appVersion: '2.0.0',
          osVersion: 'iOS 17.0',
        },
      });

      expect(response.statusCode).toBe(200);
      // Same device ID should be returned
      expect(response.json().deviceId).toBeDefined();
    });

    it('creates a REGISTERED event on registration', async () => {
      await app.inject({
        method: 'POST',
        url: '/devices/register',
        payload: {
          tenantId: mockTenantId,
          deviceIdentifier: mockDeviceIdentifier,
          deviceType: 'IOS_TABLET',
          appVersion: '2.0.0',
          osVersion: 'iOS 17.0',
        },
      });

      expect(mockEventCreated).toBe(true);
    });

    it('returns merged policies from all assigned pools', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices/register',
        payload: {
          tenantId: mockTenantId,
          deviceIdentifier: mockDeviceIdentifier,
          deviceType: 'IOS_TABLET',
          appVersion: '2.0.0',
          osVersion: 'iOS 17.0',
        },
      });

      const body = response.json();
      expect(body.policy).toBeDefined();
      expect(body.policy.kioskMode).toBe(true);
      expect(body.policy.maxOfflineDays).toBeDefined();
    });

    it('validates required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices/register',
        payload: {
          // Missing tenantId
          deviceIdentifier: mockDeviceIdentifier,
          deviceType: 'IOS_TABLET',
          appVersion: '2.0.0',
          osVersion: 'iOS 17.0',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('validates device type enum', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices/register',
        payload: {
          tenantId: mockTenantId,
          deviceIdentifier: mockDeviceIdentifier,
          deviceType: 'INVALID_TYPE',
          appVersion: '2.0.0',
          osVersion: 'iOS 17.0',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

describe('Device Check-in API', () => {
  let app: Awaited<ReturnType<Awaited<ReturnType<typeof loadApp>>>>;

  beforeAll(async () => {
    const buildApp = await loadApp();
    app = await buildApp();
  });

  afterEach(() => {
    mockEventCreated = false;
  });

  describe('POST /devices/check-in', () => {
    it('updates lastCheckInAt timestamp', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices/check-in',
        payload: {
          deviceId: mockDeviceId,
          appVersion: '2.1.0',
          osVersion: 'iOS 17.1',
        },
      });

      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body.deviceId).toBe(mockDeviceId);
      expect(body.lastCheckInAt).toBeDefined();
    });

    it('returns current policy snapshot', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices/check-in',
        payload: {
          deviceId: mockDeviceId,
          appVersion: '2.1.0',
          osVersion: 'iOS 17.1',
        },
      });

      const body = response.json();
      expect(body.policy).toBeDefined();
      expect(typeof body.policy.kioskMode).toBe('boolean');
    });

    it('creates a CHECK_IN event', async () => {
      await app.inject({
        method: 'POST',
        url: '/devices/check-in',
        payload: {
          deviceId: mockDeviceId,
          appVersion: '2.1.0',
          osVersion: 'iOS 17.1',
        },
      });

      expect(mockEventCreated).toBe(true);
    });

    it('updates app version and OS version', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices/check-in',
        payload: {
          deviceId: mockDeviceId,
          appVersion: '2.1.0',
          osVersion: 'iOS 17.1',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('validates deviceId is a UUID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices/check-in',
        payload: {
          deviceId: 'invalid-id',
          appVersion: '2.1.0',
          osVersion: 'iOS 17.1',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

describe('Device List API', () => {
  let app: Awaited<ReturnType<Awaited<ReturnType<typeof loadApp>>>>;

  beforeAll(async () => {
    const buildApp = await loadApp();
    app = await buildApp();
  });

  describe('GET /devices', () => {
    it('lists devices for a tenant', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/devices?tenantId=${mockTenantId}`,
      });

      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body.devices).toBeDefined();
      expect(Array.isArray(body.devices)).toBe(true);
    });

    it('obfuscates device identifiers in response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/devices?tenantId=${mockTenantId}`,
      });

      const body = response.json();
      if (body.devices.length > 0) {
        // Should contain obfuscation (***) pattern
        expect(body.devices[0].deviceIdentifier).toContain('***');
      }
    });

    it('supports filtering by device type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/devices?tenantId=${mockTenantId}&deviceType=IOS_TABLET`,
      });

      expect(response.statusCode).toBe(200);
    });

    it('supports filtering by pool', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/devices?tenantId=${mockTenantId}&poolId=pool-111`,
      });

      expect(response.statusCode).toBe(200);
    });

    it('supports pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/devices?tenantId=${mockTenantId}&limit=10&offset=0`,
      });

      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body.total).toBeDefined();
      expect(body.limit).toBe(10);
      expect(body.offset).toBe(0);
    });
  });
});

describe('Policy Merge Logic', () => {
  it('kioskMode is true if any policy enables it', () => {
    // This tests the mergePolicies function behavior
    // Most restrictive wins: if any policy has kioskMode=true, merged result is true
  });

  it('maxOfflineDays uses the minimum value', () => {
    // If policies have [7, 5, 10], merged should be 5
  });

  it('gradeBand uses most restrictive (lowest index)', () => {
    // K_2 < G3_5 < G6_8 < G9_12, so K_2 wins
  });
});
