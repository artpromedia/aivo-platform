import { prisma, WorkflowStatus, ExecutionStatus, StepType, TriggerType, Prisma } from '../prisma.js';

// Workflow Management
export async function createWorkflow(tenantId: string, data: {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  variables?: Record<string, any>;
  timeout?: number;
  retryPolicy?: Record<string, any>;
  createdBy: string;
}) {
  return prisma.workflow.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags || [],
      inputSchema: data.inputSchema,
      outputSchema: data.outputSchema,
      variables: data.variables,
      timeout: data.timeout,
      retryPolicy: data.retryPolicy,
      createdBy: data.createdBy,
      status: 'DRAFT',
    },
    include: { steps: true, triggers: true },
  });
}

export async function getWorkflow(tenantId: string, workflowId: string) {
  return prisma.workflow.findFirst({
    where: { id: workflowId, tenantId },
    include: {
      steps: { orderBy: { order: 'asc' } },
      triggers: true,
    },
  });
}

export async function listWorkflows(tenantId: string, filters?: {
  status?: WorkflowStatus;
  category?: string;
  tags?: string[];
}) {
  return prisma.workflow.findMany({
    where: {
      tenantId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.tags && { tags: { hasSome: filters.tags } }),
    },
    include: { steps: true, triggers: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function updateWorkflow(tenantId: string, workflowId: string, data: {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  variables?: Record<string, any>;
  timeout?: number;
  retryPolicy?: Record<string, any>;
  updatedBy: string;
}) {
  return prisma.workflow.update({
    where: { id: workflowId, tenantId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    include: { steps: true, triggers: true },
  });
}

export async function publishWorkflow(tenantId: string, workflowId: string, userId: string) {
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, tenantId },
    include: { steps: true },
  });

  if (!workflow) throw new Error('Workflow not found');
  if (workflow.steps.length === 0) throw new Error('Workflow must have at least one step');

  // Create version snapshot
  await prisma.workflowVersion.create({
    data: {
      tenantId,
      workflowId,
      version: workflow.version,
      definition: workflow as any,
      createdBy: userId,
    },
  });

  return prisma.workflow.update({
    where: { id: workflowId },
    data: {
      status: 'ACTIVE',
      publishedAt: new Date(),
      version: { increment: 1 },
    },
  });
}

export async function deleteWorkflow(tenantId: string, workflowId: string) {
  return prisma.workflow.delete({
    where: { id: workflowId, tenantId },
  });
}

// Step Management
export async function addStep(tenantId: string, workflowId: string, data: {
  name: string;
  type: StepType;
  order: number;
  config: Record<string, any>;
  inputMapping?: Record<string, any>;
  outputMapping?: Record<string, any>;
  condition?: string;
  onSuccess?: string;
  onFailure?: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  isParallel?: boolean;
  parallelGroup?: string;
}) {
  return prisma.workflowStep.create({
    data: {
      tenantId,
      workflowId,
      name: data.name,
      type: data.type,
      order: data.order,
      config: data.config,
      inputMapping: data.inputMapping,
      outputMapping: data.outputMapping,
      condition: data.condition,
      onSuccess: data.onSuccess,
      onFailure: data.onFailure,
      timeout: data.timeout,
      retryCount: data.retryCount || 0,
      retryDelay: data.retryDelay || 1000,
      isParallel: data.isParallel || false,
      parallelGroup: data.parallelGroup,
    },
  });
}

export async function updateStep(tenantId: string, stepId: string, data: Partial<{
  name: string;
  type: StepType;
  order: number;
  config: Record<string, any>;
  inputMapping: Record<string, any>;
  outputMapping: Record<string, any>;
  condition: string;
  onSuccess: string;
  onFailure: string;
  timeout: number;
  retryCount: number;
  retryDelay: number;
}>) {
  return prisma.workflowStep.update({
    where: { id: stepId, tenantId },
    data,
  });
}

export async function deleteStep(tenantId: string, stepId: string) {
  return prisma.workflowStep.delete({
    where: { id: stepId, tenantId },
  });
}

export async function reorderSteps(tenantId: string, workflowId: string, stepOrders: Array<{ id: string; order: number }>) {
  const updates = stepOrders.map(({ id, order }) =>
    prisma.workflowStep.update({
      where: { id, tenantId },
      data: { order },
    })
  );
  return Promise.all(updates);
}

// Trigger Management
export async function addTrigger(tenantId: string, workflowId: string, data: {
  type: TriggerType;
  name: string;
  config: Record<string, any>;
}) {
  const trigger = await prisma.workflowTrigger.create({
    data: {
      tenantId,
      workflowId,
      type: data.type,
      name: data.name,
      config: data.config,
    },
  });

  // Handle scheduled triggers
  if (data.type === 'SCHEDULED' && data.config.cronExpr) {
    await prisma.scheduledJob.create({
      data: {
        tenantId,
        workflowId,
        triggerId: trigger.id,
        cronExpr: data.config.cronExpr,
        timezone: data.config.timezone || 'UTC',
        nextRunAt: calculateNextRun(data.config.cronExpr, data.config.timezone),
      },
    });
  }

  // Handle webhook triggers
  if (data.type === 'WEBHOOK') {
    const endpoint = `/webhooks/${workflowId}/${trigger.id}`;
    const secret = generateSecret();
    await prisma.webhookRegistry.create({
      data: {
        tenantId,
        workflowId,
        triggerId: trigger.id,
        endpoint,
        secret,
      },
    });
  }

  return trigger;
}

export async function removeTrigger(tenantId: string, triggerId: string) {
  await prisma.scheduledJob.deleteMany({ where: { triggerId } });
  await prisma.webhookRegistry.deleteMany({ where: { triggerId } });
  return prisma.workflowTrigger.delete({
    where: { id: triggerId, tenantId },
  });
}

// Execution Management
export async function startExecution(tenantId: string, workflowId: string, data: {
  triggeredBy: string;
  triggerType: TriggerType;
  input?: Record<string, any>;
  correlationId?: string;
  priority?: number;
}) {
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, tenantId, status: 'ACTIVE' },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  if (!workflow) throw new Error('Active workflow not found');

  const execution = await prisma.workflowExecution.create({
    data: {
      tenantId,
      workflowId,
      workflowVersion: workflow.version,
      triggeredBy: data.triggeredBy,
      triggerType: data.triggerType,
      input: data.input,
      variables: workflow.variables,
      status: 'PENDING',
      correlationId: data.correlationId,
      priority: data.priority || 0,
    },
  });

  // Queue the first step
  if (workflow.steps.length > 0) {
    const firstStep = workflow.steps[0];
    await queueStep(tenantId, execution.id, firstStep.id, data.input);
  }

  return execution;
}

