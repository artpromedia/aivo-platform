/**
 * Team Service
 *
 * Manages team/guild system for collaborative gamification:
 * - Create/join/leave teams
 * - Team types: classroom, school, cross-school
 * - Team XP pooling (individual contributions aggregate)
 * - Team leaderboards
 * - Team achievements
 */

import { prisma } from '../prisma.js';
import { eventEmitter } from '../events/event-emitter.js';

export type TeamType = 'classroom' | 'school' | 'cross_school';
export type TeamMemberRole = 'owner' | 'captain' | 'member';

export interface Team {
  id: string;
  name: string;
  description: string;
  type: TeamType;
  schoolId?: string;
  classId?: string;
  avatarUrl?: string;
  maxMembers: number;
  totalXp: number;
  weeklyXp: number;
  monthlyXp: number;
  level: number;
  memberCount: number;
  isPublic: boolean;
  createdAt: Date;
  createdBy: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  studentId: string;
  role: TeamMemberRole;
  contributedXp: number;
  weeklyContribution: number;
  monthlyContribution: number;
  joinedAt: Date;
  student?: {
    givenName: string;
    familyName: string;
    photoUrl?: string;
    level?: number;
  };
}

export interface TeamAchievement {
  id: string;
  teamId: string;
  achievementId: string;
  name: string;
  description: string;
  iconUrl: string;
  earnedAt: Date;
}

export interface TeamStats {
  totalXp: number;
  weeklyXp: number;
  monthlyXp: number;
  level: number;
  rank?: number;
  totalMembers: number;
  activeMembers: number;
  topContributors: TeamMember[];
  recentAchievements: TeamAchievement[];
}

// ============================================================================
// TEAM SERVICE CLASS
// ============================================================================

