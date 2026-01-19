'use client';

import { useState, useCallback } from 'react';
import { createClient } from '../lib/supabase';
import type {
  AssessmentConfig,
  AssessmentSession,
  AssessmentQuestion,
  AssessmentAnswer,
  AssessmentResult,
  StartAssessmentResponse,
  SubmitAnswerResponse,
  CompleteAssessmentResponse,
  AssessmentDomain,
} from '../systems/assessment/types';

// =============================================================================
// Hook State
// =============================================================================

interface UseAssessmentAPIState {
  session: AssessmentSession | null;
  loading: boolean;
  error: Error | null;
  currentQuestions: AssessmentQuestion[];
}

interface UseAssessmentAPIReturn extends UseAssessmentAPIState {
  startAssessment: (config: AssessmentConfig) => Promise<StartAssessmentResponse>;
  submitAnswer: (
    questionId: string,
    answer: number | string,
    latencyMs: number
  ) => Promise<SubmitAnswerResponse>;
  submitLearningStyleAnswer: (
    questionId: string,
    answer: string | string[]
  ) => Promise<void>;
  fetchDomainQuestions: (domain: AssessmentDomain, count?: number) => Promise<AssessmentQuestion[]>;
  completeAssessment: (
    learningStyleAnswers?: Record<string, string | string[]>,
    domainAnswers?: Record<string, AssessmentAnswer>
  ) => Promise<CompleteAssessmentResponse>;
  resetAssessment: () => void;
}

// =============================================================================
// Assessment API Hook
// =============================================================================

