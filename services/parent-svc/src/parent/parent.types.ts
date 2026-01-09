/**
 * Parent Service Types
 *
 * Type definitions for parent accounts, student linkage,
 * progress tracking, and consent management.
 */

import { IsEmail, IsString, IsOptional, IsUUID, IsEnum, IsBoolean, MinLength, MaxLength, IsPhoneNumber } from 'class-validator';

// ============================================================================
// ENUMS
// ============================================================================

export enum ParentStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
}

export enum InviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export enum ParentRelationship {
  PARENT = 'parent',
  GUARDIAN = 'guardian',
  GRANDPARENT = 'grandparent',
  FOSTER_PARENT = 'foster_parent',
  OTHER = 'other',
}

export enum ConsentType {
  COPPA = 'coppa',
  DATA_COLLECTION = 'data_collection',
  COMMUNICATION = 'communication',
  MARKETING = 'marketing',
}

export enum ConsentStatus {
  PENDING = 'pending',
  GRANTED = 'granted',
  DENIED = 'denied',
  NOT_REQUIRED = 'not_required',
}

export enum DigestFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  NEVER = 'never',
}

export enum LinkStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  REVOKED = 'revoked',
}

// ============================================================================
// DTOs - Input Types
// ============================================================================

export class CreateParentInviteDto {
  @IsUUID()
  studentId!: string;

  @IsEmail()
  parentEmail!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  parentName?: string;

  @IsEnum(ParentRelationship)
  @IsOptional()
  relationship?: ParentRelationship;

  @IsString()
  @IsOptional()
  language?: string;
}

export class AcceptInviteDto {
  @IsString()
  inviteCode!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsOptional()
  givenName?: string;

  @IsString()
  @IsOptional()
  familyName?: string;

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

export class UpdateParentProfileDto {
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
}

export class UpdateParentPreferencesDto {
  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsEnum(DigestFrequency)
  @IsOptional()
  digestFrequency?: DigestFrequency;

  @IsOptional()
  notifications?: NotificationPreferences;
}

export class RecordConsentDto {
  @IsUUID()
  studentId!: string;

  @IsEnum(ConsentType)
  consentType!: ConsentType;

  @IsBoolean()
  granted!: boolean;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;
}

export class UpdateStudentPermissionsDto {
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
  viewAttendance?: boolean;

