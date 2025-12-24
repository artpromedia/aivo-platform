/**
 * SCORM 2004 Sequencing and Navigation Engine
 *
 * Implements the full IMS Simple Sequencing specification as used in SCORM 2004.
 * Reference: ADL SCORM 2004 4th Edition Sequencing and Navigation (SN) documentation
 *
 * Key Concepts:
 * - Activity Tree: Hierarchical structure of learning activities
 * - Tracking Model: Progress and status tracking per activity
 * - Sequencing Rules: Conditions that control navigation
 * - Rollup Rules: How child status affects parent status
 * - Navigation Request: User or system initiated navigation
 *
 * @see https://adlnet.gov/projects/scorm-2004-4th-edition/
 */

import type {
  Activity,
  DeliveryRequest,
  GlobalStateInfo,
  NavigationRequestEvent,
  RollupRule,
  RuleCondition,
  SequencingException,
  SequencingRequest,
  SequencingRuleAction,
  SuspendedStateData,
  TerminationRequest,
} from './types.js';
import { DEFAULT_LEARNER_PREFERENCES } from './types.js';

// ============================================================================
// SEQUENCING ERROR
// ============================================================================

/**
 * Custom error class for sequencing exceptions
 */
export class SequencingError extends Error {
  constructor(public code: SequencingException) {
    super(`Sequencing Exception: ${code}`);
    this.name = 'SequencingError';
  }
}

// ============================================================================
// SEQUENCING ENGINE
// ============================================================================

/**
 * SCORM 2004 Sequencing Engine
 *
 * Implements the complete SCORM 2004 4th Edition sequencing and navigation model.
 */
export class SequencingEngine {
  private globalState!: GlobalStateInfo;
  private attemptId: string | null = null;

  /**
   * Initialize sequencing engine with activity tree
   */
  async initialize(
    attemptId: string,
    activityTree: Activity,
    suspendedState?: SuspendedStateData
  ): Promise<void> {
    this.attemptId = attemptId;

    this.globalState = {
      currentActivity: null,
      suspendedActivity: null,
      activityTree,
      definedObjectives: new Map(),
      learnerPreferences: { ...DEFAULT_LEARNER_PREFERENCES },
    };

    // Restore suspended state if exists
    if (suspendedState) {
      await this.restoreSuspendedState(suspendedState);
    }

    console.log('[Sequencing] Engine initialized', { attemptId });
  }

  /**
   * Process a navigation request
   * Main entry point for all navigation actions
   */
  async processNavigationRequest(request: NavigationRequestEvent): Promise<DeliveryRequest> {
    console.log('[Sequencing] Processing navigation request', { request });

    try {
      // Navigation Request Process (SN book, section NB)
      const terminationRequest = this.navigationRequestProcess(request);

      // If termination needed, do it first
      if (terminationRequest !== '_none_') {
        const terminationResult = await this.terminationRequestProcess(terminationRequest);
        if (!terminationResult.success) {
          return {
            valid: false,
            exception: terminationResult.exception,
          };
        }
      }

      // Map navigation request to sequencing request
      const sequencingRequest = this.mapToSequencingRequest(request);

      if (sequencingRequest === '_none_') {
        return { valid: false, exception: 'NB.2.1-12' };
      }

      // Sequencing Request Process (SN book, section SB)
      const deliveryRequest = await this.sequencingRequestProcess(
        sequencingRequest,
        request.targetActivityId
      );

      // If valid delivery, perform delivery
      if (deliveryRequest.valid && deliveryRequest.activityId) {
        await this.deliveryRequestProcess(deliveryRequest.activityId);

        // Add launch URL
        const activity = this.findActivity(deliveryRequest.activityId);
        if (activity) {
          deliveryRequest.launchUrl = activity.launchUrl;
        }
      }

      return deliveryRequest;
    } catch (error) {
      if (error instanceof SequencingError) {
        return { valid: false, exception: error.code };
      }
      throw error;
    }
  }

