/**
 * Adaptive Game Engine
 *
 * Real-time game adaptation engine that:
 * - Tracks player performance during gameplay
 * - Adjusts difficulty dynamically
 * - Generates contextual hints for stuck players
 * - Creates personalized encouragement and celebrations
 * - Tracks learning objectives within games
 */

import { v4 as uuidv4 } from 'uuid';

import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { incrementCounter } from '../providers/metrics-helper.js';

import type { GameType, DifficultyLevel } from './game-templates.js';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface GameSession {
  sessionId: string;
  gameId: string;
  gameType: GameType;
  learnerId: string;
  startTime: Date;
  currentDifficulty: DifficultyLevel;
  performance: PerformanceMetrics;
  state: GameState;
  learningObjectives: LearningObjective[];
}

export interface PerformanceMetrics {
  score: number;
  accuracy: number; // 0-1
  averageResponseTime: number; // ms
  hintsUsed: number;
  completionRate: number; // 0-1
  streakCurrent: number;
  streakBest: number;
  attemptsCorrect: number;
  attemptsTotal: number;
  timeElapsed: number; // seconds
}

export interface GameState {
  currentQuestion?: number;
  totalQuestions?: number;
  isComplete: boolean;
  isPaused: boolean;
  lastActivity: Date;
}

export interface LearningObjective {
  id: string;
  skill: string;
  targetMastery: number; // 0-1
  currentMastery: number; // 0-1
  attemptsCount: number;
}

export interface DifficultyAdjustment {
  shouldAdjust: boolean;
  newDifficulty: DifficultyLevel;
  reason: string;
  confidence: number;
}

export interface HintRequest {
  gameType: GameType;
  currentProblem: string;
  solution: string;
  playerAttempts: string[];
  hintLevel: number; // 1-3, increasing directness
  context?: Record<string, unknown>;
}

export interface GeneratedHint {
  hint: string;
  hintLevel: number;
  encouragement: string;
  suggestedStrategy?: string;
}

export interface FeedbackRequest {
  gameType: GameType;
  attempt: string;
  correctAnswer: string;
  isCorrect: boolean;
  performance: PerformanceMetrics;
  context?: Record<string, unknown>;
}

export interface GeneratedFeedback {
  message: string;
  tone: 'celebration' | 'encouragement' | 'gentle_correction' | 'neutral';
  nextSteps?: string[];
  relatedConcept?: string;
}

export interface CelebrationRequest {
  achievement: string;
  context: {
    score: number;
    accuracy: number;
    streak?: number;
    improvement?: number;
  };
  playerName?: string;
}

export interface GeneratedCelebration {
  message: string;
  emoji: string;
  encouragement: string;
  shareableText?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// SERVICE
// ────────────────────────────────────────────────────────────────────────────

export class AdaptiveGameEngine {
  private sessions: Map<string, GameSession> = new Map();

  constructor(private llm: LLMOrchestrator) {}

  // ──────────────────────────────────────────────────────────────────────────
  // SESSION MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Initialize a new game session
   */
  createSession(
    gameId: string,
    gameType: GameType,
    learnerId: string,
    initialDifficulty: DifficultyLevel,
    learningObjectives: LearningObjective[] = []
  ): GameSession {
    const sessionId = uuidv4();

    const session: GameSession = {
      sessionId,
      gameId,
      gameType,
      learnerId,
      startTime: new Date(),
      currentDifficulty: initialDifficulty,
      performance: {
        score: 0,
        accuracy: 0,
        averageResponseTime: 0,
        hintsUsed: 0,
        completionRate: 0,
        streakCurrent: 0,
        streakBest: 0,
        attemptsCorrect: 0,
        attemptsTotal: 0,
        timeElapsed: 0,
      },
      state: {
        isComplete: false,
        isPaused: false,
        lastActivity: new Date(),
      },
      learningObjectives,
    };

    this.sessions.set(sessionId, session);

    console.info('Game session created', {
      sessionId,
      gameId,
      gameType,
      learnerId,
    });

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): GameSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session performance
   */
  updatePerformance(sessionId: string, update: Partial<PerformanceMetrics>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.performance = {
      ...session.performance,
      ...update,
    };

    // Recalculate derived metrics
    if (session.performance.attemptsTotal > 0) {
      session.performance.accuracy =
        session.performance.attemptsCorrect / session.performance.attemptsTotal;
    }

    session.state.lastActivity = new Date();
  }

