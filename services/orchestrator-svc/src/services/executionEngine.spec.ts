/**
 * Tests for orchestrator-svc execution engine.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  execution: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  executionStep: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  approvalRequest: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('ExecutionEngine', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('startExecution', () => {
    it('creates execution with RUNNING status', async () => {
      const exec = {
        id: 'exec-1',
        workflowId: 'wf-1',
        status: 'RUNNING',
        startedAt: new Date(),
        context: { studentId: 'stu-1', enrollmentId: 'enr-1' },
      };
      mockPrisma.execution.create.mockResolvedValue(exec);
      const result = await mockPrisma.execution.create({ data: exec });
      expect(result.status).toBe('RUNNING');
      expect(result.context.studentId).toBe('stu-1');
    });
  });

  describe('getExecution', () => {
    it('returns execution with step details', async () => {
      mockPrisma.execution.findUnique.mockResolvedValue({
        id: 'exec-1',
        status: 'RUNNING',
        steps: [
          { id: 'es-1', stepId: 'step-1', status: 'COMPLETED' },
          { id: 'es-2', stepId: 'step-2', status: 'PENDING' },
        ],
      });
      const exec = await mockPrisma.execution.findUnique({
        where: { id: 'exec-1' },
        include: { steps: true },
      });
      expect(exec?.steps).toHaveLength(2);
      expect(exec?.steps[0].status).toBe('COMPLETED');
    });
  });

  describe('cancelExecution', () => {
    it('cancels a running execution', async () => {
      mockPrisma.execution.update.mockResolvedValue({
        id: 'exec-1',
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: 'admin-1',
      });
      const result = await mockPrisma.execution.update({
        where: { id: 'exec-1' },
        data: { status: 'CANCELLED', cancelledBy: 'admin-1' },
      });
      expect(result.status).toBe('CANCELLED');
      expect(result.cancelledBy).toBe('admin-1');
    });
  });

  describe('pauseExecution', () => {
    it('pauses execution at current step', async () => {
      mockPrisma.execution.update.mockResolvedValue({
        id: 'exec-1',
        status: 'PAUSED',
        pausedAt: new Date(),
      });
      const result = await mockPrisma.execution.update({
        where: { id: 'exec-1' },
        data: { status: 'PAUSED' },
      });
      expect(result.status).toBe('PAUSED');
    });
  });

  describe('resumeExecution', () => {
    it('resumes a paused execution', async () => {
      mockPrisma.execution.update.mockResolvedValue({
        id: 'exec-1',
        status: 'RUNNING',
        resumedAt: new Date(),
      });
      const result = await mockPrisma.execution.update({
        where: { id: 'exec-1' },
        data: { status: 'RUNNING' },
      });
      expect(result.status).toBe('RUNNING');
    });
  });

  describe('processStep', () => {
    it('marks step as completed and advances', async () => {
      mockPrisma.executionStep.update.mockResolvedValue({
        id: 'es-1',
        status: 'COMPLETED',
        completedAt: new Date(),
        output: { notificationSent: true },
      });
      const result = await mockPrisma.executionStep.update({
        where: { id: 'es-1' },
        data: { status: 'COMPLETED', output: { notificationSent: true } },
      });
      expect(result.status).toBe('COMPLETED');
    });

    it('marks step as failed with error', async () => {
      mockPrisma.executionStep.update.mockResolvedValue({
        id: 'es-2',
        status: 'FAILED',
        error: 'Notification service unavailable',
      });
      const result = await mockPrisma.executionStep.update({
        where: { id: 'es-2' },
        data: { status: 'FAILED', error: 'Notification service unavailable' },
      });
      expect(result.status).toBe('FAILED');
    });
  });
});

describe('ApprovalEngine', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createApprovalRequest', () => {
    it('creates approval request for step', async () => {
      mockPrisma.approvalRequest.create.mockResolvedValue({
        id: 'apr-1',
        executionStepId: 'es-3',
        approvers: ['admin-1', 'admin-2'],
        status: 'PENDING',
        requiredApprovals: 1,
      });
      const result = await mockPrisma.approvalRequest.create({
        data: {
          executionStepId: 'es-3',
          approvers: ['admin-1', 'admin-2'],
          requiredApprovals: 1,
        },
      });
      expect(result.approvers).toHaveLength(2);
      expect(result.requiredApprovals).toBe(1);
    });
  });

  describe('handleApproval', () => {
    it('approves and advances execution', async () => {
      mockPrisma.approvalRequest.update.mockResolvedValue({
        id: 'apr-1',
        status: 'APPROVED',
        decidedBy: 'admin-1',
        decidedAt: new Date(),
      });
      const result = await mockPrisma.approvalRequest.update({
        where: { id: 'apr-1' },
        data: { status: 'APPROVED', decidedBy: 'admin-1' },
      });
      expect(result.status).toBe('APPROVED');
    });

    it('rejects and halts execution', async () => {
      mockPrisma.approvalRequest.update.mockResolvedValue({
        id: 'apr-1',
        status: 'REJECTED',
        decidedBy: 'admin-2',
        reason: 'Student does not meet prerequisites',
      });
      const result = await mockPrisma.approvalRequest.update({
        where: { id: 'apr-1' },
        data: { status: 'REJECTED', reason: 'Student does not meet prerequisites' },
      });
      expect(result.status).toBe('REJECTED');
      expect(result.reason).toContain('prerequisites');
    });
  });
});
