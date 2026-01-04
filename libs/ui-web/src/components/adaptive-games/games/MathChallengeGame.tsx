'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

import { cn } from '../../../utils/cn';
import { Button } from '../../button';
import { Card } from '../../card';
import type { GeneratedGame } from '../GameGenerator';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface MathChallengeGameProps {
  game: GeneratedGame;
  apiEndpoint: string;
  sessionId: string;
  onAttempt: (isCorrect: boolean, responseTime: number) => void;
  onHintRequest: () => void;
  onScoreUpdate: (points: number) => void;
  onComplete: () => void;
}

interface MentalMathData {
  problems: Array<{
    question: string;
    answer: number;
    operation: string;
  }>;
  targetProblemsPerMinute?: number;
}

interface NumberPatternData {
  patterns: Array<{
    sequence: Array<number | string>;
    answer: number;
    rule: string;
    hint: string;
    type: string;
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function MathChallengeGame({
  game,
  apiEndpoint,
  sessionId,
  onAttempt,
  onHintRequest,
  onScoreUpdate,
  onComplete,
}: MathChallengeGameProps) {
  const gameType = game.gameType;

  if (gameType === 'mental_math') {
    return (
      <MentalMathGame
        data={game.gameData as unknown as MentalMathData}
        apiEndpoint={apiEndpoint}
        sessionId={sessionId}
        onAttempt={onAttempt}
        onHintRequest={onHintRequest}
        onScoreUpdate={onScoreUpdate}
        onComplete={onComplete}
      />
    );
  }

  if (gameType === 'number_pattern') {
    return (
      <NumberPatternGame
        data={game.gameData as unknown as NumberPatternData}
        apiEndpoint={apiEndpoint}
        sessionId={sessionId}
        onAttempt={onAttempt}
        onHintRequest={onHintRequest}
        onScoreUpdate={onScoreUpdate}
        onComplete={onComplete}
      />
    );
  }

  return (
    <Card>
      <div className="py-8 text-center text-muted">
        <p>Math challenge type not yet implemented: {gameType}</p>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MENTAL MATH SPRINT IMPLEMENTATION
// ────────────────────────────────────────────────────────────────────────────

interface MentalMathGameProps {
  data: MentalMathData;
  apiEndpoint: string;
  sessionId: string;
  onAttempt: (isCorrect: boolean, responseTime: number) => void;
  onHintRequest: () => void;
  onScoreUpdate: (points: number) => void;
  onComplete: () => void;
}

function MentalMathGame({
  data,
  apiEndpoint,
  sessionId,
  onAttempt,
  onHintRequest,
  onScoreUpdate,
  onComplete,
}: MentalMathGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [attemptStartTime, setAttemptStartTime] = useState<number>(Date.now());
  const [isComplete, setIsComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const problems = data.problems || [];
  const currentProblem = problems[currentIndex];

  useEffect(() => {
    setAttemptStartTime(Date.now());
    inputRef.current?.focus();
  }, [currentIndex]);

  const handleSubmit = useCallback(() => {
    if (!userAnswer.trim() || !currentProblem) return;

    const responseTime = Date.now() - attemptStartTime;
    const userNum = parseFloat(userAnswer.trim());
    const isCorrect = userNum === currentProblem.answer;

    onAttempt(isCorrect, responseTime);

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak(Math.max(bestStreak, newStreak));

      // Award points with streak bonus
      const basePoints = 5;
      const streakBonus = Math.floor(newStreak / 3); // Bonus every 3 in a row
      const points = basePoints + streakBonus;

      setScore((prev) => prev + points);
      onScoreUpdate(points);

      setFeedback({ message: newStreak >= 3 ? `${newStreak} in a row!` : 'Correct!', type: 'success' });

      setTimeout(() => {
        setFeedback(null);
        setUserAnswer('');

        if (currentIndex < problems.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setIsComplete(true);
          onComplete();
        }
      }, 800);
    } else {
      setStreak(0);
      setFeedback({
        message: `Not quite. The answer is ${currentProblem.answer}`,
        type: 'error',
      });

      setTimeout(() => {
        setFeedback(null);
        setUserAnswer('');

        if (currentIndex < problems.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setIsComplete(true);
          onComplete();
        }
      }, 1500);
    }
  }, [
    userAnswer,
    currentProblem,
    currentIndex,
    problems.length,
    streak,
    bestStreak,
    onAttempt,
    onScoreUpdate,
    onComplete,
    attemptStartTime,
  ]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  if (isComplete) {
    return (
      <Card>
        <div className="space-y-6 py-8 text-center">
          <div className="text-6xl">🎉</div>
          <div>
            <h2 className="text-2xl font-bold text-text">Great Work!</h2>
            <p className="mt-2 text-muted">You completed all the problems!</p>
          </div>
          <div className="mx-auto grid max-w-md gap-4 text-left">
            <div className="flex justify-between rounded-lg bg-surface-muted p-4">
              <span className="text-muted">Final Score:</span>
              <span className="font-bold text-text">{score} points</span>
            </div>
            <div className="flex justify-between rounded-lg bg-surface-muted p-4">
              <span className="text-muted">Best Streak:</span>
              <span className="font-bold text-text">{bestStreak} in a row</span>
            </div>
            <div className="flex justify-between rounded-lg bg-surface-muted p-4">
              <span className="text-muted">Problems Solved:</span>
              <span className="font-bold text-text">{problems.length}</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (!currentProblem) {
    return null;
  }

  return (
    <Card>
      <div className="space-y-6">
        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-4">
            <div>
              <span className="text-muted">Problem:</span>{' '}
              <span className="font-medium text-text">
                {currentIndex + 1} / {problems.length}
              </span>
            </div>
            <div>
              <span className="text-muted">Score:</span> <span className="font-medium text-text">{score}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FireIcon className="h-5 w-5 text-orange-500" />
            <span className="font-bold text-text">{streak}</span>
            {bestStreak > 0 && <span className="text-xs text-muted">(best: {bestStreak})</span>}
          </div>
        </div>

        {/* Problem Display */}
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-12 text-center">
          <div className="text-5xl font-bold text-text">{currentProblem.question}</div>
        </div>

        {/* Answer Input */}
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="number"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="?"
            className="form-input w-full text-center text-3xl font-bold"
            autoFocus
            disabled={feedback !== null}
          />

          {/* Feedback */}
          {feedback && (
            <div
              className={cn(
                'rounded-lg p-4 text-center text-lg font-bold',
                feedback.type === 'success'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              )}
            >
              {feedback.message}
            </div>
          )}

          {/* Submit Button */}
          {!feedback && (
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={!userAnswer.trim()}
              className="w-full"
            >
              Submit Answer
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / problems.length) * 100}%` }}
          />
        </div>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// NUMBER PATTERN IMPLEMENTATION
// ────────────────────────────────────────────────────────────────────────────

interface NumberPatternGameProps {
  data: NumberPatternData;
  apiEndpoint: string;
  sessionId: string;
  onAttempt: (isCorrect: boolean, responseTime: number) => void;
  onHintRequest: () => void;
  onScoreUpdate: (points: number) => void;
  onComplete: () => void;
}

function NumberPatternGame({
  data,
  apiEndpoint,
  sessionId,
  onAttempt,
  onHintRequest,
  onScoreUpdate,
  onComplete,
}: NumberPatternGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showRule, setShowRule] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [attemptStartTime, setAttemptStartTime] = useState<number>(Date.now());
  const [score, setScore] = useState(0);

  const patterns = data.patterns || [];
  const currentPattern = patterns[currentIndex];

  useEffect(() => {
    setAttemptStartTime(Date.now());
    setShowHint(false);
    setShowRule(false);
  }, [currentIndex]);

  const handleSubmit = useCallback(() => {
    if (!userAnswer.trim() || !currentPattern) return;

    const responseTime = Date.now() - attemptStartTime;
    const userNum = parseFloat(userAnswer.trim());
    const isCorrect = userNum === currentPattern.answer;

    onAttempt(isCorrect, responseTime);

    if (isCorrect) {
      setFeedback({ message: 'Perfect! You found the pattern!', type: 'success' });
      setShowRule(true);

      const points = 10;
      setScore((prev) => prev + points);
      onScoreUpdate(points);

      setTimeout(() => {
        setFeedback(null);
        setUserAnswer('');

        if (currentIndex < patterns.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          onComplete();
        }
      }, 2000);
    } else {
      setFeedback({ message: 'Not quite. Try again!', type: 'error' });
      setTimeout(() => setFeedback(null), 1500);
    }
  }, [userAnswer, currentPattern, currentIndex, patterns.length, onAttempt, onScoreUpdate, onComplete, attemptStartTime]);

  const handleShowHint = useCallback(() => {
    setShowHint(true);
    onHintRequest();
  }, [onHintRequest]);

  if (!currentPattern) {
    return null;
  }

  return (
    <Card>
      <div className="space-y-6">
        {/* Progress */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text">
              Pattern {currentIndex + 1} / {patterns.length}
            </p>
            <p className="text-sm text-muted">Score: {score}</p>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {currentPattern.type}
          </div>
        </div>

        {/* Pattern Display */}
        <div className="text-center">
          <p className="mb-4 text-sm text-muted">What comes next in the sequence?</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {currentPattern.sequence.map((num, index) => (
              <div
                key={index}
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-lg text-xl font-bold',
                  num === '?'
                    ? 'border-2 border-dashed border-primary bg-primary/5 text-primary'
                    : 'bg-surface-muted text-text'
                )}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        {/* Hint */}
        {showHint && (
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <div className="flex items-start gap-2">
              <LightBulbIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span>{currentPattern.hint}</span>
            </div>
          </div>
        )}

        {/* Rule Display (after correct answer) */}
        {showRule && (
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <p className="font-medium">Pattern Rule:</p>
            <p>{currentPattern.rule}</p>
          </div>
        )}

        {/* Answer Input */}
        <div className="space-y-3">
          <input
            type="number"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Your answer"
            className="form-input w-full text-center text-2xl font-bold"
            autoFocus
            disabled={feedback?.type === 'success'}
          />

          {/* Feedback */}
          {feedback && (
            <div
              className={cn(
                'rounded-lg p-3 text-center font-medium',
                feedback.type === 'success'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              )}
            >
              {feedback.message}
            </div>
          )}

          {/* Buttons */}
          {feedback?.type !== 'success' && (
            <div className="flex gap-2">
              {!showHint && (
                <Button variant="secondary" className="flex-1" onClick={handleShowHint}>
                  <LightBulbIcon className="h-4 w-4" />
                  Hint
                </Button>
              )}
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSubmit}
                disabled={!userAnswer.trim()}
              >
                Check Answer
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ICONS
// ────────────────────────────────────────────────────────────────────────────

function FireIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LightBulbIcon({ className }: { className?: string }) {
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