  /**
   * Navigation Request Process (NB.2.1)
   * Validates the navigation request and determines termination needs
   */
  private navigationRequestProcess(request: NavigationRequestEvent): TerminationRequest {
    const { request: navRequest, targetActivityId } = request;
    const current = this.globalState.currentActivity;

    switch (navRequest) {
      case 'start':
        // NB.2.1-1: Current activity must not be defined
        if (current) {
          throw new SequencingError('NB.2.1-1');
        }
        return '_none_';

      case 'resumeAll':
        // NB.2.1-2: Current activity must not be defined
        if (current) {
          throw new SequencingError('NB.2.1-1');
        }
        // NB.2.1-3: Suspended activity must be defined
        if (!this.globalState.suspendedActivity) {
          throw new SequencingError('NB.2.1-3');
        }
        return '_none_';

      case 'continue':
      case 'previous':
        // NB.2.1-2: Current activity must be defined
        if (!current) {
          throw new SequencingError('NB.2.1-2');
        }
        // Check flow is enabled on parent
        if (!this.isFlowEnabled(current)) {
          throw new SequencingError('NB.2.1-4');
        }
        return current.trackingInfo.activityIsActive ? 'exit' : '_none_';

      case 'choice': {
        // NB.2.1-6: Choice must be enabled
        if (!targetActivityId) {
          throw new SequencingError('NB.2.1-6');
        }
        const target = this.findActivity(targetActivityId);
        if (!target) {
          throw new SequencingError('NB.2.1-7');
        }
        // Check choice is enabled on target
        if (!this.isChoiceEnabled(target)) {
          throw new SequencingError('NB.2.1-6');
        }
        if (current?.trackingInfo.activityIsActive) {
          return 'exit';
        }
        return '_none_';
      }

      case 'jump':
        // SCORM 2004 4th Ed
        if (!current) {
          throw new SequencingError('NB.2.1-2');
        }
        if (!targetActivityId) {
          throw new SequencingError('NB.2.1-7');
        }
        return current.trackingInfo.activityIsActive ? 'exit' : '_none_';

      case 'exit':
        if (!current) {
          throw new SequencingError('NB.2.1-2');
        }
        if (!current.trackingInfo.activityIsActive) {
          throw new SequencingError('TB.2.3-1');
        }
        return 'exit';

      case 'exitAll':
        if (!current) {
          throw new SequencingError('NB.2.1-2');
        }
        return 'exitAll';

      case 'suspendAll':
        if (!current) {
          throw new SequencingError('NB.2.1-2');
        }
        return 'suspendAll';

      case 'abandon':
        if (!current) {
          throw new SequencingError('NB.2.1-2');
        }
        return 'exit'; // Abandon without saving

      case 'abandonAll':
        if (!current) {
          throw new SequencingError('NB.2.1-2');
        }
        return 'abandonAll';

      default:
        return '_none_';
    }
  }

  /**
   * Termination Request Process (TB.2.3)
   */
  private async terminationRequestProcess(
    request: TerminationRequest
  ): Promise<{ success: boolean; exception?: SequencingException }> {
    const current = this.globalState.currentActivity;

    if (!current) {
      return { success: false, exception: 'TB.2.3-1' };
    }

    switch (request) {
      case 'exit': {
        // End the current attempt on the activity
        await this.endAttempt(current);

        // Evaluate post-condition rules
        const postAction = this.evaluatePostConditionRules(current);
        if (postAction) {
          await this.applyPostConditionAction(current, postAction);
        }

        // Perform rollup
        await this.overallRollupProcess(current);

        current.trackingInfo.activityIsActive = false;
        break;
      }

      case 'exitParent':
        await this.endAttempt(current);

        // End attempt on parent too
        if (current.parentId) {
          const parent = this.findActivity(current.parentId);
          if (parent) {
            await this.endAttempt(parent);
            await this.overallRollupProcess(parent);
            parent.trackingInfo.activityIsActive = false;
          }
        }
        break;

      case 'exitAll': {
        // End all active attempts up to root
        let activity: Activity | null = current;
        while (activity) {
          await this.endAttempt(activity);
          await this.overallRollupProcess(activity);
          activity.trackingInfo.activityIsActive = false;

          if (activity.parentId) {
            activity = this.findActivity(activity.parentId);
          } else {
            activity = null;
          }
        }
        this.globalState.currentActivity = null;
        break;
      }

      case 'suspendAll': {
        // Suspend all active activities
        this.globalState.suspendedActivity = current;

        let activity: Activity | null = current;
        while (activity) {
          activity.trackingInfo.activityIsSuspended = true;

          if (activity.parentId) {
            activity = this.findActivity(activity.parentId);
          } else {
            activity = null;
          }
        }
        this.globalState.currentActivity = null;
        break;
      }

      case 'abandonAll':
        // Exit without saving
        this.globalState.currentActivity = null;
        break;
    }

    return { success: true };
  }

