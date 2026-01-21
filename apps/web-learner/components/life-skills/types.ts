/**
 * Life Skills Types
 *
 * TypeScript types for the life skills module.
 */

export enum SkillCategory {
  PERSONAL_HYGIENE = 'PERSONAL_HYGIENE',
  EATING_DRINKING = 'EATING_DRINKING',
  DRESSING = 'DRESSING',
  SAFETY_AWARENESS = 'SAFETY_AWARENESS',
  SOCIAL_SKILLS = 'SOCIAL_SKILLS',
  COMMUNICATION = 'COMMUNICATION',
  HOME_LIVING = 'HOME_LIVING',
  COMMUNITY = 'COMMUNITY',
  MONEY_MANAGEMENT = 'MONEY_MANAGEMENT',
  TIME_MANAGEMENT = 'TIME_MANAGEMENT',
}

export const SKILL_CATEGORY_INFO: Record<
  SkillCategory,
  { label: string; icon: string; color: string }
> = {
  [SkillCategory.PERSONAL_HYGIENE]: { label: 'Personal Hygiene', icon: '🧼', color: 'blue' },
  [SkillCategory.EATING_DRINKING]: { label: 'Eating & Drinking', icon: '🍽️', color: 'orange' },
  [SkillCategory.DRESSING]: { label: 'Dressing', icon: '👕', color: 'purple' },
  [SkillCategory.SAFETY_AWARENESS]: { label: 'Safety Awareness', icon: '⚠️', color: 'red' },
  [SkillCategory.SOCIAL_SKILLS]: { label: 'Social Skills', icon: '👋', color: 'pink' },
  [SkillCategory.COMMUNICATION]: { label: 'Communication', icon: '💬', color: 'cyan' },
  [SkillCategory.HOME_LIVING]: { label: 'Home Living', icon: '🏠', color: 'green' },
  [SkillCategory.COMMUNITY]: { label: 'Community', icon: '🏙️', color: 'indigo' },
  [SkillCategory.MONEY_MANAGEMENT]: { label: 'Money Management', icon: '💰', color: 'yellow' },
  [SkillCategory.TIME_MANAGEMENT]: { label: 'Time Management', icon: '⏰', color: 'teal' },
};

export enum DifficultyLevel {
  FOUNDATIONAL = 'FOUNDATIONAL',
  EMERGING = 'EMERGING',
  DEVELOPING = 'DEVELOPING',
  PROFICIENT = 'PROFICIENT',
  ADVANCED = 'ADVANCED',
}

export const DIFFICULTY_INFO: Record<DifficultyLevel, { label: string; color: string }> = {
  [DifficultyLevel.FOUNDATIONAL]: { label: 'Foundational', color: 'green' },
  [DifficultyLevel.EMERGING]: { label: 'Emerging', color: 'lime' },
  [DifficultyLevel.DEVELOPING]: { label: 'Developing', color: 'orange' },
  [DifficultyLevel.PROFICIENT]: { label: 'Proficient', color: 'blue' },
  [DifficultyLevel.ADVANCED]: { label: 'Advanced', color: 'purple' },
};

export enum ProgressStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  ACHIEVED = 'ACHIEVED',
  MAINTAINED = 'MAINTAINED',
}

export enum PromptLevel {
  FULL_PHYSICAL = 'FULL_PHYSICAL',
  PARTIAL_PHYSICAL = 'PARTIAL_PHYSICAL',
  GESTURAL = 'GESTURAL',
  VERBAL = 'VERBAL',
  INDEPENDENT = 'INDEPENDENT',
}

export const PROMPT_LEVEL_INFO: Record<PromptLevel, { label: string; description: string }> = {
  [PromptLevel.FULL_PHYSICAL]: {
    label: 'Full Physical',
    description: 'Hand-over-hand guidance through the entire step',
  },
  [PromptLevel.PARTIAL_PHYSICAL]: {
    label: 'Partial Physical',
    description: 'Light touch or partial guidance to help',
  },
  [PromptLevel.GESTURAL]: {
    label: 'Gestural',
    description: 'Pointing or gesturing to guide the action',
  },
  [PromptLevel.VERBAL]: {
    label: 'Verbal',
    description: 'Spoken instructions or reminders',
  },
  [PromptLevel.INDEPENDENT]: {
    label: 'Independent',
    description: 'Completing the step without any prompts',
  },
};

export enum SafetyScenarioType {
  STRANGER_DANGER = 'STRANGER_DANGER',
  ROAD_SAFETY = 'ROAD_SAFETY',
  FIRE_SAFETY = 'FIRE_SAFETY',
  WATER_SAFETY = 'WATER_SAFETY',
  ONLINE_SAFETY = 'ONLINE_SAFETY',
  PERSONAL_BOUNDARIES = 'PERSONAL_BOUNDARIES',
  EMERGENCY_RESPONSE = 'EMERGENCY_RESPONSE',
  HOME_SAFETY = 'HOME_SAFETY',
}

export const SAFETY_SCENARIO_INFO: Record<
  SafetyScenarioType,
  { label: string; icon: string; color: string }
