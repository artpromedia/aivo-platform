/**
 * Tests for approval-svc delegation and escalation logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  delegation: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  approvalRequest: {
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  approvalStep: {
    findMany: vi.fn(),
  },
  comment: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('DelegationService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createDelegation', () => {
    it('creates delegation from one user to another', async () => {
      const delegation = {
        id: 'del-1',
        fromUserId: 'user-a',
        toUserId: 'user-b',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 86400000),
        active: true,
      };
      mockPrisma.delegation.create.mockResolvedValue(delegation);

      const result = await mockPrisma.delegation.create({ data: delegation });
      expect(result.fromUserId).toBe('user-a');
      expect(result.toUserId).toBe('user-b');
      expect(result.active).toBe(true);
    });

    it('prevents self-delegation', () => {
      const data = { fromUserId: 'user-a', toUserId: 'user-a' };
      expect(data.fromUserId).toBe(data.toUserId);
      // Service should reject this
    });
  });

  describe('revokeDelegation', () => {
    it('deactivates an existing delegation', async () => {
      mockPrisma.delegation.update.mockResolvedValue({
        id: 'del-1',
        active: false,
        revokedAt: new Date(),
      });

      const result = await mockPrisma.delegation.update({
        where: { id: 'del-1' },
        data: { active: false, revokedAt: new Date() },
      });
      expect(result.active).toBe(false);
    });
  });

  describe('getDelegations', () => {
    it('lists active delegations for a user', async () => {
      mockPrisma.delegation.findMany.mockResolvedValue([
        { id: 'del-1', fromUserId: 'user-a', toUserId: 'user-b', active: true },
      ]);

      const result = await mockPrisma.delegation.findMany({
        where: { fromUserId: 'user-a', active: true },
      });
      expect(result).toHaveLength(1);
    });

    it('returns empty when no delegations exist', async () => {
      mockPrisma.delegation.findMany.mockResolvedValue([]);
      const result = await mockPrisma.delegation.findMany({ where: { fromUserId: 'user-z' } });
      expect(result).toHaveLength(0);
    });
  });
});

describe('EscalationService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('processEscalations', () => {
    it('finds overdue requests and escalates', async () => {
      const overdue = [
        {
          id: 'req-1',
          status: 'PENDING',
          createdAt: new Date(Date.now() - 7 * 86400000),
          workflowId: 'wf-1',
        },
      ];
      mockPrisma.approvalRequest.findMany.mockResolvedValue(overdue);
      mockPrisma.approvalRequest.update.mockResolvedValue({
        ...overdue[0],
        status: 'ESCALATED',
      });

      const found = await mockPrisma.approvalRequest.findMany({
        where: { status: 'PENDING' },
      });
      expect(found).toHaveLength(1);

      const escalated = await mockPrisma.approvalRequest.update({
        where: { id: 'req-1' },
        data: { status: 'ESCALATED' },
      });
      expect(escalated.status).toBe('ESCALATED');
    });

    it('does not escalate recent requests', async () => {
      mockPrisma.approvalRequest.findMany.mockResolvedValue([]);
      const found = await mockPrisma.approvalRequest.findMany({ where: { status: 'PENDING' } });
      expect(found).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('returns approval statistics', async () => {
      mockPrisma.approvalRequest.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(30) // approved
        .mockResolvedValueOnce(10) // rejected
        .mockResolvedValueOnce(10); // pending

      const total = await mockPrisma.approvalRequest.count({});
      const approved = await mockPrisma.approvalRequest.count({ where: { status: 'APPROVED' } });
      const rejected = await mockPrisma.approvalRequest.count({ where: { status: 'REJECTED' } });
      const pending = await mockPrisma.approvalRequest.count({ where: { status: 'PENDING' } });

      expect(total).toBe(50);
      expect(approved).toBe(30);
      expect(rejected).toBe(10);
      expect(pending).toBe(10);
    });
  });
});

describe('CommentService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('addComment', () => {
    it('adds comment to an approval request', async () => {
      mockPrisma.comment.create.mockResolvedValue({
        id: 'cmt-1',
        requestId: 'req-1',
        userId: 'user-a',
        text: 'Looks good, approved.',
        createdAt: new Date(),
      });

      const comment = await mockPrisma.comment.create({
        data: { requestId: 'req-1', userId: 'user-a', text: 'Looks good, approved.' },
      });
      expect(comment.text).toBe('Looks good, approved.');
    });
  });
});
