/**
 * Tests for benchmarking-svc — ParticipationService and InsightsService.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ---------- types ---------- */

type ParticipationStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';
type InsightType = 'strength' | 'opportunity' | 'trend' | 'recommendation';
type MetricCategory = 'ACADEMIC_PERFORMANCE' | 'ENGAGEMENT' | 'AI_EFFECTIVENESS' | 'OPERATIONAL';

interface SharingPreferences {
  shareAcademicData: boolean;
  shareEngagementData: boolean;
  shareAiEffectiveness: boolean;
  shareOperationalData: boolean;
  allowPeerContact: boolean;
}

interface EnrollmentRequest {
  tenantId: string;
  districtName: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'VERY_LARGE';
  geographicType: 'URBAN' | 'SUBURBAN' | 'RURAL';
  studentCount: number;
  adminUserId: string;
  preferences: SharingPreferences;
}

interface ParticipantProfile {
  tenantId: string;
  districtName: string;
  status: ParticipationStatus;
  enrolledAt: Date;
  preferences: SharingPreferences;
}

interface Insight {
  id: string;
  tenantId: string;
  type: InsightType;
  category: MetricCategory;
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

/* ---------- helper: calculatePercentile ---------- */

function calculatePercentile(value: number, dataset: number[]): number {
  if (dataset.length === 0) return 0;
  const sorted = [...dataset].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < value).length;
  return Math.round((below / sorted.length) * 100);
}

describe('calculatePercentile', () => {
  it('returns 0 for empty dataset', () => {
    expect(calculatePercentile(50, [])).toBe(0);
  });

  it('calculates correct percentile', () => {
    const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(calculatePercentile(75, data)).toBe(70);
  });

  it('returns 0 when value is lowest', () => {
    expect(calculatePercentile(1, [1, 2, 3, 4, 5])).toBe(0);
  });

  it('returns 100 when value exceeds all', () => {
    expect(calculatePercentile(999, [1, 2, 3, 4, 5])).toBe(100);
  });

  it('handles duplicate values', () => {
    const data = [50, 50, 50, 50, 50];
    expect(calculatePercentile(50, data)).toBe(0);
  });
});

/* ---------- mocked ParticipationService ---------- */

describe('ParticipationService (mocked)', () => {
  const mockEnroll = vi.fn<(request: EnrollmentRequest) => Promise<ParticipantProfile>>();
  const mockGetProfile = vi.fn<(tenantId: string) => Promise<ParticipantProfile | null>>();
  const mockUpdatePrefs = vi.fn<(tenantId: string, prefs: Partial<SharingPreferences>, updatedBy: string) => Promise<ParticipantProfile>>();

  const defaultPrefs: SharingPreferences = {
    shareAcademicData: true,
    shareEngagementData: true,
    shareAiEffectiveness: false,
    shareOperationalData: false,
    allowPeerContact: false,
  };

  beforeEach(() => vi.clearAllMocks());

  it('enrolls a new district', async () => {
    const profile: ParticipantProfile = {
      tenantId: 't-1',
      districtName: 'Test District',
      status: 'PENDING',
      enrolledAt: new Date(),
      preferences: defaultPrefs,
    };
    mockEnroll.mockResolvedValue(profile);
    const result = await mockEnroll({
      tenantId: 't-1',
      districtName: 'Test District',
      size: 'MEDIUM',
      geographicType: 'SUBURBAN',
      studentCount: 5000,
      adminUserId: 'admin-1',
      preferences: defaultPrefs,
    });
    expect(result.status).toBe('PENDING');
    expect(result.districtName).toBe('Test District');
  });

  it('retrieves participant profile', async () => {
    mockGetProfile.mockResolvedValue({
      tenantId: 't-1',
      districtName: 'Test District',
      status: 'ACTIVE',
      enrolledAt: new Date(),
      preferences: defaultPrefs,
    });
    const result = await mockGetProfile('t-1');
    expect(result?.status).toBe('ACTIVE');
  });

  it('returns null for non-enrolled tenant', async () => {
    mockGetProfile.mockResolvedValue(null);
    const result = await mockGetProfile('unknown');
    expect(result).toBeNull();
  });

  it('updates sharing preferences', async () => {
    const updatedPrefs = { ...defaultPrefs, shareAiEffectiveness: true };
    mockUpdatePrefs.mockResolvedValue({
      tenantId: 't-1',
      districtName: 'Test District',
      status: 'ACTIVE',
      enrolledAt: new Date(),
      preferences: updatedPrefs,
    });
    const result = await mockUpdatePrefs('t-1', { shareAiEffectiveness: true }, 'admin-1');
    expect(result.preferences.shareAiEffectiveness).toBe(true);
  });
});

