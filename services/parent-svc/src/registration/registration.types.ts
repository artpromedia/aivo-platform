/**
 * Caregiver Self-Registration Types
 *
 * Type definitions for the self-service registration flow for
 * parents/caregivers with secure learner linking.
 */

import {
  IsEmail,
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  MinLength,
  MaxLength,
  IsPhoneNumber,
  IsDateString,
  Matches,
} from 'class-validator';

// ============================================================================
// ENUMS (matching Prisma schema)
// ============================================================================

export enum CaregiverRelationshipType {
  PARENT = 'PARENT',
  GUARDIAN = 'GUARDIAN',
  GRANDPARENT = 'GRANDPARENT',
  FOSTER_PARENT = 'FOSTER_PARENT',
  OTHER_FAMILY = 'OTHER_FAMILY',
  AUTHORIZED_CAREGIVER = 'AUTHORIZED_CAREGIVER',
}

export enum RegistrationStatus {
  PENDING = 'PENDING',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  SCHOOL_VERIFICATION_PENDING = 'SCHOOL_VERIFICATION_PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum VerificationMethod {
  SCHOOL_ADMIN_APPROVAL = 'SCHOOL_ADMIN_APPROVAL',
  VERIFICATION_CODE_FROM_SCHOOL = 'VERIFICATION_CODE_FROM_SCHOOL',
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  EXISTING_FAMILY_LINK = 'EXISTING_FAMILY_LINK',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum RegistrationAuditAction {
  REGISTRATION_STARTED = 'registration_started',
  EMAIL_SENT = 'email_sent',
  EMAIL_VERIFIED = 'email_verified',
  LEARNER_ADDED = 'learner_added',
  SCHOOL_NOTIFIED = 'school_notified',
  SCHOOL_APPROVED = 'school_approved',
  SCHOOL_REJECTED = 'school_rejected',
  CODE_VERIFIED = 'code_verified',
  ACCOUNT_CREATED = 'account_created',
  REGISTRATION_EXPIRED = 'registration_expired',
}

export type LearnerIdentificationMethod = 'email' | 'studentId' | 'nameAndDob';

// ============================================================================
// DTOs - Input Types
// ============================================================================

export class RegisterCaregiverDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password!: string;

  @IsEnum(CaregiverRelationshipType)
  relationship!: CaregiverRelationshipType;

  @IsString()
  @IsOptional()
  captchaToken?: string;

  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsString()
  @IsOptional()
  language?: string;
}

export class VerifyEmailDto {
  @IsUUID()
  registrationId!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;
}

export class AddLearnerLinkDto {
  @IsEnum(['email', 'studentId', 'nameAndDob'])
  identificationMethod!: LearnerIdentificationMethod;

  @IsEmail()
  @IsOptional()
  learnerEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  studentId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  learnerFirstName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  learnerLastName?: string;

  @IsDateString()
  @IsOptional()
  learnerDateOfBirth?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  schoolName?: string;

  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsEnum(VerificationMethod)
  verificationMethod!: VerificationMethod;
}

export class VerifyLearnerCodeDto {
  @IsString()
  @MinLength(6)
  @MaxLength(10)
  verificationCode!: string;
}

export class ResendVerificationDto {
  @IsUUID()
  registrationId!: string;
}

// ============================================================================
// School Admin DTOs
// ============================================================================

export class GetPendingLinkRequestsDto {
  @IsEnum(VerificationStatus)
  @IsOptional()
  status?: VerificationStatus;

  page?: number;
  limit?: number;
}

export class UpdateLinkRequestDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  rejectionReason?: string;
}

