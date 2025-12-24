/**
 * SCORM Manifest Types
 *
 * Type definitions for parsed SCORM 1.2 and 2004 manifest files (imsmanifest.xml)
 */

export interface ScormManifest {
  identifier: string;
  version?: string;
  metadata?: ScormMetadata;
  organizations: ScormOrganization[];
  defaultOrganization: string;
  resources: ScormResource[];
  scormType: 'SCORM_1.2' | 'SCORM_2004_2ND' | 'SCORM_2004_3RD' | 'SCORM_2004_4TH';
}

export interface ScormMetadata {
  schema?: string;
  schemaVersion?: string;
  title?: string;
  description?: string;
  keywords?: string[];
}

export interface ScormOrganization {
  identifier: string;
  title: string;
  items: ScormItem[];
  objectivesGlobalToSystem?: boolean;
  sharedDataGlobalToSystem?: boolean;
}

export interface ScormItem {
  identifier: string;
  identifierref?: string;
  title: string;
  items: ScormItem[];
  isVisible: boolean;
  parameters?: string;
  // SCORM 2004 Sequencing
  sequencing?: ScormSequencing;
  // Launch data
  dataFromLMS?: string;
  timeLimitAction?: 'exit,message' | 'continue,message' | 'exit,no message' | 'continue,no message';
  masteryScore?: number;
  maxTimeAllowed?: string;
}

export interface ScormResource {
  identifier: string;
  type: string;
  href?: string;
  scormType?: 'sco' | 'asset';
  files: ScormResourceFile[];
  dependencies: string[];
}

export interface ScormResourceFile {
  href: string;
}

// ============================================================================
// SEQUENCING (SCORM 2004)
// ============================================================================

export interface ScormSequencing {
  controlMode?: ScormControlMode;
  sequencingRules?: ScormSequencingRules;
  limitConditions?: ScormLimitConditions;
  rollupRules?: ScormRollupRules;
  objectives?: ScormObjective[];
  randomizationControls?: ScormRandomizationControls;
  deliveryControls?: ScormDeliveryControls;
}

export interface ScormControlMode {
  choice?: boolean;
  choiceExit?: boolean;
  flow?: boolean;
  forwardOnly?: boolean;
  useCurrentAttemptObjectiveInfo?: boolean;
  useCurrentAttemptProgressInfo?: boolean;
}

export interface ScormSequencingRules {
  preConditionRules?: ScormSequencingRule[];
  postConditionRules?: ScormSequencingRule[];
  exitConditionRules?: ScormSequencingRule[];
}

export interface ScormSequencingRule {
  ruleConditions: ScormRuleCondition[];
  conditionCombination?: 'all' | 'any';
  ruleAction: string;
}

export interface ScormRuleCondition {
  referencedObjective?: string;
  measureThreshold?: number;
  operator?: 'not' | 'noOp';
  condition: string;
}

export interface ScormLimitConditions {
  attemptLimit?: number;
  attemptAbsoluteDurationLimit?: string;
  attemptExperiencedDurationLimit?: string;
  activityAbsoluteDurationLimit?: string;
  activityExperiencedDurationLimit?: string;
  beginTimeLimit?: string;
  endTimeLimit?: string;
}

export interface ScormRollupRules {
  rollupObjectiveSatisfied?: boolean;
  rollupProgressCompletion?: boolean;
  objectiveMeasureWeight?: number;
  rollupRule?: ScormRollupRule[];
}

export interface ScormRollupRule {
  childActivitySet?: 'all' | 'any' | 'none' | 'atLeastCount' | 'atLeastPercent';
  minimumCount?: number;
  minimumPercent?: number;
  rollupConditions: ScormRollupCondition[];
  conditionCombination?: 'all' | 'any';
  rollupAction: string;
}

export interface ScormRollupCondition {
  operator?: 'not' | 'noOp';
  condition: string;
}

export interface ScormObjective {
  objectiveId: string;
  satisfiedByMeasure?: boolean;
  minNormalizedMeasure?: number;
  primary?: boolean;
  mapInfo?: ScormObjectiveMap[];
}

export interface ScormObjectiveMap {
  targetObjectiveId: string;
  readSatisfiedStatus?: boolean;
  readNormalizedMeasure?: boolean;
  writeSatisfiedStatus?: boolean;
  writeNormalizedMeasure?: boolean;
}

export interface ScormRandomizationControls {
  randomizationTiming?: 'never' | 'once' | 'onEachNewAttempt';
  selectCount?: number;
  reorderChildren?: boolean;
  selectionTiming?: 'never' | 'once' | 'onEachNewAttempt';
}

export interface ScormDeliveryControls {
  tracked?: boolean;
  completionSetByContent?: boolean;
  objectiveSetByContent?: boolean;
}
