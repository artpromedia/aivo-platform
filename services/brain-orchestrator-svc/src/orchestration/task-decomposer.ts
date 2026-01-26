import type {
  Task,
  LearningGoal,
  LearnerProfile,
  LearningTask,
  CognitiveLoadLevel,
} from '../types/index.js';
import { createTask, TASK_TYPE_CONFIGS } from './task-types.js';
import { v4 as uuidv4 } from 'uuid';

interface DecompositionResult {
  tasks: Task[];
  estimatedTotalDuration: number;
  decompositionStrategy: string;
}

interface SkillGap {
  skillId: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
}

export class TaskDecomposer {
  /**
   * Decomposes a complex learning goal into manageable tasks
   */
  async decompose(
    complexGoal: LearningGoal,
    learnerProfile: LearnerProfile,
    tenantId: string
  ): Promise<DecompositionResult> {
    switch (complexGoal.type) {
      case 'skill_mastery':
        return this.decomposeSkillMastery(complexGoal, learnerProfile, tenantId);
      case 'lesson_completion':
        return this.decomposeLessonCompletion(complexGoal, learnerProfile, tenantId);
      case 'assessment_score':
        return this.decomposeAssessmentScore(complexGoal, learnerProfile, tenantId);
      case 'project_completion':
        return this.decomposeProjectCompletion(complexGoal, learnerProfile, tenantId);
      case 'custom':
        return this.decomposeCustomGoal(complexGoal, learnerProfile, tenantId);
      default:
        throw new Error(`Unknown goal type: ${complexGoal.type}`);
    }
  }

  /**
   * Decompose a skill mastery goal into learning tasks
   */
  private async decomposeSkillMastery(
    goal: LearningGoal,
    learnerProfile: LearnerProfile,
    tenantId: string
  ): Promise<DecompositionResult> {
    const tasks: Task[] = [];
    const skillId = goal.targetId;
    const targetMastery = goal.targetValue ?? 80;

    const currentLevel = learnerProfile.skillLevels.get(skillId) ?? 0;
    const gap = targetMastery - currentLevel;

    if (gap <= 0) {
      return {
        tasks: [],
        estimatedTotalDuration: 0,
        decompositionStrategy: 'skill_already_mastered',
      };
    }

    // Estimate number of learning cycles needed
    const cyclesNeeded = Math.ceil(gap / 15); // ~15% mastery gain per cycle

    for (let i = 0; i < cyclesNeeded; i++) {
      const cycleId = uuidv4();
      const isFirstCycle = i === 0;
      const isLastCycle = i === cyclesNeeded - 1;

      // Add lesson task if first cycle or review needed
      if (isFirstCycle || i % 3 === 0) {
        tasks.push(
          createTask({
            type: 'lesson-completion',
            learnerId: learnerProfile.id,
            tenantId,
            priority: 80 - i * 5,
            estimatedDuration: this.estimateDuration('lesson-completion', learnerProfile),
            cognitiveLoad: 'medium',
            prerequisites: i > 0 ? [tasks[tasks.length - 1]?.id] : [],
            dependencies: [],
            deadline: goal.deadline,
            context: {
              skillIds: [skillId],
              metadata: { cycleId, cycleNumber: i + 1, totalCycles: cyclesNeeded },
            },
          })
        );
      }

      // Add practice exercise
      tasks.push(
        createTask({
          type: 'practice-exercise',
          learnerId: learnerProfile.id,
          tenantId,
          priority: 75 - i * 5,
          estimatedDuration: this.estimateDuration('practice-exercise', learnerProfile),
          cognitiveLoad: this.adjustCognitiveLoad('medium', learnerProfile),
          prerequisites: tasks.length > 0 ? [tasks[tasks.length - 1].id] : [],
          dependencies: [],
          deadline: goal.deadline,
          context: {
            skillIds: [skillId],
            metadata: { cycleId, cycleNumber: i + 1, practiceType: 'skill_building' },
          },
        })
      );

      // Add assessment at the end of each cycle
      if ((i + 1) % 2 === 0 || isLastCycle) {
        tasks.push(
          createTask({
            type: 'assessment',
            learnerId: learnerProfile.id,
            tenantId,
            priority: 70 - i * 5,
            estimatedDuration: this.estimateDuration('assessment', learnerProfile),
            cognitiveLoad: 'high',
            prerequisites: [tasks[tasks.length - 1].id],
            dependencies: [],
            deadline: goal.deadline,
            context: {
              skillIds: [skillId],
              metadata: { cycleId, assessmentType: 'mastery_check' },
            },
          })
        );
      }

      // Add review session every 3rd cycle
      if ((i + 1) % 3 === 0 && !isLastCycle) {
        tasks.push(
          createTask({
            type: 'review-session',
            learnerId: learnerProfile.id,
            tenantId,
            priority: 65,
            estimatedDuration: this.estimateDuration('review-session', learnerProfile),
            cognitiveLoad: 'low',
            prerequisites: [tasks[tasks.length - 1].id],
            dependencies: [],
            context: {
              skillIds: [skillId],
              metadata: { cycleId, reviewType: 'spaced_repetition' },
            },
          })
        );
      }
    }

    return {
      tasks,
      estimatedTotalDuration: tasks.reduce((sum, t) => sum + t.estimatedDuration, 0),
      decompositionStrategy: 'skill_mastery_cycles',
    };
  }

