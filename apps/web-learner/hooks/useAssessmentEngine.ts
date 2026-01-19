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

// Stub questions for different subjects (fallback if API fails)
const STUB_QUESTIONS: Record<string, AssessmentQuestion[]> = {
  math: [
    {
      id: 'math-1',
      type: 'multiple-choice',
      subject: 'math',
      skillCode: 'MATH_NUMBER_SENSE',
      difficulty: 2,
      content: {
        question: 'What is 7 + 5?',
        options: ['10', '11', '12', '13'],
        correctAnswer: 2,
        explanation: '7 + 5 = 12',
      },
    },
    {
      id: 'math-2',
      type: 'multiple-choice',
      subject: 'math',
      skillCode: 'MATH_OPERATIONS',
      difficulty: 2,
      content: {
        question: 'What is 15 - 8?',
        options: ['5', '6', '7', '8'],
        correctAnswer: 2,
        explanation: '15 - 8 = 7',
      },
    },
    {
      id: 'math-3',
      type: 'multiple-choice',
      subject: 'math',
      skillCode: 'MATH_FRACTIONS',
      difficulty: 3,
      content: {
        question: 'What is half of 10?',
        options: ['3', '4', '5', '6'],
        correctAnswer: 2,
        explanation: 'Half of 10 is 10 / 2 = 5',
      },
    },
  ],
  reading: [
    {
      id: 'reading-1',
      type: 'multiple-choice',
      subject: 'reading',
      skillCode: 'ELA_VOCABULARY',
      difficulty: 2,
      content: {
        question: 'What does "happy" mean?',
        options: ['Sad', 'Joyful', 'Angry', 'Tired'],
        correctAnswer: 1,
        explanation: '"Happy" means feeling joy or pleasure',
      },
    },
    {
      id: 'reading-2',
      type: 'multiple-choice',
      subject: 'reading',
      skillCode: 'ELA_COMPREHENSION',
      difficulty: 2,
      content: {
        question: 'Which word rhymes with "cat"?',
        options: ['Dog', 'Hat', 'Bird', 'Fish'],
        correctAnswer: 1,
        explanation: '"Cat" and "Hat" both end with "-at"',
      },
    },
  ],
  science: [
    {
      id: 'science-1',
      type: 'multiple-choice',
      subject: 'science',
      skillCode: 'SCI_LIFE',
      difficulty: 2,
      content: {
        question: 'What do plants need to grow?',
        options: ['Only water', 'Sunlight, water, and air', 'Only sunlight', 'Only soil'],
        correctAnswer: 1,
        explanation: 'Plants need sunlight, water, and air (carbon dioxide) to grow through photosynthesis',
      },
    },
  ],
  writing: [
    {
      id: 'writing-1',
      type: 'multiple-choice',
      subject: 'writing',
      skillCode: 'WRITING_GRAMMAR',
      difficulty: 2,
      content: {
        question: 'Which punctuation ends a question?',
        options: ['.', '!', '?', ','],
        correctAnswer: 2,
        explanation: 'Questions end with a question mark (?)',
      },
    },
  ],
};

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
        // Try to fetch questions from API
        const response = await fetch('/api/assessment/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        });

        if (response.ok) {
          const session = await response.json();
          setAssessmentState((prev) => ({
            ...prev,
            session,
            currentQuestion: session.questions[0] || null,
            isLoading: false,
          }));
          return session;
        }

        // Fallback to stub questions
        const questions = options.subjects.flatMap(
          (subject) => STUB_QUESTIONS[subject] || []
        );

        const session: AssessmentSession = {
          id: `session-${Date.now()}`,
          type: options.type,
          learnerId: options.learnerId || 'anonymous',
          subjects: options.subjects,
          startedAt: new Date().toISOString(),
          estimated_questions: questions.length,
          currentQuestionIndex: 0,
          questions,
          answers: [],
          status: 'in_progress',
        };

        setAssessmentState((prev) => ({
          ...prev,
          session,
          currentQuestion: questions[0] || null,
          isLoading: false,
        }));

        return session;
      } catch (error) {
        console.error('Error starting assessment:', error);

        // Use stub questions as fallback
        const questions = options.subjects.flatMap(
          (subject) => STUB_QUESTIONS[subject] || []
        );

        const session: AssessmentSession = {
          id: `session-${Date.now()}`,
          type: options.type,
          learnerId: options.learnerId || 'anonymous',
          subjects: options.subjects,
          startedAt: new Date().toISOString(),
          estimated_questions: questions.length,
          currentQuestionIndex: 0,
          questions,
          answers: [],
          status: 'in_progress',
        };

        setAssessmentState((prev) => ({
          ...prev,
          session,
          currentQuestion: questions[0] || null,
          isLoading: false,
        }));

        return session;
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

      // Try to submit to API
      try {
        await fetch('/api/assessment/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            questionId,
            answer,
            latencyMs: answerRecord.latencyMs,
          }),
        });
      } catch (error) {
        console.error('Error submitting answer:', error);
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

      setAssessmentState((prev) => ({ ...prev, isLoading: true }));

      try {
        // Try to get results from API
        const response = await fetch('/api/assessment/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (response.ok) {
          const result = await response.json();
          setAssessmentState((prev) => ({
            ...prev,
            session: prev.session
              ? { ...prev.session, status: 'completed' }
              : null,
            result,
            isLoading: false,
          }));
          return result;
        }
      } catch (error) {
        console.error('Error completing assessment:', error);
      }

      // Calculate results locally as fallback
      const subjectScores: Record<string, SubjectScore> = {};

      session.subjects.forEach((subject) => {
        const subjectQuestions = session.questions.filter(
          (q) => q.subject === subject
        );
        const subjectAnswers = session.answers.filter((a) =>
          subjectQuestions.some((q) => q.id === a.questionId)
        );

        const correctAnswers = subjectAnswers.filter((a) => a.isCorrect).length;
        const score =
          subjectAnswers.length > 0
            ? (correctAnswers / subjectAnswers.length) * 100
            : 0;

        subjectScores[subject] = {
          subject,
          score,
          questionsAnswered: subjectAnswers.length,
          correctAnswers,
          averageLatency:
            subjectAnswers.reduce((sum, a) => sum + a.latencyMs, 0) /
            subjectAnswers.length || 0,
          proficiencyLevel:
            score >= 90
              ? 'advanced'
              : score >= 70
                ? 'proficient'
                : score >= 50
                  ? 'developing'
                  : 'emerging',
        };
      });

      const overallScore =
        Object.values(subjectScores).reduce((sum, s) => sum + s.score, 0) /
        Object.keys(subjectScores).length || 0;

      const result: AssessmentResult = {
        sessionId,
        overall_score: Math.round(overallScore),
        subject_scores: subjectScores,
        insights: {
          strengths: Object.values(subjectScores)
            .filter((s) => s.score >= 70)
            .map((s) => ({
              skill: s.subject,
              subject: s.subject,
              level: s.score,
              description: `Strong performance in ${s.subject}`,
            })),
          growth_areas: Object.values(subjectScores)
            .filter((s) => s.score < 70)
            .map((s) => ({
              skill: s.subject,
              subject: s.subject,
              level: s.score,
              description: `Room for growth in ${s.subject}`,
            })),
          recommended_path: Object.values(subjectScores)
            .sort((a, b) => a.score - b.score)
            .slice(0, 3)
            .map((s) => ({
              subject: s.subject,
              skill: s.subject,
              priority:
                s.score < 50 ? 'high' : s.score < 70 ? 'medium' : 'low',
              reason: `Focus on improving ${s.subject} skills`,
            })),
          learning_style: 'visual',
          estimated_grade_level: 'Grade 3-4',
        },
        completedAt: new Date().toISOString(),
      };

      setAssessmentState((prev) => ({
        ...prev,
        session: prev.session ? { ...prev.session, status: 'completed' } : null,
        result,
        isLoading: false,
      }));

      return result;
    },
    [assessmentState]
  );

  const pauseAssessment = useCallback(async (sessionId: string) => {
    setAssessmentState((prev) => ({
      ...prev,
      session: prev.session ? { ...prev.session, status: 'paused' } : null,
    }));

    try {
      await fetch('/api/assessment/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch (error) {
      console.error('Error pausing assessment:', error);
    }
  }, []);

  const resumeAssessment = useCallback(async (sessionId: string) => {
    setAssessmentState((prev) => ({
      ...prev,
      session: prev.session ? { ...prev.session, status: 'in_progress' } : null,
    }));
  }, []);

  return {
    startAssessment,
    getNextQuestion,
    submitAnswer,
    completeAssessment,
    pauseAssessment,
    resumeAssessment,
    assessmentState,
  };
}
