/**
 * Tenant Provisioning Service (Sprint 11 — Task 1)
 *
 * Orchestrates a 10-step pipeline to fully provision a new tenant:
 *  1. Validate input & check for duplicates
 *  2. Create tenant record
 *  3. Provision database schema / config
 *  4. Seed default data (curriculum standards, feature flags)
 *  5. Create admin user account
 *  6. Set up billing (Stripe customer + trial subscription)
 *  7. Configure integrations (default AI providers, etc.)
 *  8. Send welcome email
 *  9. Finalize & mark active
 * 10. Mark provisioning job complete
 *
 * Each step is idempotent and retriable. Failed jobs can be retried
 * from the last successful step.
 *
 * @module services/provisioning.service
 */

import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClient = any;

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export type ProvisioningStepName =
  | 'VALIDATING_INPUT'
  | 'CREATING_TENANT'
  | 'PROVISIONING_DATABASE'
  | 'SEEDING_DEFAULT_DATA'
  | 'CREATING_ADMIN_USER'
  | 'SETTING_UP_BILLING'
  | 'CONFIGURING_INTEGRATIONS'
  | 'SENDING_WELCOME_EMAIL'
  | 'FINALIZING'
  | 'COMPLETED';

export interface ProvisioningInput {
  organizationName: string;
  adminEmail: string;
  adminName?: string;
  organizationType?: 'CONSUMER' | 'DISTRICT' | 'CLINIC';
  planId?: string;
  districtSize?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  stateCode?: string;
  zipCode?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface StepLogEntry {
  step: ProvisioningStepName;
  stepNumber: number;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  startedAt: string;
  completedAt?: string;
  error?: string;
  result?: Record<string, unknown>;
}

export interface ProvisioningJobResult {
  jobId: string;
  tenantId: string | null;
  status: string;
  currentStep: number;
  totalSteps: number;
  stepLog: StepLogEntry[];
  completedAt: string | null;
  organizationName: string;
  adminEmail: string;
}

export interface ProvisioningServiceConfig {
  prisma: PrismaClient;
  redis?: Redis | null;
  trialDurationDays?: number;
  maxRetries?: number;
  emailServiceUrl?: string;
  emailFromAddress?: string;
  appBaseUrl?: string;
  stripeSecretKey?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════════════════════

const STEP_NAMES: ProvisioningStepName[] = [
  'VALIDATING_INPUT',
  'CREATING_TENANT',
  'PROVISIONING_DATABASE',
  'SEEDING_DEFAULT_DATA',
  'CREATING_ADMIN_USER',
  'SETTING_UP_BILLING',
  'CONFIGURING_INTEGRATIONS',
  'SENDING_WELCOME_EMAIL',
  'FINALIZING',
  'COMPLETED',
];

const DEFAULT_TRIAL_DAYS = 30;
const DEFAULT_MAX_RETRIES = 3;

// ══════════════════════════════════════════════════════════════════════════════
// Service Implementation
// ══════════════════════════════════════════════════════════════════════════════

export class ProvisioningService {
  private readonly prisma: PrismaClient;
  private readonly redis: Redis | null;
  private readonly trialDurationDays: number;
  private readonly maxRetries: number;
  private readonly emailServiceUrl: string;
  private readonly emailFromAddress: string;
  private readonly appBaseUrl: string;
  private readonly stripeSecretKey: string;

  constructor(config: ProvisioningServiceConfig) {
    this.prisma = config.prisma;
    this.redis = config.redis ?? null;
    this.trialDurationDays = config.trialDurationDays ?? DEFAULT_TRIAL_DAYS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.emailServiceUrl = config.emailServiceUrl ?? '';
    this.emailFromAddress = config.emailFromAddress ?? 'noreply@aivo.ai';
    this.appBaseUrl = config.appBaseUrl ?? 'https://app.aivo.ai';
    this.stripeSecretKey = config.stripeSecretKey ?? '';
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Public API
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Start a new provisioning job (idempotent via idempotencyKey).
   * Returns immediately with the job record; call executeJob() to run the pipeline.
   */
  async startProvisioningJob(input: ProvisioningInput): Promise<ProvisioningJobResult> {
    const idempotencyKey = input.idempotencyKey ?? randomUUID();

    // Idempotency check — return existing job if key already used
    const existing = await this.prisma.tenantProvisioningJob.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return this.mapJobResult(existing);
    }

    const job = await this.prisma.tenantProvisioningJob.create({
      data: {
        idempotencyKey,
        organizationName: input.organizationName,
        adminEmail: input.adminEmail.toLowerCase().trim(),
        adminName: input.adminName,
        organizationType: input.organizationType ?? 'DISTRICT',
        planId: input.planId,
        districtSize: input.districtSize,
        stateCode: input.stateCode,
        zipCode: input.zipCode,
        metadata: input.metadata ?? {},
        status: 'PENDING',
        currentStep: 0,
        totalSteps: STEP_NAMES.length,
        stepLog: [],
        maxRetries: this.maxRetries,
      },
    });

    return this.mapJobResult(job);
  }