  @IsBoolean()
  @IsOptional()
  receiveNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  messageTeacher?: boolean;
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export interface ParentProfile {
  id: string;
  email: string;
  givenName: string;
  familyName: string;
  phone?: string | null;
  photoUrl?: string | null;
  language: string;
  timezone: string;
  emailVerified: boolean;
  status: ParentStatus;
  createdAt: Date;
}

export interface ParentPreferences {
  language: string;
  timezone: string;
  digestFrequency: DigestFrequency;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  achievements: boolean;
  progressUpdates: boolean;
  teacherMessages: boolean;
  weeklyDigest: boolean;
  assignmentReminders: boolean;
  attendanceAlerts: boolean;
}

export interface StudentSummary {
  id: string;
  givenName: string;
  familyName: string;
  photoUrl?: string | null;
  grade?: string | null;
  classes: ClassInfo[];
  overallMastery: number;
  weeklyStats: WeeklyStats;
  recentActivity: RecentActivity[];
  recentAchievements: Achievement[];
  lastActivityAt?: Date | null;
}

export interface ClassInfo {
  id: string;
  name: string;
  teacher?: {
    id?: string;
    name: string;
    photoUrl?: string;
  };
}

export interface WeeklyStats {
  totalMinutes: number;
  lessonsCompleted: number;
  daysActive: number;
  averageScore: number;
}

export interface RecentActivity {
  id: string;
  lessonTitle: string;
  startedAt: Date;
  completedAt?: Date | null;
  score?: number | null;
  timeSpentMinutes: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl?: string | null;
  earnedAt: Date;
}

export interface ProgressReport {
  studentId: string;
  period: string;
  startDate: Date;
  endDate: Date;
  summary: ProgressSummary;
  dailyActivity: DailyActivity[];
  subjectBreakdown: SubjectBreakdown[];
  skillProgress: SkillProgress[];
  strengths: SkillItem[];
  areasForImprovement: SkillItem[];
  achievements: Achievement[];
}

export interface ProgressSummary {
  totalTimeMinutes: number;
  completedLessons: number;
  averageScore: number;
  lessonsStarted: number;
  daysActive: number;
}

export interface DailyActivity {
  date: string;
  minutes: number;
  completed: number;
}

export interface SubjectBreakdown {
  subject: string;
  minutes: number;
  lessonsCompleted: number;
  averageScore: number;
}

export interface SkillProgress {
  skillId: string;
  skillName: string;
  subject: string;
  masteryLevel: number;
  attempts: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SkillItem {
  skillName: string;
  masteryLevel: number;
}

export interface WeeklySummary {
  studentId: string;
  studentName: string;
  weekStart: Date;
  weekEnd: Date;
  summary: WeeklySummaryStats;
  comparison: WeeklyComparison;
  highlights: string[];
  lessonsCompleted: CompletedLesson[];
  achievements: AchievementSummary[];
  teacherNotes: TeacherNote[];
}

export interface WeeklySummaryStats {
  totalMinutes: number;
  completedLessons: number;
  averageScore: number;
  achievementsEarned: number;
  daysActive: number;
}

export interface WeeklyComparison {
  minutesChange: number;
  minutesChangePercent: number;
}

export interface CompletedLesson {
  title: string;
  subject: string;
  score?: number | null;
  completedAt: Date;
}

export interface AchievementSummary {
  name: string;
  description?: string;
  iconUrl?: string | null;
}

export interface TeacherNote {
  content: string;
  teacherName: string;
  createdAt: Date;
}

export interface ConsentRecord {
  id: string;
  consentType: string;
  granted: boolean;
  consentVersion: string;
  grantedAt?: Date | null;
  revokedAt?: Date | null;
}

export interface ParentStudentLink {
  id: string;
  parentId: string;
  studentId: string;
  relationship: ParentRelationship;
  isPrimary: boolean;
  status: LinkStatus;
  consentStatus: ConsentStatus;
  permissions: StudentPermissions;
  createdAt: Date;
}

export interface StudentPermissions {
  viewProgress: boolean;
  viewGrades: boolean;
  viewAttendance: boolean;
  receiveNotifications: boolean;
  messageTeacher: boolean;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface CreateInviteResponse {
  inviteCode: string;
  inviteUrl: string;
  expiresAt: Date;
}

export interface AcceptInviteResponse {
  parent: ParentProfile;
  student: StudentSummary;
  requiresConsent: boolean;
}

export interface ParentWithStudents extends ParentProfile {
  students: StudentSummary[];
}

// ============================================================================
// DIFFICULTY ADJUSTMENT TYPES
// ============================================================================

export enum DifficultyRecommendationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  MODIFIED = 'MODIFIED',
  DENIED = 'DENIED',
  AUTO_APPLIED = 'AUTO_APPLIED',
  EXPIRED = 'EXPIRED',
}

export enum SkillDomain {
  ELA = 'ELA',
  MATH = 'MATH',
  SCIENCE = 'SCIENCE',
  SPEECH = 'SPEECH',
  SEL = 'SEL',
}

export interface DifficultyRecommendation {
  id: string;
  domain: SkillDomain | null;
  currentLevel: number;
  recommendedLevel: number;
  reasonTitle: string;
  reasonDescription: string;
  evidence: DifficultyEvidence;
  expiresAt: string;
  createdAt: string;
}

export interface DifficultyEvidence {
  masteryScore: number;
  recentAccuracy: number;
  practiceCount: number;
  consecutiveSuccesses: number;
}

export interface DifficultyPreferences {
  autoApproveIncreases: boolean;
  autoApproveDecreases: boolean;
  notifyOnRecommendation: boolean;
  domainOverrides: Record<string, DomainOverride> | null;
  maxDifficultyLevel: number | null;
  minDifficultyLevel: number | null;
}

export interface DomainOverride {
  lockedLevel: number;
  reason?: string;
  lockedAt?: string;
}

export interface DifficultyLevel {
  level: number;
  source: 'default' | 'calculated' | 'parent_override';
}

export interface DifficultyChangeRecord {
  id: string;
  domain: SkillDomain | null;
  previousLevel: number;
  newLevel: number;
  changeSource: string;
  changedByType: string;
  wasEffective: boolean | null;
  createdAt: string;
}

export class RespondToRecommendationDto {
  @IsUUID()
  recommendationId!: string;

  @IsEnum(['approve', 'modify', 'deny'])
  action!: 'approve' | 'modify' | 'deny';

  @IsOptional()
  modifiedLevel?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  parentNotes?: string;
}

export class SetDomainDifficultyDto {
  @IsUUID()
  studentId!: string;

  @IsEnum(SkillDomain)
  domain!: SkillDomain;

  level!: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class UpdateDifficultyPreferencesDto {
  @IsUUID()
  studentId!: string;

  @IsBoolean()
  @IsOptional()
  autoApproveIncreases?: boolean;

  @IsBoolean()
  @IsOptional()
  autoApproveDecreases?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyOnRecommendation?: boolean;

  @IsOptional()
  maxDifficultyLevel?: number | null;

  @IsOptional()
  minDifficultyLevel?: number | null;
}