  /**
   * Sequencing Request Process (SB.2)
   */
  private async sequencingRequestProcess(
    request: SequencingRequest,
    targetId?: string
  ): Promise<DeliveryRequest> {
    switch (request) {
      case 'start':
        return this.startSequencingRequest();

      case 'resumeAll':
        return this.resumeAllSequencingRequest();

      case 'continue':
        return this.continueSequencingRequest();

      case 'previous':
        return this.previousSequencingRequest();

      case 'choice':
        if (!targetId) {
          return { valid: false, exception: 'NB.2.1-7' };
        }
        return this.choiceSequencingRequest(targetId);

      case 'retry':
        return this.retrySequencingRequest();

      case 'exit':
        return this.exitSequencingRequest();

      case 'jump':
        if (!targetId) {
          return { valid: false, exception: 'NB.2.1-7' };
        }
        return this.jumpSequencingRequest(targetId);

      default:
        return { valid: false, exception: 'NB.2.1-12' };
    }
  }

  /**
   * Start Sequencing Request (SB.2.5)
   */
  private startSequencingRequest(): DeliveryRequest {
    // Find the first available activity using Flow subprocess
    const root = this.globalState.activityTree;

    // Flow subprocess to find first deliverable activity
    const firstActivity = this.flowSubprocess(root, 'forward');

    if (!firstActivity) {
      return { valid: false, exception: 'SB.2.1-1' };
    }

    return { valid: true, activityId: firstActivity.id };
  }

  /**
   * Resume All Sequencing Request (SB.2.6)
   */
  private resumeAllSequencingRequest(): DeliveryRequest {
    const suspended = this.globalState.suspendedActivity;

    if (!suspended) {
      return { valid: false, exception: 'NB.2.1-3' };
    }

    // Clear suspension
    this.clearSuspension(suspended);

    return { valid: true, activityId: suspended.id };
  }

  /**
   * Continue Sequencing Request (SB.2.7)
   */
  private continueSequencingRequest(): DeliveryRequest {
    const current = this.globalState.currentActivity;

    if (!current) {
      return { valid: false, exception: 'NB.2.1-2' };
    }

    // Flow subprocess to find next activity
    const nextActivity = this.flowSubprocess(current, 'forward');

    if (!nextActivity) {
      // Check if we should exit to parent
      const parent = current.parentId ? this.findActivity(current.parentId) : null;
      if (parent?.sequencingDefinition.controlMode.flow) {
        return this.continueFromParent(parent);
      }
      return { valid: false, exception: 'SB.2.1-1' };
    }

    return { valid: true, activityId: nextActivity.id };
  }

  /**
   * Previous Sequencing Request (SB.2.8)
   */
  private previousSequencingRequest(): DeliveryRequest {
    const current = this.globalState.currentActivity;

    if (!current) {
      return { valid: false, exception: 'NB.2.1-2' };
    }

    // Check forward only constraint
    if (this.isForwardOnly(current)) {
      return { valid: false, exception: 'SB.2.4-1' };
    }

    // Flow subprocess to find previous activity
    const prevActivity = this.flowSubprocess(current, 'backward');

    if (!prevActivity) {
      return { valid: false, exception: 'SB.2.2-1' };
    }

    return { valid: true, activityId: prevActivity.id };
  }

  /**
   * Choice Sequencing Request (SB.2.9)
   */
  private choiceSequencingRequest(targetId: string): DeliveryRequest {
    const target = this.findActivity(targetId);

    if (!target) {
      return { valid: false, exception: 'NB.2.1-7' };
    }

    // Check if choice is available
    const available = this.checkChoiceAvailability(target);
    if (!available.available) {
      return { valid: false, exception: available.exception };
    }

    // Check for blocked path from current to target
    const current = this.globalState.currentActivity;
    if (current) {
      const pathClear = this.checkChoicePath(current, target);
      if (!pathClear.clear) {
        return { valid: false, exception: pathClear.exception };
      }
    }

    // If target is a cluster, use flow to find deliverable descendant
    if (target.children.length > 0 && !target.resourceId) {
      const deliverable = this.flowSubprocess(target, 'forward');
      if (!deliverable) {
        return { valid: false, exception: 'DB.1.1-3' };
      }
      return { valid: true, activityId: deliverable.id };
    }

    return { valid: true, activityId: target.id };
  }

  /**
   * Jump Sequencing Request (SCORM 2004 4th Ed)
   */
  private jumpSequencingRequest(targetId: string): DeliveryRequest {
    const target = this.findActivity(targetId);

    if (!target) {
      return { valid: false, exception: 'NB.2.1-7' };
    }

    // Jump bypasses choice availability checks
    // but target must be a leaf activity
    if (target.children.length > 0 && !target.resourceId) {
      return { valid: false, exception: 'DB.1.1-3' };
    }

    return { valid: true, activityId: target.id };
  }

  /**
   * Retry Sequencing Request (SB.2.10)
   */
  private retrySequencingRequest(): DeliveryRequest {
    const current = this.globalState.currentActivity;

    if (!current) {
      return { valid: false, exception: 'NB.2.1-2' };
    }

    // Reset attempt and redeliver
    current.trackingInfo.attemptCount++;
    this.resetAttemptData(current);

    return { valid: true, activityId: current.id };
  }

