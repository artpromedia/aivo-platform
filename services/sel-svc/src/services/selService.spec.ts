/**
 * SEL (Social-Emotional Learning) Service Unit Tests
 * Tests for student profiles, check-ins, assessments, and interventions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK TYPES
// ══════════════════════════════════════════════════════════════════════════════

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type CheckInType = 'MOOD' | 'ENERGY' | 'FULL' | 'QUICK';
type InterventionStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
type GoalStatus = 'ACTIVE' | 'ACHIEVED' | 'PAUSED';

interface MockStudentProfile {
  id: string;
  tenantId: string;
  studentId: string;
  riskLevel: RiskLevel;
  riskFactors: string[];
  protectiveFactors: string[];
  preferredCheckInTime?: string;
  preferredActivities: string[];
  strengths?: Record<string, unknown>;
  growthAreas?: Record<string, unknown>;
  lastCheckInAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface MockCheckIn {
  id: string;
  tenantId: string;
  studentProfileId: string;
  checkInType: CheckInType;
  moodRating: number;
  moodEmoji?: string;
  emotions: string[];
  energyLevel?: number;
  context?: string;
  reflection?: string;
  needsSupport: boolean;
  isPrivate: boolean;
  checkInTime: Date;
}

interface MockIntervention {
  id: string;
  tenantId: string;
  studentProfileId: string;
  type: string;
  title: string;
  description?: string;
  status: InterventionStatus;
  assignedTo?: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
}

interface MockGoal {
  id: string;
  tenantId: string;
  studentProfileId: string;
  title: string;
  description?: string;
  status: GoalStatus;
  targetDate?: Date;
  progress: number;
  milestones: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK PRISMA
// ══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  studentSELProfile: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  checkIn: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    aggregate: vi.fn(),
  },
  selAssessment: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  intervention: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  selGoal: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  alert: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function createMockProfile(overrides: Partial<MockStudentProfile> = {}): MockStudentProfile {
  return {
    id: 'profile-001',
    tenantId: 'tenant-001',
    studentId: 'student-001',
    riskLevel: 'LOW',
    riskFactors: [],
    protectiveFactors: ['Strong family support', 'Good peer relationships'],
    preferredActivities: ['journaling', 'breathing'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockCheckIn(overrides: Partial<MockCheckIn> = {}): MockCheckIn {
  return {
    id: 'checkin-001',
    tenantId: 'tenant-001',
    studentProfileId: 'profile-001',
    checkInType: 'MOOD',
    moodRating: 4,
    moodEmoji: '😊',
    emotions: ['happy', 'calm'],
    needsSupport: false,
    isPrivate: false,
    checkInTime: new Date(),
    ...overrides,
  };
}

function createMockIntervention(overrides: Partial<MockIntervention> = {}): MockIntervention {
  return {
    id: 'intervention-001',
    tenantId: 'tenant-001',
    studentProfileId: 'profile-001',
    type: 'counseling',
    title: 'Weekly Check-in',
    status: 'ACTIVE',
    startDate: new Date(),
    ...overrides,
  };
}

function createMockGoal(overrides: Partial<MockGoal> = {}): MockGoal {
  return {
    id: 'goal-001',
    tenantId: 'tenant-001',
    studentProfileId: 'profile-001',
    title: 'Practice mindfulness daily',
    status: 'ACTIVE',
    progress: 0,
    milestones: ['Complete 7 days', 'Complete 30 days'],
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SEL SERVICE LOGIC
// ══════════════════════════════════════════════════════════════════════════════

class SELService {
  constructor(private prisma: typeof mockPrisma) {}

  // Student Profile Management
  async createStudentProfile(tenantId: string, input: {
    studentId: string;
    riskLevel?: RiskLevel;
    riskFactors?: string[];
    protectiveFactors?: string[];
    preferredCheckInTime?: string;
    preferredActivities?: string[];
  }): Promise<MockStudentProfile> {
    return this.prisma.studentSELProfile.create({
      data: {
        tenantId,
        studentId: input.studentId,
        riskLevel: input.riskLevel || 'LOW',
        riskFactors: input.riskFactors || [],
        protectiveFactors: input.protectiveFactors || [],
        preferredCheckInTime: input.preferredCheckInTime,
        preferredActivities: input.preferredActivities || [],
      },
    }) as Promise<MockStudentProfile>;
  }

  async getStudentProfile(tenantId: string, profileId: string): Promise<MockStudentProfile | null> {
    return this.prisma.studentSELProfile.findFirst({
      where: { id: profileId, tenantId },
    }) as Promise<MockStudentProfile | null>;
  }

  async listStudentProfiles(tenantId: string, query: {
    riskLevel?: RiskLevel;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: MockStudentProfile[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } }> {
    const { riskLevel, search, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where = {
      tenantId,
      ...(riskLevel && { riskLevel }),
      ...(search && { studentId: { contains: search, mode: 'insensitive' } }),
    };

    const [profiles, totalItems] = await Promise.all([
      this.prisma.studentSELProfile.findMany({ where, skip, take: pageSize }) as Promise<MockStudentProfile[]>,
      this.prisma.studentSELProfile.count({ where }) as Promise<number>,
    ]);

    return {
      data: profiles,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  async updateRiskLevel(tenantId: string, profileId: string, riskLevel: RiskLevel, factors?: string[]): Promise<MockStudentProfile> {
    const updateData: Partial<MockStudentProfile> = { riskLevel };
    if (factors) {
      updateData.riskFactors = factors;
    }

    return this.prisma.studentSELProfile.update({
      where: { id: profileId },
      data: updateData,
    }) as Promise<MockStudentProfile>;
  }

  // Check-in Management
  async createCheckIn(tenantId: string, profileId: string, input: {
    checkInType?: CheckInType;
    moodRating: number;
    moodEmoji?: string;
    emotions?: string[];
    energyLevel?: number;
    context?: string;
    reflection?: string;
    needsSupport?: boolean;
    isPrivate?: boolean;
  }): Promise<MockCheckIn> {
    // Validate mood rating
    if (input.moodRating < 1 || input.moodRating > 5) {
      throw new Error('Mood rating must be between 1 and 5');
    }

    const checkIn = await this.prisma.checkIn.create({
      data: {
        tenantId,
        studentProfileId: profileId,
        checkInType: input.checkInType || 'MOOD',
        moodRating: input.moodRating,
        moodEmoji: input.moodEmoji,
        emotions: input.emotions || [],
        energyLevel: input.energyLevel,
        context: input.context,
        reflection: input.reflection,
        needsSupport: input.needsSupport || false,
        isPrivate: input.isPrivate || false,
      },
    }) as MockCheckIn;

    // Update profile last check-in
    await this.prisma.studentSELProfile.update({
      where: { id: profileId },
      data: { lastCheckInAt: new Date() },
    });

    // Check for alerts
    if (input.needsSupport || input.moodRating <= 2) {
      await this.createAlert(tenantId, profileId, checkIn);
    }

    return checkIn;
  }

  async getCheckInHistory(tenantId: string, profileId: string, options?: {
    days?: number;
    limit?: number;
  }): Promise<MockCheckIn[]> {
    const { days = 30, limit = 100 } = options || {};
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.checkIn.findMany({
      where: {
        tenantId,
        studentProfileId: profileId,
        checkInTime: { gte: startDate },
      },
      orderBy: { checkInTime: 'desc' },
      take: limit,
    }) as Promise<MockCheckIn[]>;
  }

  async getWeeklyMoodTrend(tenantId: string, profileId: string): Promise<{
    average: number;
    trend: 'improving' | 'stable' | 'declining';
    checkInCount: number;
  }> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [thisWeek, lastWeek] = await Promise.all([
      this.prisma.checkIn.aggregate({
        where: {
          tenantId,
          studentProfileId: profileId,
          checkInTime: { gte: weekAgo },
        },
        _avg: { moodRating: true },
        _count: true,
      }),
      this.prisma.checkIn.aggregate({
        where: {
          tenantId,
          studentProfileId: profileId,
          checkInTime: { gte: twoWeeksAgo, lt: weekAgo },
        },
        _avg: { moodRating: true },
      }),
    ]);

    const currentAvg = thisWeek._avg.moodRating || 0;
    const previousAvg = lastWeek._avg.moodRating || currentAvg;
    const difference = currentAvg - previousAvg;

    let trend: 'improving' | 'stable' | 'declining';
    if (difference > 0.3) trend = 'improving';
    else if (difference < -0.3) trend = 'declining';
    else trend = 'stable';

    return {
      average: currentAvg,
      trend,
      checkInCount: thisWeek._count,
    };
  }

  // Alert Management
  private async createAlert(tenantId: string, profileId: string, checkIn: MockCheckIn): Promise<void> {
    const alertType = checkIn.needsSupport ? 'SUPPORT_REQUESTED' : 'LOW_MOOD';
    const priority = checkIn.moodRating === 1 ? 'HIGH' : 'MEDIUM';

    await this.prisma.alert.create({
      data: {
        tenantId,
        studentProfileId: profileId,
        checkInId: checkIn.id,
        type: alertType,
        priority,
        status: 'PENDING',
      },
    });
  }

  // Intervention Management
  async createIntervention(tenantId: string, profileId: string, input: {
    type: string;
    title: string;
    description?: string;
    assignedTo?: string;
    endDate?: Date;
  }): Promise<MockIntervention> {
    return this.prisma.intervention.create({
      data: {
        tenantId,
        studentProfileId: profileId,
        type: input.type,
        title: input.title,
        description: input.description,
        status: 'ACTIVE',
        assignedTo: input.assignedTo,
        startDate: new Date(),
        endDate: input.endDate,
      },
    }) as Promise<MockIntervention>;
  }

  async completeIntervention(tenantId: string, interventionId: string, notes?: string): Promise<MockIntervention> {
    return this.prisma.intervention.update({
      where: { id: interventionId },
      data: {
        status: 'COMPLETED',
        endDate: new Date(),
        notes,
      },
    }) as Promise<MockIntervention>;
  }

  // Goal Management
  async createGoal(tenantId: string, profileId: string, input: {
    title: string;
    description?: string;
    targetDate?: Date;
    milestones?: string[];
  }): Promise<MockGoal> {
    return this.prisma.selGoal.create({
      data: {
        tenantId,
        studentProfileId: profileId,
        title: input.title,
        description: input.description,
        status: 'ACTIVE',
        targetDate: input.targetDate,
        progress: 0,
        milestones: input.milestones || [],
      },
    }) as Promise<MockGoal>;
  }

  async updateGoalProgress(tenantId: string, goalId: string, progress: number): Promise<MockGoal> {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    const updateData: Partial<MockGoal> = { progress };
    if (progress >= 100) {
      updateData.status = 'ACHIEVED';
    }

    return this.prisma.selGoal.update({
      where: { id: goalId },
      data: updateData,
    }) as Promise<MockGoal>;
  }

  // Risk Assessment
  calculateRiskScore(profile: MockStudentProfile, recentCheckIns: MockCheckIn[]): {
    score: number;
    level: RiskLevel;
    factors: string[];
  } {
    let score = 0;
    const factors: string[] = [];

    // Check recent mood ratings
    if (recentCheckIns.length > 0) {
      const avgMood = recentCheckIns.reduce((sum, c) => sum + c.moodRating, 0) / recentCheckIns.length;
      if (avgMood < 2) {
        score += 30;
        factors.push('Consistently low mood ratings');
      } else if (avgMood < 3) {
        score += 15;
        factors.push('Below average mood');
      }
    } else {
      score += 10;
      factors.push('No recent check-ins');
    }

    // Check for support requests
    const supportRequests = recentCheckIns.filter(c => c.needsSupport).length;
    if (supportRequests >= 3) {
      score += 25;
      factors.push('Multiple support requests');
    } else if (supportRequests >= 1) {
      score += 10;
      factors.push('Recent support request');
    }

    // Check risk factors
    score += profile.riskFactors.length * 5;
    if (profile.riskFactors.length > 0) {
      factors.push(`${profile.riskFactors.length} identified risk factors`);
    }

    // Protective factors reduce score
    score -= profile.protectiveFactors.length * 3;

    // Normalize score
    score = Math.max(0, Math.min(100, score));

    // Determine level
    let level: RiskLevel;
    if (score >= 70) level = 'CRITICAL';
    else if (score >= 50) level = 'HIGH';
    else if (score >= 25) level = 'MEDIUM';
    else level = 'LOW';

    return { score, level, factors };
  }

  // Emotion Analysis
  analyzeEmotionPatterns(checkIns: MockCheckIn[]): {
    mostCommon: string[];
    positive: number;
    negative: number;
    neutral: number;
  } {
    const emotionCounts: Record<string, number> = {};
    let positive = 0;
    let negative = 0;
    let neutral = 0;

    const positiveEmotions = ['happy', 'calm', 'excited', 'grateful', 'confident', 'hopeful'];
    const negativeEmotions = ['sad', 'anxious', 'angry', 'frustrated', 'scared', 'lonely'];

    for (const checkIn of checkIns) {
      for (const emotion of checkIn.emotions) {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        
        if (positiveEmotions.includes(emotion)) positive++;
        else if (negativeEmotions.includes(emotion)) negative++;
        else neutral++;
      }
    }

    const mostCommon = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([emotion]) => emotion);

    return { mostCommon, positive, negative, neutral };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('SELService', () => {
  let service: SELService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SELService(mockPrisma);
  });

  describe('Student Profile Management', () => {
    describe('createStudentProfile', () => {
      it('should create profile with default LOW risk level', async () => {
        const expectedProfile = createMockProfile({ riskLevel: 'LOW' });
        mockPrisma.studentSELProfile.create.mockResolvedValue(expectedProfile);

        const result = await service.createStudentProfile('tenant-001', {
          studentId: 'student-001',
        });

        expect(result.riskLevel).toBe('LOW');
      });

      it('should create profile with specified risk level', async () => {
        const expectedProfile = createMockProfile({ riskLevel: 'MEDIUM' });
        mockPrisma.studentSELProfile.create.mockResolvedValue(expectedProfile);

        const result = await service.createStudentProfile('tenant-001', {
          studentId: 'student-001',
          riskLevel: 'MEDIUM',
          riskFactors: ['Academic stress'],
        });

        expect(result.riskLevel).toBe('MEDIUM');
      });
    });

    describe('listStudentProfiles', () => {
      it('should return paginated results', async () => {
        const profiles = [createMockProfile(), createMockProfile({ id: 'profile-002' })];
        mockPrisma.studentSELProfile.findMany.mockResolvedValue(profiles);
        mockPrisma.studentSELProfile.count.mockResolvedValue(25);

        const result = await service.listStudentProfiles('tenant-001', { page: 1, pageSize: 20 });

        expect(result.data).toHaveLength(2);
        expect(result.pagination.totalItems).toBe(25);
        expect(result.pagination.totalPages).toBe(2);
      });

      it('should filter by risk level', async () => {
        mockPrisma.studentSELProfile.findMany.mockResolvedValue([]);
        mockPrisma.studentSELProfile.count.mockResolvedValue(0);

        await service.listStudentProfiles('tenant-001', { riskLevel: 'HIGH' });

        expect(mockPrisma.studentSELProfile.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ riskLevel: 'HIGH' }),
          })
        );
      });
    });
  });

  describe('Check-in Management', () => {
    describe('createCheckIn', () => {
      it('should create check-in with valid mood rating', async () => {
        const expectedCheckIn = createMockCheckIn({ moodRating: 4 });
        mockPrisma.checkIn.create.mockResolvedValue(expectedCheckIn);
        mockPrisma.studentSELProfile.update.mockResolvedValue({});

        const result = await service.createCheckIn('tenant-001', 'profile-001', {
          moodRating: 4,
          emotions: ['happy', 'calm'],
        });

        expect(result.moodRating).toBe(4);
      });

      it('should throw error for invalid mood rating', async () => {
        await expect(service.createCheckIn('tenant-001', 'profile-001', {
          moodRating: 6,
        })).rejects.toThrow('Mood rating must be between 1 and 5');

        await expect(service.createCheckIn('tenant-001', 'profile-001', {
          moodRating: 0,
        })).rejects.toThrow('Mood rating must be between 1 and 5');
      });

      it('should create alert for low mood', async () => {
        const expectedCheckIn = createMockCheckIn({ moodRating: 2 });
        mockPrisma.checkIn.create.mockResolvedValue(expectedCheckIn);
        mockPrisma.studentSELProfile.update.mockResolvedValue({});
        mockPrisma.alert.create.mockResolvedValue({});

        await service.createCheckIn('tenant-001', 'profile-001', {
          moodRating: 2,
        });

        expect(mockPrisma.alert.create).toHaveBeenCalled();
      });

      it('should create alert when support requested', async () => {
        const expectedCheckIn = createMockCheckIn({ moodRating: 3, needsSupport: true });
        mockPrisma.checkIn.create.mockResolvedValue(expectedCheckIn);
        mockPrisma.studentSELProfile.update.mockResolvedValue({});
        mockPrisma.alert.create.mockResolvedValue({});

        await service.createCheckIn('tenant-001', 'profile-001', {
          moodRating: 3,
          needsSupport: true,
        });

        expect(mockPrisma.alert.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ type: 'SUPPORT_REQUESTED' }),
          })
        );
      });
    });

    describe('getWeeklyMoodTrend', () => {
      it('should detect improving trend', async () => {
        mockPrisma.checkIn.aggregate
          .mockResolvedValueOnce({ _avg: { moodRating: 4 }, _count: 5 }) // this week
          .mockResolvedValueOnce({ _avg: { moodRating: 3 } }); // last week

        const result = await service.getWeeklyMoodTrend('tenant-001', 'profile-001');

        expect(result.trend).toBe('improving');
        expect(result.average).toBe(4);
      });

      it('should detect declining trend', async () => {
        mockPrisma.checkIn.aggregate
          .mockResolvedValueOnce({ _avg: { moodRating: 2 }, _count: 4 })
          .mockResolvedValueOnce({ _avg: { moodRating: 4 } });

        const result = await service.getWeeklyMoodTrend('tenant-001', 'profile-001');

        expect(result.trend).toBe('declining');
      });

      it('should detect stable trend', async () => {
        mockPrisma.checkIn.aggregate
          .mockResolvedValueOnce({ _avg: { moodRating: 3.5 }, _count: 7 })
          .mockResolvedValueOnce({ _avg: { moodRating: 3.4 } });

        const result = await service.getWeeklyMoodTrend('tenant-001', 'profile-001');

        expect(result.trend).toBe('stable');
      });
    });
  });

  describe('Goal Management', () => {
    describe('updateGoalProgress', () => {
      it('should update progress normally', async () => {
        const expectedGoal = createMockGoal({ progress: 50 });
        mockPrisma.selGoal.update.mockResolvedValue(expectedGoal);

        const result = await service.updateGoalProgress('tenant-001', 'goal-001', 50);

        expect(result.progress).toBe(50);
      });

      it('should mark as achieved at 100%', async () => {
        const expectedGoal = createMockGoal({ progress: 100, status: 'ACHIEVED' });
        mockPrisma.selGoal.update.mockResolvedValue(expectedGoal);

        await service.updateGoalProgress('tenant-001', 'goal-001', 100);

        expect(mockPrisma.selGoal.update).toHaveBeenCalledWith({
          where: { id: 'goal-001' },
          data: { progress: 100, status: 'ACHIEVED' },
        });
      });

      it('should throw error for invalid progress', async () => {
        await expect(service.updateGoalProgress('tenant-001', 'goal-001', -10))
          .rejects.toThrow('Progress must be between 0 and 100');

        await expect(service.updateGoalProgress('tenant-001', 'goal-001', 150))
          .rejects.toThrow('Progress must be between 0 and 100');
      });
    });
  });

  describe('Risk Assessment', () => {
    describe('calculateRiskScore', () => {
      it('should return LOW risk for healthy profile', () => {
        const profile = createMockProfile({
          riskFactors: [],
          protectiveFactors: ['Family', 'Friends', 'Sports'],
        });
        const checkIns = [
          createMockCheckIn({ moodRating: 4 }),
          createMockCheckIn({ moodRating: 5 }),
          createMockCheckIn({ moodRating: 4 }),
        ];

        const result = service.calculateRiskScore(profile, checkIns);

        expect(result.level).toBe('LOW');
        expect(result.score).toBeLessThan(25);
      });

      it('should return HIGH risk for concerning indicators', () => {
        const profile = createMockProfile({
          riskFactors: ['Family conflict', 'Academic failure', 'Social isolation'],
          protectiveFactors: [],
        });
        const checkIns = [
          createMockCheckIn({ moodRating: 2, needsSupport: true }),
          createMockCheckIn({ moodRating: 1, needsSupport: true }),
          createMockCheckIn({ moodRating: 2, needsSupport: true }),
        ];

        const result = service.calculateRiskScore(profile, checkIns);

        expect(result.level).toBe('HIGH');
        expect(result.factors).toContain('Consistently low mood ratings');
        expect(result.factors).toContain('Multiple support requests');
      });

      it('should factor in no recent check-ins', () => {
        const profile = createMockProfile();
        const checkIns: MockCheckIn[] = [];

        const result = service.calculateRiskScore(profile, checkIns);

        expect(result.factors).toContain('No recent check-ins');
      });
    });
  });

  describe('Emotion Analysis', () => {
    describe('analyzeEmotionPatterns', () => {
      it('should identify most common emotions', () => {
        const checkIns = [
          createMockCheckIn({ emotions: ['happy', 'calm'] }),
          createMockCheckIn({ emotions: ['happy', 'excited'] }),
          createMockCheckIn({ emotions: ['happy', 'calm', 'grateful'] }),
        ];

        const result = service.analyzeEmotionPatterns(checkIns);

        expect(result.mostCommon[0]).toBe('happy');
        expect(result.mostCommon).toContain('calm');
      });

      it('should categorize positive and negative emotions', () => {
        const checkIns = [
          createMockCheckIn({ emotions: ['happy', 'calm'] }),
          createMockCheckIn({ emotions: ['sad', 'anxious'] }),
          createMockCheckIn({ emotions: ['happy', 'tired'] }),
        ];

        const result = service.analyzeEmotionPatterns(checkIns);

        expect(result.positive).toBe(3); // happy, calm, happy
        expect(result.negative).toBe(2); // sad, anxious
        expect(result.neutral).toBe(1); // tired
      });

      it('should handle empty check-ins', () => {
        const result = service.analyzeEmotionPatterns([]);

        expect(result.mostCommon).toEqual([]);
        expect(result.positive).toBe(0);
        expect(result.negative).toBe(0);
      });
    });
  });
});