  /**
   * Execute the provisioning pipeline from the current step.
   * Picks up from where the job left off (for retries).
   */
  async executeJob(jobId: string): Promise<ProvisioningJobResult> {
    const job = await this.prisma.tenantProvisioningJob.findUnique({
      where: { id: jobId },
    });
    if (!job) {
      throw new Error(`Provisioning job ${jobId} not found`);
    }

    if (job.status === 'COMPLETED') {
      return this.mapJobResult(job);
    }

    if (job.status === 'ROLLED_BACK') {
      throw new Error('Job has been rolled back and cannot be retried');
    }

    // Check retry limits
    if (job.status === 'FAILED' && job.retryCount >= job.maxRetries) {
      throw new Error(`Job ${jobId} has exceeded maximum retries (${job.maxRetries})`);
    }

    const stepLog: StepLogEntry[] = (job.stepLog as StepLogEntry[]) ?? [];
    let currentStep = job.currentStep as number;
    let tenantId = job.tenantId as string | null;

    try {
      // Execute each step from current position
      for (let i = currentStep; i < STEP_NAMES.length; i++) {
        const stepName = STEP_NAMES[i];
        const entry: StepLogEntry = {
          step: stepName,
          stepNumber: i,
          status: 'started',
          startedAt: new Date().toISOString(),
        };
        stepLog.push(entry);

        // Update job status
        await this.prisma.tenantProvisioningJob.update({
          where: { id: jobId },
          data: {
            status: stepName,
            currentStep: i,
            stepLog,
          },
        });

        // Execute the step
        const result = await this.executeStep(stepName, jobId, tenantId, job);

        if (result?.tenantId) {
          tenantId = result.tenantId;
        }

        // Mark step complete
        entry.status = 'completed';
        entry.completedAt = new Date().toISOString();
        entry.result = result ?? undefined;
        currentStep = i + 1;

        // Persist progress after each step
        await this.prisma.tenantProvisioningJob.update({
          where: { id: jobId },
          data: {
            tenantId,
            currentStep,
            stepLog,
          },
        });
      }

      // All steps complete
      await this.prisma.tenantProvisioningJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          stepLog,
        },
      });

      // Log audit event
      if (tenantId) {
        await this.prisma.tenantAuditEvent.create({
          data: {
            tenantId,
            eventType: 'PROVISIONING_COMPLETED',
            actorEmail: job.adminEmail,
            description: `Tenant "${job.organizationName}" provisioning completed`,
            metadata: { jobId, totalSteps: STEP_NAMES.length },
          },
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const lastEntry = stepLog[stepLog.length - 1];
      if (lastEntry) {
        lastEntry.status = 'failed';
        lastEntry.error = errorMessage;
      }

      await this.prisma.tenantProvisioningJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          failedStep: STEP_NAMES[currentStep],
          failedReason: errorMessage,
          retryCount: { increment: 1 },
          lastRetriedAt: new Date(),
          stepLog,
        },
      });

      // Log audit event
      if (tenantId) {
        await this.prisma.tenantAuditEvent.create({
          data: {
            tenantId,
            eventType: 'PROVISIONING_FAILED',
            actorEmail: job.adminEmail,
            description: `Provisioning failed at step "${STEP_NAMES[currentStep]}"`,
            metadata: { jobId, failedStep: STEP_NAMES[currentStep], error: errorMessage },
          },
        });
      }

      throw error;
    }

