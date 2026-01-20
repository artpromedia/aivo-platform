/**
 * Games API Client
 *
 * Client for interacting with the game-library-svc API
 */

const API_BASE = process.env.NEXT_PUBLIC_GAME_LIBRARY_API_URL || 'http://localhost:8082/api/games';

export type GameType = 'FOCUS_BREAK' | 'BRAIN_TRAINING' | 'EDUCATIONAL' | 'REWARD' | 'RELAXATION';
export type GameCategory = 'PUZZLE' | 'MEMORY' | 'REACTION' | 'PATTERN' | 'RELAXATION' | 'MOVEMENT' | 'CREATIVE' | 'MATH' | 'LANGUAGE';
export type GradeBand = 'K_2' | 'G3_5' | 'G6_8' | 'G9_12';
export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

export interface GameSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: GameType;
  category: GameCategory;
  thumbnailUrl?: string;
  gradeBands: GradeBand[];
  estimatedDurationSec: number;
  xpReward: number;
  coinReward: number;
}

export interface GameDefinition extends GameSummary {
  minAge: number;
  maxAge: number;
  cognitiveSkills: string[];
  gameConfig: Record<string, unknown>;
  instructions: string[];
}

export interface GameRecommendation {
  game: GameSummary;
  reason: 'FOCUS_BREAK' | 'BRAIN_TRAINING' | 'SKILL_BUILDING' | 'REWARD' | 'NEW' | 'DAILY_CHALLENGE';
  priority: number;
}

export interface GameSessionResponse {
  id: string;
  gameId: string;
  gameSlug: string;
  status: SessionStatus;
  score?: number;
  stars?: number;
  xpEarned: number;
  coinsEarned: number;
  isPersonalBest: boolean;
  startedAt: string;
  endedAt?: string;
}

export interface StartSessionRequest {
  gameSlug: string;
  learnerId: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface EndSessionRequest {
  sessionId: string;
  score: number;
  stars: number;
  completed: boolean;
  metrics: {
    correctAnswers: number;
    totalAttempts: number;
    averageResponseTime: number;
    duration: number;
    levelReached?: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  learnerId: string;
  learnerName: string;
  avatarUrl?: string;
  score: number;
  isCurrentUser?: boolean;
}

export interface GamesFilter {
  type?: GameType;
  category?: GameCategory;
  gradeBand?: GradeBand;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch all available games with optional filtering
 */
export async function getGames(filter?: GamesFilter): Promise<GameSummary[]> {
  const params = new URLSearchParams();
  if (filter?.type) params.set('type', filter.type);
  if (filter?.category) params.set('category', filter.category);
  if (filter?.gradeBand) params.set('gradeBand', filter.gradeBand);
  if (filter?.search) params.set('search', filter.search);
  if (filter?.limit) params.set('limit', filter.limit.toString());
  if (filter?.offset) params.set('offset', filter.offset.toString());

  const response = await fetch(`${API_BASE}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch games');
  }
  return response.json();
}

/**
 * Fetch a single game by slug
 */
export async function getGameBySlug(slug: string): Promise<GameDefinition> {
  const response = await fetch(`${API_BASE}/${slug}`);
  if (!response.ok) {
    throw new Error('Failed to fetch game');
  }
  return response.json();
}

/**
 * Get personalized game recommendations for a learner
 */
export async function getRecommendations(
  learnerId: string,
  gradeBand: GradeBand,
  context?: 'FOCUS_BREAK' | 'BRAIN_TRAINING' | 'REWARD'
): Promise<GameRecommendation[]> {
  const params = new URLSearchParams({
    learnerId,
    gradeBand,
  });
  if (context) params.set('context', context);

  const response = await fetch(`${API_BASE}/recommendations?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch recommendations');
  }
  return response.json();
}

/**
 * Start a new game session
 */
export async function startSession(request: StartSessionRequest): Promise<GameSessionResponse> {
  const response = await fetch(`${API_BASE}/sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error('Failed to start game session');
  }
  return response.json();
}

/**
 * End a game session with results
 */
export async function endSession(request: EndSessionRequest): Promise<GameSessionResponse> {
  const response = await fetch(`${API_BASE}/sessions/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error('Failed to end game session');
  }
  return response.json();
}

/**
 * Abandon a game session (user quit early)
 */
export async function abandonSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/abandon`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to abandon game session');
  }
}

/**
 * Get leaderboard for a specific game
 */
export async function getGameLeaderboard(
  gameSlug: string,
  period: 'daily' | 'weekly' | 'all-time' = 'weekly',
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({
    period,
    limit: limit.toString(),
  });

  const response = await fetch(`${API_BASE}/${gameSlug}/leaderboard?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }
  return response.json();
}

/**
 * Get learner's stats for a specific game
 */
export async function getPlayerStats(
  learnerId: string,
  gameSlug: string
): Promise<{
  totalPlays: number;
  highScore: number;
  averageScore: number;
  totalXP: number;
  bestTime?: number;
  lastPlayed?: string;
}> {
  const response = await fetch(`${API_BASE}/${gameSlug}/stats/${learnerId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch player stats');
  }
  return response.json();
}

/**
 * Get learner's recently played games
 */
export async function getRecentlyPlayed(
  learnerId: string,
  limit: number = 5
): Promise<{ gameSlug: string; lastPlayed: string; playCount: number }[]> {
  const params = new URLSearchParams({
    limit: limit.toString(),
  });

  const response = await fetch(`${API_BASE}/recent/${learnerId}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch recently played games');
  }
  return response.json();
}

/**
 * Toggle favorite status for a game
 */
export async function toggleFavorite(learnerId: string, gameSlug: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/${gameSlug}/favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId }),
  });
  if (!response.ok) {
    throw new Error('Failed to toggle favorite');
  }
  const result = await response.json();
  return result.isFavorite;
}

/**
 * Get learner's favorite games
 */
export async function getFavorites(learnerId: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/favorites/${learnerId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch favorites');
  }
  return response.json();
}

/**
 * Submit game rating
 */
export async function rateGame(
  learnerId: string,
  gameSlug: string,
  helpful: boolean
): Promise<void> {
  const response = await fetch(`${API_BASE}/${gameSlug}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, helpful }),
  });
  if (!response.ok) {
    throw new Error('Failed to submit rating');
  }
}