  /**
   * Decompose a lesson completion goal
   */
  private async decomposeLessonCompletion(
    goal: LearningGoal,
    learnerProfile: LearnerProfile,
    tenantId: string
  ): Promise<DecompositionResult> {
    const tasks: Task[] = [];
    const lessonId = goal.targetId;

    // Main lesson task
    tasks.push(
      createTask({
        type: 'lesson-completion',
        learnerId: learnerProfile.id,
        tenantId,
        priority: goal.priority,
        estimatedDuration: this.estimateDuration('lesson-completion', learnerProfile),
        cognitiveLoad: 'medium',
        prerequisites: [],
        dependencies: [],
        deadline: goal.deadline,
        context: {
          lessonId,
          skillIds: [],
          metadata: { goalId: goal.id },
        },
      })
    );

    // Follow-up practice
    tasks.push(
      createTask({
        type: 'practice-exercise',
        learnerId: learnerProfile.id,
        tenantId,
        priority: goal.priority - 10,
        estimatedDuration: this.estimateDuration('practice-exercise', learnerProfile),
        cognitiveLoad: 'medium',
        prerequisites: [tasks[0].id],
        dependencies: [],
        deadline: goal.deadline,
        context: {
          lessonId,
          skillIds: [],
          metadata: { practiceType: 'lesson_reinforcement' },
        },
      })
    );

    return {
      tasks,
      estimatedTotalDuration: tasks.reduce((sum, t) => sum + t.estimatedDuration, 0),
      decompositionStrategy: 'lesson_with_practice',
    };
  }

