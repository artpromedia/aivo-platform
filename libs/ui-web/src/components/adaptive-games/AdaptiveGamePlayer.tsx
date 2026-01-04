'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import { cn } from '../../utils/cn';
import { Button } from '../button';
import { Card } from '../card';
import type { GeneratedGame } from './GameGenerator';
import { WordPuzzleGame } from './games/WordPuzzleGame';
import { MathChallengeGame } from './games/MathChallengeGame';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface AdaptiveGamePlayerProps {
  game: GeneratedGame;
  learnerId: string;
  apiEndpoint?: string;
  onComplete?: (results: GameResults) => void;
  onExit?: () => void;
  className?: string;
}

export interface GameResults {
  score: number;
  maxScore: number;
  accuracy: number;
  timeElapsed: number;
  hintsUsed: number;
  completedAt: Date;
}

interface GameSession {
  sessionId: string;
  startTime: Date;
  score: number;
  hintsUsed: number;
  attempts: number;
  correctAttempts: number;
}

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function AdaptiveGamePlayer({
  game,
  learnerId,
  apiEndpoint = '/api/ai/games',
  onComplete,
  onExit,
  className,
}: AdaptiveGamePlayerProps) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [currentDifficulty, setCurrentDifficulty] = useState(game.difficulty);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // SESSION MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Create game session
    const createSession = async () => {
      try {
        const response = await fetch(`${apiEndpoint}/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gameId: game.id,
            gameType: game.gameType,
            learnerId,
            initialDifficulty: game.difficulty,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSession({
            sessionId: data.session.sessionId,
            startTime: new Date(),
            score: 0,
            hintsUsed: 0,
            attempts: 0,
            correctAttempts: 0,
          });
        }
      } catch (error) {
        console.error('Failed to create game session', error);
        // Continue without session tracking
        setSession({
          sessionId: 'local',
          startTime: new Date(),
          score: 0,
          hintsUsed: 0,
          attempts: 0,
          correctAttempts: 0,
        });
      }
    };

    createSession();
  }, [game, learnerId, apiEndpoint]);

  // ──────────────────────────────────────────────────────────────────────────
  // TIMER
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!showInstructions && !isPaused && session) {
      timerRef.current = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [showInstructions, isPaused, session]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handleStartGame = useCallback(() => {
    setShowInstructions(false);
  }, []);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleAttempt = useCallback(
    async (isCorrect: boolean, responseTime: number) => {
      if (!session) return;

      const newSession = {
        ...session,
        attempts: session.attempts + 1,
        correctAttempts: session.correctAttempts + (isCorrect ? 1 : 0),
      };
      setSession(newSession);

      // Record attempt via API
      try {
        await fetch(`${apiEndpoint}/session/attempt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session.sessionId,
            isCorrect,
            responseTime,
          }),
        });

        // Check for difficulty adjustment
        if (newSession.attempts >= 5 && newSession.attempts % 5 === 0) {
          const adaptResponse = await fetch(`${apiEndpoint}/adapt`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: session.sessionId,
            }),
          });

          if (adaptResponse.ok) {
            const adaptData = await adaptResponse.json();
            if (adaptData.applied) {
              setCurrentDifficulty(adaptData.adjustment.newDifficulty);
            }
          }
        }
      } catch (error) {
        console.error('Failed to record attempt', error);
      }
    },
    [session, apiEndpoint]
  );

  const handleHintRequest = useCallback(async () => {
    if (!session) return;

    setSession({
      ...session,
      hintsUsed: session.hintsUsed + 1,
    });
  }, [session]);

  const handleScoreUpdate = useCallback(
    (points: number) => {
      if (!session) return;

      setSession({
        ...session,
        score: session.score + points,
      });
    },
    [session]
  );

  const handleGameComplete = useCallback(() => {
    if (!session) return;

    const results: GameResults = {
      score: session.score,
      maxScore: game.scoring.maxPoints,
      accuracy: session.attempts > 0 ? session.correctAttempts / session.attempts : 0,
      timeElapsed,
      hintsUsed: session.hintsUsed,
      completedAt: new Date(),
    };

    onComplete?.(results);
  }, [session, game, timeElapsed, onComplete]);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  if (!session) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <span className="ml-3 text-text">Initializing game...</span>
        </div>
      </Card>
    );
  }

  if (showInstructions) {
    return (
      <Card
        className={className}
        title={
          <div className="flex items-center gap-2">
            <GameIcon className="h-5 w-5 text-primary" />
            <span>{game.title}</span>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Game Info */}
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4" />
              <span>{Math.round(game.estimatedDuration / 60)} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <StarIcon className="h-4 w-4" />
              <span className="capitalize">{game.difficulty} difficulty</span>
            </div>
            <div className="flex items-center gap-2">
              <TargetIcon className="h-4 w-4" />
              <span>{game.scoring.maxPoints} points possible</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-text">{game.description}</p>

          {/* Instructions */}
          <div>
            <h3 className="mb-3 font-semibold text-text">How to Play:</h3>
            <ol className="space-y-2">
              {game.instructions.map((instruction, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="text-text">{instruction}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Start Button */}
          <div className="flex justify-center pt-4">
            <Button variant="primary" size="lg" onClick={handleStartGame}>
              <PlayIcon className="h-5 w-5" />
              Start Game
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Game Header */}
      <Card className="border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="font-bold text-text">{game.title}</h2>
              <p className="text-sm text-muted">Score: {session.score}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer */}
            <div className="flex items-center gap-2 text-sm text-muted">
              <ClockIcon className="h-4 w-4" />
              <span>
                {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
              </span>
            </div>

            {/* Difficulty Indicator */}
            <div className={cn('rounded-full px-3 py-1 text-xs font-medium', getDifficultyColor(currentDifficulty))}>
              {currentDifficulty}
            </div>

            {/* Controls */}
            <Button variant="ghost" size="sm" onClick={isPaused ? handleResume : handlePause}>
              {isPaused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
            </Button>

            <Button variant="ghost" size="sm" onClick={onExit}>
              <ExitIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Pause Overlay */}
        {isPaused && (
          <div className="mt-4 rounded-lg bg-surface-muted p-4 text-center">
            <p className="text-lg font-semibold text-text">Game Paused</p>
            <Button variant="primary" size="sm" onClick={handleResume} className="mt-3">
              <PlayIcon className="h-4 w-4" />
              Resume
            </Button>
          </div>
        )}
      </Card>

      {/* Game Content */}
      {!isPaused && (
        <GameRenderer
          game={game}
          apiEndpoint={apiEndpoint}
          sessionId={session.sessionId}
          onAttempt={handleAttempt}
          onHintRequest={handleHintRequest}
          onScoreUpdate={handleScoreUpdate}
          onComplete={handleGameComplete}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// GAME RENDERER
// ────────────────────────────────────────────────────────────────────────────

interface GameRendererProps {
  game: GeneratedGame;
  apiEndpoint: string;
  sessionId: string;
  onAttempt: (isCorrect: boolean, responseTime: number) => void;
  onHintRequest: () => void;
  onScoreUpdate: (points: number) => void;
  onComplete: () => void;
}

function GameRenderer({
  game,
  apiEndpoint,
  sessionId,
  onAttempt,
  onHintRequest,
  onScoreUpdate,
  onComplete,
}: GameRendererProps) {
  // Route to appropriate game component based on game type
  const gameType = game.gameType;

  if (gameType.includes('word') || gameType.includes('crossword') || gameType.includes('anagram')) {
    return (
      <WordPuzzleGame
        game={game}
        apiEndpoint={apiEndpoint}
        sessionId={sessionId}
        onAttempt={onAttempt}
        onHintRequest={onHintRequest}
        onScoreUpdate={onScoreUpdate}
        onComplete={onComplete}
      />
    );
  }

  if (
    gameType.includes('math') ||
    gameType.includes('equation') ||
    gameType.includes('number') ||
    gameType.includes('pattern')
  ) {
    return (
      <MathChallengeGame
        game={game}
        apiEndpoint={apiEndpoint}
        sessionId={sessionId}
        onAttempt={onAttempt}
        onHintRequest={onHintRequest}
        onScoreUpdate={onScoreUpdate}
        onComplete={onComplete}
      />
    );
  }

  // Fallback for unsupported game types
  return (
    <Card>
      <div className="py-8 text-center">
        <p className="text-muted">This game type is not yet implemented: {gameType}</p>
        <Button variant="secondary" className="mt-4" onClick={onComplete}>
          Exit Game
        </Button>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ────────────────────────────────────────────────────────────────────────────

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'hard':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ICONS
// ────────────────────────────────────────────────────────────────────────────

function GameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 4a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4zM13 4a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V4z" />
    </svg>
  );
}

function ExitIcon({ className }: { className?: string }) {
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

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
