'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type FormEvent,
} from 'react';

import { cn } from '../../utils/cn';
import { Button } from '../button';
import { Card } from '../card';
import { ScratchPadCanvas, type ScratchPadCanvasRef } from './ScratchPadCanvas';
import { ScratchPadModal, ScratchPadDrawer, ScratchPadFAB, useScratchPadPopup } from './ScratchPadPopup';
import { useScratchPad } from './useScratchPad';
import type { MathRecognitionResult, CanvasState } from '@aivo/ts-types';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface MathQuestion {
  id: string;
  prompt: string;
  expectedAnswer?: string;
  hints?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
}

export interface MathQuestionWithScratchPadProps {
  /** The math question */
  question: MathQuestion;
  /** Called when answer is submitted */
  onSubmit: (answer: string, isCorrect: boolean, workShown?: string) => void;
  /** Learner ID for session tracking */
  learnerId?: string;
  /** Activity ID for context */
  activityId?: string;
  /** Whether to auto-fill answer from recognition */
  autoFillAnswer?: boolean;
  /** Confidence threshold for auto-fill (0-1) */
  autoFillThreshold?: number;
  /** Show inline scratch pad vs popup */
  inlineScratchPad?: boolean;
  /** Additional class names */
  className?: string;
  /** API base URL */
  apiBaseUrl?: string;
  /** Children to render below the question (e.g., additional context) */
  children?: ReactNode;
}

export interface MathActivityWithScratchPadProps {
  /** The main activity content */
  children: ReactNode;
  /** Whether to show the FAB */
  showFAB?: boolean;
  /** FAB position */
  fabPosition?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  /** Popup mode */
  popupMode?: 'modal' | 'drawer';
  /** Called when recognition result is available */
  onRecognitionResult?: (result: MathRecognitionResult) => void;
  /** Called when user submits from scratch pad */
  onScratchPadSubmit?: (answer: string, imageData: string) => void;
  /** API base URL */
  apiBaseUrl?: string;
  /** Additional class names */
  className?: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// MATH QUESTION WITH SCRATCH PAD
// ════════════════════════════════════════════════════════════════════════════════

export function MathQuestionWithScratchPad({
  question,
  onSubmit,
  learnerId,
  activityId,
  autoFillAnswer = true,
  autoFillThreshold = 0.7,
  inlineScratchPad = false,
  className,
  apiBaseUrl = '/api/v1',
  children,
}: MathQuestionWithScratchPadProps) {
  // State
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [showScratchPad, setShowScratchPad] = useState(inlineScratchPad);
  const [hintsUsed, setHintsUsed] = useState(0);

  // Refs
  const canvasRef = useRef<ScratchPadCanvasRef>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const [scratchPadState, scratchPadActions] = useScratchPad({
    apiBaseUrl,
    learnerId,
    activityId,
    questionId: question.id,
  });

  const popup = useScratchPadPopup();

  // Start session on mount if learner ID provided
  useEffect(() => {
    if (learnerId) {
      void scratchPadActions.startSession();
    }
    return () => {
      void scratchPadActions.endSession();
    };
  }, [learnerId]);

  // Handle recognition result
  const handleRecognition = useCallback(
    (result: MathRecognitionResult) => {
      if (autoFillAnswer && result.confidence >= autoFillThreshold) {
        setAnswer(result.recognizedText);
        // Focus input so user can review/edit
        inputRef.current?.focus();
      }
    },
    [autoFillAnswer, autoFillThreshold]
  );

  // Handle answer submission
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!answer.trim()) return;

      setIsSubmitting(true);
      setFeedback(null);

