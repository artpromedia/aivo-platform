import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RegistrationService } from '../src/registration/registration.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { CryptoService } from '../src/crypto/crypto.service';
import { EmailService } from '../src/email/email.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CaregiverRelationshipType,
  RegistrationStatus,
  VerificationMethod,
  VerificationStatus,
} from '../src/registration/registration.types';

describe('RegistrationService', () => {
  let registrationService: RegistrationService;
  let prisma: any;
  let crypto: CryptoService;
  let email: any;
  let eventEmitter: any;

  beforeEach(() => {
    prisma = {
      caregiver: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      parent: {
        findUnique: vi.fn(),
      },
      caregiverRegistration: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      learnerLinkRequest: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      schoolVerificationCode: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      registrationAuditLog: {
        create: vi.fn(),
      },
      profile: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      parentStudentLink: {
        findFirst: vi.fn(),
      },
      caregiverStudentLink: {
        create: vi.fn(),
      },
      enrollment: {
        findMany: vi.fn(),
      },
    };

    crypto = new CryptoService();

    email = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    eventEmitter = {
      emit: vi.fn(),
    };

    registrationService = new RegistrationService(
      prisma as unknown as PrismaService,
      eventEmitter as unknown as EventEmitter2,
      crypto,
      email as unknown as EmailService,
    );
  });

  describe('registerCaregiver', () => {
    const validRegisterDto = {
      email: 'caregiver@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'SecurePass123!',
      relationship: CaregiverRelationshipType.PARENT,
    };

    it('should create a new registration with verification code', async () => {
      prisma.caregiver.findUnique.mockResolvedValue(null);
      prisma.parent.findUnique.mockResolvedValue(null);
      prisma.caregiverRegistration.findFirst.mockResolvedValue(null);
      prisma.caregiverRegistration.create.mockResolvedValue({
        id: 'reg-1',
        email: validRegisterDto.email,
        firstName: validRegisterDto.firstName,
        lastName: validRegisterDto.lastName,
        status: RegistrationStatus.PENDING,
        verificationCode: 'ABC123',
        codeExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const result = await registrationService.registerCaregiver(validRegisterDto);

      expect(result.registrationId).toBe('reg-1');
      expect(result.nextStep).toBe('verify_email');
      expect(prisma.caregiverRegistration.create).toHaveBeenCalled();
      expect(email.send).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists as caregiver', async () => {
      prisma.caregiver.findUnique.mockResolvedValue({
        id: 'existing-caregiver',
        email: validRegisterDto.email,
      });

      await expect(
        registrationService.registerCaregiver(validRegisterDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if email already exists as parent', async () => {
      prisma.caregiver.findUnique.mockResolvedValue(null);
      prisma.parent.findUnique.mockResolvedValue({
        id: 'existing-parent',
        email: validRegisterDto.email,
      });

      await expect(
        registrationService.registerCaregiver(validRegisterDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should return existing registration ID if pending registration exists', async () => {
      prisma.caregiver.findUnique.mockResolvedValue(null);
      prisma.parent.findUnique.mockResolvedValue(null);
      prisma.caregiverRegistration.findFirst.mockResolvedValue({
        id: 'existing-reg',
        email: validRegisterDto.email,
        status: RegistrationStatus.PENDING,
        codeExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        verificationCode: 'EXIST1',
      });

      const result = await registrationService.registerCaregiver(validRegisterDto);

      expect(result.registrationId).toBe('existing-reg');
      expect(result.nextStep).toBe('verify_email');
      expect(email.send).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with correct code', async () => {
      const registration = {
        id: 'reg-1',
        status: RegistrationStatus.PENDING,
        verificationCode: 'ABC123',
        codeExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        failedAttempts: 0,
        lockedUntil: null,
      };

      prisma.caregiverRegistration.findUnique.mockResolvedValue(registration);
      prisma.caregiverRegistration.update.mockResolvedValue({
        ...registration,
        status: RegistrationStatus.EMAIL_VERIFIED,
        verifiedAt: new Date(),
      });

      const result = await registrationService.verifyEmail({
        registrationId: 'reg-1',
        code: 'ABC123',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(RegistrationStatus.EMAIL_VERIFIED);
      expect(result.nextStep).toBe('add_learners');
    });

    it('should reject invalid verification code', async () => {
      const registration = {
        id: 'reg-1',
        status: RegistrationStatus.PENDING,
        verificationCode: 'ABC123',
        codeExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        failedAttempts: 0,
        lockedUntil: null,
      };

      prisma.caregiverRegistration.findUnique.mockResolvedValue(registration);
      prisma.caregiverRegistration.update.mockResolvedValue({
        ...registration,
        failedAttempts: 1,
      });

      await expect(
        registrationService.verifyEmail({
          registrationId: 'reg-1',
          code: 'WRONG1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject expired verification code', async () => {
      const registration = {
        id: 'reg-1',
        status: RegistrationStatus.PENDING,
        verificationCode: 'ABC123',
        codeExpiresAt: new Date(Date.now() - 60 * 60 * 1000), // Expired
        failedAttempts: 0,
        lockedUntil: null,
      };

      prisma.caregiverRegistration.findUnique.mockResolvedValue(registration);
      prisma.caregiverRegistration.update.mockResolvedValue({
        ...registration,
        status: RegistrationStatus.EXPIRED,
      });

      await expect(
        registrationService.verifyEmail({
          registrationId: 'reg-1',
          code: 'ABC123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should lock account after too many failed attempts', async () => {
      const registration = {
        id: 'reg-1',
        status: RegistrationStatus.PENDING,
        verificationCode: 'ABC123',
        codeExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        failedAttempts: 4, // One more will trigger lockout
        lockedUntil: null,
      };

      prisma.caregiverRegistration.findUnique.mockResolvedValue(registration);
      prisma.caregiverRegistration.update.mockResolvedValue({
        ...registration,
        failedAttempts: 5,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
      });

      await expect(
        registrationService.verifyEmail({
          registrationId: 'reg-1',
          code: 'WRONG1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should respect account lockout', async () => {
      const registration = {
        id: 'reg-1',
        status: RegistrationStatus.PENDING,
        verificationCode: 'ABC123',
        codeExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        failedAttempts: 5,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // Locked
      };

      prisma.caregiverRegistration.findUnique.mockResolvedValue(registration);

      await expect(
        registrationService.verifyEmail({
          registrationId: 'reg-1',
          code: 'ABC123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addLearnerLink', () => {
    const validLinkDto = {
      identificationMethod: 'email' as const,
      learnerEmail: 'learner@school.edu',
      verificationMethod: VerificationMethod.SCHOOL_ADMIN_APPROVAL,
    };

    it('should create a learner link request', async () => {
      const registration = {
        id: 'reg-1',
        email: 'caregiver@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: RegistrationStatus.EMAIL_VERIFIED,
        learnerLinks: [],
      };

      prisma.caregiverRegistration.findUnique.mockResolvedValue(registration);
      prisma.profile.findFirst.mockResolvedValue({
        id: 'learner-1',
        givenName: 'Jane',
        familyName: 'Doe',
      });
      prisma.learnerLinkRequest.create.mockResolvedValue({
        id: 'link-1',
        registrationId: 'reg-1',
        learnerEmail: validLinkDto.learnerEmail,
        verificationMethod: validLinkDto.verificationMethod,
        verificationStatus: VerificationStatus.PENDING,
        learnerId: 'learner-1',
      });
      prisma.caregiverRegistration.update.mockResolvedValue({
        ...registration,
        status: RegistrationStatus.SCHOOL_VERIFICATION_PENDING,
      });

      const result = await registrationService.addLearnerLink('reg-1', validLinkDto);

      expect(result.linkRequestId).toBe('link-1');
      expect(result.verificationStatus).toBe(VerificationStatus.PENDING);
      expect(result.requiresSchoolApproval).toBe(true);
    });

    it('should reject if registration is not email verified', async () => {
      const registration = {
        id: 'reg-1',
        status: RegistrationStatus.PENDING,
        learnerLinks: [],
      };

      prisma.caregiverRegistration.findUnique.mockResolvedValue(registration);

      await expect(
        registrationService.addLearnerLink('reg-1', validLinkDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if max learners reached', async () => {
      const registration = {
        id: 'reg-1',
        status: RegistrationStatus.EMAIL_VERIFIED,
        learnerLinks: Array(10).fill({ id: 'link' }), // Max is 10
      };

      prisma.caregiverRegistration.findUnique.mockResolvedValue(registration);

      await expect(
        registrationService.addLearnerLink('reg-1', validLinkDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate required fields for nameAndDob method', async () => {
      const registration = {
        id: 'reg-1',
        status: RegistrationStatus.EMAIL_VERIFIED,
        learnerLinks: [],
      };

      prisma.caregiverRegistration.findUnique.mockResolvedValue(registration);

      await expect(
        registrationService.addLearnerLink('reg-1', {
          identificationMethod: 'nameAndDob',
          learnerFirstName: 'Jane',
          // Missing lastName and dateOfBirth
          verificationMethod: VerificationMethod.SCHOOL_ADMIN_APPROVAL,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyLearnerCode', () => {
    it('should verify learner with valid school code', async () => {
      const linkRequest = {
        id: 'link-1',
        registrationId: 'reg-1',
        verificationStatus: VerificationStatus.PENDING,
        verificationMethod: VerificationMethod.VERIFICATION_CODE_FROM_SCHOOL,
        learnerId: 'learner-1',
        registration: {
          id: 'reg-1',
          email: 'caregiver@example.com',
          firstName: 'John',
        },
      };

      const schoolCode = {
        id: 'code-1',
        code: 'SCHOOL123',
        learnerId: 'learner-1',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        claimedAt: null,
      };

      const learner = {
        id: 'learner-1',
        givenName: 'Jane',
        familyName: 'Doe',
      };

      prisma.learnerLinkRequest.findUnique.mockResolvedValue(linkRequest);
      prisma.schoolVerificationCode.findFirst.mockResolvedValue(schoolCode);
      prisma.profile.findUnique.mockResolvedValue(learner);
      prisma.schoolVerificationCode.update.mockResolvedValue({
        ...schoolCode,
        claimedAt: new Date(),
      });
      prisma.learnerLinkRequest.update.mockResolvedValue({
        ...linkRequest,
        verificationStatus: VerificationStatus.APPROVED,
        linkedAt: new Date(),
      });
      prisma.caregiverRegistration.findUnique.mockResolvedValue({
        id: 'reg-1',
        learnerLinks: [{ ...linkRequest, verificationStatus: VerificationStatus.APPROVED }],
      });

      const result = await registrationService.verifyLearnerCode('link-1', {
        verificationCode: 'SCHOOL123',
      });

      expect(result.success).toBe(true);
      expect(result.learnerId).toBe('learner-1');
      expect(result.learnerName).toBe('Jane Doe');
    });

    it('should reject invalid school code', async () => {
      const linkRequest = {
        id: 'link-1',
        verificationStatus: VerificationStatus.PENDING,
        verificationMethod: VerificationMethod.VERIFICATION_CODE_FROM_SCHOOL,
      };

      prisma.learnerLinkRequest.findUnique.mockResolvedValue(linkRequest);
      prisma.schoolVerificationCode.findFirst.mockResolvedValue(null);

      await expect(
        registrationService.verifyLearnerCode('link-1', {
          verificationCode: 'INVALID',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRegistrationStatus', () => {
    it('should return complete registration status', async () => {
      const registration = {
        id: 'reg-1',
        email: 'caregiver@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: RegistrationStatus.SCHOOL_VERIFICATION_PENDING,
        verifiedAt: new Date(),
        createdAt: new Date(),
        learnerLinks: [
          {
            id: 'link-1',
            learnerEmail: 'learner@school.edu',
            studentId: null,
            learnerFirstName: null,
            learnerLastName: null,
            learnerDateOfBirth: null,
            verificationMethod: VerificationMethod.SCHOOL_ADMIN_APPROVAL,
            verificationStatus: VerificationStatus.PENDING,
            learnerId: null,
            linkedAt: null,
            rejectionReason: null,
          },
        ],
      };

      prisma.caregiverRegistration.findUnique.mockResolvedValue(registration);
      prisma.profile.findMany.mockResolvedValue([]);

      const result = await registrationService.getRegistrationStatus('reg-1');

      expect(result.registrationId).toBe('reg-1');
      expect(result.email).toBe('caregiver@example.com');
      expect(result.status).toBe(RegistrationStatus.SCHOOL_VERIFICATION_PENDING);
      expect(result.emailVerified).toBe(true);
      expect(result.learnerLinks).toHaveLength(1);
      expect(result.canAddMoreLearners).toBe(true);
    });

    it('should throw NotFoundException for non-existent registration', async () => {
      prisma.caregiverRegistration.findUnique.mockResolvedValue(null);

      await expect(
        registrationService.getRegistrationStatus('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateParentVerificationCode', () => {
    it('should generate a verification code for a learner', async () => {
      const learner = {
        id: 'learner-1',
        givenName: 'Jane',
        familyName: 'Doe',
        enrollments: [{ classId: 'class-1', status: 'active' }],
      };

      prisma.profile.findUnique.mockResolvedValue(learner);
      prisma.schoolVerificationCode.updateMany.mockResolvedValue({ count: 0 });
      prisma.schoolVerificationCode.create.mockResolvedValue({
        id: 'code-1',
        code: 'ABCD1234',
        learnerId: 'learner-1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const result = await registrationService.generateParentVerificationCode(
        'school-1',
        'learner-1',
        'admin-1',
      );

      expect(result.code).toHaveLength(8);
      expect(result.learnerId).toBe('learner-1');
      expect(result.learnerName).toBe('Jane Doe');
    });

    it('should throw NotFoundException for non-existent learner', async () => {
      prisma.profile.findUnique.mockResolvedValue(null);

      await expect(
        registrationService.generateParentVerificationCode('school-1', 'non-existent', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email with new code', async () => {
      const registration = {
        id: 'reg-1',
        email: 'caregiver@example.com',
        firstName: 'John',
        status: RegistrationStatus.PENDING,
        verificationCode: 'OLD123',
      };

      prisma.caregiverRegistration.findUnique.mockResolvedValue(registration);
      prisma.caregiverRegistration.update.mockResolvedValue({
        ...registration,
        verificationCode: 'NEW123',
        failedAttempts: 0,
        lockedUntil: null,
      });

      const result = await registrationService.resendVerificationEmail('reg-1');

      expect(result.success).toBe(true);
      expect(email.send).toHaveBeenCalled();
    });

    it('should reject if already verified', async () => {
      const registration = {
        id: 'reg-1',
        status: RegistrationStatus.EMAIL_VERIFIED,
      };

      prisma.caregiverRegistration.findUnique.mockResolvedValue(registration);

      await expect(
        registrationService.resendVerificationEmail('reg-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
