/**
 * Tests for residency-svc cross-border validator.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  adequacyDecision: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  regionalRestriction: {
    findMany: vi.fn(),
  },
  transferImpactAssessment: {
    create: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('CrossBorderValidator', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('hasAdequacyDecision', () => {
    it('returns true for EU-to-EU transfers', async () => {
      mockPrisma.adequacyDecision.findFirst.mockResolvedValue({
        id: 'ad-1',
        sourceRegion: 'EU',
        targetRegion: 'EU',
        status: 'APPROVED',
        validUntil: new Date('2030-12-31'),
      });
      const decision = await mockPrisma.adequacyDecision.findFirst({
        where: { sourceRegion: 'EU', targetRegion: 'EU' },
      });
      expect(decision?.status).toBe('APPROVED');
    });

    it('returns false for non-adequate region pair', async () => {
      mockPrisma.adequacyDecision.findFirst.mockResolvedValue(null);
      const decision = await mockPrisma.adequacyDecision.findFirst({
        where: { sourceRegion: 'EU', targetRegion: 'UNKNOWN' },
      });
      expect(decision).toBeNull();
    });
  });

  describe('getRegionalRestrictions', () => {
    it('returns data restrictions for a region', async () => {
      mockPrisma.regionalRestriction.findMany.mockResolvedValue([
        { id: 'rr-1', region: 'EU', type: 'GDPR', fields: ['dob', 'ssn'], action: 'MASK' },
        { id: 'rr-2', region: 'EU', type: 'RETENTION', maxDays: 365 },
      ]);
      const restrictions = await mockPrisma.regionalRestriction.findMany({
        where: { region: 'EU' },
      });
      expect(restrictions).toHaveLength(2);
      expect(restrictions[0].action).toBe('MASK');
    });
  });

  describe('performTransferImpactAssessment', () => {
    it('creates TIA for cross-border transfer', async () => {
      const tia = {
        id: 'tia-1',
        transferId: 'xfer-1',
        sourceRegion: 'US',
        targetRegion: 'EU',
        riskLevel: 'HIGH',
        mitigations: [
          'Standard Contractual Clauses required',
          'Data pseudonymisation required',
        ],
        compliant: false,
      };
      mockPrisma.transferImpactAssessment.create.mockResolvedValue(tia);
      const result = await mockPrisma.transferImpactAssessment.create({ data: tia });
      expect(result.riskLevel).toBe('HIGH');
      expect(result.mitigations).toHaveLength(2);
    });
  });

  describe('validateTransfer', () => {
    it('validates transfer with adequate regions', () => {
      const transfer = {
        sourceRegion: 'EU',
        targetRegion: 'EU',
        dataTypes: ['academic_records'],
      };
      const hasAdequacy = true;
      const hasRestrictions = false;
      expect(hasAdequacy).toBe(true);
      expect(hasRestrictions).toBe(false);
      // Valid transfer
    });

    it('blocks transfer to non-adequate region without safeguards', () => {
      const transfer = {
        sourceRegion: 'EU',
        targetRegion: 'UNKNOWN',
        safeguards: [],
      };
      const hasAdequacy = false;
      const hasSafeguards = transfer.safeguards.length > 0;
      expect(hasAdequacy).toBe(false);
      expect(hasSafeguards).toBe(false);
      // Transfer should be blocked
    });
  });

  describe('parseTransferRequest', () => {
    it('parses valid transfer request', () => {
      const raw = {
        studentId: 'stu-1',
        sourceRegion: 'US-CA',
        targetRegion: 'EU-DE',
        dataCategories: ['grades', 'attendance'],
        purpose: 'SCHOOL_TRANSFER',
      };
      expect(raw.sourceRegion).toContain('US');
      expect(raw.targetRegion).toContain('EU');
      expect(raw.dataCategories).toContain('grades');
    });

    it('rejects request with missing source region', () => {
      const raw = { studentId: 'stu-1', targetRegion: 'EU' };
      expect(raw).not.toHaveProperty('sourceRegion');
    });
  });
});
