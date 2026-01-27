'use client';

import { useState, useCallback } from 'react';

export type AssessmentType = 'baseline' | 'practice' | 'diagnostic' | 'quiz';
export type QuestionType = 'multiple-choice' | 'open-ended' | 'interactive';

export interface AssessmentQuestion {
  id: string;
  type: QuestionType;
  subject: string;
  skillCode: string;
  difficulty: number;
  content: {
    question: string;
    options?: string[];
    correctAnswer?: number | string;
    hint?: string;
    explanation?: string;
  };
  timeLimit?: number;
  metadata?: Record<string, unknown>;
}

export interface AssessmentSession {
  id: string;
  type: AssessmentType;
  learnerId: string;
  subjects: string[];
  startedAt: string;
  estimated_questions: number;
  currentQuestionIndex: number;
  questions: AssessmentQuestion[];
  answers: AssessmentAnswer[];
  status: 'in_progress' | 'completed' | 'paused';
}

export interface AssessmentAnswer {
  questionId: string;
  answer: number | string | null;
  isCorrect: boolean;
  latencyMs: number;
  answeredAt: string;
}

export interface AssessmentResult {
  sessionId: string;
  overall_score: number;
  subject_scores: Record<string, SubjectScore>;
  insights: AssessmentInsights;
  completedAt: string;
}

export interface SubjectScore {
  subject: string;
  score: number;
  questionsAnswered: number;
  correctAnswers: number;
  averageLatency: number;
  proficiencyLevel: 'emerging' | 'developing' | 'proficient' | 'advanced';
}

export interface AssessmentInsights {
  strengths: SkillInsight[];
  growth_areas: SkillInsight[];
  recommended_path: RecommendedPathItem[];
  learning_style: string;
  estimated_grade_level: string;
}

export interface SkillInsight {
  skill: string;
  subject: string;
  level: number;
  description: string;
}

export interface RecommendedPathItem {
  subject: string;
  skill: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface StartAssessmentOptions {
  type: AssessmentType;
  learnerId: string | null;
  subjects: string[];
}

export interface AssessmentState {
  session: AssessmentSession | null;
  currentQuestion: AssessmentQuestion | null;
  isLoading: boolean;
  error: string | null;
  result: AssessmentResult | null;
}

/**
 * Helper to track assessment service errors for monitoring
 */
function trackAssessmentError(
  reason: string,
  details: Record<string, unknown>
): void {
  // Log error for monitoring
  console.error('[Assessment] Service error:', { reason, ...details });

  // Report to analytics if available
  if (typeof window !== 'undefined' && (window as Record<string, unknown>).analytics) {
    try {
      (
        (window as Record<string, unknown>).analytics as {
          track: (event: string, data: Record<string, unknown>) => void;
        }
      ).track('assessment_service_error', {
        reason,
        ...details,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Analytics not available
    }
  }
}

export function useAssessmentEngine() {
  const [assessmentState, setAssessmentState] = useState<AssessmentState>({
    session: null,
    currentQuestion: null,
    isLoading: false,
    error: null,
    result: null,
  });

  const startAssessment = useCallback(
    async (options: StartAssessmentOptions): Promise<AssessmentSession> => {
      setAssessmentState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch('/api/assessment/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        });

        if (!response.ok) {
          const errorMessage = `Assessment service returned status ${response.status}`;
          trackAssessmentError('api_response_not_ok', {
            status: response.status,
            subjects: options.subjects,
            type: options.type,
          });

          setAssessmentState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Unable to start assessment. Please try again later.',
          }));

          throw new Error(errorMessage);
        }

        const session = await response.json();
        setAssessmentState((prev) => ({
          ...prev,
          session,
          currentQuestion: session.questions[0] || null,
          isLoading: false,
          error: null,
        }));
        return session;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        trackAssessmentError('api_error', {
          error: errorMessage,
          subjects: options.subjects,
          type: options.type,
        });

        setAssessmentState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Unable to connect to assessment service. Please check your connection and try again.',
        }));