      try {
        // Get work shown from canvas if available
        const workShown = canvasRef.current?.getImageData();

        // Validate answer if expected answer is provided
        if (question.expectedAnswer) {
          const validation = await scratchPadActions.validateAnswer(
            answer,
            question.expectedAnswer,
            true
          );

          if (validation) {
            setFeedback({
              isCorrect: validation.isCorrect,
              message: validation.feedback ?? (validation.isCorrect ? 'Correct!' : 'Not quite right. Try again!'),
            });
            onSubmit(answer, validation.isCorrect, workShown);
          } else {
            // Fallback to simple string comparison
            const isCorrect = answer.trim().toLowerCase() === question.expectedAnswer.trim().toLowerCase();
            setFeedback({
              isCorrect,
              message: isCorrect ? 'Correct!' : 'Not quite right. Try again!',
            });
            onSubmit(answer, isCorrect, workShown);
          }
        } else {
          // No expected answer, just submit
          onSubmit(answer, true, workShown);
        }
      } catch (error) {
        console.error('Submit error:', error);
        setFeedback({
          isCorrect: false,
          message: 'Something went wrong. Please try again.',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [answer, question.expectedAnswer, scratchPadActions, onSubmit]
  );

  // Show hint
  const showNextHint = useCallback(() => {
    if (question.hints && hintsUsed < question.hints.length) {
      setHintsUsed((prev) => prev + 1);
    }
  }, [question.hints, hintsUsed]);

  // Handle scratch pad submit (from popup)
  const handleScratchPadSubmit = useCallback(
    (recognizedAnswer: string) => {
      setAnswer(recognizedAnswer);
      popup.close();
      inputRef.current?.focus();
    },
    [popup]
  );

  return (
    <Card className={cn('p-4', className)}>
      {/* Question */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-lg font-medium">{question.prompt}</p>
            {question.topic && (
              <p className="mt-1 text-sm text-muted">Topic: {question.topic}</p>
            )}
          </div>
          {question.difficulty && (
            <DifficultyBadge difficulty={question.difficulty} />
          )}
        </div>

        {/* Additional content */}
        {children}
      </div>

      {/* Hints */}
      {question.hints && question.hints.length > 0 && (
        <div className="mb-4">
          {hintsUsed > 0 && (
            <div className="mb-2 space-y-1">
              {question.hints.slice(0, hintsUsed).map((hint, i) => (
                <div key={i} className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  <span className="font-medium">Hint {i + 1}:</span> {hint}
                </div>
              ))}
            </div>
          )}
          {hintsUsed < question.hints.length && (
            <Button variant="ghost" size="sm" onClick={showNextHint}>
              <HintIcon className="mr-1 h-4 w-4" />
              Show hint ({question.hints.length - hintsUsed} remaining)
            </Button>
          )}
        </div>
      )}

      {/* Inline Scratch Pad */}
      {inlineScratchPad && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted">Work it out:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowScratchPad(!showScratchPad)}
            >
              {showScratchPad ? 'Hide' : 'Show'} scratch pad
            </Button>
          </div>
          {showScratchPad && (
            <ScratchPadCanvas
              ref={canvasRef}
              width={Math.min(500, window.innerWidth - 80)}
              height={250}
              onRecognitionResult={handleRecognition}
              recognitionEndpoint={`${apiBaseUrl}/math-recognition/recognize`}
              showGrid
            />
          )}
        </div>
      )}

      {/* Answer Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter your answer..."
              disabled={isSubmitting}
              className={cn(
                'w-full rounded-lg border border-border bg-surface px-4 py-3 text-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50',
                feedback?.isCorrect === true && 'border-green-500 bg-green-50 dark:bg-green-900/20',
                feedback?.isCorrect === false && 'border-red-500 bg-red-50 dark:bg-red-900/20'
              )}
            />
            {scratchPadState.isRecognizing && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Spinner className="h-5 w-5 text-primary" />
              </div>
            )}
          </div>

          {/* Scratch Pad Button (when not inline) */}
          {!inlineScratchPad && (
            <Button
              type="button"
              variant="ghost"
              onClick={popup.open}
              title="Open scratch pad"
            >
              <PencilIcon className="h-5 w-5" />
            </Button>
          )}

          <Button type="submit" variant="primary" disabled={!answer.trim() || isSubmitting}>
            {isSubmitting ? <Spinner className="h-5 w-5" /> : 'Submit'}
          </Button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-3',
              feedback.isCorrect
                ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
            )}
          >
            {feedback.isCorrect ? (
              <CheckIcon className="h-5 w-5 flex-shrink-0" />
            ) : (
              <XIcon className="h-5 w-5 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </form>

      {/* Scratch Pad Modal (when not inline) */}
      {!inlineScratchPad && (
        <ScratchPadModal
          isOpen={popup.isOpen}
          onClose={popup.close}
          onSubmit={handleScratchPadSubmit}
          onRecognitionResult={handleRecognition}
          recognitionEndpoint={`${apiBaseUrl}/math-recognition/recognize`}
          title="Work out your answer"
          submitText="Use this answer"
          size="lg"
        />
      )}
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MATH ACTIVITY WITH SCRATCH PAD (Wrapper with FAB)
// ════════════════════════════════════════════════════════════════════════════════

export function MathActivityWithScratchPad({
  children,
  showFAB = true,
  fabPosition = 'bottom-right',
  popupMode = 'drawer',
  onRecognitionResult,
  onScratchPadSubmit,
  apiBaseUrl = '/api/v1',
  className,
}: MathActivityWithScratchPadProps) {
  const popup = useScratchPadPopup();

  const handleSubmit = useCallback(
    (answer: string, imageData: string) => {
      onScratchPadSubmit?.(answer, imageData);
      popup.close();
    },
    [onScratchPadSubmit, popup]
  );

  const PopupComponent = popupMode === 'modal' ? ScratchPadModal : ScratchPadDrawer;

  return (
    <div className={cn('relative', className)}>
      {children}

      {showFAB && (
        <ScratchPadFAB
          onClick={popup.open}
          position={fabPosition}
          label="Open scratch pad"
        />
      )}

      <PopupComponent
        isOpen={popup.isOpen}
        onClose={popup.close}
        onSubmit={handleSubmit}
        onRecognitionResult={onRecognitionResult}
        recognitionEndpoint={`${apiBaseUrl}/math-recognition/recognize`}
        title="Scratch Pad"
        showSubmit={!!onScratchPadSubmit}
        position={popupMode === 'drawer' ? 'bottom' : undefined}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ════════════════════════════════════════════════════════════════════════════════

function DifficultyBadge({ difficulty }: { difficulty: 'easy' | 'medium' | 'hard' }) {
  const colors = {
    easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <span className={cn('rounded-full px-2 py-1 text-xs font-medium', colors[difficulty])}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// ICONS
// ════════════════════════════════════════════════════════════════════════════════

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

function HintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
