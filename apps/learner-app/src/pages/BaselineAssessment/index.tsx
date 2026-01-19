'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssessmentFlow } from '@/components/Assessment';
import { useAssessmentAPI } from '@/hooks/useAssessmentAPI';
import type { AssessmentResult } from '@/components/Assessment/types';

export function BaselineAssessment() {
  const navigate = useNavigate();
  const { startAssessment, submitAnswer, completeAssessment, loading, error } = useAssessmentAPI();
  const [sessionId, setSessionId] = useState<string>();
  const [initError, setInitError] = useState<string>();

  useEffect(() => {
    async function initAssessment() {
      try {
        const learnerId = localStorage.getItem('user_id');

        if (!learnerId) {
          setInitError('Please log in to take the assessment');
          return;
        }

        const session = await startAssessment({
          type: 'baseline',
          learnerId,
        });
        setSessionId(session.id);
      } catch (err) {
        console.error('Failed to initialize assessment:', err);
        setInitError('Failed to start assessment. Please try again.');
      }
    }
    initAssessment();
  }, [startAssessment]);

  const handleSubmitAnswer = async (
    sessionId: string,
    questionId: string,
    answer: string | number
  ) => {
    await submitAnswer(sessionId, questionId, answer);
  };

  const handleComplete = async (results: AssessmentResult) => {
    if (!sessionId) return;

    try {
      await completeAssessment(sessionId, {
        sessionId,
        domainScores: results.domainScores.map(score => ({
          domain: score.domain,
          score: score.score,
          totalQuestions: score.totalQuestions,
          correctAnswers: score.correctAnswers,
        })),
        learningStyleAnswers: results.learningStyleAnswers,
        overallScore: results.domainScores.reduce((sum, s) => sum + s.score, 0) / results.domainScores.length,
      });

      // Navigate to dashboard after completion
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to complete assessment:', err);
    }
  };

  // Show error state
  if (initError || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{initError || error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while initializing
  if (loading && !sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-teal-400">
            <span className="text-5xl">🧠</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Setting up your assessment...</h2>
          <p className="text-gray-600">This will only take a moment!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-teal-50 py-8 px-4">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Baseline Assessment</h1>
              <p className="text-sm text-gray-600">Let&apos;s discover your learning style!</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Save & Exit
          </button>
        </div>
      </header>

      {/* Assessment Flow */}
      <main className="max-w-4xl mx-auto">
        <AssessmentFlow
          sessionId={sessionId}
          onSubmitAnswer={handleSubmitAnswer}
          onComplete={handleComplete}
        />
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto mt-8 text-center text-sm text-gray-500">
        <p>Take your time! There&apos;s no wrong answers here.</p>
      </footer>
    </div>
  );
}

export default BaselineAssessment;
