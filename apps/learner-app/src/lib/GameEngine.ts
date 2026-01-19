/**
 * GameEngine - Core game management system
 * Handles game state, scoring, progression, and analytics
 */

import { supabase } from './supabase';

// Game Types
export type GameType =
  | 'memory'
  | 'matching'
  | 'sorting'
  | 'puzzle'
  | 'word_hunt'
  | 'math_race'
  | 'pattern'
  | 'sequencing'
  | 'spelling_bee'
  | 'focus_breathing';

export type GameDifficulty = 'easy' | 'medium' | 'hard' | 'adaptive';

export type GameState = 'idle' | 'loading' | 'intro' | 'playing' | 'paused' | 'complete' | 'failed';

// Interfaces
export interface GameConfig {
  id: string;
  type: GameType;
  title: string;
  description: string;
  difficulty: GameDifficulty;
  timeLimit?: number; // seconds
  maxAttempts?: number;
  targetScore?: number;
  subject?: string;
  gradeLevel?: string;
  adaptiveParams?: AdaptiveGameParams;
}

export interface AdaptiveGameParams {
  initialDifficulty: number; // 1-10
  difficultyStep: number;
  successThreshold: number; // % accuracy to increase difficulty
  failureThreshold: number; // % accuracy to decrease difficulty
  minDifficulty: number;
  maxDifficulty: number;
}

export interface GameSession {
  id: string;
  gameId: string;
  learnerId: string;
  startedAt: string;
  endedAt?: string;
  state: GameState;
  score: number;
  maxScore: number;
  accuracy: number;
  streak: number;
  bestStreak: number;
  attemptsUsed: number;
  hintsUsed: number;
  timeSpent: number;
  currentLevel: number;
  livesRemaining: number;
  itemsCompleted: number;
  totalItems: number;
}

export interface GameItem {
  id: string;
  content: string | Record<string, unknown>;
  type: string;
  difficulty: number;
  points: number;
  timeBonus?: number;
}

export interface GameResult {
  sessionId: string;
  gameId: string;
  learnerId: string;
  score: number;
  maxScore: number;
  accuracy: number;
  timeSpent: number;
  streak: number;
  bestStreak: number;
  level: number;
  stars: number; // 0-3
  xpEarned: number;
  coinsEarned: number;
  achievements: string[];
  newHighScore: boolean;
  perfectGame: boolean;
}

export interface GameAnswer {
  itemId: string;
  answer: string | number | string[];
  correct: boolean;
  timeToAnswer: number;
  hintsUsed: number;
}

// Game Engine Class
export class GameEngine {
  private session: GameSession | null = null;
  private config: GameConfig | null = null;
  private answers: GameAnswer[] = [];
  private startTime: number = 0;
  private pauseTime: number = 0;
  private totalPauseTime: number = 0;
  private onStateChange?: (state: GameState) => void;
  private onScoreChange?: (score: number, streak: number) => void;
  private onComplete?: (result: GameResult) => void;

  constructor(options?: {
    onStateChange?: (state: GameState) => void;
    onScoreChange?: (score: number, streak: number) => void;
    onComplete?: (result: GameResult) => void;
  }) {
    this.onStateChange = options?.onStateChange;
    this.onScoreChange = options?.onScoreChange;
    this.onComplete = options?.onComplete;
  }

  /**
   * Initialize a new game session
   */
  async startGame(config: GameConfig, learnerId: string): Promise<GameSession> {
    this.config = config;
    this.answers = [];
    this.startTime = Date.now();
    this.pauseTime = 0;
    this.totalPauseTime = 0;

    // Create session
    this.session = {
      id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      gameId: config.id,
      learnerId,
      startedAt: new Date().toISOString(),
      state: 'intro',
      score: 0,
      maxScore: 0,
      accuracy: 0,
      streak: 0,
      bestStreak: 0,
      attemptsUsed: 0,
      hintsUsed: 0,
      timeSpent: 0,
      currentLevel: 1,
      livesRemaining: 3,
      itemsCompleted: 0,
      totalItems: 0,
    };

    // Save to database
    await supabase.from('game_sessions').insert({
      id: this.session.id,
      game_id: config.id,
      learner_id: learnerId,
      game_type: config.type,
      difficulty: config.difficulty,
      started_at: this.session.startedAt,
      state: 'intro',
    });

    this.updateState('intro');
    return this.session;
  }

