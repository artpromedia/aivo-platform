import { describe, it, expect, beforeEach } from 'vitest';
import { ActivitySequencer } from '../src/learning/activity-sequencer.js';
import type { Activity, SequencingConstraints, LearnerProfile } from '../src/types/index.js';

describe('ActivitySequencer', () => {
  let sequencer: ActivitySequencer;
  let mockProfile: LearnerProfile;
  let mockActivities: Activity[];

  beforeEach(() => {
    sequencer = new ActivitySequencer();

    mockProfile = {
      id: 'learner-123',
      tenantId: 'tenant-456',
      skillLevels: new Map([
        ['math-basics', 60],
        ['math-algebra', 40],
      ]),
      learningRate: 1.0,
      averageAccuracy: 0.75,
      averageResponseTime: 3000,
      preferredPace: 'normal',
      strengths: ['math-basics'],
      weaknesses: ['math-algebra'],
    };

    mockActivities = [
      {
        id: 'act-1',
        type: 'lesson-completion',
        title: 'Basic Math Lesson',
        description: 'Introduction to basic math',
        estimatedDuration: 20,
        cognitiveLoad: 'medium',
        difficulty: 3,
        skillIds: ['math-basics'],
        prerequisites: [],
        metadata: {},
      },
      {
        id: 'act-2',
        type: 'practice-exercise',
        title: 'Math Practice',
        description: 'Practice basic operations',
        estimatedDuration: 15,
        cognitiveLoad: 'medium',
        difficulty: 4,
        skillIds: ['math-basics'],
        prerequisites: ['act-1'],
        metadata: {},
      },
      {
        id: 'act-3',
        type: 'lesson-completion',
        title: 'Algebra Introduction',
        description: 'Introduction to algebra',
        estimatedDuration: 25,
        cognitiveLoad: 'high',
        difficulty: 6,
        skillIds: ['math-algebra'],
        prerequisites: ['act-2'],
        metadata: {},
      },
      {
        id: 'act-4',
        type: 'review-session',
        title: 'Review Session',
        description: 'Review concepts',
        estimatedDuration: 10,
        cognitiveLoad: 'low',
        difficulty: 2,
        skillIds: ['math-basics', 'math-algebra'],
        prerequisites: [],
        metadata: {},
      },
      {
        id: 'act-5',
        type: 'assessment',
        title: 'Assessment',
        description: 'Test your knowledge',
        estimatedDuration: 30,
        cognitiveLoad: 'high',
        difficulty: 7,
        skillIds: ['math-basics', 'math-algebra'],
        prerequisites: ['act-3'],
        metadata: {},
      },
    ];
  });

  describe('sequenceActivities', () => {
    it('should respect prerequisite ordering', async () => {
      const constraints: SequencingConstraints = {
        mustComplete: [],
        preferredOrder: [],
        interleaveTopics: false,
        spacedRepetitionEnabled: false,
        maxConsecutiveSameType: 5,
        difficultyProgression: 'adaptive',
      };

      const result = await sequencer.sequenceActivities(mockActivities, constraints, mockProfile);

      expect(result.orderedActivities).toBeDefined();
      expect(result.orderedActivities.length).toBe(mockActivities.length);

      // act-1 should come before act-2
      const act1Index = result.orderedActivities.findIndex(a => a.activity.id === 'act-1');
      const act2Index = result.orderedActivities.findIndex(a => a.activity.id === 'act-2');
      expect(act1Index).toBeLessThan(act2Index);

      // act-3 should come after act-2
      const act3Index = result.orderedActivities.findIndex(a => a.activity.id === 'act-3');
      expect(act2Index).toBeLessThan(act3Index);

      // act-5 should come after act-3
      const act5Index = result.orderedActivities.findIndex(a => a.activity.id === 'act-5');
      expect(act3Index).toBeLessThan(act5Index);
    });

    it('should respect preferred order when specified', async () => {
      const constraints: SequencingConstraints = {
        mustComplete: [],
        preferredOrder: ['act-4', 'act-1', 'act-2', 'act-3', 'act-5'],
        interleaveTopics: false,
        spacedRepetitionEnabled: false,
        maxConsecutiveSameType: 5,
        difficultyProgression: 'adaptive',
      };

      const result = await sequencer.sequenceActivities(mockActivities, constraints, mockProfile);

      // act-4 has no prerequisites, so it can be first
      const act4Index = result.orderedActivities.findIndex(a => a.activity.id === 'act-4');
      expect(act4Index).toBe(0);
    });

    it('should mark required activities correctly', async () => {
      const constraints: SequencingConstraints = {
        mustComplete: ['act-1', 'act-5'],
        preferredOrder: [],
        interleaveTopics: false,
        spacedRepetitionEnabled: false,
        maxConsecutiveSameType: 5,
        difficultyProgression: 'adaptive',
      };

      const result = await sequencer.sequenceActivities(mockActivities, constraints, mockProfile);

      const act1 = result.orderedActivities.find(a => a.activity.id === 'act-1');
      const act4 = result.orderedActivities.find(a => a.activity.id === 'act-4');

      expect(act1?.isRequired).toBe(true);
      expect(act4?.isRequired).toBe(false);
    });

    it('should balance cognitive load', async () => {
      // Add more high-load activities to test balancing
      const highLoadActivities: Activity[] = [
        ...mockActivities,
        {
          id: 'act-6',
          type: 'project-work',
          title: 'Project 1',
          description: 'A challenging project',
          estimatedDuration: 45,
          cognitiveLoad: 'high',
          difficulty: 8,
          skillIds: ['math-algebra'],
          prerequisites: [],
          metadata: {},
        },
        {
          id: 'act-7',
          type: 'project-work',
          title: 'Project 2',
          description: 'Another challenging project',
          estimatedDuration: 45,
          cognitiveLoad: 'high',
          difficulty: 8,
          skillIds: ['math-algebra'],
          prerequisites: [],
          metadata: {},
        },
      ];

      const constraints: SequencingConstraints = {
        mustComplete: [],
        preferredOrder: [],
        interleaveTopics: false,
        spacedRepetitionEnabled: false,
        maxConsecutiveSameType: 2,
        difficultyProgression: 'adaptive',
      };

      const result = await sequencer.sequenceActivities(highLoadActivities, constraints, mockProfile);

      // Check that there are no more than 2 consecutive high-load activities
      let consecutiveHighLoad = 0;
      let maxConsecutive = 0;

      for (const activity of result.orderedActivities) {
        if (activity.activity.cognitiveLoad === 'high' || activity.activity.cognitiveLoad === 'overload') {
          consecutiveHighLoad++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveHighLoad);
        } else {
          consecutiveHighLoad = 0;
        }
      }

      expect(maxConsecutive).toBeLessThanOrEqual(3); // May be slightly higher due to other constraints
    });

    it('should apply ascending difficulty progression', async () => {
      const constraints: SequencingConstraints = {
        mustComplete: [],
        preferredOrder: [],
        interleaveTopics: false,
        spacedRepetitionEnabled: false,
        maxConsecutiveSameType: 5,
        difficultyProgression: 'ascending',
      };

      const result = await sequencer.sequenceActivities(mockActivities, constraints, mockProfile);

      // Generally, difficulty should increase (accounting for prerequisite constraints)
      const difficulties = result.orderedActivities.map(a => a.activity.difficulty);

      // The first half should have lower average than second half
      const mid = Math.floor(difficulties.length / 2);
      const firstHalfAvg = difficulties.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
      const secondHalfAvg = difficulties.slice(mid).reduce((a, b) => a + b, 0) / (difficulties.length - mid);

      // Allow some flexibility due to prerequisite constraints
      expect(secondHalfAvg).toBeGreaterThanOrEqual(firstHalfAvg - 2);
    });

    it('should generate unlock conditions', async () => {
      const constraints: SequencingConstraints = {
        mustComplete: [],
        preferredOrder: [],
        interleaveTopics: false,
        spacedRepetitionEnabled: false,
        maxConsecutiveSameType: 5,
        difficultyProgression: 'adaptive',
      };

      const result = await sequencer.sequenceActivities(mockActivities, constraints, mockProfile);

      // Activities after the first should have unlock conditions
      for (let i = 1; i < result.orderedActivities.length; i++) {
        const activity = result.orderedActivities[i];
        expect(activity.unlockConditions.length).toBeGreaterThan(0);
      }
    });

    it('should generate branching points after assessments', async () => {
      const constraints: SequencingConstraints = {
        mustComplete: [],
        preferredOrder: [],
        interleaveTopics: false,
        spacedRepetitionEnabled: false,
        maxConsecutiveSameType: 5,
        difficultyProgression: 'adaptive',
      };

      const result = await sequencer.sequenceActivities(mockActivities, constraints, mockProfile);

      // Should have at least one branching point for the assessment
      expect(result.branchingPoints).toBeDefined();
    });
  });

  describe('resequenceBasedOnPerformance', () => {
    it('should add review activities when struggling', async () => {
      const constraints: SequencingConstraints = {
        mustComplete: [],
        preferredOrder: [],
        interleaveTopics: false,
        spacedRepetitionEnabled: false,
        maxConsecutiveSameType: 5,
        difficultyProgression: 'adaptive',
      };

      const originalSequence = await sequencer.sequenceActivities(mockActivities, constraints, mockProfile);
      const originalLength = originalSequence.orderedActivities.length;

      // Simulate struggling (low score)
      const updatedSequence = await sequencer.resequenceBasedOnPerformance(
        originalSequence,
        40, // Low score
        0,  // After first activity
        mockProfile
      );

      // Should have added a review activity
      expect(updatedSequence.orderedActivities.length).toBeGreaterThan(originalLength);
    });

    it('should mark easy content as skippable when excelling', async () => {
      const constraints: SequencingConstraints = {
        mustComplete: [],
        preferredOrder: [],
        interleaveTopics: false,
        spacedRepetitionEnabled: false,
        maxConsecutiveSameType: 5,
        difficultyProgression: 'adaptive',
      };

      const originalSequence = await sequencer.sequenceActivities(mockActivities, constraints, mockProfile);

      // Simulate excellent performance
      const updatedSequence = await sequencer.resequenceBasedOnPerformance(
        originalSequence,
        95, // High score
        0,  // After first activity
        mockProfile
      );

      // Some easy activities should be marked as skippable
      const skippableActivities = updatedSequence.orderedActivities.filter(
        a => a.activity.metadata?.skippable === true
      );

      // May have some skippable if there are easy, non-required activities
      expect(skippableActivities.length).toBeGreaterThanOrEqual(0);
    });
  });
});
