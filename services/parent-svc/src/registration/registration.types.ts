/**
 * Caregiver Self-Registration Types
 *
 * Type definitions for the self-service registration flow for
 * parents/caregivers with secure learner linking.
 */

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

export interface RegisterCaregiverDto {
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  password: string;
  relationship: CaregiverRelationshipType;
  captchaToken?: string;
  tenantId?: string;
  language?: string;
}

export interface VerifyEmailDto {
  registrationId: string;
  code: string;
}

export interface AddLearnerLinkDto {
  identificationMethod: LearnerIdentificationMethod;
  learnerEmail?: string;
  studentId?: string;
  learnerFirstName?: string;
  learnerLastName?: string;
  learnerDateOfBirth?: string;
  schoolName?: string;
  schoolId?: string;
  verificationMethod: VerificationMethod;
}

export interface VerifyLearnerCodeDto {
  verificationCode: string;
}

export interface ResendVerificationDto {
  registrationId: string;
}

// ============================================================================
// School Admin DTOs
// ============================================================================

export interface GetPendingLinkRequestsDto {
  status?: VerificationStatus;

  page?: number;
  limit?: number;
}

export interface UpdateLinkRequestDto {
  status: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

export interface GenerateParentCodeDto {
  learnerId: string;
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
  learnerId: string;
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
