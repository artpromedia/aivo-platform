/**
 * Game API Client for Web Learner Mini-Games
 *
 * Connects to the focus-svc game endpoints:
 * services/focus-svc/src/routes/games.ts
 */

import type {
  GradeBand,
  GameCategory,
  SelfReportedMood,
  GameDefinition,
  GamesListResponse,
  RecommendedGameResponse,
  StartGameResponse,
  EndGameResponse,
  ReturnToFocusResponse,
  PreferencesResponse,
  GameStats,
  ActiveGameResponse,
} from './game-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_FOCUS_API_URL || '/api/focus';

// Helper for API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

// ============ Game List APIs ============

/**
 * Get all games for a grade band
 */
export async function getGamesForGrade(gradeBand: GradeBand): Promise<GamesListResponse> {
  return apiRequest<GamesListResponse>(`/games/${gradeBand}`);
}

/**
 * Get games filtered by category
 */
export async function getGamesByCategory(
  gradeBand: GradeBand,
  category: GameCategory
): Promise<{ gradeBand: GradeBand; category: GameCategory; games: GameDefinition[]; count: number }> {
  return apiRequest(`/games/${gradeBand}/category/${category}`);
}

/**
 * Get details for a specific game
 */
export async function getGameDetails(gameId: string): Promise<{ game: GameDefinition }> {
  return apiRequest(`/games/details/${gameId}`);
}

// ============ Recommendation API ============

/**
 * Get AI-recommended game based on context
 */
