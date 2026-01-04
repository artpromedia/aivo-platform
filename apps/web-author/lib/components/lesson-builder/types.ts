/**
 * Type definitions for Interactive Lesson Builder
 */

// ══════════════════════════════════════════════════════════════════════════════
// LESSON TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type LessonType = 'instruction' | 'practice' | 'assessment' | 'review' | 'enrichment';

export type ActivityType =
  | 'multiple_choice'
  | 'drag_and_drop'
  | 'matching'
  | 'fill_in_blank'
  | 'ordering'
  | 'hotspot'
  | 'drawing'
  | 'audio_response'
  | 'video_response'
  | 'free_response'
  | 'interactive_video'
  | 'simulation'
  | 'game';

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'link';

export type FeedbackType = 'immediate' | 'delayed' | 'end_of_activity' | 'none';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'adaptive';

// ══════════════════════════════════════════════════════════════════════════════
// LESSON STRUCTURE
// ══════════════════════════════════════════════════════════════════════════════

export interface InteractiveLesson {
  id: string;
  title: string;
  description: string;
  lessonType: LessonType;
  estimatedDuration: number; // in minutes
  objectives: string[];
  prerequisiteSkills: string[];
  targetSkills: string[];
  gradeLevel: string;
  subject: string;
  sections: LessonSection[];
  settings: LessonSettings;
  accessibility: LessonAccessibility;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LessonSection {
  id: string;
  title: string;
  orderIndex: number;
  isOptional: boolean;
  activities: LessonActivity[];
  transitionType: 'auto' | 'user_triggered' | 'score_based';
  transitionConfig?: {
    minScore?: number;
    delay?: number;
  };
}

export interface LessonSettings {
  allowSkipping: boolean;
  showProgress: boolean;
  enableTimer: boolean;
  timerMinutes?: number;
  shuffleActivities: boolean;
  maxAttempts: number;
  passingScore: number;
  feedbackType: FeedbackType;
  difficultyLevel: DifficultyLevel;
  adaptiveLearning: boolean;
  gamificationEnabled: boolean;
  pointsPerActivity?: number;
  badges?: LessonBadge[];
}

export interface LessonBadge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  criteria: {
    type: 'score' | 'completion' | 'speed' | 'streak';
    threshold: number;
  };
}

