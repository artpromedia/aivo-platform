/**
 * Caregiver Delegation Types
 *
 * Type definitions for caregiver accounts, invitations, and
 * delegated access management.
 */

import {
  IsEmail,
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  MinLength,
  MaxLength,
  IsPhoneNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// ENUMS
// ============================================================================

export enum CaregiverStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
}

export enum CaregiverInviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export enum CaregiverRelationship {
  CAREGIVER = 'caregiver',
  GRANDPARENT = 'grandparent',
  NANNY = 'nanny',
  AUNT_UNCLE = 'aunt_uncle',
  FAMILY_FRIEND = 'family_friend',
  OTHER = 'other',
}

export enum CaregiverLinkStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  REVOKED = 'revoked',
}

export enum DelegationAction {
  INVITED = 'invited',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
  PERMISSIONS_UPDATED = 'permissions_updated',
  RESENT = 'resent',
}

// ============================================================================
// PERMISSION TYPES
// ============================================================================

export interface CaregiverPermissions {
  viewProgress: boolean;
  viewGrades: boolean;
  viewActivity: boolean;
  viewAchievements: boolean;
  receiveNotifications: boolean;
  viewTeacherNotes: boolean;
}

export const DEFAULT_CAREGIVER_PERMISSIONS: CaregiverPermissions = {
  viewProgress: true,
  viewGrades: true,
  viewActivity: true,
  viewAchievements: true,
  receiveNotifications: true,
  viewTeacherNotes: false,
};

// ============================================================================
// DTOs - Input Types
// ============================================================================

export class CreateCaregiverInviteDto {
  @IsUUID()
  studentId!: string;

  @IsEmail()
  caregiverEmail!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  caregiverName?: string;

  @IsEnum(CaregiverRelationship)
  @IsOptional()
  relationship?: CaregiverRelationship;

  @IsOptional()
  permissions?: Partial<CaregiverPermissions>;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  message?: string;

  @IsString()
  @IsOptional()
  language?: string;
}

export class AcceptCaregiverInviteDto {
  @IsString()
  inviteCode!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  givenName!: string;

  @IsString()
  familyName!: string;

  @IsString()
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}

export class UpdateCaregiverProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  givenName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  familyName?: string;

  @IsString()
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}

export class UpdateCaregiverPermissionsDto {
  @IsUUID()
  caregiverId!: string;

  @IsUUID()
  studentId!: string;

  @IsBoolean()
  @IsOptional()
  viewProgress?: boolean;

  @IsBoolean()
  @IsOptional()
  viewGrades?: boolean;

  @IsBoolean()
  @IsOptional()
  viewActivity?: boolean;

  @IsBoolean()
  @IsOptional()
  viewAchievements?: boolean;

  @IsBoolean()
  @IsOptional()
  receiveNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  viewTeacherNotes?: boolean;
}

export class RevokeCaregiverAccessDto {
  @IsUUID()
  caregiverId!: string;

  @IsUUID()
  studentId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class ResendCaregiverInviteDto {
  @IsUUID()
  inviteId!: string;
}

export class CancelCaregiverInviteDto {
  @IsUUID()
  inviteId!: string;
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export interface CaregiverProfile {
  id: string;
  email: string;
  givenName: string;
  familyName: string;
  phone?: string | null;
  photoUrl?: string | null;
  language: string;
  timezone: string;
  emailVerified: boolean;
  status: CaregiverStatus;
  createdAt: Date;
}

export interface CaregiverStudentLink {
  id: string;
  caregiverId: string;
  studentId: string;
  relationship: CaregiverRelationship;
  status: CaregiverLinkStatus;
  permissions: CaregiverPermissions;
  delegatedById: string;
  delegatedAt: Date;
  createdAt: Date;
}

export interface CaregiverInvite {
  id: string;
  code: string;
  studentId: string;
  caregiverEmail: string;
  caregiverName?: string | null;
  relationship: CaregiverRelationship;
  status: CaregiverInviteStatus;
  permissions: CaregiverPermissions;
  message?: string | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface CaregiverWithStudents extends CaregiverProfile {
  students: CaregiverStudentSummary[];
}

export interface CaregiverStudentSummary {
  id: string;
  givenName: string;
  familyName: string;
  photoUrl?: string | null;
  grade?: string | null;
  relationship: CaregiverRelationship;
  permissions: CaregiverPermissions;
  delegatedBy: {
    id: string;
    givenName: string;
    familyName: string;
  };
}

// For parent's view of caregivers
export interface StudentCaregiver {
  id: string;
  email: string;
  givenName: string;
  familyName: string;
  photoUrl?: string | null;
  relationship: CaregiverRelationship;
  status: CaregiverLinkStatus;
  permissions: CaregiverPermissions;
  delegatedAt: Date;
}

export interface StudentCaregiverInvite {
  id: string;
  caregiverEmail: string;
  caregiverName?: string | null;
  relationship: CaregiverRelationship;
  status: CaregiverInviteStatus;
  permissions: CaregiverPermissions;
  expiresAt: Date;
  createdAt: Date;
}

export interface StudentCaregiverSummary {
  studentId: string;
  studentName: string;
  maxCaregivers: number;
  currentCount: number;
  remainingSlots: number;
  caregivers: StudentCaregiver[];
  pendingInvites: StudentCaregiverInvite[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface CreateCaregiverInviteResponse {
  inviteId: string;
  inviteCode: string;
  inviteUrl: string;
  expiresAt: Date;
}

export interface AcceptCaregiverInviteResponse {
  caregiver: CaregiverProfile;
  student: {
    id: string;
    givenName: string;
    familyName: string;
  };
  permissions: CaregiverPermissions;
}

export interface CaregiverLimitInfo {
  studentId: string;
  maxCaregivers: number;
  currentCount: number;
  remainingSlots: number;
  canAddMore: boolean;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface CaregiverNotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  progressUpdates: boolean;
  achievementAlerts: boolean;
  activityAlerts: boolean;
}

export const DEFAULT_CAREGIVER_NOTIFICATION_PREFERENCES: CaregiverNotificationPreferences = {
  emailEnabled: true,
  pushEnabled: true,
  progressUpdates: true,
  achievementAlerts: true,
  activityAlerts: false,
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const CAREGIVER_INVITE_EXPIRY_DAYS = 7;
export const DEFAULT_MAX_CAREGIVERS_PER_STUDENT = 2;
export const CAREGIVER_RELATIONSHIP_LABELS: Record<CaregiverRelationship, string> = {
  [CaregiverRelationship.CAREGIVER]: 'Caregiver',
  [CaregiverRelationship.GRANDPARENT]: 'Grandparent',
  [CaregiverRelationship.NANNY]: 'Nanny/Au Pair',
  [CaregiverRelationship.AUNT_UNCLE]: 'Aunt/Uncle',
  [CaregiverRelationship.FAMILY_FRIEND]: 'Family Friend',
  [CaregiverRelationship.OTHER]: 'Other',
};