export async function getRecommendedGame(params: {
  learnerId: string;
  gradeBand: GradeBand;
  mood?: SelfReportedMood;
  preferredCategory?: GameCategory;
}): Promise<RecommendedGameResponse> {
  return apiRequest<RecommendedGameResponse>('/games/recommended', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============ Game Session APIs ============

/**
 * Start a new game session
 */
export async function startGameSession(params: {
  sessionId: string;
  learnerId: string;
  gameId: string;
  preFocusScore?: number;
}): Promise<StartGameResponse> {
  return apiRequest<StartGameResponse>('/games/start', {
    method: 'POST',
    body: JSON.stringify(params),
  });
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
}): Promise<EndGameResponse> {
  return apiRequest<EndGameResponse>('/games/end', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Record return to focus after game
 */
export async function recordReturnToFocus(params: {
  gameSessionId: string;
  postFocusScore?: number;
}): Promise<ReturnToFocusResponse> {
  return apiRequest<ReturnToFocusResponse>('/games/return-to-focus', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============ Preferences & Stats APIs ============

/**
 * Get learner game preferences and stats
 */
export async function getLearnerPreferences(learnerId: string): Promise<PreferencesResponse> {
  return apiRequest<PreferencesResponse>(`/games/preferences/${learnerId}`);
}

/**
 * Get detailed game statistics for learner
 */
export async function getLearnerGameStats(learnerId: string): Promise<{
  learnerId: string;
  stats: GameStats;
  insights: {
    recentActivity: string;
    satisfaction: string;
  };
}> {
  return apiRequest(`/games/stats/${learnerId}`);
}

/**
 * Check if learner has an active game session
 */
export async function getActiveGameSession(learnerId: string): Promise<ActiveGameResponse> {
  return apiRequest<ActiveGameResponse>(`/games/active/${learnerId}`);
}

// ============ Utility Functions ============

/**
 * Get category icon for display
 */
export function getCategoryIcon(category: GameCategory): string {
  const icons: Record<GameCategory, string> = {
    cognitive: '🧠',
    relaxation: '🧘',
    physical: '💪',
    creative: '🎨',
  };
  return icons[category];
}

/**
 * Get category color class for styling
 */
export function getCategoryColorClass(category: GameCategory): string {
  const colors: Record<GameCategory, string> = {
    cognitive: 'bg-blue-100 text-blue-700 border-blue-200',
    relaxation: 'bg-green-100 text-green-700 border-green-200',
    physical: 'bg-orange-100 text-orange-700 border-orange-200',
    creative: 'bg-purple-100 text-purple-700 border-purple-200',
  };
  return colors[category];
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}min`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Generate encouragement message based on results
 */
export function getEncouragementMessage(
  completed: boolean,
  score?: number,
  maxScore?: number
): string {
  if (!completed) {
    return "No worries! Taking breaks is what matters. Ready to focus again?";
  }

  if (score === undefined || maxScore === undefined) {
    return "Great job completing the activity! You're doing amazing.";
  }

  const percentage = (score / maxScore) * 100;

  if (percentage === 100) {
    return "Perfect score! You're a superstar!";
  }
  if (percentage >= 80) {
    return "Excellent work! You're really getting the hang of this!";
  }
  if (percentage >= 60) {
    return "Good effort! Keep practicing and you'll get even better!";
  }
  if (percentage >= 40) {
    return "Nice try! Every attempt helps your brain grow stronger!";
  }
  return "Thanks for playing! Remember, practice makes progress!";
}

// ============ Mock Data for Development ============

/**
 * Get mock games for development/testing
 */
export function getMockGames(): GameDefinition[] {
  return [
    {
      id: 'breathing-balloon',
      title: 'Balloon Breathing',
      description: 'Breathe in to inflate the balloon, breathe out to deflate. A calming exercise.',
      category: 'relaxation',
      durationSeconds: 60,
      gradeBands: ['K5', 'G6_8', 'G9_12'],
      instructions: [
        'Watch the balloon on screen',
        'Breathe in slowly as it gets bigger',
        'Hold your breath briefly',
        'Breathe out as it gets smaller',
        'Repeat for 5 cycles',
      ],
      config: {
        pattern: 'balloon',
        inhaleSeconds: 4,
        holdInSeconds: 2,
        exhaleSeconds: 4,
        holdOutSeconds: 2,
        cycles: 5,
        visualStyle: 'expanding-circle',
      },
    },
    {
      id: 'memory-shapes-easy',
      title: 'Shape Memory',
      description: 'Match pairs of shapes to train your memory!',
      category: 'cognitive',
      durationSeconds: 60,
      gradeBands: ['K5', 'G6_8'],
      instructions: [
        'Click on a card to flip it over',
        'Try to find matching pairs',
        'Remember where you saw each shape',
        'Match all pairs to win!',
      ],
      config: {
        cardPairs: 4,
        theme: 'shapes',
        revealTime: 1000,
      },
    },
    {
      id: 'pattern-visual-easy',
      title: 'Pattern Match',
      description: 'Watch the pattern and repeat it back!',
      category: 'cognitive',
      durationSeconds: 45,
      gradeBands: ['K5', 'G6_8', 'G9_12'],
      instructions: [
        'Watch the colored squares light up',
        'Remember the order they flash',
        'Tap the squares in the same order',
        'Each round gets longer!',
      ],
      config: {
        sequenceLength: 4,
        speed: 'medium',
        patternType: 'visual',
      },
    },
    {
      id: 'color-match-calm',
      title: 'Color Match',
      description: 'Match colors quickly! A fun brain training game.',
      category: 'cognitive',
      durationSeconds: 60,
      gradeBands: ['K5', 'G6_8', 'G9_12'],
      instructions: [
        'Look at the color shown at the top',
        'Find and tap the matching color below',
        'Be quick but accurate!',
        'Complete all rounds to win',
      ],
      config: {
        colorCount: 4,
        rounds: 5,
        difficulty: 'easy',
      },
    },
    {
      id: 'sequence-numbers',
      title: 'Number Sequence',
      description: 'Put the numbers in order! Practice counting and sequencing.',
      category: 'cognitive',
      durationSeconds: 60,
      gradeBands: ['K5', 'G6_8'],
      instructions: [
        'Look at the scattered numbers',
        'Tap them in order from smallest to largest',
        'Complete the sequence to win!',
      ],
      config: {
        sequenceType: 'numbers',
        length: 5,
        ascending: true,
      },
    },
  ];
}