export function useAssessmentAPI(): UseAssessmentAPIReturn {
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<AssessmentQuestion[]>([]);

  const supabase = createClient();

  // ---------------------------------------------------------------------------
  // Start Assessment
  // ---------------------------------------------------------------------------

  const startAssessment = useCallback(
    async (config: AssessmentConfig): Promise<StartAssessmentResponse> => {
      setLoading(true);
      setError(null);

      try {
        // Call Python assessment service for session initialization
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(`${apiUrl}/api/assessment/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });

        let sessionData: Partial<AssessmentSession>;

        if (response.ok) {
          sessionData = await response.json();
        } else {
          // Fallback: Create session locally if API unavailable
          sessionData = {
            id: crypto.randomUUID(),
            learnerId: config.learnerId,
            type: config.type,
            startedAt: new Date().toISOString(),
            currentPhase: config.type === 'baseline' ? 'learning_style' : 'domain_intro',
            currentDomainIndex: 0,
            currentQuestionIndex: 0,
          };
        }

        // Store session in Supabase
        const { data, error: dbError } = await supabase
          .from('assessment_sessions')
          .insert({
            id: sessionData.id,
            learner_id: config.learnerId,
            type: config.type,
            subject_id: config.subjectId || null,
            started_at: sessionData.startedAt,
            metadata: {
              gradeBand: config.gradeBand,
              currentPhase: sessionData.currentPhase,
            },
          })
          .select()
          .single();

        if (dbError) {
          console.warn('Failed to store session in Supabase:', dbError);
          // Continue with local session if Supabase fails
        }

        const newSession: AssessmentSession = {
          id: sessionData.id || data?.id || crypto.randomUUID(),
          learnerId: config.learnerId,
          type: config.type,
          subjectId: config.subjectId,
          startedAt: sessionData.startedAt || new Date().toISOString(),
          currentPhase: sessionData.currentPhase || 'learning_style',
          currentDomainIndex: 0,
          currentQuestionIndex: 0,
        };

        setSession(newSession);

        return {
          session: newSession,
        };
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ---------------------------------------------------------------------------
  // Submit Answer
  // ---------------------------------------------------------------------------

  const submitAnswer = useCallback(
    async (
      questionId: string,
      answer: number | string,
      latencyMs: number
    ): Promise<SubmitAnswerResponse> => {
      if (!session) {
        throw new Error('No active assessment session');
      }

      setLoading(true);
      setError(null);

      try {
        // Call Python service for AI evaluation
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(`${apiUrl}/api/assessment/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            questionId,
            answer,
            latencyMs,
          }),
        });

        let result: SubmitAnswerResponse = {};

        if (response.ok) {
          result = await response.json();
        }

        // Store answer in Supabase
        const currentQuestion = currentQuestions.find((q) => q.id === questionId);
        await supabase.from('assessment_answers').insert({
          session_id: session.id,
          question_id: questionId,
          domain: currentQuestion?.domain,
          answer: { value: answer },
          latency_ms: latencyMs,
          is_correct: result.isCorrect,
          created_at: new Date().toISOString(),
        });

        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        // Don't throw - allow assessment to continue
        return {};
      } finally {
        setLoading(false);
      }
    },
    [session, currentQuestions, supabase]
  );

  // ---------------------------------------------------------------------------
  // Submit Learning Style Answer
  // ---------------------------------------------------------------------------

  const submitLearningStyleAnswer = useCallback(
    async (questionId: string, answer: string | string[]): Promise<void> => {
      if (!session) {
        throw new Error('No active assessment session');
      }

      try {
        // Store in Supabase
        await supabase.from('assessment_answers').insert({
          session_id: session.id,
          question_id: questionId,
          domain: null, // Learning style questions don't have a domain
          answer: { value: answer },
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Failed to store learning style answer:', err);
        // Continue without throwing - answers are also stored locally
      }
    },
    [session, supabase]
  );

  // ---------------------------------------------------------------------------
  // Fetch Domain Questions
  // ---------------------------------------------------------------------------

  const fetchDomainQuestions = useCallback(
    async (domain: AssessmentDomain, count: number = 5): Promise<AssessmentQuestion[]> => {
      setLoading(true);
      setError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(`${apiUrl}/api/baseline/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain, count }),
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentQuestions(data.questions);
          return data.questions;
        }

        // Fallback to stub questions if API unavailable
        const stubQuestions = generateStubQuestions(domain, count);
        setCurrentQuestions(stubQuestions);
        return stubQuestions;
      } catch (err) {
        console.warn('Failed to fetch questions from API, using stubs:', err);
        const stubQuestions = generateStubQuestions(domain, count);
        setCurrentQuestions(stubQuestions);
        return stubQuestions;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Complete Assessment
  // ---------------------------------------------------------------------------

  const completeAssessment = useCallback(
    async (
      learningStyleAnswers?: Record<string, string | string[]>,
      domainAnswers?: Record<string, AssessmentAnswer>
    ): Promise<CompleteAssessmentResponse> => {
      if (!session) {
        throw new Error('No active assessment session');
      }

      setLoading(true);
      setError(null);

      try {
        // Call Python service for final analysis
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(`${apiUrl}/api/assessment/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            learningStyleAnswers,
            domainAnswers,
          }),
        });

        let analysis: CompleteAssessmentResponse;

        if (response.ok) {
          analysis = await response.json();
        } else {
          // Generate basic results if API unavailable
          analysis = generateBasicResults(session, learningStyleAnswers, domainAnswers);
        }

        // Update session in Supabase
        await supabase
          .from('assessment_sessions')
          .update({
            completed_at: new Date().toISOString(),
            results: analysis.results,
          })
          .eq('id', session.id);

        // Update session state
        setSession({
          ...session,
          completedAt: new Date().toISOString(),
          results: analysis.results,
        });

        return analysis;
      } catch (err) {
        const error = err as Error;
        setError(error);
        // Return basic results even on error
        return generateBasicResults(session, learningStyleAnswers, domainAnswers);
      } finally {
        setLoading(false);
      }
    },
    [session, supabase]
  );

  // ---------------------------------------------------------------------------
  // Reset Assessment
  // ---------------------------------------------------------------------------

  const resetAssessment = useCallback(() => {
    setSession(null);
    setCurrentQuestions([]);
    setError(null);
    setLoading(false);
  }, []);

  return {
    session,
    loading,
    error,
    currentQuestions,
    startAssessment,
    submitAnswer,
    submitLearningStyleAnswer,
    fetchDomainQuestions,
    completeAssessment,
    resetAssessment,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateStubQuestions(domain: AssessmentDomain, count: number): AssessmentQuestion[] {
  const stubs: Record<AssessmentDomain, AssessmentQuestion[]> = {
    MATH: [
      { id: 'math-1', domain: 'MATH', skillCode: 'MATH_NUMBER_SENSE', questionType: 'MULTIPLE_CHOICE', questionText: 'What is 7 + 5?', options: ['10', '11', '12', '13'], difficulty: 2, questionNumber: 1 },
      { id: 'math-2', domain: 'MATH', skillCode: 'MATH_OPERATIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'What is 15 - 8?', options: ['5', '6', '7', '8'], difficulty: 2, questionNumber: 2 },
      { id: 'math-3', domain: 'MATH', skillCode: 'MATH_FRACTIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'What is half of 10?', options: ['3', '4', '5', '6'], difficulty: 2, questionNumber: 3 },
      { id: 'math-4', domain: 'MATH', skillCode: 'MATH_GEOMETRY', questionType: 'MULTIPLE_CHOICE', questionText: 'How many sides does a triangle have?', options: ['2', '3', '4', '5'], difficulty: 1, questionNumber: 4 },
      { id: 'math-5', domain: 'MATH', skillCode: 'MATH_PROBLEM_SOLVING', questionType: 'MULTIPLE_CHOICE', questionText: 'If you have 3 apples and get 4 more, how many do you have?', options: ['5', '6', '7', '8'], difficulty: 2, questionNumber: 5 },
    ],
    ELA: [
      { id: 'ela-1', domain: 'ELA', skillCode: 'ELA_PHONEMIC', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word rhymes with "cat"?', options: ['Dog', 'Hat', 'Bird', 'Fish'], difficulty: 1, questionNumber: 1 },
      { id: 'ela-2', domain: 'ELA', skillCode: 'ELA_VOCABULARY', questionType: 'MULTIPLE_CHOICE', questionText: 'What does "happy" mean?', options: ['Sad', 'Joyful', 'Angry', 'Tired'], difficulty: 1, questionNumber: 2 },
      { id: 'ela-3', domain: 'ELA', skillCode: 'ELA_FLUENCY', questionType: 'MULTIPLE_CHOICE', questionText: 'Which sentence is correct?', options: ['The dog run fast.', 'The dog runs fast.', 'The dog running fast.', 'The dog runned fast.'], difficulty: 2, questionNumber: 3 },
      { id: 'ela-4', domain: 'ELA', skillCode: 'ELA_COMPREHENSION', questionType: 'MULTIPLE_CHOICE', questionText: 'In "Three Little Pigs", what did the wolf try to do?', options: ['Build houses', 'Blow houses down', 'Give food', 'Teach dancing'], difficulty: 2, questionNumber: 4 },
      { id: 'ela-5', domain: 'ELA', skillCode: 'ELA_WRITING', questionType: 'MULTIPLE_CHOICE', questionText: 'Which punctuation ends a question?', options: ['.', '!', '?', ','], difficulty: 1, questionNumber: 5 },
    ],
    SPEECH: [
      { id: 'speech-1', domain: 'SPEECH', skillCode: 'SPEECH_ARTICULATION', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word starts with the same sound as "sun"?', options: ['Ball', 'Cat', 'Soap', 'Tree'], difficulty: 1, questionNumber: 1 },
      { id: 'speech-2', domain: 'SPEECH', skillCode: 'SPEECH_FLUENCY', questionType: 'MULTIPLE_CHOICE', questionText: 'When speaking to a group, you should...', options: ['Whisper', 'Speak clearly', 'Talk fast', 'Look at floor'], difficulty: 2, questionNumber: 2 },
      { id: 'speech-3', domain: 'SPEECH', skillCode: 'SPEECH_VOICE', questionType: 'MULTIPLE_CHOICE', questionText: 'How should you speak near someone sleeping?', options: ['Loudly', 'Normal', 'Quietly', 'Not at all'], difficulty: 1, questionNumber: 3 },
      { id: 'speech-4', domain: 'SPEECH', skillCode: 'SPEECH_LANGUAGE', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word means the same as "big"?', options: ['Small', 'Tiny', 'Large', 'Short'], difficulty: 1, questionNumber: 4 },
      { id: 'speech-5', domain: 'SPEECH', skillCode: 'SPEECH_PRAGMATICS', questionType: 'MULTIPLE_CHOICE', questionText: 'When meeting someone new, you should...', options: ['Look away', 'Say hello', 'Stay silent', 'Run away'], difficulty: 1, questionNumber: 5 },
    ],
    SEL: [
      { id: 'sel-1', domain: 'SEL', skillCode: 'SEL_SELF_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'When I feel angry, I...', options: ['Yell at others', 'Take deep breaths', 'Break things', 'Ignore it'], difficulty: 2, questionNumber: 1 },
      { id: 'sel-2', domain: 'SEL', skillCode: 'SEL_SELF_MANAGEMENT', questionType: 'MULTIPLE_CHOICE', questionText: 'If homework is hard, I should...', options: ['Give up', 'Ask for help', 'Throw it away', 'Cry'], difficulty: 2, questionNumber: 2 },
      { id: 'sel-3', domain: 'SEL', skillCode: 'SEL_SOCIAL_AWARENESS', questionType: 'MULTIPLE_CHOICE', questionText: 'If a friend looks sad, I could...', options: ['Laugh', 'Ask if okay', 'Walk away', 'Tell others'], difficulty: 1, questionNumber: 3 },
      { id: 'sel-4', domain: 'SEL', skillCode: 'SEL_RELATIONSHIPS', questionType: 'MULTIPLE_CHOICE', questionText: 'Good friends...', options: ['Share and take turns', 'Always fight', 'Ignore each other', 'Keep secrets'], difficulty: 1, questionNumber: 4 },
      { id: 'sel-5', domain: 'SEL', skillCode: 'SEL_DECISIONS', questionType: 'MULTIPLE_CHOICE', questionText: 'Before making a choice, I should...', options: ['Do it quickly', 'Think about results', 'Ask a stranger', 'Flip a coin'], difficulty: 2, questionNumber: 5 },
    ],
    SPELLING: [
      { id: 'spell-1', domain: 'SPELLING', skillCode: 'SPELL_PATTERNS', questionType: 'MULTIPLE_CHOICE', questionText: 'Which spelling is correct?', options: ['freind', 'friend', 'frend', 'frind'], difficulty: 2, questionNumber: 1 },
      { id: 'spell-2', domain: 'SPELLING', skillCode: 'SPELL_PHONICS', questionType: 'MULTIPLE_CHOICE', questionText: 'How do you spell the large body of water?', options: ['oshun', 'ocen', 'ocean', 'oshen'], difficulty: 2, questionNumber: 2 },
      { id: 'spell-3', domain: 'SPELLING', skillCode: 'SPELL_RULES', questionType: 'MULTIPLE_CHOICE', questionText: 'Which is the correct plural of "cat"?', options: ['cates', 'cats', 'caties', "cat's"], difficulty: 1, questionNumber: 3 },
      { id: 'spell-4', domain: 'SPELLING', skillCode: 'SPELL_SIGHT_WORDS', questionType: 'MULTIPLE_CHOICE', questionText: 'Which word is spelled correctly?', options: ['becuz', 'becuase', 'because', 'becouse'], difficulty: 2, questionNumber: 4 },
      { id: 'spell-5', domain: 'SPELLING', skillCode: 'SPELL_COMPOUND', questionType: 'MULTIPLE_CHOICE', questionText: 'How do you spell "sun" + "flower"?', options: ['sunflower', 'sun flower', 'sunflawer', 'son flower'], difficulty: 2, questionNumber: 5 },
    ],
    CREATIVE_WRITING: [
      { id: 'cw-1', domain: 'CREATIVE_WRITING', skillCode: 'CW_STORY_ELEMENTS', questionType: 'MULTIPLE_CHOICE', questionText: 'Every story needs a...', options: ['Beginning, middle, end', 'Picture', 'Long title', 'Rhyme'], difficulty: 1, questionNumber: 1 },
      { id: 'cw-2', domain: 'CREATIVE_WRITING', skillCode: 'CW_CHARACTER', questionType: 'MULTIPLE_CHOICE', questionText: 'A character in a story is...', options: ['The setting', 'A person or animal', 'The ending', 'The title'], difficulty: 1, questionNumber: 2 },
      { id: 'cw-3', domain: 'CREATIVE_WRITING', skillCode: 'CW_SETTING', questionType: 'MULTIPLE_CHOICE', questionText: 'The setting tells us...', options: ['Who is in story', 'Where and when', 'What happens last', 'The moral'], difficulty: 1, questionNumber: 3 },
      { id: 'cw-4', domain: 'CREATIVE_WRITING', skillCode: 'CW_DESCRIPTIVE', questionType: 'MULTIPLE_CHOICE', questionText: 'Which sentence is more descriptive?', options: ['The dog ran.', 'The fluffy brown dog ran quickly.', 'Dog.', 'Running.'], difficulty: 2, questionNumber: 4 },
      { id: 'cw-5', domain: 'CREATIVE_WRITING', skillCode: 'CW_IMAGINATION', questionType: 'MULTIPLE_CHOICE', questionText: 'In creative writing, you can...', options: ['Only write facts', 'Make up stories', 'Copy from books', 'Only use real people'], difficulty: 1, questionNumber: 5 },
    ],
    LIFE_SKILLS: [
      { id: 'life-1', domain: 'LIFE_SKILLS', skillCode: 'LIFE_TIME', questionType: 'MULTIPLE_CHOICE', questionText: 'What time do we usually eat lunch?', options: ['Midnight', 'Around noon', '6am', '10pm'], difficulty: 1, questionNumber: 1 },
      { id: 'life-2', domain: 'LIFE_SKILLS', skillCode: 'LIFE_MONEY', questionType: 'MULTIPLE_CHOICE', questionText: 'If something costs $3 and you have $5, how much change?', options: ['$1', '$2', '$3', '$8'], difficulty: 2, questionNumber: 2 },
      { id: 'life-3', domain: 'LIFE_SKILLS', skillCode: 'LIFE_SAFETY', questionType: 'MULTIPLE_CHOICE', questionText: 'Before crossing the street, you should...', options: ['Run quickly', 'Look both ways', 'Close eyes', 'Skip'], difficulty: 1, questionNumber: 3 },
      { id: 'life-4', domain: 'LIFE_SKILLS', skillCode: 'LIFE_HYGIENE', questionType: 'MULTIPLE_CHOICE', questionText: 'When should you wash your hands?', options: ['Never', 'Before eating', 'Only Mondays', 'Once a year'], difficulty: 1, questionNumber: 4 },
      { id: 'life-5', domain: 'LIFE_SKILLS', skillCode: 'LIFE_ORGANIZATION', questionType: 'MULTIPLE_CHOICE', questionText: 'Keeping things organized helps you...', options: ['Lose things', 'Find things easily', 'Make mess', 'Forget things'], difficulty: 1, questionNumber: 5 },
    ],
  };

  return (stubs[domain] || []).slice(0, count);
}

function generateBasicResults(
  session: AssessmentSession,
  learningStyleAnswers?: Record<string, string | string[]>,
  domainAnswers?: Record<string, AssessmentAnswer>
): CompleteAssessmentResponse {
  // Generate basic proficiency assessment based on answers
  const domainScores: import('../systems/assessment/types').DomainScore[] = [];
  const domains: AssessmentDomain[] = ['MATH', 'ELA', 'SPEECH', 'SEL', 'SPELLING', 'CREATIVE_WRITING', 'LIFE_SKILLS'];

  for (const domain of domains) {
    const domainAnswerEntries = domainAnswers
      ? Object.values(domainAnswers).filter((a) => a.domain === domain)
      : [];

    const correctCount = domainAnswerEntries.filter((a) => a.isCorrect).length;
    const totalCount = domainAnswerEntries.length || 5;
    const score = totalCount > 0 ? (correctCount / totalCount) * 100 : 50;

    domainScores.push({
      domain,
      questionsAnswered: totalCount,
      correctAnswers: correctCount,
      averageDifficulty: 2,
      averageLatencyMs: 5000,
      proficiencyLevel: score >= 80 ? 'PROFICIENT' : score >= 60 ? 'DEVELOPING' : 'EMERGING',
      score,
    });
  }

  const overallScore = domainScores.reduce((sum, d) => sum + d.score, 0) / domainScores.length;

  return {
    results: {
      sessionId: session.id,
      learnerId: session.learnerId,
      type: session.type,
      completedAt: new Date().toISOString(),
      learningStyleAnswers,
      domainScores,
      overallScore,
      overallProficiency: overallScore >= 80 ? 'PROFICIENT' : overallScore >= 60 ? 'DEVELOPING' : 'EMERGING',
      recommendedGradeBand: 'K5',
      strongDomains: domainScores.filter((d) => d.score >= 70).map((d) => d.domain),
      growthAreas: domainScores.filter((d) => d.score < 60).map((d) => d.domain),
      recommendations: [
        {
          type: 'activity',
          title: 'Complete your learning profile',
          description: 'Take additional assessments to better personalize your experience',
          priority: 'high',
          relatedDomains: [],
        },
      ],
    },
    nextSteps: [],
  };
}
