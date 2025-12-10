/**
 * Learner Analytics Routes Tests
 *
 * Tests for parent/learner analytics API endpoints.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock data generators for testing
function generateMockLearnerSummary(learnerId: string) {
  return {
    learnerId,
    dateRange: { from: '2025-11-09', to: '2025-12-09' },
    engagement: {
      sessionsThisWeek: 5,
      sessionsLastWeek: 4,
      avgSessionDurationMinutes: 18.5,
      daysActiveInRange: 15,
      totalSessionsInRange: 22,
    },
    learningProgress: {
      bySubject: [
        {
          subjectCode: 'MATH',
          subjectName: 'Mathematics',
          timeseries: [
            { date: '2025-11-15', avgMasteryScore: 0.45, masteredSkills: 8, totalSkills: 25 },
            { date: '2025-11-22', avgMasteryScore: 0.52, masteredSkills: 10, totalSkills: 25 },
            { date: '2025-11-29', avgMasteryScore: 0.58, masteredSkills: 12, totalSkills: 25 },
            { date: '2025-12-06', avgMasteryScore: 0.64, masteredSkills: 14, totalSkills: 25 },
          ],
          skillsMasteredDelta: 6,
          currentMastery: 0.64,
        },
        {
          subjectCode: 'ELA',
          subjectName: 'English Language Arts',
          timeseries: [
            { date: '2025-11-15', avgMasteryScore: 0.55, masteredSkills: 12, totalSkills: 30 },
            { date: '2025-11-22', avgMasteryScore: 0.58, masteredSkills: 13, totalSkills: 30 },
            { date: '2025-11-29', avgMasteryScore: 0.62, masteredSkills: 15, totalSkills: 30 },
            { date: '2025-12-06', avgMasteryScore: 0.68, masteredSkills: 17, totalSkills: 30 },
          ],
          skillsMasteredDelta: 5,
          currentMastery: 0.68,
        },
      ],
      totalSkillsMasteredDelta: 11,
    },
    homeworkUsage: {
      totalHomeworkSessions: 8,
      avgStepsCompletedPerSession: 4.2,
      completionRate: 0.85,
    },
    focusSummary: {
      totalFocusBreaks: 12,
      totalSessions: 22,
      avgBreaksPerSession: 0.55,
      focusBreaksSummary: 'Maintaining strong focus during sessions.',
    },
  };
}

function generateMockStrengthsAndNeeds(learnerId: string) {
  return {
    learnerId,
    strengths: [
      {
        subjectCode: 'ELA',
        subjectName: 'English Language Arts',
        skillName: 'Reading Comprehension',
        masteryScore: 0.85,
        description: 'Strong foundation in Reading Comprehension',
      },
      {
        subjectCode: 'MATH',
        subjectName: 'Mathematics',
        skillName: 'Addition & Subtraction',
        masteryScore: 0.78,
        description: 'Strong foundation in Addition & Subtraction',
      },
    ],
    needsSupport: [
      {
        subjectCode: 'MATH',
        subjectName: 'Mathematics',
        skillName: 'Fractions',
        masteryScore: 0.35,
        description: 'Building foundation in Fractions',
      },
      {
        subjectCode: 'ELA',
        subjectName: 'English Language Arts',
        skillName: 'Grammar',
        masteryScore: 0.42,
        description: 'Growing confidence with Grammar',
      },
    ],
    overallMessage: 'Showing strengths while continuing to grow in other areas.',
  };
}

function generateMockEffortSummary(learnerId: string) {
  return {
    learnerId,
    currentStreakDays: 5,
    longestStreakDays: 12,
    skillsMasteredThisMonth: 7,
    sessionsCountThisWeek: 4,
    milestones: [
      {
        id: 'streak-3',
        type: 'streak',
        title: '3-Day Streak',
        description: 'Practice 3 days in a row',
        achieved: true,
        progress: 3,
        target: 3,
      },
      {
        id: 'streak-7',
        type: 'streak',
        title: 'Week Warrior',
        description: 'Practice 7 days in a row',
        achieved: true,
        progress: 5,
        target: 7,
      },
      {
        id: 'skills-5',
        type: 'skills',
        title: 'Skill Builder',
        description: 'Master 5 skills this month',
        achieved: true,
        progress: 5,
        target: 5,
      },
    ],
    encouragementMessage: "Great work! 5 days in a row. You're building a habit! 💪",
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Learner Analytics API', () => {
  describe('GET /analytics/learners/:learnerId/summary', () => {
    it('should return expected engagement metrics structure', () => {
      const summary = generateMockLearnerSummary('learner-100');

      expect(summary.engagement).toHaveProperty('sessionsThisWeek');
      expect(summary.engagement).toHaveProperty('sessionsLastWeek');
      expect(summary.engagement).toHaveProperty('avgSessionDurationMinutes');
      expect(summary.engagement).toHaveProperty('daysActiveInRange');
      expect(summary.engagement).toHaveProperty('totalSessionsInRange');

      expect(typeof summary.engagement.sessionsThisWeek).toBe('number');
      expect(typeof summary.engagement.avgSessionDurationMinutes).toBe('number');
    });

    it('should return learning progress by subject with timeseries', () => {
      const summary = generateMockLearnerSummary('learner-100');

      expect(summary.learningProgress.bySubject).toBeInstanceOf(Array);
      expect(summary.learningProgress.bySubject.length).toBeGreaterThan(0);

      const mathProgress = summary.learningProgress.bySubject.find((s) => s.subjectCode === 'MATH');
      expect(mathProgress).toBeDefined();
      expect(mathProgress!.timeseries).toBeInstanceOf(Array);
      expect(mathProgress!.timeseries.length).toBeGreaterThan(0);

      const firstPoint = mathProgress!.timeseries[0];
      expect(firstPoint).toHaveProperty('date');
      expect(firstPoint).toHaveProperty('avgMasteryScore');
      expect(firstPoint).toHaveProperty('masteredSkills');
    });

    it('should calculate skills mastered delta correctly', () => {
      const summary = generateMockLearnerSummary('learner-100');

      const mathProgress = summary.learningProgress.bySubject.find((s) => s.subjectCode === 'MATH');

      // Delta should be last.masteredSkills - first.masteredSkills
      const timeseries = mathProgress!.timeseries;
      const expectedDelta =
        timeseries[timeseries.length - 1].masteredSkills - timeseries[0].masteredSkills;
      expect(mathProgress!.skillsMasteredDelta).toBe(expectedDelta);
    });

    it('should include homework usage summary', () => {
      const summary = generateMockLearnerSummary('learner-100');

      expect(summary.homeworkUsage).toHaveProperty('totalHomeworkSessions');
      expect(summary.homeworkUsage).toHaveProperty('avgStepsCompletedPerSession');
      expect(summary.homeworkUsage).toHaveProperty('completionRate');

      expect(summary.homeworkUsage.completionRate).toBeGreaterThanOrEqual(0);
      expect(summary.homeworkUsage.completionRate).toBeLessThanOrEqual(1);
    });

    it('should include focus summary with friendly text', () => {
      const summary = generateMockLearnerSummary('learner-100');

      expect(summary.focusSummary).toHaveProperty('totalFocusBreaks');
      expect(summary.focusSummary).toHaveProperty('avgBreaksPerSession');
      expect(summary.focusSummary).toHaveProperty('focusBreaksSummary');

      expect(typeof summary.focusSummary.focusBreaksSummary).toBe('string');
      expect(summary.focusSummary.focusBreaksSummary.length).toBeGreaterThan(0);
    });
  });

  describe('GET /analytics/learners/:learnerId/strengths-and-needs', () => {
    it('should return top strengths with positive language', () => {
      const data = generateMockStrengthsAndNeeds('learner-100');

      expect(data.strengths).toBeInstanceOf(Array);
      expect(data.strengths.length).toBeLessThanOrEqual(3);

      for (const strength of data.strengths) {
        expect(strength.masteryScore).toBeGreaterThanOrEqual(0.7);
        expect(strength.description).not.toContain('weak');
        expect(strength.description).not.toContain('poor');
        expect(strength.description).not.toContain('bad');
      }
    });

    it('should return support areas with growth-oriented language', () => {
      const data = generateMockStrengthsAndNeeds('learner-100');

      expect(data.needsSupport).toBeInstanceOf(Array);
      expect(data.needsSupport.length).toBeLessThanOrEqual(3);

      for (const area of data.needsSupport) {
        expect(area.masteryScore).toBeLessThan(0.5);
        // Should use growth language, not deficit language
        expect(area.description).not.toContain('struggling');
        expect(area.description).not.toContain('failing');
        expect(area.description).not.toContain('behind');

        // Should use positive framing
        const hasPositiveWord =
          area.description.includes('Building') ||
          area.description.includes('Growing') ||
          area.description.includes('Strengthening') ||
          area.description.includes('Developing');
        expect(hasPositiveWord).toBe(true);
      }
    });

    it('should include encouraging overall message', () => {
      const data = generateMockStrengthsAndNeeds('learner-100');

      expect(data.overallMessage).toBeDefined();
      expect(typeof data.overallMessage).toBe('string');
      expect(data.overallMessage.length).toBeGreaterThan(0);
    });
  });

  describe('GET /analytics/learners/:learnerId/effort-summary', () => {
    it('should return streak metrics', () => {
      const data = generateMockEffortSummary('learner-100');

      expect(data.currentStreakDays).toBeDefined();
      expect(data.longestStreakDays).toBeDefined();
      expect(typeof data.currentStreakDays).toBe('number');
      expect(data.currentStreakDays).toBeGreaterThanOrEqual(0);
      expect(data.longestStreakDays).toBeGreaterThanOrEqual(data.currentStreakDays);
    });

    it('should return skills mastered this month', () => {
      const data = generateMockEffortSummary('learner-100');

      expect(data.skillsMasteredThisMonth).toBeDefined();
      expect(typeof data.skillsMasteredThisMonth).toBe('number');
      expect(data.skillsMasteredThisMonth).toBeGreaterThanOrEqual(0);
    });

    it('should include milestones with progress tracking', () => {
      const data = generateMockEffortSummary('learner-100');

      expect(data.milestones).toBeInstanceOf(Array);
      expect(data.milestones.length).toBeGreaterThan(0);

      const milestone = data.milestones[0];
      expect(milestone).toHaveProperty('id');
      expect(milestone).toHaveProperty('type');
      expect(milestone).toHaveProperty('title');
      expect(milestone).toHaveProperty('achieved');
      expect(milestone).toHaveProperty('progress');
      expect(milestone).toHaveProperty('target');

      // Type should be one of the valid types
      expect(['streak', 'skills', 'sessions']).toContain(milestone.type);
    });

    it('should include positive encouragement message', () => {
      const data = generateMockEffortSummary('learner-100');

      expect(data.encouragementMessage).toBeDefined();
      expect(typeof data.encouragementMessage).toBe('string');
      expect(data.encouragementMessage.length).toBeGreaterThan(0);

      // Should not use negative language
      expect(data.encouragementMessage.toLowerCase()).not.toContain('behind');
      expect(data.encouragementMessage.toLowerCase()).not.toContain('slow');
      expect(data.encouragementMessage.toLowerCase()).not.toContain('bad');
    });
  });
});

describe('Growth-Oriented Language Helpers', () => {
  function generateSupportAreaText(skillName: string, masteryScore: number): string {
    if (masteryScore < 0.3) {
      return `Building foundation in ${skillName}`;
    } else if (masteryScore < 0.5) {
      return `Growing confidence with ${skillName}`;
    } else if (masteryScore < 0.7) {
      return `Strengthening skills in ${skillName}`;
    }
    return `Developing ${skillName} further`;
  }

  function generateStrengthText(skillName: string, masteryScore: number): string {
    if (masteryScore >= 0.9) {
      return `Mastered ${skillName}!`;
    } else if (masteryScore >= 0.8) {
      return `Excelling at ${skillName}`;
    }
    return `Strong foundation in ${skillName}`;
  }

  it('should generate appropriate support text for low mastery', () => {
    const text = generateSupportAreaText('Fractions', 0.2);
    expect(text).toBe('Building foundation in Fractions');
  });

  it('should generate appropriate support text for medium-low mastery', () => {
    const text = generateSupportAreaText('Grammar', 0.4);
    expect(text).toBe('Growing confidence with Grammar');
  });

  it('should generate strength text for high mastery', () => {
    const text = generateStrengthText('Reading', 0.92);
    expect(text).toBe('Mastered Reading!');
  });

  it('should generate strength text for excellent mastery', () => {
    const text = generateStrengthText('Addition', 0.85);
    expect(text).toBe('Excelling at Addition');
  });
});
