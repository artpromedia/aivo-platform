/**
 * Team Routes
 *
 * Handles team/guild-related API endpoints
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { TeamType } from '../services/team.service.js';
import { teamService } from '../services/team.service.js';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTeamSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().max(500),
  type: z.enum(['classroom', 'school', 'cross_school']),
  schoolId: z.string().optional(),
  classId: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  maxMembers: z.number().min(2).max(100).optional(),
  isPublic: z.boolean().optional(),
});

const updateRoleSchema = z.object({
  studentId: z.string(),
  role: z.enum(['owner', 'captain', 'member']),
});

// ============================================================================
// HELPERS
// ============================================================================

const extractStudentId = (request: FastifyRequest): string => {
  const studentId = request.headers['x-student-id'] as string;
  if (!studentId) {
    throw new Error('Student ID required');
  }
  return studentId;
};

// ============================================================================
// ROUTES
// ============================================================================

async function teamRoutes(app: FastifyInstance) {
  /**
   * POST /api/gamification/teams
   * Create a new team
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const studentId = extractStudentId(request);
    const data = createTeamSchema.parse(request.body);

    const team = await teamService.createTeam({
      name: data.name,
      description: data.description,
      type: data.type,
      schoolId: data.schoolId,
      classId: data.classId,
      avatarUrl: data.avatarUrl,
      maxMembers: data.maxMembers,
      isPublic: data.isPublic,
      createdBy: studentId,
    });

    reply.status(201);
    return {
      success: true,
      data: team,
    };
  });

  /**
   * GET /api/gamification/teams
   * List/search teams
   */
  app.get('/', async (request: FastifyRequest) => {
    const query = (request.query as any).q as string;
    const type = (request.query as any).type as TeamType | undefined;
    const schoolId = (request.query as any).schoolId as string | undefined;

    let teams;
    if (query) {
      teams = await teamService.searchTeams(query, { type, schoolId });
    } else if (schoolId) {
      teams = await teamService.listSchoolTeams(schoolId);
    } else {
      // Default: get top teams
      teams = await teamService.getTeamLeaderboard({ limit: 20 });
    }

    return {
      success: true,
      data: teams,
    };
  });

  /**
   * GET /api/gamification/teams/:id
   * Get team details
   */
  app.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const teamId = request.params.id;
      const details = await teamService.getTeamDetails(teamId);

      if (!details) {
        reply.status(404);
        return {
          success: false,
          error: 'Team not found',
        };
      }

      return {
        success: true,
        data: details,
      };
    }
  );

  /**
   * POST /api/gamification/teams/:id/join
   * Join a team
   */
  app.post(
    '/:id/join',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const teamId = request.params.id;
      const studentId = extractStudentId(request);

      try {
        const success = await teamService.joinTeam(teamId, studentId);
        return {
          success: true,
          data: { joined: success },
        };
      } catch (error) {
        reply.status(400);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to join team',
        };
      }
    }
  );

  /**
   * POST /api/gamification/teams/:id/leave
   * Leave a team
   */
  app.post(
    '/:id/leave',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const teamId = request.params.id;
      const studentId = extractStudentId(request);

      try {
        const success = await teamService.leaveTeam(teamId, studentId);
        return {
          success: true,
          data: { left: success },
        };
      } catch (error) {
        reply.status(400);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to leave team',
        };
      }
    }
  );

  /**
   * GET /api/gamification/teams/:id/members
   * Get team members
   */
  app.get('/:id/members', async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const teamId = request.params.id;
    const members = await teamService.getTeamMembers(teamId);

    return {
      success: true,
      data: members,
    };
  });

  /**
   * GET /api/gamification/teams/:id/leaderboard
   * Get team member rankings (leaderboard within team)
   */
  app.get('/:id/leaderboard', async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const teamId = request.params.id;
    const period =
      ((request.query as any).period as 'weekly' | 'monthly' | 'all_time') || 'all_time';

    const members = await teamService.getTeamMembers(teamId);

    // Sort by appropriate period
    const sorted = [...members].sort((a, b) => {
      if (period === 'weekly') {
        return b.weeklyContribution - a.weeklyContribution;
      } else if (period === 'monthly') {
        return b.monthlyContribution - a.monthlyContribution;
      } else {
        return b.contributedXp - a.contributedXp;
      }
    });

    const leaderboard = sorted.map((member, index) => {
      let score: number;
      if (period === 'weekly') {
        score = member.weeklyContribution;
      } else if (period === 'monthly') {
        score = member.monthlyContribution;
      } else {
        score = member.contributedXp;
      }

      return {
        rank: index + 1,
        studentId: member.studentId,
        displayName: member.student
          ? `${member.student.givenName} ${member.student.familyName}`
          : 'Unknown',
        role: member.role,
        score,
        level: member.student?.level,
      };
    });

    return {
      success: true,
      data: {
        period,
        leaderboard,
      },
    };
  });

  /**
   * GET /api/gamification/teams/school/:schoolId
   * List teams for a school
   */
  app.get(
    '/school/:schoolId',
    async (request: FastifyRequest<{ Params: { schoolId: string } }>) => {
      const schoolId = request.params.schoolId;
      const teams = await teamService.listSchoolTeams(schoolId);

      return {
        success: true,
        data: teams,
      };
    }
  );

  /**
   * GET /api/gamification/teams/leaderboard
   * Get team leaderboard
   */
  app.get('/leaderboard/top', async (request: FastifyRequest) => {
    const type = (request.query as any).type as TeamType | undefined;
    const schoolId = (request.query as any).schoolId as string | undefined;
    const period =
      ((request.query as any).period as 'weekly' | 'monthly' | 'all_time') || 'all_time';
    const limit = Number.parseInt((request.query as any).limit as string) || 20;

    const teams = await teamService.getTeamLeaderboard({
      type,
      schoolId,
      period,
      limit,
    });

    return {
      success: true,
      data: {
        period,
        teams,
      },
    };
  });

  /**
   * GET /api/gamification/teams/:id/stats
   * Get team statistics
   */
  app.get('/:id/stats', async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const teamId = request.params.id;
    const stats = await teamService.getTeamStats(teamId);

    return {
      success: true,
      data: stats,
    };
  });

  /**
   * PUT /api/gamification/teams/:id/members/:memberId/role
   * Update team member role (owner only)
   */
  app.put(
    '/:id/members/:memberId/role',
    async (
      request: FastifyRequest<{ Params: { id: string; memberId: string } }>,
      reply: FastifyReply
    ) => {
      const teamId = request.params.id;
      const updatedBy = extractStudentId(request);
      const data = updateRoleSchema.parse(request.body);

      try {
        await teamService.updateMemberRole(teamId, data.studentId, data.role, updatedBy);

        return {
          success: true,
          message: 'Role updated successfully',
        };
      } catch (error) {
        reply.status(403);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update role',
        };
      }
    }
  );

  /**
   * GET /api/gamification/teams/my-teams
   * Get teams the current user is a member of
   */
  app.get('/my/teams', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);

    const { prisma } = await import('../prisma.js');
    const memberships = await prisma.teamMember.findMany({
      where: { studentId },
      include: {
        team: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    const teams = memberships.map((m) => ({
      ...m.team,
      memberCount: m.team._count.members,
      myRole: m.role,
      myContribution: m.contributedXp,
    }));

    return {
      success: true,
      data: teams,
    };
  });
}

export default teamRoutes;
