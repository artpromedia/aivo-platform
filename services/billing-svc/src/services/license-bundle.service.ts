/**
 * License Bundle Service
 *
 * Manages bundled licenses that include learner, parent, and teacher access.
 * Supports bi-directional enrollment flows:
 * - District enrollment: School enrolls child → Teacher invites parent
 * - Parent subscription: Parent subscribes → Parent invites teacher
 */

import { randomBytes } from 'crypto';

import { getBundleConfig, type BundleType as ConfigBundleType } from '../config/plans.config';
import type { PrismaClient } from '../generated/prisma-client';

// Type aliases matching Prisma enums
type BundleType = 'FAMILY' | 'CLASSROOM' | 'DISTRICT_SEAT';
type BundleOrigin = 'DISTRICT_ENROLLMENT' | 'PARENT_SUBSCRIPTION' | 'TEACHER_ASSIGNMENT';
type GradeBand = 'K_2' | 'G3_5' | 'G6_8' | 'G9_12' | 'TEACHER' | 'ALL';
type LicenseBundleEventType =
  | 'BUNDLE_CREATED'
  | 'BUNDLE_ACTIVATED'
  | 'BUNDLE_SUSPENDED'
  | 'BUNDLE_CANCELLED'
  | 'PARENT_INVITED'
  | 'PARENT_ACCEPTED'
  | 'TEACHER_INVITED'
  | 'TEACHER_ACCEPTED';

export interface CreateBundleParams {
  tenantId: string;
  bundleType: BundleType;
  origin: BundleOrigin;
  learnerId: string;
  gradeBand: GradeBand;
  schoolId?: string;
  contractId?: string;
  subscriptionId?: string;
  parentEmail?: string;
  teacherEmail?: string;
  createdBy?: string;
  modules?: string[];
  startDate?: Date;
  endDate?: Date;
}

export interface InviteParentParams {
  bundleId: string;
  parentEmail: string;
  parentName?: string;
  relationship?: string;
  language?: string;
  invitedBy: string;
}

export interface InviteTeacherParams {
  bundleId: string;
  teacherEmail: string;
  teacherName?: string;
  schoolName?: string;
  message?: string;
  language?: string;
  invitedByParentId: string;
}

export interface AcceptParentInviteParams {
  inviteCode: string;
  parentUserId: string;
}

export interface AcceptTeacherInviteParams {
  inviteCode: string;
  teacherUserId: string;
}

export interface BulkInviteParams {
  tenantId: string;
  inviteType: 'parent' | 'teacher';
  items: {
    learnerId: string;
    email: string;
    name?: string;
  }[];
  schoolId?: string;
  classId?: string;
  createdBy: string;
}

