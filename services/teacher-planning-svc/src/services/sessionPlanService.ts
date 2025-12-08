/**
 * Session Plan Service
 *
 * Business logic for managing session plans and items.
 */

import type { Prisma } from '@prisma/client';

import { BadRequestError, NotFoundError } from '../middleware/errorHandler.js';
import { prisma } from '../prisma.js';
import type {
  SessionPlan,
  SessionPlanType,
  SessionPlanStatus,
  SessionPlanItem,
  SessionPlanMetadata,
  SessionPlanItemAiMetadata,
} from '../types/domain.js';

import { getSkillsByIds, validateSessionId } from './externalClients.js';

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN CRUD
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateSessionPlanParams {
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  sessionType: SessionPlanType;
  scheduledFor?: Date | undefined;
  templateName?: string | undefined;
  goalIds?: string[] | undefined;
  estimatedDurationMinutes?: number | undefined;
  metadataJson?: SessionPlanMetadata | undefined;
}

export interface UpdateSessionPlanParams {
  status?: SessionPlanStatus | undefined;
  scheduledFor?: Date | null | undefined;
  templateName?: string | null | undefined;
  sessionId?: string | null | undefined;
  estimatedDurationMinutes?: number | null | undefined;
  metadataJson?: SessionPlanMetadata | null | undefined;
}

export interface ListSessionPlansParams {
  tenantId: string;
  learnerId: string;
  status?: SessionPlanStatus | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
  page: number;
  pageSize: number;
}

export interface ListSessionPlansResult {
  sessionPlans: SessionPlan[];
  total: number;
}

/**
 * Create a new session plan
 */