> = {
  [SafetyScenarioType.STRANGER_DANGER]: { label: 'Stranger Awareness', icon: '🚫', color: 'red' },
  [SafetyScenarioType.ROAD_SAFETY]: { label: 'Road Safety', icon: '🚸', color: 'orange' },
  [SafetyScenarioType.FIRE_SAFETY]: { label: 'Fire Safety', icon: '🔥', color: 'red' },
  [SafetyScenarioType.WATER_SAFETY]: { label: 'Water Safety', icon: '🏊', color: 'blue' },
  [SafetyScenarioType.ONLINE_SAFETY]: { label: 'Online Safety', icon: '💻', color: 'purple' },
  [SafetyScenarioType.PERSONAL_BOUNDARIES]: { label: 'Personal Boundaries', icon: '🛡️', color: 'green' },
  [SafetyScenarioType.EMERGENCY_RESPONSE]: { label: 'Emergency Response', icon: '🆘', color: 'red' },
  [SafetyScenarioType.HOME_SAFETY]: { label: 'Home Safety', icon: '🏠', color: 'teal' },
};

export enum DecisionOutcome {
  CORRECT = 'CORRECT',
  PARTIALLY_CORRECT = 'PARTIALLY_CORRECT',
  INCORRECT = 'INCORRECT',
}

// API Response Types

export interface LifeSkill {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  category: SkillCategory;
  difficulty: DifficultyLevel;
  thumbnailUrl?: string;
  videoUrl?: string;
  estimatedMinutes?: number;
  prerequisites: string[];
  ageRangeMin?: number;
  ageRangeMax?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SkillStep {
  id: string;
  taskAnalysisId: string;
  stepNumber: number;
  title: string;
  instruction: string;
  imageUrl?: string;
  videoUrl?: string;
  symbolUrl?: string;
  audioUrl?: string;
  durationSeconds?: number;
  teachingNote?: string;
  promptFullPhysical: string;
  promptPartialPhysical: string;
  promptGestural: string;
  promptVerbal: string;
  promptIndependent: string;
}

export interface SkillGuide {
  skill: LifeSkill;
  taskAnalysis: {
    id: string;
    skillId: string;
    version: number;
    totalSteps: number;
    teachingNotes?: string;
    materialsNeeded: string[];
    environmentSetup?: string;
    safetyConsiderations?: string;
    isActive: boolean;
  };
  steps: SkillStep[];
  learnerProgress?: LearnerSkillProgress;
}

export interface StepProgress {
  stepId: string;
  status: ProgressStatus;
  attemptsCount: number;
  currentPromptLevel: PromptLevel;
  successRate: number;
  lastAttemptAt?: string;
  achievedAt?: string;
}

export interface LearnerSkillProgress {
  id: string;
  learnerId: string;
  skillId: string;
  status: ProgressStatus;
  currentMastery: number;
  totalAttempts: number;
  successfulAttempts: number;
  currentStreak: number;
  longestStreak: number;
  totalPracticeMinutes: number;
  lastPracticedAt?: string;
  achievedAt?: string;
  stepProgress: StepProgress[];
}

export interface SafetyChoice {
  id: string;
  scenarioId: string;
  choiceText: string;
  symbolUrl?: string;
  outcome: DecisionOutcome;
  feedback: string;
  displayOrder: number;
}

export interface SafetyScenario {
  id: string;
  tenantId: string;
  scenarioType: SafetyScenarioType;
  title: string;
  situationDescription: string;
  questionPrompt: string;
  imageUrl?: string;
  videoUrl?: string;
  correctExplanation: string;
  ageAppropriate?: number;
  difficulty: DifficultyLevel;
  isActive: boolean;
  choices: SafetyChoice[];
}

export interface AIGuidance {
  promptForLevel: string;
  encouragement: string;
  tips: string[];
  suggestedApproach?: string;
  adaptations?: string[];
}

export interface Encouragement {
  message: string;
  motivationalFact?: string;
  nextStepSuggestion?: string;
  celebrationEmoji?: string;
}

export interface ProgressDashboardData {
  summary: {
    skillsInProgress: number;
    skillsAchieved: number;
    averageMastery: number;
    currentStreak: number;
    totalMinutes: number;
  };
  byCategory: Array<{
    category: SkillCategory;
    skills: Array<{ id: string; name: string; mastery: number }>;
    averageMastery: number;
  }>;
  recentActivity: Array<{
    skillId: string;
    skillName: string;
    practicedAt: string;
    minutesPracticed: number;
  }>;
}

// Session Types

export interface SkillSession {
  id: string;
  learnerId: string;
  skillId: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes?: number;
  stepsCompleted: number;
  promptLevelUsed: PromptLevel;
  wasSuccessful?: boolean;
}

export interface StepAttempt {
  id: string;
  sessionId: string;
  stepId: string;
  attemptNumber: number;
  promptLevel: PromptLevel;
  wasSuccessful: boolean;
  durationSeconds?: number;
  notes?: string;
  attemptedAt: string;
}

// Goal Types

export interface LifeSkillGoal {
  id: string;
  learnerId: string;
  skillId: string;
  targetMastery: number;
  targetDate?: string;
  status: ProgressStatus;
  createdAt: string;
  achievedAt?: string;
  milestones: GoalMilestone[];
}

export interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  targetValue: number;
  currentValue: number;
  isAchieved: boolean;
  achievedAt?: string;
}
