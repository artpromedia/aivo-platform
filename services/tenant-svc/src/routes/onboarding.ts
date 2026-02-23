/**
 * AIVO Tenant Service — District Onboarding Routes
 *
 * Sprint T2-06: District admin onboarding workflow endpoints.
 *
 * POST /onboarding/tenants               — create tenant with initial config
 * POST /onboarding/tenants/:id/agreement — record signed master agreement
 * POST /onboarding/tenants/:id/schools   — add/update school configuration
 * POST /onboarding/tenants/:id/go-live   — activate district
 * GET  /onboarding/tenants/:id/status    — return onboarding checklist status
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { DistrictLookupService } from '../services/district-lookup.service.js';
import { triggerCurriculumGeneration } from '../services/curriculum-trigger.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schemas
// ══════════════════════════════════════════════════════════════════════════════

const onboardTenantSchema = z.object({
  name: z.string().min(2).max(200),
  stateCode: z.string().length(2),
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  zipCode: z.string().min(5).max(10),
  contactName: z.string().min(2).max(100),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7).max(20).optional(),
  estimatedSchools: z.number().int().min(1).max(5000),
  estimatedStudents: z.number().int().min(1).max(500000),
  ncesDistrictId: z.string().optional(),
});

const agreementSchema = z.object({
  signeeName: z.string().min(2).max(100),
  signeeTitle: z.string().min(2).max(100),
  signeeEmail: z.string().email(),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms of service' }),
  }),
  agreedToFerpa: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the FERPA/COPPA agreement' }),
  }),
});

const schoolConfigSchema = z.object({
  schools: z.array(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(2).max(200),
      address: z.string().optional(),
      gradeLevels: z.array(z.string()).optional(),
      adminEmail: z.string().email().optional(),
      programs: z.array(z.string()).optional(),
    })
  ),
});

// ══════════════════════════════════════════════════════════════════════════════
// Route Registration
// ══════════════════════════════════════════════════════════════════════════════

export async function registerOnboardingRoutes(fastify: FastifyInstance) {
  // ──────────────────────────────────────────────────────────────────────────
  // POST /onboarding/tenants — Create tenant with initial onboarding config
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/tenants', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = onboardTenantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;

    // Generate subdomain from district name
    const subdomain = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 63);

    const tenant = await prisma.tenant.create({
      data: {
        type: 'DISTRICT',
        name: data.name,
        primaryDomain: `${subdomain}.aivo.ai`,
        subdomain,
        status: 'ACTIVE',
        stateCode: data.stateCode,
        zipCode: data.zipCode,
        ncesDistrictId: data.ncesDistrictId,
        settingsJson: {
          onboarding: {
            contactName: data.contactName,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone ?? null,
            address: data.address,
            city: data.city,
            estimatedSchools: data.estimatedSchools,
            estimatedStudents: data.estimatedStudents,
            startedAt: new Date().toISOString(),
            completedSteps: ['district-info'],
          },
        },
      },
    });

    return reply.status(201).send({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        status: tenant.status,
      },
      onboardingStatus: buildOnboardingStatus(tenant),
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /onboarding/tenants/:id/agreement — Record signed master agreement
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/tenants/:id/agreement', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const parsed = agreementSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    const agreement = {
      signeeName: parsed.data.signeeName,
      signeeTitle: parsed.data.signeeTitle,
      signeeEmail: parsed.data.signeeEmail,
      agreedToTerms: true,
      agreedToFerpa: true,
      signedAt: new Date().toISOString(),
      ipAddress:
        (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        request.ip ??
        'unknown',
    };

    const settings = (tenant.settingsJson as Record<string, unknown>) ?? {};
    const onboarding = (settings.onboarding as Record<string, unknown>) ?? {};
    const completedSteps = (onboarding.completedSteps as string[]) ?? [];
    if (!completedSteps.includes('agreement')) {
      completedSteps.push('agreement');
    }

    await prisma.tenant.update({
      where: { id },
      data: {
        settingsJson: {
          ...settings,
          onboarding: {
            ...onboarding,
            completedSteps,
            agreement,
          },
        },
      },
    });

    // Create audit event
    await prisma.tenantAuditEvent.create({
      data: {
        tenantId: id,
        eventType: 'CONFIG_UPDATED',
        actorEmail: parsed.data.signeeEmail,
        actorRole: 'DISTRICT_ADMIN',
        description: `Master agreement signed by ${parsed.data.signeeName} (${parsed.data.signeeTitle})`,
        metadata: agreement,
      },
    });

    return reply.send({
      success: true,
      agreement: {
        signedAt: agreement.signedAt,
        signeeName: agreement.signeeName,
      },
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /onboarding/tenants/:id/schools — Add/update school configuration
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/tenants/:id/schools', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const parsed = schoolConfigSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    const results: Array<{ id: string; name: string; action: string }> = [];

    for (const school of parsed.data.schools) {
      if (school.id) {
        // Update existing school
        const updated = await prisma.school.update({
          where: { id: school.id },
          data: {
            name: school.name,
            address: school.address,
          },
        });
        results.push({ id: updated.id, name: updated.name, action: 'updated' });
      } else {
        // Create new school
        const created = await prisma.school.create({
          data: {
            tenantId: id,
            name: school.name,
            address: school.address,
          },
        });
        results.push({ id: created.id, name: created.name, action: 'created' });
      }
    }

    // Mark step complete
    const settings = (tenant.settingsJson as Record<string, unknown>) ?? {};
    const onboarding = (settings.onboarding as Record<string, unknown>) ?? {};
    const completedSteps = (onboarding.completedSteps as string[]) ?? [];
    if (!completedSteps.includes('schools')) {
      completedSteps.push('schools');
    }

    await prisma.tenant.update({
      where: { id },
      data: {
        settingsJson: {
          ...settings,
          onboarding: { ...onboarding, completedSteps },
        },
      },
    });

    return reply.send({ schools: results });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /onboarding/tenants/:id/go-live — Activate district
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/tenants/:id/go-live', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { schools: true },
    });
    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    const status = buildOnboardingStatus(tenant);
    const incomplete = status.steps.filter((s) => !s.completed);
    if (incomplete.length > 0) {
      return reply.status(400).send({
        error: 'Cannot go live — incomplete onboarding steps',
        incompleteSteps: incomplete.map((s) => s.id),
      });
    }

    // Mark as live
    const settings = (tenant.settingsJson as Record<string, unknown>) ?? {};
    const onboarding = (settings.onboarding as Record<string, unknown>) ?? {};
    const completedSteps = (onboarding.completedSteps as string[]) ?? [];
    if (!completedSteps.includes('verification')) {
      completedSteps.push('verification');
    }

    await prisma.tenant.update({
      where: { id },
      data: {
        settingsJson: {
          ...settings,
          onboarding: {
            ...onboarding,
            completedSteps,
            goLiveAt: new Date().toISOString(),
          },
        },
      },
    });

    await prisma.tenantAuditEvent.create({
      data: {
        tenantId: id,
        eventType: 'TENANT_UPDATED',
        actorRole: 'DISTRICT_ADMIN',
        description: `District "${tenant.name}" activated and went live`,
        metadata: { goLiveAt: new Date().toISOString() },
      },
    });

    // ── Trigger AI curriculum generation (fire-and-forget) ──────────────
    const tenantStateCode = (tenant as Record<string, unknown>).stateCode as string | undefined;
    const tenantZipCode = (tenant as Record<string, unknown>).zipCode as string | undefined;

    if (tenantStateCode && tenantZipCode) {
      const districtLookup = new DistrictLookupService(prisma);
      districtLookup
        .autoDetectFromLocation({ zipCode: tenantZipCode, stateCode: tenantStateCode })
        .then((detection) => {
          return triggerCurriculumGeneration(
            {
              tenantId: id,
              stateCode: detection.tenantConfigUpdates.stateCode || tenantStateCode,
              curriculumStandards: detection.curriculum.curriculumStandards,
              triggeredBy: 'onboarding:go-live',
            },
            fastify.log,
          );
        })
        .catch((err) => {
          fastify.log.error(
            { err, tenantId: id },
            '[GoLive] Failed to trigger curriculum generation',
          );
        });
    }

    return reply.send({
      success: true,
      message: `District "${tenant.name}" is now live!`,
      goLiveAt: new Date().toISOString(),
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /onboarding/tenants/:id/status — Return onboarding checklist
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get('/tenants/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { schools: true },
    });
    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    return reply.send(buildOnboardingStatus(tenant));
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════════

interface OnboardingStatus {
  tenantId: string;
  tenantName: string;
  overallProgress: number;
  isComplete: boolean;
  steps: Array<{
    id: string;
    label: string;
    completed: boolean;
    completedAt?: string;
    details?: Record<string, unknown>;
  }>;
}

function buildOnboardingStatus(
  tenant: {
    id: string;
    name: string;
    settingsJson: unknown;
    schools?: Array<{ id: string; name: string }>;
  },
): OnboardingStatus {
  const settings = (tenant.settingsJson as Record<string, unknown>) ?? {};
  const onboarding = (settings.onboarding as Record<string, unknown>) ?? {};
  const completedSteps = (onboarding.completedSteps as string[]) ?? [];
  const agreement = onboarding.agreement as Record<string, unknown> | undefined;

  const steps = [
    {
      id: 'district-info',
      label: 'District Information',
      completed: completedSteps.includes('district-info'),
      details: {
        contactName: onboarding.contactName,
        contactEmail: onboarding.contactEmail,
      },
    },
    {
      id: 'agreement',
      label: 'Master Agreement',
      completed: completedSteps.includes('agreement'),
      completedAt: agreement?.signedAt as string | undefined,
      details: agreement
        ? { signeeName: agreement.signeeName, signedAt: agreement.signedAt }
        : undefined,
    },
    {
      id: 'sis-integration',
      label: 'SIS Integration',
      completed: completedSteps.includes('sis-integration'),
    },
    {
      id: 'schools',
      label: 'School Configuration',
      completed: completedSteps.includes('schools'),
      details: {
        schoolCount: tenant.schools?.length ?? 0,
        schools: tenant.schools?.map((s) => ({ id: s.id, name: s.name })),
      },
    },
    {
      id: 'consent-forms',
      label: 'Consent Forms',
      completed: completedSteps.includes('consent-forms'),
    },
    {
      id: 'verification',
      label: 'Verification & Launch',
      completed: completedSteps.includes('verification'),
      completedAt: onboarding.goLiveAt as string | undefined,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    overallProgress: Math.round((completedCount / steps.length) * 100),
    isComplete: completedCount === steps.length,
    steps,
  };
}
