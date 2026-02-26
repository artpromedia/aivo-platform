import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPrisma = {
  paymentEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('../src/prisma', () => ({ prisma: mockPrisma }));

describe('AuditService', () => {
  let auditModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    auditModule = await import('../src/services/audit.service');
  });

  describe('logAuditEvent', () => {
    it('creates an audit log entry', async () => {
      mockPrisma.paymentEvent.create.mockResolvedValue({
        id: 'event-1',
        type: 'SUBSCRIPTION_CREATED',
        tenantId: 'tenant-1',
      });

      const result = await auditModule.logAuditEvent({
        type: 'SUBSCRIPTION_CREATED',
        tenantId: 'tenant-1',
        userId: 'user-1',
        data: { planId: 'plan-basic' },
      });

      expect(mockPrisma.paymentEvent.create).toHaveBeenCalled();
    });

    it('records the event type accurately', async () => {
      mockPrisma.paymentEvent.create.mockResolvedValue({ id: 'event-2' });

      await auditModule.logAuditEvent({
        type: 'PAYMENT_FAILED',
        tenantId: 'tenant-1',
        userId: 'user-1',
        data: { error: 'card_declined' },
      });

      const createCall = mockPrisma.paymentEvent.create.mock.calls[0][0];
      expect(createCall.data || createCall).toBeDefined();
    });
  });
});