  /**
   * Start playing (after intro)
   */
  play(): void {
    if (!this.session) return;
    this.startTime = Date.now();
    this.updateState('playing');
  }

  /**
   * Pause the game
   */
  pause(): void {
    if (!this.session || this.session.state !== 'playing') return;
    this.pauseTime = Date.now();
    this.updateState('paused');
  }

  /**
   * Resume from pause
   */
  resume(): void {
    if (!this.session || this.session.state !== 'paused') return;
    if (this.pauseTime > 0) {
      this.totalPauseTime += Date.now() - this.pauseTime;
      this.pauseTime = 0;
    }
    this.updateState('playing');
  }

  /**
   * Submit an answer for a game item
   */
  submitAnswer(itemId: string, answer: string | number | string[], correct: boolean, points: number): void {
    if (!this.session || this.session.state !== 'playing') return;

    const timeToAnswer = this.getElapsedTime();

    // Record answer
    const gameAnswer: GameAnswer = {
      itemId,
      answer,
      correct,
      timeToAnswer,
      hintsUsed: 0,
    };
    this.answers.push(gameAnswer);

    // Update session
    this.session.attemptsUsed++;
    this.session.itemsCompleted++;

    if (correct) {
      // Calculate score with time bonus
      const timeBonus = this.calculateTimeBonus(timeToAnswer);
      const streakBonus = this.calculateStreakBonus();
      const totalPoints = points + timeBonus + streakBonus;

      this.session.score += totalPoints;
      this.session.streak++;
      this.session.bestStreak = Math.max(this.session.bestStreak, this.session.streak);
    } else {
      this.session.streak = 0;
      this.session.livesRemaining--;

      // Check for game over
      if (this.session.livesRemaining <= 0) {
        this.endGame('failed');
        return;
      }
    }

    // Update accuracy
    const correctCount = this.answers.filter(a => a.correct).length;
    this.session.accuracy = (correctCount / this.answers.length) * 100;

    // Notify listeners
    this.onScoreChange?.(this.session.score, this.session.streak);
  }

  /**
   * Use a hint
   */
  useHint(): boolean {
    if (!this.session || this.session.state !== 'playing') return false;

    this.session.hintsUsed++;
    return true;
  }

  /**
   * Advance to next level
   */
  nextLevel(): void {
    if (!this.session) return;
    this.session.currentLevel++;

    // Reset streak on level change (optional)
    // this.session.streak = 0;
  }

  /**
   * End the game
   */
  async endGame(reason: 'complete' | 'failed' | 'timeout' | 'quit'): Promise<GameResult> {
    if (!this.session || !this.config) {
      throw new Error('No active game session');
    }

    const timeSpent = this.getElapsedTime();
    this.session.timeSpent = timeSpent;
    this.session.endedAt = new Date().toISOString();

    const state: GameState = reason === 'complete' ? 'complete' : 'failed';
    this.updateState(state);

    // Calculate final results
    const result = this.calculateResults();

    // Save to database
    await this.saveGameResults(result);

    // Notify listener
    this.onComplete?.(result);

    return result;
  }

