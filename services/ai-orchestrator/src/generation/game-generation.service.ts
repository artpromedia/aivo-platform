/**
 * Game Generation Service
 *
 * AI-powered procedural game generation with:
 * - Multiple game types (word puzzles, math challenges, pattern games, etc.)
 * - Difficulty adaptation based on learner level
 * - Content personalization using learner's vocabulary and topics
 * - Dynamic game parameters, questions, and assets
 */

import { v4 as uuidv4 } from 'uuid';

import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

import {
  type GameType,
  type GameTemplate,
  type DifficultyLevel,
  getTemplateByType,
  getParametersForDifficulty,
  getTemplatesForGrade,
  GAME_TEMPLATES,
} from './game-templates.js';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface GameGenerationRequest {
  learnerId: string;
  tenantId: string;
  userId: string;
  gameType: GameType;
  subject?: string;
  topic?: string;
  gradeLevel: number;
  difficulty?: DifficultyLevel;
  learnerProfile?: LearnerProfile;
  customParameters?: Record<string, unknown>;
  includeInstructions?: boolean;
}

export interface LearnerProfile {
  vocabulary?: string[];
  interests?: string[];
  currentTopics?: string[];
  skillLevel?: Record<string, number>; // subject -> 0-1 mastery
  preferredDifficulty?: DifficultyLevel;
}

export interface GeneratedGame {
  id: string;
  gameType: GameType;
  title: string;
  description: string;
  instructions: string[];
  difficulty: DifficultyLevel;
  estimatedDuration: number; // seconds
  parameters: Record<string, unknown>;
  gameData: GameData;
  scoring: ScoringConfig;
  metadata: GameMetadata;
}

export interface GameData {
  // Specific to game type - flexible structure
  [key: string]: unknown;
}

export interface ScoringConfig {
  maxPoints: number;
  timeBonus: boolean;
  accuracyRequired: number; // 0-1
  streakMultiplier: number;
  hintPenalty: number;
}

export interface GameMetadata {
  generatedAt: Date;
  model: string;
  provider: string;
  tokensUsed: number;
  latencyMs: number;
  template: string;
  personalizedFor: string;
}

const GAME_GENERATION_SYSTEM_PROMPT = `You are an expert educational game designer specializing in adaptive learning games.

When generating games:
- Create engaging, age-appropriate content
- Personalize based on learner's interests and vocabulary
- Ensure proper difficulty calibration
- Include clear instructions
- Make content educational and fun
- Consider accessibility and clarity
- Provide hints that guide without giving away answers
- Generate diverse content to maintain engagement`;

// ────────────────────────────────────────────────────────────────────────────
// SERVICE
// ────────────────────────────────────────────────────────────────────────────

export class GameGenerationService {
  constructor(private llm: LLMOrchestrator) {}