  /**
   * Record attempt result
   */
  recordAttempt(sessionId: string, isCorrect: boolean, responseTime: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const perf = session.performance;

    perf.attemptsTotal++;
    if (isCorrect) {
      perf.attemptsCorrect++;
      perf.streakCurrent++;
      perf.streakBest = Math.max(perf.streakBest, perf.streakCurrent);
    } else {
      perf.streakCurrent = 0;
    }

    // Update average response time
    perf.averageResponseTime =
      (perf.averageResponseTime * (perf.attemptsTotal - 1) + responseTime) / perf.attemptsTotal;

    perf.accuracy = perf.attemptsCorrect / perf.attemptsTotal;

    session.state.lastActivity = new Date();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ADAPTIVE DIFFICULTY
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Analyze performance and recommend difficulty adjustment
   */
  async analyzeDifficulty(
    sessionId: string,
    tenantId: string,
    userId: string
  ): Promise<DifficultyAdjustment> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const perf = session.performance;

    // Rule-based initial assessment
    let shouldAdjust = false;
    let newDifficulty = session.currentDifficulty;
    let reason = '';

    // Too easy if high accuracy and fast responses
    if (perf.attemptsTotal >= 5) {
      if (perf.accuracy > 0.9 && perf.averageResponseTime < 3000) {
        if (session.currentDifficulty === 'easy') {
          shouldAdjust = true;
          newDifficulty = 'medium';
          reason = 'High accuracy with fast responses - ready for more challenge';
        } else if (session.currentDifficulty === 'medium') {
          shouldAdjust = true;
          newDifficulty = 'hard';
          reason = 'Mastering current level - advancing to hard difficulty';
        }
      }

      // Too hard if low accuracy or many hints
      if (perf.accuracy < 0.5 || perf.hintsUsed > perf.attemptsTotal * 0.5) {
        if (session.currentDifficulty === 'hard') {
          shouldAdjust = true;
          newDifficulty = 'medium';
          reason = 'Struggling at current level - adjusting to medium difficulty';
        } else if (session.currentDifficulty === 'medium') {
          shouldAdjust = true;
          newDifficulty = 'easy';
          reason = 'Building confidence - adjusting to easy difficulty';
        }
      }
    }

    // Use AI for nuanced assessment
    if (perf.attemptsTotal >= 10) {
      const aiAssessment = await this.getAIDifficultyAssessment(session, tenantId, userId);
      if (aiAssessment.shouldAdjust && aiAssessment.confidence > 0.7) {
        shouldAdjust = aiAssessment.shouldAdjust;
        newDifficulty = aiAssessment.newDifficulty;
        reason = aiAssessment.reason;
      }
    }

    return {
      shouldAdjust,
      newDifficulty,
      reason,
      confidence: perf.attemptsTotal >= 10 ? 0.9 : 0.6,
    };
  }

  /**
   * Apply difficulty adjustment
   */
  applyDifficultyAdjustment(sessionId: string, newDifficulty: DifficultyLevel): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const oldDifficulty = session.currentDifficulty;
    session.currentDifficulty = newDifficulty;

    console.info('Difficulty adjusted', {
      sessionId,
      oldDifficulty,
      newDifficulty,
      performance: session.performance,
    });

    incrementCounter('game_difficulty.adjusted');
    incrementCounter(`game_difficulty.to_${newDifficulty}`);
  }

