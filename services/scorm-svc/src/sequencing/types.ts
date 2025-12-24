/**
 * SCORM 2004 Sequencing Types
 *
 * Complete type definitions for the IMS Simple Sequencing specification
 * as used in SCORM 2004 2nd, 3rd, and 4th Editions.
 */

// ============================================================================
// SCORM VERSIONS
// ============================================================================

export type ScormVersion = 'SCORM_1.2' | 'SCORM_2004_2ND' | 'SCORM_2004_3RD' | 'SCORM_2004_4TH';

// ============================================================================
// SEQUENCING EXCEPTIONS
// ============================================================================

export type SequencingException =
  // Navigation Request Exceptions
  | 'NB.2.1-1' // Current activity not defined
  | 'NB.2.1-2' // Current activity is not defined
  | 'NB.2.1-3' // Suspended activity not defined
  | 'NB.2.1-4' // Flow not enabled
  | 'NB.2.1-5' // Previous not valid
  | 'NB.2.1-6' // Choice not enabled
  | 'NB.2.1-7' // Activity not found
  | 'NB.2.1-8' // Choice target not in activity tree
  | 'NB.2.1-9' // Choice exit blocked
  | 'NB.2.1-10' // Choice entry blocked
  | 'NB.2.1-11' // Current activity already terminated
  | 'NB.2.1-12' // Nothing to continue
  // Sequencing Request Exceptions
  | 'SB.2.1-1' // No valid activity found
  | 'SB.2.2-1' // Resume all failed
  | 'SB.2.4-1' // Choice target disabled
  | 'SB.2.4-2' // Choice target hidden
  | 'SB.2.4-3' // Choice target not available
  | 'SB.2.9-1' // Flow target not available
  | 'SB.2.9-2' // Flow subprocess failed
  | 'SB.2.11-1' // Exit not valid
  | 'SB.2.12-1' // Continue not valid
  // Termination Request Exceptions
  | 'TB.2.1-1' // No current activity
  | 'TB.2.3-1' // Termination failed
  | 'TB.2.3-2' // Cannot abandon
  | 'TB.2.3-3' // Cannot abandon all
  // Delivery Request Exceptions
  | 'DB.1.1-1' // Cannot identify activity
  | 'DB.1.1-2' // Activity not available
  | 'DB.2-1'; // Delivery controls blocked

// ============================================================================
// NAVIGATION REQUESTS
// ============================================================================

export type NavigationRequest =
  | 'start'
  | 'resumeAll'
  | 'continue'
  | 'previous'
  | 'choice'
  | 'jump'
  | 'exit'
  | 'exitAll'
  | 'abandon'
  | 'abandonAll'
  | 'suspendAll'
  | '_none_';

export type TerminationRequest =
  | 'exit'
  | 'exitParent'
  | 'exitAll'
  | 'suspend'
  | 'suspendAll'
  | 'abandon'
  | 'abandonAll';

export type SequencingRequest =
  | 'start'
  | 'resumeAll'
  | 'continue'
  | 'previous'
  | 'choice'
  | 'jump'
  | 'retry'
  | 'retryAll'
  | 'exit';

// ============================================================================
// NAVIGATION REQUEST EVENT
// ============================================================================

export interface NavigationRequestEvent {
  request: NavigationRequest;
  targetActivityId?: string;
}

// ============================================================================
// DELIVERY REQUEST
// ============================================================================

export interface DeliveryRequest {
  valid: boolean;
  activityId?: string;
  exception?: SequencingException;
}

// ============================================================================
// CONTROL MODE
// ============================================================================

export interface ControlMode {
  choice: boolean;
  choiceExit: boolean;
  flow: boolean;
  forwardOnly: boolean;
  useCurrentAttemptObjectiveInfo: boolean;
  useCurrentAttemptProgressInfo: boolean;
}

export const DEFAULT_CONTROL_MODE: ControlMode = {
  choice: true,
  choiceExit: true,
  flow: false,
  forwardOnly: false,
  useCurrentAttemptObjectiveInfo: true,
  useCurrentAttemptProgressInfo: true,
};

// ============================================================================
// LIMIT CONDITIONS
// ============================================================================

export interface LimitConditions {
  attemptLimit?: number;
  attemptAbsoluteDurationLimit?: string; // ISO 8601 duration
  attemptExperiencedDurationLimit?: string;
  activityAbsoluteDurationLimit?: string;
  activityExperiencedDurationLimit?: string;
  beginTimeLimit?: string; // ISO 8601 datetime
  endTimeLimit?: string;
}

// ============================================================================
// RANDOMIZATION CONTROLS
// ============================================================================

export interface RandomizationControls {
  randomizationTiming: 'never' | 'once' | 'onEachNewAttempt';
  selectCount?: number;
  reorderChildren: boolean;
  selectionTiming: 'never' | 'once' | 'onEachNewAttempt';
}

export const DEFAULT_RANDOMIZATION_CONTROLS: RandomizationControls = {
  randomizationTiming: 'never',
  reorderChildren: false,
  selectionTiming: 'never',
};

// ============================================================================
// DELIVERY CONTROLS
// ============================================================================

export interface DeliveryControls {
  tracked: boolean;
  completionSetByContent: boolean;
  objectiveSetByContent: boolean;
}

export const DEFAULT_DELIVERY_CONTROLS: DeliveryControls = {
  tracked: true,
  completionSetByContent: false,
  objectiveSetByContent: false,
};

// ============================================================================
// SEQUENCING RULES
// ============================================================================

