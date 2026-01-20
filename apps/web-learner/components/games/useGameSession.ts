'use client';

import * as React from 'react';

import type { GameConfig, GameResult, GameMetrics as _GameMetrics } from './types';
import * as api from './games-api';

export type GamePhase = 'selecting' | 'preparing' | 'playing' | 'completed' | 'error';

interface GameSessionState {
  phase: GamePhase;
  sessionId: string | null;
  selectedGame: string | null;
  config: GameConfig | null;
  result: GameResult | null;
  error: string | null;
  isLoading: boolean;
}

interface GameSessionActions {
  selectGame: (gameId: string) => void;
  startGame: (config: GameConfig) => Promise<void>;
  completeGame: (result: GameResult) => Promise<void>;
  exitGame: () => Promise<void>;
  reset: () => void;
}

interface UseGameSessionOptions {
  learnerId: string;
  gradeBand: api.GradeBand;
  onXPEarned?: (xp: number) => void;
  onCoinsEarned?: (coins: number) => void;
  onAchievementUnlocked?: (achievement: string) => void;
}

const initialState: GameSessionState = {
  phase: 'selecting',
  sessionId: null,
  selectedGame: null,
  config: null,
  result: null,
  error: null,
  isLoading: false,
};

type GameSessionAction =
  | { type: 'SELECT_GAME'; gameId: string }
  | { type: 'START_GAME'; config: GameConfig; sessionId: string }
  | { type: 'COMPLETE_GAME'; result: GameResult }
  | { type: 'EXIT_GAME' }
  | { type: 'RESET' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'SET_LOADING'; isLoading: boolean };

function gameSessionReducer(state: GameSessionState, action: GameSessionAction): GameSessionState {
  switch (action.type) {
    case 'SELECT_GAME':
      return {
        ...state,
        phase: 'preparing',
        selectedGame: action.gameId,
        error: null,
      };

    case 'START_GAME':
      return {
        ...state,
        phase: 'playing',
        config: action.config,
        sessionId: action.sessionId,
        error: null,
        isLoading: false,
      };

    case 'COMPLETE_GAME':
      return {
        ...state,
        phase: 'completed',
        result: action.result,
        isLoading: false,
      };

    case 'EXIT_GAME':
      return {
        ...state,
        phase: 'selecting',
        sessionId: null,
        config: null,
        result: null,
      };

    case 'RESET':
      return initialState;

    case 'SET_ERROR':
      return {
        ...state,
        phase: 'error',
        error: action.error,
        isLoading: false,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.isLoading,
      };

    default:
      return state;
  }
}

/**
 * Hook for managing a game session lifecycle
 *
 * Handles:
 * - Game selection
 * - Session creation with backend
 * - Game completion and result submission
 * - XP/coin rewards via callbacks
 * - Error handling
 */