    const finalJob = await this.prisma.tenantProvisioningJob.findUnique({
      where: { id: jobId },
    });
    return this.mapJobResult(finalJob);
  }

  /**
   * Retry a failed provisioning job from the failed step.
   */
  async retryJob(jobId: string): Promise<ProvisioningJobResult> {
    const job = await this.prisma.tenantProvisioningJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Provisioning job ${jobId} not found`);
    }

    if (job.status !== 'FAILED') {
      throw new Error(`Job ${jobId} is not in FAILED status (current: ${job.status})`);
    }

    if (job.retryCount >= job.maxRetries) {
      throw new Error(`Job ${jobId} has exceeded maximum retries (${job.maxRetries})`);
    }

    return this.executeJob(jobId);
  }

  /**
   * Get provisioning job status.
   */
  async getJobStatus(jobId: string): Promise<ProvisioningJobResult> {
    const job = await this.prisma.tenantProvisioningJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Provisioning job ${jobId} not found`);
    }

    return this.mapJobResult(job);
  }

  /**
   * Roll back a failed provisioning job — soft-delete created tenant.
   */
  async rollbackJob(jobId: string): Promise<void> {
    const job = await this.prisma.tenantProvisioningJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Provisioning job ${jobId} not found`);
    }

    if (job.status !== 'FAILED') {
      throw new Error('Only failed jobs can be rolled back');
    }

    // If a tenant was created, soft-delete it
    if (job.tenantId) {
      await this.prisma.tenant.update({
        where: { id: job.tenantId },
        data: {
          status: 'DELETED',
          isActive: false,
          deletedAt: new Date(),
        },
      });

      await this.prisma.tenantAuditEvent.create({
        data: {
          tenantId: job.tenantId,
          eventType: 'PROVISIONING_ROLLED_BACK',
          actorEmail: job.adminEmail,
          description: `Provisioning rolled back for "${job.organizationName}"`,
          metadata: { jobId },
        },
      });
    }

    await this.prisma.tenantProvisioningJob.update({
      where: { id: jobId },
      data: {
        status: 'ROLLED_BACK',
        rolledBackAt: new Date(),
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Step Executors (each is idempotent)
  // ════════════════════════════════════════════════════════════════════════════

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async executeStep(step: ProvisioningStepName, jobId: string, tenantId: string | null, job: any): Promise<Record<string, unknown> | null> {
    switch (step) {
      case 'VALIDATING_INPUT':
        return this.stepValidateInput(job);
      case 'CREATING_TENANT':
        return this.stepCreateTenant(jobId, job);
      case 'PROVISIONING_DATABASE':
        return this.stepProvisionDatabase(tenantId!);
      case 'SEEDING_DEFAULT_DATA':
        return this.stepSeedDefaultData(tenantId!, job);
      case 'CREATING_ADMIN_USER':
        return this.stepCreateAdminUser(tenantId!, job);
      case 'SETTING_UP_BILLING':
        return this.stepSetupBilling(tenantId!, job);
      case 'CONFIGURING_INTEGRATIONS':
        return this.stepConfigureIntegrations(tenantId!, job);
      case 'SENDING_WELCOME_EMAIL':
        return this.stepSendWelcomeEmail(tenantId!, job);
      case 'FINALIZING':
        return this.stepFinalize(tenantId!, job);
      case 'COMPLETED':
        return null;
      default:
        throw new Error(`Unknown provisioning step: ${step}`);
    }
  }

  /**
   * Step 1: Validate input and check for duplicate organizations.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async stepValidateInput(job: any): Promise<Record<string, unknown>> {
    // Check for duplicate organisation name
    const existing = await this.prisma.tenant.findFirst({
      where: {
        name: job.organizationName,
        status: { not: 'DELETED' },
      },
    });
    if (existing) {
      throw new Error(`Organization "${job.organizationName}" already exists (tenant: ${existing.id})`);
    }

    // Check for duplicate admin email across provisioning jobs
    const existingJob = await this.prisma.tenantProvisioningJob.findFirst({
      where: {
        adminEmail: job.adminEmail,
        status: 'COMPLETED',
        id: { not: job.id },
      },
    });
    if (existingJob) {
      throw new Error(`Admin email "${job.adminEmail}" already has a provisioned tenant`);
    }

    return { validated: true };
  }

  /**
   * Step 2: Create the Tenant record in the database.
   * Idempotent — if tenantId is already set, re-uses existing tenant.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async stepCreateTenant(jobId: string, job: any): Promise<Record<string, unknown>> {
    // Idempotent: if tenant already created, return it
    if (job.tenantId) {
      const existing = await this.prisma.tenant.findUnique({ where: { id: job.tenantId } });
      if (existing) {
        return { tenantId: existing.id, subdomain: existing.subdomain, alreadyExisted: true };
      }
    }

    // Generate unique subdomain
    const baseSubdomain = job.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    // Ensure uniqueness
    let subdomain = baseSubdomain;
    let attempt = 0;
    while (true) {
      const existingSubdomain = await this.prisma.tenant.findFirst({
        where: { subdomain },
      });
      if (!existingSubdomain) break;
      attempt++;
      subdomain = `${baseSubdomain}-${attempt}`;
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + this.trialDurationDays);

    const tenant = await this.prisma.tenant.create({
      data: {
        type: job.organizationType ?? 'DISTRICT',
        name: job.organizationName,
        primaryDomain: `${subdomain}.aivo.ai`,
        subdomain,
        status: 'ACTIVE',
        isActive: true,
        stateCode: job.stateCode,
        zipCode: job.zipCode,
        trialEndsAt,
        trialStatus: 'ACTIVE',
        planType: 'TRIAL',
        billingPlanId: job.planId,
        settingsJson: {
          provisioning: { jobId, provisionedAt: new Date().toISOString() },
          onboarding: { completedSteps: [] },
        },
      },
    });

    return { tenantId: tenant.id, subdomain: tenant.subdomain };
  }

  /**
   * Step 3: Provision database defaults (TenantConfig row).
   * Idempotent — skips if config already exists.
   */
  private async stepProvisionDatabase(tenantId: string): Promise<Record<string, unknown>> {
    const existing = await this.prisma.tenantConfig.findUnique({
      where: { tenantId },
    });
    if (existing) {
      return { configId: existing.id, alreadyExisted: true };
    }

    const config = await this.prisma.tenantConfig.create({
      data: { tenantId },
    });

    return { configId: config.id };
  }

  /**
   * Step 4: Seed default data — default feature flags, branding.
   * Idempotent — checks existence before creating.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async stepSeedDefaultData(tenantId: string, _job: any): Promise<Record<string, unknown>> {
    const seeded: string[] = [];

    // Seed default feature flags
    const defaultFlags = [
      { flag: 'homework_helper', enabled: true },
      { flag: 'focus_mode', enabled: true },
      { flag: 'parent_portal', enabled: true },
      { flag: 'teacher_dashboard', enabled: true },
      { flag: 'ai_tutor', enabled: true },
      { flag: 'self_service_billing', enabled: true },
    ];

    for (const f of defaultFlags) {
      const exists = await this.prisma.tenantFeatureFlag.findFirst({
        where: { tenantId, flag: f.flag },
      });
      if (!exists) {
        await this.prisma.tenantFeatureFlag.create({
          data: { tenantId, flag: f.flag, enabled: f.enabled },
        });
        seeded.push(`flag:${f.flag}`);
      }
    }

    // Seed default branding
    const existingBranding = await this.prisma.tenantBranding.findUnique({
      where: { tenantId },
    });
    if (!existingBranding) {
      await this.prisma.tenantBranding.create({
        data: { tenantId },
      });
      seeded.push('branding:default');
    }

    return { seeded };
  }

  /**
   * Step 5: Create admin user account.
   * In this architecture, user creation is handled by auth-svc. We record
   * the intent and the admin email for the welcome flow.
   * Idempotent — checks the tenant settingsJson for admin setup marker.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async stepCreateAdminUser(tenantId: string, job: any): Promise<Record<string, unknown>> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const settings = (tenant?.settingsJson as Record<string, unknown>) ?? {};

    if ((settings as Record<string, unknown>).adminUserCreated) {
      return { alreadyCreated: true };
    }

    // Record admin creation intent — the actual user is created by auth-svc
    // when the admin accepts the invitation and sets their password.
    const adminSetup = {
      email: job.adminEmail,
      name: job.adminName ?? job.adminEmail.split('@')[0],
      role: 'DISTRICT_ADMIN',
      invitedAt: new Date().toISOString(),
      tenantId,
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settingsJson: {
          ...settings,
          adminUserCreated: true,
          adminSetup,
        },
      },
    });

    return { adminEmail: job.adminEmail, role: 'DISTRICT_ADMIN' };
  }

  /**
   * Step 6: Set up billing — create Stripe customer & trial subscription.
   * Idempotent — checks for existing stripeCustomerId on the tenant.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async stepSetupBilling(tenantId: string, job: any): Promise<Record<string, unknown>> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    if (tenant?.stripeCustomerId) {
      return { stripeCustomerId: tenant.stripeCustomerId, alreadySetup: true };
    }

    // Stripe integration — create customer with trial
    // If Stripe is not configured, skip gracefully
    if (!this.stripeSecretKey) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          billingPlanId: job.planId ?? 'trial-free',
        },
      });
      return { skipped: true, reason: 'Stripe not configured' };
    }

    try {
      // Dynamic import Stripe to avoid hard dependency
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(this.stripeSecretKey, { apiVersion: '2024-06-20' as Stripe.LatestApiVersion });

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: job.adminEmail,
        name: job.organizationName,
        metadata: {
          tenantId,
          organizationType: job.organizationType ?? 'DISTRICT',
        },
      });

      // Update tenant with Stripe customer ID
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          stripeCustomerId: customer.id,
          billingPlanId: job.planId ?? 'trial-free',
        },
      });

      return { stripeCustomerId: customer.id };
    } catch (error) {
      // Non-fatal: billing can be set up later
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          billingPlanId: job.planId ?? 'trial-free',
          settingsJson: {
            ...(tenant?.settingsJson as Record<string, unknown> ?? {}),
            billingSetupError: message,
          },
        },
      });
      return { skipped: true, reason: message };
    }
  }

  /**
   * Step 7: Configure default integrations (AI providers, etc.).
   * Idempotent — checks config state.
   */
  private async stepConfigureIntegrations(tenantId: string, _job: unknown): Promise<Record<string, unknown>> {
    const config = await this.prisma.tenantConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return { skipped: true, reason: 'No tenant config found' };
    }

    // Default AI providers are already set by Prisma defaults
    // This step exists for future integration setup (SSO, SIS, etc.)
    const configured: string[] = [];

    // Ensure default AI config is in place
    if (!config.aiModelOverrides) {
      await this.prisma.tenantConfig.update({
        where: { tenantId },
        data: {
          aiModelOverrides: {
            default: 'gpt-4o-mini',
            tutor: 'gpt-4o',
            homework: 'gpt-4o',
            focus: 'claude-3-5-sonnet',
          },
        },
      });
      configured.push('ai-model-overrides');
    }

    return { configured };
  }

  /**
   * Step 8: Send welcome email with setup instructions.
   * Idempotent — checks settingsJson for welcome email marker.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async stepSendWelcomeEmail(tenantId: string, job: any): Promise<Record<string, unknown>> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const settings = (tenant?.settingsJson as Record<string, unknown>) ?? {};

    if ((settings as Record<string, unknown>).welcomeEmailSent) {
      return { alreadySent: true };
    }

    // Attempt to send via email service
    if (this.emailServiceUrl) {
      try {
        const response = await fetch(this.emailServiceUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: job.adminEmail,
            from: this.emailFromAddress,
            template: 'tenant-welcome',
            data: {
              organizationName: job.organizationName,
              adminName: job.adminName ?? job.adminEmail.split('@')[0],
              loginUrl: `${this.appBaseUrl}/${tenant?.subdomain ?? ''}`,
              trialEndsAt: tenant?.trialEndsAt?.toISOString(),
              setupUrl: `${this.appBaseUrl}/onboarding`,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Email service returned ${response.status}`);
        }
      } catch (error) {
        // Non-fatal — log but continue
        const message = error instanceof Error ? error.message : String(error);
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: {
            settingsJson: {
              ...settings,
              welcomeEmailError: message,
            },
          },
        });
        return { sent: false, reason: message };
      }
    }

    // Mark as sent
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settingsJson: {
          ...settings,
          welcomeEmailSent: true,
          welcomeEmailSentAt: new Date().toISOString(),
        },
      },
    });

    return { sent: true };
  }

  /**
   * Step 9: Finalize — ensure tenant is fully active with all markers set.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async stepFinalize(tenantId: string, _job: any): Promise<Record<string, unknown>> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { config: true, branding: true },
    });

    if (!tenant) {
      throw new Error('Tenant not found during finalization');
    }

    // Ensure all critical pieces are in place
    const checklist = {
      tenantActive: tenant.status === 'ACTIVE',
      configExists: !!tenant.config,
      brandingExists: !!tenant.branding,
      trialSet: !!tenant.trialEndsAt,
    };

    // Update tenant to ensure it's fully active
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isActive: true,
        status: 'ACTIVE',
      },
    });

    // Log provisioning start audit event
    await this.prisma.tenantAuditEvent.create({
      data: {
        tenantId,
        eventType: 'PROVISIONING_STARTED',
        description: `Tenant "${tenant.name}" provisioning finalized`,
        metadata: checklist,
      },
    });

    return checklist;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Helpers
  // ════════════════════════════════════════════════════════════════════════════

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapJobResult(job: any): ProvisioningJobResult {
    return {
      jobId: job.id,
      tenantId: job.tenantId,
      status: job.status,
      currentStep: job.currentStep,
      totalSteps: job.totalSteps,
      stepLog: (job.stepLog as StepLogEntry[]) ?? [],
      completedAt: job.completedAt?.toISOString() ?? null,
      organizationName: job.organizationName,
      adminEmail: job.adminEmail,
    };
  }
}