export async function createSessionPlan(params: CreateSessionPlanParams): Promise<SessionPlan> {
  const {
    tenantId,
    learnerId,
    createdByUserId,
    sessionType,
    scheduledFor,
    templateName,
    goalIds,
    estimatedDurationMinutes,
    metadataJson,
  } = params;

  // Store goalIds in metadata for reference
  const metadata: SessionPlanMetadata = {
    ...metadataJson,
    linkedGoalIds: goalIds,
  };

  const plan = await prisma.sessionPlan.create({
    data: {
      tenantId,
      learnerId,
      createdByUserId,
      sessionType,
      scheduledFor: scheduledFor ?? null,
      sessionTemplateName: templateName ?? null,
      estimatedDurationMinutes: estimatedDurationMinutes ?? null,
      status: 'DRAFT',
      metadataJson: metadata as Prisma.InputJsonValue,
    },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return mapSessionPlanFromDb(plan);
}

/**
 * Get a session plan by ID
 */
export async function getSessionPlanById(planId: string, tenantId?: string): Promise<SessionPlan> {
  interface WhereClause {
    id: string;
    tenantId?: string;
  }

  const where: WhereClause = { id: planId };
  if (tenantId) where.tenantId = tenantId;

  const plan = await prisma.sessionPlan.findFirst({
    where,
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!plan) {
    throw new NotFoundError('SessionPlan', planId);
  }

  const result = mapSessionPlanFromDb(plan);

  // Enrich items with skill info
  if (result.items && result.items.length > 0) {
    const skillIds = result.items
      .map((item: SessionPlanItem) => item.skillId)
      .filter((id): id is string => id !== null);

    if (skillIds.length > 0) {
      const skillsMap = await getSkillsByIds(skillIds);
      for (const item of result.items) {
        if (item.skillId) {
          const skill = skillsMap.get(item.skillId);
          if (skill) {
            item.skill = skill;
          }
        }
      }
    }
  }

  return result;
}

/**
 * List session plans for a learner
 */
export async function listSessionPlans(
  params: ListSessionPlansParams
): Promise<ListSessionPlansResult> {
  const { tenantId, learnerId, status, from, to, page, pageSize } = params;

  interface WhereClause {
    learnerId: string;
    tenantId?: string;
    status?: SessionPlanStatus;
    scheduledFor?: {
      gte?: Date;
      lte?: Date;
    };
  }

  const where: WhereClause = { learnerId };
  if (tenantId) where.tenantId = tenantId;
  if (status) where.status = status;
  if (from || to) {
    where.scheduledFor = {};
    if (from) where.scheduledFor.gte = from;
    if (to) where.scheduledFor.lte = to;
  }

  const [plans, total] = await Promise.all([
    prisma.sessionPlan.findMany({
      where,
      include: {
        items: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sessionPlan.count({ where }),
  ]);

  return {
    sessionPlans: plans.map(mapSessionPlanFromDb),
    total,
  };
}

/**
 * Update a session plan
 */
export async function updateSessionPlan(
  planId: string,
  params: UpdateSessionPlanParams,
  tenantId?: string
): Promise<SessionPlan> {
  // Verify plan exists and user has access
  await getSessionPlanById(planId, tenantId);

  // Validate sessionId if linking to a session
  if (params.sessionId) {
    const valid = await validateSessionId(params.sessionId);
    if (!valid) {
      throw new BadRequestError(`Invalid sessionId: ${params.sessionId}`);
    }
  }

  const plan = await prisma.sessionPlan.update({
    where: { id: planId },
    data: {
      ...(params.status !== undefined && { status: params.status }),
      ...(params.scheduledFor !== undefined && { scheduledFor: params.scheduledFor }),
      ...(params.templateName !== undefined && { sessionTemplateName: params.templateName }),
      ...(params.sessionId !== undefined && { sessionId: params.sessionId }),
      ...(params.estimatedDurationMinutes !== undefined && {
        estimatedDurationMinutes: params.estimatedDurationMinutes,
      }),
      ...(params.metadataJson !== undefined && {
        metadataJson: (params.metadataJson || {}) as Prisma.InputJsonValue,
      }),
    },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return mapSessionPlanFromDb(plan);
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN ITEMS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateSessionPlanItemParams {
  orderIndex: number;
  goalId?: string | undefined;
  goalObjectiveId?: string | undefined;
  skillId?: string | undefined;
  activityType: string;
  activityDescription?: string | undefined;
  estimatedDurationMinutes?: number | undefined;
  aiMetadataJson?: SessionPlanItemAiMetadata | undefined;
}

/**
 * Replace all items in a session plan
 */
export async function replaceSessionPlanItems(
  planId: string,
  items: CreateSessionPlanItemParams[],
  tenantId?: string
): Promise<SessionPlanItem[]> {
  // Verify plan exists
  await getSessionPlanById(planId, tenantId);

  // Delete existing items and create new ones in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Delete existing items
    await tx.sessionPlanItem.deleteMany({
      where: { sessionPlanId: planId },
    });

    // Create new items
    const created = await Promise.all(
      items.map((item) =>
        tx.sessionPlanItem.create({
          data: {
            sessionPlanId: planId,
            orderIndex: item.orderIndex,
            goalId: item.goalId ?? null,
            goalObjectiveId: item.goalObjectiveId ?? null,
            skillId: item.skillId ?? null,
            activityType: item.activityType,
            activityDescription: item.activityDescription ?? null,
            estimatedDurationMinutes: item.estimatedDurationMinutes ?? null,
            aiMetadataJson: (item.aiMetadataJson || {}) as Prisma.InputJsonValue,
          },
        })
      )
    );

    return created;
  });

  const mappedItems = result.map(mapSessionPlanItemFromDb);

  // Enrich with skill info
  const skillIds = mappedItems
    .map((item: SessionPlanItem) => item.skillId)
    .filter((id): id is string => id !== null);

  if (skillIds.length > 0) {
    const skillsMap = await getSkillsByIds(skillIds);
    for (const item of mappedItems) {
      if (item.skillId) {
        const skill = skillsMap.get(item.skillId);
        if (skill) {
          item.skill = skill;
        }
      }
    }
  }

  return mappedItems;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAPPERS
// ══════════════════════════════════════════════════════════════════════════════

interface DbSessionPlan {
  id: string;
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  sessionTemplateName: string | null;
  scheduledFor: Date | null;
  estimatedDurationMinutes: number | null;
  sessionType: string;
  status: string;
  sessionId: string | null;
  metadataJson: unknown;
  createdAt: Date;
  updatedAt: Date;
  items?: DbSessionPlanItem[];
}

interface DbSessionPlanItem {
  id: string;
  sessionPlanId: string;
  orderIndex: number;
  goalId: string | null;
  goalObjectiveId: string | null;
  skillId: string | null;
  activityType: string;
  activityDescription: string | null;
  estimatedDurationMinutes: number | null;
  aiMetadataJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function mapSessionPlanFromDb(db: DbSessionPlan): SessionPlan {
  return {
    id: db.id,
    tenantId: db.tenantId,
    learnerId: db.learnerId,
    createdByUserId: db.createdByUserId,
    sessionTemplateName: db.sessionTemplateName,
    scheduledFor: db.scheduledFor,
    estimatedDurationMinutes: db.estimatedDurationMinutes,
    sessionType: db.sessionType as SessionPlanType,
    status: db.status as SessionPlanStatus,
    sessionId: db.sessionId,
    metadataJson: db.metadataJson as SessionPlanMetadata | null,
    createdAt: db.createdAt,
    updatedAt: db.updatedAt,
    items: db.items ? db.items.map(mapSessionPlanItemFromDb) : [],
  };
}

function mapSessionPlanItemFromDb(db: DbSessionPlanItem): SessionPlanItem {
  return {
    id: db.id,
    sessionPlanId: db.sessionPlanId,
    orderIndex: db.orderIndex,
    goalId: db.goalId,
    goalObjectiveId: db.goalObjectiveId,
    skillId: db.skillId,
    activityType: db.activityType,
    activityDescription: db.activityDescription,
    estimatedDurationMinutes: db.estimatedDurationMinutes,
    aiMetadataJson: db.aiMetadataJson as SessionPlanItemAiMetadata | null,
    createdAt: db.createdAt,
    updatedAt: db.updatedAt,
  };
}
