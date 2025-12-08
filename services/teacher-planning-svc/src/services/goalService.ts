/**
 * Goal Service
 *
 * Business logic for managing goals and objectives.
 */

import { prisma } from '../prisma.js';
import type {
  Goal,
  GoalDomain,
  GoalStatus,
  GoalObjective,
  ObjectiveStatus,
  ProgressRating,
  GoalMetadata,
} from '../types/domain.js';
import { getSkillById, getSkillsByIds } from './externalClients.js';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler.js';

// ══════════════════════════════════════════════════════════════════════════════
// GOAL CRUD
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateGoalParams {
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  title: string;
  description?: string;
  domain: GoalDomain;
  skillId?: string;
  startDate?: Date;
  targetDate?: Date;
  metadataJson?: GoalMetadata;
}

export interface UpdateGoalParams {
  title?: string;
  description?: string | null;
  status?: GoalStatus;
  targetDate?: Date | null;
  progressRating?: ProgressRating | null;
  metadataJson?: GoalMetadata | null;
}

export interface ListGoalsParams {
  tenantId?: string;
  learnerId: string;
  status?: GoalStatus;
  domain?: GoalDomain;
  page: number;
  pageSize: number;
}

export interface ListGoalsResult {
  goals: Goal[];
  total: number;
}

/**
 * Create a new goal
 */
export async function createGoal(params: CreateGoalParams): Promise<Goal> {
  const {
    tenantId,
    learnerId,
    createdByUserId,
    title,
    description,
    domain,
    skillId,
    startDate,
    targetDate,
    metadataJson,
  } = params;

  // Validate skill if provided
  if (skillId) {
    const skill = await getSkillById(skillId);
    if (!skill) {
      throw new BadRequestError(`Invalid skillId: ${skillId}`);
    }
  }

  const goal = await prisma.goal.create({
    data: {
      tenantId,
      learnerId,
      createdByUserId,
      title,
      description,
      domain,
      skillId,
      startDate: startDate || new Date(),
      targetDate,
      status: 'ACTIVE',
      metadataJson: metadataJson || {},
    },
    include: {
      objectives: true,
    },
  });

  const result = mapGoalFromDb(goal);

  // Enrich with skill info
  if (result.skillId) {
    result.skill = await getSkillById(result.skillId) || undefined;
  }

  return result;
}

/**
 * Get a goal by ID
 */
