import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { DeviceType } from '../../generated/prisma-client/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

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
  schoolId: z.string().uuid().optional(),
  deviceIdentifier: z.string().min(1).max(255),
  deviceType: DeviceTypeEnum,
  appVersion: z.string().min(1).max(50),
  osVersion: z.string().min(1).max(50),
  displayName: z.string().max(255).optional(),
});

const CheckInSchema = z.object({
  deviceId: z.string().uuid(),
  appVersion: z.string().min(1).max(50),
  osVersion: z.string().min(1).max(50),
});

const ListDevicesQuery = z.object({
  tenantId: z.string().uuid(),
  schoolId: z.string().uuid().optional(),
  poolId: z.string().uuid().optional(),
  deviceType: DeviceTypeEnum.optional(),
  appVersion: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  lastCheckInBefore: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const UpdateDeviceSchema = z.object({
  displayName: z.string().max(255).optional(),
  schoolId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface PolicyJson {
  kioskMode?: boolean;
  maxOfflineDays?: number;
  gradeBand?: string;
  allowedApps?: string[];
  restrictParentSwitching?: boolean;
}

interface PolicySnapshot {
  kioskMode: boolean;
  maxOfflineDays: number | null;
  gradeBand: string | null;
  allowedApps: string[];
  restrictParentSwitching: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getClientIp(request: { ip: string; headers: Record<string, string | string[] | undefined> }): string | null {
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return first?.trim() ?? null;
  }
  return request.ip ?? null;
}

function mergePolicies(policies: PolicyJson[]): PolicySnapshot {
  // Merge multiple policies - most restrictive wins
  const merged: PolicySnapshot = {
    kioskMode: false,
    maxOfflineDays: null,
    gradeBand: null,
    allowedApps: [],
    restrictParentSwitching: false,
  };

  for (const policy of policies) {
    if (policy.kioskMode) merged.kioskMode = true;
    if (policy.restrictParentSwitching) merged.restrictParentSwitching = true;
    
    if (policy.maxOfflineDays !== undefined) {
      if (merged.maxOfflineDays === null || policy.maxOfflineDays < merged.maxOfflineDays) {
        merged.maxOfflineDays = policy.maxOfflineDays;
      }
    }
    
    if (policy.gradeBand && !merged.gradeBand) {
      merged.gradeBand = policy.gradeBand;
    }
    
    if (policy.allowedApps) {
      merged.allowedApps = [...new Set([...merged.allowedApps, ...policy.allowedApps])];
    }
  }

  return merged;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const deviceRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify;

  // ────────────────────────────────────────────────────────────────────────────
  // POST /devices/register - Register or update a device
  // ────────────────────────────────────────────────────────────────────────────
  fastify.post('/register', async (request, reply) => {
    const body = RegisterDeviceSchema.parse(request.body);
    const ipAddress = getClientIp(request);

    // Upsert device by tenant + identifier
    const device = await prisma.device.upsert({
      where: {
        tenantId_deviceIdentifier: {
          tenantId: body.tenantId,
          deviceIdentifier: body.deviceIdentifier,
        },
      },
      create: {
        tenantId: body.tenantId,
        schoolId: body.schoolId,
        deviceIdentifier: body.deviceIdentifier,
        deviceType: body.deviceType as DeviceType,
        appVersion: body.appVersion,
        osVersion: body.osVersion,
        displayName: body.displayName,
        lastIpAddress: ipAddress,
        lastCheckInAt: new Date(),
      },
      update: {
        appVersion: body.appVersion,
        osVersion: body.osVersion,
        lastIpAddress: ipAddress,
        lastCheckInAt: new Date(),
        ...(body.displayName && { displayName: body.displayName }),
        ...(body.schoolId && { schoolId: body.schoolId }),
      },
      include: {
        poolMemberships: {
          include: {
            pool: {
              include: {
                policy: true,
              },
            },
          },
        },
      },
    });

    // Log registration event
    await prisma.deviceEvent.create({
      data: {
        deviceId: device.id,
        eventType: 'REGISTERED',
        eventData: {
          appVersion: body.appVersion,
          osVersion: body.osVersion,
          deviceType: body.deviceType,
        },
        ipAddress,
      },
    });

    // Get assigned pools and policies
    const pools = device.poolMemberships.map((m) => ({
      id: m.pool.id,
      name: m.pool.name,
      gradeBand: m.pool.gradeBand,
    }));

    const policies = device.poolMemberships
      .filter((m) => m.pool.policy)
      .map((m) => m.pool.policy!.policyJson as PolicyJson);

    const policySnapshot = mergePolicies(policies);

    return reply.status(200).send({
      deviceId: device.id,
      devicePools: pools,
      policy: policySnapshot,
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /devices/check-in - Periodic heartbeat
  // ────────────────────────────────────────────────────────────────────────────
  fastify.post('/check-in', async (request, reply) => {
    const body = CheckInSchema.parse(request.body);
    const ipAddress = getClientIp(request);

    // Update device
    const device = await prisma.device.update({
      where: { id: body.deviceId },
      data: {
        appVersion: body.appVersion,
        osVersion: body.osVersion,
        lastIpAddress: ipAddress,
        lastCheckInAt: new Date(),
      },
      include: {
        poolMemberships: {
          include: {
            pool: {
              include: {
                policy: true,
              },
            },
          },
        },
      },
    });

    // Log check-in event
    await prisma.deviceEvent.create({
      data: {
        deviceId: device.id,
        eventType: 'CHECK_IN',
        eventData: {
          appVersion: body.appVersion,
          osVersion: body.osVersion,
        },
        ipAddress,
      },
    });

    // Get current policy snapshot
    const policies = device.poolMemberships
      .filter((m) => m.pool.policy)
      .map((m) => m.pool.policy!.policyJson as PolicyJson);

    const policySnapshot = mergePolicies(policies);

    return reply.status(200).send({
      deviceId: device.id,
      lastCheckInAt: device.lastCheckInAt.toISOString(),
      policy: policySnapshot,
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /devices - List devices with filters
  // ────────────────────────────────────────────────────────────────────────────
  fastify.get('/', async (request, reply) => {
    const query = ListDevicesQuery.parse(request.query);

    const where: Parameters<typeof prisma.device.findMany>[0]['where'] = {
      tenantId: query.tenantId,
    };

    if (query.schoolId) {
      where.schoolId = query.schoolId;
    }

    if (query.deviceType) {
      where.deviceType = query.deviceType as DeviceType;
    }

    if (query.appVersion) {
      where.appVersion = query.appVersion;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    if (query.lastCheckInBefore) {
      where.lastCheckInAt = {
        lt: new Date(query.lastCheckInBefore),
      };
    }

    if (query.poolId) {
      where.poolMemberships = {
        some: {
          devicePoolId: query.poolId,
        },
      };
    }

    const [devices, total] = await Promise.all([
      prisma.device.findMany({
        where,
        include: {
          poolMemberships: {
            include: {
              pool: {
                select: {
                  id: true,
                  name: true,
                  gradeBand: true,
                },
              },
            },
          },
        },
        orderBy: { lastCheckInAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.device.count({ where }),
    ]);

    return reply.status(200).send({
      devices: devices.map((d) => ({
        id: d.id,
        tenantId: d.tenantId,
        schoolId: d.schoolId,
        deviceIdentifier: obfuscateIdentifier(d.deviceIdentifier),
        deviceType: d.deviceType,
        appVersion: d.appVersion,
        osVersion: d.osVersion,
        lastCheckInAt: d.lastCheckInAt.toISOString(),
        lastIpAddress: d.lastIpAddress,
        displayName: d.displayName,
        isActive: d.isActive,
        pools: d.poolMemberships.map((m) => ({
          id: m.pool.id,
          name: m.pool.name,
          gradeBand: m.pool.gradeBand,
        })),
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      total,
      limit: query.limit,
      offset: query.offset,
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /devices/:id - Get single device
  // ────────────────────────────────────────────────────────────────────────────
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        poolMemberships: {
          include: {
            pool: {
              include: {
                policy: true,
              },
            },
          },
        },
      },
    });

    if (!device) {
      return reply.status(404).send({ error: 'Device not found' });
    }

    const policies = device.poolMemberships
      .filter((m) => m.pool.policy)
      .map((m) => m.pool.policy!.policyJson as PolicyJson);

    return reply.status(200).send({
      id: device.id,
      tenantId: device.tenantId,
      schoolId: device.schoolId,
      deviceIdentifier: obfuscateIdentifier(device.deviceIdentifier),
      deviceType: device.deviceType,
      appVersion: device.appVersion,
      osVersion: device.osVersion,
      lastCheckInAt: device.lastCheckInAt.toISOString(),
      lastIpAddress: device.lastIpAddress,
      displayName: device.displayName,
      isActive: device.isActive,
      pools: device.poolMemberships.map((m) => ({
        id: m.pool.id,
        name: m.pool.name,
        gradeBand: m.pool.gradeBand,
      })),
      policy: mergePolicies(policies),
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // PATCH /devices/:id - Update device
  // ────────────────────────────────────────────────────────────────────────────
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateDeviceSchema.parse(request.body);

    const device = await prisma.device.update({
      where: { id },
      data: {
        ...(body.displayName !== undefined && { displayName: body.displayName }),
        ...(body.schoolId !== undefined && { schoolId: body.schoolId }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return reply.status(200).send({
      id: device.id,
      displayName: device.displayName,
      schoolId: device.schoolId,
      isActive: device.isActive,
      updatedAt: device.updatedAt.toISOString(),
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // DELETE /devices/:id - Remove device
  // ────────────────────────────────────────────────────────────────────────────
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await prisma.device.delete({
      where: { id },
    });

    return reply.status(204).send();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /devices/stats - Get device statistics
  // ────────────────────────────────────────────────────────────────────────────
  fastify.get('/stats', async (request, reply) => {
    const { tenantId } = request.query as { tenantId: string };

    if (!tenantId) {
      return reply.status(400).send({ error: 'tenantId is required' });
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalDevices,
      activeDevices,
      checkedInLast24h,
      checkedInLast7d,
      byType,
      byVersion,
    ] = await Promise.all([
      prisma.device.count({ where: { tenantId } }),
      prisma.device.count({ where: { tenantId, isActive: true } }),
      prisma.device.count({
        where: { tenantId, lastCheckInAt: { gte: oneDayAgo } },
      }),
      prisma.device.count({
        where: { tenantId, lastCheckInAt: { gte: sevenDaysAgo } },
      }),
      prisma.device.groupBy({
        by: ['deviceType'],
        where: { tenantId },
        _count: true,
      }),
      prisma.device.groupBy({
        by: ['appVersion'],
        where: { tenantId },
        _count: true,
        orderBy: { _count: { appVersion: 'desc' } },
        take: 10,
      }),
    ]);

    return reply.status(200).send({
      totalDevices,
      activeDevices,
      checkedInLast24h,
      checkedInLast7d,
      byType: byType.map((t) => ({ type: t.deviceType, count: t._count })),
      byVersion: byVersion.map((v) => ({ version: v.appVersion, count: v._count })),
    });
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function obfuscateIdentifier(identifier: string): string {
  // Show first 4 and last 4 characters, obfuscate the rest
  if (identifier.length <= 8) {
    return identifier.slice(0, 2) + '***' + identifier.slice(-2);
  }
  return identifier.slice(0, 4) + '***' + identifier.slice(-4);
}
