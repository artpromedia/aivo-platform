/**
 * Learning Object Types
 *
 * Learning Objects (LOs) are versioned, reviewable units of learning content.
 * Each LO has a logical identity and multiple versions, with only one PUBLISHED
 * version active per tenant at a time.
 *
 * Content Types:
 * - reading_passage: Text passage with optional comprehension questions
 * - reading_passage_with_questions: Passage + questions (most common for ELA)
 * - math_problem: Single or multi-step math problem
 * - math_problem_set: Collection of related problems
 * - sel_check_in: Social-emotional learning check-in activity
 * - sel_scenario: SEL scenario with reflection prompts
 * - video_lesson: Video with optional questions/activities
 * - interactive_game: Gamified learning activity
 * - speech_exercise: Speech/language therapy exercise
 * - assessment_item: Standalone assessment question/task
 *
 * Workflow States:
 * DRAFT → IN_REVIEW → APPROVED → PUBLISHED → RETIRED
 */
/** Subject areas for Learning Objects */
export type LearningObjectSubject = 'ELA' | 'MATH' | 'SCIENCE' | 'SEL' | 'SPEECH' | 'OTHER';
/** Grade bands for age-appropriate content targeting */
export type LearningObjectGradeBand = 'K_2' | 'G3_5' | 'G6_8' | 'G9_12';
/** Workflow states for version lifecycle */
export type LearningObjectVersionState = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'RETIRED';
/** Content types (discriminator for content_json) */
export type LearningObjectContentType = 'reading_passage' | 'reading_passage_with_questions' | 'math_problem' | 'math_problem_set' | 'sel_check_in' | 'sel_scenario' | 'video_lesson' | 'interactive_game' | 'speech_exercise' | 'assessment_item';
/**
 * Learning Object - Logical identity of a learning content unit.
 *
 * Examples:
 * - "ELA G3 reading passage: Dogs in Winter"
 * - "Math G6 problem: Two-step equations"
 * - "SEL K-2 check-in: How are you feeling today?"
 *
 * The LO itself contains metadata; actual content is in versions.
 */
