/**
 * Assessment Builder Components
 * 
 * A comprehensive assessment authoring system supporting:
 * - 13 question types
 * - Drag-and-drop question ordering
 * - Real-time preview
 * - Auto-save
 * - Rubric-based grading
 * - Settings configuration
 */

// Main components
export { AssessmentBuilder, default } from './AssessmentBuilder';
export { AssessmentSettings } from './AssessmentSettings';
export { PreviewPanel } from './PreviewPanel';
export { QuestionEditor } from './QuestionEditor';
export { QuestionCard } from './QuestionCard';
export { QuestionPalette } from './QuestionPalette';

// Question renderers (student-facing)
export {
  QuestionRenderer,
  QuestionHeader,
  MultipleChoiceRenderer,
  MultipleSelectRenderer,
  TrueFalseRenderer,
  ShortAnswerRenderer,
  EssayRenderer,
  FillBlankRenderer,
  MatchingRenderer,
  OrderingRenderer,
  NumericRenderer,
  CodeRenderer,
  MathEquationRenderer,
} from './QuestionRenderers';

// Grading interface
export { GradingQueue } from './GradingQueue';

// Student assessment taking
export { AssessmentTaker } from './AssessmentTaker';

// Hooks
export { useAssessmentBuilder } from './useAssessmentBuilder';

// Types
export type {
  QuestionType,
  Difficulty,
  AssessmentType,
  AssessmentStatus,
  Question,
  QuestionOption,
  QuestionBlank,
  QuestionPair,
  TestCase,
  Rubric,
  RubricCriterion,
  RubricLevel,
  AssessmentSettings as AssessmentSettingsType,
  Assessment,
  BuilderState,
  ValidationError,
} from './types';