  /**
   * Exit Sequencing Request (SB.2.11)
   */
  private exitSequencingRequest(): DeliveryRequest {
    // Exit moves to parent or ends session
    const current = this.globalState.currentActivity;

    if (!current) {
      return { valid: false, exception: 'NB.2.1-2' };
    }

    // If root, end session
    if (!current.parentId) {
      return { valid: false, exception: 'SB.2.11-1' };
    }

    // Move to parent and check for continuation
    const parent = this.findActivity(current.parentId);
    if (!parent) {
      return { valid: false, exception: 'SB.2.11-1' };
    }

    // Check post-condition rules on parent
    const postAction = this.evaluatePostConditionRules(parent);
    if (postAction === 'continue') {
      return this.continueSequencingRequest();
    }

    return { valid: false, exception: 'NB.2.1-12' };
  }

  /**
   * Delivery Request Process (DB.1.1 and DB.2)
   */
  private async deliveryRequestProcess(activityId: string): Promise<void> {
    const activity = this.findActivity(activityId);

    if (!activity) {
      throw new SequencingError('DB.1.1-1');
    }

    // Check if activity is available for delivery
    if (!this.checkActivityAvailable(activity)) {
      throw new SequencingError('DB.1.1-2');
    }

    // Verify activity is a leaf (has content)
    if (activity.children.length > 0 && !activity.resourceId) {
      throw new SequencingError('DB.1.1-3');
    }

    // Begin attempt on activity and all ancestors
    let current: Activity | null = activity;
    const activitiesToStart: Activity[] = [];

    while (current) {
      if (!current.trackingInfo.activityIsActive) {
        activitiesToStart.unshift(current);
      }
      current = current.parentId ? this.findActivity(current.parentId) : null;
    }

    // Start attempts in order from root to leaf
    for (const act of activitiesToStart) {
      await this.beginAttempt(act);
    }

    // Set current activity
    this.globalState.currentActivity = activity;

    console.log('[Sequencing] Activity delivered', { activityId });
  }

  /**
   * Flow Subprocess (SB.2.3)
   * Traverse the activity tree to find next deliverable activity
   */
  private flowSubprocess(activity: Activity, direction: 'forward' | 'backward'): Activity | null {
    // Check pre-condition rules
    const preConditionResult = this.evaluatePreConditionRules(activity);
    if (preConditionResult === 'skip' || preConditionResult === 'disabled') {
      // Try next sibling
      return this.getNextSibling(activity, direction);
    }

    // If activity is a leaf with content, return it
    if (activity.resourceId && activity.children.length === 0) {
      return activity;
    }

    // If activity is a cluster, descend
    if (activity.children.length > 0) {
      const children =
        direction === 'forward' ? [...activity.children] : [...activity.children].reverse();

      // Handle randomization
      if (activity.sequencingDefinition.randomizationControls.reorderChildren) {
        this.randomizeChildren(children);
      }

      // Handle selection
      const selectCount = activity.sequencingDefinition.randomizationControls.selectCount;
      const selectedChildren = selectCount ? children.slice(0, selectCount) : children;

      for (const child of selectedChildren) {
        if (child.isVisible) {
          const result = this.flowSubprocess(child, direction);
          if (result) {
            return result;
          }
        }
      }
    }

    // Try next sibling
    return this.getNextSibling(activity, direction);
  }

  /**
   * Overall Rollup Process (RB.1.5)
   */
  private async overallRollupProcess(activity: Activity): Promise<void> {
    // Rollup from this activity up to root
    let current: Activity | null = activity;

    while (current) {
      if (current.children.length > 0) {
        // Measure rollup
        this.measureRollupProcess(current);

        // Objective rollup
        this.objectiveRollupProcess(current);

        // Activity progress rollup
        this.activityProgressRollupProcess(current);

        // Apply rollup rules
        this.applyRollupRules(current);
      }

      current = current.parentId ? this.findActivity(current.parentId) : null;
    }
  }

