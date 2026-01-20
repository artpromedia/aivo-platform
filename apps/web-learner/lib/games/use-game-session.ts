/**
 * Game Session Hook for Web Learner Mini-Games
 *
 * Manages game session lifecycle:
 * - Starting a game session
 * - Tracking progress
 * - Ending and recording results
 * - Return to focus tracking
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  GameDefinition,
  GameSession,
  GamePhase,
  GameResult,
  EndGameResponse,
  GradeBand,
  SelfReportedMood,
} from './game-types';
import {
  startGameSession,
  endGameSession,
  recordReturnToFocus,
  getRecommendedGame,
  getEncouragementMessage,
} from './game-api';

export interface UseGameSessionOptions {
  learnerId: string;
  sessionId: string;
  gradeBand?: GradeBand;
  mood?: SelfReportedMood;
  onSessionStart?: (session: GameSession) => void;
  onSessionEnd?: (result: EndGameResponse) => void;
  onReturnToFocus?: () => void;
}

export interface UseGameSessionReturn {
  // State
  currentGame: GameDefinition | null;
  gameSession: GameSession | null;
  phase: GamePhase;
  isLoading: boolean;
  error: string | null;
  result: EndGameResponse | null;

  // Actions
  selectGame: (game: GameDefinition) => void;
  startGame: () => Promise<void>;
  completeGame: (result: GameResult) => Promise<void>;
  exitGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  rateGame: (rating: number) => Promise<void>;
  returnToFocus: (postFocusScore?: number) => Promise<void>;
  getRecommended: () => Promise<GameDefinition | null>;

  // Timer helpers
  elapsedSeconds: number;
  remainingSeconds: number;
}

export function useGameSession(options: UseGameSessionOptions): UseGameSessionReturn {
  const { learnerId, sessionId, gradeBand = 'G6_8', mood, onSessionStart, onSessionEnd, onReturnToFocus } = options;

  // Core state
  const [currentGame, setCurrentGame] = useState<GameDefinition | null>(null);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [phase, setPhase] = useState<GamePhase>('instructions');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EndGameResponse | null>(null);

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Calculate remaining time
  const remainingSeconds = currentGame
    ? Math.max(0, currentGame.durationSeconds - elapsedSeconds)
    : 0;

  // Timer effect
  useEffect(() => {
    if (phase === 'playing' && !timerRef.current) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedSeconds(elapsed);
        }
      }, 1000);
    }

    if (phase === 'paused' && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (phase === 'completed' || phase === 'instructions') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase]);

  // Select a game to play
  const selectGame = useCallback((game: GameDefinition) => {
    setCurrentGame(game);
    setPhase('instructions');
    setError(null);
    setResult(null);
    setElapsedSeconds(0);
  }, []);

  // Start playing the selected game
  const startGame = useCallback(async () => {
    if (!currentGame) {
      setError('No game selected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await startGameSession({
        sessionId,
        learnerId,
        gameId: currentGame.id,
      });

      setGameSession(response.gameSession);
      setPhase('playing');
      setElapsedSeconds(0);
      startTimeRef.current = Date.now();

      onSessionStart?.(response.gameSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
      // Still allow playing even if API fails (offline mode)
      setPhase('playing');
      setElapsedSeconds(0);
      startTimeRef.current = Date.now();
    } finally {
      setIsLoading(false);
    }
  }, [currentGame, sessionId, learnerId, onSessionStart]);

  // Complete the game and record results
  const completeGame = useCallback(async (gameResult: GameResult) => {
    setPhase('completed');
    setIsLoading(true);
    setError(null);

    const encouragement = getEncouragementMessage(
      gameResult.completed,
      gameResult.score,
      gameResult.maxScore
    );

    if (gameSession) {
      try {
        const response = await endGameSession({
          gameSessionId: gameSession.id,
          completed: gameResult.completed,
          score: gameResult.score,
          maxScore: gameResult.maxScore,
        });

        setResult(response);
        onSessionEnd?.(response);
      } catch (err) {
        // Create a mock result for offline mode
        const mockResult: EndGameResponse = {
          success: true,
          gameSession: {
            ...gameSession,
            completed: gameResult.completed,
            score: gameResult.score,
            maxScore: gameResult.maxScore,
            endedAt: new Date().toISOString(),
            durationSeconds: gameResult.durationSeconds,
          },
          message: 'Game completed!',
          encouragement,
        };
        setResult(mockResult);
        onSessionEnd?.(mockResult);
      }
    } else {
      // No session (offline mode)
      const mockResult: EndGameResponse = {
        success: true,
        gameSession: {
          id: crypto.randomUUID(),
          sessionId,
          learnerId,
          gameId: currentGame?.id || '',
          gameTitle: currentGame?.title || '',
          gameCategory: currentGame?.category || 'cognitive',
          startedAt: new Date(Date.now() - gameResult.durationSeconds * 1000).toISOString(),
          endedAt: new Date().toISOString(),
          completed: gameResult.completed,
          score: gameResult.score,
          maxScore: gameResult.maxScore,
          durationSeconds: gameResult.durationSeconds,
        },
        message: 'Game completed!',
        encouragement,
      };
      setResult(mockResult);
    }

    setIsLoading(false);
  }, [gameSession, sessionId, learnerId, currentGame, onSessionEnd]);

  // Exit the game without completing
  const exitGame = useCallback(() => {
    if (phase === 'playing' && gameSession) {
      // Record incomplete session
      endGameSession({
        gameSessionId: gameSession.id,
        completed: false,
      }).catch(() => {
        // Ignore errors on exit
      });
    }

    setCurrentGame(null);
    setGameSession(null);
    setPhase('instructions');
    setResult(null);
    setError(null);
    setElapsedSeconds(0);
  }, [phase, gameSession]);

  // Pause the game
  const pauseGame = useCallback(() => {
    if (phase === 'playing') {
      setPhase('paused');
    }
  }, [phase]);

  // Resume the game
  const resumeGame = useCallback(() => {
    if (phase === 'paused') {
      // Adjust start time to account for pause
      if (startTimeRef.current) {
        const pauseDuration = elapsedSeconds * 1000;
        startTimeRef.current = Date.now() - pauseDuration;
      }
      setPhase('playing');
    }
  }, [phase, elapsedSeconds]);

  // Rate the game after completion
  const rateGame = useCallback(async (rating: number) => {
    if (!gameSession) return;

    try {
      await endGameSession({
        gameSessionId: gameSession.id,
        completed: result?.gameSession.completed ?? true,
        score: result?.gameSession.score,
        maxScore: result?.gameSession.maxScore,
        helpfulnessRating: rating,
      });
    } catch (err) {
      // Silently fail - rating is optional
      console.warn('Failed to submit rating:', err);
    }
  }, [gameSession, result]);

  // Record return to focus
  const returnToFocus = useCallback(async (postFocusScore?: number) => {
    if (gameSession) {
      try {
        await recordReturnToFocus({
          gameSessionId: gameSession.id,
          postFocusScore,
        });
      } catch (err) {
        // Silently fail
        console.warn('Failed to record return to focus:', err);
      }
    }

    onReturnToFocus?.();
  }, [gameSession, onReturnToFocus]);

  // Get recommended game
  const getRecommended = useCallback(async (): Promise<GameDefinition | null> => {
    try {
      const response = await getRecommendedGame({
        learnerId,
        gradeBand,
        mood,
      });
      return response.game;
    } catch (err) {
      console.warn('Failed to get recommendation:', err);
      return null;
    }
  }, [learnerId, gradeBand, mood]);

  return {
    // State
    currentGame,
    gameSession,
    phase,
    isLoading,
    error,
    result,

    // Actions
    selectGame,
    startGame,
    completeGame,
    exitGame,
    pauseGame,
    resumeGame,
    rateGame,
    returnToFocus,
    getRecommended,

    // Timer
    elapsedSeconds,
    remainingSeconds,
  };
}

// ============ Helper Hooks ============

/**
 * Hook for managing game timer
 */
