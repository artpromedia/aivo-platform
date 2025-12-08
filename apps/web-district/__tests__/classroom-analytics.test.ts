import { describe, it, expect, vi } from 'vitest';
import {
  getIndependenceLabelText,
  getIndependenceLabelColor,
  fetchClassroomHomeworkUsage,
  fetchClassroomFocusPatterns,
  mockClassroomHomeworkUsage,
  mockClassroomFocusPatterns,
  type ClassroomHomeworkUsage,
  type ClassroomFocusPatterns,
  type IndependenceLabel,
} from '../lib/classroom-analytics';

// ══════════════════════════════════════════════════════════════════════════════
// INDEPENDENCE LABEL HELPERS
// ══════════════════════════════════════════════════════════════════════════════

describe('Independence Label Helpers', () => {
  describe('getIndependenceLabelText', () => {
    it('returns correct text for each label', () => {
      expect(getIndependenceLabelText('needs_support')).toBe('Needs Support');
      expect(getIndependenceLabelText('building_independence')).toBe('Building Independence');
      expect(getIndependenceLabelText('mostly_independent')).toBe('Mostly Independent');
    });
  });

  describe('getIndependenceLabelColor', () => {
    it('returns correct color classes for each label', () => {
      expect(getIndependenceLabelColor('needs_support')).toBe('text-orange-600 bg-orange-100');
      expect(getIndependenceLabelColor('building_independence')).toBe('text-blue-600 bg-blue-100');
      expect(getIndependenceLabelColor('mostly_independent')).toBe('text-green-600 bg-green-100');
    });

    it('returns default color for unknown label', () => {
      expect(getIndependenceLabelColor('unknown' as any)).toBe('text-gray-600 bg-gray-100');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA GENERATORS
// ══════════════════════════════════════════════════════════════════════════════

describe('Mock Data Generators', () => {
  describe('mockClassroomHomeworkUsage', () => {
    it('returns valid homework usage structure', () => {
      const data = mockClassroomHomeworkUsage('classroom-1');
      
      expect(data).toHaveProperty('classroomId', 'classroom-1');
      expect(data).toHaveProperty('periodDays');
      expect(data).toHaveProperty('totalLearners');
      expect(data).toHaveProperty('learnersWithHomework');
      expect(data).toHaveProperty('avgSessionsPerWeekPerLearner');
      expect(data).toHaveProperty('independenceDistribution');
      expect(data).toHaveProperty('learnerMetrics');
    });

    it('generates valid independence distribution', () => {
      const data = mockClassroomHomeworkUsage('classroom-1');
      const dist = data.independenceDistribution;
      
      expect(dist).toHaveProperty('needsSupport');
      expect(dist).toHaveProperty('buildingIndependence');
      expect(dist).toHaveProperty('mostlyIndependent');
      
      // Sum should equal total learners
      expect(dist.needsSupport + dist.buildingIndependence + dist.mostlyIndependent)
        .toBe(data.totalLearners);
    });

    it('generates learner metrics with valid labels', () => {
      const data = mockClassroomHomeworkUsage('classroom-1');
      
      for (const learner of data.learnerMetrics) {
        expect(learner).toHaveProperty('learnerId');
        expect(learner).toHaveProperty('learnerName');
        expect(learner).toHaveProperty('homeworkSessionsPerWeek');
        expect(learner).toHaveProperty('independenceScore');
        expect(learner).toHaveProperty('independenceLabel');
        
        // Validate score-to-label consistency
        const { independenceScore, independenceLabel } = learner;
        if (independenceScore < 0.3) {
          expect(independenceLabel).toBe('needs_support');
        } else if (independenceScore < 0.7) {
          expect(independenceLabel).toBe('building_independence');
        } else {
          expect(independenceLabel).toBe('mostly_independent');
        }
      }
    });
  });

  describe('mockClassroomFocusPatterns', () => {
    it('returns valid focus patterns structure', () => {
      const data = mockClassroomFocusPatterns('classroom-1');
      
      expect(data).toHaveProperty('classroomId', 'classroom-1');
      expect(data).toHaveProperty('periodDays');
      expect(data).toHaveProperty('avgBreaksPerSession');
      expect(data).toHaveProperty('sessionsWithFocusLoss');
      expect(data).toHaveProperty('totalSessions');
      expect(data).toHaveProperty('patternsByTime');
      expect(data).toHaveProperty('learnerMetrics');
    });

    it('generates patterns by time data', () => {
      const data = mockClassroomFocusPatterns('classroom-1');
      const patterns = data.patternsByTime;
      
      // Should have data for at least some time periods
      expect(patterns.length).toBeGreaterThan(0);
      
      for (const pattern of patterns) {
        expect(pattern).toHaveProperty('hour');
        expect(pattern).toHaveProperty('avgBreaks');
        expect(pattern).toHaveProperty('focusLossCount');
        expect(typeof pattern.avgBreaks).toBe('number');
      }
    });

    it('generates valid learner focus metrics', () => {
      const data = mockClassroomFocusPatterns('classroom-1');
      
      for (const learner of data.learnerMetrics) {
        expect(learner).toHaveProperty('learnerId');
        expect(learner).toHaveProperty('learnerName');
        expect(learner).toHaveProperty('avgBreaksPerSession');
        expect(learner).toHaveProperty('sessionsWithFocusLoss');
        expect(learner).toHaveProperty('totalSessions');
        
        // Values should be non-negative
        expect(learner.avgBreaksPerSession).toBeGreaterThanOrEqual(0);
        expect(learner.sessionsWithFocusLoss).toBeGreaterThanOrEqual(0);
        expect(learner.totalSessions).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FETCH FUNCTIONS (MOCK MODE)
// ══════════════════════════════════════════════════════════════════════════════

describe('Fetch Functions', () => {
  const accessToken = 'test-token';

  describe('fetchClassroomHomeworkUsage', () => {
    it('returns mock data when USE_MOCK_ANALYTICS is true', async () => {
      // The library defaults to mock mode
      const data = await fetchClassroomHomeworkUsage('tenant-1', 'classroom-1', accessToken);
      
      expect(data).toHaveProperty('classroomId', 'classroom-1');
      expect(data).toHaveProperty('learnerMetrics');
      expect(Array.isArray(data.learnerMetrics)).toBe(true);
    });
  });

  describe('fetchClassroomFocusPatterns', () => {
    it('returns mock data when USE_MOCK_ANALYTICS is true', async () => {
      const data = await fetchClassroomFocusPatterns('tenant-1', 'classroom-1', accessToken);
      
      expect(data).toHaveProperty('classroomId', 'classroom-1');
      expect(data).toHaveProperty('patternsByTime');
      expect(data).toHaveProperty('learnerMetrics');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPE VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

describe('Type Contracts', () => {
  it('ClassroomHomeworkUsage matches expected interface', () => {
    const data: ClassroomHomeworkUsage = {
      classroomId: 'classroom-1',
      period: { days: 28, startDate: '2025-01-01', endDate: '2025-01-28' },
      totalLearners: 25,
      learnersWithHomework: 20,
      avgSessionsPerWeekPerLearner: 2.5,
      independenceDistribution: {
        needsSupport: 5,
        buildingIndependence: 10,
        mostlyIndependent: 5,
      },
      learnerMetrics: [
        {
          learnerId: 'learner-1',
          learnerName: 'Test Student',
          homeworkSessionsPerWeek: 3.0,
          avgStepsPerHomework: 5.5,
          independenceScore: 0.8,
          independenceLabel: 'mostly_independent',
          totalHomeworkSessions: 12,
        },
      ],
    };

    // TypeScript compile-time check plus runtime validation
    expect(data.classroomId).toBeDefined();
    expect(data.learnerMetrics[0].independenceLabel).toBe('mostly_independent');
  });

  it('ClassroomFocusPatterns matches expected interface', () => {
    const data: ClassroomFocusPatterns = {
      classroomId: 'classroom-1',
      period: { days: 28, startDate: '2025-01-01', endDate: '2025-01-28' },
      avgBreaksPerSession: 1.5,
      sessionsWithFocusLoss: 10,
      totalSessions: 100,
      focusLossPercentage: 10,
      patternsByTime: [
        { hour: 10, sessionsCount: 15, avgBreaks: 1.2, focusLossCount: 3 },
      ],
      learnerMetrics: [
        {
          learnerId: 'learner-1',
          learnerName: 'Test Student',
          avgBreaksPerSession: 1.3,
          sessionsWithFocusLoss: 2,
          totalSessions: 10,
          avgSessionDurationMinutes: 20,
        },
      ],
    };

    expect(data.patternsByTime[0].avgBreaks).toBe(1.2);
    expect(data.learnerMetrics[0].totalSessions).toBe(10);
  });
});