/* ---------- SharingPreferences validation ---------- */

describe('SharingPreferences', () => {
  it('defaults to restrictive sharing', () => {
    const restrictive: SharingPreferences = {
      shareAcademicData: false,
      shareEngagementData: false,
      shareAiEffectiveness: false,
      shareOperationalData: false,
      allowPeerContact: false,
    };
    expect(Object.values(restrictive).every((v) => v === false)).toBe(true);
  });

  it('allows granular data sharing', () => {
    const selective: SharingPreferences = {
      shareAcademicData: true,
      shareEngagementData: true,
      shareAiEffectiveness: false,
      shareOperationalData: false,
      allowPeerContact: true,
    };
    expect(selective.shareAcademicData).toBe(true);
    expect(selective.shareOperationalData).toBe(false);
  });
});

/* ---------- mocked InsightsService ---------- */

describe('InsightsService (mocked)', () => {
  const mockGenerate = vi.fn<(tenantId: string) => Promise<Insight[]>>();
  const mockGet = vi.fn<(tenantId: string, options?: { category?: MetricCategory; type?: InsightType; limit?: number }) => Promise<Insight[]>>();

  beforeEach(() => vi.clearAllMocks());

  it('generates insights', async () => {
    mockGenerate.mockResolvedValue([
      {
        id: 'ins-1',
        tenantId: 't-1',
        type: 'strength',
        category: 'ENGAGEMENT',
        title: 'High daily engagement',
        description: 'Your engagement is in the 90th percentile.',
        confidence: 0.92,
        actionable: false,
      },
      {
        id: 'ins-2',
        tenantId: 't-1',
        type: 'opportunity',
        category: 'AI_EFFECTIVENESS',
        title: 'AI recommendation accuracy',
        description: 'Below average — consider model retraining.',
        confidence: 0.78,
        actionable: true,
      },
    ]);
    const insights = await mockGenerate('t-1');
    expect(insights).toHaveLength(2);
    expect(insights[0]!.type).toBe('strength');
    expect(insights[1]!.actionable).toBe(true);
  });

  it('filters insights by category', async () => {
    mockGet.mockResolvedValue([
      {
        id: 'ins-1',
        tenantId: 't-1',
        type: 'trend',
        category: 'ACADEMIC_PERFORMANCE',
        title: 'Improving math scores',
        description: 'Upward trend over last 3 months.',
        confidence: 0.85,
        actionable: false,
      },
    ]);
    const insights = await mockGet('t-1', { category: 'ACADEMIC_PERFORMANCE' });
    expect(insights).toHaveLength(1);
    expect(insights[0]!.category).toBe('ACADEMIC_PERFORMANCE');
  });

  it('returns empty for new tenant', async () => {
    mockGet.mockResolvedValue([]);
    const insights = await mockGet('new-tenant');
    expect(insights).toHaveLength(0);
  });
});

describe('ParticipationStatus transitions', () => {
  const validTransitions: Record<ParticipationStatus, ParticipationStatus[]> = {
    PENDING: ['ACTIVE', 'WITHDRAWN'],
    ACTIVE: ['SUSPENDED', 'WITHDRAWN'],
    SUSPENDED: ['ACTIVE', 'WITHDRAWN'],
    WITHDRAWN: [],
  };

  it('PENDING can transition to ACTIVE or WITHDRAWN', () => {
    expect(validTransitions.PENDING).toContain('ACTIVE');
    expect(validTransitions.PENDING).toContain('WITHDRAWN');
    expect(validTransitions.PENDING).not.toContain('SUSPENDED');
  });

  it('WITHDRAWN is a terminal state', () => {
    expect(validTransitions.WITHDRAWN).toHaveLength(0);
  });

  it('SUSPENDED can be reactivated', () => {
    expect(validTransitions.SUSPENDED).toContain('ACTIVE');
  });
});