export class GenerateParentCodeDto {
  @IsUUID()
  learnerId!: string;
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export interface RegistrationResponse {
  registrationId: string;
  message: string;
  nextStep: 'verify_email' | 'add_learners' | 'pending_verification' | 'complete';
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  status: RegistrationStatus;
  nextStep: 'add_learners' | 'pending_verification' | 'complete';
}

export interface LearnerLinkResponse {
  linkRequestId: string;
  verificationMethod: VerificationMethod;
  verificationStatus: VerificationStatus;
  message: string;
  requiresSchoolApproval: boolean;
}

export interface VerifyLearnerCodeResponse {
  success: boolean;
  message: string;
  learnerId?: string;
  learnerName?: string;
}

export interface RegistrationStatusResponse {
  registrationId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: RegistrationStatus;
  emailVerified: boolean;
  learnerLinks: LearnerLinkSummary[];
  createdAt: Date;
  canAddMoreLearners: boolean;
}

export interface LearnerLinkSummary {
  id: string;
  identificationInfo: string;
  verificationMethod: VerificationMethod;
  verificationStatus: VerificationStatus;
  learnerName?: string;
  linkedAt?: Date;
  rejectionReason?: string;
}

// School Admin Types
export interface PendingLinkRequest {
  id: string;
  registrationId: string;
  caregiverName: string;
  caregiverEmail: string;
  relationship: CaregiverRelationshipType;
  learnerIdentification: {
    method: LearnerIdentificationMethod;
    email?: string;
    studentId?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
  };
  verificationMethod: VerificationMethod;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  matchedLearner?: {
    id: string;
    name: string;
    grade?: string;
  };
}

export interface PaginatedLinkRequests {
  requests: PendingLinkRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GenerateCodeResponse {
  code: string;
  expiresAt: Date;
  learnerId: string;
  learnerName: string;
}

// ============================================================================
// FAMILY DASHBOARD TYPES
// ============================================================================

export interface FamilyDashboardResponse {
  caregiver: CaregiverSummary;
  learners: LearnerOverview[];
  pendingLinks: LearnerLinkSummary[];
  recentActivity: ActivityItem[];
}

export interface CaregiverSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  relationship: CaregiverRelationshipType;
  emailVerified: boolean;
  createdAt: Date;
}

export interface LearnerOverview {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  grade?: string;
  schoolName?: string;
  linkedAt: Date;
  lastActivityAt?: Date;
  overallMastery?: number;
  weeklyMinutes?: number;
}

export interface ActivityItem {
  id: string;
  type: 'achievement' | 'session_complete' | 'milestone' | 'goal_progress';
  learnerId: string;
  learnerName: string;
  title: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface SetActiveLearnerDto {
  @IsUUID()
  learnerId!: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const REGISTRATION_EMAIL_CODE_LENGTH = 6;
export const REGISTRATION_SCHOOL_CODE_LENGTH = 8;
export const MAX_LEARNERS_PER_REGISTRATION = 10;
export const REGISTRATION_EXPIRY_DAYS = 30;

export const RELATIONSHIP_LABELS: Record<CaregiverRelationshipType, string> = {
  [CaregiverRelationshipType.PARENT]: 'Parent',
  [CaregiverRelationshipType.GUARDIAN]: 'Legal Guardian',
  [CaregiverRelationshipType.GRANDPARENT]: 'Grandparent',
  [CaregiverRelationshipType.FOSTER_PARENT]: 'Foster Parent',
  [CaregiverRelationshipType.OTHER_FAMILY]: 'Other Family Member',
  [CaregiverRelationshipType.AUTHORIZED_CAREGIVER]: 'Authorized Caregiver',
};

export const VERIFICATION_METHOD_LABELS: Record<VerificationMethod, string> = {
  [VerificationMethod.SCHOOL_ADMIN_APPROVAL]: 'School Administrator Approval',
  [VerificationMethod.VERIFICATION_CODE_FROM_SCHOOL]: 'Verification Code from School',
  [VerificationMethod.DOCUMENT_UPLOAD]: 'Document Upload',
  [VerificationMethod.EXISTING_FAMILY_LINK]: 'Existing Family Connection',
};