  /**
   * Generate a new adaptive game for a learner
   */
  async generateGame(request: GameGenerationRequest): Promise<GeneratedGame> {
    const generationId = uuidv4();
    const startTime = Date.now();

    console.info('Starting game generation', {
      generationId,
      gameType: request.gameType,
      learnerId: request.learnerId,
    });

    try {
      incrementCounter('game_generation.started');
      incrementCounter(`game_generation.type.${request.gameType}`);

      // Get game template
      const template = getTemplateByType(request.gameType);

      // Determine difficulty
      const difficulty = this.determineDifficulty(request, template);

      // Get parameters for difficulty level
      const baseParams = getParametersForDifficulty(template, difficulty);
      const parameters = {
        ...baseParams,
        ...request.customParameters,
      };

      // Build generation prompt
      const prompt = this.buildGamePrompt(request, template, difficulty, parameters);

      const messages: LLMMessage[] = [
        { role: 'system', content: GAME_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ];

      // Generate game content
      const result = await this.llm.complete(messages, {
        temperature: 0.8, // Higher for creative game generation
        maxTokens: 3000,
        metadata: {
          tenantId: request.tenantId,
          userId: request.userId,
          agentType: 'GAME_GENERATOR',
        },
      });

      // Parse response
      const gameData = this.parseGameResponse(result.content, template);

      // Generate instructions if requested
      const instructions = request.includeInstructions
        ? await this.generateInstructions(request, template, difficulty)
        : this.getDefaultInstructions(template);

      // Create game object
      const game: GeneratedGame = {
        id: generationId,
        gameType: request.gameType,
        title: this.generateTitle(request, template),
        description: template.description,
        instructions,
        difficulty,
        estimatedDuration: template.mechanics.duration,
        parameters,
        gameData,
        scoring: {
          maxPoints: this.calculateMaxPoints(template, gameData),
          timeBonus: template.scoring.timeBonus,
          accuracyRequired: 0.7,
          streakMultiplier: template.scoring.streakBonus ? 1.5 : 1.0,
          hintPenalty: template.scoring.hintPenalty,
        },
        metadata: {
          generatedAt: new Date(),
          model: result.metadata?.model ?? 'unknown',
          provider: result.metadata?.provider ?? 'unknown',
          tokensUsed: result.metadata?.tokensUsed ?? 0,
          latencyMs: Date.now() - startTime,
          template: template.id,
          personalizedFor: request.learnerId,
        },
      };

      const latencyMs = Date.now() - startTime;
      recordHistogram('game_generation.duration', latencyMs);
      incrementCounter('game_generation.success');

      console.info('Game generation completed', {
        generationId,
        gameType: request.gameType,
        latencyMs,
      });

      return game;
    } catch (error) {
      incrementCounter('game_generation.error');
      console.error('Game generation failed', { generationId, error });
      throw error;
    }
  }

  /**
   * Get available game types for a learner
   */
  async getAvailableGames(gradeLevel: number, subject?: string): Promise<GameTemplate[]> {
    let templates = getTemplatesForGrade(gradeLevel);

    // Filter by subject if provided
    if (subject) {
      // Logic to filter templates by subject would go here
      // For now, return all templates for the grade
    }

    return templates;
  }

  /**
   * Generate a random game for quick play
   */
  async generateRandomGame(
    learnerId: string,
    tenantId: string,
    userId: string,
    gradeLevel: number,
    subject?: string
  ): Promise<GeneratedGame> {
    const availableGames = await this.getAvailableGames(gradeLevel, subject);

    if (availableGames.length === 0) {
      throw new Error('No games available for this grade level');
    }

    // Pick a random game type
    const template = availableGames[Math.floor(Math.random() * availableGames.length)];

    return this.generateGame({
      learnerId,
      tenantId,
      userId,
      gameType: template.id,
      subject,
      gradeLevel,
      includeInstructions: true,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Build the AI prompt for game generation
   */
  private buildGamePrompt(
    request: GameGenerationRequest,
    template: GameTemplate,
    difficulty: DifficultyLevel,
    parameters: Record<string, unknown>
  ): string {
    let prompt = template.aiGenerationPrompt;

    // Replace parameter placeholders
    for (const [key, value] of Object.entries(parameters)) {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }

    // Add learner context
    const contextParts: string[] = [];

    contextParts.push(`Grade Level: ${request.gradeLevel}`);
    contextParts.push(`Difficulty: ${difficulty}`);

    if (request.subject) {
      contextParts.push(`Subject: ${request.subject}`);
    }

    if (request.topic) {
      contextParts.push(`Topic: ${request.topic}`);
    }

    if (request.learnerProfile?.vocabulary && request.learnerProfile.vocabulary.length > 0) {
      contextParts.push(`Learner's vocabulary: ${request.learnerProfile.vocabulary.slice(0, 10).join(', ')}`);
    }

    if (request.learnerProfile?.interests && request.learnerProfile.interests.length > 0) {
      contextParts.push(`Learner's interests: ${request.learnerProfile.interests.join(', ')}`);
    }

    if (request.learnerProfile?.currentTopics && request.learnerProfile.currentTopics.length > 0) {
      contextParts.push(`Current learning topics: ${request.learnerProfile.currentTopics.join(', ')}`);
    }

    // Replace context placeholders
    prompt = prompt.replace(/\{gradeLevel\}/g, String(request.gradeLevel));
    prompt = prompt.replace(/\{difficulty\}/g, difficulty);
    prompt = prompt.replace(/\{subject\}/g, request.subject ?? 'general');
    prompt = prompt.replace(/\{topic\}/g, request.topic ?? '');
    prompt = prompt.replace(
      /\{learnerInterests\}/g,
      request.learnerProfile?.interests?.join(', ') ?? 'various topics'
    );
    prompt = prompt.replace(
      /\{vocabularyLevel\}/g,
      request.learnerProfile?.vocabulary ? `grade ${request.gradeLevel}` : 'standard'
    );

    // Add personalization note
    const personalization = `
PERSONALIZATION:
${contextParts.join('\n')}

Generate content that is:
1. Appropriate for the learner's grade level
2. Aligned with their current learning topics
3. Engaging based on their interests
4. Calibrated to ${difficulty} difficulty
5. Educational and fun

IMPORTANT: Return ONLY valid JSON matching the exact structure specified above. Do not include any explanatory text outside the JSON.`;

    return prompt + '\n\n' + personalization;
  }

  /**
   * Determine appropriate difficulty level
   */
  private determineDifficulty(request: GameGenerationRequest, template: GameTemplate): DifficultyLevel {
    // Use explicit difficulty if provided
    if (request.difficulty) {
      return request.difficulty;
    }

    // Use learner's preferred difficulty
    if (request.learnerProfile?.preferredDifficulty) {
      return request.learnerProfile.preferredDifficulty;
    }

    // Use skill level if available
    if (request.subject && request.learnerProfile?.skillLevel?.[request.subject]) {
      const mastery = request.learnerProfile.skillLevel[request.subject];
      if (mastery < 0.4) return 'easy';
      if (mastery < 0.7) return 'medium';
      return 'hard';
    }

    // Default to medium
    return 'medium';
  }

  /**
   * Parse AI response into game data
   */
  private parseGameResponse(content: string, template: GameTemplate): GameData {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in game generation response');
        return this.getDefaultGameData(template);
      }

      const parsed = JSON.parse(jsonMatch[0]) as GameData;
      return parsed;
    } catch (error) {
      console.error('Failed to parse game generation response', { error });
      return this.getDefaultGameData(template);
    }
  }

  /**
   * Get default game data for a template (fallback)
   */
  private getDefaultGameData(template: GameTemplate): GameData {
    // Return minimal valid game data based on template
    switch (template.id) {
      case 'word_search':
        return {
          words: ['CAT', 'DOG', 'BIRD'],
          grid: [
            ['C', 'A', 'T'],
            ['D', 'O', 'G'],
            ['B', 'I', 'R', 'D'],
          ],
          solutions: [],
        };
      case 'mental_math':
        return {
          problems: [
            { question: '2 + 2', answer: 4 },
            { question: '3 + 3', answer: 6 },
          ],
        };
      default:
        return {};
    }
  }

  /**
   * Generate adaptive instructions
   */
  private async generateInstructions(
    request: GameGenerationRequest,
    template: GameTemplate,
    difficulty: DifficultyLevel
  ): Promise<string[]> {
    const prompt = `Generate clear, concise game instructions for a ${template.name} game.

Game Type: ${template.name}
Description: ${template.description}
Grade Level: ${request.gradeLevel}
Difficulty: ${difficulty}

Create 3-5 step-by-step instructions that are:
1. Clear and easy to understand for grade ${request.gradeLevel} students
2. Specific to the game mechanics
3. Encouraging and positive in tone
4. Concise (1-2 sentences each)

Return JSON: {"instructions": ["Step 1 text", "Step 2 text", ...]}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are an expert at writing clear instructions for educational games.' },
      { role: 'user', content: prompt },
    ];

    try {
      const result = await this.llm.complete(messages, {
        temperature: 0.6,
        maxTokens: 500,
        metadata: {
          tenantId: request.tenantId,
          userId: request.userId,
          agentType: 'GAME_GENERATOR',
        },
      });

      const parsed = this.parseStructuredResponse(result.content);
      return (parsed.instructions as string[]) ?? this.getDefaultInstructions(template);
    } catch (error) {
      console.error('Failed to generate instructions', { error });
      return this.getDefaultInstructions(template);
    }
  }

  /**
   * Get default instructions for a template
   */
  private getDefaultInstructions(template: GameTemplate): string[] {
    const baseInstructions: Record<string, string[]> = {
      word_search: [
        'Find all the hidden words in the grid',
        'Words can be horizontal, vertical, or diagonal',
        'Click and drag to select a word',
        'Find all words before time runs out!',
      ],
      crossword: [
        'Read the clues for across and down words',
        'Click on a square to type your answer',
        'Use the tab key to move between words',
        'Complete all words to win!',
      ],
      anagram: [
        'Unscramble the letters to form a word',
        'Drag letters to rearrange them',
        'Use hints if you get stuck',
        'Solve all anagrams as fast as you can!',
      ],
      mental_math: [
        'Solve each math problem as quickly as possible',
        'Type your answer and press Enter',
        'Build a streak for bonus points',
        'Keep going until time runs out!',
      ],
      memory_match: [
        'Click cards to flip them over',
        'Find matching pairs',
        'Remember where cards are located',
        'Match all pairs to win!',
      ],
    };

    return (
      baseInstructions[template.id] ?? [
        `Play ${template.name}`,
        template.description,
        'Follow the on-screen prompts',
        'Have fun and learn!',
      ]
    );
  }

  /**
   * Generate game title
   */
  private generateTitle(request: GameGenerationRequest, template: GameTemplate): string {
    const parts: string[] = [];

    if (request.topic) {
      parts.push(request.topic);
    } else if (request.subject) {
      parts.push(request.subject);
    }

    parts.push(template.name);

    return parts.join(' - ');
  }

  /**
   * Calculate maximum possible points for a game
   */
  private calculateMaxPoints(template: GameTemplate, gameData: GameData): number {
    const basePoints = template.scoring.basePoints;

    // Calculate based on game type
    switch (template.id) {
      case 'word_search':
        const words = (gameData.words as string[]) ?? [];
        return words.length * basePoints;

      case 'crossword':
        const across = (gameData.across as unknown[]) ?? [];
        const down = (gameData.down as unknown[]) ?? [];
        return (across.length + down.length) * basePoints;

      case 'anagram':
        const anagrams = (gameData.anagrams as unknown[]) ?? [];
        return anagrams.length * basePoints;

      case 'mental_math':
        const problems = (gameData.problems as unknown[]) ?? [];
        return problems.length * basePoints;

      case 'memory_match':
        const pairs = (gameData.pairs as unknown[]) ?? [];
        return pairs.length * basePoints;

      default:
        return basePoints * 10; // Default estimate
    }
  }

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
}
