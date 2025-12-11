import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { GradeBand } from '@prisma/client';

// ─────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────

/**
 * Policy configuration schema
 * Contains all enforceable device policies
 */
const PolicyConfig = z.object({
  // Kiosk mode - locks device to Aivo app only
  kioskMode: z.boolean().default(false),
  
  // Maximum days device can operate offline before requiring sync
  maxOfflineDays: z.number().int().min(1).max(30).default(7),
  
  // Grade band restriction - limits content to age-appropriate material
  gradeBand: z.nativeEnum(GradeBand).nullable().optional(),
  
  // Screen time limits (minutes per day)
  dailyScreenTimeLimit: z.number().int().min(0).max(1440).nullable().optional(),
  
  // Allowed hours (24h format)
  allowedStartHour: z.number().int().min(0).max(23).nullable().optional(),
  allowedEndHour: z.number().int().min(0).max(23).nullable().optional(),
  
  // Content restrictions
  restrictExternalLinks: z.boolean().default(true),
  requireWifiForSync: z.boolean().default(false),
  
  // Update policy
  autoUpdateEnabled: z.boolean().default(true),
  minimumAppVersion: z.string().nullable().optional(),
});

const CreatePolicyBody = z.object({
  devicePoolId: z.string().uuid(),
  config: PolicyConfig,
});

const UpdatePolicyBody = z.object({
  config: PolicyConfig.partial(),
});

const PolicyListQuery = z.object({
  tenantId: z.string().uuid(),
  schoolId: z.string().uuid().optional(),
});

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

export async function policyRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /policies
   * Create or update a policy for a device pool
   */
  app.post('/policies', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = CreatePolicyBody.parse(request.body);

    // Verify pool exists
    const pool = await app.prisma.devicePool.findUnique({
      where: { id: body.devicePoolId },
    });

    if (!pool) {
      return reply.status(404).send({ error: 'Device pool not found' });
    }

    // Upsert policy (one policy per pool)
    const policy = await app.prisma.devicePolicy.upsert({
      where: { devicePoolId: body.devicePoolId },
      create: {
        devicePoolId: body.devicePoolId,
        policyJson: body.config,
      },
      update: {
        policyJson: body.config,
        updatedAt: new Date(),
      },
      include: {
        devicePool: {
          select: { id: true, name: true, tenantId: true },
        },
      },
    });

    return reply.status(201).send(policy);
  });

  /**
   * GET /policies
   * List all policies for a tenant (optionally filtered by school)
   */
  app.get('/policies', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = PolicyListQuery.parse(request.query);

    const policies = await app.prisma.devicePolicy.findMany({
      where: {
        devicePool: {
          tenantId: query.tenantId,
          ...(query.schoolId && { schoolId: query.schoolId }),
        },
      },
      include: {
        devicePool: {
          select: {
            id: true,
            name: true,
            gradeBand: true,
            schoolId: true,
            _count: { select: { memberships: true } },
          },
        },
      },
      orderBy: {
        devicePool: { name: 'asc' },
      },
    });

    return reply.send({ policies });
  });

  /**
   * GET /policies/:policyId
   * Get a specific policy
   */
  app.get('/policies/:policyId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { policyId } = request.params as { policyId: string };

    const policy = await app.prisma.devicePolicy.findUnique({
      where: { id: policyId },
      include: {
        devicePool: {
          include: {
            _count: { select: { memberships: true } },
          },
        },
      },
    });

    if (!policy) {
      return reply.status(404).send({ error: 'Policy not found' });
    }

    return reply.send(policy);
  });

  /**
   * GET /policies/pool/:poolId
   * Get policy by pool ID
   */
  app.get('/policies/pool/:poolId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { poolId } = request.params as { poolId: string };

    const policy = await app.prisma.devicePolicy.findUnique({
      where: { devicePoolId: poolId },
      include: {
        devicePool: {
          select: { id: true, name: true, gradeBand: true },
        },
      },
    });

    if (!policy) {
      return reply.status(404).send({ error: 'Policy not found for this pool' });
    }

    return reply.send(policy);
  });

  /**
   * PATCH /policies/:policyId
   * Update a policy configuration
   */
  app.patch('/policies/:policyId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { policyId } = request.params as { policyId: string };
    const body = UpdatePolicyBody.parse(request.body);

    // Get existing policy
    const existing = await app.prisma.devicePolicy.findUnique({
      where: { id: policyId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Policy not found' });
    }

    // Merge with existing config
    const existingConfig = existing.policyJson as Record<string, unknown>;
    const mergedConfig = { ...existingConfig, ...body.config };

    const policy = await app.prisma.devicePolicy.update({
      where: { id: policyId },
      data: {
        policyJson: mergedConfig,
        updatedAt: new Date(),
      },
      include: {
        devicePool: {
          select: { id: true, name: true },
        },
      },
    });

    return reply.send(policy);
  });

  /**
   * DELETE /policies/:policyId
   * Delete a policy (pool will use defaults)
   */
  app.delete('/policies/:policyId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { policyId } = request.params as { policyId: string };

    await app.prisma.devicePolicy.delete({
      where: { id: policyId },
    });

    return reply.status(204).send();
  });

  /**
   * GET /policies/defaults
   * Get the default policy configuration
   */
  app.get('/policies/defaults', async (_request: FastifyRequest, reply: FastifyReply) => {
    const defaults = PolicyConfig.parse({});
    return reply.send({ defaults });
  });

  /**
   * POST /policies/:policyId/validate
   * Validate a device against a policy
   * Returns compliance status and any violations
   */
  app.post('/policies/:policyId/validate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { policyId } = request.params as { policyId: string };
    const deviceInfo = z.object({
      appVersion: z.string(),
      lastSyncAt: z.string().datetime(),
      currentHour: z.number().int().min(0).max(23).optional(),
    }).parse(request.body);

    const policy = await app.prisma.devicePolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      return reply.status(404).send({ error: 'Policy not found' });
    }

    const config = policy.policyJson as Record<string, unknown>;
    const violations: string[] = [];
    let compliant = true;

    // Check offline duration
    const lastSync = new Date(deviceInfo.lastSyncAt);
    const daysSinceSync = Math.floor((Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24));
    const maxOfflineDays = (config.maxOfflineDays as number) ?? 7;
    
    if (daysSinceSync > maxOfflineDays) {
      violations.push(`Device has been offline for ${daysSinceSync} days (max: ${maxOfflineDays})`);
      compliant = false;
    }

    // Check minimum app version
    const minVersion = config.minimumAppVersion as string | null;
    if (minVersion && compareVersions(deviceInfo.appVersion, minVersion) < 0) {
      violations.push(`App version ${deviceInfo.appVersion} is below minimum ${minVersion}`);
      compliant = false;
    }

    // Check allowed hours
    if (deviceInfo.currentHour !== undefined) {
      const startHour = config.allowedStartHour as number | null;
      const endHour = config.allowedEndHour as number | null;
      
      if (startHour !== null && endHour !== null) {
        const currentHour = deviceInfo.currentHour;
        const inAllowedHours = startHour <= endHour
          ? currentHour >= startHour && currentHour < endHour
          : currentHour >= startHour || currentHour < endHour;
        
        if (!inAllowedHours) {
          violations.push(`Current hour ${currentHour} is outside allowed hours (${startHour}-${endHour})`);
          compliant = false;
        }
      }
    }

    return reply.send({
      compliant,
      violations,
      policy: config,
    });
  });
}

/**
 * Compare semantic versions
 * Returns: -1 if a < b, 0 if equal, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  
  return 0;
}