  /**
   * Measure Rollup Process (RB.1.1)
   */
  private measureRollupProcess(activity: Activity): void {
    if (!activity.sequencingDefinition.rollupRules.rollupObjectiveSatisfied) {
      return;
    }

    const primaryObjId = activity.sequencingDefinition.primaryObjectiveId;
    let totalWeight = 0;
    let totalMeasure = 0;

    for (const child of activity.children) {
      const childTracking = child.trackingInfo;
      const childObjProgress = childTracking.objectiveProgress.get(primaryObjId);

      if (childObjProgress?.measureStatus) {
        const weight = child.sequencingDefinition.rollupRules.objectiveMeasureWeight;
        totalWeight += weight;
        totalMeasure += childObjProgress.normalizedMeasure * weight;
      }
    }

    if (totalWeight > 0) {
      const rolledUpMeasure = totalMeasure / totalWeight;

      const objProgress = activity.trackingInfo.objectiveProgress.get(primaryObjId) || {
        objectiveId: primaryObjId,
        progressStatus: false,
        satisfiedStatus: false,
        measureStatus: false,
        normalizedMeasure: 0,
      };

      objProgress.measureStatus = true;
      objProgress.normalizedMeasure = rolledUpMeasure;

      activity.trackingInfo.objectiveProgress.set(primaryObjId, objProgress);
    }
  }

  /**
   * Objective Rollup Process (RB.1.2)
   */
  private objectiveRollupProcess(activity: Activity): void {
    const primaryObjId = activity.sequencingDefinition.primaryObjectiveId;
    const primaryObj = activity.sequencingDefinition.objectives.find(
      (o) => o.objectiveId === primaryObjId
    );

    if (!primaryObj) return;

    // Check if satisfied by measure
    if (primaryObj.satisfiedByMeasure) {
      const objProgress = activity.trackingInfo.objectiveProgress.get(primaryObjId);
      if (objProgress?.measureStatus) {
        objProgress.satisfiedStatus =
          objProgress.normalizedMeasure >= primaryObj.minNormalizedMeasure;
        objProgress.progressStatus = true;
      }
    }
  }

  /**
   * Activity Progress Rollup Process (RB.1.3)
   */
  private activityProgressRollupProcess(activity: Activity): void {
    if (!activity.sequencingDefinition.rollupRules.rollupProgressCompletion) {
      return;
    }

    let allCompleted = true;
    let anyAttempted = false;

    for (const child of activity.children) {
      if (child.trackingInfo.attemptProgressStatus) {
        anyAttempted = true;
        if (!child.trackingInfo.attemptCompletionStatus) {
          allCompleted = false;
        }
      } else {
        allCompleted = false;
      }
    }

    if (anyAttempted) {
      activity.trackingInfo.attemptProgressStatus = true;
      activity.trackingInfo.attemptCompletionStatus = allCompleted;
    }
  }

