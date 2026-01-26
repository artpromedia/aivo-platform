// ============================================
// Core Type Definitions for Brain Orchestrator
// ============================================

// Learning Task Types
export type LearningTask =
  | 'lesson-completion'
  | 'assessment'
  | 'practice-exercise'
  | 'review-session'
  | 'homework-help'
  | 'skill-building'
  | 'project-work'
  | 'collaboration';

// Cognitive Load Levels
export type CognitiveLoadLevel = 'low' | 'medium' | 'high' | 'overload';

// Task Status
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused' | 'cancelled';

// Plan Status
export type PlanStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

// Workflow Status
export type WorkflowStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'rolled_back';

// ============================================
// Task Context and Configuration
// ============================================

export interface TaskContext {
  subjectId?: string;
  topicId?: string;
  lessonId?: string;
  assessmentId?: string;
  skillIds: string[];
  metadata: Record<string, unknown>;
}

export interface Task {
  id: string;
  type: LearningTask;
  learnerId: string;
  tenantId: string;
  priority: number;
  estimatedDuration: number; // minutes
  cognitiveLoad: CognitiveLoadLevel;
  prerequisites: string[];
  dependencies: string[];
  deadline?: Date;
  context: TaskContext;
  status: TaskStatus;
  result?: TaskResult;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskResult {
  success: boolean;
  score?: number;
  masteryGain?: number;
  timeSpent: number; // minutes
  errorCount: number;
  data: Record<string, unknown>;
}

// ============================================
// Learning Goals and Plans
// ============================================

export interface LearningGoal {
  id: string;
  type: 'skill_mastery' | 'lesson_completion' | 'assessment_score' | 'project_completion' | 'custom';
  targetId: string;
  targetValue?: number;
  deadline?: Date;
  priority: number;
  description: string;
}

export interface OrchestrationPlan {
  id: string;
  learnerId: string;
  tenantId: string;
  goal: LearningGoal;
  tasks: Task[];
  status: PlanStatus;
  estimatedTotalDuration: number;
  cognitiveLoadProfile: CognitiveLoadProfile;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CognitiveLoadProfile {
  averageLoad: CognitiveLoadLevel;
  peakLoad: CognitiveLoadLevel;
  breakFrequency: number; // breaks per hour
  recommendedSessionLength: number; // minutes
}

// ============================================
// Learner Context and Profile
// ============================================

export interface LearnerContext {
  learnerId: string;
  tenantId: string;
  currentSession: SessionContext;
  cognitiveState: CognitiveState;
  preferences: LearnerPreferences;
  constraints: SchedulingConstraints;
}

export interface SessionContext {
  sessionId: string;
  startedAt: Date;
  tasksCompleted: number;
  totalTimeSpent: number; // minutes
  lastBreakAt?: Date;
  currentActivity?: string;
}

export interface LearnerPreferences {
  preferredSessionLength: number; // minutes
  preferredBreakLength: number; // minutes
  preferredDifficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
  learningStyle: 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed';
  peakHours: number[]; // 0-23
  avoidedActivityTypes: LearningTask[];
}

export interface LearnerProfile {
  id: string;
  tenantId: string;
  skillLevels: Map<string, number>;
  learningRate: number;
  averageAccuracy: number;
  averageResponseTime: number;
  preferredPace: 'slow' | 'normal' | 'fast';
  strengths: string[];
  weaknesses: string[];
}

export interface SchedulingConstraints {
  availableTimeMinutes: number;
  hardDeadlines: Array<{ taskId: string; deadline: Date }>;
  requiredBreaks: boolean;
  maxCognitiveLoad: CognitiveLoadLevel;
  excludedTimeSlots?: Array<{ start: Date; end: Date }>;
}

// ============================================
// Cognitive State
// ============================================

export interface CognitiveState {
  currentLoad: CognitiveLoadLevel;
  loadScore: number; // 0-100
  fatigueLevel: number; // 0-100
  attentionScore: number; // 0-100
  timeSinceBreak: number; // minutes
  tasksCompleted: number;
  errorRate: number; // 0-1
  responseLatency: number; // ms average
  engagementScore: number; // 0-100
  lastUpdated: Date;
}

export interface AttentionMetrics {
  focusScore: number;
  distractionEvents: number;
  averageTimeOnTask: number;
  taskSwitchFrequency: number;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface FatigueAssessment {
  level: number; // 0-100
  indicators: FatigueIndicator[];
  recommendation: 'continue' | 'take_short_break' | 'take_long_break' | 'end_session';
  confidence: number;
}

export interface FatigueIndicator {
  type: 'response_time' | 'accuracy' | 'engagement' | 'error_pattern' | 'time_on_task';
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
}

// ============================================
// Break Management
// ============================================

export interface BreakRecommendation {
  shouldTakeBreak: boolean;
  urgency: 'optional' | 'recommended' | 'required';
  suggestedDuration: number; // minutes
  suggestedActivity?: BreakActivity;
  reason: string;
}

export interface BreakActivity {
  type: 'stretch' | 'walk' | 'hydrate' | 'eye_rest' | 'mindfulness' | 'free';
  duration: number;
  instructions?: string;
}

export interface BreakSchedule {
  scheduledBreaks: ScheduledBreak[];
  totalBreakTime: number;
}

export interface ScheduledBreak {
  afterTaskId: string;
  duration: number;
  activity?: BreakActivity;
  isFlexible: boolean;
}

export interface BreakRecord {
  id: string;
  sessionId: string;
  startedAt: Date;
  endedAt?: Date;
  plannedDuration: number;
  actualDuration?: number;
  activity?: BreakActivity;
}

// ============================================
// Activity and Recommendations
// ============================================

export interface Activity {
  id: string;
  type: LearningTask;
  title: string;
  description: string;
  estimatedDuration: number;
  cognitiveLoad: CognitiveLoadLevel;
  difficulty: number; // 1-10
  skillIds: string[];
  prerequisites: string[];
  metadata: Record<string, unknown>;
}

export interface ActivityRecommendation {
  activity: Activity;
  reason: string;
  predictedSuccess: number; // 0-1
  predictedEngagement: number; // 0-1
  cognitiveLoadImpact: CognitiveLoadLevel;
  alternativeActivities: Activity[];
}

export interface DifficultyAdjustment {
  currentDifficulty: number;
  recommendedDifficulty: number;
  adjustmentReason: string;
  confidence: number;
}

// ============================================
// Learning Path
// ============================================

export interface LearningPath {
  id: string;
  learnerId: string;
  tenantId: string;
  name: string;
  description: string;
  activities: ActivitySequence;
  estimatedTotalDuration: number;
  progress: LearningPathProgress;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivitySequence {
  orderedActivities: SequencedActivity[];
  branchingPoints: BranchingPoint[];
}

export interface SequencedActivity {
  activity: Activity;
  order: number;
  isRequired: boolean;
  unlockConditions: UnlockCondition[];
}

export interface BranchingPoint {
  afterActivityId: string;
  condition: string;
  branches: Array<{
    condition: string;
    nextActivityIds: string[];
  }>;
}

export interface UnlockCondition {
  type: 'completion' | 'mastery' | 'score' | 'time';
  targetId?: string;
  targetValue: number;
}

export interface LearningPathProgress {
  completedActivityIds: string[];
  currentActivityId?: string;
  totalProgress: number; // 0-100
  estimatedTimeRemaining: number;
  lastActivityAt?: Date;
}

export interface OptimizedPath {
  originalPath: LearningPath;
  optimizedActivities: ActivitySequence;
  improvements: PathImprovement[];
  estimatedTimeReduction: number;
  estimatedEffectivenessGain: number;
}

export interface PathImprovement {
  type: 'reorder' | 'skip' | 'add' | 'replace';
  description: string;
  impact: string;
}

export interface PathAdjustment {
  type: 'difficulty' | 'order' | 'content' | 'pace';
  reason: string;
  changes: Array<{ activityId: string; change: string }>;
}

// ============================================
// Mastery Tracking
// ============================================

export interface MasteryState {
  learnerId: string;
  skills: Map<string, SkillMastery>;
  lastUpdated: Date;
}

export interface SkillMastery {
  skillId: string;
  level: number; // 0-100
  confidence: number; // 0-1
  lastPracticed: Date;
  practiceCount: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface MasteryEvidence {
  activityId: string;
  skillId: string;
  outcome: 'success' | 'partial' | 'failure';
  score?: number;
  timeSpent: number;
  attemptCount: number;
  errorTypes: string[];
}

export interface MasteryUpdate {
  skillId: string;
  previousLevel: number;
  newLevel: number;
  change: number;
  confidence: number;
  nextReviewDate: Date;
}

export interface MasteryPrediction {
  expectedGain: number;
  confidence: number;
  factors: Array<{ name: string; impact: number }>;
}

// ============================================
// Workflow and Coordination
// ============================================

export interface LearningWorkflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  metadata: Record<string, unknown>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'task' | 'decision' | 'parallel' | 'wait' | 'notification';
  config: Record<string, unknown>;
  nextSteps: string[];
  fallbackStep?: string;
}

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'condition';
  config: Record<string, unknown>;
}

export interface WorkflowContext {
  learnerId: string;
  tenantId: string;
  variables: Record<string, unknown>;
  history: WorkflowHistoryEntry[];
}

export interface WorkflowHistoryEntry {
  stepId: string;
  status: 'completed' | 'skipped' | 'failed';
  timestamp: Date;
  data?: Record<string, unknown>;
}

export interface WorkflowResult {
  workflowId: string;
  status: WorkflowStatus;
  completedSteps: string[];
  currentStep?: string;
  result?: Record<string, unknown>;
  error?: string;
}

// ============================================
// Service Coordination
// ============================================

export interface ServiceAction {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  payload?: Record<string, unknown>;
}

export interface ServiceRequest {
  serviceName: string;
  action: ServiceAction;
  timeout?: number;
  retryCount?: number;
}

export interface ServiceResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  latency: number;
}

export interface AggregatedResponse {
  responses: Map<string, ServiceResponse>;
  totalLatency: number;
  failedServices: string[];
}

// ============================================
// Events
// ============================================

export interface LearningEvent {
  id: string;
  type: string;
  learnerId: string;
  tenantId: string;
  timestamp: Date;
  data: Record<string, unknown>;
  source: string;
}

export interface UnifiedLearnerState {
  learnerId: string;
  tenantId: string;
  cognitiveState: CognitiveState;
  currentPlan?: OrchestrationPlan;
  currentPath?: LearningPath;
  masteryState: MasteryState;
  recentEvents: LearningEvent[];
  lastUpdated: Date;
}

// ============================================
// Learner Interactions
// ============================================

export interface LearnerInteraction {
  id: string;
  learnerId: string;
  tenantId: string;
  sessionId: string;
  type: InteractionType;
  activityId?: string;
  timestamp: Date;
  duration?: number;
  data: InteractionData;
}

export type InteractionType =
  | 'page_view'
  | 'click'
  | 'answer_submit'
  | 'content_interaction'
  | 'help_request'
  | 'pause'
  | 'resume'
  | 'idle'
  | 'focus_change';

export interface InteractionData {
  responseTime?: number;
  isCorrect?: boolean;
  attemptNumber?: number;
  errorType?: string;
  metadata?: Record<string, unknown>;
}

export interface DisengagementAlert {
  learnerId: string;
  sessionId: string;
  severity: 'low' | 'medium' | 'high';
  indicators: string[];
  suggestedActions: string[];
  timestamp: Date;
}

// ============================================
// Session and Session Planning
// ============================================

export interface SessionPlan {
  id: string;
  learnerId: string;
  tenantId: string;
  plannedDuration: number;
  activities: PlannedActivity[];
  breaks: ScheduledBreak[];
  cognitiveLoadDistribution: CognitiveLoadLevel[];
}

export interface PlannedActivity {
  activity: Activity;
  startOffset: number; // minutes from session start
  expectedDuration: number;
}

export interface SessionData {
  sessionId: string;
  learnerId: string;
  startedAt: Date;
  interactions: LearnerInteraction[];
  tasksCompleted: Task[];
  cognitiveStateHistory: CognitiveState[];
  breaks: BreakRecord[];
}

// ============================================
// Prediction and Completion
// ============================================

export interface CompletionPrediction {
  pathId: string;
  estimatedCompletionDate: Date;
  confidenceInterval: { low: Date; high: Date };
  factors: Array<{ name: string; impact: number }>;
  risks: Array<{ description: string; probability: number }>;
}

export interface PerformanceData {
  learnerId: string;
  period: { start: Date; end: Date };
  activitiesCompleted: number;
  averageScore: number;
  averageTimePerActivity: number;
  masteryGrowth: number;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
}

// ============================================
// Task Priority Queue
// ============================================

export interface PrioritizedTaskQueue {
  tasks: Task[];
  prioritizationFactors: PrioritizationFactor[];
  generatedAt: Date;
  validUntil: Date;
}

export interface PrioritizationFactor {
  name: string;
  weight: number;
  description: string;
}

export interface AdjustmentReason {
  type: 'performance' | 'cognitive_load' | 'time_constraint' | 'user_request' | 'system';
  description: string;
  data?: Record<string, unknown>;
}

// ============================================
// Sequencing Constraints
// ============================================

export interface SequencingConstraints {
  mustComplete: string[];
  preferredOrder: string[];
  interleaveTopics: boolean;
  spacedRepetitionEnabled: boolean;
  maxConsecutiveSameType: number;
  difficultyProgression: 'ascending' | 'descending' | 'mixed' | 'adaptive';
}

export interface NextSteps {
  immediateActions: string[];
  recommendedActivities: Activity[];
  milestones: Array<{ name: string; progress: number }>;
}
