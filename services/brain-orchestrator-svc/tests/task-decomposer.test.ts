import { describe, it, expect, beforeEach } from 'vitest';
import { TaskDecomposer } from '../src/orchestration/task-decomposer.js';
import type { LearningGoal, LearnerProfile } from '../src/types/index.js';

describe('TaskDecomposer', () => {
  let decomposer: TaskDecomposer;
  let mockLearnerProfile: LearnerProfile;

  beforeEach(() => {
    decomposer = new TaskDecomposer();
    mockLearnerProfile = {
      id: 'learner-123',
      tenantId: 'tenant-456',
      skillLevels: new Map([
        ['math-algebra', 50],
        ['math-geometry', 30],
      ]),
      learningRate: 1.0,
      averageAccuracy: 0.75,
      averageResponseTime: 3000,
      preferredPace: 'normal',
      strengths: ['math-algebra'],
      weaknesses: ['math-geometry'],
    };
  });

  describe('decompose', () => {
    it('should decompose a skill mastery goal into tasks', async () => {
      const goal: LearningGoal = {
        id: 'goal-1',
        type: 'skill_mastery',
        targetId: 'math-algebra',
        targetValue: 80,
        priority: 50,
        description: 'Master algebra skills',
      };

      const result = await decomposer.decompose(goal, mockLearnerProfile, 'tenant-456');

      expect(result.tasks).toBeDefined();
      expect(result.tasks.length).toBeGreaterThan(0);
      expect(result.decompositionStrategy).toBe('skill_mastery_cycles');
      expect(result.estimatedTotalDuration).toBeGreaterThan(0);
    });

    it('should return empty tasks if skill already mastered', async () => {
      mockLearnerProfile.skillLevels.set('math-algebra', 90);

      const goal: LearningGoal = {
        id: 'goal-1',
        type: 'skill_mastery',
        targetId: 'math-algebra',
        targetValue: 80,
        priority: 50,
        description: 'Master algebra skills',
      };

      const result = await decomposer.decompose(goal, mockLearnerProfile, 'tenant-456');

      expect(result.tasks).toHaveLength(0);
      expect(result.decompositionStrategy).toBe('skill_already_mastered');
    });

    it('should decompose a lesson completion goal', async () => {
      const goal: LearningGoal = {
        id: 'goal-2',
        type: 'lesson_completion',
        targetId: 'lesson-123',
        priority: 60,
        description: 'Complete algebra lesson',
      };

      const result = await decomposer.decompose(goal, mockLearnerProfile, 'tenant-456');

      expect(result.tasks.length).toBe(2); // Main lesson + follow-up practice
      expect(result.decompositionStrategy).toBe('lesson_with_practice');
    });

    it('should decompose an assessment score goal', async () => {
      const goal: LearningGoal = {
        id: 'goal-3',
        type: 'assessment_score',
        targetId: 'assessment-123',
        targetValue: 85,
        priority: 70,
        description: 'Score 85% on algebra test',
      };

      const result = await decomposer.decompose(goal, mockLearnerProfile, 'tenant-456');

      expect(result.tasks.length).toBeGreaterThan(0);
      expect(result.decompositionStrategy).toBe('assessment_preparation');

      // Should include review and practice before assessment
      const taskTypes = result.tasks.map(t => t.type);
      expect(taskTypes).toContain('review-session');
      expect(taskTypes).toContain('practice-exercise');
      expect(taskTypes).toContain('assessment');
    });

    it('should decompose a project completion goal', async () => {
      const goal: LearningGoal = {
        id: 'goal-4',
        type: 'project_completion',
        targetId: 'project-123',
        priority: 80,
        description: 'Complete math project',
      };

      const result = await decomposer.decompose(goal, mockLearnerProfile, 'tenant-456');

      expect(result.tasks.length).toBeGreaterThan(0);
      expect(result.decompositionStrategy).toBe('project_phases');

      const taskTypes = result.tasks.map(t => t.type);
      expect(taskTypes).toContain('project-work');
    });

    it('should adjust task duration based on learner pace', async () => {
      const slowProfile = { ...mockLearnerProfile, preferredPace: 'slow' as const };
      const fastProfile = { ...mockLearnerProfile, preferredPace: 'fast' as const };

      const goal: LearningGoal = {
        id: 'goal-5',
        type: 'lesson_completion',
        targetId: 'lesson-123',
        priority: 50,
        description: 'Complete lesson',
      };

      const slowResult = await decomposer.decompose(goal, slowProfile, 'tenant-456');
      const fastResult = await decomposer.decompose(goal, fastProfile, 'tenant-456');

      // Slow learner should have longer estimated durations
      expect(slowResult.estimatedTotalDuration).toBeGreaterThan(fastResult.estimatedTotalDuration);
    });
  });

  describe('identifySkillGaps', () => {
    it('should identify skills that need improvement', async () => {
      const requiredSkills = [
        { skillId: 'math-algebra', requiredLevel: 70 },
        { skillId: 'math-geometry', requiredLevel: 50 },
        { skillId: 'math-calculus', requiredLevel: 30 },
      ];

      const gaps = await decomposer.identifySkillGaps(requiredSkills, mockLearnerProfile);

      expect(gaps.length).toBe(3);
      // math-geometry has the biggest gap (50 - 30 = 20)
      expect(gaps[0].skillId).toBe('math-algebra'); // 70 - 50 = 20
      // All gaps should be positive
      gaps.forEach(gap => {
        expect(gap.gap).toBeGreaterThan(0);
      });
    });

    it('should not include skills that meet requirements', async () => {
      mockLearnerProfile.skillLevels.set('math-algebra', 80);

      const requiredSkills = [
        { skillId: 'math-algebra', requiredLevel: 70 },
      ];

      const gaps = await decomposer.identifySkillGaps(requiredSkills, mockLearnerProfile);

      expect(gaps.length).toBe(0);
    });
  });

  describe('createPrerequisiteTasks', () => {
    it('should create tasks for skill gaps', async () => {
      const skillGaps = [
        { skillId: 'math-geometry', currentLevel: 30, targetLevel: 60, gap: 30 },
      ];

      const tasks = await decomposer.createPrerequisiteTasks(
        skillGaps,
        mockLearnerProfile,
        'tenant-456'
      );

      expect(tasks.length).toBeGreaterThan(0);
      // All tasks should target the gap skill
      tasks.forEach(task => {
        expect(task.context.skillIds).toContain('math-geometry');
      });
    });
  });
});