class TeamService {
  /**
   * Create a new team
   */
  async createTeam(data: {
    name: string;
    description: string;
    type: TeamType;
    createdBy: string;
    schoolId?: string;
    classId?: string;
    avatarUrl?: string;
    maxMembers?: number;
    isPublic?: boolean;
  }): Promise<Team> {
    // Validate creator exists
    const creator = await prisma.playerProfile.findUnique({
      where: { studentId: data.createdBy },
    });

    if (!creator) {
      throw new Error('Creator profile not found');
    }

    // Enforce type-based restrictions
    if (data.type === 'classroom' && !data.classId) {
      throw new Error('Classroom teams must specify classId');
    }
    if (data.type === 'school' && !data.schoolId) {
      throw new Error('School teams must specify schoolId');
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        schoolId: data.schoolId,
        classId: data.classId,
        avatarUrl: data.avatarUrl,
        maxMembers: data.maxMembers || (data.type === 'classroom' ? 30 : 50),
        totalXp: 0,
        weeklyXp: 0,
        monthlyXp: 0,
        level: 1,
        isPublic: data.isPublic ?? true,
        createdBy: data.createdBy,
      },
    });

    // Auto-add creator as owner
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        studentId: data.createdBy,
        role: 'owner',
        contributedXp: 0,
        weeklyContribution: 0,
        monthlyContribution: 0,
      },
    });

    // Emit event
    eventEmitter.emit('team.created', {
      teamId: team.id,
      name: team.name,
      type: team.type,
      createdBy: data.createdBy,
    });

    return this.toTeam(team);
  }

  /**
   * Get team by ID with member count
   */
  async getTeam(teamId: string): Promise<Team | null> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!team) return null;

    return {
      ...this.toTeam(team),
      memberCount: team._count.members,
    };
  }

  /**
   * Get team with full details including members
   */
  async getTeamDetails(teamId: string): Promise<{
    team: Team;
    members: TeamMember[];
    stats: TeamStats;
  } | null> {
    const team = await this.getTeam(teamId);
    if (!team) return null;

    const members = await this.getTeamMembers(teamId);
    const stats = await this.getTeamStats(teamId);

    return { team, members, stats };
  }

  /**
   * Get team members with student details
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { contributedXp: 'desc' },
    });

    // Fetch student profiles separately to avoid relation issues
    const studentIds = members.map((m) => m.studentId);
    const profiles = await prisma.playerProfile.findMany({
      where: { studentId: { in: studentIds } },
    });

    const profileMap = new Map(profiles.map((p) => [p.studentId, p]));

    return members.map((member) => {
      const profile = profileMap.get(member.studentId);
      return {
        id: member.id,
        teamId: member.teamId,
        studentId: member.studentId,
        role: member.role as TeamMemberRole,
        contributedXp: member.contributedXp,
        weeklyContribution: member.weeklyContribution,
        monthlyContribution: member.monthlyContribution,
        joinedAt: member.joinedAt,
        student: profile
          ? {
              givenName: 'Student', // In production, fetch from student service
              familyName: member.studentId.slice(0, 8),
              level: profile.level,
            }
          : undefined,
      };
    });
  }

  /**
   * Join a team
   */
  async joinTeam(teamId: string, studentId: string): Promise<boolean> {
    const team = await this.getTeam(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    if (!team.isPublic) {
      throw new Error('Team is private - invitation required');
    }

    if (team.memberCount >= team.maxMembers) {
      throw new Error('Team is full');
    }

    // Check if already a member
    const existing = await prisma.teamMember.findFirst({
      where: { teamId, studentId },
    });

    if (existing) {
      throw new Error('Already a team member');
    }

    // Limit students to a reasonable number of teams (anti-abuse)
    const memberCount = await prisma.teamMember.count({
      where: { studentId },
    });

    if (memberCount >= 5) {
      throw new Error('Maximum team limit reached (5 teams)');
    }

    await prisma.teamMember.create({
      data: {
        teamId,
        studentId,
        role: 'member',
        contributedXp: 0,
        weeklyContribution: 0,
        monthlyContribution: 0,
      },
    });

    // Emit event
    eventEmitter.emit('team.member.joined', {
      teamId,
      studentId,
    });

    return true;
  }

  /**
   * Leave a team
   */
  async leaveTeam(teamId: string, studentId: string): Promise<boolean> {
    const member = await prisma.teamMember.findFirst({
      where: { teamId, studentId },
    });

    if (!member) {
      throw new Error('Not a team member');
    }

    if (member.role === 'owner') {
      // Transfer ownership or disband team
      const otherMembers = await prisma.teamMember.findMany({
        where: { teamId, studentId: { not: studentId } },
        orderBy: { contributedXp: 'desc' },
      });

      if (otherMembers.length > 0) {
        // Transfer to top contributor
        await prisma.teamMember.update({
          where: { id: otherMembers[0].id },
          data: { role: 'owner' },
        });
      } else {
        // Last member - disband team
        await prisma.team.delete({
          where: { id: teamId },
        });
        return true;
      }
    }

    await prisma.teamMember.delete({
      where: { id: member.id },
    });

    // Emit event
    eventEmitter.emit('team.member.left', {
      teamId,
      studentId,
    });

    return true;
  }

  /**
   * Add XP contribution to team
   */
  async addTeamXP(studentId: string, xpAmount: number): Promise<void> {
    // Find all teams the student is a member of
    const memberships = await prisma.teamMember.findMany({
      where: { studentId },
    });

    for (const membership of memberships) {
      // Update team totals
      await prisma.team.update({
        where: { id: membership.teamId },
        data: {
          totalXp: { increment: xpAmount },
          weeklyXp: { increment: xpAmount },
          monthlyXp: { increment: xpAmount },
        },
      });

      // Update member contribution
      await prisma.teamMember.update({
        where: { id: membership.id },
        data: {
          contributedXp: { increment: xpAmount },
          weeklyContribution: { increment: xpAmount },
          monthlyContribution: { increment: xpAmount },
        },
      });

      // Check for level up
      await this.checkTeamLevelUp(membership.teamId);
    }
  }

  /**
   * Check and handle team level ups
   */
  private async checkTeamLevelUp(teamId: string): Promise<void> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) return;

    const requiredXp = this.getXpForLevel(team.level + 1);

    if (team.totalXp >= requiredXp) {
      const newLevel = team.level + 1;

      await prisma.team.update({
        where: { id: teamId },
        data: { level: newLevel },
      });

      // Emit level up event
      eventEmitter.emit('team.levelUp', {
        teamId,
        oldLevel: team.level,
        newLevel,
      });

      // Award team achievement if milestone
      if (newLevel % 10 === 0) {
        await this.awardTeamAchievement(teamId, {
          name: `Level ${newLevel} Team`,
          description: `Reached team level ${newLevel}`,
          iconUrl: '/achievements/team-level.svg',
        });
      }
    }
  }

  /**
   * Award team achievement
   */
  private async awardTeamAchievement(
    teamId: string,
    achievement: { name: string; description: string; iconUrl: string }
  ): Promise<void> {
    const achievementId = `team_${teamId}_${achievement.name.replace(/\s+/g, '_').toLowerCase()}`;

    // Check if already awarded
    const existing = await prisma.teamAchievement.findUnique({
      where: {
        teamId_achievementId: {
          teamId,
          achievementId,
        },
      },
    });

    if (existing) return;

    await prisma.teamAchievement.create({
      data: {
        teamId,
        achievementId,
        name: achievement.name,
        description: achievement.description,
        iconUrl: achievement.iconUrl,
      },
    });

    // Emit event
    eventEmitter.emit('team.achievement.earned', {
      teamId,
      achievementId,
      name: achievement.name,
    });
  }

  /**
   * Get team stats
   */
  async getTeamStats(teamId: string): Promise<TeamStats> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    const members = await this.getTeamMembers(teamId);
    const topContributors = members.slice(0, 5);

    const achievements = await prisma.teamAchievement.findMany({
      where: { teamId },
      orderBy: { earnedAt: 'desc' },
      take: 5,
    });

    // Calculate active members (contributed in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const activeMembers = members.filter((m) => m.weeklyContribution > 0).length;

    return {
      totalXp: team.totalXp,
      weeklyXp: team.weeklyXp,
      monthlyXp: team.monthlyXp,
      level: team.level,
      totalMembers: members.length,
      activeMembers,
      topContributors,
      recentAchievements: achievements.map((a) => ({
        id: a.id,
        teamId: a.teamId,
        achievementId: a.achievementId,
        name: a.name,
        description: a.description,
        iconUrl: a.iconUrl,
        earnedAt: a.earnedAt,
      })),
    };
  }

  /**
   * Get team leaderboard
   */
  async getTeamLeaderboard(params: {
    type?: TeamType;
    schoolId?: string;
    period?: 'weekly' | 'monthly' | 'all_time';
    limit?: number;
  }): Promise<Team[]> {
    const { type, schoolId, period = 'all_time', limit = 20 } = params;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (schoolId) where.schoolId = schoolId;

    const orderBy =
      period === 'weekly'
        ? { weeklyXp: 'desc' as const }
        : period === 'monthly'
        ? { monthlyXp: 'desc' as const }
        : { totalXp: 'desc' as const };

    const teams = await prisma.team.findMany({
      where,
      orderBy,
      take: limit,
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    return teams.map((team) => ({
      ...this.toTeam(team),
      memberCount: team._count.members,
    }));
  }

  /**
   * List teams by school
   */
  async listSchoolTeams(schoolId: string): Promise<Team[]> {
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { schoolId },
          { type: 'cross_school', isPublic: true },
        ],
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { totalXp: 'desc' },
    });

    return teams.map((team) => ({
      ...this.toTeam(team),
      memberCount: team._count.members,
    }));
  }

  /**
   * Search teams
   */
  async searchTeams(query: string, filters?: {
    type?: TeamType;
    schoolId?: string;
  }): Promise<Team[]> {
    const where: Record<string, unknown> = {
      isPublic: true,
      name: { contains: query, mode: 'insensitive' },
    };

    if (filters?.type) where.type = filters.type;
    if (filters?.schoolId) where.schoolId = filters.schoolId;

    const teams = await prisma.team.findMany({
      where,
      include: {
        _count: {
          select: { members: true },
        },
      },
      take: 20,
      orderBy: { totalXp: 'desc' },
    });

    return teams.map((team) => ({
      ...this.toTeam(team),
      memberCount: team._count.members,
    }));
  }

  /**
   * Update team member role
   */
  async updateMemberRole(
    teamId: string,
    studentId: string,
    newRole: TeamMemberRole,
    updatedBy: string
  ): Promise<boolean> {
    // Verify updater is owner
    const updater = await prisma.teamMember.findFirst({
      where: { teamId, studentId: updatedBy },
    });

    if (!updater || updater.role !== 'owner') {
      throw new Error('Only team owner can update roles');
    }

    const member = await prisma.teamMember.findFirst({
      where: { teamId, studentId },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    // Cannot demote yourself if you're the owner
    if (updatedBy === studentId && updater.role === 'owner' && newRole !== 'owner') {
      throw new Error('Cannot demote yourself as owner');
    }

    await prisma.teamMember.update({
      where: { id: member.id },
      data: { role: newRole },
    });

    return true;
  }

  /**
   * Reset weekly/monthly stats (cron job)
   */
  async resetPeriodStats(period: 'weekly' | 'monthly'): Promise<void> {
    if (period === 'weekly') {
      await prisma.team.updateMany({
        data: { weeklyXp: 0 },
      });
      await prisma.teamMember.updateMany({
        data: { weeklyContribution: 0 },
      });
    } else {
      await prisma.team.updateMany({
        data: { monthlyXp: 0 },
      });
      await prisma.teamMember.updateMany({
        data: { monthlyContribution: 0 },
      });
    }

    console.log(`Reset ${period} team stats`);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private getXpForLevel(level: number): number {
    // Team leveling: exponential curve, slower than individual
    return Math.floor(1000 * Math.pow(level, 1.8));
  }

  private toTeam(data: {
    id: string;
    name: string;
    description: string;
    type: string;
    schoolId?: string | null;
    classId?: string | null;
    avatarUrl?: string | null;
    maxMembers: number;
    totalXp: number;
    weeklyXp: number;
    monthlyXp: number;
    level: number;
    isPublic: boolean;
    createdAt: Date;
    createdBy: string;
  }): Team {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type as TeamType,
      schoolId: data.schoolId || undefined,
      classId: data.classId || undefined,
      avatarUrl: data.avatarUrl || undefined,
      maxMembers: data.maxMembers,
      totalXp: data.totalXp,
      weeklyXp: data.weeklyXp,
      monthlyXp: data.monthlyXp,
      level: data.level,
      memberCount: 0, // Will be populated by caller
      isPublic: data.isPublic,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
    };
  }
}

export const teamService = new TeamService();