export async function getGoalById(goalId: string, tenantId?: string): Promise<Goal> {
  const where: { id: string; tenantId?: string } = { id: goalId };
  if (tenantId) where.tenantId = tenantId;

  const goal = await prisma.goal.findFirst({
    where,
    include: {
      objectives: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!goal) {
    throw new NotFoundError('Goal', goalId);
  }

  const result = mapGoalFromDb(goal);

  // Enrich with skill info
  if (result.skillId) {
    result.skill = await getSkillById(result.skillId) || undefined;
  }

  return result;
}

/**
 * List goals for a learner
 */
export async function listGoals(params: ListGoalsParams): Promise<ListGoalsResult> {
  const { tenantId, learnerId, status, domain, page, pageSize } = params;

  interface WhereClause {
    learnerId: string;
    tenantId?: string;
    status?: GoalStatus;
    domain?: GoalDomain;
  }

  const where: WhereClause = { learnerId };
  if (tenantId) where.tenantId = tenantId;
  if (status) where.status = status;
  if (domain) where.domain = domain;

  const [goals, total] = await Promise.all([
    prisma.goal.findMany({
      where,
      include: {
        objectives: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.goal.count({ where }),
  ]);

  const mappedGoals = goals.map(mapGoalFromDb);

  // Batch enrich skill info
  const skillIds = mappedGoals
    .map((g) => g.skillId)
    .filter((id): id is string => id !== null);

  if (skillIds.length > 0) {
    const skillsMap = await getSkillsByIds(skillIds);
    for (const goal of mappedGoals) {
      if (goal.skillId && skillsMap.has(goal.skillId)) {
        goal.skill = skillsMap.get(goal.skillId);
      }
    }
  }

  return { goals: mappedGoals, total };
}

/**
 * Update a goal
 */
export async function updateGoal(
  goalId: string,
  params: UpdateGoalParams,
  tenantId?: string
): Promise<Goal> {
  // Verify goal exists and user has access
  await getGoalById(goalId, tenantId);

  const goal = await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(params.title !== undefined && { title: params.title }),
      ...(params.description !== undefined && { description: params.description }),
      ...(params.status !== undefined && { status: params.status }),
      ...(params.targetDate !== undefined && { targetDate: params.targetDate }),
      ...(params.progressRating !== undefined && { progressRating: params.progressRating }),
      ...(params.metadataJson !== undefined && { metadataJson: params.metadataJson || {} }),
    },
    include: {
      objectives: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  const result = mapGoalFromDb(goal);

  if (result.skillId) {
    result.skill = await getSkillById(result.skillId) || undefined;
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// OBJECTIVE CRUD
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateObjectiveParams {
  goalId: string;
  description: string;
  successCriteria?: string;
  orderIndex?: number;
}

export interface UpdateObjectiveParams {
  description?: string;
  successCriteria?: string | null;
  status?: ObjectiveStatus;
  progressRating?: ProgressRating | null;
}

/**
 * Create a new objective for a goal
 */
export async function createObjective(
  params: CreateObjectiveParams,
  tenantId?: string
): Promise<GoalObjective> {
  const { goalId, description, successCriteria, orderIndex } = params;

  // Verify goal exists
  await getGoalById(goalId, tenantId);

  // Get next order index if not provided
  let finalOrderIndex = orderIndex;
  if (finalOrderIndex === undefined) {
    const maxOrder = await prisma.goalObjective.aggregate({
      where: { goalId },
      _max: { orderIndex: true },
    });
    finalOrderIndex = (maxOrder._max.orderIndex ?? -1) + 1;
  }

  const objective = await prisma.goalObjective.create({
    data: {
      goalId,
      description,
      successCriteria,
      orderIndex: finalOrderIndex,
      status: 'NOT_STARTED',
    },
  });

  return mapObjectiveFromDb(objective);
}

/**
 * Get an objective by ID
 */
export async function getObjectiveById(
  objectiveId: string,
  tenantId?: string
): Promise<GoalObjective> {
  const objective = await prisma.goalObjective.findUnique({
    where: { id: objectiveId },
    include: { goal: true },
  });

  if (!objective) {
    throw new NotFoundError('Objective', objectiveId);
  }

  // Tenant check via goal
  if (tenantId && objective.goal.tenantId !== tenantId) {
    throw new NotFoundError('Objective', objectiveId);
  }

  return mapObjectiveFromDb(objective);
}

/**
 * Update an objective
 */
export async function updateObjective(
  objectiveId: string,
  params: UpdateObjectiveParams,
  tenantId?: string
): Promise<GoalObjective> {
  // Verify objective exists and user has access
  await getObjectiveById(objectiveId, tenantId);

  const objective = await prisma.goalObjective.update({
    where: { id: objectiveId },
    data: {
      ...(params.description !== undefined && { description: params.description }),
      ...(params.successCriteria !== undefined && { successCriteria: params.successCriteria }),
      ...(params.status !== undefined && { status: params.status }),
      ...(params.progressRating !== undefined && { progressRating: params.progressRating }),
    },
  });

  return mapObjectiveFromDb(objective);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAPPERS
// ══════════════════════════════════════════════════════════════════════════════

interface DbGoal {
  id: string;
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  domain: string;
  skillId: string | null;
  startDate: Date;
  targetDate: Date | null;
  status: string;
  progressRating: number | null;
  metadataJson: unknown;
  createdAt: Date;
  updatedAt: Date;
  objectives?: DbObjective[];
}

interface DbObjective {
  id: string;
  goalId: string;
  description: string;
  successCriteria: string | null;
  status: string;
  progressRating: number | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

function mapGoalFromDb(db: DbGoal): Goal {
  return {
    id: db.id,
    tenantId: db.tenantId,
    learnerId: db.learnerId,
    createdByUserId: db.createdByUserId,
    title: db.title,
    description: db.description,
    domain: db.domain as GoalDomain,
    skillId: db.skillId,
    startDate: db.startDate,
    targetDate: db.targetDate,
    status: db.status as GoalStatus,
    progressRating: db.progressRating as ProgressRating | null,
    metadataJson: db.metadataJson as GoalMetadata | null,
    createdAt: db.createdAt,
    updatedAt: db.updatedAt,
    objectives: db.objectives?.map(mapObjectiveFromDb),
  };
}

function mapObjectiveFromDb(db: DbObjective): GoalObjective {
  return {
    id: db.id,
    goalId: db.goalId,
    description: db.description,
    successCriteria: db.successCriteria,
    status: db.status as ObjectiveStatus,
    progressRating: db.progressRating as ProgressRating | null,
    orderIndex: db.orderIndex,
    createdAt: db.createdAt,
    updatedAt: db.updatedAt,
  };
}
