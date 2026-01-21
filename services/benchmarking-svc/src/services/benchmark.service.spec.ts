/**
 * Benchmark Service Unit Tests
 *
 * Tests for district benchmarking: comparisons, rankings, peer matching,
 * anonymization thresholds, and percentile calculations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK TYPES
// ══════════════════════════════════════════════════════════════════════════════

type MetricCategory = 'ACADEMIC' | 'ENGAGEMENT' | 'AI_EFFECTIVENESS' | 'OPERATIONAL';

interface BenchmarkParticipant {
  id: string;
  tenantId: string;
  districtName: string;
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';
  geographicType: 'URBAN' | 'SUBURBAN' | 'RURAL';
  studentCount: number;
  freeReducedLunchPct: number | null;
  state: string;
  gradeLevelsServed: string[];
  shareAcademicData: boolean;
  shareEngagementData: boolean;
  shareAiEffectiveness: boolean;
  shareOperationalData: boolean;
  allowPeerContact: boolean;
  enrolledAt: Date;
}

interface BenchmarkMetric {
  id: string;
  participantId: string;
  metricKey: string;
  metricValue: number;
  category: MetricCategory;
  periodStart: Date;
  periodEnd: Date;
}

interface CohortAggregate {
  id: string;
  cohortId: string;
  metricKey: string;
  category: MetricCategory;
  mean: number;
  median: number;
  stdDev: number;
  p25: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
  sampleCount: number;
  periodStart: Date;
  periodEnd: Date;
  cohort: { id: string; name: string };
}

interface AnonymizationConfig {
  minCohortSize: number;
  differentialPrivacyEpsilon: number;
  suppressBelowThreshold: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK PRISMA
// ══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  benchmarkParticipant: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  benchmarkMetric: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  cohortAggregate: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  cohortMembership: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  benchmarkCohort: {
    findMany: vi.fn(),
  },
  metricDefinition: {
    findMany: vi.fn(),
  },
  benchmarkAuditLog: {
    create: vi.fn(),
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// MOCK BENCHMARK SERVICE
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_ANONYMIZATION_CONFIG: AnonymizationConfig = {
  minCohortSize: 5,
  differentialPrivacyEpsilon: 1.0,
  suppressBelowThreshold: true,
};

class BenchmarkService {
  private anonymizationConfig: AnonymizationConfig;

  constructor(
    private prisma: typeof mockPrisma,
    config?: Partial<AnonymizationConfig>
  ) {
    this.anonymizationConfig = { ...DEFAULT_ANONYMIZATION_CONFIG, ...config };
  }

  async getDistrictSummary(tenantId: string) {
    const participant = await this.prisma.benchmarkParticipant.findUnique({
      where: { tenantId },
      include: {
        cohortMemberships: { include: { cohort: true } },
        insights: { where: { validUntil: { gt: new Date() } }, orderBy: { priority: 'desc' } },
      },
    });

    if (participant?.status !== 'ACTIVE') {
      return null;
    }

    const metrics = await this.prisma.benchmarkMetric.findMany({
      where: {
        participantId: participant.id,
        periodEnd: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { periodEnd: 'desc' },
    });

    const categoryBreakdown = this.calculateCategoryBreakdowns(participant.id, metrics);
    const overallPercentile = this.calculateOverallPercentile(categoryBreakdown);

    return {
      participant: {
        id: participant.id,
        tenantId: participant.tenantId,
        districtName: participant.districtName,
        status: participant.status,
        size: participant.size,
        geographicType: participant.geographicType,
        studentCount: participant.studentCount,
      },
      overallPercentile,
      categoryBreakdown,
      topStrengths: [],
      topOpportunities: [],
      recentInsightsCount: 0,
    };
  }

  async compareWithPeers(
    tenantId: string,
    options: {
      cohortIds?: string[];
      categories?: MetricCategory[];
      periodStart?: Date;
      periodEnd?: Date;
    } = {}
  ) {
    const participant = await this.prisma.benchmarkParticipant.findUnique({
      where: { tenantId },
      include: { cohortMemberships: true },
    });

    if (participant?.status !== 'ACTIVE') {
      throw new Error('Participant not found or not active');
    }

    const cohortIds = options.cohortIds ?? participant.cohortMemberships.map((m: any) => m.cohortId);
    const periodEnd = options.periodEnd ?? new Date();
    const periodStart = options.periodStart ?? new Date(periodEnd.getTime() - 90 * 24 * 60 * 60 * 1000);

    const districtMetrics = await this.prisma.benchmarkMetric.findMany({
      where: {
        participantId: participant.id,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
        ...(options.categories ? { category: { in: options.categories } } : {}),
      },
    });

    const cohortAggregates = await this.prisma.cohortAggregate.findMany({
      where: {
        cohortId: { in: cohortIds },
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
        ...(options.categories ? { category: { in: options.categories } } : {}),
      },
      include: { cohort: true },
    });

    const metricDefs = await this.prisma.metricDefinition.findMany({
      where: { isActive: true },
    });
    const metricDefMap = new Map(metricDefs.map((m: any) => [m.key, m]));

    const comparisons: any[] = [];

    for (const metric of districtMetrics) {
      const relevantAggregates = cohortAggregates.filter((a: any) => a.metricKey === metric.metricKey);
      if (relevantAggregates.length === 0) continue;

      const aggregate = relevantAggregates[0];
      if (aggregate.sampleCount < this.anonymizationConfig.minCohortSize) {
        continue;
      }

      const metricDef = metricDefMap.get(metric.metricKey);
      const percentile = this.calculatePercentile(
        metric.metricValue,
        aggregate,
        metricDef?.higherIsBetter ?? true
      );

      comparisons.push({
        metricKey: metric.metricKey,
        metricName: metricDef?.name ?? metric.metricKey,
        category: metric.category,
        districtValue: metric.metricValue,
        cohortStats: {
          cohortId: aggregate.cohortId,
          cohortName: aggregate.cohort.name,
          mean: aggregate.mean,
          median: aggregate.median,
          stdDev: aggregate.stdDev,
          p25: aggregate.p25,
          p75: aggregate.p75,
          p90: aggregate.p90,
          min: aggregate.min,
          max: aggregate.max,
          sampleCount: aggregate.sampleCount,
        },
        percentileRank: percentile,
      });
    }

    await this.prisma.benchmarkAuditLog.create({
      data: {
        participantId: participant.id,
        action: 'view_comparison',
        actorId: tenantId,
        actorType: 'user',
        details: { cohortIds, metricsCompared: comparisons.length },
      },
    });

    return comparisons;
  }

  async getPeerRankings(tenantId: string, metricKey: string, cohortId?: string) {
    const participant = await this.prisma.benchmarkParticipant.findUnique({
      where: { tenantId },
    });

    if (participant?.status !== 'ACTIVE') {
      return null;
    }

    let targetCohortId = cohortId;
    if (!targetCohortId) {
      const membership = await this.prisma.cohortMembership.findFirst({
        where: { participantId: participant.id },
      });
      targetCohortId = membership?.cohortId;
    }

    if (!targetCohortId) {
      return null;
    }

    const cohortMembers = await this.prisma.cohortMembership.findMany({
      where: { cohortId: targetCohortId },
      include: { participant: true },
    });

    const activeMembers = cohortMembers.filter((m: any) => m.participant.status === 'ACTIVE');

    if (activeMembers.length < this.anonymizationConfig.minCohortSize) {
      return null;
    }

    const metrics = await this.prisma.benchmarkMetric.findMany({
      where: {
        participantId: { in: activeMembers.map((m: any) => m.participantId) },
        metricKey,
      },
      orderBy: { metricValue: 'desc' },
    });

    const districtMetric = metrics.find((m: any) => m.participantId === participant.id);
    const districtRank = districtMetric ? metrics.findIndex((m: any) => m.id === districtMetric.id) + 1 : -1;

    const values = metrics.map((m: any) => m.metricValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const bucketSize = (max - min) / 5 || 1;

    const distribution: { range: string; count: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const rangeMin = min + i * bucketSize;
      const rangeMax = min + (i + 1) * bucketSize;
      const count = values.filter((v: number) => v >= rangeMin && (i === 4 ? v <= rangeMax : v < rangeMax)).length;
      distribution.push({ range: `${rangeMin.toFixed(1)}-${rangeMax.toFixed(1)}`, count });
    }

    return { districtRank, totalPeers: metrics.length, distribution };
  }

  async findMatchingPeers(tenantId: string, criteria: {
    sizeRange?: string[];
    geographicTypes?: string[];
    states?: string[];
    minPeers?: number;
  }) {
    const participant = await this.prisma.benchmarkParticipant.findUnique({
      where: { tenantId },
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    const cohorts = await this.prisma.benchmarkCohort.findMany({
      where: {
        AND: [
          criteria.sizeRange?.length ? { sizeMin: { in: criteria.sizeRange } } : {},
          criteria.geographicTypes?.length ? { geographicTypes: { hasSome: criteria.geographicTypes } } : {},
          criteria.states?.length ? { states: { hasSome: criteria.states } } : {},
          criteria.minPeers ? { memberCount: { gte: criteria.minPeers } } : {},
        ],
      },
    });

    return cohorts.map((c: any) => ({
      cohortId: c.id,
      name: c.name,
      memberCount: c.memberCount,
    }));
  }

  calculatePercentile(
    value: number,
    aggregate: { mean: number; stdDev: number; p25: number; p75: number; p90: number; min: number; max: number },
    higherIsBetter: boolean
  ): number {
    if (value <= aggregate.min) return higherIsBetter ? 0 : 100;
    if (value >= aggregate.max) return higherIsBetter ? 100 : 0;

    let percentile: number;
    if (value < aggregate.p25) {
      percentile = 25 * ((value - aggregate.min) / (aggregate.p25 - aggregate.min));
    } else if (value < aggregate.mean) {
      percentile = 25 + 25 * ((value - aggregate.p25) / (aggregate.mean - aggregate.p25));
    } else if (value < aggregate.p75) {
      percentile = 50 + 25 * ((value - aggregate.mean) / (aggregate.p75 - aggregate.mean));
    } else if (value < aggregate.p90) {
      percentile = 75 + 15 * ((value - aggregate.p75) / (aggregate.p90 - aggregate.p75));
    } else {
      percentile = 90 + 10 * ((value - aggregate.p90) / (aggregate.max - aggregate.p90));
    }

    return higherIsBetter ? percentile : 100 - percentile;
  }

  private calculateCategoryBreakdowns(_participantId: string, metrics: BenchmarkMetric[]) {
    const categories: Record<string, { count: number; avgPercentile: number }> = {};
    for (const metric of metrics) {
      if (!categories[metric.category]) {
        categories[metric.category] = { count: 0, avgPercentile: 50 };
      }
      categories[metric.category].count++;
    }
    return categories;
  }

  private calculateOverallPercentile(categoryBreakdown: Record<string, { count: number; avgPercentile: number }>) {
    const values = Object.values(categoryBreakdown);
    if (values.length === 0) return 50;
    return values.reduce((sum, cat) => sum + cat.avgPercentile, 0) / values.length;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FACTORIES
// ══════════════════════════════════════════════════════════════════════════════

function createMockParticipant(overrides: Partial<BenchmarkParticipant> = {}): BenchmarkParticipant {
  return {
    id: 'part-123',
    tenantId: 'tenant-123',
    districtName: 'Test District',
    status: 'ACTIVE',
    size: 'MEDIUM',
    geographicType: 'SUBURBAN',
    studentCount: 5000,
    freeReducedLunchPct: 45,
    state: 'TX',
    gradeLevelsServed: ['K', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
    shareAcademicData: true,
    shareEngagementData: true,
    shareAiEffectiveness: true,
    shareOperationalData: false,
    allowPeerContact: true,
    enrolledAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createMockMetric(overrides: Partial<BenchmarkMetric> = {}): BenchmarkMetric {
  return {
    id: 'metric-123',
    participantId: 'part-123',
    metricKey: 'avg_reading_score',
    metricValue: 75.5,
    category: 'ACADEMIC',
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-03-31'),
    ...overrides,
  };
}

function createMockAggregate(overrides: Partial<CohortAggregate> = {}): CohortAggregate {
  return {
    id: 'agg-123',
    cohortId: 'cohort-123',
    metricKey: 'avg_reading_score',
    category: 'ACADEMIC',
    mean: 70,
    median: 72,
    stdDev: 10,
    p25: 62,
    p75: 78,
    p90: 85,
    min: 45,
    max: 95,
    sampleCount: 50,
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-03-31'),
    cohort: { id: 'cohort-123', name: 'Medium Suburban Districts' },
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ══════════════════════════════════════════════════════════════════════════════

describe('BenchmarkService', () => {
  let service: BenchmarkService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BenchmarkService(mockPrisma);
  });

  describe('constructor', () => {
    it('should create service with default anonymization config', () => {
      const service = new BenchmarkService(mockPrisma);
      expect(service).toBeDefined();
    });

    it('should create service with custom anonymization config', () => {
      const service = new BenchmarkService(mockPrisma, {
        minCohortSize: 10,
        differentialPrivacyEpsilon: 0.5,
      });
      expect(service).toBeDefined();
    });
  });

  describe('getDistrictSummary', () => {
    it('should return summary for active participant', async () => {
      const participant = createMockParticipant();
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce({
        ...participant,
        cohortMemberships: [{ cohortId: 'c1', cohort: { id: 'c1', name: 'Test Cohort' } }],
        insights: [],
      });
      mockPrisma.benchmarkMetric.findMany.mockResolvedValueOnce([
        createMockMetric(),
        createMockMetric({ metricKey: 'avg_math_score', metricValue: 72 }),
      ]);

      const result = await service.getDistrictSummary('tenant-123');

      expect(result).not.toBeNull();
      expect(result?.participant.districtName).toBe('Test District');
      expect(result?.participant.status).toBe('ACTIVE');
    });

    it('should return null for inactive participant', async () => {
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce({
        ...createMockParticipant({ status: 'INACTIVE' }),
        cohortMemberships: [],
        insights: [],
      });

      const result = await service.getDistrictSummary('tenant-123');

      expect(result).toBeNull();
    });

    it('should return null for non-existent participant', async () => {
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce(null);

      const result = await service.getDistrictSummary('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('compareWithPeers', () => {
    it('should compare district with peer cohorts', async () => {
      const participant = createMockParticipant();
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce({
        ...participant,
        cohortMemberships: [{ cohortId: 'cohort-123' }],
      });
      mockPrisma.benchmarkMetric.findMany.mockResolvedValueOnce([createMockMetric()]);
      mockPrisma.cohortAggregate.findMany.mockResolvedValueOnce([createMockAggregate()]);
      mockPrisma.metricDefinition.findMany.mockResolvedValueOnce([
        { key: 'avg_reading_score', name: 'Average Reading Score', higherIsBetter: true, isActive: true },
      ]);
      mockPrisma.benchmarkAuditLog.create.mockResolvedValueOnce({});

      const result = await service.compareWithPeers('tenant-123');

      expect(result).toHaveLength(1);
      expect(result[0].metricKey).toBe('avg_reading_score');
      expect(result[0].districtValue).toBe(75.5);
      expect(result[0].cohortStats.mean).toBe(70);
      expect(result[0].percentileRank).toBeGreaterThan(50);
    });

    it('should filter by categories', async () => {
      const participant = createMockParticipant();
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce({
        ...participant,
        cohortMemberships: [{ cohortId: 'cohort-123' }],
      });
      mockPrisma.benchmarkMetric.findMany.mockResolvedValueOnce([]);
      mockPrisma.cohortAggregate.findMany.mockResolvedValueOnce([]);
      mockPrisma.metricDefinition.findMany.mockResolvedValueOnce([]);
      mockPrisma.benchmarkAuditLog.create.mockResolvedValueOnce({});

      await service.compareWithPeers('tenant-123', { categories: ['ACADEMIC'] });

      expect(mockPrisma.benchmarkMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { in: ['ACADEMIC'] },
          }),
        })
      );
    });

    it('should suppress comparisons below anonymization threshold', async () => {
      const participant = createMockParticipant();
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce({
        ...participant,
        cohortMemberships: [{ cohortId: 'cohort-123' }],
      });
      mockPrisma.benchmarkMetric.findMany.mockResolvedValueOnce([createMockMetric()]);
      mockPrisma.cohortAggregate.findMany.mockResolvedValueOnce([
        createMockAggregate({ sampleCount: 3 }), // Below threshold of 5
      ]);
      mockPrisma.metricDefinition.findMany.mockResolvedValueOnce([]);
      mockPrisma.benchmarkAuditLog.create.mockResolvedValueOnce({});

      const result = await service.compareWithPeers('tenant-123');

      expect(result).toHaveLength(0); // Suppressed
    });

    it('should throw error for inactive participant', async () => {
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce({
        ...createMockParticipant({ status: 'INACTIVE' }),
        cohortMemberships: [],
      });

      await expect(service.compareWithPeers('tenant-123')).rejects.toThrow(
        'Participant not found or not active'
      );
    });

    it('should log comparison access', async () => {
      const participant = createMockParticipant();
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce({
        ...participant,
        cohortMemberships: [{ cohortId: 'cohort-123' }],
      });
      mockPrisma.benchmarkMetric.findMany.mockResolvedValueOnce([]);
      mockPrisma.cohortAggregate.findMany.mockResolvedValueOnce([]);
      mockPrisma.metricDefinition.findMany.mockResolvedValueOnce([]);
      mockPrisma.benchmarkAuditLog.create.mockResolvedValueOnce({});

      await service.compareWithPeers('tenant-123');

      expect(mockPrisma.benchmarkAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          participantId: participant.id,
          action: 'view_comparison',
          actorType: 'user',
        }),
      });
    });
  });

  describe('getPeerRankings', () => {
    it('should return rankings for valid participant', async () => {
      const participant = createMockParticipant();
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce(participant);
      mockPrisma.cohortMembership.findFirst.mockResolvedValueOnce({ cohortId: 'cohort-123' });
      mockPrisma.cohortMembership.findMany.mockResolvedValueOnce([
        { participantId: 'part-123', participant: { status: 'ACTIVE' } },
        { participantId: 'part-456', participant: { status: 'ACTIVE' } },
        { participantId: 'part-789', participant: { status: 'ACTIVE' } },
        { participantId: 'part-abc', participant: { status: 'ACTIVE' } },
        { participantId: 'part-def', participant: { status: 'ACTIVE' } },
      ]);
      mockPrisma.benchmarkMetric.findMany.mockResolvedValueOnce([
        { id: 'm1', participantId: 'part-456', metricValue: 85 },
        { id: 'm2', participantId: 'part-123', metricValue: 75.5 },
        { id: 'm3', participantId: 'part-789', metricValue: 70 },
        { id: 'm4', participantId: 'part-abc', metricValue: 65 },
        { id: 'm5', participantId: 'part-def', metricValue: 60 },
      ]);

      const result = await service.getPeerRankings('tenant-123', 'avg_reading_score');

      expect(result).not.toBeNull();
      expect(result?.districtRank).toBe(2);
      expect(result?.totalPeers).toBe(5);
      expect(result?.distribution).toHaveLength(5);
    });

    it('should return null for inactive participant', async () => {
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce(
        createMockParticipant({ status: 'PENDING' })
      );

      const result = await service.getPeerRankings('tenant-123', 'avg_reading_score');

      expect(result).toBeNull();
    });

    it('should return null if no cohort membership', async () => {
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce(createMockParticipant());
      mockPrisma.cohortMembership.findFirst.mockResolvedValueOnce(null);

      const result = await service.getPeerRankings('tenant-123', 'avg_reading_score');

      expect(result).toBeNull();
    });

    it('should return null if below anonymization threshold', async () => {
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce(createMockParticipant());
      mockPrisma.cohortMembership.findFirst.mockResolvedValueOnce({ cohortId: 'cohort-123' });
      mockPrisma.cohortMembership.findMany.mockResolvedValueOnce([
        { participantId: 'part-123', participant: { status: 'ACTIVE' } },
        { participantId: 'part-456', participant: { status: 'ACTIVE' } },
      ]); // Only 2 active members, below threshold of 5

      const result = await service.getPeerRankings('tenant-123', 'avg_reading_score');

      expect(result).toBeNull();
    });

    it('should use provided cohortId', async () => {
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce(createMockParticipant());
      mockPrisma.cohortMembership.findMany.mockResolvedValueOnce([
        { participantId: 'part-123', participant: { status: 'ACTIVE' } },
        { participantId: 'part-456', participant: { status: 'ACTIVE' } },
        { participantId: 'part-789', participant: { status: 'ACTIVE' } },
        { participantId: 'part-abc', participant: { status: 'ACTIVE' } },
        { participantId: 'part-def', participant: { status: 'ACTIVE' } },
      ]);
      mockPrisma.benchmarkMetric.findMany.mockResolvedValueOnce([]);

      await service.getPeerRankings('tenant-123', 'avg_reading_score', 'specific-cohort');

      expect(mockPrisma.cohortMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cohortId: 'specific-cohort' },
        })
      );
    });
  });

  describe('findMatchingPeers', () => {
    it('should find cohorts matching criteria', async () => {
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce(createMockParticipant());
      mockPrisma.benchmarkCohort.findMany.mockResolvedValueOnce([
        { id: 'c1', name: 'Medium Suburban TX', memberCount: 25 },
        { id: 'c2', name: 'Medium Suburban Southwest', memberCount: 40 },
      ]);

      const result = await service.findMatchingPeers('tenant-123', {
        sizeRange: ['MEDIUM'],
        geographicTypes: ['SUBURBAN'],
        states: ['TX'],
        minPeers: 20,
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Medium Suburban TX');
    });

    it('should throw error for non-existent participant', async () => {
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.findMatchingPeers('non-existent', {})
      ).rejects.toThrow('Participant not found');
    });

    it('should return empty array if no matching cohorts', async () => {
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce(createMockParticipant());
      mockPrisma.benchmarkCohort.findMany.mockResolvedValueOnce([]);

      const result = await service.findMatchingPeers('tenant-123', {
        sizeRange: ['XLARGE'],
        geographicTypes: ['RURAL'],
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('calculatePercentile', () => {
    const aggregate = {
      mean: 70,
      stdDev: 10,
      p25: 62,
      p75: 78,
      p90: 85,
      min: 45,
      max: 95,
    };

    it('should return 0 for min value when higher is better', () => {
      const percentile = service.calculatePercentile(45, aggregate, true);
      expect(percentile).toBe(0);
    });

    it('should return 100 for max value when higher is better', () => {
      const percentile = service.calculatePercentile(95, aggregate, true);
      expect(percentile).toBe(100);
    });

    it('should return 100 for min value when lower is better', () => {
      const percentile = service.calculatePercentile(45, aggregate, false);
      expect(percentile).toBe(100);
    });

    it('should return 0 for max value when lower is better', () => {
      const percentile = service.calculatePercentile(95, aggregate, false);
      expect(percentile).toBe(0);
    });

    it('should calculate percentile for value below p25', () => {
      const percentile = service.calculatePercentile(53.5, aggregate, true);
      expect(percentile).toBeGreaterThan(0);
      expect(percentile).toBeLessThan(25);
    });

    it('should calculate percentile for value at mean', () => {
      const percentile = service.calculatePercentile(70, aggregate, true);
      expect(percentile).toBe(50);
    });

    it('should calculate percentile for value between p75 and p90', () => {
      const percentile = service.calculatePercentile(82, aggregate, true);
      expect(percentile).toBeGreaterThan(75);
      expect(percentile).toBeLessThan(90);
    });

    it('should calculate percentile for value above p90', () => {
      const percentile = service.calculatePercentile(90, aggregate, true);
      expect(percentile).toBeGreaterThan(90);
      expect(percentile).toBeLessThan(100);
    });
  });

  describe('anonymization config', () => {
    it('should use custom minCohortSize', async () => {
      const strictService = new BenchmarkService(mockPrisma, { minCohortSize: 10 });
      mockPrisma.benchmarkParticipant.findUnique.mockResolvedValueOnce({
        ...createMockParticipant(),
        cohortMemberships: [{ cohortId: 'cohort-123' }],
      });
      mockPrisma.benchmarkMetric.findMany.mockResolvedValueOnce([createMockMetric()]);
      mockPrisma.cohortAggregate.findMany.mockResolvedValueOnce([
        createMockAggregate({ sampleCount: 8 }), // Above default 5, below custom 10
      ]);
      mockPrisma.metricDefinition.findMany.mockResolvedValueOnce([]);
      mockPrisma.benchmarkAuditLog.create.mockResolvedValueOnce({});

      const result = await strictService.compareWithPeers('tenant-123');

      expect(result).toHaveLength(0); // Suppressed due to higher threshold
    });
  });
});
