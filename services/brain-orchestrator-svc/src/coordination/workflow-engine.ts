import type {
  LearningWorkflow,
  WorkflowStep,
  WorkflowContext,
  WorkflowResult,
  WorkflowStatus,
  WorkflowHistoryEntry,
} from '../types/index.js';
import { prisma } from '../prisma.js';
import { ServiceCoordinator } from './service-coordinator.js';
import { v4 as uuidv4 } from 'uuid';

interface WorkflowExecution {
  id: string;
  workflow: LearningWorkflow;
  context: WorkflowContext;
  status: WorkflowStatus;
  currentStepId?: string;
  startedAt: Date;
  completedAt?: Date;
}

export class WorkflowEngine {
  private activeWorkflows: Map<string, WorkflowExecution> = new Map();
  private coordinator: ServiceCoordinator;

  constructor(coordinator: ServiceCoordinator) {
    this.coordinator = coordinator;
  }

  /**
   * Execute a learning workflow
   */
  async executeWorkflow(
    workflow: LearningWorkflow,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    const executionId = uuidv4();

    const execution: WorkflowExecution = {
      id: executionId,
      workflow,
      context: {
        ...context,
        history: [],
      },
      status: 'running',
      startedAt: new Date(),
    };

    this.activeWorkflows.set(executionId, execution);

    // Save workflow execution to database
    await this.saveExecution(execution);

    try {
      // Find starting step (first step in the list)
      const startStep = workflow.steps[0];
      if (!startStep) {
        throw new Error('Workflow has no steps');
      }

      // Execute steps
      const result = await this.executeSteps(execution, startStep.id);

      return result;
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();

      await this.saveExecution(execution);

      return {
        workflowId: workflow.id,
        status: 'failed',
        completedSteps: execution.context.history
          .filter((h) => h.status === 'completed')
          .map((h) => h.stepId),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Pause a running workflow
   */
  async pauseWorkflow(workflowId: string): Promise<void> {
    const execution = this.findExecutionByWorkflowId(workflowId);
    if (!execution) {
      throw new Error(`Workflow execution not found: ${workflowId}`);
    }

    if (execution.status !== 'running') {
      throw new Error(`Cannot pause workflow in status: ${execution.status}`);
    }

    execution.status = 'paused';
    await this.saveExecution(execution);
  }

  /**
   * Resume a paused workflow
   */
  async resumeWorkflow(workflowId: string): Promise<WorkflowResult> {
    const execution = this.findExecutionByWorkflowId(workflowId);
    if (!execution) {
      throw new Error(`Workflow execution not found: ${workflowId}`);
    }

    if (execution.status !== 'paused') {
      throw new Error(`Cannot resume workflow in status: ${execution.status}`);
    }

    execution.status = 'running';

    // Find the next step to execute
    const lastCompletedStep = execution.context.history
      .filter((h) => h.status === 'completed')
      .pop();

    if (!lastCompletedStep) {
      // Resume from the beginning
      const startStep = execution.workflow.steps[0];
      return this.executeSteps(execution, startStep.id);
    }

    // Find the step definition
    const stepDef = execution.workflow.steps.find((s) => s.id === lastCompletedStep.stepId);
    if (!stepDef || stepDef.nextSteps.length === 0) {
      // Workflow was at the end
      execution.status = 'completed';
      execution.completedAt = new Date();
      await this.saveExecution(execution);

      return {
        workflowId: execution.workflow.id,
        status: 'completed',
        completedSteps: execution.context.history
          .filter((h) => h.status === 'completed')
          .map((h) => h.stepId),
        result: execution.context.variables,
      };
    }

    // Continue from next step
    return this.executeSteps(execution, stepDef.nextSteps[0]);
  }

  /**
   * Rollback workflow to a specific step
   */
  async rollbackToStep(workflowId: string, stepId: string): Promise<void> {
    const execution = this.findExecutionByWorkflowId(workflowId);
    if (!execution) {
      throw new Error(`Workflow execution not found: ${workflowId}`);
    }

    // Find the step index in history
    const stepIndex = execution.context.history.findIndex((h) => h.stepId === stepId);
    if (stepIndex === -1) {
      throw new Error(`Step ${stepId} not found in workflow history`);
    }

    // Remove all steps after the target step
    execution.context.history = execution.context.history.slice(0, stepIndex);

    // Mark any steps that need rollback
    const rolledBackSteps = execution.context.history
      .slice(stepIndex)
      .map((h) => h.stepId);

    // Update status
    execution.status = 'rolled_back';
    execution.currentStepId = stepId;

    await this.saveExecution(execution);

    // Execute rollback actions if defined
    for (const rolledBackStepId of rolledBackSteps) {
      const step = execution.workflow.steps.find((s) => s.id === rolledBackStepId);
      if (step?.config.rollbackAction) {
        await this.executeRollbackAction(execution, step);
      }
    }
  }

  /**
   * Get current workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowResult | null> {
    const execution = this.findExecutionByWorkflowId(workflowId);
    if (!execution) {
      // Try to load from database
      const dbExecution = await prisma.workflowExecution.findFirst({
        where: { workflowId },
        orderBy: { startedAt: 'desc' },
      });

      if (!dbExecution) return null;

      return {
        workflowId,
        status: dbExecution.status as WorkflowStatus,
        completedSteps: (dbExecution.completedSteps as string[]) ?? [],
        currentStep: dbExecution.currentStepId ?? undefined,
        result: dbExecution.result as Record<string, unknown> | undefined,
      };
    }

    return {
      workflowId: execution.workflow.id,
      status: execution.status,
      completedSteps: execution.context.history
        .filter((h) => h.status === 'completed')
        .map((h) => h.stepId),
      currentStep: execution.currentStepId,
      result: execution.context.variables,
    };
  }

  // ========== Private Helper Methods ==========

  private async executeSteps(
    execution: WorkflowExecution,
    startStepId: string
  ): Promise<WorkflowResult> {
    let currentStepId: string | undefined = startStepId;

    while (currentStepId && execution.status === 'running') {
      const step = execution.workflow.steps.find((s) => s.id === currentStepId);
      if (!step) {
        throw new Error(`Step not found: ${currentStepId}`);
      }

      execution.currentStepId = currentStepId;

      // Execute the step
      const stepResult = await this.executeStep(execution, step);

      // Record in history
      execution.context.history.push({
        stepId: step.id,
        status: stepResult.success ? 'completed' : 'failed',
        timestamp: new Date(),
        data: stepResult.data,
      });

      if (!stepResult.success) {
        // Check for fallback
        if (step.fallbackStep) {
          currentStepId = step.fallbackStep;
          continue;
        }

        // Workflow failed
        execution.status = 'failed';
        execution.completedAt = new Date();
        await this.saveExecution(execution);

        return {
          workflowId: execution.workflow.id,
          status: 'failed',
          completedSteps: execution.context.history
            .filter((h) => h.status === 'completed')
            .map((h) => h.stepId),
          currentStep: currentStepId,
          error: stepResult.error,
        };
      }

      // Determine next step
      currentStepId = this.determineNextStep(execution, step, stepResult);

      // Save progress
      await this.saveExecution(execution);
    }

    // Workflow completed
    execution.status = 'completed';
    execution.completedAt = new Date();
    await this.saveExecution(execution);

    return {
      workflowId: execution.workflow.id,
      status: 'completed',
      completedSteps: execution.context.history
        .filter((h) => h.status === 'completed')
        .map((h) => h.stepId),
      result: execution.context.variables,
    };
  }

  private async executeStep(
    execution: WorkflowExecution,
    step: WorkflowStep
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    switch (step.type) {
      case 'task':
        return this.executeTaskStep(execution, step);

      case 'decision':
        return this.executeDecisionStep(execution, step);

      case 'parallel':
        return this.executeParallelStep(execution, step);

      case 'wait':
        return this.executeWaitStep(execution, step);

      case 'notification':
        return this.executeNotificationStep(execution, step);

      default:
        return { success: false, error: `Unknown step type: ${step.type}` };
    }
  }

  private async executeTaskStep(
    execution: WorkflowExecution,
    step: WorkflowStep
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    const config = step.config as {
      service: string;
      action: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      path: string;
      payload?: Record<string, unknown>;
    };

    try {
      const response = await this.coordinator.delegateToService(config.service, {
        name: config.action,
        method: config.method,
        path: this.interpolateVariables(config.path, execution.context.variables),
        payload: config.payload
          ? this.interpolateObject(config.payload, execution.context.variables)
          : undefined,
      });

      if (response.success) {
        // Store result in context variables
        const outputVar = step.config.outputVariable as string | undefined;
        if (outputVar && response.data) {
          execution.context.variables[outputVar] = response.data;
        }
      }

      return {
        success: response.success,
        data: response.data,
        error: response.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Task execution failed',
      };
    }
  }

  private async executeDecisionStep(
    execution: WorkflowExecution,
    step: WorkflowStep
  ): Promise<{ success: boolean; data?: Record<string, unknown> }> {
    const config = step.config as {
      condition: string;
      variable: string;
    };

    // Evaluate condition
    const variableValue = execution.context.variables[config.variable];
    const conditionMet = this.evaluateCondition(config.condition, variableValue);

    return {
      success: true,
      data: { conditionMet, evaluatedValue: variableValue },
    };
  }

  private async executeParallelStep(
    execution: WorkflowExecution,
    step: WorkflowStep
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    const config = step.config as {
      parallelSteps: string[];
      waitForAll: boolean;
    };

    const parallelResults = await Promise.all(
      config.parallelSteps.map(async (parallelStepId) => {
        const parallelStep = execution.workflow.steps.find((s) => s.id === parallelStepId);
        if (!parallelStep) {
          return { stepId: parallelStepId, success: false, error: 'Step not found' };
        }

        const result = await this.executeStep(execution, parallelStep);
        return { stepId: parallelStepId, ...result };
      })
    );

    const allSucceeded = parallelResults.every((r) => r.success);
    const anySucceeded = parallelResults.some((r) => r.success);

    const success = config.waitForAll ? allSucceeded : anySucceeded;

    return {
      success,
      data: { parallelResults },
      error: success ? undefined : 'Some parallel steps failed',
    };
  }

  private async executeWaitStep(
    execution: WorkflowExecution,
    step: WorkflowStep
  ): Promise<{ success: boolean; data?: Record<string, unknown> }> {
    const config = step.config as {
      waitType: 'time' | 'event' | 'condition';
      duration?: number;
      eventName?: string;
      condition?: string;
    };

    switch (config.waitType) {
      case 'time':
        if (config.duration) {
          await new Promise((resolve) => setTimeout(resolve, config.duration! * 1000));
        }
        return { success: true, data: { waited: config.duration } };

      case 'event':
        // In a real implementation, this would wait for an event
        // For now, we'll just mark it as successful
        return { success: true, data: { waitedFor: config.eventName } };

      case 'condition':
        // Check condition periodically
        // For now, just evaluate once
        if (config.condition) {
          const met = this.evaluateCondition(config.condition, execution.context.variables);
          return { success: met, data: { conditionMet: met } };
        }
        return { success: true };

      default:
        return { success: true };
    }
  }

  private async executeNotificationStep(
    execution: WorkflowExecution,
    step: WorkflowStep
  ): Promise<{ success: boolean; data?: Record<string, unknown> }> {
    const config = step.config as {
      notificationType: 'email' | 'push' | 'in_app' | 'event';
      recipient?: string;
      message: string;
      eventName?: string;
    };

    try {
      if (config.notificationType === 'event') {
        await this.coordinator.publishEvent(config.eventName ?? 'workflow.notification', {
          workflowId: execution.workflow.id,
          stepId: step.id,
          learnerId: execution.context.learnerId,
          message: this.interpolateVariables(config.message, execution.context.variables),
        });
      }

      // Other notification types would be handled by a notification service
      return { success: true, data: { notified: true } };
    } catch (error) {
      return {
        success: false,
        data: { error: error instanceof Error ? error.message : 'Notification failed' },
      };
    }
  }

  private async executeRollbackAction(
    execution: WorkflowExecution,
    step: WorkflowStep
  ): Promise<void> {
    const rollbackConfig = step.config.rollbackAction as {
      service: string;
      action: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      path: string;
    } | undefined;

    if (!rollbackConfig) return;

    await this.coordinator.delegateToService(rollbackConfig.service, {
      name: rollbackConfig.action,
      method: rollbackConfig.method,
      path: this.interpolateVariables(rollbackConfig.path, execution.context.variables),
    });
  }

  private determineNextStep(
    execution: WorkflowExecution,
    currentStep: WorkflowStep,
    stepResult: { success: boolean; data?: Record<string, unknown> }
  ): string | undefined {
    if (currentStep.nextSteps.length === 0) {
      return undefined;
    }

    // For decision steps, choose based on condition result
    if (currentStep.type === 'decision' && stepResult.data?.conditionMet !== undefined) {
      const conditionMet = stepResult.data.conditionMet as boolean;
      // First next step is for true, second is for false
      return conditionMet ? currentStep.nextSteps[0] : currentStep.nextSteps[1];
    }

    // Default to first next step
    return currentStep.nextSteps[0];
  }

  private evaluateCondition(condition: string, value: unknown): boolean {
    // Simple condition evaluation
    // Format: "operator:value" e.g., "gt:50", "eq:true", "contains:error"
    const [operator, compareValue] = condition.split(':');

    switch (operator) {
      case 'eq':
        return String(value) === compareValue;
      case 'ne':
        return String(value) !== compareValue;
      case 'gt':
        return Number(value) > Number(compareValue);
      case 'gte':
        return Number(value) >= Number(compareValue);
      case 'lt':
        return Number(value) < Number(compareValue);
      case 'lte':
        return Number(value) <= Number(compareValue);
      case 'contains':
        return String(value).includes(compareValue);
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return Boolean(value);
    }
  }

  private interpolateVariables(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(variables[key] ?? ''));
  }

  private interpolateObject(
    obj: Record<string, unknown>,
    variables: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.interpolateVariables(value, variables);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateObject(value as Record<string, unknown>, variables);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private findExecutionByWorkflowId(workflowId: string): WorkflowExecution | undefined {
    for (const execution of this.activeWorkflows.values()) {
      if (execution.workflow.id === workflowId) {
        return execution;
      }
    }
    return undefined;
  }

  private async saveExecution(execution: WorkflowExecution): Promise<void> {
    await prisma.workflowExecution.upsert({
      where: { id: execution.id },
      update: {
        status: execution.status,
        currentStepId: execution.currentStepId,
        completedSteps: execution.context.history
          .filter((h) => h.status === 'completed')
          .map((h) => h.stepId),
        variables: execution.context.variables,
        completedAt: execution.completedAt,
      },
      create: {
        id: execution.id,
        workflowId: execution.workflow.id,
        learnerId: execution.context.learnerId,
        tenantId: execution.context.tenantId,
        status: execution.status,
        currentStepId: execution.currentStepId,
        completedSteps: [],
        variables: execution.context.variables,
        startedAt: execution.startedAt,
      },
    });
  }
}
