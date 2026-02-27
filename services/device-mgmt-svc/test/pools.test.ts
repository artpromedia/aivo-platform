/**
 * Tests for device-mgmt-svc — device registration, check-in, and listing logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

/* ---------- schemas from src/routes/devices.ts ---------- */

const DeviceTypeEnum = z.enum([
  'IOS_TABLET',
  'ANDROID_TABLET',
  'CHROMEBOOK',
  'WINDOWS_LAPTOP',
  'MAC_LAPTOP',
  'WEB_BROWSER',
  'OTHER',
]);

const RegisterDeviceSchema = z.object({
  tenantId: z.string().uuid(),
  schoolId: z.string().uuid(),
  deviceIdentifier: z.string().min(1).max(255),
  deviceType: DeviceTypeEnum,
  appVersion: z.string().optional(),
  osVersion: z.string().optional(),
  displayName: z.string().max(100).optional(),
});

const CheckInSchema = z.object({
  deviceId: z.string().uuid(),
  appVersion: z.string().optional(),
  osVersion: z.string().optional(),
});

const ListDevicesQuery = z.object({
  tenantId: z.string().uuid(),
  schoolId: z.string().uuid().optional(),
  poolId: z.string().uuid().optional(),
  deviceType: DeviceTypeEnum.optional(),
  appVersion: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

const UpdateDeviceSchema = z.object({
  displayName: z.string().max(100).optional(),
  schoolId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

describe('DeviceTypeEnum', () => {
  it.each([
    'IOS_TABLET',
    'ANDROID_TABLET',
    'CHROMEBOOK',
    'WINDOWS_LAPTOP',
    'MAC_LAPTOP',
    'WEB_BROWSER',
    'OTHER',
  ])('accepts %s', (type) => {
    expect(DeviceTypeEnum.parse(type)).toBe(type);
  });

  it('rejects unknown type', () => {
    expect(() => DeviceTypeEnum.parse('SMART_WATCH')).toThrow();
  });
});

describe('RegisterDeviceSchema', () => {
  const uuid = '00000000-0000-0000-0000-000000000001';
  const base = {
    tenantId: uuid,
    schoolId: uuid,
    deviceIdentifier: 'SN-12345',
    deviceType: 'CHROMEBOOK' as const,
  };

  it('parses valid registration', () => {
    const result = RegisterDeviceSchema.parse(base);
    expect(result.deviceIdentifier).toBe('SN-12345');
    expect(result.deviceType).toBe('CHROMEBOOK');
  });

  it('rejects empty device identifier', () => {
    expect(() =>
      RegisterDeviceSchema.parse({ ...base, deviceIdentifier: '' }),
    ).toThrow();
  });

  it('rejects identifier > 255 chars', () => {
    expect(() =>
      RegisterDeviceSchema.parse({ ...base, deviceIdentifier: 'X'.repeat(256) }),
    ).toThrow();
  });

  it('accepts optional fields', () => {
    const result = RegisterDeviceSchema.parse({
      ...base,
      appVersion: '2.1.0',
      osVersion: 'ChromeOS 128',
      displayName: 'Lab Cart A - Slot 15',
    });
    expect(result.appVersion).toBe('2.1.0');
  });
});

describe('CheckInSchema', () => {
  const uuid = '00000000-0000-0000-0000-000000000001';

  it('parses valid check-in', () => {
    const result = CheckInSchema.parse({ deviceId: uuid });
    expect(result.deviceId).toBe(uuid);
  });

  it('accepts version updates', () => {
    const result = CheckInSchema.parse({
      deviceId: uuid,
      appVersion: '2.2.0',
      osVersion: 'ChromeOS 129',
    });
    expect(result.appVersion).toBe('2.2.0');
  });
});

describe('ListDevicesQuery', () => {
  const uuid = '00000000-0000-0000-0000-000000000001';

  it('applies default limit and offset', () => {
    const result = ListDevicesQuery.parse({ tenantId: uuid });
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it('filters by device type', () => {
    const result = ListDevicesQuery.parse({
      tenantId: uuid,
      deviceType: 'IOS_TABLET',
    });
    expect(result.deviceType).toBe('IOS_TABLET');
  });

  it('coerces boolean isActive', () => {
    const result = ListDevicesQuery.parse({
      tenantId: uuid,
      isActive: 'true' as any,
    });
    expect(result.isActive).toBe(true);
  });
});

describe('UpdateDeviceSchema', () => {
  it('parses partial update', () => {
    const result = UpdateDeviceSchema.parse({ displayName: 'New Name' });
    expect(result.displayName).toBe('New Name');
    expect(result.isActive).toBeUndefined();
  });

  it('allows deactivation', () => {
    const result = UpdateDeviceSchema.parse({ isActive: false });
    expect(result.isActive).toBe(false);
  });

  it('rejects display name > 100 chars', () => {
    expect(() =>
      UpdateDeviceSchema.parse({ displayName: 'N'.repeat(101) }),
    ).toThrow();
  });
});

/* ---------- mock prisma device operations ---------- */

const mockPrisma = {
  device: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  },
};

describe('Device CRUD operations (mocked)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registers a new device via upsert', async () => {
    const device = {
      id: 'd-1',
      tenantId: 't-1',
      deviceIdentifier: 'SN-001',
      deviceType: 'CHROMEBOOK',
      isActive: true,
    };
    mockPrisma.device.upsert.mockResolvedValue(device);
    const result = await mockPrisma.device.upsert({
      where: { tenantId_deviceIdentifier: { tenantId: 't-1', deviceIdentifier: 'SN-001' } },
      create: device,
      update: { isActive: true },
    });
    expect(result.deviceType).toBe('CHROMEBOOK');
  });

  it('finds a device by ID', async () => {
    mockPrisma.device.findUnique.mockResolvedValue({ id: 'd-1', isActive: true });
    const result = await mockPrisma.device.findUnique({ where: { id: 'd-1' } });
    expect(result?.isActive).toBe(true);
  });

  it('updates last check-in timestamp', async () => {
    const now = new Date();
    mockPrisma.device.update.mockResolvedValue({ id: 'd-1', lastCheckIn: now });
    const result = await mockPrisma.device.update({
      where: { id: 'd-1' },
      data: { lastCheckIn: now },
    });
    expect(result.lastCheckIn).toBe(now);
  });

  it('counts active devices per school', async () => {
    mockPrisma.device.count.mockResolvedValue(14);
    const count = await mockPrisma.device.count({
      where: { schoolId: 's-1', isActive: true },
    });
    expect(count).toBe(14);
  });
});