export async function getExecution(tenantId: string, executionId: string) {
  return prisma.workflowExecution.findFirst({
    where: { id: executionId, tenantId },
    include: {
      workflow: true,
      stepExecutions: {
        include: { step: true },
        orderBy: { createdAt: 'asc' },
      },
      logs: { orderBy: { timestamp: 'asc' } },
    },
  });
}

export async function listExecutions(tenantId: string, filters?: {
  workflowId?: string;
  status?: ExecutionStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  return prisma.workflowExecution.findMany({
    where: {
      tenantId,
      ...(filters?.workflowId && { workflowId: filters.workflowId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.startDate && { startedAt: { gte: filters.startDate } }),
      ...(filters?.endDate && { startedAt: { lte: filters.endDate } }),
    },
    include: { workflow: true },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 50,
  });
}

export async function cancelExecution(tenantId: string, executionId: string) {
  return prisma.workflowExecution.update({
    where: { id: executionId, tenantId },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
    },
  });
}

export async function pauseExecution(tenantId: string, executionId: string) {
  return prisma.workflowExecution.update({
    where: { id: executionId, tenantId },
    data: { status: 'PAUSED' },
  });
}

export async function resumeExecution(tenantId: string, executionId: string) {
  const execution = await prisma.workflowExecution.findFirst({
    where: { id: executionId, tenantId, status: 'PAUSED' },
  });

  if (!execution) throw new Error('Paused execution not found');

  return prisma.workflowExecution.update({
    where: { id: executionId },
    data: { status: 'RUNNING' },
  });
}

// Step Execution
async function queueStep(tenantId: string, executionId: string, stepId: string, input?: Record<string, any>) {
  await prisma.taskQueue.create({
    data: {
      tenantId,
      name: 'step-execution',
      executionId,
      stepId,
      payload: { input },
    },
  });
}

export async function processStep(tenantId: string, executionId: string, stepId: string) {
  const step = await prisma.workflowStep.findFirst({
    where: { id: stepId, tenantId },
  });

  if (!step) throw new Error('Step not found');

  const stepExecution = await prisma.stepExecution.create({
    data: {
      tenantId,
      executionId,
      stepId,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: { currentStep: stepId, status: 'RUNNING', startedAt: new Date() },
  });

  try {
    const result = await executeStep(step);

    await prisma.stepExecution.update({
      where: { id: stepExecution.id },
      data: {
        status: 'COMPLETED',
        output: result,
        completedAt: new Date(),
        duration: Date.now() - stepExecution.startedAt!.getTime(),
      },
    });

    // Proceed to next step
    if (step.onSuccess) {
      await queueStep(tenantId, executionId, step.onSuccess, result);
    } else {
      await completeExecution(tenantId, executionId, result);
    }

    return result;
  } catch (error: any) {
    const canRetry = stepExecution.attempt < step.retryCount;

    if (canRetry) {
      await prisma.stepExecution.update({
        where: { id: stepExecution.id },
        data: { status: 'PENDING', attempt: { increment: 1 } },
      });
      // Re-queue with delay
      await prisma.taskQueue.create({
        data: {
          tenantId,
          name: 'step-execution',
          executionId,
          stepId,
          payload: {},
          scheduledFor: new Date(Date.now() + step.retryDelay),
        },
      });
    } else {
      await prisma.stepExecution.update({
        where: { id: stepExecution.id },
        data: {
          status: 'FAILED',
          error: error.message,
          completedAt: new Date(),
        },
      });

      if (step.onFailure) {
        await queueStep(tenantId, executionId, step.onFailure);
      } else {
        await failExecution(tenantId, executionId, error.message);
      }
    }

    throw error;
  }
}

async function executeStep(step: any): Promise<any> {
  const config = step.config as Record<string, any>;

  switch (step.type) {
    case 'TASK':
      return { completed: true, task: config.taskName };
    case 'HTTP_CALL':
      // In real impl, would make HTTP call
      return { status: 200, body: {} };
    case 'SCRIPT':
      // In real impl, would execute script
      return { result: 'script executed' };
    case 'NOTIFICATION':
      return { sent: true };
    case 'WAIT':
      await new Promise(resolve => setTimeout(resolve, config.duration || 1000));
      return { waited: true };
    default:
      return { executed: true };
  }
}

async function completeExecution(tenantId: string, executionId: string, output: any) {
  const execution = await prisma.workflowExecution.findFirst({
    where: { id: executionId },
  });

  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: 'COMPLETED',
      output,
      completedAt: new Date(),
      duration: execution?.startedAt ? Date.now() - execution.startedAt.getTime() : null,
    },
  });
}

