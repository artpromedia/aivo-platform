/**
 * Parent Service
 *
 * Manages parent accounts, student linkage, and progress visibility:
 * - Invite-based parent onboarding
 * - Multi-child support
 * - Progress and achievement tracking
 * - Consent management for minors
 * - Privacy-respecting data access
 */

import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { logger, metrics } from '@aivo/ts-observability';
import { PrismaService } from '../prisma/prisma.service.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { I18nService } from '../i18n/i18n.service.js';
import {
  CreateParentInviteDto,
  AcceptInviteDto,
  UpdateParentProfileDto,
  UpdateParentPreferencesDto,
  RecordConsentDto,
  ParentProfile,
  ParentPreferences,
  StudentSummary,
  ProgressReport,
  WeeklySummary,
  ConsentRecord,
  CreateInviteResponse,
  AcceptInviteResponse,
  ParentWithStudents,
  ParentStatus,
  InviteStatus,
  ConsentStatus,
  DigestFrequency,
  NotificationPreferences,
} from './parent.types.js';
import { config } from '../config.js';

@Injectable()
export class ParentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly i18n: I18nService,
    private readonly crypto: CryptoService,
    private readonly notifications: NotificationService,
  ) {}

  // ============================================================================
  // PARENT ACCOUNT MANAGEMENT
  // ============================================================================

  /**
   * Create an invite for a parent to join
   */
  async createParentInvite(
    teacherId: string,
    dto: CreateParentInviteDto,
  ): Promise<CreateInviteResponse> {
    // Verify teacher has access to the student
    const student = await this.prisma.profile.findFirst({
      where: {
        id: dto.studentId,
        enrollments: {
          some: {
            class: {
              enrollments: {
                some: {
                  profileId: teacherId,
                  role: 'teacher',
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new ForbiddenException('You do not have access to this student');
    }

    // Check for existing pending invite
    const existingInvite = await this.prisma.parentInvite.findFirst({
      where: {
        studentId: dto.studentId,
        parentEmail: dto.parentEmail.toLowerCase(),
        status: InviteStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      // Resend existing invite
      await this.sendInviteEmail(existingInvite);
      return {
        inviteCode: existingInvite.code,
        inviteUrl: this.generateInviteUrl(existingInvite.code),
        expiresAt: existingInvite.expiresAt,
      };
    }

    // Generate secure invite code
    const inviteCode = await this.crypto.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + config.parentInviteExpiryDays * 24 * 60 * 60 * 1000);

    // Create invite
    const invite = await this.prisma.parentInvite.create({
      data: {
        code: inviteCode,
        studentId: dto.studentId,
        parentEmail: dto.parentEmail.toLowerCase(),
        parentName: dto.parentName,
        relationship: dto.relationship || 'parent',
        invitedById: teacherId,
        status: InviteStatus.PENDING,
        expiresAt,
        language: dto.language || 'en',
      },
    });

    // Send invite email
    await this.sendInviteEmail(invite);

    metrics.increment('parent.invite.created');
    logger.info('Parent invite created', {
      studentId: dto.studentId,
      invitedBy: teacherId,
    });

    return {
      inviteCode,
      inviteUrl: this.generateInviteUrl(inviteCode),
      expiresAt,
    };
  }

  /**
   * Accept a parent invite and create/link account
   */
  async acceptInvite(dto: AcceptInviteDto): Promise<AcceptInviteResponse> {
    // Find and validate invite
    const invite = await this.prisma.parentInvite.findUnique({
      where: { code: dto.inviteCode },
      include: {
        student: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invite code');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('This invite has already been used');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite has expired');
    }

    // Verify email matches (if provided during invite)
    if (invite.parentEmail && invite.parentEmail !== dto.email.toLowerCase()) {
      throw new BadRequestException('Email does not match invite');
    }

    // Check if parent account already exists
    let parent = await this.prisma.parent.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    const isNewParent = !parent;

    if (!parent) {
      // Create new parent account
      parent = await this.prisma.parent.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash: await this.crypto.hashPassword(dto.password),
          givenName: dto.givenName || invite.parentName?.split(' ')[0] || '',
          familyName: dto.familyName || invite.parentName?.split(' ').slice(1).join(' ') || '',
          phone: dto.phone,
          language: dto.language || invite.language || 'en',
          timezone: dto.timezone || 'UTC',
          status: ParentStatus.ACTIVE,
          emailVerified: false,
          digestFrequency: DigestFrequency.WEEKLY,
          notificationPreferences: this.getDefaultNotificationPreferences(),
        },
      });

      // Send verification email
      await this.sendVerificationEmail(parent);
    }

    // Check if student is already linked
    const existingLink = await this.prisma.parentStudentLink.findUnique({
      where: {
        parentId_studentId: {
          parentId: parent.id,
          studentId: invite.studentId,
        },
      },
    });

    if (existingLink) {
      throw new BadRequestException('You are already linked to this student');
    }

    // Determine if consent is required (COPPA - under 13)
    const studentAge = this.calculateAge(invite.student.dateOfBirth);
    const requiresConsent = studentAge < config.coppaMinAge;

    // Create parent-student link
    await this.prisma.parentStudentLink.create({
      data: {
        parentId: parent.id,
        studentId: invite.studentId,
        relationship: invite.relationship,
        isPrimary: true,
        status: 'active',
        consentStatus: requiresConsent ? ConsentStatus.PENDING : ConsentStatus.NOT_REQUIRED,
        permissions: {
          viewProgress: true,
          viewGrades: true,
          viewAttendance: true,
          receiveNotifications: true,
          messageTeacher: true,
        },
      },
    });

    // Update invite status
    await this.prisma.parentInvite.update({
      where: { id: invite.id },
      data: {
        status: InviteStatus.ACCEPTED,
        acceptedAt: new Date(),
        parentId: parent.id,
      },
    });

    // Emit event
    this.eventEmitter.emit('parent.linked', {
      parentId: parent.id,
      studentId: invite.studentId,
      relationship: invite.relationship,
      isNewParent,
    });

    metrics.increment('parent.invite.accepted');

    return {
      parent: this.toParentProfile(parent),
      student: await this.getStudentSummary(invite.studentId, parent.id),
      requiresConsent,
    };
  }

  /**
   * Get parent profile with linked students
   */
  async getParentProfile(parentId: string): Promise<ParentWithStudents> {
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        studentLinks: {
          where: { status: 'active' },
          include: {
            student: {
              include: {
                enrollments: {
                  where: { status: 'active' },
                  include: { class: true },
                },
              },
            },
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const students = await Promise.all(
      parent.studentLinks.map((link) =>
        this.getStudentSummary(link.studentId, parentId)
      )
    );

    return {
      ...this.toParentProfile(parent),
      students,
    };
  }

  /**
   * Update parent profile
   */
  async updateProfile(
    parentId: string,
    dto: UpdateParentProfileDto
  ): Promise<ParentProfile> {
    const parent = await this.prisma.parent.update({
      where: { id: parentId },
      data: {
        givenName: dto.givenName,
        familyName: dto.familyName,
        phone: dto.phone,
        photoUrl: dto.photoUrl,
        updatedAt: new Date(),
      },
    });

    return this.toParentProfile(parent);
  }

  /**
   * Update parent preferences
   */
  async updatePreferences(
    parentId: string,
    dto: UpdateParentPreferencesDto
  ): Promise<ParentPreferences> {
    const parent = await this.prisma.parent.update({
      where: { id: parentId },
      data: {
        language: dto.language,
        timezone: dto.timezone,
        digestFrequency: dto.digestFrequency,
        notificationPreferences: dto.notifications,
        updatedAt: new Date(),
      },
    });

    return {
      language: parent.language,
      timezone: parent.timezone,
      digestFrequency: parent.digestFrequency as DigestFrequency,
      notifications: parent.notificationPreferences as NotificationPreferences,
    };
  }

  // ============================================================================
  // STUDENT PROGRESS
  // ============================================================================

  /**
   * Get student summary for parent dashboard
   */
  async getStudentSummary(studentId: string, parentId: string): Promise<StudentSummary> {
    // Verify parent has access
    await this.verifyParentAccess(parentId, studentId);

    const student = await this.prisma.profile.findUnique({
      where: { id: studentId },
      include: {
        learnerModel: true,
        enrollments: {
          where: { status: 'active' },
          include: {
            class: {
              include: {
                enrollments: {
                  where: { role: 'teacher' },
                  include: {
                    profile: {
                      select: { id: true, givenName: true, familyName: true, photoUrl: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get recent activity (last 7 days)
    const recentActivity = await this.prisma.learningSession.findMany({
      where: {
        studentId,
        startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
      include: { lesson: { select: { id: true, title: true } } },
    });

    // Get achievements (last 30 days)
    const recentAchievements = await this.prisma.achievement.findMany({
      where: {
        studentId,
        earnedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { earnedAt: 'desc' },
      take: 5,
    });

    // Calculate weekly stats
    const weeklyStats = await this.calculateWeeklyStats(studentId);

    return {
      id: student.id,
      givenName: student.givenName,
      familyName: student.familyName,
      photoUrl: student.photoUrl,
      grade: student.grade,
      classes: student.enrollments.map((e) => ({
        id: e.class.id,
        name: e.class.name,
        teacher: e.class.enrollments[0]?.profile
          ? {
              id: e.class.enrollments[0].profile.id,
              name: `${e.class.enrollments[0].profile.givenName} ${e.class.enrollments[0].profile.familyName}`,
              photoUrl: e.class.enrollments[0].profile.photoUrl ?? undefined,
            }
          : undefined,
      })),
      overallMastery: student.learnerModel?.overallMastery || 0,
      weeklyStats,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        lessonTitle: a.lesson.title,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
        score: a.score,
        timeSpentMinutes: Math.round((a.timeSpentSeconds || 0) / 60),
      })),
      recentAchievements: recentAchievements.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        iconUrl: a.iconUrl,
        earnedAt: a.earnedAt,
      })),
      lastActivityAt: student.learnerModel?.lastActivityAt,
    };
  }

  /**
   * Get detailed progress report for a student
   */
  async getProgressReport(
    studentId: string,
    parentId: string,
    options: {
      period?: 'week' | 'month' | 'quarter' | 'year';
      classId?: string;
    } = {}
  ): Promise<ProgressReport> {
    await this.verifyParentAccess(parentId, studentId);

    const { period = 'month', classId } = options;
    const startDate = this.getPeriodStartDate(period);

    // Get learning sessions for period
    const sessions = await this.prisma.learningSession.findMany({
      where: {
        studentId,
        startedAt: { gte: startDate },
        ...(classId && {
          lesson: {
            classAssignments: { some: { classId } },
          },
        }),
      },
      include: {
        lesson: {
          include: {
            skills: { include: { skill: true } },
          },
        },
        responses: true,
      },
    });

    // Get skill mastery
    const skillMastery = await this.prisma.skillMastery.findMany({
      where: { studentId },
      include: { skill: true },
      orderBy: { masteryLevel: 'desc' },
    });

    // Calculate metrics
    const totalTimeMinutes = sessions.reduce(
      (sum, s) => sum + Math.round((s.timeSpentSeconds || 0) / 60),
      0
    );
    const completedLessons = sessions.filter((s) => s.status === 'completed').length;
    const averageScore = this.calculateAverageScore(sessions);

    // Get daily activity breakdown
    const dailyActivity = await this.getDailyActivityBreakdown(studentId, startDate);

    // Get subject breakdown
    const subjectBreakdown = await this.getSubjectBreakdown(studentId, startDate);

    // Analyze strengths and areas for improvement
    const { strengths, areasForImprovement } = this.analyzeSkillMastery(skillMastery);

    return {
      studentId,
      period,
      startDate,
      endDate: new Date(),
      summary: {
        totalTimeMinutes,
        completedLessons,
        averageScore,
        lessonsStarted: sessions.length,
        daysActive: new Set(
          sessions.map((s) => s.startedAt.toISOString().split('T')[0])
        ).size,
      },
      dailyActivity,
      subjectBreakdown,
      skillProgress: skillMastery.map((sm) => ({
        skillId: sm.skillId,
        skillName: sm.skill.name,
        subject: sm.skill.subject,
        masteryLevel: sm.masteryLevel,
        attempts: sm.attempts,
        trend: this.calculateTrend(sm),
      })),
      strengths,
      areasForImprovement,
      achievements: await this.getAchievementsForPeriod(studentId, startDate),
    };
  }

  /**
   * Generate weekly summary for a student
   */
  async generateWeeklySummary(studentId: string, parentId: string): Promise<WeeklySummary> {
    await this.verifyParentAccess(parentId, studentId);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const student = await this.prisma.profile.findUnique({
      where: { id: studentId },
      select: { givenName: true, familyName: true },
    });

    // Get week's sessions
    const sessions = await this.prisma.learningSession.findMany({
      where: {
        studentId,
        startedAt: { gte: weekStart },
      },
      include: {
        lesson: { select: { title: true, subject: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Get achievements
    const achievements = await this.prisma.achievement.findMany({
      where: {
        studentId,
        earnedAt: { gte: weekStart },
      },
    });

    // Calculate stats
    const totalMinutes = sessions.reduce(
      (sum, s) => sum + Math.round((s.timeSpentSeconds || 0) / 60),
      0
    );
    const completedCount = sessions.filter((s) => s.status === 'completed').length;
    const averageScore = this.calculateAverageScore(sessions);

    // Get previous week for comparison
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    const previousSessions = await this.prisma.learningSession.findMany({
      where: {
        studentId,
        startedAt: { gte: previousWeekStart, lt: weekStart },
      },
    });

    const previousMinutes = previousSessions.reduce(
      (sum, s) => sum + Math.round((s.timeSpentSeconds || 0) / 60),
      0
    );

    // Generate highlights
    const highlights = this.generateHighlights(sessions, achievements);

    // Get teacher notes
    const teacherNotes = await this.prisma.teacherNote.findMany({
      where: {
        studentId,
        createdAt: { gte: weekStart },
        visibleToParent: true,
      },
      include: {
        teacher: { select: { givenName: true, familyName: true } },
      },
    });

    return {
      studentId,
      studentName: `${student?.givenName} ${student?.familyName}`,
      weekStart,
      weekEnd: new Date(),
      summary: {
        totalMinutes,
        completedLessons: completedCount,
        averageScore,
        achievementsEarned: achievements.length,
        daysActive: new Set(
          sessions.map((s) => s.startedAt.toISOString().split('T')[0])
        ).size,
      },
      comparison: {
        minutesChange: totalMinutes - previousMinutes,
        minutesChangePercent:
          previousMinutes > 0
            ? Math.round(((totalMinutes - previousMinutes) / previousMinutes) * 100)
            : 0,
      },
      highlights,
      lessonsCompleted: sessions
        .filter((s) => s.status === 'completed')
        .map((s) => ({
          title: s.lesson.title,
          subject: s.lesson.subject,
          score: s.score,
          completedAt: s.completedAt!,
        })),
      achievements: achievements.map((a) => ({
        name: a.name,
        description: a.description,
        iconUrl: a.iconUrl,
      })),
      teacherNotes: teacherNotes.map((n) => ({
        content: n.content,
        teacherName: `${n.teacher.givenName} ${n.teacher.familyName}`,
        createdAt: n.createdAt,
      })),
    };
  }

  // ============================================================================
  // CONSENT MANAGEMENT
  // ============================================================================

  /**
   * Record parental consent for a minor
   */
  async recordConsent(parentId: string, dto: RecordConsentDto): Promise<ConsentRecord> {
    await this.verifyParentAccess(parentId, dto.studentId);

    // Get link
    const link = await this.prisma.parentStudentLink.findUnique({
      where: {
        parentId_studentId: { parentId, studentId: dto.studentId },
      },
    });

    if (!link) {
      throw new NotFoundException('Parent-student link not found');
    }

    // Create consent record
    const consent = await this.prisma.consentRecord.create({
      data: {
        parentId,
        studentId: dto.studentId,
        linkId: link.id,
        consentType: dto.consentType,
        granted: dto.granted,
        consentVersion: '1.0',
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        grantedAt: dto.granted ? new Date() : null,
        revokedAt: !dto.granted ? new Date() : null,
      },
    });

    // Update link consent status if COPPA consent
    if (dto.consentType === 'coppa') {
      await this.prisma.parentStudentLink.update({
        where: { id: link.id },
        data: {
          consentStatus: dto.granted ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
          consentGrantedAt: dto.granted ? new Date() : null,
        },
      });
    }

    // Emit event
    this.eventEmitter.emit('consent.recorded', {
      parentId,
      studentId: dto.studentId,
      consentType: dto.consentType,
      granted: dto.granted,
    });

    logger.info('Consent recorded', {
      parentId,
      studentId: dto.studentId,
      consentType: dto.consentType,
      granted: dto.granted,
    });

    return {
      id: consent.id,
      consentType: consent.consentType,
      granted: consent.granted,
      consentVersion: consent.consentVersion,
      grantedAt: consent.grantedAt,
      revokedAt: consent.revokedAt,
    };
  }

  /**
   * Get all consent records for a student
   */
  async getConsentRecords(parentId: string, studentId: string): Promise<ConsentRecord[]> {
    await this.verifyParentAccess(parentId, studentId);

    const records = await this.prisma.consentRecord.findMany({
      where: { parentId, studentId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      consentType: r.consentType,
      granted: r.granted,
      consentVersion: r.consentVersion,
      grantedAt: r.grantedAt,
      revokedAt: r.revokedAt,
    }));
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async verifyParentAccess(parentId: string, studentId: string): Promise<void> {
    const link = await this.prisma.parentStudentLink.findUnique({
      where: {
        parentId_studentId: { parentId, studentId },
      },
    });

    if (!link || link.status !== 'active') {
      throw new ForbiddenException('You do not have access to this student');
    }
  }

  private async sendInviteEmail(invite: { 
    code: string; 
    parentEmail: string; 
    parentName?: string | null; 
    language: string;
    expiresAt: Date;
  }): Promise<void> {
    const inviteUrl = this.generateInviteUrl(invite.code);

    await this.notifications.sendEmail({
      to: invite.parentEmail,
      template: 'parent-invite',
      language: invite.language || 'en',
      data: {
        parentName: invite.parentName || 'Parent',
        inviteUrl,
        expiresAt: invite.expiresAt,
      },
    });
  }

  private async sendVerificationEmail(parent: { 
    id: string; 
    email: string; 
    givenName: string;
    language: string;
  }): Promise<void> {
    const token = await this.crypto.generateSecureToken(32);

    await this.prisma.emailVerificationToken.create({
      data: {
        parentId: parent.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await this.notifications.sendEmail({
      to: parent.email,
      template: 'verify-email',
      language: parent.language,
      data: {
        name: parent.givenName,
        verifyUrl: `${config.appUrl}/parent/verify-email?token=${token}`,
      },
    });
  }

  private generateInviteUrl(code: string): string {
    return `${config.appUrl}/parent/accept-invite?code=${code}`;
  }

  private calculateAge(dateOfBirth: Date | null): number {
    if (!dateOfBirth) return 18; // Assume adult if no DOB

    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    return age;
  }

  private toParentProfile(parent: {
    id: string;
    email: string;
    givenName: string;
    familyName: string;
    phone?: string | null;
    photoUrl?: string | null;
    language: string;
    timezone: string;
    emailVerified: boolean;
    status: string;
    createdAt: Date;
  }): ParentProfile {
    return {
      id: parent.id,
      email: parent.email,
      givenName: parent.givenName,
      familyName: parent.familyName,
      phone: parent.phone,
      photoUrl: parent.photoUrl,
      language: parent.language,
      timezone: parent.timezone,
      emailVerified: parent.emailVerified,
      status: parent.status as ParentStatus,
      createdAt: parent.createdAt,
    };
  }

  private getDefaultNotificationPreferences(): NotificationPreferences {
    return {
      emailEnabled: true,
      pushEnabled: true,
      smsEnabled: false,
      achievements: true,
      progressUpdates: true,
      teacherMessages: true,
      weeklyDigest: true,
      assignmentReminders: true,
      attendanceAlerts: true,
    };
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateAverageScore(sessions: { status: string; score?: number | null }[]): number {
    const completedWithScores = sessions.filter(
      (s) => s.status === 'completed' && s.score !== null
    );
    if (completedWithScores.length === 0) return 0;
    return Math.round(
      completedWithScores.reduce((sum, s) => sum + (s.score || 0), 0) / completedWithScores.length
    );
  }

  private async calculateWeeklyStats(studentId: string): Promise<{
    totalMinutes: number;
    lessonsCompleted: number;
    daysActive: number;
    averageScore: number;
  }> {
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const sessions = await this.prisma.learningSession.findMany({
      where: {
        studentId,
        startedAt: { gte: weekStart },
      },
    });

    return {
      totalMinutes: sessions.reduce(
        (sum, s) => sum + Math.round((s.timeSpentSeconds || 0) / 60),
        0
      ),
      lessonsCompleted: sessions.filter((s) => s.status === 'completed').length,
      daysActive: new Set(sessions.map((s) => s.startedAt.toISOString().split('T')[0])).size,
      averageScore: this.calculateAverageScore(sessions),
    };
  }

  private async getDailyActivityBreakdown(
    studentId: string,
    startDate: Date
  ): Promise<{ date: string; minutes: number; completed: number }[]> {
    const sessions = await this.prisma.learningSession.findMany({
      where: {
        studentId,
        startedAt: { gte: startDate },
      },
      select: {
        startedAt: true,
        timeSpentSeconds: true,
        status: true,
      },
    });

    const dailyMap = new Map<string, { minutes: number; completed: number }>();

    for (const session of sessions) {
      const dateKey = session.startedAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { minutes: 0, completed: 0 };
      existing.minutes += Math.round((session.timeSpentSeconds || 0) / 60);
      if (session.status === 'completed') existing.completed++;
      dailyMap.set(dateKey, existing);
    }

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  private async getSubjectBreakdown(
    studentId: string,
    startDate: Date
  ): Promise<{ subject: string; minutes: number; lessonsCompleted: number; averageScore: number }[]> {
    const results = await this.prisma.learningSession.groupBy({
      by: ['lessonId'],
      where: {
        studentId,
        startedAt: { gte: startDate },
      },
      _sum: { timeSpentSeconds: true },
      _count: { id: true },
      _avg: { score: true },
    });

    const lessonIds = results.map((r) => r.lessonId);
    const lessons = await this.prisma.lesson.findMany({
      where: { id: { in: lessonIds } },
      select: { id: true, subject: true },
    });

    const lessonSubjectMap = new Map(lessons.map((l) => [l.id, l.subject]));

    const subjectMap = new Map<
      string,
      { minutes: number; completed: number; avgScore: number; count: number }
    >();

    for (const result of results) {
      const subject = lessonSubjectMap.get(result.lessonId) || 'Other';
      const existing = subjectMap.get(subject) || {
        minutes: 0,
        completed: 0,
        avgScore: 0,
        count: 0,
      };
      existing.minutes += Math.round((result._sum.timeSpentSeconds || 0) / 60);
      existing.completed += result._count.id;
      existing.avgScore += (result._avg.score || 0) * result._count.id;
      existing.count += result._count.id;
      subjectMap.set(subject, existing);
    }

    return Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      minutes: data.minutes,
      lessonsCompleted: data.completed,
      averageScore: data.count > 0 ? Math.round(data.avgScore / data.count) : 0,
    }));
  }

  private analyzeSkillMastery(skillMastery: { skill: { name: string }; masteryLevel: number }[]): {
    strengths: { skillName: string; masteryLevel: number }[];
    areasForImprovement: { skillName: string; masteryLevel: number }[];
  } {
    const sorted = [...skillMastery].sort((a, b) => b.masteryLevel - a.masteryLevel);

    return {
      strengths: sorted
        .filter((sm) => sm.masteryLevel >= 0.7)
        .slice(0, 5)
        .map((sm) => ({
          skillName: sm.skill.name,
          masteryLevel: sm.masteryLevel,
        })),
      areasForImprovement: sorted
        .filter((sm) => sm.masteryLevel < 0.5)
        .slice(-5)
        .map((sm) => ({
          skillName: sm.skill.name,
          masteryLevel: sm.masteryLevel,
        })),
    };
  }

  private calculateTrend(skillMastery: { masteryLevel: number; attempts: number }): 'up' | 'down' | 'stable' {
    if (skillMastery.masteryLevel >= 0.8) return 'stable';
    if (skillMastery.attempts > 5) return 'up';
    return 'stable';
  }

  private async getAchievementsForPeriod(
    studentId: string,
    startDate: Date
  ): Promise<{ id: string; name: string; description: string; iconUrl?: string | null; earnedAt: Date }[]> {
    const achievements = await this.prisma.achievement.findMany({
      where: {
        studentId,
        earnedAt: { gte: startDate },
      },
      orderBy: { earnedAt: 'desc' },
    });

    return achievements.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      iconUrl: a.iconUrl,
      earnedAt: a.earnedAt,
    }));
  }

  private generateHighlights(
    sessions: { status: string; score?: number | null; startedAt: Date }[],
    achievements: { name: string }[]
  ): string[] {
    const highlights: string[] = [];

    // Achievement highlights
    if (achievements.length > 0) {
      highlights.push(
        `Earned ${achievements.length} achievement${achievements.length > 1 ? 's' : ''}! 🏆`
      );
    }

    // Completion highlights
    const completed = sessions.filter((s) => s.status === 'completed');
    if (completed.length > 0) {
      highlights.push(
        `Completed ${completed.length} lesson${completed.length > 1 ? 's' : ''} this week 📚`
      );
    }

    // High score highlights
    const highScores = completed.filter((s) => (s.score || 0) >= 90);
    if (highScores.length > 0) {
      highlights.push(
        `Scored 90%+ on ${highScores.length} lesson${highScores.length > 1 ? 's' : ''} 🌟`
      );
    }

    // Consistency highlight
    const uniqueDays = new Set(
      sessions.map((s) => s.startedAt.toISOString().split('T')[0])
    ).size;
    if (uniqueDays >= 5) {
      highlights.push(`Active ${uniqueDays} days this week - great consistency! 🔥`);
    }

    return highlights;
  }
}
