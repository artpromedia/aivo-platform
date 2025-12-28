/**
 * Import/Export Types
 *
 * Type definitions for content import/export operations
 * supporting SCORM, QTI, Common Cartridge, and LTI standards.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PACKAGE FORMATS
// ═══════════════════════════════════════════════════════════════════════════════

export type PackageFormat =
  | 'scorm_1.2'
  | 'scorm_2004'
  | 'qti_2.1'
  | 'qti_3.0'
  | 'common_cartridge'
  | 'lti_link'
  | 'unknown';

export type ExportFormat =
  | 'scorm_1.2'
  | 'scorm_2004'
  | 'qti_2.1'
  | 'qti_3.0'
  | 'common_cartridge'
  | 'xapi';

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImportJob {
  id: string;
  userId: string;
  tenantId: string;
  sourceFile: string;
  status: ImportStatus;
  progress?: number;
  progressMessage?: string;
  options?: ImportOptions;
  result?: ImportJobResult;
  error?: string;
  validationErrors?: string[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type ImportStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ImportOptions {
  /** Skip validation before import */
  skipValidation?: boolean;
  /** Process asynchronously (default: true) */
  async?: boolean;
  /** Create lessons from SCOs (default: true) */
  createLessons?: boolean;
  /** Create assessments from QTI tests (default: true) */
  createAssessments?: boolean;
  /** Target folder/module for imported content */
  targetFolderId?: string;
  /** Overwrite existing content with same external ID */
  overwrite?: boolean;
  /** Map to specific course */
  courseId?: string;
  /** Preserve original identifiers */
  preserveIds?: boolean;
  /** Custom metadata to attach */
  metadata?: Record<string, unknown>;
  /** Progress callback */
  onProgress?: (progress: number) => void;
}

export interface ImportJobResult {
  itemsImported: number;
  warnings: string[];
  format: PackageFormat;
  packageId?: string;
}

export interface ImportResult {
  items: ImportedItem[];
  warnings: string[];
  metadata?: Record<string, unknown>;
}

export interface ImportedItem {
  externalId: string;
  type: ImportedItemType;
  title: string;
  description: string | null;
  sourceFormat: string;
  data: Record<string, unknown>;
  mappedTo: string | null;
}

export type ImportedItemType =
  | 'lesson'
  | 'assessment'
  | 'question'
  | 'folder'
  | 'module'
  | 'resource'
  | 'lti_link'
  | 'discussion'
  | 'assignment'
  | 'course'
  | 'page'
  | 'external_link'
  | 'weblink';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT PACKAGE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContentPackage {
  tempDir: string;
  files: PackageFile[];
  originalFileName: string;
  size: number;
}

export interface PackageFile {
  name: string;
  path: string;
  size: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: ValidationInfo;
}

export interface ValidationInfo {
  format?: PackageFormat;
  version?: string;
  title?: string;
  itemCount?: number;
  hasManifest?: boolean;
  hasAssets?: boolean;
  estimatedSize?: number;
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  file?: string;
  severity: 'error';
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  file?: string;
  severity: 'warning';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImportProgress {
  jobId: string;
  progress: number;
  message: string;
  stage: ImportStage;
  itemsProcessed?: number;
  totalItems?: number;
}

export type ImportStage =
  | 'uploading'
  | 'extracting'
  | 'validating'
  | 'parsing'
  | 'importing'
  | 'storing'
  | 'complete'
  | 'failed';

// ═══════════════════════════════════════════════════════════════════════════════
// SCORM TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SCORMManifest {
  $?: {
    identifier?: string;
    version?: string;
    [key: string]: string | undefined;
  };
  metadata?: SCORMMetadata[];
  organizations?: SCORMOrganizations[];
  resources?: SCORMResources[];
}

export interface SCORMMetadata {
  schema?: string[];
  schemaversion?: string[];
  lom?: LOMMetadata[];
  [key: string]: unknown;
}

export interface LOMMetadata {
  general?: LOMGeneral[];
  lifecycle?: LOMLLifecycle[];
  metaMetadata?: LOMMetaMetadata[];
  technical?: LOMTechnical[];
  educational?: LOMEducational[];
  rights?: LOMRights[];
  [key: string]: unknown;
}

export interface LOMGeneral {
  identifier?: Array<{ catalog?: string[]; entry?: string[] }>;
  title?: Array<{ string?: string[] }>;
  language?: string[];
  description?: Array<{ string?: string[] }>;
  keyword?: Array<{ string?: string[] }>;
  [key: string]: unknown;
}