export interface LearningObject {
    id: string;
    /** Tenant ID - null means global/shared content available to all tenants */
    tenantId: string | null;
    /** URL-safe unique identifier within tenant scope (e.g., "ela-g3-dogs-winter-passage") */
    slug: string;
    /** Human-readable title */
    title: string;
    /** Subject area */
    subject: LearningObjectSubject;
    /** Target grade band */
    gradeBand: LearningObjectGradeBand;
    /** Primary skill alignment (FK to skills table) */
    primarySkillId: string | null;
    /** Whether this LO is active (soft-delete flag) */
    isActive: boolean;
    /** User who created this LO */
    createdByUserId: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Learning Object Version - Concrete version of content.
 *
 * Each LO can have multiple versions. Only one version can be PUBLISHED
 * per LO per tenant at a time. Versions move through the workflow:
 *
 *   DRAFT → IN_REVIEW → APPROVED → PUBLISHED
 *                ↓           ↓
 *             DRAFT      DRAFT (if rejected)
 *
 * Old published versions become RETIRED when a new one is published.
 */
export interface LearningObjectVersion {
    id: string;
    /** FK to parent learning object */
    learningObjectId: string;
    /** Monotonically increasing version number (1, 2, 3...) */
    versionNumber: number;
    /** Current workflow state */
    state: LearningObjectVersionState;
    /** User who created this version */
    createdByUserId: string;
    /** User who reviewed (moved to APPROVED or back to DRAFT) */
    reviewedByUserId: string | null;
    /** User who approved for publication */
    approvedByUserId: string | null;
    /** Summary of changes from previous version */
    changeSummary: string | null;
    /** Structured content payload (see ContentJson types below) */
    contentJson: LearningObjectContentJson;
    /** Accessibility information */
    accessibilityJson: AccessibilityMetadata;
    /** Standards alignment (CCSS, NGSS, etc.) */
    standardsJson: StandardsAlignment;
    /** Additional metadata (tags, duration, modality, etc.) */
    metadataJson: LearningObjectMetadata;
    createdAt: Date;
    updatedAt: Date;
    /** When this version was published (null if never published) */
    publishedAt: Date | null;
}
/**
 * Learning Object Tag - Flexible tagging for discovery and filtering.
 */
export interface LearningObjectTag {
    id: string;
    learningObjectId: string;
    tag: string;
    createdAt: Date;
}
/**
 * Learning Object Skill - Version-specific skill alignments.
 *
 * Each version can target multiple skills with different weights.
 * The primary skill is on the LO itself; secondary skills are here.
 */
export interface LearningObjectSkill {
    id: string;
    /** FK to specific version (skills can change between versions) */
    learningObjectVersionId: string;
    /** FK to skills table */
    skillId: string;
    /** Relevance weight (0.0 - 1.0), higher = more relevant */
    weight: number | null;
    createdAt: Date;
}
/**
 * Base content structure - all content types extend this.
 */
interface ContentJsonBase {
    type: LearningObjectContentType;
}
export interface ReadingPassageContent extends ContentJsonBase {
    type: 'reading_passage';
    body: {
        passage: PassageData;
    };
}
export interface ReadingPassageWithQuestionsContent extends ContentJsonBase {
    type: 'reading_passage_with_questions';
    body: {
        passage: PassageData;
        questions: QuestionItem[];
    };
}
export interface PassageData {
    /** The passage text (may include basic HTML formatting) */
    text: string;
    /** Lexile reading level (e.g., 650) */
    lexileLevel?: number;
    /** Estimated read time in minutes */
    estimatedReadTimeMinutes?: number;
    /** Source attribution if applicable */
    source?: string;
    /** Genre/category (fiction, nonfiction, poetry, etc.) */
    genre?: string;
}
export interface MathProblemContent extends ContentJsonBase {
    type: 'math_problem';
    body: {
        problem: MathProblemData;
    };
}
export interface MathProblemSetContent extends ContentJsonBase {
    type: 'math_problem_set';
    body: {
        setTitle?: string;
        problems: MathProblemData[];
    };
}
export interface MathProblemData {
    /** Problem ID within the content */
    id: string;
    /** The problem statement (may include LaTeX for math notation) */
    prompt: string;
    /** Problem type */
    problemType: 'single_answer' | 'multiple_choice' | 'fill_in_blank' | 'show_work';
    /** For multiple choice */
    choices?: string[];
    correctChoiceIndex?: number;
    /** For single answer / fill in blank */
    correctAnswer?: string | number;
    /** Acceptable answer tolerance for numeric answers */
    tolerance?: number;
    /** Hints available */
    hints?: string[];
    /** Step-by-step solution for review */
    solution?: string;
    /** Difficulty within the set (1-5) */
    difficulty?: number;
}
export interface SelCheckInContent extends ContentJsonBase {
    type: 'sel_check_in';
    body: {
        checkInType: 'emotion' | 'energy' | 'readiness' | 'custom';
        prompt: string;
        options: SelOption[];
        followUpPrompt?: string;
    };
}
export interface SelScenarioContent extends ContentJsonBase {
    type: 'sel_scenario';
    body: {
        scenario: string;
        reflectionPrompts: string[];
        suggestedResponses?: string[];
        discussionPoints?: string[];
    };
}
export interface SelOption {
    id: string;
    label: string;
    emoji?: string;
    imageUrl?: string;
    value: number;
}
export interface VideoLessonContent extends ContentJsonBase {
    type: 'video_lesson';
    body: {
        videoUrl: string;
        durationSeconds: number;
        transcript?: string;
        chapters?: VideoChapter[];
        comprehensionQuestions?: QuestionItem[];
    };
}
export interface VideoChapter {
    title: string;
    startSeconds: number;
    endSeconds: number;
}
export interface InteractiveGameContent extends ContentJsonBase {
    type: 'interactive_game';
    body: {
        gameType: string;
        configUrl?: string;
        config?: Record<string, unknown>;
        estimatedPlayTimeMinutes: number;
    };
}
export interface SpeechExerciseContent extends ContentJsonBase {
    type: 'speech_exercise';
    body: {
        exerciseType: 'articulation' | 'fluency' | 'language' | 'voice' | 'phonological';
        targetSounds?: string[];
        targetWords?: string[];
        instructions: string;
        modelAudioUrl?: string;
        visualPromptUrl?: string;
        repetitions?: number;
    };
}
export interface AssessmentItemContent extends ContentJsonBase {
    type: 'assessment_item';
    body: {
        itemType: 'multiple_choice' | 'open_response' | 'performance_task';
        question: QuestionItem;
        rubric?: RubricItem[];
        pointValue?: number;
    };
}
export interface RubricItem {
    score: number;
    description: string;
    criteria: string[];
}
export interface QuestionItem {
    /** Question ID within the content */
    id: string;
    /** Question type */
    type: 'multiple_choice' | 'true_false' | 'short_answer' | 'open_response';
    /** The question prompt */
    prompt: string;
    /** For multiple choice / true-false */
    choices?: string[];
    correctChoiceIndex?: number;
    /** For short answer */
    acceptableAnswers?: string[];
    /** Explanation shown after answering */
    explanation?: string;
    /** DOK level (1-4) */
    dokLevel?: 1 | 2 | 3 | 4;
    /** Skill alignment for this specific question */
    skillCode?: string;
}
export type LearningObjectContentJson = ReadingPassageContent | ReadingPassageWithQuestionsContent | MathProblemContent | MathProblemSetContent | SelCheckInContent | SelScenarioContent | VideoLessonContent | InteractiveGameContent | SpeechExerciseContent | AssessmentItemContent;
/**
 * Accessibility metadata for inclusive design.
 */
export interface AccessibilityMetadata {
    /** Alt text for images */
    altText?: string;
    /** Reading level (Flesch-Kincaid, etc.) */
    readingLevel?: {
        fleschKincaid?: number;
        lexile?: number;
    };
    /** Supports for learners with specific needs */
    supports?: {
        dyslexia?: boolean;
        adhd?: boolean;
        visualImpairment?: boolean;
        hearingImpairment?: boolean;
        motorImpairment?: boolean;
    };
    /** Language */
    language?: string;
    /** Text-to-speech availability */
    ttsAvailable?: boolean;
    /** Closed captions available (for video) */
    closedCaptionsAvailable?: boolean;
    /** Additional accessibility notes */
    notes?: string;
}
/**
 * Standards alignment metadata.
 */
export interface StandardsAlignment {
    /** Common Core State Standards */
    ccss?: StandardReference[];
    /** Next Generation Science Standards */
    ngss?: StandardReference[];
    /** State-specific standards */
    state?: {
        stateCode: string;
        standards: StandardReference[];
    }[];
    /** Other standards frameworks */
    other?: {
        framework: string;
        standards: StandardReference[];
    }[];
}
export interface StandardReference {
    /** Standard code (e.g., "CCSS.ELA-LITERACY.RL.3.1") */
    code: string;
    /** Human-readable description */
    description?: string;
    /** Alignment strength */
    alignmentStrength?: 'primary' | 'secondary' | 'related';
}
/**
 * General metadata for learning objects.
 */
export interface LearningObjectMetadata {
    /** Estimated duration in minutes */
    estimatedDurationMinutes?: number;
    /** Content modality */
    modality?: ('visual' | 'auditory' | 'kinesthetic' | 'reading_writing')[];
    /** Difficulty level (1-5) */
    difficultyLevel?: 1 | 2 | 3 | 4 | 5;
    /** Keywords for search */
    keywords?: string[];
    /** Author notes (internal) */
    authorNotes?: string;
    /** External content ID (for ingested content) */
    externalId?: string;
    /** Source system for ingested content */
    sourceSystem?: string;
    /** License information */
    license?: {
        type: string;
        attribution?: string;
    };
    /** AI-generated content flag */
    aiGenerated?: boolean;
    /** Review priority (for review queue ordering) */
    reviewPriority?: 'low' | 'normal' | 'high' | 'urgent';
}
/**
 * Input for creating a new Learning Object.
 */
export interface CreateLearningObjectInput {
    tenantId?: string | null;
    slug: string;
    title: string;
    subject: LearningObjectSubject;
    gradeBand: LearningObjectGradeBand;
    primarySkillId?: string | null;
    tags?: string[];
}
/**
 * Input for creating a new version.
 */
export interface CreateLearningObjectVersionInput {
    learningObjectId: string;
    changeSummary?: string;
    contentJson: LearningObjectContentJson;
    accessibilityJson?: AccessibilityMetadata;
    standardsJson?: StandardsAlignment;
    metadataJson?: LearningObjectMetadata;
    skillAlignments?: {
        skillId: string;
        weight?: number;
    }[];
}
/**
 * State transition input.
 */
export interface TransitionVersionStateInput {
    versionId: string;
    targetState: LearningObjectVersionState;
    comment?: string;
}
/**
 * Query parameters for listing learning objects.
 */
export interface ListLearningObjectsQuery {
    tenantId?: string | null;
    subject?: LearningObjectSubject;
    gradeBand?: LearningObjectGradeBand;
    skillId?: string;
    tags?: string[];
    includeGlobal?: boolean;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
}
/**
 * Query parameters for listing versions.
 */
export interface ListVersionsQuery {
    learningObjectId: string;
    state?: LearningObjectVersionState;
    includeRetired?: boolean;
}
/**
 * Learning Object with current published version (for runtime use).
 */
export interface LearningObjectWithCurrentVersion extends LearningObject {
    currentVersion: LearningObjectVersion | null;
    tags: string[];
}
/**
 * Version transition record (audit trail).
 */
export interface VersionTransition {
    id: string;
    versionId: string;
    fromState: LearningObjectVersionState;
    toState: LearningObjectVersionState;
    userId: string;
    comment: string | null;
    transitionedAt: Date;
}
export {};
//# sourceMappingURL=learningObject.d.ts.map