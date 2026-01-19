'use client';

import { useState, useRef, useEffect } from 'react';
import { Problem, ActivityResult } from './types';
import { ProblemDisplay } from './ProblemDisplay';

interface Props {
  problem: Problem;
  onComplete: (result: ActivityResult) => void;
  showTimer?: boolean;
  maxAttempts?: number;
}

async function getAdaptiveHint(
  problem: Problem,
  answer: string,
  attempts: number
): Promise<string> {
  try {
    const response = await fetch('/api/ai/get-hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem: problem.content,
        studentAnswer: answer,
        attemptNumber: attempts,
        previousHints: problem.hints.slice(0, attempts),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.hint;
    }
  } catch (error) {
    console.error('Failed to get adaptive hint:', error);
  }

  // Fallback to pre-defined hints
  return problem.hints[attempts - 1] || 'Try breaking the problem into smaller steps.';
}

export function MathProblemSolver({ problem, onComplete, showTimer = true, maxAttempts = 3 }: Props) {
  const [answer, setAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [hints, setHints] = useState<string[]>([]);
  const [showSolution, setShowSolution] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const startTimeRef = useRef(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!showTimer) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const checkAnswer = async () => {
    if (!answer.trim()) {
      setFeedback({ type: 'error', message: 'Please enter an answer first!' });
      return;
    }

    setIsChecking(true);
    setFeedback({ type: null, message: '' });
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    try {
      // Call AI for answer validation
      const response = await fetch('/api/ai/validate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: problem.content,
          studentAnswer: answer,
          correctAnswer: problem.solution,
        }),
      });

      let isCorrect = false;

      if (response.ok) {
        const result = await response.json();
        isCorrect = result.correct;
      } else {
        // Fallback to simple comparison
        isCorrect = answer.trim().toLowerCase() === problem.solution.trim().toLowerCase();
      }

      if (isCorrect) {
        setFeedback({ type: 'success', message: 'Great job! That\'s correct!' });
        setTimeout(() => {
          onComplete({
            correct: true,
            attempts: newAttempts,
            timeSpent: Date.now() - startTimeRef.current,
            hintsUsed: hints.length,
          });
        }, 1500);
      } else {
        // Get adaptive hint
        if (newAttempts < maxAttempts) {
          setFeedback({ type: 'error', message: 'Not quite right. Here\'s a hint to help you!' });
          const hint = await getAdaptiveHint(problem, answer, newAttempts);
          setHints(prev => [...prev, hint]);
        } else {
          // Show solution with explanation
          setFeedback({ type: 'error', message: 'Let\'s look at how to solve this problem.' });
          setShowSolution(true);
        }
      }
    } catch (error) {
      console.error('Error checking answer:', error);
      // Fallback to simple check
      const isCorrect = answer.trim().toLowerCase() === problem.solution.trim().toLowerCase();
      if (isCorrect) {
        setFeedback({ type: 'success', message: 'Correct!' });
        setTimeout(() => {
          onComplete({
            correct: true,
            attempts: newAttempts,
            timeSpent: Date.now() - startTimeRef.current,
            hintsUsed: hints.length,
          });
        }, 1500);
      } else if (newAttempts >= maxAttempts) {
        setShowSolution(true);
      } else {
        setFeedback({ type: 'error', message: 'Try again! Think about what the problem is asking.' });
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleContinue = () => {
    onComplete({
      correct: false,
      attempts,
      timeSpent: Date.now() - startTimeRef.current,
      hintsUsed: hints.length,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isChecking && !showSolution) {
      checkAnswer();
    }
  };

  return (
    <div className="bg-white rounded-xl p-8 shadow-lg max-w-2xl mx-auto">
      {/* Header with timer */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800">{problem.title}</h3>
        {showTimer && (
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
          </div>
        )}
      </div>

      {/* Problem display */}
      <ProblemDisplay content={problem.content} type={problem.type} />

      {/* Input area */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-2">Your Answer:</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={showSolution || isChecking}
          className="w-full px-4 py-3 border-2 rounded-lg text-xl focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Type your answer here..."
        />
      </div>

      {/* Feedback message */}
      {feedback.type && (
        <div className={`mb-4 p-4 rounded-lg ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        </div>
      )}

      {/* Hints */}
      {hints.length > 0 && !showSolution && (
        <div className="mb-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold mb-2 text-yellow-800 flex items-center gap-2">
            <span className="text-xl">💡</span> Hints:
          </h4>
          <ul className="space-y-2">
            {hints.map((hint, i) => (
              <li key={i} className="text-gray-700 pl-4 border-l-2 border-yellow-400">
                {hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Solution */}
      {showSolution && (
        <div className="mb-4 bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h4 className="font-semibold mb-3 text-blue-800 flex items-center gap-2">
            <span className="text-xl">📝</span> Solution:
          </h4>
          <div className="mb-4">
            <span className="text-gray-600">Answer: </span>
            <span className="text-xl font-bold text-blue-700">{problem.solution}</span>
          </div>
          <div className="text-gray-700">
            <span className="font-medium">Explanation: </span>
            {problem.explanation}
          </div>
        </div>
      )}

      {/* Attempts indicator */}
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
        <span>Attempts: {attempts}/{maxAttempts}</span>
        <span>Hints used: {hints.length}</span>
      </div>

      {/* Action buttons */}
      {!showSolution ? (
        <button
          onClick={checkAnswer}
          disabled={isChecking || !answer.trim()}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isChecking ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Checking...
            </>
          ) : (
            'Check Answer'
          )}
        </button>
      ) : (
        <button
          onClick={handleContinue}
          className="w-full py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          Continue to Next Problem
        </button>
      )}
    </div>
  );
}

export default MathProblemSolver;
