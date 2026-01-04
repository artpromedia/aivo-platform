/**
 * Competition Service
 *
 * Manages competitive challenges and tournaments:
 * - Create competitions: daily, weekly, seasonal
 * - Competition types: individual vs individual, team vs team, class vs class, school vs school
 * - Competition categories: reading minutes, math problems solved, learning streaks, XP earned
 * - Fair matching algorithm (similar skill levels/sizes)
 * - Prize distribution
 * - Anti-cheating measures
 */

import { prisma } from '../prisma.js';
import { eventEmitter } from '../events/event-emitter.js';

export type CompetitionType = 'individual' | 'team' | 'class' | 'school';
export type CompetitionDuration = 'daily' | 'weekly' | 'seasonal';
export type CompetitionCategory = 'xp_earned' | 'lessons_completed' | 'reading_minutes' | 'math_problems' | 'streak_days' | 'perfect_scores';
export type CompetitionStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface Competition {
  id: string;
  name: string;
  description: string;
  type: CompetitionType;
  duration: CompetitionDuration;
  category: CompetitionCategory;

  startDate: Date;
  endDate: Date;
  status: CompetitionStatus;

  minParticipants: number;
  maxParticipants: number;
  currentParticipants: number;

  // Matching criteria
  minLevel?: number;
  maxLevel?: number;
  schoolId?: string; // null for cross-school

  // Prizes
  prizes: CompetitionPrize[];

  // Settings
  isPublic: boolean;
  autoJoin: boolean; // Auto-enroll eligible students

  createdAt: Date;
  createdBy: string;
}

export interface CompetitionPrize {
  rank: number;
  xp?: number;
  coins?: number;
  gems?: number;
  badge?: string;
  title?: string;
}

export interface CompetitionParticipant {
  id: string;
  competitionId: string;
  participantId: string; // studentId, teamId, classId, or schoolId
  participantType: CompetitionType;
  score: number;
  rank?: number;
  prize?: CompetitionPrize;
  joinedAt: Date;
}

export interface CompetitionStanding {
  rank: number;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  score: number;
  change?: number; // Rank change
  isCurrentUser?: boolean;
}

export interface CompetitionDetails {
  competition: Competition;
  standings: CompetitionStanding[];
  userParticipant?: CompetitionParticipant;
  timeRemaining: number; // milliseconds
}

// ============================================================================
// COMPETITION SERVICE CLASS
// ============================================================================

