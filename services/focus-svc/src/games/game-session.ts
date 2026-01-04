/**
 * Focus Game Session Manager
 *
 * Manages game sessions, tracks effectiveness, and stores learner preferences.
 * Integrates with the focus detection system to measure if games help learners
 * return to focus after a break.
 */

import type { MiniGame, GameCategory } from './game-library.js';
import { sessionServiceClient } from '../services/sessionServiceClient.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface GameSession {
  /** Unique session ID */
  id: string;

  /** Learning session ID this game is part of */
  sessionId: string;

  /** Learner ID */
  learnerId: string;

  /** Game being played */
  gameId: string;

  /** Game metadata */
  gameTitle: string;
  gameCategory: GameCategory;

  /** Timing */
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;

  /** Completion */
  completed: boolean;
  score?: number;
  maxScore?: number;

  /** Effectiveness tracking */
  returnedToFocus?: boolean; // Did they return to learning after?
  helpfulnessRating?: number; // 1-5, optional learner feedback

  /** Context */
  preFocusScore?: number; // Focus score before game
  postFocusScore?: number; // Focus score after returning
}

export interface GamePreferences {
  learnerId: string;
  favoriteCategories: GameCategory[];
  completedGames: string[]; // Game IDs
  averageRatings: Record<string, number>; // gameId -> avg rating
  lastPlayedDates: Record<string, string>; // gameId -> ISO date
}

// ══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORAGE (MVP - would use database in production)
// ══════════════════════════════════════════════════════════════════════════════

const activeSessions = new Map<string, GameSession>();
const completedSessions: GameSession[] = [];
const learnerPreferences = new Map<string, GamePreferences>();

// ══════════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Start a new game session
 */
export async function startGameSession(params: {
  sessionId: string;
  learnerId: string;
  game: MiniGame;
  preFocusScore?: number;
}): Promise<GameSession> {
  const gameSession: GameSession = {
    id: generateSessionId(),
    sessionId: params.sessionId,
    learnerId: params.learnerId,
    gameId: params.game.id,
    gameTitle: params.game.title,
    gameCategory: params.game.category,
    startedAt: new Date().toISOString(),
    completed: false,
    preFocusScore: params.preFocusScore,
  };

  // Store in active sessions
  activeSessions.set(gameSession.id, gameSession);

  // Emit event to session service
  try {
    await sessionServiceClient.emitEvent(params.sessionId, 'FOCUS_GAME_STARTED', {
      gameSessionId: gameSession.id,
      gameId: params.game.id,
      gameTitle: params.game.title,
      gameCategory: params.game.category,
      learnerId: params.learnerId,
      startedAt: gameSession.startedAt,
    });
  } catch (err) {
    console.error('Failed to emit FOCUS_GAME_STARTED event:', err);
  }

  return gameSession;
}

/**
 * End a game session and record results
 */
export async function endGameSession(params: {
  gameSessionId: string;
  completed: boolean;
  score?: number;
  maxScore?: number;
  helpfulnessRating?: number;
}): Promise<GameSession | null> {
  const session = activeSessions.get(params.gameSessionId);

  if (!session) {
    return null;
  }

  // Update session
  const now = new Date();
  const startTime = new Date(session.startedAt);
  const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

  session.endedAt = now.toISOString();
  session.durationSeconds = durationSeconds;
  session.completed = params.completed;
  session.score = params.score;
  session.maxScore = params.maxScore;
  session.helpfulnessRating = params.helpfulnessRating;

  // Move to completed sessions
  activeSessions.delete(params.gameSessionId);
  completedSessions.push(session);

  // Update learner preferences
  updateLearnerPreferences(session);

  // Emit event to session service
  try {
    await sessionServiceClient.emitEvent(session.sessionId, 'FOCUS_GAME_ENDED', {
      gameSessionId: session.id,
      gameId: session.gameId,
      gameTitle: session.gameTitle,
      gameCategory: session.gameCategory,
      learnerId: session.learnerId,
      completed: session.completed,
      durationSeconds: session.durationSeconds,
      score: session.score,
      maxScore: session.maxScore,
      helpfulnessRating: session.helpfulnessRating,
      endedAt: session.endedAt,
    });
  } catch (err) {
    console.error('Failed to emit FOCUS_GAME_ENDED event:', err);
  }

  return session;
}

/**
 * Record that learner returned to focus after a game
 */
