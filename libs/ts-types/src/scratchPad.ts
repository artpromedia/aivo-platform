/**
 * Scratch Pad Types
 *
 * Types for the math scratch pad feature including
 * stroke data, recognition results, and sessions.
 */

// ══════════════════════════════════════════════════════════════════════════════
// Stroke Data
// ══════════════════════════════════════════════════════════════════════════════

/** A single point in a stroke */
export interface StrokePoint {
  x: number;
  y: number;
  /** Timestamp in milliseconds */
  t: number;
  /** Pressure (0-1), defaults to 1 */
  p?: number;
}

/** A complete stroke (pen down -> pen up) */
export interface Stroke {
  id: string;
  points: StrokePoint[];
  /** Color as integer (e.g., 0xFF000000 for black) */
  color?: number;
  strokeWidth?: number;
  createdAt?: string;
}

/** Drawing canvas state */
export interface CanvasState {
  strokes: Stroke[];
  canvasSize: {
    width: number;
    height: number;
  };
  /** Background color as integer */
  backgroundColor?: number;
  createdAt: string;
  updatedAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// Recognition
// ══════════════════════════════════════════════════════════════════════════════

/** Recognition options */
export interface RecognitionOptions {
  /** Whether to evaluate the expression (default: true) */
  evaluateExpression?: boolean;
  /** Whether to include alternative interpretations (default: true) */
  includeAlternatives?: boolean;
  /** Maximum number of alternatives (default: 3) */
  maxAlternatives?: number;
  /** Context hint (e.g., "algebra", "arithmetic") */
  context?: string;
}

/** Alternative recognition candidate */
export interface RecognitionCandidate {
  text: string;
  confidence: number;
}

/** Result of evaluating a math expression */
export interface EvaluationResult {
  isValid: boolean;
  result?: number | string;
  formattedResult?: string;
  error?: string;
}

/** Type of math expression */
export type MathExpressionType =
  | 'number'
  | 'equation'
  | 'expression'
  | 'fraction'
  | 'exponent'
  | 'squareRoot'
  | 'inequality'
  | 'unknown';

/** Result from math recognition */
export interface MathRecognitionResult {
  /** The recognized text */
  recognizedText: string;
  /** LaTeX representation if applicable */
  latexRepresentation?: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Alternative interpretations */
  alternatives: RecognitionCandidate[];
  /** Type of expression */
  expressionType: MathExpressionType;
  /** Evaluation result if computed */
  evaluation?: EvaluationResult;
}

// ══════════════════════════════════════════════════════════════════════════════
// Recognition Requests
// ══════════════════════════════════════════════════════════════════════════════

/** Request to recognize strokes */
export interface StrokeRecognitionRequest {
  strokes: Stroke[];
  canvasWidth: number;
  canvasHeight: number;
  options?: RecognitionOptions;
}

/** Request to recognize image */
export interface ImageRecognitionRequest {
  /** Base64 encoded image */
  image: string;
  options?: RecognitionOptions;
}

/** Request to validate an answer */
export interface ValidateAnswerRequest {
  submittedAnswer: string;
  expectedAnswer: string;
  /** Whether to check for mathematically equivalent forms (default: true) */
  allowEquivalent?: boolean;
  /** Numeric tolerance for comparison (default: 0.0001) */
  tolerance?: number;
}

/** Result of answer validation */
export interface AnswerValidationResult {
  isCorrect: boolean;
  feedback?: string;
  /** Partial credit (0-1) if applicable */
  partialCredit?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// Sessions
// ══════════════════════════════════════════════════════════════════════════════

/** Scratch pad session status */
export type ScratchPadSessionStatus = 'active' | 'completed' | 'submitted';

/** A scratch pad session */
export interface ScratchPadSession {
  id: string;
  learnerId: string;
  activityId?: string;
  questionId?: string;
  snapshots: CanvasSnapshot[];
  recognitions: RecognitionSnapshot[];
  startedAt: string;
  completedAt?: string;
  status: ScratchPadSessionStatus;
}

/** A canvas snapshot saved during a session */
export interface CanvasSnapshot extends CanvasState {
  savedAt: string;
  isFinal?: boolean;
}

/** A recognition snapshot saved during a session */
export interface RecognitionSnapshot {
  recognizedText: string;
  confidence: number;
  recognizedAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// Session Management
// ══════════════════════════════════════════════════════════════════════════════

/** Request to start a session */
export interface StartSessionRequest {
  learnerId: string;
  activityId?: string;
  questionId?: string;
}

/** Request to save a snapshot */
export interface SaveSnapshotRequest {
  snapshot: CanvasState;
  recognition?: {
    recognizedText: string;
    confidence: number;
  };
}

/** Request to submit an answer */
export interface SubmitAnswerRequest {
  answer: string;
  questionId?: string;
  workShown: CanvasState;
}

/** Result of answer submission */
export interface AnswerSubmissionResult {
  isCorrect: boolean;
  feedback?: string;
  partialCredit?: number;
  correctAnswer?: string;
  workAnalysis?: {
    strokeCount: number;
    showedWork: boolean;
    [key: string]: unknown;
  };
}
