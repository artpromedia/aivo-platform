/**
 * Family Dashboard Service
 *
 * Provides family overview data for caregivers including:
 * - Caregiver profile
 * - Linked learners with progress
 * - Pending link requests
 * - Recent activity feed
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { logger, metrics } from '@aivo/ts-observability';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  FamilyDashboardResponse,
  CaregiverSummary,
  LearnerOverview,
  LearnerLinkSummary,
  ActivityItem,
  CaregiverRelationshipType,
  VerificationMethod,
  VerificationStatus,
} from './registration.types.js';

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get family dashboard overview for a caregiver
   */
  async getFamilyDashboard(caregiverId: string): Promise<FamilyDashboardResponse> {
    // Get caregiver with linked students
    const caregiver = await this.prisma.caregiver.findUnique({
      where: { id: caregiverId },
      include: {
        studentLinks: {
          where: { status: 'active' },
          include: {
            student: {
              include: {
                learnerModel: true,
              },
            },
          },
        },
      },
    });

    if (!caregiver) {
      throw new NotFoundException('Caregiver not found');
    }

    // Get pending link requests from any registration with this email
    const pendingLinks = await this.getPendingLinksForCaregiver(caregiver.email);

    // Get recent activity for linked students
    const studentIds = caregiver.studentLinks.map((l) => l.student.id);
    const recentActivity = await this.getRecentActivity(studentIds, caregiverId);

    // Get weekly learning stats for each learner
    const learnersWithStats = await Promise.all(
      caregiver.studentLinks.map(async (link) => {
        const weeklyMinutes = await this.getWeeklyLearningMinutes(link.student.id);
        return this.formatLearnerOverview(link, weeklyMinutes);
      }),
    );

    metrics.increment('family.dashboard_viewed');

    return {
      caregiver: this.formatCaregiverSummary(caregiver),
      learners: learnersWithStats,
      pendingLinks,
      recentActivity,
    };
  }

  /**
   * Set the active learner context for a caregiver session
   */
  async setActiveLearner(caregiverId: string, learnerId: string): Promise<{
    success: boolean;
    learner: { id: string; name: string };
  }> {
    // Verify caregiver has access to this learner
    const link = await this.prisma.caregiverStudentLink.findUnique({
      where: {
        caregiverId_studentId: {
          caregiverId,
          studentId: learnerId,
        },
      },
      include: {
        student: true,
      },
    });

    if (!link || link.status !== 'active') {
      throw new ForbiddenException('You do not have access to this learner');
    }

    // In a real implementation, this would store the active learner in a session
    // For now, we just validate access and return success
    logger.info('Active learner set', { caregiverId, learnerId });

    return {
      success: true,
      learner: {
        id: link.student.id,
        name: `${link.student.givenName} ${link.student.familyName}`,
      },
    };
  }

  /**
   * Get learner details for the family dashboard
   */
  async getLearnerDetails(
    caregiverId: string,
    learnerId: string,
  ): Promise<LearnerOverview & {
    recentSessions: Array<{
      id: string;
      subject: string;
      duration: number;
      score: number | null;
      completedAt: Date;
    }>;
    achievements: Array<{
      id: string;
      name: string;
      description: string;
      earnedAt: Date;
    }>;
  }> {
    // Verify access
    const link = await this.prisma.caregiverStudentLink.findUnique({
      where: {
        caregiverId_studentId: {
          caregiverId,
          studentId: learnerId,
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

    if (!link || link.status !== 'active') {
      throw new ForbiddenException('You do not have access to this learner');
    }

    const permissions = link.permissions as { viewProgress?: boolean; viewAchievements?: boolean };

    // Get recent sessions
    const recentSessions = permissions.viewProgress
      ? await this.prisma.learningSession.findMany({
          where: {
            studentId: learnerId,
            status: 'completed',
          },
          include: {
            lesson: true,
          },
          orderBy: { completedAt: 'desc' },
          take: 10,
        })
      : [];

    // Get achievements
    const achievements = permissions.viewAchievements
      ? await this.prisma.achievement.findMany({
          where: { studentId: learnerId },
          orderBy: { earnedAt: 'desc' },
          take: 10,
        })
      : [];

    const weeklyMinutes = await this.getWeeklyLearningMinutes(learnerId);
    const overview = this.formatLearnerOverview(link, weeklyMinutes);

    return {
      ...overview,
      recentSessions: recentSessions.map((s) => ({
        id: s.id,
        subject: s.lesson.subject,
        duration: (s.timeSpentSeconds || 0) / 60,
        score: s.score,
        completedAt: s.completedAt!,
      })),
      achievements: achievements.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        earnedAt: a.earnedAt,
      })),
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getPendingLinksForCaregiver(email: string): Promise<LearnerLinkSummary[]> {
    // Find any registrations with pending link requests
    const registrations = await this.prisma.caregiverRegistration.findMany({
      where: {
        email: email.toLowerCase(),
        status: { in: ['EMAIL_VERIFIED', 'SCHOOL_VERIFICATION_PENDING'] },
      },
      include: {
        learnerLinks: {
          where: {
            verificationStatus: { in: ['PENDING'] },
          },
        },
      },
    });

    const pendingLinks: LearnerLinkSummary[] = [];

    for (const reg of registrations) {
      for (const link of reg.learnerLinks) {
        pendingLinks.push({
          id: link.id,
          identificationInfo: this.formatIdentificationInfo(link),
          verificationMethod: link.verificationMethod as VerificationMethod,
          verificationStatus: link.verificationStatus as VerificationStatus,
          learnerName: undefined,
          linkedAt: undefined,
          rejectionReason: link.rejectionReason || undefined,
        });
      }
    }

    return pendingLinks;
  }

  private async getRecentActivity(
    studentIds: string[],
    _caregiverId: string,
  ): Promise<ActivityItem[]> {
    if (studentIds.length === 0) return [];

    const activities: ActivityItem[] = [];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get recent achievements
    const achievements = await this.prisma.achievement.findMany({
      where: {
        studentId: { in: studentIds },
        earnedAt: { gte: oneWeekAgo },
      },
      orderBy: { earnedAt: 'desc' },
      take: 10,
    });

    // Get student names for display
    const students = await this.prisma.profile.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, givenName: true, familyName: true },
    });
    const studentMap = new Map(
      students.map((s) => [s.id, `${s.givenName} ${s.familyName}`]),
    );

    for (const achievement of achievements) {
      activities.push({
        id: achievement.id,
        type: 'achievement',
        learnerId: achievement.studentId,
        learnerName: studentMap.get(achievement.studentId) || 'Unknown',
        title: 'Achievement Earned!',
        description: `Earned "${achievement.name}"`,
        timestamp: achievement.earnedAt,
        metadata: {
          achievementName: achievement.name,
          achievementDescription: achievement.description,
        },
      });
    }

    // Get recent completed sessions
    const sessions = await this.prisma.learningSession.findMany({
      where: {
        studentId: { in: studentIds },
        status: 'completed',
        completedAt: { gte: oneWeekAgo },
      },
      include: {
        lesson: true,
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    for (const session of sessions) {
      activities.push({
        id: session.id,
        type: 'session_complete',
        learnerId: session.studentId,
        learnerName: studentMap.get(session.studentId) || 'Unknown',
        title: 'Lesson Completed',
        description: `Completed "${session.lesson.title}" in ${session.lesson.subject}`,
        timestamp: session.completedAt!,
        metadata: {
          lessonTitle: session.lesson.title,
          subject: session.lesson.subject,
          score: session.score,
          duration: session.timeSpentSeconds,
        },
      });
    }

    // Sort by timestamp descending and limit
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return activities.slice(0, 20);
  }

  private async getWeeklyLearningMinutes(studentId: string): Promise<number> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const sessions = await this.prisma.learningSession.findMany({
      where: {
        studentId,
        startedAt: { gte: oneWeekAgo },
      },
      select: { timeSpentSeconds: true },
    });

    const totalSeconds = sessions.reduce(
      (sum, s) => sum + (s.timeSpentSeconds || 0),
      0,
    );

    return Math.round(totalSeconds / 60);
  }

  private formatCaregiverSummary(caregiver: {
    id: string;
    email: string;
    givenName: string;
    familyName: string;
    phone: string | null;
    emailVerified: boolean;
    createdAt: Date;
    studentLinks: Array<{ relationship: string }>;
  }): CaregiverSummary {
    // Get the most common relationship type
    const relationship = caregiver.studentLinks[0]?.relationship || 'caregiver';

    return {
      id: caregiver.id,
      email: caregiver.email,
      firstName: caregiver.givenName,
      lastName: caregiver.familyName,
      phone: caregiver.phone || undefined,
      relationship: this.mapRelationshipType(relationship),
      emailVerified: caregiver.emailVerified,
      createdAt: caregiver.createdAt,
    };
  }

  private formatLearnerOverview(
    link: {
      student: {
        id: string;
        givenName: string;
        familyName: string;
        photoUrl: string | null;
        grade: string | null;
        learnerModel: { overallMastery: number; lastActivityAt: Date | null } | null;
      };
      delegatedAt: Date;
    },
    weeklyMinutes: number,
  ): LearnerOverview {
    return {
      id: link.student.id,
      firstName: link.student.givenName,
      lastName: link.student.familyName,
      photoUrl: link.student.photoUrl || undefined,
      grade: link.student.grade || undefined,
      schoolName: undefined, // Would need to join through enrollment
      linkedAt: link.delegatedAt,
      lastActivityAt: link.student.learnerModel?.lastActivityAt || undefined,
      overallMastery: link.student.learnerModel?.overallMastery,
      weeklyMinutes,
    };
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

  private mapRelationshipType(relationship: string): CaregiverRelationshipType {
    const mapping: Record<string, CaregiverRelationshipType> = {
      parent: CaregiverRelationshipType.PARENT,
      guardian: CaregiverRelationshipType.GUARDIAN,
      grandparent: CaregiverRelationshipType.GRANDPARENT,
      foster_parent: CaregiverRelationshipType.FOSTER_PARENT,
      other: CaregiverRelationshipType.OTHER_FAMILY,
      caregiver: CaregiverRelationshipType.AUTHORIZED_CAREGIVER,
    };
    return mapping[relationship] || CaregiverRelationshipType.AUTHORIZED_CAREGIVER;
  }
}
