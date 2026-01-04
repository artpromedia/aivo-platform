/**
 * Team Routes
 *
 * Handles team/guild-related API endpoints
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */

import { Router, Request, Response, NextFunction, IRouter } from 'express';
import { z } from 'zod';
import { teamService, TeamType, TeamMemberRole } from '../services/team.service.js';

const router: IRouter = Router();

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

const extractStudentId = (req: Request): string => {
  const studentId = req.headers['x-student-id'] as string;
  if (!studentId) {
    throw new Error('Student ID required');
  }
  return studentId;
};

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/gamification/teams
 * Create a new team
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const data = createTeamSchema.parse(req.body);

    const team = await teamService.createTeam({
      ...data,
      createdBy: studentId,
    });

    res.status(201).json({
      success: true,
      data: team,
    });
  })
);

/**
 * GET /api/gamification/teams
 * List/search teams
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const type = req.query.type as TeamType | undefined;
    const schoolId = req.query.schoolId as string | undefined;

    let teams;
    if (query) {
      teams = await teamService.searchTeams(query, { type, schoolId });
    } else if (schoolId) {
      teams = await teamService.listSchoolTeams(schoolId);
    } else {
      // Default: get top teams
      teams = await teamService.getTeamLeaderboard({ limit: 20 });
    }

    res.json({
      success: true,
      data: teams,
    });
  })
);

/**
 * GET /api/gamification/teams/:id
 * Get team details
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const teamId = req.params.id;
    const details = await teamService.getTeamDetails(teamId);

    if (!details) {
      res.status(404).json({
        success: false,
        error: 'Team not found',
      });
      return;
    }

    res.json({
      success: true,
      data: details,
    });
  })
);

/**
 * POST /api/gamification/teams/:id/join
 * Join a team
 */
router.post(
  '/:id/join',
  asyncHandler(async (req: Request, res: Response) => {
    const teamId = req.params.id;
    const studentId = extractStudentId(req);

    try {
      const success = await teamService.joinTeam(teamId, studentId);
      res.json({
        success: true,
        data: { joined: success },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join team',
      });
    }
  })
);

/**
 * POST /api/gamification/teams/:id/leave
 * Leave a team
 */
router.post(
  '/:id/leave',
  asyncHandler(async (req: Request, res: Response) => {
    const teamId = req.params.id;
    const studentId = extractStudentId(req);

    try {
      const success = await teamService.leaveTeam(teamId, studentId);
      res.json({
        success: true,
        data: { left: success },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave team',
      });
    }
  })
);

/**
 * GET /api/gamification/teams/:id/members
 * Get team members
 */
router.get(
  '/:id/members',
  asyncHandler(async (req: Request, res: Response) => {
    const teamId = req.params.id;
    const members = await teamService.getTeamMembers(teamId);

    res.json({
      success: true,
      data: members,
    });
  })
);

/**
 * GET /api/gamification/teams/:id/leaderboard
 * Get team member rankings (leaderboard within team)
 */
router.get(
  '/:id/leaderboard',
  asyncHandler(async (req: Request, res: Response) => {
    const teamId = req.params.id;
    const period = (req.query.period as 'weekly' | 'monthly' | 'all_time') || 'all_time';

    const members = await teamService.getTeamMembers(teamId);

    // Sort by appropriate period
    const sorted = members.sort((a, b) => {
      if (period === 'weekly') {
        return b.weeklyContribution - a.weeklyContribution;
      } else if (period === 'monthly') {
        return b.monthlyContribution - a.monthlyContribution;
      } else {
        return b.contributedXp - a.contributedXp;
      }
    });

    const leaderboard = sorted.map((member, index) => ({
      rank: index + 1,
      studentId: member.studentId,
      displayName: member.student
        ? `${member.student.givenName} ${member.student.familyName}`
        : 'Unknown',
      role: member.role,
      score:
        period === 'weekly'
          ? member.weeklyContribution
          : period === 'monthly'
          ? member.monthlyContribution
          : member.contributedXp,
      level: member.student?.level,
    }));

    res.json({
      success: true,
      data: {
        period,
        leaderboard,
      },
    });
  })
);

/**
 * GET /api/gamification/teams/school/:schoolId
 * List teams for a school
 */
router.get(
  '/school/:schoolId',
  asyncHandler(async (req: Request, res: Response) => {
    const schoolId = req.params.schoolId;
    const teams = await teamService.listSchoolTeams(schoolId);

    res.json({
      success: true,
      data: teams,
    });
  })
);

/**
 * GET /api/gamification/teams/leaderboard
 * Get team leaderboard
 */
router.get(
  '/leaderboard/top',
  asyncHandler(async (req: Request, res: Response) => {
    const type = req.query.type as TeamType | undefined;
    const schoolId = req.query.schoolId as string | undefined;
    const period = (req.query.period as 'weekly' | 'monthly' | 'all_time') || 'all_time';
    const limit = parseInt(req.query.limit as string) || 20;

    const teams = await teamService.getTeamLeaderboard({
      type,
      schoolId,
      period,
      limit,
    });

    res.json({
      success: true,
      data: {
        period,
        teams,
      },
    });
  })
);

/**
 * GET /api/gamification/teams/:id/stats
 * Get team statistics
 */
router.get(
  '/:id/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const teamId = req.params.id;
    const stats = await teamService.getTeamStats(teamId);

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * PUT /api/gamification/teams/:id/members/:memberId/role
 * Update team member role (owner only)
 */
router.put(
  '/:id/members/:memberId/role',
  asyncHandler(async (req: Request, res: Response) => {
    const teamId = req.params.id;
    const updatedBy = extractStudentId(req);
    const data = updateRoleSchema.parse(req.body);

    try {
      await teamService.updateMemberRole(teamId, data.studentId, data.role, updatedBy);

      res.json({
        success: true,
        message: 'Role updated successfully',
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update role',
      });
    }
  })
);

/**
 * GET /api/gamification/teams/my-teams
 * Get teams the current user is a member of
 */
router.get(
  '/my/teams',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);

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

    res.json({
      success: true,
      data: teams,
    });
  })
);

export default router;