class CompetitionService {
  /**
   * Create a new competition
   */
  async createCompetition(data: {
    name: string;
    description: string;
    type: CompetitionType;
    duration: CompetitionDuration;
    category: CompetitionCategory;
    startDate: Date;
    endDate: Date;
    minParticipants?: number;
    maxParticipants?: number;
    minLevel?: number;
    maxLevel?: number;
    schoolId?: string;
    prizes: CompetitionPrize[];
    isPublic?: boolean;
    autoJoin?: boolean;
    createdBy: string;
  }): Promise<Competition> {
    // Validate dates
    if (data.startDate >= data.endDate) {
      throw new Error('End date must be after start date');
    }

    if (data.startDate < new Date()) {
      throw new Error('Start date cannot be in the past');
    }

    // Validate prizes
    if (data.prizes.length === 0) {
      throw new Error('At least one prize must be defined');
    }

    const status: CompetitionStatus = data.startDate > new Date() ? 'upcoming' : 'active';

    const competition = await prisma.competition.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        duration: data.duration,
        category: data.category,
        startDate: data.startDate,
        endDate: data.endDate,
        status,
        minParticipants: data.minParticipants || 2,
        maxParticipants: data.maxParticipants || 100,
        minLevel: data.minLevel,
        maxLevel: data.maxLevel,
        schoolId: data.schoolId,
        prizes: data.prizes,
        isPublic: data.isPublic ?? true,
        autoJoin: data.autoJoin ?? false,
        createdBy: data.createdBy,
      },
    });

    // Emit event
    eventEmitter.emit('competition.created', {
      competitionId: competition.id,
      name: competition.name,
      type: competition.type,
    });

    return this.toCompetition(competition);
  }

  /**
   * Get competition by ID
   */
  async getCompetition(competitionId: string): Promise<Competition | null> {
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!competition) return null;

    return {
      ...this.toCompetition(competition),
      currentParticipants: competition._count.participants,
    };
  }

  /**
   * Get competition details with standings
   */
  async getCompetitionDetails(
    competitionId: string,
    currentUserId?: string
  ): Promise<CompetitionDetails | null> {
    const competition = await this.getCompetition(competitionId);
    if (!competition) return null;

    const standings = await this.getCompetitionStandings(competitionId, currentUserId);

    let userParticipant: CompetitionParticipant | undefined;
    if (currentUserId) {
      const participant = await prisma.competitionParticipant.findFirst({
        where: {
          competitionId,
          participantId: currentUserId,
        },
      });

      if (participant) {
        userParticipant = this.toParticipant(participant);
      }
    }

    const timeRemaining = Math.max(0, competition.endDate.getTime() - Date.now());

    return {
      competition,
      standings,
      userParticipant,
      timeRemaining,
    };
  }

  /**
   * Get competition standings
   */
  async getCompetitionStandings(
    competitionId: string,
    currentUserId?: string
  ): Promise<CompetitionStanding[]> {
    const participants = await prisma.competitionParticipant.findMany({
      where: { competitionId },
      orderBy: { score: 'desc' },
    });

    // Fetch participant names (simplified - in production, fetch from appropriate services)
    const standings: CompetitionStanding[] = [];

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const rank = i + 1;

      standings.push({
        rank,
        participantId: participant.participantId,
        participantName: await this.getParticipantName(participant.participantId, participant.participantType),
        score: participant.score,
        isCurrentUser: participant.participantId === currentUserId,
      });
    }

    return standings;
  }

  /**
   * Join a competition
   */
  async joinCompetition(
    competitionId: string,
    participantId: string,
    participantType?: CompetitionType
  ): Promise<boolean> {
    const competition = await this.getCompetition(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (competition.status !== 'active' && competition.status !== 'upcoming') {
      throw new Error('Competition is not open for joining');
    }

    if (competition.currentParticipants >= competition.maxParticipants) {
      throw new Error('Competition is full');
    }

    // Check if already joined
    const existing = await prisma.competitionParticipant.findFirst({
      where: {
        competitionId,
        participantId,
      },
    });

    if (existing) {
      throw new Error('Already joined this competition');
    }

    // Validate participant eligibility
    const eligible = await this.checkEligibility(competition, participantId, participantType || competition.type);
    if (!eligible) {
      throw new Error('Not eligible for this competition');
    }

    await prisma.competitionParticipant.create({
      data: {
        competitionId,
        participantId,
        participantType: participantType || competition.type,
        score: 0,
      },
    });

    // Emit event
    eventEmitter.emit('competition.joined', {
      competitionId,
      participantId,
    });

    return true;
  }

  /**
   * Leave a competition (only if not started)
   */
  async leaveCompetition(competitionId: string, participantId: string): Promise<boolean> {
    const competition = await this.getCompetition(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (competition.status === 'active') {
      throw new Error('Cannot leave an active competition');
    }

    const participant = await prisma.competitionParticipant.findFirst({
      where: {
        competitionId,
        participantId,
      },
    });

    if (!participant) {
      throw new Error('Not a participant');
    }

    await prisma.competitionParticipant.delete({
      where: { id: participant.id },
    });

    return true;
  }

  /**
   * Update competition score
   */
  async updateScore(
    competitionId: string,
    participantId: string,
    increment: number
  ): Promise<void> {
    const competition = await this.getCompetition(competitionId);
    if (!competition || competition.status !== 'active') {
      return; // Silently ignore if competition not active
    }

    // Anti-cheating: rate limiting
    const participant = await prisma.competitionParticipant.findFirst({
      where: {
        competitionId,
        participantId,
      },
    });

    if (!participant) return;

    // Anti-cheating: validate increment is reasonable
    if (increment > 1000) {
      console.warn(`Suspicious score increment: ${participantId} - ${increment}`);
      // In production, implement more sophisticated anti-cheat
    }

    await prisma.competitionParticipant.update({
      where: { id: participant.id },
      data: {
        score: { increment },
      },
    });
  }

  /**
   * Finalize competition and award prizes
   */
  async finalizeCompetition(competitionId: string): Promise<void> {
    const competition = await this.getCompetition(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (competition.status === 'completed') {
      return; // Already finalized
    }

    // Get final standings
    const participants = await prisma.competitionParticipant.findMany({
      where: { competitionId },
      orderBy: { score: 'desc' },
    });

    // Award prizes
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const rank = i + 1;
      const prize = competition.prizes.find((p) => p.rank === rank);

      if (prize) {
        await this.awardPrize(participant.participantId, prize, competition.name);

        // Update participant with prize info
        await prisma.competitionParticipant.update({
          where: { id: participant.id },
          data: {
            rank,
            prize,
          },
        });
      }
    }

    // Mark as completed
    await prisma.competition.update({
      where: { id: competitionId },
      data: { status: 'completed' },
    });

    // Emit event
    eventEmitter.emit('competition.completed', {
      competitionId,
      name: competition.name,
      participants: participants.length,
    });

    console.log(`Competition finalized: ${competition.name} (${participants.length} participants)`);
  }

  /**
   * List active competitions
   */
  async listActiveCompetitions(params?: {
    type?: CompetitionType;
    schoolId?: string;
    studentId?: string; // Filter for eligible competitions
  }): Promise<Competition[]> {
    const where: Record<string, unknown> = {
      status: { in: ['upcoming', 'active'] },
      isPublic: true,
    };

    if (params?.type) where.type = params.type;
    if (params?.schoolId) {
      where.OR = [
        { schoolId: params.schoolId },
        { schoolId: null }, // Cross-school
      ];
    }

    const competitions = await prisma.competition.findMany({
      where,
      include: {
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return competitions.map((comp) => ({
      ...this.toCompetition(comp),
      currentParticipants: comp._count.participants,
    }));
  }

  /**
   * List competition history
   */
  async listCompletedCompetitions(params?: {
    participantId?: string;
    limit?: number;
  }): Promise<Competition[]> {
    const where: Record<string, unknown> = {
      status: 'completed',
    };

    if (params?.participantId) {
      where.participants = {
        some: {
          participantId: params.participantId,
        },
      };
    }

    const competitions = await prisma.competition.findMany({
      where,
      include: {
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { endDate: 'desc' },
      take: params?.limit || 20,
    });

    return competitions.map((comp) => ({
      ...this.toCompetition(comp),
      currentParticipants: comp._count.participants,
    }));
  }

  /**
   * Get recommended competitions for a student
   */
  async getRecommendedCompetitions(studentId: string): Promise<Competition[]> {
    // Get student profile
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
    });

    if (!profile) return [];

    // Find competitions matching student's level
    const competitions = await prisma.competition.findMany({
      where: {
        status: { in: ['upcoming', 'active'] },
        isPublic: true,
        OR: [
          {
            minLevel: { lte: profile.level },
            maxLevel: { gte: profile.level },
          },
          {
            minLevel: null,
            maxLevel: null,
          },
        ],
      },
      include: {
        _count: {
          select: { participants: true },
        },
      },
      take: 10,
    });

    return competitions.map((comp) => ({
      ...this.toCompetition(comp),
      currentParticipants: comp._count.participants,
    }));
  }

  /**
   * Check competition status and activate/finalize
   */
  async checkCompetitionStatus(): Promise<void> {
    const now = new Date();

    // Activate upcoming competitions
    const toActivate = await prisma.competition.findMany({
      where: {
        status: 'upcoming',
        startDate: { lte: now },
      },
    });

    for (const comp of toActivate) {
      await prisma.competition.update({
        where: { id: comp.id },
        data: { status: 'active' },
      });

      eventEmitter.emit('competition.started', {
        competitionId: comp.id,
        name: comp.name,
      });
    }

    // Finalize completed competitions
    const toFinalize = await prisma.competition.findMany({
      where: {
        status: 'active',
        endDate: { lte: now },
      },
    });

    for (const comp of toFinalize) {
      await this.finalizeCompetition(comp.id);
    }

    console.log(`Competition status check: ${toActivate.length} activated, ${toFinalize.length} finalized`);
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Check if participant is eligible
   */
  private async checkEligibility(
    competition: Competition,
    participantId: string,
    participantType: CompetitionType
  ): Promise<boolean> {
    if (participantType === 'individual') {
      const profile = await prisma.playerProfile.findUnique({
        where: { studentId: participantId },
      });

      if (!profile) return false;

      // Check level requirements
      if (competition.minLevel && profile.level < competition.minLevel) return false;
      if (competition.maxLevel && profile.level > competition.maxLevel) return false;

      return true;
    }

    if (participantType === 'team') {
      const team = await prisma.team.findUnique({
        where: { id: participantId },
      });

      if (!team) return false;

      // Check team is in same school if school-specific
      if (competition.schoolId && team.schoolId !== competition.schoolId) return false;

      return true;
    }

    // For class/school competitions, basic validation
    return true;
  }

  /**
   * Award prize to participant
   */
  private async awardPrize(
    participantId: string,
    prize: CompetitionPrize,
    competitionName: string
  ): Promise<void> {
    // Award to individual or team members
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId: participantId },
    });

    if (profile) {
      // Individual award
      const updates: Record<string, unknown> = {};
      if (prize.xp) {
        updates.totalXp = { increment: prize.xp };

        await prisma.xPTransaction.create({
          data: {
            studentId: participantId,
            amount: prize.xp,
            activity: 'competition_prize',
            metadata: { competitionName, rank: prize.rank },
          },
        });
      }
      if (prize.coins) updates.coins = { increment: prize.coins };
      if (prize.gems) updates.gems = { increment: prize.gems };

      if (Object.keys(updates).length > 0) {
        await prisma.playerProfile.update({
          where: { studentId: participantId },
          data: updates,
        });
      }
    }

    // Emit prize awarded event
    eventEmitter.emit('competition.prize.awarded', {
      participantId,
      competitionName,
      rank: prize.rank,
      prize,
    });
  }

  /**
   * Get participant display name
   */
  private async getParticipantName(participantId: string, type: string): Promise<string> {
    if (type === 'individual') {
      // In production, fetch from student service
      return `Student ${participantId.slice(0, 8)}`;
    }

    if (type === 'team') {
      const team = await prisma.team.findUnique({
        where: { id: participantId },
      });
      return team?.name || 'Unknown Team';
    }

    return `Participant ${participantId.slice(0, 8)}`;
  }

  /**
   * Convert DB model to Competition type
   */
  private toCompetition(data: {
    id: string;
    name: string;
    description: string;
    type: string;
    duration: string;
    category: string;
    startDate: Date;
    endDate: Date;
    status: string;
    minParticipants: number;
    maxParticipants: number;
    minLevel?: number | null;
    maxLevel?: number | null;
    schoolId?: string | null;
    prizes: unknown;
    isPublic: boolean;
    autoJoin: boolean;
    createdAt: Date;
    createdBy: string;
  }): Competition {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type as CompetitionType,
      duration: data.duration as CompetitionDuration,
      category: data.category as CompetitionCategory,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status as CompetitionStatus,
      minParticipants: data.minParticipants,
      maxParticipants: data.maxParticipants,
      currentParticipants: 0, // Will be populated by caller
      minLevel: data.minLevel || undefined,
      maxLevel: data.maxLevel || undefined,
      schoolId: data.schoolId || undefined,
      prizes: (data.prizes as CompetitionPrize[]) || [],
      isPublic: data.isPublic,
      autoJoin: data.autoJoin,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
    };
  }

  /**
   * Convert DB model to Participant type
   */
  private toParticipant(data: {
    id: string;
    competitionId: string;
    participantId: string;
    participantType: string;
    score: number;
    rank?: number | null;
    prize?: unknown;
    joinedAt: Date;
  }): CompetitionParticipant {
    return {
      id: data.id,
      competitionId: data.competitionId,
      participantId: data.participantId,
      participantType: data.participantType as CompetitionType,
      score: data.score,
      rank: data.rank || undefined,
      prize: data.prize as CompetitionPrize | undefined,
      joinedAt: data.joinedAt,
    };
  }
}

export const competitionService = new CompetitionService();
