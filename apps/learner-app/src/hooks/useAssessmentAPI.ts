import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface AssessmentConfig {
  type: 'baseline' | 'progress' | 'subject';
  learnerId: string;
  subjectId?: string;
}

interface AssessmentSession {
  id: string;
  learner_id: string;
  type: 'baseline' | 'progress' | 'subject';
  subject_id: string | null;
  started_at: string;
  completed_at: string | null;
  results: Record<string, unknown> | null;
}

interface AnswerResponse {
  questionId: string;
  isCorrect: boolean;
  feedback?: string;
  nextQuestion?: {
    id: string;
    difficulty: number;
  };
  adaptedDifficulty: number;
}

interface AssessmentResult {
  sessionId: string;
  domainScores: Array<{
    domain: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
  }>;
  learningStyleAnswers?: Record<string, string | string[]>;
  recommendations?: string[];
  overallScore: number;
}

interface AssessmentAnalysis {
  sessionId: string;
  completedAt: string;
  results: AssessmentResult;
  learnerProfile: {
    strengths: string[];
    areasForImprovement: string[];
    recommendedPath: string;
    estimatedGradeLevel: string;
  };
}

export function useAssessmentAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startAssessment = useCallback(async (config: AssessmentConfig): Promise<AssessmentSession> => {
    setLoading(true);
    setError(null);

    try {
      // Call Python assessment service to initialize session
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Failed to start assessment: ${response.statusText}`);
      }

      const session = await response.json();

      // Store session in Supabase
      const { data, error: dbError } = await supabase
        .from('assessment_sessions')
        .insert({
          id: session.id,
          learner_id: config.learnerId,
          type: config.type,
          subject_id: config.subjectId || null,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data as AssessmentSession;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAnswer = useCallback(async (
    sessionId: string,
    questionId: string,
    answer: string | number | string[]
  ): Promise<AnswerResponse> => {
    setLoading(true);
    setError(null);

    try {
      // Submit to Python service for AI evaluation
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, questionId, answer }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit answer: ${response.statusText}`);
      }

      const result: AnswerResponse = await response.json();

      // Store response in Supabase
      await supabase
        .from('assessment_responses')
        .insert({
          session_id: sessionId,
          question_id: questionId,
          answer,
          is_correct: result.isCorrect,
        });

      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeAssessment = useCallback(async (
    sessionId: string,
    results: AssessmentResult
  ): Promise<AssessmentAnalysis> => {
    setLoading(true);
    setError(null);

    try {
      // Finalize assessment with Python service
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, results }),
      });

      if (!response.ok) {
        throw new Error(`Failed to complete assessment: ${response.statusText}`);
      }

      const analysis: AssessmentAnalysis = await response.json();

      // Update session in Supabase
      const { error: dbError } = await supabase
        .from('assessment_sessions')
        .update({
          completed_at: new Date().toISOString(),
          results: analysis.results as unknown as Record<string, unknown>,
        })
        .eq('id', sessionId);

      if (dbError) throw dbError;

      return analysis;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSession = useCallback(async (sessionId: string): Promise<AssessmentSession | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('assessment_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (dbError) throw dbError;
      return data as AssessmentSession;
    } catch (err) {
      const error = err as Error;
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getQuestions = useCallback(async (
    sessionId: string,
    domain?: string
  ): Promise<Array<{ id: string; questionText: string; options?: string[]; difficulty: number }>> => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/${sessionId}/questions`);
      if (domain) {
        url.searchParams.set('domain', domain);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to get questions: ${response.statusText}`);
      }

      return response.json();
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    startAssessment,
    submitAnswer,
    completeAssessment,
    getSession,
    getQuestions,
    loading,
    error,
  };
}

export type { AssessmentConfig, AssessmentSession, AnswerResponse, AssessmentResult, AssessmentAnalysis };