        throw error;
      }
    },
    []
  );

  const getNextQuestion = useCallback(
    async (sessionId: string): Promise<AssessmentQuestion | null> => {
      const { session } = assessmentState;
      if (!session || session.id !== sessionId) return null;

      const nextIndex = session.currentQuestionIndex + 1;
      if (nextIndex >= session.questions.length) {
        return null;
      }

      const nextQuestion = session.questions[nextIndex];

      setAssessmentState((prev) => ({
        ...prev,
        session: prev.session
          ? { ...prev.session, currentQuestionIndex: nextIndex }
          : null,
        currentQuestion: nextQuestion,
      }));

      return nextQuestion;
    },
    [assessmentState]
  );

  const submitAnswer = useCallback(
    async (
      sessionId: string,
      questionId: string,
      answer: number | string | null
    ): Promise<{ correct: boolean; explanation?: string }> => {
      const { session } = assessmentState;
      if (!session || session.id !== sessionId) {
        return { correct: false };
      }

      const question = session.questions.find((q) => q.id === questionId);
      if (!question) {
        return { correct: false };
      }

      const isCorrect = question.content.correctAnswer === answer;
      const answerRecord: AssessmentAnswer = {
        questionId,
        answer,
        isCorrect,
        latencyMs: Date.now() - new Date(session.startedAt).getTime(),
        answeredAt: new Date().toISOString(),
      };

      setAssessmentState((prev) => ({
        ...prev,
        session: prev.session
          ? {
              ...prev.session,
              answers: [...prev.session.answers, answerRecord],
            }
          : null,
      }));

      // Submit to API
      try {
        const response = await fetch('/api/assessment/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            questionId,
            answer,
            latencyMs: answerRecord.latencyMs,
          }),
        });

        if (!response.ok) {
          trackAssessmentError('answer_submit_failed', {
            status: response.status,
            sessionId,
            questionId,
          });
        }
      } catch (error) {
        trackAssessmentError('answer_submit_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          sessionId,
          questionId,
        });
      }

      return {
        correct: isCorrect,
        explanation: question.content.explanation,
      };
    },
    [assessmentState]
  );

  const completeAssessment = useCallback(
    async (sessionId: string): Promise<AssessmentResult> => {
      const { session } = assessmentState;
      if (!session || session.id !== sessionId) {
        throw new Error('Invalid session');
      }

      setAssessmentState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch('/api/assessment/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          const errorMessage = `Assessment completion returned status ${response.status}`;
          trackAssessmentError('complete_api_not_ok', {
            status: response.status,
            sessionId,
          });

          setAssessmentState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Unable to complete assessment. Please try again.',
          }));

          throw new Error(errorMessage);
        }

        const result = await response.json();
        setAssessmentState((prev) => ({
          ...prev,
          session: prev.session
            ? { ...prev.session, status: 'completed' }
            : null,
          result,
          isLoading: false,
          error: null,
        }));
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        trackAssessmentError('complete_api_error', {
          error: errorMessage,
          sessionId,
        });

        setAssessmentState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Unable to complete assessment. Please check your connection and try again.',
        }));

        throw error;
      }
    },
    [assessmentState]
  );

  const pauseAssessment = useCallback(async (sessionId: string) => {
    setAssessmentState((prev) => ({
      ...prev,
      session: prev.session ? { ...prev.session, status: 'paused' } : null,
    }));

    try {
      const response = await fetch('/api/assessment/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        trackAssessmentError('pause_api_not_ok', {
          status: response.status,
          sessionId,
        });
      }
    } catch (error) {
      trackAssessmentError('pause_api_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
      });
    }
  }, []);

  const resumeAssessment = useCallback(async (sessionId: string) => {
    setAssessmentState((prev) => ({
      ...prev,
      session: prev.session ? { ...prev.session, status: 'in_progress' } : null,
    }));
  }, []);

  const clearError = useCallback(() => {
    setAssessmentState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    startAssessment,
    getNextQuestion,
    submitAnswer,
    completeAssessment,
    pauseAssessment,
    resumeAssessment,
    clearError,
    assessmentState,
  };
}
