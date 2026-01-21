/**
 * Orchestrator Service Unit Tests
 * Tests for workflow execution, step processing, and trigger handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK TYPES
// ══════════════════════════════════════════════════════════════════════════════

type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type StepType = 'ACTION' | 'CONDITION' | 'LOOP' | 'PARALLEL' | 'WAIT' | 'HUMAN_TASK';
type TriggerType = 'EVENT' | 'SCHEDULE' | 'WEBHOOK' | 'MANUAL';

interface MockWorkflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  category?: string;
  tags: string[];
  version: number;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  timeout?: number;
  retryPolicy?: { maxRetries: number; backoffMultiplier: number };
  steps: MockStep[];
  triggers: MockTrigger[];
  createdBy: string;
}

interface MockStep {
  id: string;
  workflowId: string;
  name: string;
  order: number;
  type: StepType;
  config: Record<string, unknown>;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
  condition?: string;
  onError?: 'FAIL' | 'CONTINUE' | 'RETRY';
  timeout?: number;
  retryCount?: number;
}

interface MockTrigger {
  id: string;
  workflowId: string;
  name: string;
  type: TriggerType;
  config: Record<string, unknown>;
  isActive: boolean;
}

interface MockExecution {
  id: string;
  tenantId: string;
  workflowId: string;
  workflowVersion: number;
  status: ExecutionStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  currentStepIndex: number;
  stepResults: Record<string, unknown>[];
  startedAt: Date;
  completedAt?: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK PRISMA
// ══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  workflow: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  workflowStep: {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  workflowTrigger: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  workflowExecution: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  workflowVersion: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  stepExecution: {
    create: vi.fn(),
    update: vi.fn(),
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function createMockWorkflow(overrides: Partial<MockWorkflow> = {}): MockWorkflow {
  return {
    id: 'wf-001',
    tenantId: 'tenant-001',
    name: 'Student Onboarding',
    status: 'DRAFT',
    tags: ['onboarding', 'student'],
    version: 1,
    steps: [],
    triggers: [],
    createdBy: 'user-001',
    ...overrides,
  };
}

function createMockStep(overrides: Partial<MockStep> = {}): MockStep {
  return {
    id: 'step-001',
    workflowId: 'wf-001',
    name: 'Send Welcome Email',
    order: 1,
    type: 'ACTION',
    config: { action: 'send_email', template: 'welcome' },
    onError: 'FAIL',
    ...overrides,
  };
}

function createMockTrigger(overrides: Partial<MockTrigger> = {}): MockTrigger {
  return {
    id: 'trigger-001',
    workflowId: 'wf-001',
    name: 'On Student Created',
    type: 'EVENT',
    config: { eventType: 'student.created' },
    isActive: true,
    ...overrides,
  };
}

function createMockExecution(overrides: Partial<MockExecution> = {}): MockExecution {
  return {
    id: 'exec-001',
    tenantId: 'tenant-001',
    workflowId: 'wf-001',
    workflowVersion: 1,
    status: 'PENDING',
    currentStepIndex: 0,
    stepResults: [],
    startedAt: new Date(),
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR SERVICE LOGIC
// ══════════════════════════════════════════════════════════════════════════════

class OrchestratorService {
  constructor(private prisma: typeof mockPrisma) {}

  async createWorkflow(tenantId: string, data: {
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
    createdBy: string;
  }): Promise<MockWorkflow> {
    return this.prisma.workflow.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        category: data.category,
        tags: data.tags || [],
        createdBy: data.createdBy,
        status: 'DRAFT',
        version: 1,
      },
      include: { steps: true, triggers: true },
    }) as Promise<MockWorkflow>;
  }

  async publishWorkflow(tenantId: string, workflowId: string): Promise<MockWorkflow> {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, tenantId },
      include: { steps: true },
    }) as MockWorkflow | null;

    if (!workflow) throw new Error('Workflow not found');
    if (workflow.steps.length === 0) throw new Error('Workflow must have at least one step');

    // Create version snapshot
    await this.prisma.workflowVersion.create({
      data: {
        tenantId,
        workflowId,
        version: workflow.version,
        definition: workflow,
      },
    });

    return this.prisma.workflow.update({
      where: { id: workflowId },
      data: { status: 'ACTIVE' },
    }) as Promise<MockWorkflow>;
  }

  async startExecution(tenantId: string, workflowId: string, input?: Record<string, unknown>): Promise<MockExecution> {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, tenantId, status: 'ACTIVE' },
      include: { steps: { orderBy: { order: 'asc' } } },
    }) as MockWorkflow | null;

    if (!workflow) throw new Error('Active workflow not found');

    // Validate input against schema if provided
    if (workflow.inputSchema && input) {
      this.validateInput(workflow.inputSchema, input);
    }

    return this.prisma.workflowExecution.create({
      data: {
        tenantId,
        workflowId,
        workflowVersion: workflow.version,
        status: 'PENDING',
        input,
        currentStepIndex: 0,
        stepResults: [],
        startedAt: new Date(),
      },
    }) as Promise<MockExecution>;
  }

  async executeStep(execution: MockExecution, step: MockStep): Promise<{
    success: boolean;
    output?: Record<string, unknown>;
    error?: string;
  }> {
    // Validate step type and config
    if (!step.config) {
      return { success: false, error: 'Step has no configuration' };
    }

    try {
      switch (step.type) {
        case 'ACTION':
          return await this.executeActionStep(step);
        case 'CONDITION':
          return await this.executeConditionStep(step, execution);
        case 'WAIT':
          return await this.executeWaitStep(step);
        case 'PARALLEL':
          return await this.executeParallelStep(step, execution);
        default:
          return { success: true, output: {} };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle step error policy
      if (step.onError === 'CONTINUE') {
        return { success: true, output: {}, error: errorMessage };
      }
      
      return { success: false, error: errorMessage };
    }
  }

  private async executeActionStep(step: MockStep): Promise<{ success: boolean; output?: Record<string, unknown> }> {
    // Simulated action execution
    return { success: true, output: { actionResult: 'completed', stepId: step.id } };
  }

  private async executeConditionStep(step: MockStep, execution: MockExecution): Promise<{ success: boolean; output?: Record<string, unknown> }> {
    const condition = step.condition || 'true';
    // Simple condition evaluation (in real impl would use expression parser)
    const result = condition === 'true';
    return { success: true, output: { conditionResult: result } };
  }

  private async executeWaitStep(step: MockStep): Promise<{ success: boolean; output?: Record<string, unknown> }> {
    const waitTime = (step.config.waitMs as number) || 0;
    // In real impl would schedule continuation
    return { success: true, output: { waitedMs: waitTime } };
  }

  private async executeParallelStep(step: MockStep, execution: MockExecution): Promise<{ success: boolean; output?: Record<string, unknown> }> {
    const branches = (step.config.branches as string[]) || [];
    // In real impl would fork execution
    return { success: true, output: { branchCount: branches.length } };
  }

  async completeExecution(executionId: string, output?: Record<string, unknown>): Promise<MockExecution> {
    return this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        output,
        completedAt: new Date(),
      },
    }) as Promise<MockExecution>;
  }

  async failExecution(executionId: string, error: string): Promise<MockExecution> {
    return this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        error,
        completedAt: new Date(),
      },
    }) as Promise<MockExecution>;
  }

  async cancelExecution(executionId: string): Promise<MockExecution> {
    return this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    }) as Promise<MockExecution>;
  }

  private validateInput(schema: Record<string, unknown>, input: Record<string, unknown>): void {
    const requiredFields = schema.required as string[] | undefined;
    if (requiredFields) {
      for (const field of requiredFields) {
        if (!(field in input)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
    }
  }

  evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    // Simple expression evaluator
    if (condition === 'true') return true;
    if (condition === 'false') return false;
    
    // Handle simple comparisons like "input.score > 70"
    const match = condition.match(/^(\w+(?:\.\w+)*)\s*(>|<|>=|<=|==|!=)\s*(\d+|true|false|"[^"]*")$/);
    if (match) {
      const [, path, operator, valueStr] = match;
      const leftValue = this.getNestedValue(context, path);
      const rightValue = this.parseValue(valueStr);
      
      switch (operator) {
        case '>': return Number(leftValue) > Number(rightValue);
        case '<': return Number(leftValue) < Number(rightValue);
        case '>=': return Number(leftValue) >= Number(rightValue);
        case '<=': return Number(leftValue) <= Number(rightValue);
        case '==': return leftValue === rightValue;
        case '!=': return leftValue !== rightValue;
      }
    }
    
    return false;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
    }, obj);
  }

  private parseValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
    return Number(value);
  }

  shouldRetry(step: MockStep, attemptCount: number, error: Error): boolean {
    if (step.onError !== 'RETRY') return false;
    if (!step.retryCount) return false;
    return attemptCount < step.retryCount;
  }

  calculateRetryDelay(attemptCount: number, policy?: { maxRetries: number; backoffMultiplier: number }): number {
    const baseDelay = 1000; // 1 second
    const multiplier = policy?.backoffMultiplier || 2;
    return baseDelay * Math.pow(multiplier, attemptCount);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('OrchestratorService', () => {
  let service: OrchestratorService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrchestratorService(mockPrisma);
  });

  describe('createWorkflow', () => {
    it('should create workflow with DRAFT status', async () => {
      const expectedWorkflow = createMockWorkflow({ status: 'DRAFT' });
      mockPrisma.workflow.create.mockResolvedValue(expectedWorkflow);

      const result = await service.createWorkflow('tenant-001', {
        name: 'Student Onboarding',
        createdBy: 'user-001',
      });

      expect(result.status).toBe('DRAFT');
      expect(result.version).toBe(1);
    });

    it('should initialize with empty tags array when not provided', async () => {
      const expectedWorkflow = createMockWorkflow({ tags: [] });
      mockPrisma.workflow.create.mockResolvedValue(expectedWorkflow);

      const result = await service.createWorkflow('tenant-001', {
        name: 'Test Workflow',
        createdBy: 'user-001',
      });

      expect(result.tags).toEqual([]);
    });
  });

  describe('publishWorkflow', () => {
    it('should publish workflow with steps', async () => {
      const workflow = createMockWorkflow({ steps: [createMockStep()] });
      mockPrisma.workflow.findFirst.mockResolvedValue(workflow);
      mockPrisma.workflowVersion.create.mockResolvedValue({});
      mockPrisma.workflow.update.mockResolvedValue({ ...workflow, status: 'ACTIVE' });

      const result = await service.publishWorkflow('tenant-001', 'wf-001');

      expect(result.status).toBe('ACTIVE');
      expect(mockPrisma.workflowVersion.create).toHaveBeenCalled();
    });

    it('should throw error if workflow not found', async () => {
      mockPrisma.workflow.findFirst.mockResolvedValue(null);

      await expect(service.publishWorkflow('tenant-001', 'wf-999'))
        .rejects.toThrow('Workflow not found');
    });

    it('should throw error if workflow has no steps', async () => {
      const workflow = createMockWorkflow({ steps: [] });
      mockPrisma.workflow.findFirst.mockResolvedValue(workflow);

      await expect(service.publishWorkflow('tenant-001', 'wf-001'))
        .rejects.toThrow('Workflow must have at least one step');
    });
  });

  describe('startExecution', () => {
    it('should create execution with PENDING status', async () => {
      const workflow = createMockWorkflow({ status: 'ACTIVE', steps: [createMockStep()] });
      const expectedExecution = createMockExecution({ status: 'PENDING' });
      mockPrisma.workflow.findFirst.mockResolvedValue(workflow);
      mockPrisma.workflowExecution.create.mockResolvedValue(expectedExecution);

      const result = await service.startExecution('tenant-001', 'wf-001', { studentId: 'stu-001' });

      expect(result.status).toBe('PENDING');
      expect(result.currentStepIndex).toBe(0);
    });

    it('should throw error if workflow not active', async () => {
      mockPrisma.workflow.findFirst.mockResolvedValue(null);

      await expect(service.startExecution('tenant-001', 'wf-001'))
        .rejects.toThrow('Active workflow not found');
    });

    it('should validate required input fields', async () => {
      const workflow = createMockWorkflow({
        status: 'ACTIVE',
        steps: [createMockStep()],
        inputSchema: { required: ['studentId'] },
      });
      mockPrisma.workflow.findFirst.mockResolvedValue(workflow);

      await expect(service.startExecution('tenant-001', 'wf-001', {}))
        .rejects.toThrow('Missing required field: studentId');
    });
  });

  describe('executeStep', () => {
    it('should execute ACTION step successfully', async () => {
      const execution = createMockExecution();
      const step = createMockStep({ type: 'ACTION' });

      const result = await service.executeStep(execution, step);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should execute CONDITION step and return result', async () => {
      const execution = createMockExecution();
      const step = createMockStep({ type: 'CONDITION', condition: 'true' });

      const result = await service.executeStep(execution, step);

      expect(result.success).toBe(true);
      expect(result.output?.conditionResult).toBe(true);
    });

    it('should execute WAIT step', async () => {
      const execution = createMockExecution();
      const step = createMockStep({ type: 'WAIT', config: { waitMs: 5000 } });

      const result = await service.executeStep(execution, step);

      expect(result.success).toBe(true);
      expect(result.output?.waitedMs).toBe(5000);
    });

    it('should execute PARALLEL step', async () => {
      const execution = createMockExecution();
      const step = createMockStep({
        type: 'PARALLEL',
        config: { branches: ['branch1', 'branch2'] },
      });

      const result = await service.executeStep(execution, step);

      expect(result.success).toBe(true);
      expect(result.output?.branchCount).toBe(2);
    });

    it('should return error if step has no config', async () => {
      const execution = createMockExecution();
      const step = { ...createMockStep(), config: undefined as unknown as Record<string, unknown> };

      const result = await service.executeStep(execution, step);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Step has no configuration');
    });
  });

  describe('completeExecution', () => {
    it('should mark execution as COMPLETED', async () => {
      const expectedExecution = createMockExecution({ status: 'COMPLETED' });
      mockPrisma.workflowExecution.update.mockResolvedValue(expectedExecution);

      const result = await service.completeExecution('exec-001', { result: 'success' });

      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('failExecution', () => {
    it('should mark execution as FAILED with error', async () => {
      const expectedExecution = createMockExecution({ status: 'FAILED', error: 'Connection timeout' });
      mockPrisma.workflowExecution.update.mockResolvedValue(expectedExecution);

      const result = await service.failExecution('exec-001', 'Connection timeout');

      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Connection timeout');
    });
  });

  describe('evaluateCondition', () => {
    it('should return true for "true" condition', () => {
      expect(service.evaluateCondition('true', {})).toBe(true);
    });

    it('should return false for "false" condition', () => {
      expect(service.evaluateCondition('false', {})).toBe(false);
    });

    it('should evaluate greater than comparison', () => {
      const context = { input: { score: 85 } };
      expect(service.evaluateCondition('input.score > 70', context)).toBe(true);
      expect(service.evaluateCondition('input.score > 90', context)).toBe(false);
    });

    it('should evaluate equality comparison', () => {
      const context = { status: 'active' };
      expect(service.evaluateCondition('status == "active"', context)).toBe(true);
      expect(service.evaluateCondition('status == "inactive"', context)).toBe(false);
    });

    it('should evaluate less than or equal comparison', () => {
      const context = { input: { attempts: 3 } };
      expect(service.evaluateCondition('input.attempts <= 3', context)).toBe(true);
      expect(service.evaluateCondition('input.attempts <= 2', context)).toBe(false);
    });
  });

  describe('shouldRetry', () => {
    it('should return false if onError is not RETRY', () => {
      const step = createMockStep({ onError: 'FAIL', retryCount: 3 });
      expect(service.shouldRetry(step, 1, new Error('test'))).toBe(false);
    });

    it('should return false if no retryCount configured', () => {
      const step = createMockStep({ onError: 'RETRY', retryCount: undefined });
      expect(service.shouldRetry(step, 1, new Error('test'))).toBe(false);
    });

    it('should return true if attempts remaining', () => {
      const step = createMockStep({ onError: 'RETRY', retryCount: 3 });
      expect(service.shouldRetry(step, 1, new Error('test'))).toBe(true);
      expect(service.shouldRetry(step, 2, new Error('test'))).toBe(true);
    });

    it('should return false if max retries exceeded', () => {
      const step = createMockStep({ onError: 'RETRY', retryCount: 3 });
      expect(service.shouldRetry(step, 3, new Error('test'))).toBe(false);
      expect(service.shouldRetry(step, 4, new Error('test'))).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should use exponential backoff', () => {
      const policy = { maxRetries: 5, backoffMultiplier: 2 };
      expect(service.calculateRetryDelay(0, policy)).toBe(1000);  // 1s
      expect(service.calculateRetryDelay(1, policy)).toBe(2000);  // 2s
      expect(service.calculateRetryDelay(2, policy)).toBe(4000);  // 4s
      expect(service.calculateRetryDelay(3, policy)).toBe(8000);  // 8s
    });

    it('should use default multiplier of 2', () => {
      expect(service.calculateRetryDelay(1)).toBe(2000);
      expect(service.calculateRetryDelay(2)).toBe(4000);
    });
  });
});
