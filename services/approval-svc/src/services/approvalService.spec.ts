/**
 * Approval Service Unit Tests
 * Tests for workflow management, approval requests, and decision processing
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface MockWorkflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  entityType: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  steps: MockStep[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MockStep {
  id: string;
  tenantId: string;
  workflowId: string;
  name: string;
  order: number;
  type: 'SINGLE_APPROVER' | 'ALL_APPROVERS' | 'QUORUM' | 'ANY_OF';
  approverType: string;
  approverIds: string[];
  quorumCount?: number;
  timeoutHours?: number;
  escalationType: 'NOTIFY_ONLY' | 'AUTO_APPROVE' | 'AUTO_REJECT' | 'ESCALATE';
  escalateTo: string[];
}

interface MockRequest {
  id: string;
  tenantId: string;
  workflowId: string;
  entityType: string;
  entityId: string;
  title: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  currentStepOrder: number;
  requestedBy: string;
}

interface MockDecision {
  id: string;
  requestId: string;
  stepId: string;
  decision: 'APPROVED' | 'REJECTED' | 'DELEGATED';
  decidedBy: string;
  comments?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK PRISMA
// ══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  approvalWorkflow: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  approvalStep: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  approvalRequest: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  stepInstance: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  decision: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  approvalHistory: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function createMockWorkflow(overrides: Partial<MockWorkflow> = {}): MockWorkflow {
  return {
    id: 'wf-001',
    tenantId: 'tenant-001',
    name: 'Content Approval',
    entityType: 'LESSON',
    status: 'DRAFT',
    steps: [],
    createdBy: 'user-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockStep(overrides: Partial<MockStep> = {}): MockStep {
  return {
    id: 'step-001',
    tenantId: 'tenant-001',
    workflowId: 'wf-001',
    name: 'Manager Approval',
    order: 1,
    type: 'SINGLE_APPROVER',
    approverType: 'ROLE',
    approverIds: ['manager'],
    escalationType: 'NOTIFY_ONLY',
    escalateTo: [],
    ...overrides,
  };
}

function createMockRequest(overrides: Partial<MockRequest> = {}): MockRequest {
  return {
    id: 'req-001',
    tenantId: 'tenant-001',
    workflowId: 'wf-001',
    entityType: 'LESSON',
    entityId: 'lesson-001',
    title: 'Approve Math Lesson',
    status: 'PENDING',
    currentStepOrder: 1,
    requestedBy: 'user-001',
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// APPROVAL SERVICE LOGIC (inline for testing)
// ══════════════════════════════════════════════════════════════════════════════

class ApprovalService {
  constructor(private prisma: typeof mockPrisma) {}

  async createWorkflow(tenantId: string, data: {
    name: string;
    description?: string;
    entityType: string;
    createdBy: string;
  }): Promise<MockWorkflow> {
    return this.prisma.approvalWorkflow.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        entityType: data.entityType,
        createdBy: data.createdBy,
        status: 'DRAFT',
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    }) as Promise<MockWorkflow>;
  }

  async getWorkflow(tenantId: string, workflowId: string): Promise<MockWorkflow | null> {
    return this.prisma.approvalWorkflow.findFirst({
      where: { id: workflowId, tenantId },
      include: { steps: { orderBy: { order: 'asc' } } },
    }) as Promise<MockWorkflow | null>;
  }

  async activateWorkflow(tenantId: string, workflowId: string): Promise<MockWorkflow> {
    const workflow = await this.prisma.approvalWorkflow.findFirst({
      where: { id: workflowId, tenantId },
      include: { steps: true },
    }) as MockWorkflow | null;

    if (!workflow) throw new Error('Workflow not found');
    if (workflow.steps.length === 0) throw new Error('Workflow must have at least one step');

    return this.prisma.approvalWorkflow.update({
      where: { id: workflowId },
      data: { status: 'ACTIVE' },
    }) as Promise<MockWorkflow>;
  }

  async addStep(tenantId: string, workflowId: string, data: {
    name: string;
    order: number;
    type?: MockStep['type'];
    approverType: string;
    approverIds: string[];
    quorumCount?: number;
    timeoutHours?: number;
  }): Promise<MockStep> {
    return this.prisma.approvalStep.create({
      data: {
        tenantId,
        workflowId,
        name: data.name,
        order: data.order,
        type: data.type || 'SINGLE_APPROVER',
        approverType: data.approverType,
        approverIds: data.approverIds,
        quorumCount: data.quorumCount,
        timeoutHours: data.timeoutHours,
        escalationType: 'NOTIFY_ONLY',
        escalateTo: [],
      },
    }) as Promise<MockStep>;
  }

  async createRequest(tenantId: string, data: {
    workflowId: string;
    entityType: string;
    entityId: string;
    title: string;
    requestedBy: string;
  }): Promise<MockRequest> {
    const workflow = await this.prisma.approvalWorkflow.findFirst({
      where: { id: data.workflowId, tenantId, status: 'ACTIVE' },
      include: { steps: { orderBy: { order: 'asc' } } },
    }) as MockWorkflow | null;

    if (!workflow) throw new Error('Active workflow not found');
    if (workflow.steps.length === 0) throw new Error('Workflow has no steps');

    const request = await this.prisma.approvalRequest.create({
      data: {
        tenantId,
        workflowId: data.workflowId,
        entityType: data.entityType,
        entityId: data.entityId,
        title: data.title,
        requestedBy: data.requestedBy,
        currentStepOrder: 1,
        status: 'PENDING',
      },
    }) as MockRequest;

    return request;
  }

  async processDecision(tenantId: string, requestId: string, data: {
    decision: 'APPROVED' | 'REJECTED';
    decidedBy: string;
    comments?: string;
  }): Promise<{ request: MockRequest; isComplete: boolean }> {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id: requestId, tenantId, status: 'PENDING' },
    }) as MockRequest | null;

    if (!request) throw new Error('Pending request not found');

    const workflow = await this.prisma.approvalWorkflow.findFirst({
      where: { id: request.workflowId, tenantId },
      include: { steps: { orderBy: { order: 'asc' } } },
    }) as MockWorkflow | null;

    if (!workflow) throw new Error('Workflow not found');

    // Record the decision
    const currentStep = workflow.steps[request.currentStepOrder - 1];
    if (!currentStep) throw new Error('Current step not found');
    
    await this.prisma.decision.create({
      data: {
        requestId,
        stepId: currentStep.id,
        decision: data.decision,
        decidedBy: data.decidedBy,
        comments: data.comments,
      },
    });

    if (data.decision === 'REJECTED') {
      // Request is rejected
      await this.prisma.approvalRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });
      return { request: { ...request, status: 'REJECTED' }, isComplete: true };
    }

    // Check if there are more steps
    const nextStepOrder = request.currentStepOrder + 1;
    const hasMoreSteps = nextStepOrder <= workflow.steps.length;

    if (hasMoreSteps) {
      // Move to next step
      await this.prisma.approvalRequest.update({
        where: { id: requestId },
        data: { currentStepOrder: nextStepOrder },
      });
      return { request: { ...request, currentStepOrder: nextStepOrder }, isComplete: false };
    }

    // All steps completed - approve
    await this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    });
    return { request: { ...request, status: 'APPROVED' }, isComplete: true };
  }

  validateQuorum(step: MockStep, approvalCount: number): boolean {
    if (step.type === 'SINGLE_APPROVER') return approvalCount >= 1;
    if (step.type === 'ALL_APPROVERS') return approvalCount >= step.approverIds.length;
    if (step.type === 'QUORUM') return approvalCount >= (step.quorumCount || 1);
    if (step.type === 'ANY_OF') return approvalCount >= 1;
    return false;
  }

  isEscalationNeeded(step: MockStep, createdAt: Date): boolean {
    if (!step.timeoutHours) return false;
    const timeoutMs = step.timeoutHours * 60 * 60 * 1000;
    return Date.now() - createdAt.getTime() > timeoutMs;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('ApprovalService', () => {
  let service: ApprovalService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ApprovalService(mockPrisma);
  });

  describe('createWorkflow', () => {
    it('should create a workflow with DRAFT status', async () => {
      const expectedWorkflow = createMockWorkflow({ status: 'DRAFT' });
      mockPrisma.approvalWorkflow.create.mockResolvedValue(expectedWorkflow);

      const result = await service.createWorkflow('tenant-001', {
        name: 'Content Approval',
        entityType: 'LESSON',
        createdBy: 'user-001',
      });

      expect(result.status).toBe('DRAFT');
      expect(mockPrisma.approvalWorkflow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Content Approval',
            status: 'DRAFT',
          }),
        })
      );
    });

    it('should associate workflow with tenant', async () => {
      const expectedWorkflow = createMockWorkflow({ tenantId: 'tenant-001' });
      mockPrisma.approvalWorkflow.create.mockResolvedValue(expectedWorkflow);

      const result = await service.createWorkflow('tenant-001', {
        name: 'Test Workflow',
        entityType: 'ASSIGNMENT',
        createdBy: 'user-001',
      });

      expect(result.tenantId).toBe('tenant-001');
    });
  });

  describe('activateWorkflow', () => {
    it('should activate workflow with steps', async () => {
      const workflow = createMockWorkflow({
        steps: [createMockStep()],
      });
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(workflow);
      mockPrisma.approvalWorkflow.update.mockResolvedValue({ ...workflow, status: 'ACTIVE' });

      const result = await service.activateWorkflow('tenant-001', 'wf-001');

      expect(result.status).toBe('ACTIVE');
    });

    it('should throw error if workflow not found', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(null);

      await expect(service.activateWorkflow('tenant-001', 'wf-999'))
        .rejects.toThrow('Workflow not found');
    });

    it('should throw error if workflow has no steps', async () => {
      const workflow = createMockWorkflow({ steps: [] });
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(workflow);

      await expect(service.activateWorkflow('tenant-001', 'wf-001'))
        .rejects.toThrow('Workflow must have at least one step');
    });
  });

  describe('addStep', () => {
    it('should create step with default type SINGLE_APPROVER', async () => {
      const expectedStep = createMockStep({ type: 'SINGLE_APPROVER' });
      mockPrisma.approvalStep.create.mockResolvedValue(expectedStep);

      const result = await service.addStep('tenant-001', 'wf-001', {
        name: 'Manager Approval',
        order: 1,
        approverType: 'ROLE',
        approverIds: ['manager'],
      });

      expect(result.type).toBe('SINGLE_APPROVER');
    });

    it('should create step with QUORUM type when specified', async () => {
      const expectedStep = createMockStep({ type: 'QUORUM', quorumCount: 2 });
      mockPrisma.approvalStep.create.mockResolvedValue(expectedStep);

      const result = await service.addStep('tenant-001', 'wf-001', {
        name: 'Committee Approval',
        order: 1,
        type: 'QUORUM',
        approverType: 'GROUP',
        approverIds: ['committee-member-1', 'committee-member-2', 'committee-member-3'],
        quorumCount: 2,
      });

      expect(result.type).toBe('QUORUM');
      expect(result.quorumCount).toBe(2);
    });
  });

  describe('createRequest', () => {
    it('should create request for active workflow', async () => {
      const workflow = createMockWorkflow({
        status: 'ACTIVE',
        steps: [createMockStep()],
      });
      const expectedRequest = createMockRequest({ status: 'PENDING', currentStepOrder: 1 });
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(workflow);
      mockPrisma.approvalRequest.create.mockResolvedValue(expectedRequest);

      const result = await service.createRequest('tenant-001', {
        workflowId: 'wf-001',
        entityType: 'LESSON',
        entityId: 'lesson-001',
        title: 'Approve Math Lesson',
        requestedBy: 'user-001',
      });

      expect(result.status).toBe('PENDING');
      expect(result.currentStepOrder).toBe(1);
    });

    it('should throw error if workflow not active', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(null);

      await expect(service.createRequest('tenant-001', {
        workflowId: 'wf-001',
        entityType: 'LESSON',
        entityId: 'lesson-001',
        title: 'Test',
        requestedBy: 'user-001',
      })).rejects.toThrow('Active workflow not found');
    });
  });

  describe('processDecision', () => {
    it('should move to next step on approval', async () => {
      const request = createMockRequest({ currentStepOrder: 1 });
      const workflow = createMockWorkflow({
        steps: [createMockStep({ order: 1 }), createMockStep({ order: 2, id: 'step-002' })],
      });
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(request);
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(workflow);
      mockPrisma.decision.create.mockResolvedValue({});
      mockPrisma.approvalRequest.update.mockResolvedValue({ ...request, currentStepOrder: 2 });

      const result = await service.processDecision('tenant-001', 'req-001', {
        decision: 'APPROVED',
        decidedBy: 'approver-001',
      });

      expect(result.isComplete).toBe(false);
      expect(result.request.currentStepOrder).toBe(2);
    });

    it('should complete request on final approval', async () => {
      const request = createMockRequest({ currentStepOrder: 1 });
      const workflow = createMockWorkflow({
        steps: [createMockStep({ order: 1 })],
      });
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(request);
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(workflow);
      mockPrisma.decision.create.mockResolvedValue({});
      mockPrisma.approvalRequest.update.mockResolvedValue({ ...request, status: 'APPROVED' });

      const result = await service.processDecision('tenant-001', 'req-001', {
        decision: 'APPROVED',
        decidedBy: 'approver-001',
      });

      expect(result.isComplete).toBe(true);
      expect(result.request.status).toBe('APPROVED');
    });

    it('should reject request immediately on rejection', async () => {
      const request = createMockRequest({ currentStepOrder: 1 });
      const workflow = createMockWorkflow({
        steps: [createMockStep({ order: 1 }), createMockStep({ order: 2 })],
      });
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(request);
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(workflow);
      mockPrisma.decision.create.mockResolvedValue({});
      mockPrisma.approvalRequest.update.mockResolvedValue({ ...request, status: 'REJECTED' });

      const result = await service.processDecision('tenant-001', 'req-001', {
        decision: 'REJECTED',
        decidedBy: 'approver-001',
        comments: 'Not meeting standards',
      });

      expect(result.isComplete).toBe(true);
      expect(result.request.status).toBe('REJECTED');
    });

    it('should throw error if request not found', async () => {
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(null);

      await expect(service.processDecision('tenant-001', 'req-999', {
        decision: 'APPROVED',
        decidedBy: 'approver-001',
      })).rejects.toThrow('Pending request not found');
    });
  });

  describe('validateQuorum', () => {
    it('should validate SINGLE_APPROVER with 1 approval', () => {
      const step = createMockStep({ type: 'SINGLE_APPROVER' });
      expect(service.validateQuorum(step, 1)).toBe(true);
      expect(service.validateQuorum(step, 0)).toBe(false);
    });

    it('should validate ALL_APPROVERS requires all', () => {
      const step = createMockStep({
        type: 'ALL_APPROVERS',
        approverIds: ['user-1', 'user-2', 'user-3'],
      });
      expect(service.validateQuorum(step, 3)).toBe(true);
      expect(service.validateQuorum(step, 2)).toBe(false);
    });

    it('should validate QUORUM meets minimum count', () => {
      const step = createMockStep({
        type: 'QUORUM',
        approverIds: ['user-1', 'user-2', 'user-3', 'user-4'],
        quorumCount: 2,
      });
      expect(service.validateQuorum(step, 2)).toBe(true);
      expect(service.validateQuorum(step, 3)).toBe(true);
      expect(service.validateQuorum(step, 1)).toBe(false);
    });
  });

  describe('isEscalationNeeded', () => {
    it('should return false if no timeout configured', () => {
      const step = createMockStep({ timeoutHours: undefined });
      expect(service.isEscalationNeeded(step, new Date())).toBe(false);
    });

    it('should return false if within timeout window', () => {
      const step = createMockStep({ timeoutHours: 24 });
      const createdAt = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
      expect(service.isEscalationNeeded(step, createdAt)).toBe(false);
    });

    it('should return true if timeout exceeded', () => {
      const step = createMockStep({ timeoutHours: 24 });
      const createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      expect(service.isEscalationNeeded(step, createdAt)).toBe(true);
    });
  });
});
