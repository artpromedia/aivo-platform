/**
 * Caregiver Delegation Service
 *
 * Manages caregiver accounts and delegated access:
 * - Parent-initiated caregiver invitations
 * - Caregiver account creation and linking
 * - Permission management per child
 * - Limit enforcement (2 caregivers per child per license)
 */

import { logger } from '@aivo/ts-observability';

import type { Prisma } from '../../generated/prisma-client/index.js';
import { config } from '../config.js';
import type { CryptoService } from '../crypto/crypto.service.js';
import type { EmailService } from '../email/email.service.js';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '../errors.js';
import type { eventBus } from '../event-bus.js';
import type { I18nService } from '../i18n/i18n.service.js';
import type { NotificationService } from '../notification/notification.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

import type {
  CreateCaregiverInviteDto,
  AcceptCaregiverInviteDto,
  UpdateCaregiverProfileDto,
  UpdateCaregiverPermissionsDto,
  RevokeCaregiverAccessDto,
  ResendCaregiverInviteDto,
  CancelCaregiverInviteDto,
  CaregiverProfile,
  CaregiverStudentLink,
  CaregiverWithStudents,
  StudentCaregiverSummary,
  CreateCaregiverInviteResponse,
  AcceptCaregiverInviteResponse,
  CaregiverLimitInfo,
  CaregiverPermissions,
} from './caregiver.types.js';
import {
  CaregiverInvite,
  CaregiverStatus,
  CaregiverInviteStatus,
  CaregiverRelationship,
  CaregiverLinkStatus,
  DelegationAction,
  DEFAULT_CAREGIVER_PERMISSIONS,
  DEFAULT_CAREGIVER_NOTIFICATION_PREFERENCES,
  CAREGIVER_INVITE_EXPIRY_DAYS,
  DEFAULT_MAX_CAREGIVERS_PER_STUDENT,
} from './caregiver.types.js';

