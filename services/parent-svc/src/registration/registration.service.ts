/**
 * Caregiver Self-Registration Service
 *
 * Handles the complete self-registration flow for parents/caregivers:
 * - Initial registration with email verification
 * - Learner link requests with school verification
 * - Account creation upon successful verification
 */

import { logger } from '@aivo/ts-observability';

import { config } from '../config.js';
import type { CryptoService } from '../crypto/crypto.service.js';
import type { EmailService } from '../email/email.service.js';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '../errors.js';
import type { eventBus } from '../event-bus.js';
import type { PrismaService } from '../prisma/prisma.service.js';

import type {
  RegisterCaregiverDto,
  VerifyEmailDto,
  AddLearnerLinkDto,
  VerifyLearnerCodeDto,
  RegistrationResponse,
  VerifyEmailResponse,
  LearnerLinkResponse,
  VerifyLearnerCodeResponse,
  RegistrationStatusResponse,
  LearnerLinkSummary,
  CaregiverRelationshipType,
  LearnerIdentificationMethod,
} from './registration.types.js';
import {
  RegistrationStatus,
  VerificationMethod,
  VerificationStatus,
  RegistrationAuditAction,
  REGISTRATION_EMAIL_CODE_LENGTH,
  REGISTRATION_SCHOOL_CODE_LENGTH,
  MAX_LEARNERS_PER_REGISTRATION,
  REGISTRATION_EXPIRY_DAYS,
} from './registration.types.js';

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: typeof eventBus,
    private readonly crypto: CryptoService,
    private readonly email: EmailService
  ) {}

  // ============================================================================
  // STEP 1: INITIAL REGISTRATION
  // ============================================================================

  /**
   * Start caregiver self-registration process
   */
  async registerCaregiver(
    dto: RegisterCaregiverDto,
    context: RequestContext = {}
  ): Promise<RegistrationResponse> {
    const email = dto.email.toLowerCase().trim();

    // Check for existing completed registration or caregiver account
    const existingCaregiver = await this.prisma.caregiver.findUnique({
      where: { email },
    });

    if (existingCaregiver) {
      throw new ConflictException(
        'An account with this email already exists. Please login instead.'
      );
    }

    // Check for existing parent account
    const existingParent = await this.prisma.parent.findUnique({
      where: { email },
    });

    if (existingParent) {
      throw new ConflictException(
        'An account with this email already exists. Please login instead.'
      );
    }

    // Check for existing pending registration
    const existingRegistration = await this.prisma.caregiverRegistration.findFirst({
      where: {
        email,
        status: { in: ['PENDING', 'EMAIL_VERIFIED', 'SCHOOL_VERIFICATION_PENDING'] },
        codeExpiresAt: { gt: new Date() },
      },
    });

    if (existingRegistration) {
      // Return existing registration ID if email not verified yet
      if (existingRegistration.status === 'PENDING') {
        // Resend verification email
        await this.sendVerificationEmail(existingRegistration);
        return {
          registrationId: existingRegistration.id,
          message: 'A verification code has been sent to your email.',
          nextStep: 'verify_email',
        };
      }

      // If already verified, return appropriate status
      return {
        registrationId: existingRegistration.id,
        message: 'Registration already in progress.',
        nextStep: this.getNextStep(existingRegistration.status as RegistrationStatus),
      };
    }

    // Generate verification code (6-digit alphanumeric)
    const verificationCode = this.generateAlphanumericCode(REGISTRATION_EMAIL_CODE_LENGTH);
    const codeExpiresAt = new Date(
      Date.now() + config.registrationEmailVerificationExpiryHours * 60 * 60 * 1000
    );

    // Hash password
    const passwordHash = await this.crypto.hashPassword(dto.password);

    // Create registration record
    const registration = await this.prisma.caregiverRegistration.create({
      data: {
        email,
        phone: dto.phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        relationship: dto.relationship as CaregiverRelationshipType,
        status: 'PENDING',
        verificationCode,
        codeExpiresAt,
        tenantId: dto.tenantId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    // Log audit action
    await this.logAuditAction({
      registrationId: registration.id,
      action: RegistrationAuditAction.REGISTRATION_STARTED,
      metadata: { relationship: dto.relationship, tenantId: dto.tenantId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    // Send verification email
    await this.sendVerificationEmail(registration);

    logger.info(
      {
        registrationId: registration.id,
        email: registration.email,
      },
      'Caregiver registration started'
    );

    return {
      registrationId: registration.id,
      message: 'Registration started. Please check your email for the verification code.',
      nextStep: 'verify_email',
    };
  }

  // ============================================================================
  // STEP 2: EMAIL VERIFICATION
  // ============================================================================

  /**
   * Verify email with code
   */
  async verifyEmail(
    dto: VerifyEmailDto,
    context: RequestContext = {}
  ): Promise<VerifyEmailResponse> {
    const registration = await this.prisma.caregiverRegistration.findUnique({
      where: { id: dto.registrationId },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    // Check if already verified
    if (registration.status !== 'PENDING') {
      return {
        success: true,
        message: 'Email already verified.',
        status: registration.status as RegistrationStatus,
        nextStep: this.getNextStep(registration.status as RegistrationStatus),
      };
    }

    // Check lockout
    if (registration.lockedUntil && registration.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((registration.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(
        `Too many failed attempts. Please try again in ${remainingMinutes} minutes.`
      );
    }

    // Check expiration
    if (registration.codeExpiresAt < new Date()) {
      await this.updateRegistrationStatus(registration.id, 'EXPIRED');
      throw new BadRequestException(
        'Verification code has expired. Please start a new registration.'
      );
    }

    // Verify code (case-insensitive)
    if (registration.verificationCode.toUpperCase() !== dto.code.toUpperCase()) {
      // Increment failed attempts
      const failedAttempts = registration.failedAttempts + 1;
      const updates: { failedAttempts: number; lockedUntil?: Date } = { failedAttempts };

      if (failedAttempts >= config.registrationMaxFailedAttempts) {
        updates.lockedUntil = new Date(Date.now() + config.registrationLockoutMinutes * 60 * 1000);
      }

      await this.prisma.caregiverRegistration.update({
        where: { id: registration.id },
        data: updates,
      });

      throw new BadRequestException('Invalid verification code. Please try again.');
    }

    // Mark as verified
    await this.prisma.caregiverRegistration.update({
      where: { id: registration.id },
      data: {
        status: 'EMAIL_VERIFIED',
        verifiedAt: new Date(),
        failedAttempts: 0,
      },
    });

    // Log audit action
    await this.logAuditAction({
      registrationId: registration.id,
      action: RegistrationAuditAction.EMAIL_VERIFIED,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    logger.info({ registrationId: registration.id }, 'Caregiver email verified');

    return {
      success: true,
      message: 'Email verified successfully. You can now add learners to your account.',
      status: RegistrationStatus.EMAIL_VERIFIED,
      nextStep: 'add_learners',
    };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(
    registrationId: string,
    context: RequestContext = {}
  ): Promise<{ success: boolean; message: string }> {
    const registration = await this.prisma.caregiverRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    if (registration.status !== 'PENDING') {
      throw new BadRequestException('Email has already been verified.');
    }

    // Generate new code and extend expiry
    const verificationCode = this.generateAlphanumericCode(REGISTRATION_EMAIL_CODE_LENGTH);
    const codeExpiresAt = new Date(
      Date.now() + config.registrationEmailVerificationExpiryHours * 60 * 60 * 1000
    );

    await this.prisma.caregiverRegistration.update({
      where: { id: registrationId },
      data: {
        verificationCode,
        codeExpiresAt,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    // Send email
    await this.sendVerificationEmail({ ...registration, verificationCode });

    // Log audit action
    await this.logAuditAction({
      registrationId,
      action: RegistrationAuditAction.EMAIL_SENT,
      metadata: { type: 'resend' },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      success: true,
      message: 'A new verification code has been sent to your email.',
    };
  }

  // ============================================================================
  // STEP 3: ADD LEARNER LINK REQUESTS
  // ============================================================================

  /**
   * Add a learner link request to the registration
   */
  async addLearnerLink(
    registrationId: string,
    dto: AddLearnerLinkDto,
    context: RequestContext = {}
  ): Promise<LearnerLinkResponse> {
    const registration = await this.prisma.caregiverRegistration.findUnique({
      where: { id: registrationId },
      include: { learnerLinks: true },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    // Verify registration is in correct state
    if (!['EMAIL_VERIFIED', 'SCHOOL_VERIFICATION_PENDING'].includes(registration.status)) {
      throw new BadRequestException('Email must be verified before adding learners.');
    }

    // Check max learners limit
    if (registration.learnerLinks.length >= MAX_LEARNERS_PER_REGISTRATION) {
      throw new BadRequestException(
        `Maximum of ${MAX_LEARNERS_PER_REGISTRATION} learners can be linked per registration.`
      );
    }

    // Validate identification data
    this.validateLearnerIdentification(dto);

    // Try to find matching learner
    const matchedLearner = await this.findMatchingLearner(dto);

    // Create link request
    const linkRequest = await this.prisma.learnerLinkRequest.create({
      data: {
        registrationId,
        learnerEmail: dto.learnerEmail?.toLowerCase(),
        studentId: dto.studentId,
        learnerFirstName: dto.learnerFirstName,
        learnerLastName: dto.learnerLastName,
        learnerDateOfBirth: dto.learnerDateOfBirth ? new Date(dto.learnerDateOfBirth) : null,
        schoolName: dto.schoolName,
        schoolId: dto.schoolId,
        verificationMethod: dto.verificationMethod,
        verificationStatus: 'PENDING',
        learnerId: matchedLearner?.id,
      },
    });

    // Update registration status if needed
    if (registration.status === 'EMAIL_VERIFIED') {
      await this.updateRegistrationStatus(registrationId, 'SCHOOL_VERIFICATION_PENDING');
    }

    // Log audit action
    await this.logAuditAction({
      registrationId,
      linkRequestId: linkRequest.id,
      action: RegistrationAuditAction.LEARNER_ADDED,
      metadata: {
        identificationMethod: dto.identificationMethod,
        verificationMethod: dto.verificationMethod,
        hasMatch: !!matchedLearner,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    // Handle verification based on method
    let requiresSchoolApproval = true;
    let message = 'Learner link request created. ';

    switch (dto.verificationMethod) {
      case VerificationMethod.SCHOOL_ADMIN_APPROVAL:
        // Notify school admin
        await this.notifySchoolAdmin(linkRequest, registration, matchedLearner);
        message += 'Waiting for school administrator approval.';
        break;

      case VerificationMethod.VERIFICATION_CODE_FROM_SCHOOL:
        message += 'Please enter the verification code provided by the school.';
        break;

      case VerificationMethod.EXISTING_FAMILY_LINK: {
        // Check for existing family connection
        const canAutoApprove = await this.checkExistingFamilyLink(registration.email, dto);
        if (canAutoApprove) {
          await this.approveLink(linkRequest.id, 'system', context);
          requiresSchoolApproval = false;
          message = 'Learner linked successfully via existing family connection.';
        } else {
          // Fall back to school approval
          await this.notifySchoolAdmin(linkRequest, registration, matchedLearner);
          message += 'Could not verify via family link. Waiting for school administrator approval.';
        }
        break;
      }

      case VerificationMethod.DOCUMENT_UPLOAD:
        message += 'Please upload verification documents.';
        break;
    }

    logger.info(
      {
        registrationId,
        linkRequestId: linkRequest.id,
        verificationMethod: dto.verificationMethod,
      },
      'Learner link request created'
    );

    return {
      linkRequestId: linkRequest.id,
      verificationMethod: dto.verificationMethod,
      verificationStatus: requiresSchoolApproval
        ? VerificationStatus.PENDING
        : VerificationStatus.APPROVED,
      message,
      requiresSchoolApproval,
    };
  }

  // ============================================================================
  // STEP 4: VERIFY LEARNER CODE
  // ============================================================================

  /**
   * Verify a learner link using a school-provided code
   */
  async verifyLearnerCode(
    linkRequestId: string,
    dto: VerifyLearnerCodeDto,
    context: RequestContext = {}
  ): Promise<VerifyLearnerCodeResponse> {
    const linkRequest = await this.prisma.learnerLinkRequest.findUnique({
      where: { id: linkRequestId },
      include: { registration: true },
    });

    if (!linkRequest) {
      throw new NotFoundException('Link request not found');
    }

    if (linkRequest.verificationStatus !== 'PENDING') {
      throw new BadRequestException('This link request has already been processed.');
    }

    if (
      (linkRequest.verificationMethod as VerificationMethod) !==
      VerificationMethod.VERIFICATION_CODE_FROM_SCHOOL
    ) {
      throw new BadRequestException('This link request does not use code verification.');
    }

    // Look up the school verification code
    const schoolCode = await this.prisma.schoolVerificationCode.findFirst({
      where: {
        code: dto.verificationCode.toUpperCase(),
        expiresAt: { gt: new Date() },
        claimedAt: null,
      },
    });

    if (!schoolCode) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    // Verify the code matches the learner (if we have a matched learner)
    if (linkRequest.learnerId && schoolCode.learnerId !== linkRequest.learnerId) {
      throw new BadRequestException('This code is not valid for the specified learner.');
    }

    // Get learner info
    const learner = await this.prisma.profile.findUnique({
      where: { id: schoolCode.learnerId },
    });

    if (!learner) {
      throw new BadRequestException('Learner not found.');
    }

    // Claim the code
    await this.prisma.schoolVerificationCode.update({
      where: { id: schoolCode.id },
      data: {
        claimedById: linkRequest.registrationId,
        claimedAt: new Date(),
      },
    });

    // Update link request
    await this.prisma.learnerLinkRequest.update({
      where: { id: linkRequestId },
      data: {
        verificationStatus: 'APPROVED',
        verificationCode: dto.verificationCode.toUpperCase(),
        schoolVerifiedAt: new Date(),
        learnerId: schoolCode.learnerId,
        linkedAt: new Date(),
      },
    });

    // Log audit action
    await this.logAuditAction({
      registrationId: linkRequest.registrationId,
      linkRequestId,
      action: RegistrationAuditAction.CODE_VERIFIED,
      metadata: { learnerId: schoolCode.learnerId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    // Check if all links are approved and finalize if so
    await this.checkAndFinalizeRegistration(linkRequest.registrationId, context);

    logger.info(
      {
        linkRequestId,
        learnerId: schoolCode.learnerId,
      },
      'Learner code verified'
    );

    return {
      success: true,
      message: 'Learner verified and linked successfully.',
      learnerId: learner.id,
      learnerName: `${learner.givenName} ${learner.familyName}`,
    };
  }

  // ============================================================================
  // REGISTRATION STATUS
  // ============================================================================

  /**
   * Get current registration status
   */
  async getRegistrationStatus(registrationId: string): Promise<RegistrationStatusResponse> {
    const registration = await this.prisma.caregiverRegistration.findUnique({
      where: { id: registrationId },
      include: {
        learnerLinks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    // Get learner names for linked learners
    const learnerIds = registration.learnerLinks
      .filter((l) => l.learnerId)
      .map((l) => l.learnerId!);

    const learners =
      learnerIds.length > 0
        ? await this.prisma.profile.findMany({
            where: { id: { in: learnerIds } },
            select: { id: true, givenName: true, familyName: true },
          })
        : [];

    const learnerMap = new Map(learners.map((l) => [l.id, `${l.givenName} ${l.familyName}`]));

    const learnerLinks: LearnerLinkSummary[] = registration.learnerLinks.map((link) => ({
      id: link.id,
      identificationInfo: this.formatIdentificationInfo(link),
      verificationMethod: link.verificationMethod as VerificationMethod,
      verificationStatus: link.verificationStatus as VerificationStatus,
      learnerName: link.learnerId ? learnerMap.get(link.learnerId) : undefined,
      linkedAt: link.linkedAt || undefined,
      rejectionReason: link.rejectionReason || undefined,
    }));

    return {
      registrationId: registration.id,
      email: registration.email,
      firstName: registration.firstName,
      lastName: registration.lastName,
      status: registration.status as RegistrationStatus,
      emailVerified: registration.verifiedAt !== null,
      learnerLinks,
      createdAt: registration.createdAt,
      canAddMoreLearners:
        registration.learnerLinks.length < MAX_LEARNERS_PER_REGISTRATION &&
        ['EMAIL_VERIFIED', 'SCHOOL_VERIFICATION_PENDING'].includes(registration.status),
    };
  }

  // ============================================================================
  // SCHOOL ADMIN METHODS
  // ============================================================================

  /**
   * Get pending link requests for a school
   */
  async getPendingLinkRequests(
    schoolId: string,
    options: { status?: VerificationStatus; page?: number; limit?: number } = {}
  ): Promise<{
    requests: {
      id: string;
      registrationId: string;
      caregiverName: string;
      caregiverEmail: string;
      relationship: string;
      identificationMethod: LearnerIdentificationMethod;
      learnerInfo: {
        email?: string;
        studentId?: string;
        firstName?: string;
        lastName?: string;
        dateOfBirth?: string;
      };
      verificationMethod: VerificationMethod;
      verificationStatus: VerificationStatus;
      createdAt: Date;
      matchedLearner?: { id: string; name: string; grade?: string };
    }[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where = {
      schoolId,
      ...(options.status && { verificationStatus: options.status }),
    };

    const [requests, total] = await Promise.all([
      this.prisma.learnerLinkRequest.findMany({
        where,
        include: {
          registration: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.learnerLinkRequest.count({ where }),
    ]);

    // Get matched learner details
    const learnerIds = requests.filter((r) => r.learnerId).map((r) => r.learnerId!);

    const matchedLearners =
      learnerIds.length > 0
        ? await this.prisma.profile.findMany({
            where: { id: { in: learnerIds } },
            select: { id: true, givenName: true, familyName: true, grade: true },
          })
        : [];

    const learnerMap = new Map(matchedLearners.map((l) => [l.id, l]));

    return {
      requests: requests.map((r) => {
        const matched = r.learnerId ? learnerMap.get(r.learnerId) : undefined;
        return {
          id: r.id,
          registrationId: r.registrationId,
          caregiverName: `${r.registration.firstName} ${r.registration.lastName}`,
          caregiverEmail: r.registration.email,
          relationship: r.registration.relationship,
          identificationMethod: this.getIdentificationMethod(r),
          learnerInfo: {
            email: r.learnerEmail || undefined,
            studentId: r.studentId || undefined,
            firstName: r.learnerFirstName || undefined,
            lastName: r.learnerLastName || undefined,
            dateOfBirth: r.learnerDateOfBirth?.toISOString().split('T')[0],
          },
          verificationMethod: r.verificationMethod as VerificationMethod,
          verificationStatus: r.verificationStatus as VerificationStatus,
          createdAt: r.createdAt,
          matchedLearner: matched
            ? {
                id: matched.id,
                name: `${matched.givenName} ${matched.familyName}`,
                grade: matched.grade || undefined,
              }
            : undefined,
        };
      }),
      total,
      page,
      limit,
    };
  }

  /**
   * Approve or reject a link request (school admin)
   */
  async updateLinkRequestStatus(
    requestId: string,
    status: 'APPROVED' | 'REJECTED',
    adminUserId: string,
    rejectionReason?: string,
    context: RequestContext = {}
  ): Promise<void> {
    const linkRequest = await this.prisma.learnerLinkRequest.findUnique({
      where: { id: requestId },
      include: { registration: true },
    });

    if (!linkRequest) {
      throw new NotFoundException('Link request not found');
    }

    if (linkRequest.verificationStatus !== 'PENDING') {
      throw new BadRequestException('This link request has already been processed.');
    }

    if (status === 'APPROVED') {
      await this.approveLink(requestId, adminUserId, context);
    } else {
      await this.rejectLink(requestId, adminUserId, rejectionReason, context);
    }
  }

  /**
   * Generate a verification code for a learner (school admin)
   */
  async generateParentVerificationCode(
    schoolId: string,
    learnerId: string,
    issuedById: string
  ): Promise<{ code: string; expiresAt: Date; learnerId: string; learnerName: string }> {
    // Verify learner exists and belongs to school
    const learner = await this.prisma.profile.findUnique({
      where: { id: learnerId },
      include: {
        enrollments: {
          include: { class: true },
          where: { status: 'active' },
        },
      },
    });

    if (!learner) {
      throw new NotFoundException('Learner not found');
    }

    // Generate secure code
    const code = this.generateAlphanumericCode(REGISTRATION_SCHOOL_CODE_LENGTH);
    const expiresAt = new Date(
      Date.now() + config.registrationSchoolCodeExpiryDays * 24 * 60 * 60 * 1000
    );

    // Invalidate any existing codes for this learner
    await this.prisma.schoolVerificationCode.updateMany({
      where: {
        learnerId,
        claimedAt: null,
      },
      data: {
        expiresAt: new Date(), // Expire immediately
      },
    });

    // Create new code
    await this.prisma.schoolVerificationCode.create({
      data: {
        schoolId,
        learnerId,
        code,
        issuedById,
        expiresAt,
      },
    });

    logger.info(
      {
        schoolId,
        learnerId,
        issuedById,
      },
      'Parent verification code generated'
    );

    return {
      code,
      expiresAt,
      learnerId,
      learnerName: `${learner.givenName} ${learner.familyName}`,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async approveLink(
    requestId: string,
    approvedById: string,
    context: RequestContext = {}
  ): Promise<void> {
    const linkRequest = await this.prisma.learnerLinkRequest.findUnique({
      where: { id: requestId },
      include: { registration: true },
    });

    if (!linkRequest) {
      throw new NotFoundException('Link request not found');
    }

    // Update link request
    await this.prisma.learnerLinkRequest.update({
      where: { id: requestId },
      data: {
        verificationStatus: 'APPROVED',
        verifiedByUserId: approvedById,
        schoolVerifiedAt: new Date(),
        linkedAt: new Date(),
      },
    });

    // Log audit action
    await this.logAuditAction({
      registrationId: linkRequest.registrationId,
      linkRequestId: requestId,
      action: RegistrationAuditAction.SCHOOL_APPROVED,
      actorId: approvedById,
      actorType: approvedById === 'system' ? 'system' : 'school_admin',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    // Notify caregiver
    await this.notifyLinkApproved(linkRequest);

    // Check if all links are approved and finalize if so
    await this.checkAndFinalizeRegistration(linkRequest.registrationId, context);

    logger.info({ requestId, approvedById }, 'Link request approved');
  }

  private async rejectLink(
    requestId: string,
    rejectedById: string,
    reason?: string,
    context: RequestContext = {}
  ): Promise<void> {
    const linkRequest = await this.prisma.learnerLinkRequest.findUnique({
      where: { id: requestId },
      include: { registration: true },
    });

    if (!linkRequest) {
      throw new NotFoundException('Link request not found');
    }

    // Update link request
    await this.prisma.learnerLinkRequest.update({
      where: { id: requestId },
      data: {
        verificationStatus: 'REJECTED',
        verifiedByUserId: rejectedById,
        rejectionReason: reason,
      },
    });

    // Log audit action
    await this.logAuditAction({
      registrationId: linkRequest.registrationId,
      linkRequestId: requestId,
      action: RegistrationAuditAction.SCHOOL_REJECTED,
      actorId: rejectedById,
      actorType: 'school_admin',
      metadata: { reason },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    // Notify caregiver
    await this.notifyLinkRejected(linkRequest, reason);

    logger.info({ requestId, rejectedById, reason }, 'Link request rejected');
  }

  private async checkAndFinalizeRegistration(
    registrationId: string,
    context: RequestContext = {}
  ): Promise<void> {
    const registration = await this.prisma.caregiverRegistration.findUnique({
      where: { id: registrationId },
      include: { learnerLinks: true },
    });

    if (!registration) return;

    // Check if there are any approved links
    const approvedLinks = registration.learnerLinks.filter(
      (l) => l.verificationStatus === 'APPROVED'
    );

    // Check if all links are processed (no pending)
    const pendingLinks = registration.learnerLinks.filter(
      (l) => l.verificationStatus === 'PENDING'
    );

    // If we have at least one approved link and no pending links, finalize
    if (approvedLinks.length > 0 && pendingLinks.length === 0) {
      await this.finalizeRegistration(registration, approvedLinks, context);
    }
  }

  private async finalizeRegistration(
    registration: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      passwordHash: string;
      phone: string | null;
      relationship: string;
      tenantId: string | null;
    },
    approvedLinks: { id: string; learnerId: string | null }[],
    context: RequestContext = {}
  ): Promise<void> {
    // Create actual caregiver account
    const caregiver = await this.prisma.caregiver.create({
      data: {
        email: registration.email,
        passwordHash: registration.passwordHash,
        givenName: registration.firstName,
        familyName: registration.lastName,
        phone: registration.phone,
        status: 'active',
        emailVerified: true,
        notificationPreferences: {},
      },
    });

    // Create caregiver-student links for each approved learner
    for (const link of approvedLinks) {
      if (link.learnerId) {
        // Find a parent to attribute the delegation to (or use system)
        const existingParentLink = await this.prisma.parentStudentLink.findFirst({
          where: { studentId: link.learnerId, status: 'active' },
        });

        await this.prisma.caregiverStudentLink.create({
          data: {
            caregiverId: caregiver.id,
            studentId: link.learnerId,
            relationship: this.mapRelationship(registration.relationship),
            status: 'active',
            permissions: {
              viewProgress: true,
              viewGrades: true,
              viewActivity: true,
              viewAchievements: true,
              receiveNotifications: true,
              viewTeacherNotes: false,
            },
            delegatedById: existingParentLink?.parentId || 'system',
          },
        });
      }
    }

    // Update registration
    await this.prisma.caregiverRegistration.update({
      where: { id: registration.id },
      data: {
        status: 'VERIFIED',
        caregiverId: caregiver.id,
        convertedAt: new Date(),
      },
    });

    // Log audit action
    await this.logAuditAction({
      registrationId: registration.id,
      action: RegistrationAuditAction.ACCOUNT_CREATED,
      metadata: { caregiverId: caregiver.id, linkedLearners: approvedLinks.length },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    // Send welcome email
    await this.sendWelcomeEmail(caregiver, approvedLinks.length);

    // Emit event
    this.eventEmitter.emit('caregiver.registered', {
      caregiverId: caregiver.id,
      registrationId: registration.id,
      learnerIds: approvedLinks.map((l) => l.learnerId).filter(Boolean),
    });

    logger.info(
      {
        registrationId: registration.id,
        caregiverId: caregiver.id,
      },
      'Caregiver registration completed'
    );
  }

  private async sendVerificationEmail(registration: {
    id: string;
    email: string;
    firstName: string;
    verificationCode: string;
  }): Promise<void> {
    await this.email.send({
      to: registration.email,
      subject: 'Verify your email - AIVO Learning',
      template: 'caregiver-verify-email',
      data: {
        firstName: registration.firstName,
        verificationCode: registration.verificationCode,
        expiryHours: config.registrationEmailVerificationExpiryHours,
        supportUrl: `${config.parentPortalUrl}/support`,
      },
    });

    await this.logAuditAction({
      registrationId: registration.id,
      action: RegistrationAuditAction.EMAIL_SENT,
      metadata: { type: 'verification' },
    });
  }

  private async sendWelcomeEmail(
    caregiver: { id: string; email: string; givenName: string },
    learnerCount: number
  ): Promise<void> {
    await this.email.send({
      to: caregiver.email,
      subject: 'Welcome to AIVO Learning!',
      template: 'caregiver-welcome',
      data: {
        firstName: caregiver.givenName,
        learnerCount,
        loginUrl: `${config.parentPortalUrl}/login`,
        dashboardUrl: `${config.parentPortalUrl}/dashboard`,
      },
    });
  }

  private async notifySchoolAdmin(
    linkRequest: { id: string; schoolId: string | null },
    registration: { firstName: string; lastName: string; email: string; relationship: string },
    matchedLearner?: { id: string; givenName: string; familyName: string } | null
  ): Promise<void> {
    // In a real implementation, this would send an email/notification to school admins
    // For now, we'll just log it
    logger.info(
      {
        linkRequestId: linkRequest.id,
        schoolId: linkRequest.schoolId,
        caregiverName: `${registration.firstName} ${registration.lastName}`,
        matchedLearner: matchedLearner
          ? `${matchedLearner.givenName} ${matchedLearner.familyName}`
          : 'No match',
      },
      'School admin notification would be sent'
    );

    await this.logAuditAction({
      linkRequestId: linkRequest.id,
      action: RegistrationAuditAction.SCHOOL_NOTIFIED,
      metadata: { schoolId: linkRequest.schoolId },
    });
  }

  private async notifyLinkApproved(linkRequest: {
    registrationId: string;
    learnerId: string | null;
    registration: { email: string; firstName: string };
  }): Promise<void> {
    let learnerName = 'your learner';
    if (linkRequest.learnerId) {
      const learner = await this.prisma.profile.findUnique({
        where: { id: linkRequest.learnerId },
        select: { givenName: true, familyName: true },
      });
      if (learner) {
        learnerName = `${learner.givenName} ${learner.familyName}`;
      }
    }

    await this.email.send({
      to: linkRequest.registration.email,
      subject: 'Learner link approved - AIVO Learning',
      template: 'caregiver-learner-linked',
      data: {
        firstName: linkRequest.registration.firstName,
        learnerName,
        dashboardUrl: `${config.parentPortalUrl}/dashboard`,
      },
    });
  }

  private async notifyLinkRejected(
    linkRequest: {
      registrationId: string;
      registration: { email: string; firstName: string };
    },
    reason?: string
  ): Promise<void> {
    await this.email.send({
      to: linkRequest.registration.email,
      subject: 'Learner link request update - AIVO Learning',
      template: 'caregiver-verification-pending',
      data: {
        firstName: linkRequest.registration.firstName,
        status: 'rejected',
        reason: reason || 'The school was unable to verify your relationship with the learner.',
        supportUrl: `${config.parentPortalUrl}/support`,
      },
    });
  }

  private async findMatchingLearner(
    dto: AddLearnerLinkDto
  ): Promise<{ id: string; givenName: string; familyName: string } | null> {
    // Try to find matching learner based on provided information
    if (dto.learnerEmail) {
      const learner = await this.prisma.profile.findFirst({
        where: { email: dto.learnerEmail.toLowerCase() },
        select: { id: true, givenName: true, familyName: true },
      });
      if (learner) return learner;
    }

    if (dto.studentId) {
      // Note: This assumes studentId might be stored in a custom field or the id itself
      // Adjust based on actual schema
      const learner = await this.prisma.profile.findFirst({
        where: { id: dto.studentId },
        select: { id: true, givenName: true, familyName: true },
      });
      if (learner) return learner;
    }

    if (dto.learnerFirstName && dto.learnerLastName && dto.learnerDateOfBirth) {
      // Fuzzy match on name + exact match on DOB
      const dob = new Date(dto.learnerDateOfBirth);
      const learners = await this.prisma.profile.findMany({
        where: {
          dateOfBirth: dob,
          givenName: { contains: dto.learnerFirstName, mode: 'insensitive' },
          familyName: { contains: dto.learnerLastName, mode: 'insensitive' },
        },
        select: { id: true, givenName: true, familyName: true },
        take: 1,
      });
      if (learners.length > 0) return learners[0];
    }

    return null;
  }

  private async checkExistingFamilyLink(
    caregiverEmail: string,
    dto: AddLearnerLinkDto
  ): Promise<boolean> {
    // Check if there's an existing parent with this email who has other children linked
    const existingParent = await this.prisma.parent.findUnique({
      where: { email: caregiverEmail },
      include: {
        studentLinks: { where: { status: 'active' } },
      },
    });

    if (!existingParent || existingParent.studentLinks.length === 0) {
      return false;
    }

    // If we have a matched learner, check if they share a school with existing children
    const matchedLearner = await this.findMatchingLearner(dto);
    if (!matchedLearner) return false;

    // Get enrollments for existing linked children
    const existingStudentIds = existingParent.studentLinks.map((l) => l.studentId);
    const existingEnrollments = await this.prisma.enrollment.findMany({
      where: { profileId: { in: existingStudentIds } },
    });

    // Get enrollments for the new learner
    const newLearnerEnrollments = await this.prisma.enrollment.findMany({
      where: { profileId: matchedLearner.id },
    });

    // Check for overlapping schools/classes
    const existingClassIds = new Set(existingEnrollments.map((e) => e.classId));
    const hasOverlap = newLearnerEnrollments.some((e) => existingClassIds.has(e.classId));

    return hasOverlap;
  }

  private validateLearnerIdentification(dto: AddLearnerLinkDto): void {
    switch (dto.identificationMethod) {
      case 'email':
        if (!dto.learnerEmail) {
          throw new BadRequestException('Learner email is required for email identification.');
        }
        break;

      case 'studentId':
        if (!dto.studentId) {
          throw new BadRequestException('Student ID is required for ID identification.');
        }
        break;

      case 'nameAndDob':
        if (!dto.learnerFirstName || !dto.learnerLastName || !dto.learnerDateOfBirth) {
          throw new BadRequestException(
            'First name, last name, and date of birth are required for name identification.'
          );
        }
        break;
    }
  }

  private async updateRegistrationStatus(
    registrationId: string,
    status: RegistrationStatus | string
  ): Promise<void> {
    await this.prisma.caregiverRegistration.update({
      where: { id: registrationId },
      data: { status },
    });
  }

  private async logAuditAction(data: {
    registrationId?: string;
    linkRequestId?: string;
    action: RegistrationAuditAction;
    actorId?: string;
    actorType?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.registrationAuditLog.create({
      data: {
        registrationId: data.registrationId,
        linkRequestId: data.linkRequestId,
        action: data.action,
        actorId: data.actorId,
        actorType: data.actorType || 'system',
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  private generateAlphanumericCode(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded similar chars: I, O, 0, 1
    let code = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];
    }
    return code;
  }

  private getNextStep(
    status: RegistrationStatus
  ): 'verify_email' | 'add_learners' | 'pending_verification' | 'complete' {
    switch (status) {
      case RegistrationStatus.PENDING:
        return 'verify_email';
      case RegistrationStatus.EMAIL_VERIFIED:
        return 'add_learners';
      case RegistrationStatus.SCHOOL_VERIFICATION_PENDING:
        return 'pending_verification';
      case RegistrationStatus.VERIFIED:
        return 'complete';
      default:
        return 'verify_email';
    }
  }

  private formatIdentificationInfo(link: {
    learnerEmail: string | null;
    studentId: string | null;
    learnerFirstName: string | null;
    learnerLastName: string | null;
    learnerDateOfBirth: Date | null;
  }): string {
    if (link.learnerEmail) {
      return `Email: ${link.learnerEmail}`;
    }
    if (link.studentId) {
      return `Student ID: ${link.studentId}`;
    }
    if (link.learnerFirstName && link.learnerLastName) {
      const dob = link.learnerDateOfBirth
        ? `, DOB: ${link.learnerDateOfBirth.toISOString().split('T')[0]}`
        : '';
      return `Name: ${link.learnerFirstName} ${link.learnerLastName}${dob}`;
    }
    return 'Unknown';
  }

  private getIdentificationMethod(link: {
    learnerEmail: string | null;
    studentId: string | null;
    learnerFirstName: string | null;
  }): LearnerIdentificationMethod {
    if (link.learnerEmail) return 'email';
    if (link.studentId) return 'studentId';
    return 'nameAndDob';
  }

  private mapRelationship(relationship: string): string {
    const mapping: Record<string, string> = {
      PARENT: 'parent',
      GUARDIAN: 'guardian',
      GRANDPARENT: 'grandparent',
      FOSTER_PARENT: 'foster_parent',
      OTHER_FAMILY: 'other',
      AUTHORIZED_CAREGIVER: 'caregiver',
    };
    return mapping[relationship] || 'caregiver';
  }
}