export interface LOMLLifecycle {
  version?: Array<{ string?: string[] }>;
  status?: Array<{ value?: string[] }>;
  contribute?: Array<{
    role?: Array<{ value?: string[] }>;
    entity?: string[];
    date?: Array<{ dateTime?: string[] }>;
  }>;
  [key: string]: unknown;
}

export interface LOMMetaMetadata {
  catalogentry?: Array<{ catalog?: string[]; entry?: string[] }>;
  [key: string]: unknown;
}

export interface LOMTechnical {
  format?: string[];
  size?: string[];
  location?: string[];
  duration?: Array<{ duration?: string[] }>;
  [key: string]: unknown;
}

export interface LOMEducational {
  interactivityType?: Array<{ value?: string[] }>;
  learningResourceType?: Array<{ value?: string[] }>;
  interactivityLevel?: Array<{ value?: string[] }>;
  difficulty?: Array<{ value?: string[] }>;
  typicalLearningTime?: Array<{ duration?: string[] }>;
  [key: string]: unknown;
}

export interface LOMRights {
  cost?: Array<{ value?: string[] }>;
  copyrightAndOtherRestrictions?: Array<{ value?: string[] }>;
  description?: Array<{ string?: string[] }>;
  [key: string]: unknown;
}

export interface SCORMOrganizations {
  $?: {
    default?: string;
  };
  organization?: SCORMOrganization[];
}

export interface SCORMOrganization {
  $?: {
    identifier?: string;
    structure?: string;
    [key: string]: string | undefined;
  };
  title?: string[];
  item?: SCORMItem[];
  metadata?: SCORMMetadata[];
  sequencing?: SCORMSequencing[];
  'imsss:sequencing'?: SCORMSequencing[];
}

export interface SCORMItem {
  $?: {
    identifier?: string;
    identifierref?: string;
    isvisible?: string;
    parameters?: string;
    prerequisites?: string;
    masteryScore?: string;
    maxTimeAllowed?: string;
    timeLimitAction?: string;
    [key: string]: string | undefined;
  };
  title?: string[];
  item?: SCORMItem[];
  metadata?: SCORMMetadata[];
  'adlcp:prerequisites'?: string[];
  'adlcp:masteryscore'?: string[];
  'adlcp:maxtimeallowed'?: string[];
  'adlcp:timelimitaction'?: string[];
  sequencing?: SCORMSequencing[];
  'imsss:sequencing'?: SCORMSequencing[];
}

export interface SCORMSequencing {
  controlMode?: SCORMControlMode[];
  sequencingRules?: SCORMSequencingRules[];
  limitConditions?: SCORMLimitConditions[];
  rollupRules?: SCORMRollupRules[];
  objectives?: SCORMObjectives[];
  randomizationControls?: SCORMRandomizationControls[];
  deliveryControls?: SCORMDeliveryControls[];
}

export interface SCORMControlMode {
  $?: {
    choice?: string;
    choiceExit?: string;
    flow?: string;
    forwardOnly?: string;
    useCurrentAttemptObjectiveInfo?: string;
    useCurrentAttemptProgressInfo?: string;
  };
}

export interface SCORMSequencingRules {
  preConditionRule?: SCORMConditionRule[];
  postConditionRule?: SCORMConditionRule[];
  exitConditionRule?: SCORMConditionRule[];
}

export interface SCORMConditionRule {
  ruleConditions?: SCORMRuleConditions[];
  ruleAction?: SCORMRuleAction[];
}

export interface SCORMRuleConditions {
  $?: {
    conditionCombination?: string;
  };
  ruleCondition?: Array<{
    $?: {
      referencedObjective?: string;
      measureThreshold?: string;
      operator?: string;
      condition?: string;
    };
  }>;
}

export interface SCORMRuleAction {
  $?: {
    action?: string;
  };
}

export interface SCORMLimitConditions {
  $?: {
    attemptLimit?: string;
    attemptAbsoluteDurationLimit?: string;
    attemptExperiencedDurationLimit?: string;
    activityAbsoluteDurationLimit?: string;
    activityExperiencedDurationLimit?: string;
    beginTimeLimit?: string;
    endTimeLimit?: string;
  };
}

export interface SCORMRollupRules {
  $?: {
    rollupObjectiveSatisfied?: string;
    rollupProgressCompletion?: string;
    objectiveMeasureWeight?: string;
  };
  rollupRule?: Array<{
    $?: {
      childActivitySet?: string;
      minimumCount?: string;
      minimumPercent?: string;
    };
    rollupConditions?: Array<{
      $?: {
        conditionCombination?: string;
      };
      rollupCondition?: Array<{
        $?: {
          operator?: string;
          condition?: string;
        };
      }>;
    }>;
    rollupAction?: Array<{
      $?: {
        action?: string;
      };
    }>;
  }>;
}

