/**
 * Goals & Session Planning Types
 *
 * TypeScript types for the goal management and session planning domain.
 * These types align with the Prisma schema but provide additional
 * type safety and documentation for service consumers.
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

/** Academic/therapeutic domain for goal categorization */
export type GoalDomain = 'ELA' | 'MATH' | 'SCIENCE' | 'SPEECH' | 'SEL' | 'OTHER';

/** Lifecycle status of a goal */
export type GoalStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';

/** Status of a short-term objective */
export type ObjectiveStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MET' | 'NOT_MET';

/** Type of planned session */
export type SessionPlanType =
  | 'LEARNING'
  | 'THERAPY'
  | 'GROUP'
  | 'ASSESSMENT'
  | 'PRACTICE'
  | 'OTHER';

/** Lifecycle status of a session plan */
export type SessionPlanStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

/**
 * Progress rating scale (0-4)
 * - 0: Not Started / Not Attempted
 * - 1: Beginning / Emerging
 * - 2: Developing
 * - 3: Approaching / Proficient
 * - 4: Met / Advanced
 */
export type ProgressRating = 0 | 1 | 2 | 3 | 4;

// ══════════════════════════════════════════════════════════════════════════════
// GOAL TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Goal entity - teacher/therapist-defined outcomes for learners */
export interface Goal {
  id: string;
  tenantId: string;
  learnerId: string;
  createdByUserId: string;

  title: string;
  description: string | null;
  domain: GoalDomain;

  /** Optional FK to skills table for Virtual Brain alignment */
  skillId: string | null;

  startDate: Date;
  targetDate: Date | null;

  status: GoalStatus;
  /** Overall progress: 0=Not Started, 1=Beginning, 2=Developing, 3=Approaching, 4=Met */
  progressRating: ProgressRating | null;

  /** Extensible metadata: standards tags, IEP references, etc. */
  metadataJson: GoalMetadata | null;

  createdAt: Date;
  updatedAt: Date;

  // Relations (optional, populated by includes)
  objectives?: GoalObjective[];
}

/** Metadata structure for goals */
export interface GoalMetadata {
  /** State/local standards alignment (e.g., "CCSS.ELA-LITERACY.RL.3.1") */
  standardsTag?: string;
  /** IEP goal number reference */
  iepGoalNumber?: string;
  /** Additional notes for internal use */
  internalNotes?: string;
  /** Custom fields */
  [key: string]: unknown;
}

/** Input for creating a new goal */
export interface CreateGoalInput {
  tenantId: string;
  learnerId: string;
  createdByUserId: string;

  title: string;
  description?: string;
  domain: GoalDomain;
  skillId?: string;

  startDate?: Date;
  targetDate?: Date;

  status?: GoalStatus;
  metadataJson?: GoalMetadata;
}

/** Input for updating a goal */
export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  domain?: GoalDomain;
  skillId?: string | null;
  startDate?: Date;
  targetDate?: Date | null;
  status?: GoalStatus;
  progressRating?: ProgressRating | null;
  metadataJson?: GoalMetadata | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// GOAL OBJECTIVE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Short-term objective within a goal */
export interface GoalObjective {
  id: string;
  goalId: string;

  description: string;
  /** Measurable criteria for determining when objective is met */
  successCriteria: string | null;

  status: ObjectiveStatus;
  progressRating: ProgressRating | null;

  /** Order within the goal (0-indexed) */
  orderIndex: number;

  createdAt: Date;
  updatedAt: Date;
}

/** Input for creating a new objective */
export interface CreateObjectiveInput {
  goalId: string;
  description: string;
  successCriteria?: string;
  status?: ObjectiveStatus;
  orderIndex?: number;
}

/** Input for updating an objective */
export interface UpdateObjectiveInput {
  description?: string;
  successCriteria?: string | null;
  status?: ObjectiveStatus;
  progressRating?: ProgressRating | null;
  orderIndex?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Session plan entity */
export interface SessionPlan {
  id: string;
  tenantId: string;
  learnerId: string;
  createdByUserId: string;

  /** Optional template name for reusable session patterns */
  sessionTemplateName: string | null;

  scheduledFor: Date | null;
  estimatedDurationMinutes: number | null;

  sessionType: SessionPlanType;
  status: SessionPlanStatus;

  /** FK to sessions table when plan is executed */
  sessionId: string | null;

  /** Extensible: classroomId, location, groupMembers, etc. */
  metadataJson: SessionPlanMetadata | null;

  createdAt: Date;
  updatedAt: Date;

  // Relations (optional, populated by includes)
  items?: SessionPlanItem[];
}

/** Metadata structure for session plans */
export interface SessionPlanMetadata {
  /** Classroom where session takes place */
  classroomId?: string;
  /** Physical or virtual location */
  location?: string;
  /** Group members for group sessions */
  groupMemberIds?: string[];
  /** Recurrence pattern (if recurring) */
  recurrenceRule?: string;
  /** Custom fields */
  [key: string]: unknown;
}

/** Input for creating a session plan */
export interface CreateSessionPlanInput {
  tenantId: string;
  learnerId: string;
  createdByUserId: string;

  sessionTemplateName?: string;
  scheduledFor?: Date;
  estimatedDurationMinutes?: number;
  sessionType?: SessionPlanType;
  status?: SessionPlanStatus;
  metadataJson?: SessionPlanMetadata;