export function useGameTimer(durationSeconds: number, isActive: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const remaining = Math.max(0, durationSeconds - elapsed);
  const progress = durationSeconds > 0 ? elapsed / durationSeconds : 0;
  const isComplete = elapsed >= durationSeconds;

  useEffect(() => {
    if (isActive && !isRunning) {
      setIsRunning(true);
      setElapsed(0);
    }

    if (!isActive && isRunning) {
      setIsRunning(false);
    }
  }, [isActive, isRunning]);

  useEffect(() => {
    if (isRunning && !intervalRef.current) {
      const startTime = Date.now() - elapsed * 1000;
      intervalRef.current = setInterval(() => {
        const newElapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(newElapsed);
      }, 100);
    }

    if (!isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, elapsed]);

  const reset = useCallback(() => {
    setElapsed(0);
    setIsRunning(false);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    setIsRunning(true);
  }, []);

  return {
    elapsed,
    remaining,
    progress,
    isComplete,
    isRunning,
    reset,
    pause,
    resume,
  };
}

/**
 * Hook for managing game score
 */
export function useGameScore(maxScore: number) {
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);

  const addPoints = useCallback((points: number) => {
    setScore((prev) => Math.min(maxScore, prev + points));
  }, [maxScore]);

  const subtractPoints = useCallback((points: number) => {
    setScore((prev) => Math.max(0, prev - points));
  }, []);

  const incrementMoves = useCallback(() => {
    setMoves((prev) => prev + 1);
  }, []);

  const reset = useCallback(() => {
    setScore(0);
    setMoves(0);
  }, []);

  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

  return {
    score,
    maxScore,
    moves,
    percentage,
    addPoints,
    subtractPoints,
    incrementMoves,
    reset,
  };
}
