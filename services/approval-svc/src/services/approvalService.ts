import { prisma } from '../prisma.js';

// Type definitions for approval workflow enums
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type StepType = 'SINGLE_APPROVER' | 'ANY_OF' | 'ALL_OF' | 'QUORUM';
type EscalationType = 'NOTIFY_ONLY' | 'AUTO_APPROVE' | 'AUTO_REJECT' | 'ESCALATE_UP';

// Workflow Management
export async function createWorkflow(tenantId: string, data: {
  name: string;
  description?: string;
  entityType: string;
  triggerCondition?: Record<string, any>;
  createdBy: string;
}) {
  return prisma.approvalWorkflow.create({
    data: {
      tenantId,
      name: data.name,
      ...(data.description !== undefined && { description: data.description }),
      entityType: data.entityType,
      ...(data.triggerCondition !== undefined && { triggerCondition: data.triggerCondition }),
      createdBy: data.createdBy,
      status: 'DRAFT',
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
}

export async function getWorkflow(tenantId: string, workflowId: string) {
  return prisma.approvalWorkflow.findFirst({
    where: { id: workflowId, tenantId },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
}

export async function listWorkflows(tenantId: string, filters?: {
  entityType?: string;
  status?: WorkflowStatus;
}) {
  const where: Record<string, unknown> = { tenantId };
  if (filters?.entityType) where.entityType = filters.entityType;
  if (filters?.status) where.status = filters.status;
  
  return prisma.approvalWorkflow.findMany({
    where,
    include: { steps: { orderBy: { order: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function updateWorkflow(tenantId: string, workflowId: string, data: {
  name?: string;
  description?: string;
  triggerCondition?: Record<string, any>;
  updatedBy: string;
}) {
  return prisma.approvalWorkflow.update({
    where: { id: workflowId, tenantId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
}

export async function activateWorkflow(tenantId: string, workflowId: string) {
  const workflow = await prisma.approvalWorkflow.findFirst({
    where: { id: workflowId, tenantId },
    include: { steps: true },
  });

  if (!workflow) throw new Error('Workflow not found');
  if (workflow.steps.length === 0) throw new Error('Workflow must have at least one step');

  return prisma.approvalWorkflow.update({
    where: { id: workflowId },
    data: { status: 'ACTIVE' },
  });
}

export async function deleteWorkflow(tenantId: string, workflowId: string) {
  return prisma.approvalWorkflow.delete({
    where: { id: workflowId, tenantId },
  });
}

// Step Management
export async function addStep(tenantId: string, workflowId: string, data: {
  name: string;
  order: number;
  type?: StepType;
  approverType: string;
  approverIds: string[];
  approverExpression?: string;
  quorumCount?: number;
  timeoutHours?: number;
  escalationType?: EscalationType;
  escalateTo?: string[];
  conditions?: Record<string, any>;
}) {
  return prisma.approvalStep.create({
    data: {
      tenantId,
      workflowId,
      name: data.name,
      order: data.order,
      type: data.type || 'SINGLE_APPROVER',
      approverType: data.approverType,
      approverIds: data.approverIds,
      ...(data.approverExpression !== undefined && { approverExpression: data.approverExpression }),
      ...(data.quorumCount !== undefined && { quorumCount: data.quorumCount }),
      ...(data.timeoutHours !== undefined && { timeoutHours: data.timeoutHours }),
      escalationType: data.escalationType || 'NOTIFY_ONLY',
      escalateTo: data.escalateTo || [],
      ...(data.conditions !== undefined && { conditions: data.conditions }),
    },
  });
}

export async function updateStep(tenantId: string, stepId: string, data: Partial<{
  name: string;
  order: number;
  type: StepType;
  approverType: string;
  approverIds: string[];
  approverExpression: string;
  quorumCount: number;
  timeoutHours: number;
  escalationType: EscalationType;
  escalateTo: string[];
  conditions: Record<string, any>;
}>) {
  return prisma.approvalStep.update({
    where: { id: stepId, tenantId },
    data,
  });
}

export async function deleteStep(tenantId: string, stepId: string) {
  return prisma.approvalStep.delete({
    where: { id: stepId, tenantId },
  });
}

// Request Management
export async function createRequest(tenantId: string, data: {
  workflowId: string;
  entityType: string;
  entityId: string;
  entityData?: Record<string, any>;
  title: string;
  description?: string;
  priority?: number;
  requestedBy: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}) {
  const workflow = await prisma.approvalWorkflow.findFirst({
    where: { id: data.workflowId, tenantId, status: 'ACTIVE' },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  if (!workflow) throw new Error('Active workflow not found');
  if (workflow.steps.length === 0) throw new Error('Workflow has no steps');

  const request = await prisma.approvalRequest.create({
    data: {
      tenantId,
      workflowId: data.workflowId,
      entityType: data.entityType,
      entityId: data.entityId,
      ...(data.entityData !== undefined && { entityData: data.entityData }),
      title: data.title,
      ...(data.description !== undefined && { description: data.description }),
      priority: data.priority || 0,
      requestedBy: data.requestedBy,
      ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
      ...(data.metadata !== undefined && { metadata: data.metadata }),
      currentStepOrder: 1,
    },
  });

  // Create first step instance
  const firstStep = workflow.steps[0];
  if (!firstStep) throw new Error('Workflow has no steps');
  
  const assignedTo = await resolveApprovers(tenantId, firstStep, data.entityData);

  await prisma.stepInstance.create({
    data: {
      tenantId,
      requestId: request.id,
      stepId: firstStep.id,
      assignedTo,
      dueAt: firstStep.timeoutHours
        ? new Date(Date.now() + firstStep.timeoutHours * 60 * 60 * 1000)
        : null,
    },
  });

  // Log history
  await addHistory(tenantId, request.id, 'created', data.requestedBy, {
    title: data.title,
    workflowName: workflow.name,
  });

  return getRequest(tenantId, request.id);
}

export async function getRequest(tenantId: string, requestId: string) {
  return prisma.approvalRequest.findFirst({
    where: { id: requestId, tenantId },
    include: {
      workflow: true,
      stepInstances: {
        include: { step: true, decisions: true },
        orderBy: { createdAt: 'asc' },
      },
      decisions: { orderBy: { decidedAt: 'desc' } },
      comments: { orderBy: { createdAt: 'asc' } },
      history: { orderBy: { timestamp: 'desc' } },
    },
  });
}

export async function listRequests(tenantId: string, filters?: {
  status?: ApprovalStatus;
  entityType?: string;
  requestedBy?: string;
  assignedTo?: string;
  limit?: number;
}) {
  const where: any = { tenantId };

  if (filters?.status) where.status = filters.status;
  if (filters?.entityType) where.entityType = filters.entityType;
  if (filters?.requestedBy) where.requestedBy = filters.requestedBy;

  if (filters?.assignedTo) {
    where.stepInstances = {
      some: {
        status: 'PENDING',
        assignedTo: { has: filters.assignedTo },
      },
    };
  }

  return prisma.approvalRequest.findMany({
    where,
    include: {
      workflow: true,
      stepInstances: { where: { status: 'PENDING' } },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    take: filters?.limit || 50,
  });
}

export async function getPendingForUser(tenantId: string, userId: string) {
  // Check for delegations
  const delegations = await prisma.approvalDelegation.findMany({
    where: {
      tenantId,
      toUserId: userId,
      isActive: true,
      startDate: { lte: new Date() },
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
  });

  const userIds = [userId, ...delegations.map((d: { fromUserId: string }) => d.fromUserId)];

  return prisma.approvalRequest.findMany({
    where: {
      tenantId,
      status: 'PENDING',
      stepInstances: {
        some: {
          status: 'PENDING',
          assignedTo: { hasSome: userIds },
        },
      },
    },
    include: {
      workflow: true,
      stepInstances: {
        where: { status: 'PENDING' },
        include: { step: true },
      },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function makeDecision(tenantId: string, requestId: string, data: {
  decision: 'APPROVED' | 'REJECTED';
  comment?: string;
  attachments?: string[];
  decidedBy: string;
}) {
  const request = await prisma.approvalRequest.findFirst({
    where: { id: requestId, tenantId, status: 'PENDING' },
    include: {
      workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
      stepInstances: { where: { status: 'PENDING' }, include: { step: true } },
    },
  });

  if (!request) throw new Error('Pending request not found');

  const currentStepInstance = request.stepInstances[0];
  if (!currentStepInstance) throw new Error('No pending step instance');

  // Check if user is assigned (including delegations)
  const canDecide = await canUserDecide(tenantId, data.decidedBy, currentStepInstance.assignedTo);
  if (!canDecide) throw new Error('User not authorized to make decision');

  // Record decision
  const decision = await prisma.approvalDecision.create({
    data: {
      tenantId,
      requestId,
      stepInstanceId: currentStepInstance.id,
      decidedBy: data.decidedBy,
      decision: data.decision,
      ...(data.comment !== undefined && { comment: data.comment }),
      attachments: data.attachments || [],
    },
  });

  // Check if step is complete based on step type
  const stepComplete = await isStepComplete(currentStepInstance, data.decision);

  if (stepComplete) {
    await prisma.stepInstance.update({
      where: { id: currentStepInstance.id },
      data: {
        status: data.decision,
        completedAt: new Date(),
      },
    });

    if (data.decision === 'REJECTED') {
      // Request rejected
      await prisma.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          completedAt: new Date(),
        },
      });

      await addHistory(tenantId, requestId, 'rejected', data.decidedBy, {
        step: currentStepInstance.step.name,
        comment: data.comment,
      });
    } else {
      // Check for next step
      const nextStep = request.workflow.steps.find(
        (s: { order: number }) => s.order === currentStepInstance.step.order + 1
      );

      if (nextStep) {
        // Create next step instance
        const assignedTo = await resolveApprovers(tenantId, nextStep, request.entityData as any);

        await prisma.stepInstance.create({
          data: {
            tenantId,
            requestId,
            stepId: nextStep.id,
            assignedTo,
            dueAt: nextStep.timeoutHours
              ? new Date(Date.now() + nextStep.timeoutHours * 60 * 60 * 1000)
              : null,
          },
        });

        await prisma.approvalRequest.update({
          where: { id: requestId },
          data: { currentStepOrder: nextStep.order },
        });

        await addHistory(tenantId, requestId, 'step_completed', data.decidedBy, {
          step: currentStepInstance.step.name,
          nextStep: nextStep.name,
        });
      } else {
        // All steps complete - request approved
        await prisma.approvalRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            completedAt: new Date(),
          },
        });

        await addHistory(tenantId, requestId, 'approved', data.decidedBy, {
          step: currentStepInstance.step.name,
        });
      }
    }
  }

  return getRequest(tenantId, requestId);
}

export async function cancelRequest(tenantId: string, requestId: string, userId: string, reason?: string) {
  const request = await prisma.approvalRequest.findFirst({
    where: { id: requestId, tenantId, status: 'PENDING' },
  });

  if (!request) throw new Error('Pending request not found');
  if (request.requestedBy !== userId) throw new Error('Only requester can cancel');

  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
    },
  });

  await addHistory(tenantId, requestId, 'cancelled', userId, { reason });

  return getRequest(tenantId, requestId);
}

// Comments
export async function addComment(tenantId: string, requestId: string, data: {
  userId: string;
  content: string;
  attachments?: string[];
  isInternal?: boolean;
}) {
  const comment = await prisma.approvalComment.create({
    data: {
      tenantId,
      requestId,
      userId: data.userId,
      content: data.content,
      attachments: data.attachments || [],
      isInternal: data.isInternal || false,
    },
  });

  await addHistory(tenantId, requestId, 'comment_added', data.userId, {
    isInternal: data.isInternal,
  });

  return comment;
}

// Delegation
export async function createDelegation(tenantId: string, data: {
  fromUserId: string;
  toUserId: string;
  workflowIds?: string[];
  startDate: Date;
  endDate?: Date;
  reason?: string;
}) {
  return prisma.approvalDelegation.create({
    data: {
      tenantId,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      workflowIds: data.workflowIds || [],
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      reason: data.reason ?? null,
    },
  });
}

export async function revokeDelegation(tenantId: string, delegationId: string) {
  return prisma.approvalDelegation.update({
    where: { id: delegationId, tenantId },
    data: { isActive: false },
  });
}

export async function getDelegations(tenantId: string, userId: string) {
  return prisma.approvalDelegation.findMany({
    where: {
      tenantId,
      OR: [{ fromUserId: userId }, { toUserId: userId }],
      isActive: true,
    },
  });
}

// Escalation
export async function processEscalations(tenantId: string) {
  const overdueSteps = await prisma.stepInstance.findMany({
    where: {
      tenantId,
      status: 'PENDING',
      dueAt: { lte: new Date() },
      escalatedAt: null,
    },
    include: { step: true, request: true },
  });

  for (const stepInstance of overdueSteps) {
    const step = stepInstance.step;

    switch (step.escalationType) {
      case 'AUTO_APPROVE':
        await makeDecision(tenantId, stepInstance.requestId, {
          decision: 'APPROVED',
          comment: 'Auto-approved due to timeout',
          decidedBy: 'system',
        });
        break;

      case 'AUTO_REJECT':
        await makeDecision(tenantId, stepInstance.requestId, {
          decision: 'REJECTED',
          comment: 'Auto-rejected due to timeout',
          decidedBy: 'system',
        });
        break;

      case 'ESCALATE_UP':
        await prisma.stepInstance.update({
          where: { id: stepInstance.id },
          data: {
            assignedTo: step.escalateTo,
            escalatedAt: new Date(),
            dueAt: step.timeoutHours
              ? new Date(Date.now() + step.timeoutHours * 60 * 60 * 1000)
              : null,
          },
        });

        await addHistory(tenantId, stepInstance.requestId, 'escalated', 'system', {
          step: step.name,
          escalatedTo: step.escalateTo,
        });
        break;

      case 'NOTIFY_ONLY':
      default:
        await prisma.stepInstance.update({
          where: { id: stepInstance.id },
          data: { escalatedAt: new Date() },
        });
        // Send notification (would integrate with notification service)
        break;
    }
  }

  return overdueSteps.length;
}

// Analytics
export async function getStats(tenantId: string, startDate: Date, endDate: Date) {
  const requests = await prisma.approvalRequest.groupBy({
    by: ['status'],
    where: {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
    },
    _count: true,
  });

  const avgProcessingTime = await prisma.approvalRequest.aggregate({
    where: {
      tenantId,
      status: { in: ['APPROVED', 'REJECTED'] },
      completedAt: { not: null },
      createdAt: { gte: startDate, lte: endDate },
    },
    _avg: {
      // Would need a computed field for duration
    },
  });

  return {
    byStatus: requests.map((r: { status: string; _count: number }) => ({ status: r.status, count: r._count })),
    total: requests.reduce((sum: number, r: { _count: number }) => sum + r._count, 0),
  };
}

// Helper functions
async function resolveApprovers(
  tenantId: string,
  step: any,
  entityData?: Record<string, any>
): Promise<string[]> {
  if (step.approverType === 'user') {
    return step.approverIds;
  }

  if (step.approverType === 'dynamic' && step.approverExpression) {
    // Evaluate dynamic expression (simplified)
    // In real impl, would use expression engine
    return step.approverIds;
  }

  // For role/group, would look up members
  return step.approverIds;
}

async function canUserDecide(tenantId: string, userId: string, assignedTo: string[]): Promise<boolean> {
  if (assignedTo.includes(userId)) return true;

  // Check delegations
  const delegation = await prisma.approvalDelegation.findFirst({
    where: {
      tenantId,
      toUserId: userId,
      fromUserId: { in: assignedTo },
      isActive: true,
      startDate: { lte: new Date() },
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
  });

  return !!delegation;
}

async function isStepComplete(stepInstance: any, latestDecision: ApprovalStatus): Promise<boolean> {
  const step = stepInstance.step;

  switch (step.type) {
    case 'SINGLE_APPROVER':
      return true;

    case 'ANY_OF':
      return true; // Any decision completes the step

    case 'ALL_OF':
      const allDecisions = await prisma.approvalDecision.count({
        where: { stepInstanceId: stepInstance.id },
      });
      return allDecisions >= stepInstance.assignedTo.length;

    case 'QUORUM':
      const approvals = await prisma.approvalDecision.count({
        where: { stepInstanceId: stepInstance.id, decision: 'APPROVED' },
      });
      return approvals >= (step.quorumCount || 1);

    default:
      return true;
  }
}

async function addHistory(tenantId: string, requestId: string, action: string, actor: string, details?: any) {
  return prisma.approvalHistory.create({
    data: { tenantId, requestId, action, actor, details },
  });
}