  /**
   * Decompose an assessment score goal
   */
  private async decomposeAssessmentScore(
    goal: LearningGoal,
    learnerProfile: LearnerProfile,
    tenantId: string
  ): Promise<DecompositionResult> {
    const tasks: Task[] = [];
    const assessmentId = goal.targetId;
    const targetScore = goal.targetValue ?? 80;

    // Preparation phase
    const prepCycles = targetScore >= 90 ? 3 : targetScore >= 70 ? 2 : 1;

    for (let i = 0; i < prepCycles; i++) {
      // Review session
      tasks.push(
        createTask({
          type: 'review-session',
          learnerId: learnerProfile.id,
          tenantId,
          priority: 85 - i * 5,
          estimatedDuration: this.estimateDuration('review-session', learnerProfile),
          cognitiveLoad: 'low',
          prerequisites: i > 0 ? [tasks[tasks.length - 1].id] : [],
          dependencies: [],
          deadline: goal.deadline,
          context: {
            assessmentId,
            skillIds: [],
            metadata: { prepCycle: i + 1, prepType: 'assessment_prep' },
          },
        })
      );

      // Practice exercise
      tasks.push(
        createTask({
          type: 'practice-exercise',
          learnerId: learnerProfile.id,
          tenantId,
          priority: 80 - i * 5,
          estimatedDuration: this.estimateDuration('practice-exercise', learnerProfile),
          cognitiveLoad: 'medium',
          prerequisites: [tasks[tasks.length - 1].id],
          dependencies: [],
          deadline: goal.deadline,
          context: {
            assessmentId,
            skillIds: [],
            metadata: { prepCycle: i + 1, practiceType: 'assessment_simulation' },
          },
        })
      );
    }

    // Actual assessment
    tasks.push(
      createTask({
        type: 'assessment',
        learnerId: learnerProfile.id,
        tenantId,
        priority: 100,
        estimatedDuration: this.estimateDuration('assessment', learnerProfile),
        cognitiveLoad: 'high',
        prerequisites: [tasks[tasks.length - 1].id],
        dependencies: [],
        deadline: goal.deadline,
        context: {
          assessmentId,
          skillIds: [],
          metadata: { goalId: goal.id, targetScore },
        },
      })
    );

    return {
      tasks,
      estimatedTotalDuration: tasks.reduce((sum, t) => sum + t.estimatedDuration, 0),
      decompositionStrategy: 'assessment_preparation',
    };
  }

  /**
   * Decompose a project completion goal
   */
  private async decomposeProjectCompletion(
    goal: LearningGoal,
    learnerProfile: LearnerProfile,
    tenantId: string
  ): Promise<DecompositionResult> {
    const tasks: Task[] = [];
    const projectId = goal.targetId;

    // Planning phase
    tasks.push(
      createTask({
        type: 'skill-building',
        learnerId: learnerProfile.id,
        tenantId,
        priority: 90,
        estimatedDuration: 20,
        cognitiveLoad: 'medium',
        prerequisites: [],
        dependencies: [],
        deadline: goal.deadline,
        context: {
          skillIds: [],
          metadata: { projectId, phase: 'planning' },
        },
      })
    );

    // Main project work sessions (estimate 3 sessions)
    for (let i = 0; i < 3; i++) {
      tasks.push(
        createTask({
          type: 'project-work',
          learnerId: learnerProfile.id,
          tenantId,
          priority: 85 - i * 5,
          estimatedDuration: this.estimateDuration('project-work', learnerProfile),
          cognitiveLoad: 'high',
          prerequisites: [tasks[tasks.length - 1].id],
          dependencies: [],
          deadline: goal.deadline,
          context: {
            skillIds: [],
            metadata: { projectId, phase: 'implementation', session: i + 1 },
          },
        })
      );

      // Add break-friendly review after each project session
      if (i < 2) {
        tasks.push(
          createTask({
            type: 'review-session',
            learnerId: learnerProfile.id,
            tenantId,
            priority: 70,
            estimatedDuration: 10,
            cognitiveLoad: 'low',
            prerequisites: [tasks[tasks.length - 1].id],
            dependencies: [],
            context: {
              skillIds: [],
              metadata: { projectId, phase: 'review', session: i + 1 },
            },
          })
        );
      }
    }

    return {
      tasks,
      estimatedTotalDuration: tasks.reduce((sum, t) => sum + t.estimatedDuration, 0),
      decompositionStrategy: 'project_phases',
    };
  }

