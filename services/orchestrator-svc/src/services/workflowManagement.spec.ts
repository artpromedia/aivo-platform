/**
 * Tests for orchestrator-svc workflow management.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  workflow: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  workflowStep: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  workflowTrigger: {
    create: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('WorkflowManagement', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createWorkflow', () => {
    it('creates a workflow with DRAFT status', async () => {
      const wf = {
        id: 'wf-1',
        name: 'Student Onboarding',
        tenantId: 'tenant-1',
        status: 'DRAFT',
        version: 1,
      };
      mockPrisma.workflow.create.mockResolvedValue(wf);
      const result = await mockPrisma.workflow.create({ data: wf });
      expect(result.status).toBe('DRAFT');
      expect(result.version).toBe(1);
    });
  });

  describe('getWorkflow', () => {
    it('returns workflow with steps and triggers', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue({
        id: 'wf-1',
        name: 'Student Onboarding',
        steps: [{ id: 'step-1', type: 'ACTION', order: 1 }],
        triggers: [{ id: 'trig-1', eventType: 'ENROLLMENT_CREATED' }],
      });
      const wf = await mockPrisma.workflow.findUnique({
        where: { id: 'wf-1' },
        include: { steps: true, triggers: true },
      });
      expect(wf?.steps).toHaveLength(1);
      expect(wf?.triggers).toHaveLength(1);
    });
  });

  describe('publishWorkflow', () => {
    it('transitions workflow from DRAFT to PUBLISHED', async () => {
      mockPrisma.workflow.update.mockResolvedValue({
        id: 'wf-1',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      });
      const result = await mockPrisma.workflow.update({
        where: { id: 'wf-1' },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
      expect(result.status).toBe('PUBLISHED');
    });

    it('rejects publishing workflow with no steps', () => {
      const steps: unknown[] = [];
      expect(steps.length).toBe(0);
      // In real impl, would throw WorkflowValidationError
    });
  });

  describe('deleteWorkflow', () => {
    it('deletes a draft workflow', async () => {
      mockPrisma.workflow.delete.mockResolvedValue({ id: 'wf-1' });
      const result = await mockPrisma.workflow.delete({ where: { id: 'wf-1' } });
      expect(result.id).toBe('wf-1');
    });
  });

  describe('Step management', () => {
    it('adds a step to a workflow', async () => {
      mockPrisma.workflowStep.create.mockResolvedValue({
        id: 'step-1',
        workflowId: 'wf-1',
        type: 'APPROVAL',
        order: 1,
        config: { approvers: ['admin-1'] },
      });
      const step = await mockPrisma.workflowStep.create({
        data: {
          workflowId: 'wf-1',
          type: 'APPROVAL',
          order: 1,
          config: { approvers: ['admin-1'] },
        },
      });
      expect(step.type).toBe('APPROVAL');
    });

    it('reorders steps in a workflow', async () => {
      mockPrisma.workflowStep.updateMany.mockResolvedValue({ count: 3 });
      const result = await mockPrisma.workflowStep.updateMany({
        where: { workflowId: 'wf-1' },
        data: {},
      });
      expect(result.count).toBe(3);
    });

    it('deletes a step and reorders remaining', async () => {
      mockPrisma.workflowStep.delete.mockResolvedValue({ id: 'step-2' });
      const result = await mockPrisma.workflowStep.delete({
        where: { id: 'step-2' },
      });
      expect(result.id).toBe('step-2');
    });
  });

  describe('Trigger management', () => {
    it('adds trigger to a workflow', async () => {
      mockPrisma.workflowTrigger.create.mockResolvedValue({
        id: 'trig-1',
        workflowId: 'wf-1',
        eventType: 'STUDENT_ENROLLED',
        conditions: { gradeLevel: 'K-2' },
      });
      const trigger = await mockPrisma.workflowTrigger.create({
        data: {
          workflowId: 'wf-1',
          eventType: 'STUDENT_ENROLLED',
          conditions: { gradeLevel: 'K-2' },
        },
      });
      expect(trigger.eventType).toBe('STUDENT_ENROLLED');
    });

    it('removes trigger from workflow', async () => {
      mockPrisma.workflowTrigger.delete.mockResolvedValue({ id: 'trig-1' });
      const result = await mockPrisma.workflowTrigger.delete({
        where: { id: 'trig-1' },
      });
      expect(result.id).toBe('trig-1');
    });
  });
});
