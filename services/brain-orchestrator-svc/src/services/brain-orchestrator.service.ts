import { TaskOrchestrator } from '../orchestration/task-orchestrator.js';
import { TaskDecomposer } from '../orchestration/task-decomposer.js';
import { TaskPrioritizer } from '../orchestration/task-prioritizer.js';
import { CognitiveLoadManager } from '../cognitive/cognitive-load-manager.js';
import { AttentionTracker } from '../cognitive/attention-tracker.js';
import { FatigueDetector } from '../cognitive/fatigue-detector.js';
import { BreakScheduler } from '../cognitive/break-scheduler.js';
import { ServiceCoordinator } from '../coordination/service-coordinator.js';
import { WorkflowEngine } from '../coordination/workflow-engine.js';
import { EventAggregator } from '../coordination/event-aggregator.js';
import { LearningPathOptimizer } from '../learning/learning-path-optimizer.js';
import { ActivitySequencer } from '../learning/activity-sequencer.js';
import { MasteryTracker } from '../learning/mastery-tracker.js';
import type {
  LearningGoal,
  LearnerContext,
  OrchestrationPlan,
  CognitiveState,
  ActivityRecommendation,
  BreakRecommendation,
  LearningPath,
  MasteryState,
  UnifiedLearnerState,
} from '../types/index.js';

/**
 * Main service class that coordinates all brain orchestrator components
 */
export class BrainOrchestratorService {
  private taskOrchestrator: TaskOrchestrator;
  private cognitiveManager: CognitiveLoadManager;
  private attentionTracker: AttentionTracker;
  private fatigueDetector: FatigueDetector;
  private breakScheduler: BreakScheduler;
  private serviceCoordinator: ServiceCoordinator;
  private workflowEngine: WorkflowEngine;
  private eventAggregator: EventAggregator;
  private pathOptimizer: LearningPathOptimizer;
  private activitySequencer: ActivitySequencer;
  private masteryTracker: MasteryTracker;

  constructor(authToken?: string) {
    // Initialize cognitive components
    this.cognitiveManager = new CognitiveLoadManager();
    this.attentionTracker = new AttentionTracker();
    this.fatigueDetector = new FatigueDetector();
    this.breakScheduler = new BreakScheduler();

    // Initialize coordination components
    this.serviceCoordinator = new ServiceCoordinator(authToken);
    this.workflowEngine = new WorkflowEngine(this.serviceCoordinator);
    this.eventAggregator = new EventAggregator(this.cognitiveManager);

    // Initialize orchestration components
    const decomposer = new TaskDecomposer();
    const prioritizer = new TaskPrioritizer();
    this.taskOrchestrator = new TaskOrchestrator(
      decomposer,
      prioritizer,
      this.serviceCoordinator,
      this.cognitiveManager
    );

    // Initialize learning components
    this.pathOptimizer = new LearningPathOptimizer();
    this.activitySequencer = new ActivitySequencer();
    this.masteryTracker = new MasteryTracker();
  }

  /**
   * Set authentication token for service-to-service calls
   */
  setAuthToken(token: string): void {
    this.serviceCoordinator.setAuthToken(token);
  }

  // ==========================================
  // Orchestration Methods
  // ==========================================

  /**
   * Create and start an orchestration plan for a learning goal
   */
  async orchestrate(
    goal: LearningGoal,
    learnerContext: LearnerContext,
    autoStart: boolean = false
  ): Promise<OrchestrationPlan> {
    const plan = await this.taskOrchestrator.orchestrate(goal, learnerContext);

    if (autoStart) {
      return this.taskOrchestrator.startPlan(plan.id);
    }

    return plan;
  }

  /**
   * Get the next task for a learner to work on
   */
  async getNextTask(planId: string): Promise<any | null> {
    return this.taskOrchestrator.getNextTask(planId);
  }

  /**
   * Pause an active plan
   */
  async pausePlan(planId: string): Promise<void> {
    return this.taskOrchestrator.pausePlan(planId);
  }

  /**
   * Resume a paused plan
   */
  async resumePlan(planId: string): Promise<void> {
    return this.taskOrchestrator.resumePlan(planId);
  }

  // ==========================================
  // Cognitive Methods
  // ==========================================

  /**
   * Get current cognitive state for a learner
   */
  async getCognitiveState(learnerId: string): Promise<CognitiveState> {
    return this.cognitiveManager.assessCurrentLoad(learnerId, []);
  }

  /**
   * Get break recommendation based on cognitive state
   */
  async getBreakRecommendation(learnerId: string): Promise<BreakRecommendation> {
    const cognitiveState = await this.cognitiveManager.assessCurrentLoad(learnerId, []);
    return this.cognitiveManager.shouldTakeBreak(cognitiveState);
  }

  /**
   * Get activity recommendation based on cognitive state
   */
  async getActivityRecommendation(
    learnerId: string,
    availableActivities: any[]
  ): Promise<ActivityRecommendation> {
    const cognitiveState = await this.cognitiveManager.assessCurrentLoad(learnerId, []);
    return this.cognitiveManager.recommendNextActivity(
      learnerId,
      availableActivities,
      cognitiveState
    );
  }

  // ==========================================
  // Learning Path Methods
  // ==========================================

  /**
   * Get optimized learning path
   */
  async optimizeLearningPath(
    currentPath: LearningPath,
    learnerProgress: any,
    goals: LearningGoal[]
  ): Promise<any> {
    return this.pathOptimizer.optimizePath(currentPath, learnerProgress, goals);
  }

  /**
   * Get mastery state for a learner
   */
  async getMasteryState(learnerId: string, skillIds: string[]): Promise<MasteryState> {
    return this.masteryTracker.getMasteryState(learnerId, skillIds);
  }

  /**
   * Get mastery summary for a learner
   */
  async getMasterySummary(learnerId: string): Promise<any> {
    return this.masteryTracker.getMasterySummary(learnerId);
  }

  // ==========================================
  // Unified State Methods
  // ==========================================

  /**
   * Get unified learner state from all sources
   */
  async getUnifiedLearnerState(
    learnerId: string,
    tenantId: string
  ): Promise<UnifiedLearnerState> {
    return this.eventAggregator.getUnifiedState(learnerId, tenantId);
  }

  /**
   * Get aggregated statistics for a learner
   */
  async getAggregatedStats(
    learnerId: string,
    tenantId: string,
    periodDays: number = 7
  ): Promise<any> {
    return this.eventAggregator.getAggregatedStats(learnerId, tenantId, periodDays);
  }

  // ==========================================
  // Health Check Methods
  // ==========================================

  /**
   * Check health of all dependent services
   */
  async checkServicesHealth(): Promise<Map<string, boolean>> {
    return this.serviceCoordinator.checkServicesHealth();
  }

  /**
   * Get detailed service status
   */
  getServiceStatus(serviceName: string): any {
    return this.serviceCoordinator.getServiceStatus(serviceName);
  }
}

// Singleton instance
let serviceInstance: BrainOrchestratorService | null = null;

/**
 * Get the singleton service instance
 */
export function getBrainOrchestratorService(authToken?: string): BrainOrchestratorService {
  if (!serviceInstance) {
    serviceInstance = new BrainOrchestratorService(authToken);
  } else if (authToken) {
    serviceInstance.setAuthToken(authToken);
  }
  return serviceInstance;
}