export interface SCORMObjectives {
  primaryObjective?: Array<{
    $?: {
      objectiveID?: string;
      satisfiedByMeasure?: string;
    };
    minNormalizedMeasure?: string[];
    mapInfo?: SCORMMapInfo[];
  }>;
  objective?: Array<{
    $?: {
      objectiveID?: string;
      satisfiedByMeasure?: string;
    };
    minNormalizedMeasure?: string[];
    mapInfo?: SCORMMapInfo[];
  }>;
}

export interface SCORMMapInfo {
  $?: {
    targetObjectiveID?: string;
    readSatisfiedStatus?: string;
    readNormalizedMeasure?: string;
    writeSatisfiedStatus?: string;
    writeNormalizedMeasure?: string;
  };
}

export interface SCORMRandomizationControls {
  $?: {
    randomizationTiming?: string;
    selectCount?: string;
    reorderChildren?: string;
    selectionTiming?: string;
  };
}

export interface SCORMDeliveryControls {
  $?: {
    tracked?: string;
    completionSetByContent?: string;
    objectiveSetByContent?: string;
  };
}

export interface SCORMResources {
  resource?: SCORMResource[];
}

export interface SCORMResource {
  $?: {
    identifier?: string;
    type?: string;
    'adlcp:scormtype'?: string;
    scormType?: string;
    href?: string;
    [key: string]: string | undefined;
  };
  metadata?: SCORMMetadata[];
  file?: Array<{ $?: { href?: string } }>;
  dependency?: Array<{ $?: { identifierref?: string } }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QTI TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface QTIAssessmentItem {
  identifier: string;
  title: string;
  adaptive?: boolean;
  timeDependent?: boolean;
  responseDeclaration?: QTIResponseDeclaration[];
  outcomeDeclaration?: QTIOutcomeDeclaration[];
  templateDeclaration?: QTITemplateDeclaration[];
  itemBody?: QTIItemBody;
  responseProcessing?: QTIResponseProcessing;
  modalFeedback?: QTIModalFeedback[];
}

export interface QTIResponseDeclaration {
  identifier: string;
  cardinality: 'single' | 'multiple' | 'ordered' | 'record';
  baseType?: string;
  correctResponse?: QTIValue[];
  defaultValue?: QTIValue[];
  mapping?: QTIMapping;
  areaMapping?: QTIAreaMapping;
}

export interface QTIValue {
  value: string | number | boolean;
  fieldIdentifier?: string;
  baseType?: string;
}

export interface QTIMapping {
  defaultValue?: number;
  lowerBound?: number;
  upperBound?: number;
  mapEntry?: Array<{
    mapKey: string;
    mappedValue: number;
    caseSensitive?: boolean;
  }>;
}

export interface QTIAreaMapping {
  defaultValue?: number;
  lowerBound?: number;
  upperBound?: number;
  areaMapEntry?: Array<{
    shape: string;
    coords: string;
    mappedValue: number;
  }>;
}

export interface QTIOutcomeDeclaration {
  identifier: string;
  cardinality: string;
  baseType?: string;
  view?: string[];
  interpretation?: string;
  longInterpretation?: string;
  normalMaximum?: number;
  normalMinimum?: number;
  masteryValue?: number;
  defaultValue?: QTIValue[];
}

export interface QTITemplateDeclaration {
  identifier: string;
  cardinality: string;
  baseType?: string;
  paramVariable?: boolean;
  mathVariable?: boolean;
  defaultValue?: QTIValue[];
}

export interface QTIItemBody {
  content: unknown;
  interactions: QTIInteraction[];
}

export interface QTIInteraction {
  type: string;
  responseIdentifier: string;
  shuffle?: boolean;
  maxChoices?: number;
  minChoices?: number;
  orientation?: string;
  prompt?: string;
  choices?: QTIChoice[];
  simpleMatchSets?: QTISimpleMatchSet[];
}

export interface QTIChoice {
  identifier: string;
  content: string;
  fixed?: boolean;
  templateIdentifier?: string;
  showHide?: string;
}

export interface QTISimpleMatchSet {
  simpleAssociableChoice: QTIAssociableChoice[];
}

export interface QTIAssociableChoice {
  identifier: string;
  content: string;
  matchMax: number;
  matchMin?: number;
  fixed?: boolean;
}

export interface QTIResponseProcessing {
  template?: string;
  responseCondition?: QTIResponseCondition[];
  setOutcomeValue?: QTISetOutcomeValue[];
}

export interface QTIResponseCondition {
  responseIf?: QTIResponseIf;
  responseElseIf?: QTIResponseIf[];
  responseElse?: QTIResponseElse;
}

export interface QTIResponseIf {
  expression: unknown;
  setOutcomeValue?: QTISetOutcomeValue[];
}

export interface QTIResponseElse {
  setOutcomeValue?: QTISetOutcomeValue[];
}

export interface QTISetOutcomeValue {
  identifier: string;
  expression: unknown;
}

export interface QTIModalFeedback {
  outcomeIdentifier: string;
  showHide: 'show' | 'hide';
  identifier: string;
  title?: string;
  content: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMON CARTRIDGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CCManifest {
  $?: {
    identifier?: string;
    [key: string]: string | undefined;
  };
  metadata?: CCMetadata[];
  organizations?: CCOrganizations[];
  resources?: CCResources[];
}

export interface CCMetadata {
  schema?: string[];
  schemaversion?: string[];
  lom?: LOMMetadata[];
}

export interface CCOrganizations {
  organization?: CCOrganization[];
}

export interface CCOrganization {
  $?: {
    identifier?: string;
    structure?: string;
  };
  title?: string[];
  item?: CCItem[];
}

export interface CCItem {
  $?: {
    identifier?: string;
    identifierref?: string;
    isvisible?: string;
  };
  title?: string[];
  item?: CCItem[];
}

export interface CCResources {
  resource?: CCResource[];
}

export interface CCResource {
  $?: {
    identifier?: string;
    type?: string;
    href?: string;
    intendeduse?: string;
  };
  file?: Array<{ $?: { href?: string } }>;
  dependency?: Array<{ $?: { identifierref?: string } }>;
  metadata?: CCMetadata[];
}

// Common Cartridge resource types
export type CCResourceType =
  | 'webcontent'
  | 'weblink'
  | 'discussion'
  | 'assessment'
  | 'assignment'
  | 'associatedcontent'
  | 'basiclti'
  | 'question_bank';

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExportJob {
  id: string;
  userId: string;
  tenantId: string;
  contentType: string;
  contentIds: string[];
  format: ExportFormat;
  status: ExportStatus;
  result?: ExportJobResult;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExportOptions {
  /** Include media assets */
  includeMedia?: boolean;
  /** SCORM version for export */
  scormVersion?: '1.2' | '2004';
  /** QTI version for export */
  qtiVersion?: '2.1' | '3.0';
  /** Common Cartridge version */
  ccVersion?: '1.0' | '1.1' | '1.2' | '1.3';
  /** Package title */
  title?: string;
  /** Package description */
  description?: string;
  /** Include answer keys */
  includeAnswers?: boolean;
  /** Compress package */
  compress?: boolean;
}

export interface ExportResult {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  downloadUrl?: string;
  s3Key?: string;
  expiresAt?: Date;
}

export interface ExportJobResult {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  expiresAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LTI TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LTIPlatform {
  id: string;
  tenantId: string;
  name: string;
  issuer: string;
  clientId: string;
  deploymentId: string;
  authEndpoint: string;
  tokenEndpoint: string;
  jwksEndpoint: string;
  publicKey?: string;
  privateKey?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LTITool {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  url: string;
  clientId: string;
  publicKey?: string;
  customParameters?: Record<string, string>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LTILaunchParams {
  /** Message type */
  messageType: 'LtiResourceLinkRequest' | 'LtiDeepLinkingRequest';
  /** Target link URI */
  targetLinkUri: string;
  /** Resource link */
  resourceLink?: {
    id: string;
    title?: string;
    description?: string;
  };
  /** User info */
  user?: {
    id: string;
    name?: string;
    email?: string;
    roles: string[];
  };
  /** Context (course) info */
  context?: {
    id: string;
    label?: string;
    title?: string;
    type?: string[];
  };
  /** Custom parameters */
  custom?: Record<string, string>;
  /** Deep linking settings */
  deepLinkingSettings?: {
    returnUrl: string;
    acceptTypes: string[];
    acceptPresentationDocumentTargets: string[];
    acceptMultiple?: boolean;
    autoCreate?: boolean;
  };
}

export interface LTIDeepLinkingResponse {
  contentItems: LTIContentItem[];
}

export interface LTIContentItem {
  type: 'ltiResourceLink' | 'link' | 'file' | 'html' | 'image';
  url?: string;
  title?: string;
  text?: string;
  icon?: {
    url: string;
    width?: number;
    height?: number;
  };
  thumbnail?: {
    url: string;
    width?: number;
    height?: number;
  };
  custom?: Record<string, string>;
  lineItem?: {
    scoreMaximum: number;
    label?: string;
    resourceId?: string;
    tag?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// xAPI TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface XAPIStatement {
  id?: string;
  actor: XAPIActor;
  verb: XAPIVerb;
  object: XAPIObject;
  result?: XAPIResult;
  context?: XAPIContext;
  timestamp?: string;
  stored?: string;
  authority?: XAPIActor;
  version?: string;
  attachments?: XAPIAttachment[];
}

export interface XAPIActor {
  objectType?: 'Agent' | 'Group';
  name?: string;
  mbox?: string;
  mbox_sha1sum?: string;
  openid?: string;
  account?: {
    homePage: string;
    name: string;
  };
  member?: XAPIActor[];
}

export interface XAPIVerb {
  id: string;
  display?: Record<string, string>;
}

export interface XAPIObject {
  objectType?: 'Activity' | 'Agent' | 'Group' | 'SubStatement' | 'StatementRef';
  id: string;
  definition?: XAPIActivityDefinition;
}

export interface XAPIActivityDefinition {
  name?: Record<string, string>;
  description?: Record<string, string>;
  type?: string;
  moreInfo?: string;
  interactionType?: string;
  correctResponsesPattern?: string[];
  choices?: XAPIInteractionComponent[];
  scale?: XAPIInteractionComponent[];
  source?: XAPIInteractionComponent[];
  target?: XAPIInteractionComponent[];
  steps?: XAPIInteractionComponent[];
  extensions?: Record<string, unknown>;
}

export interface XAPIInteractionComponent {
  id: string;
  description?: Record<string, string>;
}

export interface XAPIResult {
  score?: {
    scaled?: number;
    raw?: number;
    min?: number;
    max?: number;
  };
  success?: boolean;
  completion?: boolean;
  response?: string;
  duration?: string;
  extensions?: Record<string, unknown>;
}

export interface XAPIContext {
  registration?: string;
  instructor?: XAPIActor;
  team?: XAPIActor;
  contextActivities?: {
    parent?: XAPIObject[];
    grouping?: XAPIObject[];
    category?: XAPIObject[];
    other?: XAPIObject[];
  };
  revision?: string;
  platform?: string;
  language?: string;
  statement?: {
    objectType: 'StatementRef';
    id: string;
  };
  extensions?: Record<string, unknown>;
}

export interface XAPIAttachment {
  usageType: string;
  display: Record<string, string>;
  description?: Record<string, string>;
  contentType: string;
  length: number;
  sha2: string;
  fileUrl?: string;
}

// Common xAPI verbs
export const XAPI_VERBS = {
  INITIALIZED: 'http://adlnet.gov/expapi/verbs/initialized',
  TERMINATED: 'http://adlnet.gov/expapi/verbs/terminated',
  COMPLETED: 'http://adlnet.gov/expapi/verbs/completed',
  PASSED: 'http://adlnet.gov/expapi/verbs/passed',
  FAILED: 'http://adlnet.gov/expapi/verbs/failed',
  ATTEMPTED: 'http://adlnet.gov/expapi/verbs/attempted',
  EXPERIENCED: 'http://adlnet.gov/expapi/verbs/experienced',
  ANSWERED: 'http://adlnet.gov/expapi/verbs/answered',
  INTERACTED: 'http://adlnet.gov/expapi/verbs/interacted',
  PROGRESSED: 'http://adlnet.gov/expapi/verbs/progressed',
  SCORED: 'http://adlnet.gov/expapi/verbs/scored',
  SUSPENDED: 'http://adlnet.gov/expapi/verbs/suspended',
  RESUMED: 'http://adlnet.gov/expapi/verbs/resumed',
} as const;

// Common xAPI activity types
export const XAPI_ACTIVITY_TYPES = {
  COURSE: 'http://adlnet.gov/expapi/activities/course',
  MODULE: 'http://adlnet.gov/expapi/activities/module',
  LESSON: 'http://adlnet.gov/expapi/activities/lesson',
  ASSESSMENT: 'http://adlnet.gov/expapi/activities/assessment',
  QUESTION: 'http://adlnet.gov/expapi/activities/question',
  INTERACTION: 'http://adlnet.gov/expapi/activities/interaction',
  MEDIA: 'http://adlnet.gov/expapi/activities/media',
  SIMULATION: 'http://adlnet.gov/expapi/activities/simulation',
} as const;
