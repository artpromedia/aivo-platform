'use client';

/**
 * Assessment Taker
 * 
 * Student-facing component for taking assessments.
 * Features:
 * - Timed assessments with countdown
 * - Progress tracking
 * - Question navigation
 * - Auto-save responses
 * - Security monitoring (tab switching, copy/paste)
 * - Accessibility support
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  AlertTriangle,
  Send,
  Pause,
  Play,
  Loader2,
  Eye,
  EyeOff,
  HelpCircle,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { QuestionRenderer } from './QuestionRenderers';
import type { Assessment, Question, AssessmentSettings as SettingsType } from './types';

// ============================================================================
// TYPES
// ============================================================================

interface AttemptData {
  id: string;
  assessmentId: string;
  studentId: string;
  startedAt: Date;
  expiresAt?: Date;
  responses: Record<string, unknown>;
  flaggedQuestions: string[];
  visitedQuestions: string[];
  currentQuestionIndex: number;
  violationCount: number;
}

interface AssessmentTakerProps {
  assessment: Assessment;
  attempt: AttemptData;
  accommodations?: {
    extraTime?: number; // Extra minutes
    breaks?: boolean;
    readAloud?: boolean;
  };
  onSaveResponse: (questionId: string, response: unknown) => Promise<void>;
  onSubmit: () => Promise<void>;
  onSecurityViolation?: (type: string, details: string) => Promise<void>;
  onRequestBreak?: () => Promise<void>;
  isSubmitting?: boolean;
}

// ============================================================================
// TIMER HOOK
// ============================================================================

function useTimer(expiresAt?: Date, onExpire?: () => void) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setTimeRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining === 0 && !isExpired) {
        setIsExpired(true);
        onExpire?.();
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isExpired, onExpire]);

  return { timeRemaining, isExpired };
}

// ============================================================================
// AUTO-SAVE HOOK
// ============================================================================

function useAutoSave(
  responses: Record<string, unknown>,
  onSave: (questionId: string, response: unknown) => Promise<void>,
  debounceMs = 1000
) {
  const pendingRef = useRef<Map<string, unknown>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const queueSave = useCallback((questionId: string, response: unknown) => {
    pendingRef.current.set(questionId, response);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(async () => {
      const pending = new Map(pendingRef.current);
      pendingRef.current.clear();
      
      for (const [qId, resp] of pending) {
        try {
          await onSave(qId, resp);
        } catch (error) {
          console.error('Auto-save failed:', error);
          // Re-queue on failure
          pendingRef.current.set(qId, resp);
        }
      }
    }, debounceMs);
  }, [onSave, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { queueSave };
}

// ============================================================================
// SECURITY MONITORING HOOK
// ============================================================================

function useSecurityMonitoring(
  settings: SettingsType,
  onViolation?: (type: string, details: string) => Promise<void>
) {
  const [violations, setViolations] = useState<Array<{ type: string; time: Date }>>([]);

  useEffect(() => {
    if (!settings.detectTabSwitch) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const violation = { type: 'TAB_SWITCH', time: new Date() };
        setViolations(prev => [...prev, violation]);
        onViolation?.('TAB_SWITCH', 'User switched tabs or minimized window');
      }
    };

    const handleBlur = () => {
      const violation = { type: 'WINDOW_BLUR', time: new Date() };
      setViolations(prev => [...prev, violation]);
      onViolation?.('WINDOW_BLUR', 'Window lost focus');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    if (settings.detectTabSwitch) {
      window.addEventListener('blur', handleBlur);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [settings.detectTabSwitch, onViolation]);

  useEffect(() => {
    if (!settings.preventCopyPaste) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      const violation = { type: 'COPY_ATTEMPT', time: new Date() };
      setViolations(prev => [...prev, violation]);
      onViolation?.('COPY_ATTEMPT', 'User attempted to copy text');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      const violation = { type: 'PASTE_ATTEMPT', time: new Date() };
      setViolations(prev => [...prev, violation]);
      onViolation?.('PASTE_ATTEMPT', 'User attempted to paste text');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [settings.preventCopyPaste, onViolation]);

  return { violations };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AssessmentTaker({
  assessment,
  attempt,
  accommodations,
  onSaveResponse,
  onSubmit,
  onSecurityViolation,
  onRequestBreak,
  isSubmitting,
}: AssessmentTakerProps) {
  // State
  const [currentIndex, setCurrentIndex] = useState(attempt.currentQuestionIndex);
  const [responses, setResponses] = useState<Record<string, unknown>>(attempt.responses);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(
    new Set(attempt.flaggedQuestions)
  );
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(
    new Set(attempt.visitedQuestions)
  );
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  
  const { settings, questions } = assessment;
  const currentQuestion = questions[currentIndex];

  // Mark current question as visited
  useEffect(() => {
    if (currentQuestion && !visitedQuestions.has(currentQuestion.id)) {
      setVisitedQuestions(prev => new Set([...prev, currentQuestion.id]));
    }
  }, [currentQuestion, visitedQuestions]);

  // Timer
  const handleTimeExpire = useCallback(() => {
    onSubmit();
  }, [onSubmit]);

  const { timeRemaining, isExpired } = useTimer(attempt.expiresAt, handleTimeExpire);

  // Show warning when 5 minutes remaining
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining <= 300 && timeRemaining > 290) {
      setShowTimeWarning(true);
    }
  }, [timeRemaining]);

  // Auto-save
  const { queueSave } = useAutoSave(responses, onSaveResponse);

  // Security monitoring
  const { violations } = useSecurityMonitoring(settings, onSecurityViolation);

  // Show security warning when violations occur
  useEffect(() => {
    if (violations.length > 0 && violations.length <= settings.maxViolations) {
      setShowSecurityWarning(true);
    }
  }, [violations.length, settings.maxViolations]);

  // Calculate progress
  const answeredCount = useMemo(() => {
    return questions.filter(q => {
      const response = responses[q.id];
      if (response === undefined || response === null) return false;
      if (typeof response === 'string' && response.trim() === '') return false;
      if (Array.isArray(response) && response.length === 0) return false;
      if (typeof response === 'object' && Object.keys(response as object).length === 0) return false;
      return true;
    }).length;
  }, [questions, responses]);

  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  // Handlers
  const handleResponseChange = useCallback((response: unknown) => {
    if (!currentQuestion) return;
    
    setResponses(prev => ({ ...prev, [currentQuestion.id]: response }));
    queueSave(currentQuestion.id, response);
  }, [currentQuestion, queueSave]);

  const handleNavigate = useCallback((index: number) => {
    if (index < 0 || index >= questions.length) return;
    
    // Check if back navigation is allowed
    if (!settings.allowBackNavigation && index < currentIndex) {
      return;
    }
    
    setCurrentIndex(index);
  }, [questions.length, settings.allowBackNavigation, currentIndex]);

  const handleToggleFlag = useCallback(() => {
    if (!currentQuestion) return;
    
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion.id)) {
        newSet.delete(currentQuestion.id);
      } else {
        newSet.add(currentQuestion.id);
      }
      return newSet;
    });
  }, [currentQuestion]);

  const handleSubmit = useCallback(async () => {
    setShowSubmitDialog(false);
    await onSubmit();
  }, [onSubmit]);

  // Check for unanswered questions before submit
  const unansweredQuestions = useMemo(() => {
    return questions.filter(q => {
      const response = responses[q.id];
      if (response === undefined || response === null) return true;
      if (typeof response === 'string' && response.trim() === '') return true;
      if (Array.isArray(response) && response.length === 0) return true;
      return false;
    });
  }, [questions, responses]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining !== null && timeRemaining <= 300;

  return (
    <div className="flex h-screen flex-col bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{assessment.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{questions.length} questions</span>
              <span>•</span>
              <span>{assessment.totalPoints} points</span>
              {accommodations?.extraTime && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">
                    +{accommodations.extraTime}min extended time
                  </Badge>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            {timeRemaining !== null && (
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg',
                isLowTime ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' : 'bg-muted'
              )}>
                <Clock className={cn('h-5 w-5', isLowTime && 'animate-pulse')} />
                {formatTime(timeRemaining)}
              </div>
            )}

            {/* Break button (with accommodations) */}
            {accommodations?.breaks && onRequestBreak && (
              <Button variant="outline" size="sm" onClick={onRequestBreak}>
                <Pause className="mr-2 h-4 w-4" />
                Request Break
              </Button>
            )}

            {/* Submit button */}
            <Button onClick={() => setShowSubmitDialog(true)} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-4">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground min-w-[80px]">
            {answeredCount}/{questions.length} answered
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Navigator (sidebar) */}
        {!settings.showOneQuestionAtATime && (
          <aside className="w-16 border-r bg-background p-2 overflow-y-auto">
            <div className="flex flex-col gap-1">
              {questions.map((question, idx) => {
                const isAnswered = !!responses[question.id];
                const isFlagged = flaggedQuestions.has(question.id);
                const isCurrent = idx === currentIndex;
                const isVisited = visitedQuestions.has(question.id);
                
                return (
                  <TooltipProvider key={question.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleNavigate(idx)}
                          disabled={!settings.allowBackNavigation && idx < currentIndex}
                          className={cn(
                            'relative w-12 h-12 rounded-lg flex items-center justify-center text-sm font-medium transition-colors',
                            isCurrent && 'ring-2 ring-primary',
                            isAnswered && !isCurrent && 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
                            !isAnswered && isVisited && !isCurrent && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
                            !isAnswered && !isVisited && 'bg-muted',
                            isCurrent && 'bg-primary text-primary-foreground',
                            !settings.allowBackNavigation && idx < currentIndex && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {idx + 1}
                          {isFlagged && (
                            <Flag className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Question {idx + 1}</p>
                        <p className="text-xs text-muted-foreground">
                          {isAnswered ? 'Answered' : isVisited ? 'Skipped' : 'Not visited'}
                          {isFlagged && ' • Flagged'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </aside>
        )}

        {/* Question content */}
        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-3xl mx-auto p-6">
              {/* Instructions (first question only) */}
              {currentIndex === 0 && assessment.instructions && (
                <Card className="mb-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{assessment.instructions}</p>
                  </CardContent>
                </Card>
              )}

              {/* Current question */}
              {currentQuestion && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardDescription>
                        Question {currentIndex + 1} of {questions.length}
                      </CardDescription>
                      <div className="flex items-center gap-2">
                        {settings.showPointValues && (
                          <Badge variant="outline">
                            {currentQuestion.points} pts
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleToggleFlag}
                          className={cn(
                            flaggedQuestions.has(currentQuestion.id) && 'text-yellow-500'
                          )}
                        >
                          {flaggedQuestions.has(currentQuestion.id) ? (
                            <BookmarkCheck className="h-5 w-5" />
                          ) : (
                            <Bookmark className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <QuestionRenderer
                      question={currentQuestion}
                      response={responses[currentQuestion.id]}
                      onResponseChange={handleResponseChange}
                      showPoints={false}
                      disabled={isSubmitting || isExpired}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => handleNavigate(currentIndex - 1)}
                      disabled={currentIndex === 0 || !settings.allowBackNavigation}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>

                    {currentIndex === questions.length - 1 ? (
                      <Button onClick={() => setShowSubmitDialog(true)}>
                        Review & Submit
                        <Send className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button onClick={() => handleNavigate(currentIndex + 1)}>
                        Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              {unansweredQuestions.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span>
                      You have {unansweredQuestions.length} unanswered question
                      {unansweredQuestions.length !== 1 ? 's' : ''}.
                    </span>
                  </div>
                  <p>
                    Unanswered questions will receive 0 points. Are you sure you want to submit?
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>All questions have been answered!</span>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Working</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Submit Assessment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Time Warning Dialog */}
      <Dialog open={showTimeWarning} onOpenChange={setShowTimeWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <Clock className="h-5 w-5" />
              5 Minutes Remaining
            </DialogTitle>
            <DialogDescription>
              You have 5 minutes left to complete this assessment. Your work is being saved automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowTimeWarning(false)}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Warning Dialog */}
      <Dialog open={showSecurityWarning} onOpenChange={setShowSecurityWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Security Warning
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-3">
                <p>
                  We detected that you left the assessment window. This has been recorded.
                </p>
                <p className="font-medium">
                  Violations: {violations.length} / {settings.maxViolations}
                </p>
                {violations.length >= settings.maxViolations - 1 && (
                  <p className="text-red-600">
                    One more violation will automatically submit your assessment.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowSecurityWarning(false)}>
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AssessmentTaker;