export class LicenseBundleService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a unique invite code
   */
  private generateInviteCode(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Calculate default end date (1 year from start)
   */
  private getDefaultEndDate(startDate: Date): Date {
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    return endDate;
  }

  /**
   * Calculate invite expiration (14 days from now)
   */
  private getInviteExpiration(): Date {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 14);
    return expiration;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BUNDLE CREATION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new license bundle
   *
   * This is the entry point for both enrollment flows:
   * - DISTRICT_ENROLLMENT: Called when teacher assigns a license to learner
   * - PARENT_SUBSCRIPTION: Called when parent purchases a subscription
   */
  async createBundle(params: CreateBundleParams) {
    const {
      tenantId,
      bundleType,
      origin,
      learnerId,
      gradeBand,
      schoolId,
      contractId,
      subscriptionId,
      parentEmail,
      teacherEmail,
      createdBy,
      modules,
      startDate = new Date(),
      endDate,
    } = params;

    // Get bundle configuration
    const bundleConfig = getBundleConfig(bundleType as ConfigBundleType);
    const effectiveEndDate = endDate || this.getDefaultEndDate(startDate);

    // Create the bundle
    const bundle = await this.prisma.licenseBundle.create({
      data: {
        tenantId,
        bundleType,
        origin,
        status: 'PENDING',
        learnerId,
        gradeBand,
        schoolId,
        contractId,
        subscriptionId,
        startDate,
        endDate: effectiveEndDate,
        modulesJson: modules || bundleConfig.modules,
        createdBy,
      },
    });

    // Log bundle creation event
    await this.logBundleEvent({
      bundleId: bundle.id,
      tenantId,
      eventType: 'BUNDLE_CREATED',
      actorId: createdBy,
      actorType: origin === 'PARENT_SUBSCRIPTION' ? 'PARENT' : 'ADMIN',
      description: `License bundle created via ${origin.toLowerCase().replace('_', ' ')}`,
      newValue: {
        bundleType,
        origin,
        learnerId,
        gradeBand,
      },
    });

    // Auto-send invites if emails provided
    if (parentEmail && origin === 'DISTRICT_ENROLLMENT') {
      await this.inviteParent({
        bundleId: bundle.id,
        parentEmail,
        invitedBy: createdBy || 'system',
      });
    }

    if (teacherEmail && origin === 'PARENT_SUBSCRIPTION') {
      await this.inviteTeacher({
        bundleId: bundle.id,
        teacherEmail,
        invitedByParentId: createdBy || 'system',
      });
    }

    return bundle;
  }

  /**
   * Create bundle from district seat assignment
   *
   * Called when a teacher assigns a district license to a learner.
   * Automatically sends parent invite.
   */
  async createDistrictBundle(params: {
    tenantId: string;
    learnerId: string;
    gradeBand: GradeBand;
    schoolId: string;
    contractId: string;
    seatEntitlementId: string;
    parentEmail?: string;
    teacherId: string;
    createdBy: string;
  }) {
    const bundle = await this.createBundle({
      tenantId: params.tenantId,
      bundleType: 'DISTRICT_SEAT',
      origin: 'DISTRICT_ENROLLMENT',
      learnerId: params.learnerId,
      gradeBand: params.gradeBand,
      schoolId: params.schoolId,
      contractId: params.contractId,
      parentEmail: params.parentEmail,
      createdBy: params.createdBy,
    });

    // Link seat entitlement
    await this.prisma.licenseBundle.update({
      where: { id: bundle.id },
      data: {
        seatEntitlementId: params.seatEntitlementId,
        teacherUserId: params.teacherId,
      },
    });

    return bundle;
  }

  /**
   * Create bundle from parent subscription
   *
   * Called when a parent purchases a family subscription.
   * Parent can then invite their child's teacher.
   */
  async createParentBundle(params: {
    tenantId: string;
    learnerId: string;
    gradeBand: GradeBand;
    subscriptionId: string;
    parentUserId: string;
    teacherEmail?: string;
  }) {
    const bundle = await this.createBundle({
      tenantId: params.tenantId,
      bundleType: 'FAMILY',
      origin: 'PARENT_SUBSCRIPTION',
      learnerId: params.learnerId,
      gradeBand: params.gradeBand,
      subscriptionId: params.subscriptionId,
      teacherEmail: params.teacherEmail,
      createdBy: params.parentUserId,
    });

    // Set parent user immediately (they already have account)
    await this.prisma.licenseBundle.update({
      where: { id: bundle.id },
      data: {
        parentUserId: params.parentUserId,
        status: params.teacherEmail ? 'PENDING' : 'ACTIVE',
      },
    });

    // If no teacher invite needed, activate immediately
    if (!params.teacherEmail) {
      await this.activateBundle(bundle.id);
    }

    return bundle;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PARENT INVITATIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Invite a parent to join a bundle
   *
   * Used in the district enrollment flow when teacher assigns
   * a license and wants to invite the learner's parent.
   */
  async inviteParent(params: InviteParentParams) {
    const {
      bundleId,
      parentEmail,
      parentName,
      relationship,
      language: _language,
      invitedBy,
    } = params;

    // Get bundle
    const bundle = await this.prisma.licenseBundle.findUnique({
      where: { id: bundleId },
    });

    if (!bundle) {
      throw new Error('Bundle not found');
    }

    // Note: Parent invite is stored in parent-svc
    // Here we just track the invite ID and log the event
    const inviteCode = this.generateInviteCode();

    await this.prisma.licenseBundle.update({
      where: { id: bundleId },
      data: { parentInviteId: inviteCode },
    });

    await this.logBundleEvent({
      bundleId,
      tenantId: bundle.tenantId,
      eventType: 'PARENT_INVITED',
      actorId: invitedBy,
      actorType: 'ADMIN',
      description: `Parent invitation sent to ${parentEmail}`,
      newValue: {
        parentEmail,
        parentName,
        relationship,
        inviteCode,
      },
    });

    return {
      inviteCode,
      bundleId,
      parentEmail,
      expiresAt: this.getInviteExpiration(),
    };
  }

  /**
   * Accept a parent invitation
   */
  async acceptParentInvite(params: AcceptParentInviteParams) {
    const { inviteCode, parentUserId } = params;

    // Find bundle by invite code
    const bundle = await this.prisma.licenseBundle.findFirst({
      where: { parentInviteId: inviteCode },
    });

    if (!bundle) {
      throw new Error('Invalid or expired invite code');
    }

    if (bundle.parentUserId) {
      throw new Error('Invite already accepted');
    }

    // Update bundle with parent user
    await this.prisma.licenseBundle.update({
      where: { id: bundle.id },
      data: {
        parentUserId,
      },
    });

    await this.logBundleEvent({
      bundleId: bundle.id,
      tenantId: bundle.tenantId,
      eventType: 'PARENT_ACCEPTED',
      actorId: parentUserId,
      actorType: 'PARENT',
      description: 'Parent accepted invitation and joined bundle',
    });

    // Check if bundle can be activated
    await this.checkAndActivateBundle(bundle.id);

    return { bundleId: bundle.id, activated: bundle.status === 'ACTIVE' };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEACHER INVITATIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Invite a teacher to join a bundle
   *
   * Used in the parent subscription flow when parent wants to
   * invite their child's teacher for collaboration.
   */
  async inviteTeacher(params: InviteTeacherParams) {
    const {
      bundleId,
      teacherEmail,
      teacherName,
      schoolName,
      message,
      language,
      invitedByParentId,
    } = params;

    // Get bundle
    const bundle = await this.prisma.licenseBundle.findUnique({
      where: { id: bundleId },
    });

    if (!bundle) {
      throw new Error('Bundle not found');
    }

    // Verify parent owns this bundle
    if (bundle.parentUserId !== invitedByParentId) {
      throw new Error('Only the bundle owner can invite teachers');
    }

    // Create teacher invite
    const inviteCode = this.generateInviteCode();
    const expiresAt = this.getInviteExpiration();

    const invite = await this.prisma.teacherInvite.create({
      data: {
        code: inviteCode,
        tenantId: bundle.tenantId,
        bundleId,
        learnerId: bundle.learnerId,
        teacherEmail,
        teacherName,
        schoolName,
        status: 'PENDING',
        invitedByParentId,
        language: language || 'en',
        expiresAt,
        message,
      },
    });

    await this.prisma.licenseBundle.update({
      where: { id: bundleId },
      data: { teacherInviteId: invite.id },
    });

    await this.logBundleEvent({
      bundleId,
      tenantId: bundle.tenantId,
      eventType: 'TEACHER_INVITED',
      actorId: invitedByParentId,
      actorType: 'PARENT',
      description: `Teacher invitation sent to ${teacherEmail}`,
      newValue: {
        teacherEmail,
        teacherName,
        schoolName,
        inviteId: invite.id,
      },
    });

    return invite;
  }

  /**
   * Accept a teacher invitation
   */
  async acceptTeacherInvite(params: AcceptTeacherInviteParams) {
    const { inviteCode, teacherUserId } = params;

    // Find invite
    const invite = await this.prisma.teacherInvite.findUnique({
      where: { code: inviteCode },
    });

    if (!invite) {
      throw new Error('Invalid invite code');
    }

    if (invite.status !== 'PENDING') {
      throw new Error(`Invite is ${invite.status.toLowerCase()}`);
    }

    if (new Date() > invite.expiresAt) {
      await this.prisma.teacherInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      throw new Error('Invite has expired');
    }

    // Update invite
    await this.prisma.teacherInvite.update({
      where: { id: invite.id },
      data: {
        status: 'ACCEPTED',
        teacherUserId,
        acceptedAt: new Date(),
      },
    });

    // Update bundle with teacher user
    await this.prisma.licenseBundle.update({
      where: { id: invite.bundleId },
      data: {
        teacherUserId,
      },
    });

    await this.logBundleEvent({
      bundleId: invite.bundleId,
      tenantId: invite.tenantId,
      eventType: 'TEACHER_ACCEPTED',
      actorId: teacherUserId,
      actorType: 'TEACHER',
      description: 'Teacher accepted invitation and joined bundle',
    });

    // Check if bundle can be activated
    await this.checkAndActivateBundle(invite.bundleId);

    return { bundleId: invite.bundleId };
  }

  /**
   * Decline a teacher invitation
   */
  async declineTeacherInvite(inviteCode: string, reason?: string) {
    const invite = await this.prisma.teacherInvite.findUnique({
      where: { code: inviteCode },
    });

    if (invite?.status !== 'PENDING') {
      throw new Error('Invalid or already processed invite');
    }

    await this.prisma.teacherInvite.update({
      where: { id: invite.id },
      data: {
        status: 'DECLINED',
        metadataJson: { declineReason: reason },
      },
    });

    return { bundleId: invite.bundleId };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BULK OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Create a bulk invite batch for district admin enrollment
   */
  async createBulkInviteBatch(params: BulkInviteParams) {
    const { tenantId, inviteType, items, schoolId, classId, createdBy } = params;

    // Create batch
    const batch = await this.prisma.bulkInviteBatch.create({
      data: {
        tenantId,
        inviteType,
        status: 'PENDING',
        totalCount: items.length,
        createdBy,
        schoolId,
        classId,
      },
    });

    // Create batch items
    await this.prisma.bulkInviteItem.createMany({
      data: items.map((item) => ({
        batchId: batch.id,
        learnerId: item.learnerId,
        email: item.email,
        name: item.name,
        status: 'pending',
      })),
    });

    return batch;
  }

  /**
   * Process a bulk invite batch
   *
   * This should be called by a background job.
   */
  async processBulkInviteBatch(batchId: string) {
    const batch = await this.prisma.bulkInviteBatch.findUnique({
      where: { id: batchId },
      include: { items: { where: { status: 'pending' } } },
    });

    if (batch?.status !== 'PENDING') {
      throw new Error('Batch not found or already processing');
    }

    // Mark as processing
    await this.prisma.bulkInviteBatch.update({
      where: { id: batchId },
      data: {
        status: 'PROCESSING',
        processingStartedAt: new Date(),
      },
    });

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const item of batch.items) {
      try {
        if (batch.inviteType === 'parent') {
          // Check if learner already has a bundle with parent
          const existingBundle = await this.prisma.licenseBundle.findFirst({
            where: {
              learnerId: item.learnerId,
              parentUserId: { not: null },
              status: { in: ['PENDING', 'ACTIVE'] },
            },
          });

          if (existingBundle) {
            skippedCount++;
            await this.prisma.bulkInviteItem.update({
              where: { id: item.id },
              data: { status: 'skipped', error: 'Parent already linked', processedAt: new Date() },
            });
            continue;
          }

          // Create bundle and invite parent
          const bundle = await this.createBundle({
            tenantId: batch.tenantId,
            bundleType: 'DISTRICT_SEAT',
            origin: 'DISTRICT_ENROLLMENT',
            learnerId: item.learnerId,
            gradeBand: 'ALL', // Would need to determine from learner data
            schoolId: batch.schoolId || undefined,
            parentEmail: item.email,
            createdBy: batch.createdBy,
          });

          await this.prisma.bulkInviteItem.update({
            where: { id: item.id },
            data: {
              status: 'sent',
              bundleId: bundle.id,
              processedAt: new Date(),
            },
          });

          successCount++;
        }
        // Add teacher bulk invite logic if needed
      } catch (error) {
        failedCount++;
        await this.prisma.bulkInviteItem.update({
          where: { id: item.id },
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            processedAt: new Date(),
          },
        });
      }
    }

    // Update batch status
    await this.prisma.bulkInviteBatch.update({
      where: { id: batchId },
      data: {
        status: 'COMPLETED',
        successCount,
        failedCount,
        skippedCount,
        processingCompletedAt: new Date(),
      },
    });

    return { successCount, failedCount, skippedCount };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BUNDLE LIFECYCLE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Check if bundle meets activation criteria and activate if ready
   */
  async checkAndActivateBundle(bundleId: string) {
    const bundle = await this.prisma.licenseBundle.findUnique({
      where: { id: bundleId },
    });

    if (bundle?.status !== 'PENDING') {
      return false;
    }

    // Determine activation criteria based on origin
    let canActivate = false;

    if (bundle.origin === 'DISTRICT_ENROLLMENT') {
      // District bundles can activate as soon as learner is assigned
      // Parent invite is optional for activation
      canActivate = true;
    } else if (bundle.origin === 'PARENT_SUBSCRIPTION') {
      // Parent bundles require parent user, teacher is optional
      canActivate = !!bundle.parentUserId;
    }

    if (canActivate) {
      await this.activateBundle(bundleId);
      return true;
    }

    return false;
  }

  /**
   * Activate a bundle
   */
  async activateBundle(bundleId: string) {
    const bundle = await this.prisma.licenseBundle.update({
      where: { id: bundleId },
      data: { status: 'ACTIVE' },
    });

    await this.logBundleEvent({
      bundleId,
      tenantId: bundle.tenantId,
      eventType: 'BUNDLE_ACTIVATED',
      actorType: 'SYSTEM',
      description: 'Bundle activated and all licenses are now available',
    });

    return bundle;
  }

  /**
   * Suspend a bundle (e.g., payment failure)
   */
  async suspendBundle(bundleId: string, reason: string, actorId?: string) {
    const bundle = await this.prisma.licenseBundle.update({
      where: { id: bundleId },
      data: { status: 'SUSPENDED' },
    });

    await this.logBundleEvent({
      bundleId,
      tenantId: bundle.tenantId,
      eventType: 'BUNDLE_SUSPENDED',
      actorId,
      actorType: actorId ? 'ADMIN' : 'SYSTEM',
      description: `Bundle suspended: ${reason}`,
      newValue: { reason },
    });

    return bundle;
  }

  /**
   * Cancel a bundle
   */
  async cancelBundle(bundleId: string, reason: string, actorId?: string) {
    const bundle = await this.prisma.licenseBundle.update({
      where: { id: bundleId },
      data: { status: 'CANCELLED' },
    });

    await this.logBundleEvent({
      bundleId,
      tenantId: bundle.tenantId,
      eventType: 'BUNDLE_CANCELLED',
      actorId,
      actorType: actorId ? 'ADMIN' : 'SYSTEM',
      description: `Bundle cancelled: ${reason}`,
      newValue: { reason },
    });

    return bundle;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get bundle by ID
   */
  async getBundle(bundleId: string) {
    return this.prisma.licenseBundle.findUnique({
      where: { id: bundleId },
      include: {
        bundleEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Get bundles for a learner
   */
  async getBundlesForLearner(learnerId: string) {
    return this.prisma.licenseBundle.findMany({
      where: {
        learnerId,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get bundles for a parent
   */
  async getBundlesForParent(parentUserId: string) {
    return this.prisma.licenseBundle.findMany({
      where: {
        parentUserId,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get bundles for a teacher
   */
  async getBundlesForTeacher(teacherUserId: string) {
    return this.prisma.licenseBundle.findMany({
      where: {
        teacherUserId,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get pending teacher invites for a teacher email
   */
  async getPendingTeacherInvites(teacherEmail: string) {
    return this.prisma.teacherInvite.findMany({
      where: {
        teacherEmail,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get bulk invite batch status
   */
  async getBulkInviteBatch(batchId: string) {
    return this.prisma.bulkInviteBatch.findUnique({
      where: { id: batchId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Log a bundle event
   */
  private async logBundleEvent(params: {
    bundleId: string;
    tenantId: string;
    eventType: LicenseBundleEventType;
    actorId?: string;
    actorType: string;
    description: string;
    previousValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
  }) {
    await this.prisma.licenseBundleEvent.create({
      data: {
        bundleId: params.bundleId,
        tenantId: params.tenantId,
        eventType: params.eventType,
        actorId: params.actorId,
        actorType: params.actorType,
        description: params.description,
        previousValue: params.previousValue,
        newValue: params.newValue,
      },
    });
  }
}

export default LicenseBundleService;