  /**
   * Apply Rollup Rules (RB.1.4)
   */
  private applyRollupRules(activity: Activity): void {
    for (const rule of activity.sequencingDefinition.rollupRules.rules) {
      const applies = this.evaluateRollupRule(activity, rule);

      if (applies) {
        const primaryObjId = activity.sequencingDefinition.primaryObjectiveId;
        const objProgress = activity.trackingInfo.objectiveProgress.get(primaryObjId) || {
          objectiveId: primaryObjId,
          progressStatus: false,
          satisfiedStatus: false,
          measureStatus: false,
          normalizedMeasure: 0,
        };

        switch (rule.action) {
          case 'satisfied':
            objProgress.progressStatus = true;
            objProgress.satisfiedStatus = true;
            break;
          case 'notSatisfied':
            objProgress.progressStatus = true;
            objProgress.satisfiedStatus = false;
            break;
          case 'completed':
            activity.trackingInfo.attemptProgressStatus = true;
            activity.trackingInfo.attemptCompletionStatus = true;
            break;
          case 'incomplete':
            activity.trackingInfo.attemptProgressStatus = true;
            activity.trackingInfo.attemptCompletionStatus = false;
            break;
        }

        activity.trackingInfo.objectiveProgress.set(primaryObjId, objProgress);
      }
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Find an activity by ID in the tree
   */
  findActivity(id: string, root?: Activity): Activity | null {
    const searchRoot = root || this.globalState.activityTree;

    if (searchRoot.id === id) {
      return searchRoot;
    }

    for (const child of searchRoot.children) {
      const found = this.findActivity(id, child);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * Get all leaf activities (SCOs)
   */
  getAllLeaves(root?: Activity): Activity[] {
    const searchRoot = root || this.globalState.activityTree;
    const leaves: Activity[] = [];

    const traverse = (activity: Activity) => {
      if (activity.resourceId && activity.children.length === 0) {
        leaves.push(activity);
      }
      for (const child of activity.children) {
        traverse(child);
      }
    };

    traverse(searchRoot);
    return leaves;
  }

  private evaluatePreConditionRules(activity: Activity): SequencingRuleAction | null {
    for (const rule of activity.sequencingDefinition.preConditionRules) {
      if (this.evaluateRuleConditions(activity, rule.conditions, rule.conditionCombination)) {
        return rule.action;
      }
    }
    return null;
  }

  private evaluatePostConditionRules(activity: Activity): SequencingRuleAction | null {
    for (const rule of activity.sequencingDefinition.postConditionRules) {
      if (this.evaluateRuleConditions(activity, rule.conditions, rule.conditionCombination)) {
        return rule.action;
      }
    }
    return null;
  }

  private evaluateRuleConditions(
    activity: Activity,
    conditions: RuleCondition[],
    combination: 'all' | 'any'
  ): boolean {
    if (conditions.length === 0) return false;

    const results = conditions.map((c) => this.evaluateRuleCondition(activity, c));

    if (combination === 'all') {
      return results.every((r) => r);
    } else {
      return results.some((r) => r);
    }
  }

  private evaluateRuleCondition(activity: Activity, condition: RuleCondition): boolean {
    let result = false;
    const tracking = activity.trackingInfo;
    const objProgress = condition.referencedObjective
      ? tracking.objectiveProgress.get(condition.referencedObjective)
      : tracking.objectiveProgress.get(activity.sequencingDefinition.primaryObjectiveId);

    switch (condition.condition) {
      case 'satisfied':
        result = objProgress?.satisfiedStatus === true;
        break;
      case 'objectiveStatusKnown':
        result = objProgress?.progressStatus === true;
        break;
      case 'objectiveMeasureKnown':
        result = objProgress?.measureStatus === true;
        break;
      case 'objectiveMeasureGreaterThan':
        result = (objProgress?.normalizedMeasure || 0) > (condition.measureThreshold || 0);
        break;
      case 'objectiveMeasureLessThan':
        result = (objProgress?.normalizedMeasure || 0) < (condition.measureThreshold || 0);
        break;
      case 'completed':
        result = tracking.attemptCompletionStatus;
        break;
      case 'activityProgressKnown':
        result = tracking.attemptProgressStatus;
        break;
      case 'attempted':
        result = tracking.attemptCount > 0;
        break;
      case 'attemptLimitExceeded': {
        const limit = activity.sequencingDefinition.limitConditions.attemptLimit;
        result = limit !== undefined && tracking.attemptCount >= limit;
        break;
      }
      case 'always':
        result = true;
        break;
    }

    // Apply operator
    if (condition.operator === 'not') {
      result = !result;
    }

    return result;
  }

  private evaluateRollupRule(activity: Activity, rule: RollupRule): boolean {
    const childResults = activity.children.map((child) => {
      return this.evaluateRuleConditions(
        child,
        rule.conditions as RuleCondition[],
        rule.conditionCombination
      );
    });

    const trueCount = childResults.filter((r) => r).length;
    const totalCount = childResults.length;

    switch (rule.childActivitySet) {
      case 'all':
        return trueCount === totalCount;
      case 'any':
        return trueCount > 0;
      case 'none':
        return trueCount === 0;
      case 'atLeastCount':
        return trueCount >= (rule.minimumCount || 0);
      case 'atLeastPercent':
        return (trueCount / totalCount) * 100 >= (rule.minimumPercent || 0);
      default:
        return false;
    }
  }

  private isFlowEnabled(activity: Activity): boolean {
    const parent = activity.parentId ? this.findActivity(activity.parentId) : null;
    return parent?.sequencingDefinition.controlMode.flow ?? false;
  }

  private isChoiceEnabled(activity: Activity): boolean {
    const parent = activity.parentId ? this.findActivity(activity.parentId) : null;
    return parent?.sequencingDefinition.controlMode.choice ?? true;
  }

  private isForwardOnly(activity: Activity): boolean {
    const parent = activity.parentId ? this.findActivity(activity.parentId) : null;
    return parent?.sequencingDefinition.controlMode.forwardOnly ?? false;
  }

  private getNextSibling(activity: Activity, direction: 'forward' | 'backward'): Activity | null {
    if (!activity.parentId) return null;

    const parent = this.findActivity(activity.parentId);
    if (!parent) return null;

    const siblings = parent.children;
    const index = siblings.findIndex((s) => s.id === activity.id);

    if (direction === 'forward' && index < siblings.length - 1) {
      const nextSibling = siblings[index + 1];
      return this.flowSubprocess(nextSibling, 'forward');
    }
    if (direction === 'backward' && index > 0) {
      const prevSibling = siblings[index - 1];
      // For backward, get the last leaf of the previous sibling
      return this.getLastLeaf(prevSibling) || prevSibling;
    }

    // No more siblings, try parent's next sibling
    return this.getNextSibling(parent, direction);
  }

  private getLastLeaf(activity: Activity): Activity | null {
    if (activity.resourceId && activity.children.length === 0) {
      return activity;
    }

    if (activity.children.length > 0) {
      const lastChild = activity.children[activity.children.length - 1];
      return this.getLastLeaf(lastChild);
    }

    return null;
  }

  private randomizeChildren(children: Activity[]): void {
    for (let i = children.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [children[i], children[j]] = [children[j], children[i]];
    }
  }

  private checkActivityAvailable(activity: Activity): boolean {
    const preResult = this.evaluatePreConditionRules(activity);
    return preResult !== 'disabled' && preResult !== 'hiddenFromChoice';
  }

  private checkChoiceAvailability(target: Activity): {
    available: boolean;
    exception?: SequencingException;
  } {
    // Check pre-conditions
    const preResult = this.evaluatePreConditionRules(target);
    if (preResult === 'disabled' || preResult === 'hiddenFromChoice') {
      return { available: false, exception: 'SB.2.6-2' };
    }

    // Check parent's constrained choice
    if (target.parentId) {
      const parent = this.findActivity(target.parentId);
      if (parent?.sequencingDefinition.constrainedChoice) {
        // Must have valid path from current
        // Implementation simplified - full spec requires path validation
      }
    }

    return { available: true };
  }

  private checkChoicePath(
    from: Activity,
    to: Activity
  ): { clear: boolean; exception?: SequencingException } {
    // Check if choice exit is allowed
    let current: Activity | null = from;

    while (current && current.id !== to.id) {
      const parent = current.parentId ? this.findActivity(current.parentId) : null;

      if (parent && !parent.sequencingDefinition?.controlMode.choiceExit) {
        // Check if target is descendant of current
        if (!this.isDescendant(to, current)) {
          return { clear: false, exception: 'NB.2.1-9' };
        }
      }

      current = parent;
    }

    return { clear: true };
  }

  private isDescendant(activity: Activity, ancestor: Activity): boolean {
    let current: Activity | null = activity;

    while (current) {
      if (current.id === ancestor.id) {
        return true;
      }
      current = current.parentId ? this.findActivity(current.parentId) : null;
    }

    return false;
  }

  private continueFromParent(parent: Activity): DeliveryRequest {
    // Try to continue from parent level
    const grandparent = parent.parentId ? this.findActivity(parent.parentId) : null;

    if (grandparent?.sequencingDefinition.controlMode.flow) {
      const nextSibling = this.getNextSibling(parent, 'forward');
      if (nextSibling) {
        return { valid: true, activityId: nextSibling.id };
      }
      return this.continueFromParent(grandparent);
    }

    return { valid: false, exception: 'SB.2.1-1' };
  }

  private async beginAttempt(activity: Activity): Promise<void> {
    activity.trackingInfo.activityIsActive = true;
    activity.trackingInfo.attemptCount++;

    // Initialize objective progress if not exists
    for (const obj of activity.sequencingDefinition.objectives) {
      if (!activity.trackingInfo.objectiveProgress.has(obj.objectiveId)) {
        activity.trackingInfo.objectiveProgress.set(obj.objectiveId, {
          objectiveId: obj.objectiveId,
          progressStatus: false,
          satisfiedStatus: false,
          measureStatus: false,
          normalizedMeasure: 0,
        });
      }
    }
  }

  private async endAttempt(activity: Activity): Promise<void> {
    activity.trackingInfo.activityIsActive = false;
  }

  private resetAttemptData(activity: Activity): void {
    activity.trackingInfo.attemptProgressStatus = false;
    activity.trackingInfo.attemptCompletionStatus = false;
    activity.trackingInfo.attemptCompletionAmount = undefined;

    for (const objProgress of activity.trackingInfo.objectiveProgress.values()) {
      objProgress.progressStatus = false;
      objProgress.satisfiedStatus = false;
      objProgress.measureStatus = false;
      objProgress.normalizedMeasure = 0;
    }
  }

  private async applyPostConditionAction(
    activity: Activity,
    action: SequencingRuleAction
  ): Promise<void> {
    // Handle post-condition actions
    switch (action) {
      case 'exitParent':
        if (activity.parentId) {
          const parent = this.findActivity(activity.parentId);
          if (parent) {
            await this.endAttempt(parent);
          }
        }
        break;
      case 'retry':
        activity.trackingInfo.attemptCount++;
        this.resetAttemptData(activity);
        break;
      // Other actions handled by navigation
    }
  }

  private clearSuspension(activity: Activity): void {
    let current: Activity | null = activity;

    while (current) {
      current.trackingInfo.activityIsSuspended = false;
      current = current.parentId ? this.findActivity(current.parentId) : null;
    }

    this.globalState.suspendedActivity = null;
  }

  private mapToSequencingRequest(request: NavigationRequestEvent): SequencingRequest {
    switch (request.request) {
      case 'start':
        return 'start';
      case 'resumeAll':
        return 'resumeAll';
      case 'continue':
        return 'continue';
      case 'previous':
        return 'previous';
      case 'choice':
        return 'choice';
      case 'jump':
        return 'jump';
      case 'exit':
        return 'exit';
      case 'exitAll':
        return 'exit';
      default:
        return '_none_';
    }
  }

  private async restoreSuspendedState(state: SuspendedStateData): Promise<void> {
    // Restore activity states
    for (const actState of state.activityStates) {
      const activity = this.findActivity(actState.id);
      if (activity) {
        activity.trackingInfo = {
          ...actState.trackingInfo,
          objectiveProgress: new Map(actState.trackingInfo.objectiveProgress),
        };
      }
    }

    // Restore global objectives
    this.globalState.definedObjectives = new Map(state.globalObjectives);

    // Restore suspended activity reference
    if (state.suspendedActivityId) {
      this.globalState.suspendedActivity = this.findActivity(state.suspendedActivityId);
    }

    // Restore learner preferences
    if (state.learnerPreferences) {
      this.globalState.learnerPreferences = state.learnerPreferences;
    }
  }

  // ============================================================================
  // PUBLIC STATE ACCESS
  // ============================================================================

  getCurrentActivity(): Activity | null {
    return this.globalState.currentActivity;
  }

  getActivityTree(): Activity {
    return this.globalState.activityTree;
  }

  getSuspendedActivity(): Activity | null {
    return this.globalState.suspendedActivity;
  }

  getGlobalState(): GlobalStateInfo {
    return this.globalState;
  }

  /**
   * Check if continue navigation is valid
   */
  isValidContinue(): boolean {
    const current = this.globalState.currentActivity;
    if (!current) return false;

    if (!this.isFlowEnabled(current)) return false;

    const next = this.flowSubprocess(current, 'forward');
    return next !== null;
  }

  /**
   * Check if previous navigation is valid
   */
  isValidPrevious(): boolean {
    const current = this.globalState.currentActivity;
    if (!current) return false;

    if (!this.isFlowEnabled(current)) return false;
    if (this.isForwardOnly(current)) return false;

    const prev = this.flowSubprocess(current, 'backward');
    return prev !== null;
  }

  /**
   * Get valid choice targets
   */
  getValidChoiceTargets(): string[] {
    const targets: string[] = [];
    const leaves = this.getAllLeaves();

    for (const leaf of leaves) {
      if (this.checkChoiceAvailability(leaf).available) {
        const current = this.globalState.currentActivity;
        if (!current || this.checkChoicePath(current, leaf).clear) {
          targets.push(leaf.id);
        }
      }
    }

    return targets;
  }

  /**
   * Save current state for persistence
   */
  async saveState(): Promise<SuspendedStateData> {
    return {
      currentActivityId: this.globalState.currentActivity?.id,
      suspendedActivityId: this.globalState.suspendedActivity?.id,
      activityStates: this.serializeActivityStates(this.globalState.activityTree),
      globalObjectives: Array.from(this.globalState.definedObjectives.entries()),
      learnerPreferences: this.globalState.learnerPreferences,
    };
  }

  private serializeActivityStates(activity: Activity): SuspendedStateData['activityStates'] {
    const states: SuspendedStateData['activityStates'] = [];

    const serialize = (act: Activity) => {
      states.push({
        id: act.id,
        trackingInfo: {
          attemptProgressStatus: act.trackingInfo.attemptProgressStatus,
          attemptCompletionStatus: act.trackingInfo.attemptCompletionStatus,
          attemptCompletionAmount: act.trackingInfo.attemptCompletionAmount,
          activityIsActive: act.trackingInfo.activityIsActive,
          activityIsSuspended: act.trackingInfo.activityIsSuspended,
          attemptCount: act.trackingInfo.attemptCount,
          attemptAbsoluteDuration: act.trackingInfo.attemptAbsoluteDuration,
          attemptExperiencedDuration: act.trackingInfo.attemptExperiencedDuration,
          activityAbsoluteDuration: act.trackingInfo.activityAbsoluteDuration,
          activityExperiencedDuration: act.trackingInfo.activityExperiencedDuration,
          objectiveProgress: Array.from(act.trackingInfo.objectiveProgress.entries()),
        },
      });

      for (const child of act.children) {
        serialize(child);
      }
    };

    serialize(activity);
    return states;
  }
}

// Export singleton factory
export function createSequencingEngine(): SequencingEngine {
  return new SequencingEngine();
}