export async function recordReturnToFocus(params: {
  gameSessionId: string;
  postFocusScore?: number;
}): Promise<void> {
  // Check in completed sessions
  const session = completedSessions.find((s) => s.id === params.gameSessionId);

  if (!session) {
    return;
  }

  session.returnedToFocus = true;
  session.postFocusScore = params.postFocusScore;

  // Calculate effectiveness
  const wasEffective =
    session.preFocusScore && session.postFocusScore
      ? session.postFocusScore > session.preFocusScore
      : true; // Assume effective if we don't have scores

  // Emit event
  try {
    await sessionServiceClient.emitEvent(session.sessionId, 'FOCUS_GAME_EFFECTIVENESS', {
      gameSessionId: session.id,
      gameId: session.gameId,
      learnerId: session.learnerId,
      returnedToFocus: true,
      wasEffective,
      preFocusScore: session.preFocusScore,
      postFocusScore: session.postFocusScore,
      helpfulnessRating: session.helpfulnessRating,
    });
  } catch (err) {
    console.error('Failed to emit FOCUS_GAME_EFFECTIVENESS event:', err);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PREFERENCES & ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Update learner game preferences based on completed session
 */
function updateLearnerPreferences(session: GameSession): void {
  let prefs = learnerPreferences.get(session.learnerId);

  if (!prefs) {
    prefs = {
      learnerId: session.learnerId,
      favoriteCategories: [],
      completedGames: [],
      averageRatings: {},
      lastPlayedDates: {},
    };
    learnerPreferences.set(session.learnerId, prefs);
  }

  // Track completed game
  if (!prefs.completedGames.includes(session.gameId)) {
    prefs.completedGames.push(session.gameId);
  }

  // Update last played date
  prefs.lastPlayedDates[session.gameId] = session.endedAt!;

  // Update average rating if provided
  if (session.helpfulnessRating) {
    const currentRating = prefs.averageRatings[session.gameId] ?? 0;
    const playCount = completedSessions.filter(
      (s) => s.learnerId === session.learnerId && s.gameId === session.gameId
    ).length;

    // Calculate running average
    prefs.averageRatings[session.gameId] =
      (currentRating * (playCount - 1) + session.helpfulnessRating) / playCount;
  }

  // Update favorite categories based on completion and ratings
  updateFavoriteCategories(prefs);
}

/**
 * Determine favorite categories based on play history and ratings
 */
function updateFavoriteCategories(prefs: GamePreferences): void {
  const categoryScores: Record<GameCategory, number> = {
    cognitive: 0,
    relaxation: 0,
    physical: 0,
    creative: 0,
  };

  // Score each category based on completed games and ratings
  for (const session of completedSessions.filter((s) => s.learnerId === prefs.learnerId)) {
    const category = session.gameCategory;

    // Base points for completion
    categoryScores[category] += 1;

    // Bonus points for high ratings
    if (session.helpfulnessRating && session.helpfulnessRating >= 4) {
      categoryScores[category] += 2;
    }

    // Bonus for returning to focus
    if (session.returnedToFocus) {
      categoryScores[category] += 1;
    }
  }

  // Sort categories by score
  const sortedCategories = (Object.entries(categoryScores) as Array<[GameCategory, number]>)
    .sort(([, a], [, b]) => b - a)
    .map(([cat]) => cat);

  // Take top 2 as favorites
  prefs.favoriteCategories = sortedCategories.slice(0, 2);
}

/**
 * Get learner's game preferences
 */
export function getLearnerPreferences(learnerId: string): GamePreferences | null {
  return learnerPreferences.get(learnerId) ?? null;
}

/**
 * Get learner's recently played games (last 10)
 */
export function getRecentlyPlayedGames(learnerId: string): GameSession[] {
  return completedSessions
    .filter((s) => s.learnerId === learnerId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 10);
}

/**
 * Get game statistics for a learner
 */
export function getGameStats(learnerId: string): {
  totalGamesPlayed: number;
  totalGamesCompleted: number;
  completionRate: number;
  averageHelpfulness: number;
  favoriteCategory: GameCategory | null;
  mostPlayedGame: { gameId: string; playCount: number } | null;
} {
  const sessions = completedSessions.filter((s) => s.learnerId === learnerId);
  const completed = sessions.filter((s) => s.completed);

  // Calculate average helpfulness
  const rated = sessions.filter((s) => s.helpfulnessRating !== undefined);
  const averageHelpfulness =
    rated.length > 0
      ? rated.reduce((sum, s) => sum + (s.helpfulnessRating ?? 0), 0) / rated.length
      : 0;

  // Find most played game
  const gameCounts: Record<string, number> = {};
  for (const session of sessions) {
    gameCounts[session.gameId] = (gameCounts[session.gameId] ?? 0) + 1;
  }

  const mostPlayed = Object.entries(gameCounts).sort(([, a], [, b]) => b - a)[0];

  // Get favorite category from preferences
  const prefs = getLearnerPreferences(learnerId);
  const favoriteCategory = prefs?.favoriteCategories[0] ?? null;

  return {
    totalGamesPlayed: sessions.length,
    totalGamesCompleted: completed.length,
    completionRate: sessions.length > 0 ? completed.length / sessions.length : 0,
    averageHelpfulness,
    favoriteCategory,
    mostPlayedGame: mostPlayed
      ? { gameId: mostPlayed[0], playCount: mostPlayed[1] }
      : null,
  };
}

/**
 * Get active game session for a learner (if any)
 */
export function getActiveGameSession(learnerId: string): GameSession | null {
  for (const session of activeSessions.values()) {
    if (session.learnerId === learnerId) {
      return session;
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function generateSessionId(): string {
  return `game-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Export for testing
export const __testing__ = {
  activeSessions,
  completedSessions,
  learnerPreferences,
  updateFavoriteCategories,
};
