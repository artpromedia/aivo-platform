/**
 * Participation Service
 *
 * Handles district enrollment, consent, and preference management
 * for the benchmarking program.
 */

import type { PrismaClient } from '@prisma/client';

import type {
  EnrollmentRequest,
  ParticipantProfile,
  SharingPreferences,
  CohortSummary,
  ParticipationStatus,
} from '../types';

export class ParticipationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Enroll a district in the benchmarking program
   */
  async enroll(request: EnrollmentRequest): Promise<ParticipantProfile> {
    // Check if already enrolled
    const existing = await this.prisma.benchmarkParticipant.findUnique({
      where: { tenantId: request.tenantId },
    });

    if (existing) {
      if (existing.status === 'WITHDRAWN') {
        // Re-enroll withdrawn participant
        return this.reEnroll(existing.id, request);
      }
      throw new Error('District is already enrolled in benchmarking program');
    }

    const participant = await this.prisma.benchmarkParticipant.create({
      data: {
        tenantId: request.tenantId,
        districtName: request.districtName,
        size: request.size,
        geographicType: request.geographicType,
        studentCount: request.studentCount,
        freeReducedLunchPct: request.freeReducedLunchPct,
        state: request.state,
        gradeLevelsServed: request.gradeLevelsServed,
        consentedBy: request.consentedBy,
        consentedAt: new Date(),
        status: 'PENDING',
        // Sharing preferences
        shareAcademicData: request.sharingPreferences?.shareAcademicData ?? true,
        shareEngagementData: request.sharingPreferences?.shareEngagementData ?? true,
        shareAiEffectiveness: request.sharingPreferences?.shareAiEffectiveness ?? true,
        shareOperationalData: request.sharingPreferences?.shareOperationalData ?? false,
        allowPeerContact: request.sharingPreferences?.allowPeerContact ?? false,
      },
      include: {
        cohortMemberships: {
          include: { cohort: true },
        },
      },
    });

    // Assign to matching cohorts
    await this.assignToCohorts(participant.id);

    // Log enrollment
    await this.logAudit(participant.id, 'enroll', request.consentedBy, {
      size: request.size,
      geographicType: request.geographicType,
      state: request.state,
    });

    return this.toProfile(participant);
  }

  /**
   * Re-enroll a withdrawn participant
   */
  private async reEnroll(
    participantId: string,
    request: EnrollmentRequest
  ): Promise<ParticipantProfile> {
    const participant = await this.prisma.benchmarkParticipant.update({
      where: { id: participantId },
      data: {
        status: 'PENDING',
        districtName: request.districtName,
        size: request.size,
        geographicType: request.geographicType,
        studentCount: request.studentCount,
        freeReducedLunchPct: request.freeReducedLunchPct,
        state: request.state,
        gradeLevelsServed: request.gradeLevelsServed,
        consentedBy: request.consentedBy,
        consentedAt: new Date(),
        withdrawnAt: null,
        shareAcademicData: request.sharingPreferences?.shareAcademicData ?? true,
        shareEngagementData: request.sharingPreferences?.shareEngagementData ?? true,
        shareAiEffectiveness: request.sharingPreferences?.shareAiEffectiveness ?? true,
        shareOperationalData: request.sharingPreferences?.shareOperationalData ?? false,
        allowPeerContact: request.sharingPreferences?.allowPeerContact ?? false,
      },
      include: {
        cohortMemberships: {
          include: { cohort: true },
        },
      },
    });

    await this.assignToCohorts(participantId);

    return this.toProfile(participant);
  }

  /**
   * Get participant profile
   */
  async getProfile(tenantId: string): Promise<ParticipantProfile | null> {
    const participant = await this.prisma.benchmarkParticipant.findUnique({
      where: { tenantId },
      include: {
        cohortMemberships: {
          include: { cohort: true },
        },
      },
    });

    if (!participant) {
      return null;
    }

    return this.toProfile(participant);
  }

  /**
   * Update sharing preferences
   */
  async updatePreferences(
    tenantId: string,
    preferences: Partial<SharingPreferences>,
    updatedBy: string
  ): Promise<ParticipantProfile> {
    const participant = await this.prisma.benchmarkParticipant.update({
      where: { tenantId },
      data: {
        shareAcademicData: preferences.shareAcademicData,
        shareEngagementData: preferences.shareEngagementData,
        shareAiEffectiveness: preferences.shareAiEffectiveness,
        shareOperationalData: preferences.shareOperationalData,
        allowPeerContact: preferences.allowPeerContact,
      },
      include: {
        cohortMemberships: {
          include: { cohort: true },
        },
      },
    });

    await this.logAudit(participant.id, 'update_preferences', updatedBy, preferences);

    return this.toProfile(participant);
  }

  /**
   * Withdraw from benchmarking program
   */
  async withdraw(tenantId: string, withdrawnBy: string): Promise<void> {
    const participant = await this.prisma.benchmarkParticipant.update({
      where: { tenantId },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
      },
    });

    // Remove from cohorts
    await this.prisma.cohortMembership.deleteMany({
      where: { participantId: participant.id },
    });

    // Delete submitted metrics (GDPR/privacy compliance)
    await this.prisma.benchmarkMetric.deleteMany({
      where: { participantId: participant.id },
    });

    await this.logAudit(participant.id, 'withdraw', withdrawnBy, {});
  }

  /**
   * Activate a pending participant (admin action)
   */
  async activate(tenantId: string, activatedBy: string): Promise<ParticipantProfile> {
    const participant = await this.prisma.benchmarkParticipant.update({
      where: { tenantId },
      data: { status: 'ACTIVE' },
      include: {
        cohortMemberships: {
          include: { cohort: true },
        },
      },
    });

    await this.logAudit(participant.id, 'activate', activatedBy, {});

    return this.toProfile(participant);
  }

  /**
   * Suspend a participant (admin action)
   */
  async suspend(tenantId: string, suspendedBy: string, reason: string): Promise<void> {
    const participant = await this.prisma.benchmarkParticipant.update({
      where: { tenantId },
      data: { status: 'SUSPENDED' },
    });

    await this.logAudit(participant.id, 'suspend', suspendedBy, { reason });
  }

  /**
   * List all participants (admin)
   */
  async listParticipants(options: {
    status?: ParticipationStatus;
    state?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ participants: ParticipantProfile[]; total: number }> {
    const where: Record<string, unknown> = {};

    if (options.status) {
      where.status = options.status;
    }
    if (options.state) {
      where.state = options.state;
    }

    const [participants, total] = await Promise.all([
      this.prisma.benchmarkParticipant.findMany({
        where,
        include: {
          cohortMemberships: {
            include: { cohort: true },
          },
        },
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.benchmarkParticipant.count({ where }),
    ]);

    return {
      participants: participants.map((p) => this.toProfile(p)),
      total,
    };
  }

  /**
   * Assign participant to matching cohorts
   */
  private async assignToCohorts(participantId: string): Promise<void> {
    const participant = await this.prisma.benchmarkParticipant.findUnique({
      where: { id: participantId },
    });

    if (!participant) return;

    // Find matching system cohorts
    const cohorts = await this.prisma.benchmarkCohort.findMany({
      where: { isSystem: true },
    });

    const matchingCohorts = cohorts.filter((cohort) => {
      // Size match
      if (cohort.sizeMin && participant.size < cohort.sizeMin) return false;
      if (cohort.sizeMax && participant.size > cohort.sizeMax) return false;

      // Geographic match
      if (
        cohort.geographicTypes.length > 0 &&
        !cohort.geographicTypes.includes(participant.geographicType)
      ) {
        return false;
      }

      // State match
      if (cohort.states.length > 0 && !cohort.states.includes(participant.state)) {
        return false;
      }

      // FRL percentage match
      if (participant.freeReducedLunchPct !== null) {
        if (cohort.frlPctMin !== null && participant.freeReducedLunchPct < cohort.frlPctMin) {
          return false;
        }
        if (cohort.frlPctMax !== null && participant.freeReducedLunchPct > cohort.frlPctMax) {
          return false;
        }
      }

      return true;
    });

    // Create memberships
    await this.prisma.cohortMembership.createMany({
      data: matchingCohorts.map((cohort) => ({
        participantId,
        cohortId: cohort.id,
      })),
      skipDuplicates: true,
    });

    // Update cohort member counts
    for (const cohort of matchingCohorts) {
      await this.updateCohortMemberCount(cohort.id);
    }
  }

  /**
   * Update cohort member count
   */
  private async updateCohortMemberCount(cohortId: string): Promise<void> {
    const count = await this.prisma.cohortMembership.count({
      where: { cohortId },
    });

    await this.prisma.benchmarkCohort.update({
      where: { id: cohortId },
      data: {
        memberCount: count,
        lastComputedAt: new Date(),
      },
    });
  }

  /**
   * Log audit event
   */
  private async logAudit(
    participantId: string,
    action: string,
    actorId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await this.prisma.benchmarkAuditLog.create({
      data: {
        participantId,
        action,
        actorId,
        actorType: 'user',
        details,
      },
    });
  }

  /**
   * Convert database model to profile
   */
  private toProfile(participant: {
    id: string;
    tenantId: string;
    districtName: string;
    status: string;
    size: string;
    geographicType: string;
    studentCount: number;
    freeReducedLunchPct: number | null;
    state: string;
    gradeLevelsServed: string[];
    shareAcademicData: boolean;
    shareEngagementData: boolean;
    shareAiEffectiveness: boolean;
    shareOperationalData: boolean;
    allowPeerContact: boolean;
    enrolledAt: Date;
    cohortMemberships?: {
      cohort: { id: string; name: string; memberCount: number };
    }[];
  }): ParticipantProfile {
    const cohorts: CohortSummary[] =
      participant.cohortMemberships?.map((m) => ({
        id: m.cohort.id,
        name: m.cohort.name,
        memberCount: m.cohort.memberCount,
      })) ?? [];

    return {
      id: participant.id,
      tenantId: participant.tenantId,
      districtName: participant.districtName,
      status: participant.status as ParticipationStatus,
      size: participant.size as ParticipantProfile['size'],
      geographicType: participant.geographicType as ParticipantProfile['geographicType'],
      studentCount: participant.studentCount,
      freeReducedLunchPct: participant.freeReducedLunchPct ?? undefined,
      state: participant.state,
      gradeLevelsServed: participant.gradeLevelsServed,
      sharingPreferences: {
        shareAcademicData: participant.shareAcademicData,
        shareEngagementData: participant.shareEngagementData,
        shareAiEffectiveness: participant.shareAiEffectiveness,
        shareOperationalData: participant.shareOperationalData,
        allowPeerContact: participant.allowPeerContact,
      },
      enrolledAt: participant.enrolledAt,
      cohorts,
    };
  }
}