export function useGameSession({
  learnerId,
  gradeBand: _gradeBand,
  onXPEarned,
  onCoinsEarned,
  onAchievementUnlocked,
}: UseGameSessionOptions): [GameSessionState, GameSessionActions] {
  const [state, dispatch] = React.useReducer(gameSessionReducer, initialState);

  const selectGame = React.useCallback((gameId: string) => {
    dispatch({ type: 'SELECT_GAME', gameId });
  }, []);

  const startGame = React.useCallback(
    async (config: GameConfig) => {
      dispatch({ type: 'SET_LOADING', isLoading: true });

      try {
        const session = await api.startSession({
          gameSlug: config.gameId,
          learnerId,
          difficulty: config.difficulty,
        });

        dispatch({
          type: 'START_GAME',
          config,
          sessionId: session.id,
        });
      } catch (error) {
        console.error('Failed to start game session:', error);
        // Still allow playing locally even if backend fails
        dispatch({
          type: 'START_GAME',
          config,
          sessionId: `local-${Date.now()}`,
        });
      }
    },
    [learnerId]
  );

  const completeGame = React.useCallback(
    async (result: GameResult) => {
      dispatch({ type: 'SET_LOADING', isLoading: true });

      // Notify about rewards
      if (result.xpEarned > 0 && onXPEarned) {
        onXPEarned(result.xpEarned);
      }
      if (result.coinsEarned > 0 && onCoinsEarned) {
        onCoinsEarned(result.coinsEarned);
      }
      if (result.achievementsUnlocked && onAchievementUnlocked) {
        result.achievementsUnlocked.forEach(onAchievementUnlocked);
      }

      // Submit to backend if we have a real session
      if (state.sessionId && !state.sessionId.startsWith('local-')) {
        try {
          const sessionResult = await api.endSession({
            sessionId: state.sessionId,
            score: result.metrics.score,
            stars: result.stars,
            completed: result.completed,
            metrics: {
              correctAnswers: result.metrics.correctAnswers,
              totalAttempts: result.metrics.totalAttempts,
              averageResponseTime: result.metrics.averageResponseTime,
              duration: result.metrics.duration,
              levelReached: result.metrics.levelReached,
            },
          });

          // Update result with backend-calculated values
          dispatch({
            type: 'COMPLETE_GAME',
            result: {
              ...result,
              xpEarned: sessionResult.xpEarned,
              coinsEarned: sessionResult.coinsEarned,
              isPersonalBest: sessionResult.isPersonalBest,
            },
          });
          return;
        } catch (error) {
          console.error('Failed to submit game results:', error);
          // Fall through to local completion
        }
      }

      dispatch({ type: 'COMPLETE_GAME', result });
    },
    [state.sessionId, onXPEarned, onCoinsEarned, onAchievementUnlocked]
  );

  const exitGame = React.useCallback(async () => {
    // Abandon session if in progress
    if (state.phase === 'playing' && state.sessionId && !state.sessionId.startsWith('local-')) {
      try {
        await api.abandonSession(state.sessionId);
      } catch (error) {
        console.error('Failed to abandon session:', error);
      }
    }

    dispatch({ type: 'EXIT_GAME' });
  }, [state.phase, state.sessionId]);

  const reset = React.useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return [
    state,
    {
      selectGame,
      startGame,
      completeGame,
      exitGame,
      reset,
    },
  ];
}

/**
 * Hook for fetching game recommendations
 */
export function useGameRecommendations(
  learnerId: string,
  gradeBand: api.GradeBand,
  context?: 'FOCUS_BREAK' | 'BRAIN_TRAINING' | 'REWARD'
) {
  const [recommendations, setRecommendations] = React.useState<api.GameRecommendation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function fetchRecommendations() {
      try {
        setIsLoading(true);
        const data = await api.getRecommendations(learnerId, gradeBand, context);
        if (mounted) {
          setRecommendations(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load recommendations');
          console.error(err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchRecommendations();

    return () => {
      mounted = false;
    };
  }, [learnerId, gradeBand, context]);

  return { recommendations, isLoading, error };
}

/**
 * Hook for managing favorites
 */
export function useGameFavorites(learnerId: string) {
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    async function fetchFavorites() {
      try {
        const data = await api.getFavorites(learnerId);
        if (mounted) {
          setFavorites(new Set(data));
        }
      } catch (err) {
        console.error('Failed to load favorites:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchFavorites();

    return () => {
      mounted = false;
    };
  }, [learnerId]);

  const toggleFavorite = React.useCallback(
    async (gameSlug: string) => {
      // Optimistic update
      setFavorites((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(gameSlug)) {
          newSet.delete(gameSlug);
        } else {
          newSet.add(gameSlug);
        }
        return newSet;
      });

      try {
        await api.toggleFavorite(learnerId, gameSlug);
      } catch (err) {
        // Revert on error
        setFavorites((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(gameSlug)) {
            newSet.delete(gameSlug);
          } else {
            newSet.add(gameSlug);
          }
          return newSet;
        });
        console.error('Failed to toggle favorite:', err);
      }
    },
    [learnerId]
  );

  return { favorites, isLoading, toggleFavorite };
}

/**
 * Hook for recently played games
 */
export function useRecentlyPlayed(learnerId: string, limit: number = 5) {
  const [recentGames, setRecentGames] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    async function fetchRecent() {
      try {
        const data = await api.getRecentlyPlayed(learnerId, limit);
        if (mounted) {
          setRecentGames(data.map((g) => g.gameSlug));
        }
      } catch (err) {
        console.error('Failed to load recent games:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchRecent();

    return () => {
      mounted = false;
    };
  }, [learnerId, limit]);

  return { recentGames, isLoading };
}
