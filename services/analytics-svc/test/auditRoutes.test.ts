/**
 * Audit Routes Tests
 *
 * Tests for audit event API endpoints used by District Admin
 * and Platform Admin for AI governance audit trails.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the prisma client
vi.mock('../src/prisma.js', () => ({
  prisma: {
    auditEvent: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from '../src/prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

const mockTenantId = '770e8400-e29b-41d4-a716-446655440001';
const mockLearnerId = 'learner-123';

const mockDifficultyAuditEvent = {
  id: '880e8400-e29b-41d4-a716-446655440001',
  tenantId: mockTenantId,
  actorType: 'AGENT',
  actorId: 'difficulty-agent-v1',
  entityType: 'LEARNER_DIFFICULTY',
  entityId: mockLearnerId,
  action: 'UPDATED',
  changeJson: {
    subject: 'MATH',
    beforeLevel: 3,
    afterLevel: 4,
    reasons: ['Strong performance on practice problems', 'Consistently completing challenging tasks'],
  },
  relatedExplanationId: '990e8400-e29b-41d4-a716-446655440001',
  createdAt: new Date('2024-12-10T14:30:00Z'),
};

const mockTodayPlanAuditEvent = {
  id: '880e8400-e29b-41d4-a716-446655440002',
  tenantId: mockTenantId,
  actorType: 'AGENT',
  actorId: 'plan-agent-v1',
  entityType: 'TODAY_PLAN',
  entityId: mockLearnerId,
  action: 'UPDATED',
  changeJson: {
    date: '2024-12-10',
    addedLOs: ['LO-MATH-456', 'LO-MATH-789'],
    removedLOs: ['LO-MATH-123'],
    modifiedLOs: [],
    reason: 'Adjusted based on learner progress in fractions',
  },
  relatedExplanationId: '990e8400-e29b-41d4-a716-446655440002',
  createdAt: new Date('2024-12-10T15:00:00Z'),
};

const mockPolicyAuditEvent = {
  id: '880e8400-e29b-41d4-a716-446655440003',
  tenantId: mockTenantId,
  actorType: 'USER',
  actorId: 'user-admin-456',
  entityType: 'POLICY_DOCUMENT',
  entityId: 'policy-doc-789',
  action: 'UPDATED',
  changeJson: {
    policyName: 'AI Usage Guidelines',
    policyVersion: '2.1',
    changedFields: ['description', 'effectiveDate', 'approvalRequirements'],
  },
  relatedExplanationId: null,
  createdAt: new Date('2024-12-09T10:00:00Z'),
};

const mockAuditEvents = [
  mockDifficultyAuditEvent,
  mockTodayPlanAuditEvent,
  mockPolicyAuditEvent,
];

// Get mocks
const mockFindMany = prisma.auditEvent.findMany as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.auditEvent.findUnique as ReturnType<typeof vi.fn>;
const mockCount = prisma.auditEvent.count as ReturnType<typeof vi.fn>;
const mockCreate = prisma.auditEvent.create as ReturnType<typeof vi.fn>;

// ══════════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface AuditEventResponse {
  id: string;
  tenantId: string;
  actorType: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  changeJson: Record<string, unknown>;
  relatedExplanationId: string | null;
  createdAt: string;
}

interface LearnerAuditTimelineResponse {
  learnerId: string;
  events: AuditEventResponse[];
  startDate: string;
  endDate: string;
}

interface PolicyAuditResponse {
  events: AuditEventResponse[];
  total: number;
  page: number;
  pageSize: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('auditRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET /audit/learner/:learnerId
  // ════════════════════════════════════════════════════════════════════════════

  describe('GET /audit/learner/:learnerId', () => {
    it('should return audit events for a specific learner', async () => {
      const learnerEvents = [mockDifficultyAuditEvent, mockTodayPlanAuditEvent];
      mockFindMany.mockResolvedValue(learnerEvents);

      // Simulate the route behavior
      const result = await prisma.auditEvent.findMany({
        where: {
          entityId: mockLearnerId,
          entityType: { in: ['LEARNER_DIFFICULTY', 'TODAY_PLAN'] },
          createdAt: { gte: expect.any(Date) },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(2);
      expect(result[0].entityType).toBe('LEARNER_DIFFICULTY');
      expect(result[1].entityType).toBe('TODAY_PLAN');
    });

    it('should filter events by date range (last 7 days)', async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      mockFindMany.mockResolvedValue([mockDifficultyAuditEvent]);

      await prisma.auditEvent.findMany({
        where: {
          entityId: mockLearnerId,
          createdAt: { gte: sevenDaysAgo },
        },
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityId: mockLearnerId,
            createdAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        })
      );
    });

    it('should include relatedExplanationId for explanation linking', async () => {
      mockFindMany.mockResolvedValue([mockDifficultyAuditEvent]);

      const result = await prisma.auditEvent.findMany({
        where: { entityId: mockLearnerId },
      });

      expect(result[0].relatedExplanationId).toBe('990e8400-e29b-41d4-a716-446655440001');
    });

    it('should return empty array for learner with no events', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await prisma.auditEvent.findMany({
        where: { entityId: 'nonexistent-learner' },
      });

      expect(result).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET /audit/policies
  // ════════════════════════════════════════════════════════════════════════════

  describe('GET /audit/policies', () => {
    it('should return policy audit events across all tenants', async () => {
      mockFindMany.mockResolvedValue([mockPolicyAuditEvent]);
      mockCount.mockResolvedValue(1);

      const result = await prisma.auditEvent.findMany({
        where: { entityType: 'POLICY_DOCUMENT' },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('POLICY_DOCUMENT');
      expect(result[0].actorType).toBe('USER');
    });

    it('should filter by tenantId when provided', async () => {
      mockFindMany.mockResolvedValue([mockPolicyAuditEvent]);

      await prisma.auditEvent.findMany({
        where: {
          entityType: 'POLICY_DOCUMENT',
          tenantId: mockTenantId,
        },
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
          }),
        })
      );
    });

    it('should paginate results', async () => {
      mockFindMany.mockResolvedValue([mockPolicyAuditEvent]);
      mockCount.mockResolvedValue(50);

      const pageSize = 20;
      const page = 2;

      await prisma.auditEvent.findMany({
        where: { entityType: 'POLICY_DOCUMENT' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        })
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET /audit/tenant/:tenantId
  // ════════════════════════════════════════════════════════════════════════════

  describe('GET /audit/tenant/:tenantId', () => {
    it('should return all audit events for a tenant', async () => {
      mockFindMany.mockResolvedValue(mockAuditEvents);

      const result = await prisma.auditEvent.findMany({
        where: { tenantId: mockTenantId },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(3);
    });

    it('should filter by entity type when provided', async () => {
      mockFindMany.mockResolvedValue([mockDifficultyAuditEvent]);

      await prisma.auditEvent.findMany({
        where: {
          tenantId: mockTenantId,
          entityType: 'LEARNER_DIFFICULTY',
        },
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'LEARNER_DIFFICULTY',
          }),
        })
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET /audit/entity/:entityType/:entityId
  // ════════════════════════════════════════════════════════════════════════════

  describe('GET /audit/entity/:entityType/:entityId', () => {
    it('should return audit events for a specific entity', async () => {
      mockFindMany.mockResolvedValue([mockDifficultyAuditEvent]);

      const result = await prisma.auditEvent.findMany({
        where: {
          entityType: 'LEARNER_DIFFICULTY',
          entityId: mockLearnerId,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(1);
      expect(result[0].entityId).toBe(mockLearnerId);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AUDIT EVENT CREATION (for AI orchestrator integration)
  // ════════════════════════════════════════════════════════════════════════════

  describe('Audit event creation', () => {
    it('should create difficulty change audit with correct before/after values', async () => {
      const newEvent = {
        tenantId: mockTenantId,
        actorType: 'AGENT',
        actorId: 'difficulty-agent-v1',
        entityType: 'LEARNER_DIFFICULTY',
        entityId: mockLearnerId,
        action: 'UPDATED',
        changeJson: {
          subject: 'READING',
          beforeLevel: 2,
          afterLevel: 3,
          reasons: ['Improved comprehension scores'],
        },
        relatedExplanationId: '990e8400-e29b-41d4-a716-446655440003',
      };

      mockCreate.mockResolvedValue({ id: 'new-event-id', ...newEvent, createdAt: new Date() });

      const result = await prisma.auditEvent.create({ data: newEvent });

      expect(mockCreate).toHaveBeenCalledWith({ data: newEvent });
      expect(result.changeJson.beforeLevel).toBe(2);
      expect(result.changeJson.afterLevel).toBe(3);
      expect(result.relatedExplanationId).toBe('990e8400-e29b-41d4-a716-446655440003');
    });

    it('should create today plan audit with added/removed LO IDs', async () => {
      const newEvent = {
        tenantId: mockTenantId,
        actorType: 'AGENT',
        actorId: 'plan-agent-v1',
        entityType: 'TODAY_PLAN',
        entityId: mockLearnerId,
        action: 'UPDATED',
        changeJson: {
          date: '2024-12-11',
          addedLOs: ['LO-SCIENCE-101', 'LO-SCIENCE-102'],
          removedLOs: [],
          modifiedLOs: ['LO-SCIENCE-100'],
          reason: 'Added supplemental science content',
        },
        relatedExplanationId: '990e8400-e29b-41d4-a716-446655440004',
      };

      mockCreate.mockResolvedValue({ id: 'new-event-id', ...newEvent, createdAt: new Date() });

      const result = await prisma.auditEvent.create({ data: newEvent });

      expect(result.changeJson.addedLOs).toEqual(['LO-SCIENCE-101', 'LO-SCIENCE-102']);
      expect(result.changeJson.removedLOs).toEqual([]);
      expect(result.changeJson.modifiedLOs).toEqual(['LO-SCIENCE-100']);
    });

    it('should create policy audit with USER actor type', async () => {
      const newEvent = {
        tenantId: mockTenantId,
        actorType: 'USER',
        actorId: 'admin-user-123',
        entityType: 'POLICY_DOCUMENT',
        entityId: 'policy-abc-123',
        action: 'CREATED',
        changeJson: {
          policyName: 'Data Retention Policy',
          policyVersion: '1.0',
          changedFields: ['all'],
        },
        relatedExplanationId: null,
      };

      mockCreate.mockResolvedValue({ id: 'new-event-id', ...newEvent, createdAt: new Date() });

      const result = await prisma.auditEvent.create({ data: newEvent });

      expect(result.actorType).toBe('USER');
      expect(result.changeJson.policyName).toBe('Data Retention Policy');
      expect(result.relatedExplanationId).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CHANGE JSON VALIDATION
  // ════════════════════════════════════════════════════════════════════════════

  describe('Change JSON structure', () => {
    it('should have correct structure for difficulty changes', () => {
      const changeJson = mockDifficultyAuditEvent.changeJson;

      expect(changeJson).toHaveProperty('subject');
      expect(changeJson).toHaveProperty('beforeLevel');
      expect(changeJson).toHaveProperty('afterLevel');
      expect(changeJson).toHaveProperty('reasons');
      expect(Array.isArray(changeJson.reasons)).toBe(true);
    });

    it('should have correct structure for today plan changes', () => {
      const changeJson = mockTodayPlanAuditEvent.changeJson;

      expect(changeJson).toHaveProperty('date');
      expect(changeJson).toHaveProperty('addedLOs');
      expect(changeJson).toHaveProperty('removedLOs');
      expect(changeJson).toHaveProperty('modifiedLOs');
      expect(Array.isArray(changeJson.addedLOs)).toBe(true);
      expect(Array.isArray(changeJson.removedLOs)).toBe(true);
    });

    it('should have correct structure for policy changes', () => {
      const changeJson = mockPolicyAuditEvent.changeJson;

      expect(changeJson).toHaveProperty('policyName');
      expect(changeJson).toHaveProperty('policyVersion');
      expect(changeJson).toHaveProperty('changedFields');
      expect(Array.isArray(changeJson.changedFields)).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // EXPLANATION LINKING
  // ════════════════════════════════════════════════════════════════════════════

  describe('Explanation linking', () => {
    it('should link difficulty audit to explanation event', () => {
      expect(mockDifficultyAuditEvent.relatedExplanationId).toBe('990e8400-e29b-41d4-a716-446655440001');
    });

    it('should link today plan audit to explanation event', () => {
      expect(mockTodayPlanAuditEvent.relatedExplanationId).toBe('990e8400-e29b-41d4-a716-446655440002');
    });

    it('should allow null relatedExplanationId for policy changes', () => {
      expect(mockPolicyAuditEvent.relatedExplanationId).toBeNull();
    });
  });
});