  /**
   * Get current session state
   */
  getSession(): GameSession | null {
    return this.session;
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedTime(): number {
    if (!this.startTime) return 0;
    const now = Date.now();
    const elapsed = now - this.startTime - this.totalPauseTime;
    return Math.floor(elapsed / 1000);
  }

  /**
   * Get remaining time (if time limit set)
   */
  getRemainingTime(): number | null {
    if (!this.config?.timeLimit) return null;
    const elapsed = this.getElapsedTime();
    return Math.max(0, this.config.timeLimit - elapsed);
  }

  // Private methods

  private updateState(state: GameState): void {
    if (this.session) {
      this.session.state = state;
      this.onStateChange?.(state);
    }
  }

  private calculateTimeBonus(timeToAnswer: number): number {
    // Faster answers get more bonus points (up to 10 points)
    const maxBonusTime = 5; // seconds
    if (timeToAnswer <= maxBonusTime) {
      return Math.floor(10 * (1 - timeToAnswer / maxBonusTime));
    }
    return 0;
  }

  private calculateStreakBonus(): number {
    if (!this.session) return 0;
    // Streak bonus increases with consecutive correct answers
    return Math.min(this.session.streak * 2, 20);
  }

  private calculateResults(): GameResult {
    if (!this.session || !this.config) {
      throw new Error('No active game session');
    }

    const correctCount = this.answers.filter(a => a.correct).length;
    const totalItems = this.answers.length;
    const accuracy = totalItems > 0 ? (correctCount / totalItems) * 100 : 0;

    // Calculate stars (0-3)
    let stars = 0;
    if (accuracy >= 90) stars = 3;
    else if (accuracy >= 70) stars = 2;
    else if (accuracy >= 50) stars = 1;

    // Calculate XP and coins
    const baseXP = this.session.score;
    const streakBonus = this.session.bestStreak * 5;
    const perfectBonus = accuracy === 100 ? 50 : 0;
    const xpEarned = baseXP + streakBonus + perfectBonus;

    const coinsEarned = Math.floor(xpEarned / 10) + stars * 5;

    // Check for achievements
    const achievements: string[] = [];
    if (accuracy === 100) achievements.push('perfect_game');
    if (this.session.bestStreak >= 10) achievements.push('streak_master');
    if (this.session.bestStreak >= 5) achievements.push('on_fire');
    if (this.session.hintsUsed === 0) achievements.push('no_hints');
    if (this.session.timeSpent < 60) achievements.push('speed_demon');

    return {
      sessionId: this.session.id,
      gameId: this.config.id,
      learnerId: this.session.learnerId,
      score: this.session.score,
      maxScore: this.session.maxScore,
      accuracy,
      timeSpent: this.session.timeSpent,
      streak: this.session.streak,
      bestStreak: this.session.bestStreak,
      level: this.session.currentLevel,
      stars,
      xpEarned,
      coinsEarned,
      achievements,
      newHighScore: false, // Will be set after comparing with DB
      perfectGame: accuracy === 100,
    };
  }

  private async saveGameResults(result: GameResult): Promise<void> {
    // Check for high score
    const { data: existingHighScore } = await supabase
      .from('game_high_scores')
      .select('score')
      .eq('learner_id', result.learnerId)
      .eq('game_id', result.gameId)
      .single();

    result.newHighScore = !existingHighScore || result.score > existingHighScore.score;

    // Update session in database
    await supabase
      .from('game_sessions')
      .update({
        ended_at: this.session?.endedAt,
        state: this.session?.state,
        score: result.score,
        accuracy: result.accuracy,
        time_spent: result.timeSpent,
        streak: result.streak,
        best_streak: result.bestStreak,
        hints_used: this.session?.hintsUsed,
        level_reached: result.level,
        stars: result.stars,
        xp_earned: result.xpEarned,
        coins_earned: result.coinsEarned,
      })
      .eq('id', this.session?.id);

    // Save high score if new
    if (result.newHighScore) {
      await supabase
        .from('game_high_scores')
        .upsert({
          learner_id: result.learnerId,
          game_id: result.gameId,
          score: result.score,
          achieved_at: new Date().toISOString(),
        });
    }

    // Award XP and coins
    await supabase.rpc('award_learner_rewards', {
      p_learner_id: result.learnerId,
      p_xp: result.xpEarned,
      p_coins: result.coinsEarned,
    });

    // Check and award achievements
    for (const achievementId of result.achievements) {
      await supabase
        .from('learner_achievements')
        .upsert({
          learner_id: result.learnerId,
          achievement_id: achievementId,
          unlocked_at: new Date().toISOString(),
        }, {
          onConflict: 'learner_id,achievement_id',
          ignoreDuplicates: true,
        });
    }
  }
}

// Game item generators for different game types

export function generateMemoryItems(count: number, difficulty: number): GameItem[] {
  const emojis = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍑', '🍌', '🥭', '🍍', '🥥'];
  const pairCount = Math.min(Math.floor(count / 2), emojis.length);
  const selected = emojis.slice(0, pairCount);

  const items: GameItem[] = [];
  selected.forEach((emoji, index) => {
    // Create pairs
    items.push(
      { id: `mem_${index}_a`, content: emoji, type: 'card', difficulty, points: 10 },
      { id: `mem_${index}_b`, content: emoji, type: 'card', difficulty, points: 10 }
    );
  });

  // Shuffle
  return items.sort(() => Math.random() - 0.5);
}

export function generateMatchingItems(pairs: { left: string; right: string }[]): GameItem[] {
  const items: GameItem[] = [];

  pairs.forEach((pair, index) => {
    items.push(
      { id: `match_left_${index}`, content: pair.left, type: 'left', difficulty: 1, points: 15 },
      { id: `match_right_${index}`, content: pair.right, type: 'right', difficulty: 1, points: 15 }
    );
  });

  return items;
}

export function generateMathItems(level: number, count: number): GameItem[] {
  const items: GameItem[] = [];

  for (let i = 0; i < count; i++) {
    const maxNum = level * 10;
    const a = Math.floor(Math.random() * maxNum) + 1;
    const b = Math.floor(Math.random() * maxNum) + 1;
    const operators = ['+', '-'];
    if (level >= 3) operators.push('×');
    if (level >= 5) operators.push('÷');

    const op = operators[Math.floor(Math.random() * operators.length)];
    let answer: number;
    let question: string;

    switch (op) {
      case '+':
        answer = a + b;
        question = `${a} + ${b}`;
        break;
      case '-':
        answer = Math.max(a, b) - Math.min(a, b);
        question = `${Math.max(a, b)} - ${Math.min(a, b)}`;
        break;
      case '×':
        answer = a * b;
        question = `${a} × ${b}`;
        break;
      case '÷':
        answer = a;
        question = `${a * b} ÷ ${b}`;
        break;
      default:
        answer = a + b;
        question = `${a} + ${b}`;
    }

    items.push({
      id: `math_${i}`,
      content: { question, answer },
      type: 'math_problem',
      difficulty: level,
      points: 10 + level * 5,
      timeBonus: 10,
    });
  }

  return items;
}

export function generateWordHuntItems(words: string[], gridSize: number = 10): GameItem[] {
  // For word hunt, content contains the word and its position info
  return words.map((word, index) => ({
    id: `word_${index}`,
    content: { word: word.toUpperCase(), found: false },
    type: 'hidden_word',
    difficulty: Math.ceil(word.length / 3),
    points: word.length * 5,
  }));
}

export function generatePatternItems(difficulty: number): GameItem[] {
  const patterns = [
    { sequence: [1, 2, 3, 4], next: 5, difficulty: 1 },
    { sequence: [2, 4, 6, 8], next: 10, difficulty: 2 },
    { sequence: [1, 3, 5, 7], next: 9, difficulty: 2 },
    { sequence: [1, 4, 9, 16], next: 25, difficulty: 3 },
    { sequence: [1, 1, 2, 3, 5], next: 8, difficulty: 4 },
    { sequence: [2, 6, 18, 54], next: 162, difficulty: 5 },
  ];

  return patterns
    .filter(p => p.difficulty <= difficulty)
    .map((pattern, index) => ({
      id: `pattern_${index}`,
      content: pattern,
      type: 'number_pattern',
      difficulty: pattern.difficulty,
      points: pattern.difficulty * 15,
    }));
}

export default GameEngine;
