import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { GradeBand } from '@prisma/client';

// ─────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────

const CreatePoolBody = z.object({
  tenantId: z.string().uuid(),
  schoolId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  gradeBand: z.nativeEnum(GradeBand).optional(),
});

const UpdatePoolBody = z.object({
  name: z.string().min(1).max(100).optional(),
  gradeBand: z.nativeEnum(GradeBand).nullable().optional(),
});

const PoolListQuery = z.object({
  tenantId: z.string().uuid(),
  schoolId: z.string().uuid().optional(),
  gradeBand: z.nativeEnum(GradeBand).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const AssignDevicesBody = z.object({
  deviceIds: z.array(z.string().uuid()).min(1).max(100),
});

const RemoveDevicesBody = z.object({
  deviceIds: z.array(z.string().uuid()).min(1).max(100),
});

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

export async function poolRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /pools
   * Create a new device pool
   */
  app.post('/pools', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = CreatePoolBody.parse(request.body);

    const pool = await app.prisma.devicePool.create({
      data: {
        tenantId: body.tenantId,
        schoolId: body.schoolId ?? null,
        name: body.name,
        gradeBand: body.gradeBand ?? null,
      },
      include: {
        memberships: {
          include: { device: true },
        },
        policy: true,
      },
    });

    return reply.status(201).send(pool);
  });

  /**
   * GET /pools
   * List device pools with filtering
   */
  app.get('/pools', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = PoolListQuery.parse(request.query);

    const where = {
      tenantId: query.tenantId,
      ...(query.schoolId && { schoolId: query.schoolId }),
      ...(query.gradeBand && { gradeBand: query.gradeBand }),
    };

    const [pools, total] = await Promise.all([
      app.prisma.devicePool.findMany({
        where,
        include: {
          _count: { select: { memberships: true } },
          policy: true,
        },
        orderBy: { name: 'asc' },
        take: query.limit,
        skip: query.offset,
      }),
      app.prisma.devicePool.count({ where }),
    ]);

    return reply.send({
      pools,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    });
  });

  /**
   * GET /pools/:poolId
   * Get a specific device pool with its devices and policy
   */
  app.get('/pools/:poolId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { poolId } = request.params as { poolId: string };

    const pool = await app.prisma.devicePool.findUnique({
      where: { id: poolId },
      include: {
        memberships: {
          include: {
            device: {
              select: {
                id: true,
                deviceIdentifier: true,
                deviceType: true,
                appVersion: true,
                osVersion: true,
                lastCheckInAt: true,
              },
            },
          },
        },
        policy: true,
      },
    });

    if (!pool) {
      return reply.status(404).send({ error: 'Pool not found' });
    }

    return reply.send(pool);
  });

  /**
   * PATCH /pools/:poolId
   * Update pool details
   */
  app.patch('/pools/:poolId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { poolId } = request.params as { poolId: string };
    const body = UpdatePoolBody.parse(request.body);

    const pool = await app.prisma.devicePool.update({
      where: { id: poolId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.gradeBand !== undefined && { gradeBand: body.gradeBand }),
      },
      include: {
        _count: { select: { memberships: true } },
        policy: true,
      },
    });

    return reply.send(pool);
  });

  /**
   * DELETE /pools/:poolId
   * Delete a device pool (cascades to memberships and policy)
   */
  app.delete('/pools/:poolId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { poolId } = request.params as { poolId: string };

    await app.prisma.devicePool.delete({
      where: { id: poolId },
    });

    return reply.status(204).send();
  });

  /**
   * POST /pools/:poolId/devices
   * Assign devices to a pool
   */
  app.post('/pools/:poolId/devices', async (request: FastifyRequest, reply: FastifyReply) => {
    const { poolId } = request.params as { poolId: string };
    const body = AssignDevicesBody.parse(request.body);

    // Verify pool exists
    const pool = await app.prisma.devicePool.findUnique({
      where: { id: poolId },
    });

    if (!pool) {
      return reply.status(404).send({ error: 'Pool not found' });
    }

    // Create memberships (skip duplicates)
    const results = await Promise.allSettled(
      body.deviceIds.map((deviceId) =>
        app.prisma.devicePoolMembership.upsert({
          where: {
            deviceId_devicePoolId: { deviceId, devicePoolId: poolId },
          },
          create: { deviceId, devicePoolId: poolId },
          update: {}, // No-op if exists
        })
      )
    );

    const added = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return reply.status(200).send({
      message: `Assigned ${added} device(s) to pool`,
      added,
      failed,
    });
  });

  /**
   * DELETE /pools/:poolId/devices
   * Remove devices from a pool
   */
  app.delete('/pools/:poolId/devices', async (request: FastifyRequest, reply: FastifyReply) => {
    const { poolId } = request.params as { poolId: string };
    const body = RemoveDevicesBody.parse(request.body);

    const result = await app.prisma.devicePoolMembership.deleteMany({
      where: {
        devicePoolId: poolId,
        deviceId: { in: body.deviceIds },
      },
    });

    return reply.send({
      message: `Removed ${result.count} device(s) from pool`,
      removed: result.count,
    });
  });

  /**
   * GET /pools/:poolId/devices
   * List all devices in a pool
   */
  app.get('/pools/:poolId/devices', async (request: FastifyRequest, reply: FastifyReply) => {
    const { poolId } = request.params as { poolId: string };
    const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number };

    const pool = await app.prisma.devicePool.findUnique({
      where: { id: poolId },
    });

    if (!pool) {
      return reply.status(404).send({ error: 'Pool not found' });
    }

    const [memberships, total] = await Promise.all([
      app.prisma.devicePoolMembership.findMany({
        where: { devicePoolId: poolId },
        include: {
          device: true,
        },
        take: Number(limit),
        skip: Number(offset),
      }),
      app.prisma.devicePoolMembership.count({
        where: { devicePoolId: poolId },
      }),
    ]);

    return reply.send({
      devices: memberships.map((m) => m.device),
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  });
}