  /** Items to create with the plan */
  items?: CreateSessionPlanItemInput[];
}

/** Input for updating a session plan */
export interface UpdateSessionPlanInput {
  sessionTemplateName?: string | null;
  scheduledFor?: Date | null;
  estimatedDurationMinutes?: number | null;
  sessionType?: SessionPlanType;
  status?: SessionPlanStatus;
  sessionId?: string | null;
  metadataJson?: SessionPlanMetadata | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN ITEM TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Individual activity within a session plan */
export interface SessionPlanItem {
  id: string;
  sessionPlanId: string;

  orderIndex: number;

  goalId: string | null;
  goalObjectiveId: string | null;
  skillId: string | null;

  /** Type: reading_passage, math_manipulatives, speech_drill, etc. */
  activityType: string;
  activityDescription: string | null;
  estimatedDurationMinutes: number | null;

  /** AI-generated content refs: learning_object_id, prompt templates, etc. */
  aiMetadataJson: SessionPlanItemAiMetadata | null;

  createdAt: Date;
  updatedAt: Date;
}

/** AI metadata for session plan items */
export interface SessionPlanItemAiMetadata {
  /** Reference to learning object */
  learningObjectId?: string;
  /** AI-generated prompt template */
  promptTemplate?: string;
  /** Suggested difficulty level */
  difficultyLevel?: number;
  /** Custom fields */
  [key: string]: unknown;
}

/** Input for creating a session plan item */
export interface CreateSessionPlanItemInput {
  sessionPlanId?: string; // Optional if creating with plan
  orderIndex?: number;
  goalId?: string;
  goalObjectiveId?: string;
  skillId?: string;
  activityType: string;
  activityDescription?: string;
  estimatedDurationMinutes?: number;
  aiMetadataJson?: SessionPlanItemAiMetadata;
}

/** Input for updating a session plan item */
export interface UpdateSessionPlanItemInput {
  orderIndex?: number;
  goalId?: string | null;
  goalObjectiveId?: string | null;
  skillId?: string | null;
  activityType?: string;
  activityDescription?: string | null;
  estimatedDurationMinutes?: number | null;
  aiMetadataJson?: SessionPlanItemAiMetadata | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESS NOTE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Progress note capturing session outcomes and evidence */
export interface ProgressNote {
  id: string;
  tenantId: string;
  learnerId: string;
  createdByUserId: string;

  /** FK to sessions table if note relates to a specific session */
  sessionId: string | null;
  sessionPlanId: string | null;

  goalId: string | null;
  goalObjectiveId: string | null;

  noteText: string;
  /** Performance rating: 0=Not Attempted, 1=Emerging, 2=Developing, 3=Proficient, 4=Advanced */
  rating: ProgressRating | null;

  /** URL to work sample, recording, or other evidence */
  evidenceUri: string | null;

  createdAt: Date;
  updatedAt: Date;
}

/** Input for creating a progress note */
export interface CreateProgressNoteInput {
  tenantId: string;
  learnerId: string;
  createdByUserId: string;

  sessionId?: string;
  sessionPlanId?: string;
  goalId?: string;
  goalObjectiveId?: string;

  noteText: string;
  rating?: ProgressRating;
  evidenceUri?: string;
}

/** Input for updating a progress note */
export interface UpdateProgressNoteInput {
  sessionId?: string | null;
  sessionPlanId?: string | null;
  goalId?: string | null;
  goalObjectiveId?: string | null;
  noteText?: string;
  rating?: ProgressRating | null;
  evidenceUri?: string | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Filters for querying goals */
export interface GoalFilters {
  tenantId: string;
  learnerId?: string;
  createdByUserId?: string;
  status?: GoalStatus | GoalStatus[];
  domain?: GoalDomain | GoalDomain[];
  skillId?: string;
}

/** Filters for querying session plans */
export interface SessionPlanFilters {
  tenantId: string;
  learnerId?: string;
  createdByUserId?: string;
  status?: SessionPlanStatus | SessionPlanStatus[];
  sessionType?: SessionPlanType | SessionPlanType[];
  scheduledFrom?: Date;
  scheduledTo?: Date;
}

/** Filters for querying progress notes */
export interface ProgressNoteFilters {
  tenantId: string;
  learnerId?: string;
  createdByUserId?: string;
  sessionId?: string;
  sessionPlanId?: string;
  goalId?: string;
  goalObjectiveId?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// AGGREGATE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Goal with full relations loaded */
export interface GoalWithRelations extends Goal {
  objectives: GoalObjective[];
  progressNotes: ProgressNote[];
}

/** Session plan with full relations loaded */
export interface SessionPlanWithRelations extends SessionPlan {
  items: SessionPlanItem[];
  progressNotes: ProgressNote[];
}

/** Learner goal summary for dashboard */
export interface LearnerGoalSummary {
  learnerId: string;
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  goalsByDomain: Record<GoalDomain, number>;
  averageProgressRating: number | null;
}

/** Session plan calendar view item */
export interface SessionPlanCalendarItem {
  id: string;
  learnerId: string;
  learnerName?: string;
  sessionTemplateName: string | null;
  scheduledFor: Date;
  sessionType: SessionPlanType;
  status: SessionPlanStatus;
  estimatedDurationMinutes: number | null;
}