  /**
   * Get AI-powered difficulty assessment
   */
  private async getAIDifficultyAssessment(
    session: GameSession,
    tenantId: string,
    userId: string
  ): Promise<DifficultyAdjustment> {
    const prompt = `Analyze this learner's game performance and recommend difficulty adjustment:

Game Type: ${session.gameType}
Current Difficulty: ${session.currentDifficulty}

Performance Metrics:
- Accuracy: ${(session.performance.accuracy * 100).toFixed(1)}%
- Average Response Time: ${(session.performance.averageResponseTime / 1000).toFixed(1)}s
- Hints Used: ${session.performance.hintsUsed} / ${session.performance.attemptsTotal} attempts
- Current Streak: ${session.performance.streakCurrent}
- Best Streak: ${session.performance.streakBest}
- Total Attempts: ${session.performance.attemptsTotal}

Should the difficulty be adjusted? Consider:
1. Is the learner consistently succeeding or struggling?
2. Are they using too many hints?
3. Are response times indicating boredom (too fast) or struggle (too slow)?
4. Is the current difficulty appropriate for their performance pattern?

Return JSON:
{
  "shouldAdjust": boolean,
  "newDifficulty": "easy" | "medium" | "hard",
  "reason": "clear explanation",
  "confidence": 0.0-1.0
}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          'You are an expert in adaptive learning systems. Analyze performance data and recommend appropriate difficulty adjustments.',
      },
      { role: 'user', content: prompt },
    ];

    try {
      const result = await this.llm.complete(messages, {
        temperature: 0.3,
        maxTokens: 300,
        metadata: {
          tenantId,
          userId,
          agentType: 'GAME_ADAPTER',
        },
      });

      const parsed = this.parseStructuredResponse(result.content);

      return {
        shouldAdjust: (parsed.shouldAdjust as boolean) ?? false,
        newDifficulty: (parsed.newDifficulty as DifficultyLevel) ?? session.currentDifficulty,
        reason: (parsed.reason as string) ?? 'No adjustment needed',
        confidence: (parsed.confidence as number) ?? 0.5,
      };
    } catch (error) {
      console.error('Failed to get AI difficulty assessment', { error });
      return {
        shouldAdjust: false,
        newDifficulty: session.currentDifficulty,
        reason: 'Assessment failed',
        confidence: 0,
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HINT GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Generate contextual hint for stuck player
   */
  async generateHint(request: HintRequest, tenantId: string, userId: string): Promise<GeneratedHint> {
    incrementCounter('game_hint.requested');
    incrementCounter(`game_hint.level_${request.hintLevel}`);

    const hintDescriptions = [
      'subtle - just point them in the right direction',
      'moderate - provide more guidance without giving away the answer',
      'direct - give strong guidance that helps them solve it',
    ];

    const prompt = `Generate a helpful hint for a learner stuck on this problem:

Game Type: ${request.gameType}
Problem: ${request.currentProblem}
Correct Solution: ${request.solution}
Player's Previous Attempts: ${request.playerAttempts.join(', ')}
Hint Level: ${request.hintLevel}/3 (${hintDescriptions[request.hintLevel - 1]})

Create a hint that:
1. Is appropriate for hint level ${request.hintLevel}
2. Guides without giving away the answer
3. Addresses common mistakes in their attempts
4. Is encouraging and supportive
5. Teaches the underlying concept

Return JSON:
{
  "hint": "the hint text",
  "encouragement": "encouraging message",
  "suggestedStrategy": "optional strategy tip"
}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          'You are an expert educational tutor who creates hints that guide learners to discovery without simply giving answers.',
      },
      { role: 'user', content: prompt },
    ];

    try {
      const result = await this.llm.complete(messages, {
        temperature: 0.7,
        maxTokens: 300,
        metadata: {
          tenantId,
          userId,
          agentType: 'GAME_HINT',
        },
      });

      const parsed = this.parseStructuredResponse(result.content);

      incrementCounter('game_hint.generated');

      return {
        hint: (parsed.hint as string) ?? 'Think about the problem step by step.',
        hintLevel: request.hintLevel,
        encouragement: (parsed.encouragement as string) ?? "You're on the right track!",
        suggestedStrategy: parsed.suggestedStrategy as string | undefined,
      };
    } catch (error) {
      console.error('Failed to generate hint', { error });
      incrementCounter('game_hint.error');

      return {
        hint: 'Take your time and think carefully about each step.',
        hintLevel: request.hintLevel,
        encouragement: 'You can do this!',
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FEEDBACK GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Generate feedback for an attempt
   */
  async generateFeedback(request: FeedbackRequest, tenantId: string, userId: string): Promise<GeneratedFeedback> {
    const tone = this.determineFeedbackTone(request);

    const prompt = `Generate ${tone} feedback for this game attempt:

Game Type: ${request.gameType}
Student's Attempt: ${request.attempt}
Correct Answer: ${request.correctAnswer}
Is Correct: ${request.isCorrect}

Performance Context:
- Current Accuracy: ${(request.performance.accuracy * 100).toFixed(1)}%
- Current Streak: ${request.performance.streakCurrent}

Create feedback that:
1. Matches the ${tone} tone
2. ${request.isCorrect ? 'Celebrates the success and explains why it works' : 'Gently explains the error and guides toward the correct approach'}
3. Is brief and encouraging
4. Maintains learner motivation

Return JSON:
{
  "message": "the feedback message",
  "tone": "${tone}",
  "nextSteps": ["optional", "next steps"],
  "relatedConcept": "optional related concept"
}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are a supportive educational tutor who provides encouraging, constructive feedback.',
      },
      { role: 'user', content: prompt },
    ];

    try {
      const result = await this.llm.complete(messages, {
        temperature: 0.7,
        maxTokens: 200,
        metadata: {
          tenantId,
          userId,
          agentType: 'GAME_FEEDBACK',
        },
      });

      const parsed = this.parseStructuredResponse(result.content);

      return {
        message: (parsed.message as string) ?? (request.isCorrect ? 'Great job!' : 'Keep trying!'),
        tone,
        nextSteps: (parsed.nextSteps as string[]) ?? undefined,
        relatedConcept: (parsed.relatedConcept as string) ?? undefined,
      };
    } catch (error) {
      console.error('Failed to generate feedback', { error });

      return {
        message: request.isCorrect ? 'Excellent work!' : 'Not quite, but keep going!',
        tone,
      };
    }
  }

  /**
   * Determine appropriate feedback tone
   */
  private determineFeedbackTone(request: FeedbackRequest): GeneratedFeedback['tone'] {
    if (request.isCorrect) {
      if (request.performance.streakCurrent >= 3) {
        return 'celebration';
      }
      return 'encouragement';
    } else {
      if (request.performance.accuracy < 0.4) {
        return 'gentle_correction';
      }
      return 'encouragement';
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CELEBRATION GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Generate celebration message for achievements
   */
  async generateCelebration(
    request: CelebrationRequest,
    tenantId: string,
    userId: string
  ): Promise<GeneratedCelebration> {
    const prompt = `Create an exciting celebration message for this achievement:

Achievement: ${request.achievement}
Score: ${request.context.score}
Accuracy: ${(request.context.accuracy * 100).toFixed(1)}%
${request.context.streak ? `Streak: ${request.context.streak}` : ''}
${request.context.improvement ? `Improvement: ${request.context.improvement}%` : ''}
${request.playerName ? `Player: ${request.playerName}` : ''}

Create a celebration that:
1. Is genuinely enthusiastic and specific to the achievement
2. Recognizes the effort and skill demonstrated
3. Is age-appropriate and encouraging
4. Includes a fun emoji
5. Creates a shareable moment

Return JSON:
{
  "message": "main celebration message",
  "emoji": "single celebratory emoji",
  "encouragement": "encouraging message to keep going",
  "shareableText": "formatted text for sharing"
}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are an enthusiastic coach who creates memorable celebrations for learner achievements.',
      },
      { role: 'user', content: prompt },
    ];

    try {
      const result = await this.llm.complete(messages, {
        temperature: 0.8,
        maxTokens: 200,
        metadata: {
          tenantId,
          userId,
          agentType: 'GAME_CELEBRATION',
        },
      });

      const parsed = this.parseStructuredResponse(result.content);

      return {
        message: (parsed.message as string) ?? 'Amazing work!',
        emoji: (parsed.emoji as string) ?? '🎉',
        encouragement: (parsed.encouragement as string) ?? "Keep up the great work!",
        shareableText: parsed.shareableText as string | undefined,
      };
    } catch (error) {
      console.error('Failed to generate celebration', { error });

      return {
        message: 'Fantastic achievement!',
        emoji: '🌟',
        encouragement: "You're doing great!",
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LEARNING OBJECTIVE TRACKING
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Update learning objective progress
   */
  updateObjectiveProgress(sessionId: string, skillId: string, success: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const objective = session.learningObjectives.find((obj) => obj.id === skillId);
    if (!objective) return;

    objective.attemptsCount++;

    // Update mastery using exponential moving average
    const weight = 0.3; // How much weight to give to new attempts
    const attemptValue = success ? 1 : 0;
    objective.currentMastery = objective.currentMastery * (1 - weight) + attemptValue * weight;

    console.info('Learning objective updated', {
      sessionId,
      skillId,
      mastery: objective.currentMastery,
      attempts: objective.attemptsCount,
    });
  }

  /**
   * Get learning objective progress for session
   */
  getObjectiveProgress(sessionId: string): LearningObjective[] {
    const session = this.sessions.get(sessionId);
    return session?.learningObjectives ?? [];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Parse structured JSON response
   */
  private parseStructuredResponse(content: string): Record<string, unknown> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {};
      }
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch (error) {
      console.error('Failed to parse structured response', { error });
      return {};
    }
  }

  /**
   * Clean up old sessions
   */
  cleanupSessions(maxAgeHours: number = 24): void {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now.getTime() - session.startTime.getTime();
      if (age > maxAge) {
        this.sessions.delete(sessionId);
        console.info('Session cleaned up', { sessionId, ageHours: age / (60 * 60 * 1000) });
      }
    }
  }
}