async function failExecution(tenantId: string, executionId: string, error: string) {
  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: 'FAILED',
      error,
      completedAt: new Date(),
    },
  });
}

// Approval Management
export async function createApprovalRequest(tenantId: string, data: {
  executionId: string;
  stepId: string;
  title: string;
  description?: string;
  requestedBy: string;
  assignedTo: string[];
  expiresAt?: Date;
  metadata?: Record<string, any>;
}) {
  return prisma.approvalRequest.create({
    data: {
      tenantId,
      executionId: data.executionId,
      stepId: data.stepId,
      title: data.title,
      description: data.description ?? null,
      requestedBy: data.requestedBy,
      assignedTo: data.assignedTo,
      expiresAt: data.expiresAt,
      metadata: data.metadata,
    },
  });
}

export async function handleApproval(tenantId: string, approvalId: string, data: {
  decision: 'approved' | 'rejected';
  decidedBy: string;
}) {
  const approval = await prisma.approvalRequest.update({
    where: { id: approvalId, tenantId },
    data: {
      status: data.decision,
      decision: data.decision,
      decidedBy: data.decidedBy,
      decidedAt: new Date(),
    },
  });

  // Resume execution based on decision
  if (data.decision === 'approved') {
    const step = await prisma.workflowStep.findFirst({
      where: { id: approval.stepId },
    });
    if (step?.onSuccess) {
      await queueStep(tenantId, approval.executionId, step.onSuccess);
    }
  } else {
    const step = await prisma.workflowStep.findFirst({
      where: { id: approval.stepId },
    });
    if (step?.onFailure) {
      await queueStep(tenantId, approval.executionId, step.onFailure);
    } else {
      await failExecution(tenantId, approval.executionId, 'Approval rejected');
    }
  }

  return approval;
}

export async function getPendingApprovals(tenantId: string, userId: string) {
  return prisma.approvalRequest.findMany({
    where: {
      tenantId,
      status: 'pending',
      assignedTo: { has: userId },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// Execution Logs
export async function addLog(tenantId: string, executionId: string, data: {
  stepId?: string;
  level: string;
  message: string;
  data?: Record<string, any>;
}) {
  return prisma.executionLog.create({
    data: {
      tenantId,
      executionId,
      stepId: data.stepId ?? null,
      level: data.level,
      message: data.message,
      data: data.data ?? Prisma.JsonNull,
    },
  });
}

// Analytics
export async function getWorkflowStats(tenantId: string, workflowId: string, startDate: Date, endDate: Date) {
  const executions = await prisma.workflowExecution.groupBy({
    by: ['status'],
    where: {
      tenantId,
      workflowId,
      createdAt: { gte: startDate, lte: endDate },
    },
    _count: true,
    _avg: { duration: true },
  });

  const total = executions.reduce((sum, e) => sum + e._count, 0);
  const completed = executions.find(e => e.status === 'COMPLETED')?._count || 0;
  const failed = executions.find(e => e.status === 'FAILED')?._count || 0;

  return {
    total,
    completed,
    failed,
    successRate: total > 0 ? (completed / total) * 100 : 0,
    averageDuration: executions.find(e => e.status === 'COMPLETED')?._avg.duration || 0,
    byStatus: executions.map(e => ({ status: e.status, count: e._count })),
  };
}

// Helper functions
function calculateNextRun(cronExpr: string, timezone?: string): Date {
  // Simplified - real impl would use cron parser
  return new Date(Date.now() + 60000);
}

function generateSecret(): string {
  return Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join('');
}