export interface LessonAccessibility {
  supportsScreenReader: boolean;
  supportsKeyboardNavigation: boolean;
  supportsHighContrast: boolean;
  supportsDyslexiaFont: boolean;
  supportsReducedMotion: boolean;
  audioDescriptionsAvailable: boolean;
  closedCaptionsAvailable: boolean;
  signLanguageAvailable: boolean;
  textToSpeechEnabled: boolean;
  readingLevelAdjustment: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface LessonActivity {
  id: string;
  type: ActivityType;
  title: string;
  instructions: string;
  orderIndex: number;
  points: number;
  required: boolean;
  content: ActivityContent;
  feedback: ActivityFeedback;
  hints: ActivityHint[];
  media: ActivityMedia[];
  accessibility: ActivityAccessibility;
}

export type ActivityContent =
  | MultipleChoiceContent
  | DragAndDropContent
  | MatchingContent
  | FillInBlankContent
  | OrderingContent
  | HotspotContent
  | DrawingContent
  | AudioResponseContent
  | VideoResponseContent
  | FreeResponseContent
  | InteractiveVideoContent
  | SimulationContent
  | GameContent;

// Multiple Choice
export interface MultipleChoiceContent {
  type: 'multiple_choice';
  question: string;
  options: MultipleChoiceOption[];
  multiSelect: boolean;
  shuffleOptions: boolean;
}

export interface MultipleChoiceOption {
  id: string;
  text: string;
  imageUrl?: string;
  isCorrect: boolean;
  feedback?: string;
}

// Drag and Drop
export interface DragAndDropContent {
  type: 'drag_and_drop';
  prompt: string;
  draggables: DraggableItem[];
  dropZones: DropZone[];
  allowMultipleInZone: boolean;
}

export interface DraggableItem {
  id: string;
  content: string;
  imageUrl?: string;
  correctDropZoneId: string;
}

export interface DropZone {
  id: string;
  label: string;
  acceptsMultiple: boolean;
  position: { x: number; y: number; width: number; height: number };
}

// Matching
export interface MatchingContent {
  type: 'matching';
  prompt: string;
  pairs: MatchingPair[];
  shuffleBothSides: boolean;
}

export interface MatchingPair {
  id: string;
  left: { text: string; imageUrl?: string };
  right: { text: string; imageUrl?: string };
}

// Fill in the Blank
export interface FillInBlankContent {
  type: 'fill_in_blank';
  text: string;
  blanks: FillInBlank[];
  caseSensitive: boolean;
  allowPartialCredit: boolean;
}

export interface FillInBlank {
  id: string;
  position: number;
  correctAnswers: string[];
  acceptableVariations?: string[];
  hint?: string;
}

// Ordering
export interface OrderingContent {
  type: 'ordering';
  prompt: string;
  items: OrderingItem[];
  direction: 'vertical' | 'horizontal';
}

export interface OrderingItem {
  id: string;
  content: string;
  imageUrl?: string;
  correctPosition: number;
}

// Hotspot
export interface HotspotContent {
  type: 'hotspot';
  prompt: string;
  backgroundImageUrl: string;
  hotspots: Hotspot[];
  allowMultipleSelections: boolean;
}

export interface Hotspot {
  id: string;
  shape: 'circle' | 'rectangle' | 'polygon';
  coordinates: number[];
  isCorrect: boolean;
  label?: string;
  feedback?: string;
}

// Drawing
export interface DrawingContent {
  type: 'drawing';
  prompt: string;
  backgroundImageUrl?: string;
  tools: ('pencil' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text')[];
  colors: string[];
  rubric?: DrawingRubric;
}

export interface DrawingRubric {
  criteria: { name: string; description: string; maxPoints: number }[];
  autoGrade: boolean;
}

// Audio Response
export interface AudioResponseContent {
  type: 'audio_response';
  prompt: string;
  maxDurationSeconds: number;
  allowRetakes: boolean;
  maxRetakes: number;
  rubric?: ResponseRubric;
  speechToTextEnabled: boolean;
}

// Video Response
export interface VideoResponseContent {
  type: 'video_response';
  prompt: string;
  maxDurationSeconds: number;
  allowRetakes: boolean;
  maxRetakes: number;
  rubric?: ResponseRubric;
}

export interface ResponseRubric {
  criteria: { name: string; description: string; maxPoints: number }[];
  autoGrade: boolean;
  keyPhrases?: string[];
}

// Free Response
export interface FreeResponseContent {
  type: 'free_response';
  prompt: string;
  minWords?: number;
  maxWords?: number;
  rubric?: ResponseRubric;
  scaffolding?: WritingScaffold[];
}

export interface WritingScaffold {
  id: string;
  label: string;
  placeholder: string;
  orderIndex: number;
}

// Interactive Video
export interface InteractiveVideoContent {
  type: 'interactive_video';
  videoUrl: string;
  interactions: VideoInteraction[];
  allowSeeking: boolean;
  pauseOnInteraction: boolean;
}

export interface VideoInteraction {
  id: string;
  timestampSeconds: number;
  type: 'question' | 'hotspot' | 'branch';
  content: ActivityContent;
  required: boolean;
}

// Simulation
export interface SimulationContent {
  type: 'simulation';
  simulationType: 'science_lab' | 'math_manipulative' | 'language_scenario' | 'custom';
  config: Record<string, unknown>;
  objectives: SimulationObjective[];
}

export interface SimulationObjective {
  id: string;
  description: string;
  targetValue: unknown;
  tolerance?: number;
  points: number;
}

// Game
export interface GameContent {
  type: 'game';
  gameType: 'word_search' | 'crossword' | 'memory' | 'puzzle' | 'quiz_race' | 'custom';
  config: Record<string, unknown>;
  difficulty: DifficultyLevel;
  timeLimit?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// FEEDBACK & HINTS
// ══════════════════════════════════════════════════════════════════════════════

export interface ActivityFeedback {
  correct: FeedbackContent;
  incorrect: FeedbackContent;
  partial?: FeedbackContent;
  encouragement: string[];
}

export interface FeedbackContent {
  message: string;
  explanation?: string;
  mediaUrl?: string;
  nextSteps?: string;
}

export interface ActivityHint {
  id: string;
  orderIndex: number;
  text: string;
  pointsDeduction: number;
  mediaUrl?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MEDIA & ACCESSIBILITY
// ══════════════════════════════════════════════════════════════════════════════

export interface ActivityMedia {
  id: string;
  type: MediaType;
  url: string;
  altText?: string;
  caption?: string;
  transcript?: string;
  duration?: number;
}

export interface ActivityAccessibility {
  ariaLabel: string;
  ariaDescription?: string;
  keyboardInstructions?: string;
  screenReaderText?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILDER STATE
// ══════════════════════════════════════════════════════════════════════════════

export interface LessonBuilderState {
  lesson: InteractiveLesson | null;
  selectedSectionId: string | null;
  selectedActivityId: string | null;
  isPreviewMode: boolean;
  isDirty: boolean;
  validationErrors: ValidationError[];
  undoStack: InteractiveLesson[];
  redoStack: InteractiveLesson[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

export interface LessonTemplate {
  id: string;
  name: string;
  description: string;
  lessonType: LessonType;
  thumbnail: string;
  sections: Omit<LessonSection, 'id'>[];
  defaultSettings: Partial<LessonSettings>;
  tags: string[];
}

export interface ActivityTemplate {
  id: string;
  name: string;
  description: string;
  activityType: ActivityType;
  thumbnail: string;
  defaultContent: Partial<ActivityContent>;
  tags: string[];
}