  /**
   * Decompose a custom goal
   */
  private async decomposeCustomGoal(
    goal: LearningGoal,
    learnerProfile: LearnerProfile,
    tenantId: string
  ): Promise<DecompositionResult> {
    // For custom goals, create a generic learning flow
    const tasks: Task[] = [];

    tasks.push(
      createTask({
        type: 'lesson-completion',
        learnerId: learnerProfile.id,
        tenantId,
        priority: goal.priority,
        estimatedDuration: this.estimateDuration('lesson-completion', learnerProfile),
        cognitiveLoad: 'medium',
        prerequisites: [],
        dependencies: [],
        deadline: goal.deadline,
        context: {
          skillIds: [],
          metadata: { goalId: goal.id, goalDescription: goal.description },
        },
      })
    );

    tasks.push(
      createTask({
        type: 'practice-exercise',
        learnerId: learnerProfile.id,
        tenantId,
        priority: goal.priority - 10,
        estimatedDuration: this.estimateDuration('practice-exercise', learnerProfile),
        cognitiveLoad: 'medium',
        prerequisites: [tasks[0].id],
        dependencies: [],
        deadline: goal.deadline,
        context: {
          skillIds: [],
          metadata: { goalId: goal.id },
        },
      })
    );

    return {
      tasks,
      estimatedTotalDuration: tasks.reduce((sum, t) => sum + t.estimatedDuration, 0),
      decompositionStrategy: 'generic_learning_flow',
    };
  }

  /**
   * Estimate duration based on task type and learner profile
   */
  private estimateDuration(taskType: LearningTask, profile: LearnerProfile): number {
    const config = TASK_TYPE_CONFIGS[taskType];
    const baseAverage = (config.typicalDuration.min + config.typicalDuration.max) / 2;

    // Adjust based on learner pace
    const paceMultiplier =
      profile.preferredPace === 'slow' ? 1.3 : profile.preferredPace === 'fast' ? 0.8 : 1.0;

    // Adjust based on learning rate
    const rateMultiplier = 1 / (profile.learningRate || 1);

    return Math.round(baseAverage * paceMultiplier * rateMultiplier);
  }

  /**
   * Adjust cognitive load based on learner profile
   */
  private adjustCognitiveLoad(
    baseLoad: CognitiveLoadLevel,
    profile: LearnerProfile
  ): CognitiveLoadLevel {
    const loadLevels: CognitiveLoadLevel[] = ['low', 'medium', 'high', 'overload'];
    const currentIndex = loadLevels.indexOf(baseLoad);

    // Increase load for fast learners, decrease for struggling learners
    let adjustment = 0;
    if (profile.averageAccuracy < 0.6) {
      adjustment = -1;
    } else if (profile.averageAccuracy > 0.9 && profile.learningRate > 1.2) {
      adjustment = 1;
    }

    const newIndex = Math.max(0, Math.min(loadLevels.length - 2, currentIndex + adjustment));
    return loadLevels[newIndex];
  }

  /**
   * Identify skill gaps that need to be addressed
   */
  async identifySkillGaps(
    requiredSkills: Array<{ skillId: string; requiredLevel: number }>,
    learnerProfile: LearnerProfile
  ): Promise<SkillGap[]> {
    return requiredSkills
      .map(({ skillId, requiredLevel }) => {
        const currentLevel = learnerProfile.skillLevels.get(skillId) ?? 0;
        return {
          skillId,
          currentLevel,
          targetLevel: requiredLevel,
          gap: requiredLevel - currentLevel,
        };
      })
      .filter((gap) => gap.gap > 0)
      .sort((a, b) => b.gap - a.gap); // Sort by largest gap first
  }

  /**
   * Create prerequisite tasks for skill gaps
   */
  async createPrerequisiteTasks(
    skillGaps: SkillGap[],
    learnerProfile: LearnerProfile,
    tenantId: string
  ): Promise<Task[]> {
    const tasks: Task[] = [];

    for (const gap of skillGaps) {
      const decomposed = await this.decomposeSkillMastery(
        {
          id: uuidv4(),
          type: 'skill_mastery',
          targetId: gap.skillId,
          targetValue: gap.targetLevel,
          priority: 90, // High priority for prerequisites
          description: `Build prerequisite skill: ${gap.skillId}`,
        },
        learnerProfile,
        tenantId
      );

      tasks.push(...decomposed.tasks);
    }

    return tasks;
  }
}