export class CaregiverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: typeof eventBus,
    private readonly i18n: I18nService,
    private readonly crypto: CryptoService,
    private readonly notifications: NotificationService,
    private readonly email: EmailService
  ) {}

  // ============================================================================
  // INVITATION MANAGEMENT (Parent-initiated)
  // ============================================================================

  /**
   * Create an invitation for a caregiver (by parent)
   */
  async createCaregiverInvite(
    parentId: string,
    dto: CreateCaregiverInviteDto
  ): Promise<CreateCaregiverInviteResponse> {
    // Verify parent has access to the student
    const parentLink = await this.prisma.parentStudentLink.findFirst({
      where: {
        parentId,
        studentId: dto.studentId,
        status: 'active',
      },
      include: {
        student: true,
        parent: true,
      },
    });

    if (!parentLink) {
      throw new ForbiddenException('You do not have access to this child');
    }

    // Check caregiver limit
    const limitInfo = await this.getCaregiverLimitInfo(dto.studentId);
    if (!limitInfo.canAddMore) {
      throw new BadRequestException(
        `Maximum number of caregivers (${limitInfo.maxCaregivers}) already reached for this child`
      );
    }

    // Check if there's already a pending invite for this email
    const existingInvite = await this.prisma.caregiverInvite.findFirst({
      where: {
        studentId: dto.studentId,
        caregiverEmail: dto.caregiverEmail.toLowerCase(),
        status: CaregiverInviteStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      // Resend existing invite
      await this.sendCaregiverInviteEmail(existingInvite, parentLink.parent, parentLink.student);
      return {
        inviteId: existingInvite.id,
        inviteCode: existingInvite.code,
        inviteUrl: this.generateInviteUrl(existingInvite.code),
        expiresAt: existingInvite.expiresAt,
      };
    }

    // Check if caregiver already has access to this student
    const existingCaregiver = await this.prisma.caregiver.findUnique({
      where: { email: dto.caregiverEmail.toLowerCase() },
    });

    if (existingCaregiver) {
      const existingLink = await this.prisma.caregiverStudentLink.findUnique({
        where: {
          caregiverId_studentId: {
            caregiverId: existingCaregiver.id,
            studentId: dto.studentId,
          },
        },
      });

      if (
        existingLink &&
        (existingLink.status as CaregiverLinkStatus) === CaregiverLinkStatus.ACTIVE
      ) {
        throw new ConflictException('This caregiver already has access to this child');
      }
    }

    // Merge permissions with defaults
    const permissions: CaregiverPermissions = {
      ...DEFAULT_CAREGIVER_PERMISSIONS,
      ...dto.permissions,
    };

    // Generate secure invite code
    const inviteCode = await this.crypto.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + CAREGIVER_INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // Create invite
    const invite = await this.prisma.caregiverInvite.create({
      data: {
        code: inviteCode,
        studentId: dto.studentId,
        caregiverEmail: dto.caregiverEmail.toLowerCase(),
        caregiverName: dto.caregiverName,
        relationship: dto.relationship || CaregiverRelationship.CAREGIVER,
        invitedByParentId: parentId,
        status: CaregiverInviteStatus.PENDING,
        permissions: permissions as unknown as Prisma.InputJsonValue,
        message: dto.message,
        expiresAt,
        language: dto.language || 'en',
      },
    });

    // Log delegation action
    await this.logDelegationAction({
      studentId: dto.studentId,
      action: DelegationAction.INVITED,
      actorId: parentId,
      actorType: 'parent',
      caregiverEmail: dto.caregiverEmail.toLowerCase(),
      newValue: { permissions, relationship: dto.relationship } as Record<string, unknown>,
    });

    // Send invite email
    await this.sendCaregiverInviteEmail(invite, parentLink.parent, parentLink.student);

    logger.info(
      {
        studentId: dto.studentId,
        invitedBy: parentId,
        caregiverEmail: dto.caregiverEmail,
      },
      'Caregiver invite created'
    );

    return {
      inviteId: invite.id,
      inviteCode,
      inviteUrl: this.generateInviteUrl(inviteCode),
      expiresAt,
    };
  }

  /**
   * Accept a caregiver invite
   */
  async acceptCaregiverInvite(
    dto: AcceptCaregiverInviteDto
  ): Promise<AcceptCaregiverInviteResponse> {
    // Find and validate invite
    const invite = await this.prisma.caregiverInvite.findUnique({
      where: { code: dto.inviteCode },
      include: {
        student: true,
        invitedByParent: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invite code');
    }

    if ((invite.status as CaregiverInviteStatus) !== CaregiverInviteStatus.PENDING) {
      throw new BadRequestException('This invite has already been used or revoked');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite has expired');
    }

    // Verify email matches
    if (invite.caregiverEmail !== dto.email.toLowerCase()) {
      throw new BadRequestException('Email does not match invite');
    }

    // Re-check caregiver limit (in case it changed)
    const limitInfo = await this.getCaregiverLimitInfo(invite.studentId);
    if (!limitInfo.canAddMore) {
      throw new BadRequestException('Maximum number of caregivers has been reached for this child');
    }

    // Check if caregiver account already exists
    let caregiver = await this.prisma.caregiver.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!caregiver) {
      // Create new caregiver account
      caregiver = await this.prisma.caregiver.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash: await this.crypto.hashPassword(dto.password),
          givenName: dto.givenName,
          familyName: dto.familyName,
          phone: dto.phone,
          language: dto.language || invite.language || 'en',
          timezone: dto.timezone || 'UTC',
          status: CaregiverStatus.ACTIVE,
          emailVerified: false,
          notificationPreferences:
            DEFAULT_CAREGIVER_NOTIFICATION_PREFERENCES as unknown as Prisma.InputJsonValue,
        },
      });

      // Send verification email
      await this.sendCaregiverVerificationEmail(caregiver);
    }

    // Create caregiver-student link
    const permissions = invite.permissions as CaregiverPermissions;

    await this.prisma.caregiverStudentLink.create({
      data: {
        caregiverId: caregiver.id,
        studentId: invite.studentId,
        relationship: invite.relationship,
        status: CaregiverLinkStatus.ACTIVE,
        permissions: permissions as unknown as Prisma.InputJsonValue,
        delegatedById: invite.invitedByParentId,
        delegatedAt: new Date(),
      },
    });

    // Update invite status
    await this.prisma.caregiverInvite.update({
      where: { id: invite.id },
      data: {
        status: CaregiverInviteStatus.ACCEPTED,
        caregiverId: caregiver.id,
        acceptedAt: new Date(),
      },
    });

    // Update caregiver count
    await this.updateCaregiverCount(invite.studentId);

    // Log delegation action
    await this.logDelegationAction({
      studentId: invite.studentId,
      action: DelegationAction.ACCEPTED,
      actorId: caregiver.id,
      actorType: 'caregiver',
      caregiverId: caregiver.id,
      caregiverEmail: dto.email.toLowerCase(),
      newValue: { permissions, relationship: invite.relationship } as Record<string, unknown>,
    });

    // Notify parent that caregiver accepted
    await this.notifyParentOfAcceptance(invite.invitedByParentId, caregiver, invite.student);

    logger.info(
      {
        studentId: invite.studentId,
        caregiverId: caregiver.id,
      },
      'Caregiver invite accepted'
    );

    this.eventEmitter.emit('caregiver.linked', {
      caregiverId: caregiver.id,
      studentId: invite.studentId,
      parentId: invite.invitedByParentId,
    });

    return {
      caregiver: this.formatCaregiverProfile(caregiver),
      student: {
        id: invite.student.id,
        givenName: invite.student.givenName,
        familyName: invite.student.familyName,
      },
      permissions,
    };
  }

  /**
   * Resend a caregiver invite
   */
  async resendCaregiverInvite(parentId: string, dto: ResendCaregiverInviteDto): Promise<void> {
    const invite = await this.prisma.caregiverInvite.findUnique({
      where: { id: dto.inviteId },
      include: {
        student: true,
        invitedByParent: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.invitedByParentId !== parentId) {
      throw new ForbiddenException('You cannot resend this invite');
    }

    if ((invite.status as CaregiverInviteStatus) !== CaregiverInviteStatus.PENDING) {
      throw new BadRequestException('This invite cannot be resent');
    }

    // Extend expiry
    const newExpiresAt = new Date(Date.now() + CAREGIVER_INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.caregiverInvite.update({
      where: { id: dto.inviteId },
      data: { expiresAt: newExpiresAt },
    });

    // Resend email
    await this.sendCaregiverInviteEmail(
      { ...invite, expiresAt: newExpiresAt },
      invite.invitedByParent,
      invite.student
    );

    // Log action
    await this.logDelegationAction({
      studentId: invite.studentId,
      action: DelegationAction.RESENT,
      actorId: parentId,
      actorType: 'parent',
      caregiverEmail: invite.caregiverEmail,
    });
  }

  /**
   * Cancel a pending caregiver invite
   */
  async cancelCaregiverInvite(parentId: string, dto: CancelCaregiverInviteDto): Promise<void> {
    const invite = await this.prisma.caregiverInvite.findUnique({
      where: { id: dto.inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.invitedByParentId !== parentId) {
      throw new ForbiddenException('You cannot cancel this invite');
    }

    if ((invite.status as CaregiverInviteStatus) !== CaregiverInviteStatus.PENDING) {
      throw new BadRequestException('This invite cannot be cancelled');
    }

    await this.prisma.caregiverInvite.update({
      where: { id: dto.inviteId },
      data: { status: CaregiverInviteStatus.REVOKED },
    });
  }

  // ============================================================================
  // ACCESS MANAGEMENT
  // ============================================================================

  /**
   * Update caregiver permissions for a child
   */
  async updateCaregiverPermissions(
    parentId: string,
    dto: UpdateCaregiverPermissionsDto
  ): Promise<CaregiverStudentLink> {
    // Verify parent has access to this child
    const parentLink = await this.prisma.parentStudentLink.findFirst({
      where: {
        parentId,
        studentId: dto.studentId,
        status: 'active',
      },
    });

    if (!parentLink) {
      throw new ForbiddenException('You do not have access to this child');
    }

    // Find the caregiver link
    const caregiverLink = await this.prisma.caregiverStudentLink.findUnique({
      where: {
        caregiverId_studentId: {
          caregiverId: dto.caregiverId,
          studentId: dto.studentId,
        },
      },
    });

    if (!caregiverLink) {
      throw new NotFoundException('Caregiver access not found');
    }

    if ((caregiverLink.status as CaregiverLinkStatus) !== CaregiverLinkStatus.ACTIVE) {
      throw new BadRequestException('Caregiver access is not active');
    }

    const previousPermissions = caregiverLink.permissions as CaregiverPermissions;
    const newPermissions: CaregiverPermissions = {
      ...previousPermissions,
      ...(dto.viewProgress !== undefined && { viewProgress: dto.viewProgress }),
      ...(dto.viewGrades !== undefined && { viewGrades: dto.viewGrades }),
      ...(dto.viewActivity !== undefined && { viewActivity: dto.viewActivity }),
      ...(dto.viewAchievements !== undefined && { viewAchievements: dto.viewAchievements }),
      ...(dto.receiveNotifications !== undefined && {
        receiveNotifications: dto.receiveNotifications,
      }),
      ...(dto.viewTeacherNotes !== undefined && { viewTeacherNotes: dto.viewTeacherNotes }),
    };

    const updatedLink = await this.prisma.caregiverStudentLink.update({
      where: { id: caregiverLink.id },
      data: { permissions: newPermissions as unknown as Prisma.InputJsonValue },
    });

    // Log action
    await this.logDelegationAction({
      studentId: dto.studentId,
      action: DelegationAction.PERMISSIONS_UPDATED,
      actorId: parentId,
      actorType: 'parent',
      caregiverId: dto.caregiverId,
      previousValue: previousPermissions as Record<string, unknown>,
      newValue: newPermissions as Record<string, unknown>,
    });

    return this.formatCaregiverStudentLink(updatedLink);
  }

  /**
   * Revoke caregiver access to a child
   */
  async revokeCaregiverAccess(parentId: string, dto: RevokeCaregiverAccessDto): Promise<void> {
    // Verify parent has access to this child
    const parentLink = await this.prisma.parentStudentLink.findFirst({
      where: {
        parentId,
        studentId: dto.studentId,
        status: 'active',
      },
    });

    if (!parentLink) {
      throw new ForbiddenException('You do not have access to this child');
    }

    // Find the caregiver link
    const caregiverLink = await this.prisma.caregiverStudentLink.findUnique({
      where: {
        caregiverId_studentId: {
          caregiverId: dto.caregiverId,
          studentId: dto.studentId,
        },
      },
      include: {
        caregiver: true,
      },
    });

    if (!caregiverLink) {
      throw new NotFoundException('Caregiver access not found');
    }

    if ((caregiverLink.status as CaregiverLinkStatus) === CaregiverLinkStatus.REVOKED) {
      throw new BadRequestException('Caregiver access has already been revoked');
    }

    // Revoke access
    await this.prisma.caregiverStudentLink.update({
      where: { id: caregiverLink.id },
      data: {
        status: CaregiverLinkStatus.REVOKED,
        revokedAt: new Date(),
        revokedById: parentId,
      },
    });

    // Update caregiver count
    await this.updateCaregiverCount(dto.studentId);

    // Log action
    await this.logDelegationAction({
      studentId: dto.studentId,
      action: DelegationAction.REVOKED,
      actorId: parentId,
      actorType: 'parent',
      caregiverId: dto.caregiverId,
      previousValue: { status: caregiverLink.status },
      newValue: { status: CaregiverLinkStatus.REVOKED, reason: dto.reason },
    });

    // Notify caregiver
    await this.notifyCaregiverOfRevocation(caregiverLink.caregiver, dto.studentId);

    this.eventEmitter.emit('caregiver.unlinked', {
      caregiverId: dto.caregiverId,
      studentId: dto.studentId,
      parentId,
    });
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get caregiver limit info for a student
   */
  async getCaregiverLimitInfo(studentId: string): Promise<CaregiverLimitInfo> {
    let limitRecord = await this.prisma.caregiverLimit.findUnique({
      where: { studentId },
    });

    if (!limitRecord) {
      // Create default limit record
      limitRecord = await this.prisma.caregiverLimit.create({
        data: {
          studentId,
          maxCaregivers: DEFAULT_MAX_CAREGIVERS_PER_STUDENT,
          currentCount: 0,
        },
      });
    }

    // Also count pending invites
    const pendingInvites = await this.prisma.caregiverInvite.count({
      where: {
        studentId,
        status: CaregiverInviteStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    const effectiveCount = limitRecord.currentCount + pendingInvites;
    const remainingSlots = Math.max(0, limitRecord.maxCaregivers - effectiveCount);

    return {
      studentId,
      maxCaregivers: limitRecord.maxCaregivers,
      currentCount: limitRecord.currentCount,
      remainingSlots,
      canAddMore: effectiveCount < limitRecord.maxCaregivers,
    };
  }

  /**
   * Get all caregivers for a student (for parent view)
   */
  async getStudentCaregivers(
    parentId: string,
    studentId: string
  ): Promise<StudentCaregiverSummary> {
    // Verify parent has access
    const parentLink = await this.prisma.parentStudentLink.findFirst({
      where: {
        parentId,
        studentId,
        status: 'active',
      },
      include: {
        student: true,
      },
    });

    if (!parentLink) {
      throw new ForbiddenException('You do not have access to this child');
    }

    // Get active caregivers
    const caregiverLinks = await this.prisma.caregiverStudentLink.findMany({
      where: {
        studentId,
        status: CaregiverLinkStatus.ACTIVE,
      },
      include: {
        caregiver: true,
      },
      orderBy: { delegatedAt: 'desc' },
    });

    // Get pending invites
    const pendingInvites = await this.prisma.caregiverInvite.findMany({
      where: {
        studentId,
        status: CaregiverInviteStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get limit info
    const limitInfo = await this.getCaregiverLimitInfo(studentId);

    return {
      studentId,
      studentName: `${parentLink.student.givenName} ${parentLink.student.familyName}`,
      maxCaregivers: limitInfo.maxCaregivers,
      currentCount: limitInfo.currentCount,
      remainingSlots: limitInfo.remainingSlots,
      caregivers: caregiverLinks.map((link) => ({
        id: link.caregiver.id,
        email: link.caregiver.email,
        givenName: link.caregiver.givenName,
        familyName: link.caregiver.familyName,
        photoUrl: link.caregiver.photoUrl,
        relationship: link.relationship as CaregiverRelationship,
        status: link.status as CaregiverLinkStatus,
        permissions: link.permissions as CaregiverPermissions,
        delegatedAt: link.delegatedAt,
      })),
      pendingInvites: pendingInvites.map((invite) => ({
        id: invite.id,
        caregiverEmail: invite.caregiverEmail,
        caregiverName: invite.caregiverName,
        relationship: invite.relationship as CaregiverRelationship,
        status: invite.status as CaregiverInviteStatus,
        permissions: invite.permissions as CaregiverPermissions,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      })),
    };
  }

  /**
   * Get caregiver profile (for caregiver)
   */
  async getCaregiverProfile(caregiverId: string): Promise<CaregiverWithStudents> {
    const caregiver = await this.prisma.caregiver.findUnique({
      where: { id: caregiverId },
      include: {
        studentLinks: {
          where: { status: CaregiverLinkStatus.ACTIVE },
          include: {
            student: true,
            delegatedBy: true,
          },
        },
      },
    });

    if (!caregiver) {
      throw new NotFoundException('Caregiver not found');
    }

    return {
      ...this.formatCaregiverProfile(caregiver),
      students: caregiver.studentLinks.map((link) => ({
        id: link.student.id,
        givenName: link.student.givenName,
        familyName: link.student.familyName,
        photoUrl: link.student.photoUrl,
        grade: link.student.grade,
        relationship: link.relationship as CaregiverRelationship,
        permissions: link.permissions as CaregiverPermissions,
        delegatedBy: {
          id: link.delegatedBy.id,
          givenName: link.delegatedBy.givenName,
          familyName: link.delegatedBy.familyName,
        },
      })),
    };
  }

  /**
   * Update caregiver profile
   */
  async updateCaregiverProfile(
    caregiverId: string,
    dto: UpdateCaregiverProfileDto
  ): Promise<CaregiverProfile> {
    const caregiver = await this.prisma.caregiver.update({
      where: { id: caregiverId },
      data: {
        ...(dto.givenName && { givenName: dto.givenName }),
        ...(dto.familyName && { familyName: dto.familyName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.language && { language: dto.language }),
        ...(dto.timezone && { timezone: dto.timezone }),
      },
    });

    return this.formatCaregiverProfile(caregiver);
  }

  // ============================================================================
  // CAREGIVER DASHBOARD METHODS
  // ============================================================================

  /**
   * Get invite details (public - for displaying invite info before accepting)
   */
  async getInviteDetails(code: string): Promise<{
    studentName: string;
    parentName: string;
    relationship: CaregiverRelationship;
    message: string | null;
    expiresAt: Date;
    isExpired: boolean;
    isUsed: boolean;
  }> {
    const invite = await this.prisma.caregiverInvite.findUnique({
      where: { code },
      include: {
        student: true,
        invitedByParent: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    return {
      studentName: `${invite.student.givenName} ${invite.student.familyName}`,
      parentName: `${invite.invitedByParent.givenName} ${invite.invitedByParent.familyName}`,
      relationship: invite.relationship as CaregiverRelationship,
      message: invite.message,
      expiresAt: invite.expiresAt,
      isExpired: invite.expiresAt < new Date(),
      isUsed: (invite.status as CaregiverInviteStatus) !== CaregiverInviteStatus.PENDING,
    };
  }

  /**
   * Get student summary for caregiver dashboard
   */
  async getStudentSummaryForCaregiver(
    caregiverId: string,
    studentId: string
  ): Promise<{
    id: string;
    givenName: string;
    familyName: string;
    photoUrl: string | null;
    grade: string | null;
    overallMastery: number;
    lastActivityAt: Date | null;
    weeklyStats: {
      totalMinutes: number;
      lessonsCompleted: number;
      daysActive: number;
    };
  }> {
    // Verify caregiver has access and get permissions
    const link = await this.prisma.caregiverStudentLink.findUnique({
      where: {
        caregiverId_studentId: {
          caregiverId,
          studentId,
        },
      },
      include: {
        student: {
          include: {
            learnerModel: true,
          },
        },
      },
    });

    if (!link || (link.status as CaregiverLinkStatus) !== CaregiverLinkStatus.ACTIVE) {
      throw new ForbiddenException('You do not have access to this child');
    }

    const permissions = link.permissions as CaregiverPermissions;

    // Get weekly stats if permitted
    let weeklyStats = { totalMinutes: 0, lessonsCompleted: 0, daysActive: 0 };
    if (permissions.viewActivity) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const sessions = await this.prisma.learningSession.findMany({
        where: {
          studentId,
          startedAt: { gte: weekAgo },
        },
      });

      weeklyStats = {
        totalMinutes: sessions.reduce((sum, s) => sum + (s.timeSpentSeconds || 0), 0) / 60,
        lessonsCompleted: sessions.filter((s) => s.status === 'completed').length,
        daysActive: new Set(sessions.map((s) => s.startedAt.toDateString())).size,
      };
    }

    return {
      id: link.student.id,
      givenName: link.student.givenName,
      familyName: link.student.familyName,
      photoUrl: link.student.photoUrl,
      grade: link.student.grade,
      overallMastery: permissions.viewProgress ? link.student.learnerModel?.overallMastery || 0 : 0,
      lastActivityAt: link.student.learnerModel?.lastActivityAt || null,
      weeklyStats,
    };
  }

  /**
   * Get student progress for caregiver dashboard
   */
  async getStudentProgressForCaregiver(
    caregiverId: string,
    studentId: string,
    options: { startDate?: Date; endDate?: Date }
  ): Promise<{
    summary: {
      totalTimeMinutes: number;
      completedLessons: number;
      averageScore: number;
    };
    dailyActivity: { date: string; minutes: number; completed: number }[];
    subjectBreakdown: { subject: string; minutes: number; lessonsCompleted: number }[];
  }> {
    // Verify caregiver has access
    const link = await this.prisma.caregiverStudentLink.findUnique({
      where: {
        caregiverId_studentId: {
          caregiverId,
          studentId,
        },
      },
    });

    if (!link || (link.status as CaregiverLinkStatus) !== CaregiverLinkStatus.ACTIVE) {
      throw new ForbiddenException('You do not have access to this child');
    }

    const permissions = link.permissions as CaregiverPermissions;
    if (!permissions.viewProgress) {
      throw new ForbiddenException('You do not have permission to view progress');
    }

    const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options.endDate || new Date();

    const sessions = await this.prisma.learningSession.findMany({
      where: {
        studentId,
        startedAt: { gte: startDate, lte: endDate },
      },
      include: {
        lesson: true,
      },
    });

    // Calculate summary
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    const summary = {
      totalTimeMinutes: sessions.reduce((sum, s) => sum + (s.timeSpentSeconds || 0), 0) / 60,
      completedLessons: completedSessions.length,
      averageScore:
        completedSessions.length > 0
          ? completedSessions.reduce((sum, s) => sum + (s.score || 0), 0) / completedSessions.length
          : 0,
    };

    // Calculate daily activity
    const dailyMap = new Map<string, { minutes: number; completed: number }>();
    for (const session of sessions) {
      const date = session.startedAt.toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { minutes: 0, completed: 0 };
      existing.minutes += (session.timeSpentSeconds || 0) / 60;
      if (session.status === 'completed') existing.completed++;
      dailyMap.set(date, existing);
    }
    const dailyActivity = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    // Calculate subject breakdown
    const subjectMap = new Map<string, { minutes: number; lessonsCompleted: number }>();
    for (const session of sessions) {
      const subject = session.lesson.subject;
      const existing = subjectMap.get(subject) || { minutes: 0, lessonsCompleted: 0 };
      existing.minutes += (session.timeSpentSeconds || 0) / 60;
      if (session.status === 'completed') existing.lessonsCompleted++;
      subjectMap.set(subject, existing);
    }
    const subjectBreakdown = Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      ...data,
    }));

    return { summary, dailyActivity, subjectBreakdown };
  }

  /**
   * Get student achievements for caregiver dashboard
   */
  async getStudentAchievementsForCaregiver(
    caregiverId: string,
    studentId: string
  ): Promise<
    {
      id: string;
      name: string;
      description: string;
      iconUrl: string | null;
      earnedAt: Date;
    }[]
  > {
    // Verify caregiver has access
    const link = await this.prisma.caregiverStudentLink.findUnique({
      where: {
        caregiverId_studentId: {
          caregiverId,
          studentId,
        },
      },
    });

    if (!link || (link.status as CaregiverLinkStatus) !== CaregiverLinkStatus.ACTIVE) {
      throw new ForbiddenException('You do not have access to this child');
    }

    const permissions = link.permissions as CaregiverPermissions;
    if (!permissions.viewAchievements) {
      throw new ForbiddenException('You do not have permission to view achievements');
    }

    const achievements = await this.prisma.achievement.findMany({
      where: { studentId },
      orderBy: { earnedAt: 'desc' },
      take: 50,
    });

    return achievements.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      iconUrl: a.iconUrl,
      earnedAt: a.earnedAt,
    }));
  }

  // ============================================================================
  // CAREGIVER AUTHENTICATION
  // ============================================================================

  /**
   * Authenticate caregiver
   */
  async authenticateCaregiver(email: string, password: string): Promise<CaregiverProfile | null> {
    const caregiver = await this.prisma.caregiver.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!caregiver) {
      return null;
    }

    if ((caregiver.status as CaregiverStatus) !== CaregiverStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    const isValid = await this.crypto.verifyPassword(password, caregiver.passwordHash);
    if (!isValid) {
      return null;
    }

    // Update last login
    await this.prisma.caregiver.update({
      where: { id: caregiver.id },
      data: { lastLoginAt: new Date() },
    });

    return this.formatCaregiverProfile(caregiver);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async updateCaregiverCount(studentId: string): Promise<void> {
    const activeCount = await this.prisma.caregiverStudentLink.count({
      where: {
        studentId,
        status: CaregiverLinkStatus.ACTIVE,
      },
    });

    await this.prisma.caregiverLimit.upsert({
      where: { studentId },
      create: {
        studentId,
        maxCaregivers: DEFAULT_MAX_CAREGIVERS_PER_STUDENT,
        currentCount: activeCount,
      },
      update: { currentCount: activeCount },
    });
  }

  private async logDelegationAction(data: {
    studentId: string;
    action: DelegationAction;
    actorId: string;
    actorType: string;
    caregiverId?: string;
    caregiverEmail?: string;
    previousValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.caregiverDelegationLog.create({
      data: {
        studentId: data.studentId,
        action: data.action,
        actorId: data.actorId,
        actorType: data.actorType,
        caregiverId: data.caregiverId,
        caregiverEmail: data.caregiverEmail,
        previousValue: data.previousValue as unknown as Prisma.InputJsonValue,
        newValue: data.newValue as unknown as Prisma.InputJsonValue,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  private generateInviteUrl(code: string): string {
    return `${config.parentPortalUrl}/caregiver/accept-invite?code=${code}`;
  }

  private async sendCaregiverInviteEmail(
    invite: {
      code: string;
      caregiverEmail: string;
      caregiverName?: string | null;
      message?: string | null;
      expiresAt: Date;
    },
    parent: { givenName: string; familyName: string },
    student: { givenName: string; familyName: string }
  ): Promise<void> {
    const inviteUrl = this.generateInviteUrl(invite.code);

    await this.notifications.sendEmail({
      to: invite.caregiverEmail,
      template: 'caregiver-invite',
      language: 'en',
      data: {
        caregiverName: invite.caregiverName || 'there',
        parentName: `${parent.givenName} ${parent.familyName}`,
        studentName: `${student.givenName} ${student.familyName}`,
        inviteUrl,
        message: invite.message,
        expiresAt: invite.expiresAt.toLocaleDateString(),
      },
    });
  }

  private async sendCaregiverVerificationEmail(caregiver: {
    id: string;
    email: string;
    givenName: string;
  }): Promise<void> {
    const token = await this.crypto.generateSecureToken(32);

    await this.prisma.caregiverVerificationToken.create({
      data: {
        caregiverId: caregiver.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    await this.notifications.sendEmail({
      to: caregiver.email,
      template: 'caregiver-verification',
      language: 'en',
      data: {
        name: caregiver.givenName,
        verifyUrl: `${config.parentPortalUrl}/caregiver/verify?token=${token}`,
      },
    });
  }

  private async notifyParentOfAcceptance(
    parentId: string,
    caregiver: { givenName: string; familyName: string; email: string },
    student: { givenName: string; familyName: string }
  ): Promise<void> {
    await this.notifications.send({
      userId: parentId,
      userType: 'parent',
      type: 'caregiver_accepted',
      title: 'Caregiver invitation accepted',
      body: `${caregiver.givenName} ${caregiver.familyName} has accepted your invitation to monitor ${student.givenName}'s learning.`,
      data: {
        caregiverEmail: caregiver.email,
        studentName: `${student.givenName} ${student.familyName}`,
      },
    });
  }

  private async notifyCaregiverOfRevocation(
    caregiver: { id: string; email: string; givenName: string },
    studentId: string
  ): Promise<void> {
    const student = await this.prisma.profile.findUnique({
      where: { id: studentId },
    });

    if (!student) return;

    await this.notifications.sendEmail({
      to: caregiver.email,
      template: 'caregiver-access-revoked',
      language: 'en',
      data: {
        caregiverName: caregiver.givenName,
        studentName: `${student.givenName} ${student.familyName}`,
      },
    });
  }

  private formatCaregiverProfile(caregiver: {
    id: string;
    email: string;
    givenName: string;
    familyName: string;
    phone: string | null;
    photoUrl: string | null;
    language: string;
    timezone: string;
    emailVerified: boolean;
    status: string;
    createdAt: Date;
  }): CaregiverProfile {
    return {
      id: caregiver.id,
      email: caregiver.email,
      givenName: caregiver.givenName,
      familyName: caregiver.familyName,
      phone: caregiver.phone,
      photoUrl: caregiver.photoUrl,
      language: caregiver.language,
      timezone: caregiver.timezone,
      emailVerified: caregiver.emailVerified,
      status: caregiver.status as CaregiverStatus,
      createdAt: caregiver.createdAt,
    };
  }

  private formatCaregiverStudentLink(link: {
    id: string;
    caregiverId: string;
    studentId: string;
    relationship: string;
    status: string;
    permissions: unknown;
    delegatedById: string;
    delegatedAt: Date;
    createdAt: Date;
  }): CaregiverStudentLink {
    return {
      id: link.id,
      caregiverId: link.caregiverId,
      studentId: link.studentId,
      relationship: link.relationship as CaregiverRelationship,
      status: link.status as CaregiverLinkStatus,
      permissions: link.permissions as CaregiverPermissions,
      delegatedById: link.delegatedById,
      delegatedAt: link.delegatedAt,
      createdAt: link.createdAt,
    };
  }
}