export type RuleConditionType =
  | 'satisfied'
  | 'objectiveStatusKnown'
  | 'objectiveMeasureKnown'
  | 'objectiveMeasureGreaterThan'
  | 'objectiveMeasureLessThan'
  | 'completed'
  | 'activityProgressKnown'
  | 'attempted'
  | 'attemptLimitExceeded'
  | 'timeLimitExceeded'
  | 'outsideAvailableTimeRange'
  | 'always';

export interface RuleCondition {
  referencedObjective?: string;
  measureThreshold?: number;
  operator: 'not' | 'noOp';
  condition: RuleConditionType;
}

export type SequencingRuleAction =
  // Pre-Condition Actions
  | 'skip'
  | 'disabled'
  | 'hiddenFromChoice'
  | 'stopForwardTraversal'
  // Post-Condition Actions
  | 'exitParent'
  | 'exitAll'
  | 'retry'
  | 'retryAll'
  | 'continue'
  | 'previous'
  // Exit Actions
  | 'exit';

export interface SequencingRule {
  conditions: RuleCondition[];
  conditionCombination: 'all' | 'any';
  action: SequencingRuleAction;
}

// ============================================================================
// ROLLUP RULES
// ============================================================================

export type RollupAction = 'satisfied' | 'notSatisfied' | 'completed' | 'incomplete';

export type RollupConditionType =
  | 'satisfied'
  | 'objectiveStatusKnown'
  | 'objectiveMeasureKnown'
  | 'completed'
  | 'activityProgressKnown'
  | 'attempted'
  | 'attemptLimitExceeded'
  | 'timeLimitExceeded'
  | 'outsideAvailableTimeRange';

export interface RollupCondition {
  operator: 'not' | 'noOp';
  condition: RollupConditionType;
}

export interface RollupRule {
  childActivitySet: 'all' | 'any' | 'none' | 'atLeastCount' | 'atLeastPercent';
  minimumCount?: number;
  minimumPercent?: number;
  conditions: RollupCondition[];
  conditionCombination: 'all' | 'any';
  action: RollupAction;
}

export interface RollupRules {
  rollupObjectiveSatisfied: boolean;
  rollupProgressCompletion: boolean;
  objectiveMeasureWeight: number;
  rules: RollupRule[];
}

export const DEFAULT_ROLLUP_RULES: RollupRules = {
  rollupObjectiveSatisfied: true,
  rollupProgressCompletion: true,
  objectiveMeasureWeight: 1.0,
  rules: [],
};

// ============================================================================
// OBJECTIVES
// ============================================================================

export interface ObjectiveDescription {
  objectiveId: string;
  satisfiedByMeasure: boolean;
  minNormalizedMeasure: number;
  isPrimaryObjective: boolean;
  // Objective Map
  objectiveMap?: ObjectiveMap[];
}

export interface ObjectiveMap {
  targetObjectiveId: string;
  readSatisfiedStatus: boolean;
  readNormalizedMeasure: boolean;
  writeSatisfiedStatus: boolean;
  writeNormalizedMeasure: boolean;
}

// ============================================================================
// SEQUENCING DEFINITION
// ============================================================================

export interface SequencingDefinition {
  controlMode: ControlMode;
  sequencingRules: {
    preConditionRules: SequencingRule[];
    postConditionRules: SequencingRule[];
    exitConditionRules: SequencingRule[];
  };
  limitConditions: LimitConditions;
  rollupRules: RollupRules;
  objectives: ObjectiveDescription[];
  randomizationControls: RandomizationControls;
  deliveryControls: DeliveryControls;
}

// ============================================================================
// ACTIVITY TRACKING INFO
// ============================================================================

export interface ObjectiveProgress {
  objectiveId: string;
  progressStatus: boolean;
  satisfiedStatus: boolean;
  measureStatus: boolean;
  normalizedMeasure: number;
}

export interface ActivityTrackingInfo {
  activityIsActive: boolean;
  activityIsSuspended: boolean;
  attemptCount: number;
  attemptProgressStatus: boolean;
  attemptCompletionStatus: boolean | null;
  objectiveProgress: Map<string, ObjectiveProgress>;
}

export function createDefaultTrackingInfo(): ActivityTrackingInfo {
  return {
    activityIsActive: false,
    activityIsSuspended: false,
    attemptCount: 0,
    attemptProgressStatus: false,
    attemptCompletionStatus: null,
    objectiveProgress: new Map(),
  };
}

// ============================================================================
// ACTIVITY
// ============================================================================

export interface Activity {
  id: string;
  title: string;
  parentId: string | null;
  children: Activity[];
  resourceId?: string;
  launchUrl?: string;
  isVisible: boolean;
  isActive: boolean;
  isSuspended: boolean;
  attemptCount: number;
  sequencingDefinition: SequencingDefinition;
  trackingInfo: ActivityTrackingInfo;
  deliveryControls: DeliveryControls;
}

// ============================================================================
// GLOBAL STATE
// ============================================================================

export interface SuspendedStateData {
  suspendedActivityId: string;
  activityTree: Activity;
  dataModel: Record<string, string>;
}

export interface GlobalStateInfo {
  currentActivity: Activity | null;
  suspendedActivity: Activity | null;
  activityTree: Activity | null;
}

// ============================================================================
// LEARNER PREFERENCES
// ============================================================================

export interface LearnerPreferences {
  audioLevel: number;
  deliverySpeed: number;
  language: string;
  audioCaptioning: 'on' | 'off' | 'no change';
}

export const DEFAULT_LEARNER_PREFERENCES: LearnerPreferences = {
  audioLevel: 1.0,
  deliverySpeed: 1.0,
  language: '',
  audioCaptioning: 'no change',
};
