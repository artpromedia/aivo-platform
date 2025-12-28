// ══════════════════════════════════════════════════════════════════════════════
// EXPORT TYPES
// Type definitions for content export functionality
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Export Formats
// ─────────────────────────────────────────────────────────────────────────────

export type ExportFormat =
  | 'scorm_1.2'
  | 'scorm_2004'
  | 'qti_2.1'
  | 'qti_3.0'
  | 'common_cartridge'
  | 'xapi'
  | 'pdf'
  | 'html';

export type SCORMVersion = '1.2' | '2004';
export type SCORM2004Edition = '2nd' | '3rd' | '4th';
export type QTIVersion = '2.1' | '3.0';
export type CCVersion = '1.0' | '1.1' | '1.2' | '1.3';

// ─────────────────────────────────────────────────────────────────────────────
// Export Job
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportJob {
  id: string;
  userId: string;
  tenantId: string;
  contentType: ContentType;
  contentIds: string[];
  format: ExportFormat;
  status: ExportStatus;
  progress?: number;
  progressMessage?: string;
  options?: ExportOptions;
  result?: ExportResult;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type ContentType = 'lesson' | 'assessment' | 'course' | 'question' | 'resource';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// ─────────────────────────────────────────────────────────────────────────────
// Export Options
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportOptions {
  // General options
  includeMetadata?: boolean;
  includeAssets?: boolean;
  compressAssets?: boolean;
  
  // SCORM options
  scormOptions?: SCORMExportOptions;
  
  // QTI options
  qtiOptions?: QTIExportOptions;
  
  // Common Cartridge options
  ccOptions?: CCExportOptions;
  
  // xAPI options
  xapiOptions?: XAPIExportOptions;
  
  // Callbacks
  onProgress?: (progress: number, message?: string) => void;
}

export interface SCORMExportOptions {
  version?: SCORMVersion;
  edition?: SCORM2004Edition; // For SCORM 2004
  
  // Organization
  organizationTitle?: string;
  organizationIdentifier?: string;
  
  // Manifest
  manifestIdentifier?: string;
  schemaVersion?: string;
  
  // LOM Metadata
  includeFullLOM?: boolean;
  lomMetadata?: LOMMetadata;
  
  // Sequencing (SCORM 2004)
  includeSequencing?: boolean;
  sequencingRules?: SequencingRules;
  
  // Navigation
  navigationMode?: 'normal' | 'linear';
  
  // Completion
  completionThreshold?: number;
  masteryScore?: number;
  
  // SCO settings
  scoSettings?: {
    exitAction?: 'suspend' | 'normal' | 'logout';
    sessionTimeLimit?: string;
    launchData?: string;
  };
  
  // Callbacks
  onProgress?: (progress: number, message?: string) => void;
}

export interface QTIExportOptions {
  version?: QTIVersion;
  
  // Package structure
  includeManifest?: boolean;
  packageIdentifier?: string;
  
  // Item options
  includeRubrics?: boolean;
  includeFeedback?: boolean;
  includeResponseProcessing?: boolean;
  
  // Test options (for assessment export)
  testOptions?: {
    navigationMode?: 'linear' | 'nonlinear';
    submissionMode?: 'individual' | 'simultaneous';
    shuffleItems?: boolean;
    maxAttempts?: number;
    timeLimits?: {
      maxTime?: number; // seconds
      minTime?: number;
    };
  };
  
  // Styling
  includeStylesheets?: boolean;
  customStylesheet?: string;
  
  // Callbacks
  onProgress?: (progress: number, message?: string) => void;
}

export interface CCExportOptions {
  version?: CCVersion;
  
  // Package structure
  packageTitle?: string;
  packageIdentifier?: string;
  
  // Content options
  includeWebContent?: boolean;
  includeAssessments?: boolean;
  includeDiscussions?: boolean;
  includeLTILinks?: boolean;
  includeQTI?: boolean;
  
  // Organization
  organizationStructure?: 'flat' | 'hierarchical';
  
  // Metadata
  includeMetadata?: boolean;
  metadataSchema?: 'lom' | 'dublin_core';
  metadata?: LOMMetadata;
  
  // Callbacks
  onProgress?: (progress: number, message?: string) => void;
}

export interface XAPIExportOptions {
  // Statement selection
  actorFilter?: {
    emails?: string[];
    accounts?: Array<{ homePage: string; name: string }>;
  };
  verbFilter?: string[];
  activityFilter?: string[];
  dateRange?: {
    since?: Date;
    until?: Date;
  };
  
  // Simple date filters (alternative to dateRange)
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  actorId?: string | undefined;
  
  // Output format
  format?: 'json' | 'csv' | 'json-lines';
  includeVoided?: boolean;
  attachments?: boolean;
  
  // LRS settings
  lrsEndpoint?: string;
  lrsAuth?: {
    type: 'basic' | 'oauth';
    credentials: unknown;
  };
  
  // Callbacks
  onProgress?: (progress: number, message?: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Result
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportResult {
  fileName: string;
  fileSize: number;
  contentType: string;
  buffer: Buffer;
  
  // Storage info (after upload)
  s3Key?: string;
  downloadUrl?: string;
  expiresAt?: Date;
  
  // Export metadata
  metadata: ExportMetadata;
  
  // Warnings during export
  warnings?: string[];
}

export interface ExportMetadata {
  format: ExportFormat;
  version?: string;
  itemCount: number;
  assetCount?: number;
  totalSize: number;
  exportedAt: Date;
  exportedBy: string;
  
  // xAPI specific
  statementCount?: number;
  
  // Content info
  contentSummary: Array<{
    id: string;
    type: string;
    title: string;
    exported: boolean;
    error?: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOM Metadata (IEEE LOM)
// ─────────────────────────────────────────────────────────────────────────────

export interface LOMMetadata {
  general?: {
    identifier?: Array<{ catalog: string; entry: string }>;
    title?: LocalizedString;
    language?: string[];
    description?: LocalizedString;
    keywords?: LocalizedString[];
    coverage?: LocalizedString[];
    structure?: 'atomic' | 'collection' | 'networked' | 'hierarchical' | 'linear';
    aggregationLevel?: 1 | 2 | 3 | 4;
  };
  
  lifeCycle?: {
    version?: LocalizedString;
    status?: 'draft' | 'final' | 'revised' | 'unavailable';
    contribute?: Array<{
      role: string;
      entity: string[];
      date?: string;
    }>;
  };
  
  metaMetadata?: {
    identifier?: Array<{ catalog: string; entry: string }>;
    contribute?: Array<{
      role: string;
      entity: string[];
      date?: string;
    }>;
    metadataSchema?: string[];
    language?: string;
  };
  
  technical?: {
    format?: string[];
    size?: string;
    location?: string[];
    requirements?: Array<{
      orComposite?: Array<{
        type: string;
        name: string;
        minimumVersion?: string;
        maximumVersion?: string;
      }>;
    }>;
    installationRemarks?: LocalizedString;
    otherPlatformRequirements?: LocalizedString;
    duration?: string;
  };
  
  educational?: {
    interactivityType?: 'active' | 'expositive' | 'mixed';
    learningResourceType?: string[];
    interactivityLevel?: 'very low' | 'low' | 'medium' | 'high' | 'very high';
    semanticDensity?: 'very low' | 'low' | 'medium' | 'high' | 'very high';
    intendedEndUserRole?: string[];
    context?: string[];
    typicalAgeRange?: LocalizedString[];
    difficulty?: 'very easy' | 'easy' | 'medium' | 'difficult' | 'very difficult';
    typicalLearningTime?: string;
    description?: LocalizedString[];
    language?: string[];
  };
  
  rights?: {
    cost?: 'yes' | 'no';
    copyrightAndOtherRestrictions?: 'yes' | 'no';
    description?: LocalizedString;
  };
  
  relation?: Array<{
    kind: string;
    resource: {
      identifier?: Array<{ catalog: string; entry: string }>;
      description?: LocalizedString;
    };
  }>;
  
  annotation?: Array<{
    entity?: string;
    date?: string;
    description?: LocalizedString;
  }>;
  
  classification?: Array<{
    purpose: string;
    taxonPath?: Array<{
      source?: LocalizedString;
      taxon?: Array<{
        id?: string;
        entry?: LocalizedString;
      }>;
    }>;
    description?: LocalizedString;
    keywords?: LocalizedString[];
  }>;
}

export interface LocalizedString {
  string: string | Array<{ language?: string; value: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sequencing Rules (SCORM 2004)
// ─────────────────────────────────────────────────────────────────────────────

export interface SequencingRules {
  controlMode?: {
    choice?: boolean;
    choiceExit?: boolean;
    flow?: boolean;
    forwardOnly?: boolean;
    useCurrentAttemptObjectiveInfo?: boolean;
    useCurrentAttemptProgressInfo?: boolean;
  };
  
  sequencingRules?: {
    preConditionRules?: SequencingRule[];
    postConditionRules?: SequencingRule[];
    exitConditionRules?: SequencingRule[];
  };
  
  limitConditions?: {
    attemptLimit?: number;
    attemptAbsoluteDurationLimit?: string;
    attemptExperiencedDurationLimit?: string;
    activityAbsoluteDurationLimit?: string;
    activityExperiencedDurationLimit?: string;
    beginTimeLimit?: string;
    endTimeLimit?: string;
  };
  
  rollupRules?: {
    rollupObjectiveSatisfied?: boolean;
    rollupProgressCompletion?: boolean;
    objectiveMeasureWeight?: number;
    rules?: RollupRule[];
  };
  
  objectives?: {
    primaryObjective?: Objective;
    objectives?: Objective[];
  };
  
  randomizationControls?: {
    randomizationTiming?: 'never' | 'once' | 'onEachNewAttempt';
    selectCount?: number;
    reorderChildren?: boolean;
    selectionTiming?: 'never' | 'once' | 'onEachNewAttempt';
  };
  
  deliveryControls?: {
    tracked?: boolean;
    completionSetByContent?: boolean;
    objectiveSetByContent?: boolean;
  };
}

export interface SequencingRule {
  conditions: RuleCondition[];
  conditionCombination?: 'all' | 'any';
  action: string;
}

export interface RuleCondition {
  referencedObjective?: string;
  measureThreshold?: number;
  operator?: 'not' | 'noOp';
  condition: string;
}

export interface RollupRule {
  childActivitySet?: 'all' | 'any' | 'none' | 'atLeastCount' | 'atLeastPercent';
  minimumCount?: number;
  minimumPercent?: number;
  conditions: RuleCondition[];
  conditionCombination?: 'all' | 'any';
  action: 'satisfied' | 'notSatisfied' | 'completed' | 'incomplete';
}

export interface Objective {
  objectiveID?: string;
  satisfiedByMeasure?: boolean;
  minNormalizedMeasure?: number;
  mapInfo?: Array<{
    targetObjectiveID: string;
    readSatisfiedStatus?: boolean;
    readNormalizedMeasure?: boolean;
    writeSatisfiedStatus?: boolean;
    writeNormalizedMeasure?: boolean;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// xAPI Types
// ─────────────────────────────────────────────────────────────────────────────

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
  member?: XAPIActor[]; // For Group
}

export interface XAPIVerb {
  id: string;
  display?: Record<string, string>;
}

export interface XAPIObject {
  objectType?: 'Activity' | 'Agent' | 'Group' | 'StatementRef' | 'SubStatement';
  id?: string;
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
  extensions?: Record<string, any>;
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
  extensions?: Record<string, any>;
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
  statement?: { objectType: 'StatementRef'; id: string };
  extensions?: Record<string, any>;
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

// ─────────────────────────────────────────────────────────────────────────────
// Internal Content Types (for export)
// ─────────────────────────────────────────────────────────────────────────────

export interface LessonExportData {
  id: string;
  title: string;
  description?: string;
  blocks: BlockExportData[];
  metadata?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface BlockExportData {
  id: string;
  type: string;
  order: number;
  data: any;
}

export interface AssessmentExportData {
  id: string;
  title: string;
  description?: string;
  type: string;
  settings: AssessmentSettingsExport;
  sections: AssessmentSectionExport[];
  metadata?: Record<string, any>;
}

export interface AssessmentSettingsExport {
  timeLimit?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResults?: boolean;
  attemptsAllowed?: number;
  passingScore?: number;
}

export interface AssessmentSectionExport {
  id: string;
  title: string;
  order: number;
  questions: QuestionExportData[];
}

export interface QuestionExportData {
  id: string;
  type: string;
  stem: string;
  stemHtml?: string;
  options?: Array<{ id: string; text: string }>;
  correctAnswer?: string;
  correctAnswers?: string[];
  blanks?: Array<{ id: string; acceptedAnswers: string[] }>;
  pairs?: Array<{ left: string; right: string }>;
  correctOrder?: string[];
  points: number;
  feedback?: {
    correct?: string;
    incorrect?: string;
  };
  rubric?: any;
  metadata?: Record<string, any>;
}

export interface CourseExportData {
  id: string;
  title: string;
  description?: string;
  modules: ModuleExportData[];
  metadata?: Record<string, any>;
}

export interface ModuleExportData {
  id: string;
  title: string;
  order: number;
  items: Array<{
    id: string;
    type: 'lesson' | 'assessment' | 'resource';
    order: number;
    data: LessonExportData | AssessmentExportData | ResourceExportData;
  }>;
}

export interface ResourceExportData {
  id: string;
  title: string;
  type: string;
  url?: string;
  content?: string;
  metadata?: Record<string, any>;
}
