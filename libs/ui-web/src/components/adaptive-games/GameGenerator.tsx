'use client';

import { useState, useCallback } from 'react';

import { cn } from '../../utils/cn';
import { Button } from '../button';
import { Card } from '../card';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface GameGeneratorProps {
  learnerId: string;
  gradeLevel: number;
  apiEndpoint?: string;
  onGameGenerated?: (game: GeneratedGame) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export interface GeneratedGame {
  id: string;
  gameType: string;
  title: string;
  description: string;
  instructions: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number;
  parameters: Record<string, unknown>;
  gameData: Record<string, unknown>;
  scoring: {
    maxPoints: number;
    timeBonus: boolean;
  };
}

interface GameTypeInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
}

// ────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────────────────────

const FUN_LOADING_MESSAGES = [
  'Mixing up the perfect challenge for you...',
  'Crafting your custom game...',
  'Teaching the AI about what you like...',
  'Generating something fun and educational...',
  'Creating a game just for you...',
  'Preparing your personalized challenge...',
];

const SUBJECTS = [
  'Mathematics',
  'Science',
  'English Language Arts',
  'Social Studies',
  'History',
  'General',
];

const GAME_CATEGORIES = [
  { id: 'word_puzzles', name: 'Word Puzzles', icon: '📝' },
  { id: 'math_challenges', name: 'Math Challenges', icon: '🔢' },
  { id: 'pattern_games', name: 'Pattern Games', icon: '🎨' },
  { id: 'logic_puzzles', name: 'Logic Puzzles', icon: '🧩' },
  { id: 'memory_games', name: 'Memory Games', icon: '🎴' },
];

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function GameGenerator({
  learnerId,
  gradeLevel,
  apiEndpoint = '/api/ai/games',
  onGameGenerated,
  onError,
  className,
}: GameGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedGameType, setSelectedGameType] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Available game types
  const [availableGameTypes, setAvailableGameTypes] = useState<GameTypeInfo[]>([]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const rotateLoadingMessage = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * FUN_LOADING_MESSAGES.length);
    setLoadingMessage(FUN_LOADING_MESSAGES[randomIndex]);
  }, []);

  const handleGenerateRandom = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    rotateLoadingMessage();

    const messageInterval = setInterval(rotateLoadingMessage, 3000);

    try {
      const response = await fetch(`${apiEndpoint}/random`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          learnerId,
          gradeLevel,
          subject: selectedSubject || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message ?? `Generation failed: ${response.status}`);
      }

      const data = await response.json();
      const game = data.game as GeneratedGame;

      clearInterval(messageInterval);
      onGameGenerated?.(game);
    } catch (err) {
      clearInterval(messageInterval);
      const error = err instanceof Error ? err : new Error('Generation failed');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsGenerating(false);
    }
  }, [apiEndpoint, learnerId, gradeLevel, selectedSubject, onGameGenerated, onError, rotateLoadingMessage]);

  const handleGenerateCustom = useCallback(async () => {
    if (!selectedGameType) {
      setError('Please select a game type');
      return;
    }

    setIsGenerating(true);
    setError(null);
    rotateLoadingMessage();

    const messageInterval = setInterval(rotateLoadingMessage, 3000);

    try {
      const response = await fetch(`${apiEndpoint}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          learnerId,
          gameType: selectedGameType,
          subject: selectedSubject || undefined,
          topic: selectedTopic || undefined,
          gradeLevel,
          difficulty: selectedDifficulty,
          includeInstructions: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message ?? `Generation failed: ${response.status}`);
      }

      const data = await response.json();
      const game = data.game as GeneratedGame;

      clearInterval(messageInterval);
      onGameGenerated?.(game);
    } catch (err) {
      clearInterval(messageInterval);
      const error = err instanceof Error ? err : new Error('Generation failed');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsGenerating(false);
    }
  }, [
    apiEndpoint,
    learnerId,
    gradeLevel,
    selectedGameType,
    selectedSubject,
    selectedTopic,
    selectedDifficulty,
    onGameGenerated,
    onError,
    rotateLoadingMessage,
  ]);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  if (isGenerating) {
    return (
      <Card className={cn('max-w-2xl', className)}>
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner className="h-16 w-16 text-primary" />
          <p className="mt-6 text-lg font-medium text-text">{loadingMessage}</p>
          <p className="mt-2 text-sm text-muted">This should only take a moment...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn('max-w-2xl', className)}
      title={
        <div className="flex items-center gap-2">
          <GamepadIcon className="h-5 w-5 text-primary" />
          <span>Generate a Game</span>
        </div>
      }
      subtitle="Create a personalized learning game powered by AI"
    >
      {/* Error Display */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <div className="flex items-center gap-2">
            <ErrorIcon className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Quick Generate */}
        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-6">
          <h3 className="mb-2 text-lg font-semibold text-text">Quick Play</h3>
          <p className="mb-4 text-sm text-muted">
            Let AI pick the perfect game for you based on your grade level
          </p>
          <Button variant="primary" size="lg" onClick={handleGenerateRandom} className="w-full">
            <SparklesIcon className="h-5 w-5" />
            Generate Random Game
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-surface px-4 text-muted">Or customize your game</span>
          </div>
        </div>

        {/* Custom Generation */}
        <div className="space-y-4">
          {/* Category Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text">Game Category</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GAME_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setSelectedGameType(''); // Reset game type when category changes
                  }}
                  className={cn(
                    'rounded-lg border-2 p-3 text-center transition-all',
                    selectedCategory === category.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="text-2xl">{category.icon}</div>
                  <div className="mt-1 text-xs font-medium">{category.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text">Subject (Optional)</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="form-select w-full"
            >
              <option value="">Any Subject</option>
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Topic */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text">Topic (Optional)</label>
            <input
              type="text"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              placeholder="e.g., Fractions, Photosynthesis, The Civil War"
              className="form-input w-full"
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text">Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => setSelectedDifficulty(difficulty)}
                  className={cn(
                    'rounded-lg border-2 px-4 py-2 text-sm font-medium capitalize transition-all',
                    selectedDifficulty === difficulty
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {difficulty}
                </button>
              ))}
            </div>
          </div>

          {/* Game Type Selection - Show after category is selected */}
          {selectedCategory && (
            <div>
              <label className="mb-2 block text-sm font-medium text-text">Specific Game Type (Optional)</label>
              <p className="mb-2 text-xs text-muted">
                Leave empty to let AI choose the best game in this category
              </p>
              <select
                value={selectedGameType}
                onChange={(e) => setSelectedGameType(e.target.value)}
                className="form-select w-full"
              >
                <option value="">AI Will Choose</option>
                <option value="word_search">Word Search</option>
                <option value="crossword">Crossword Puzzle</option>
                <option value="anagram">Anagram Solver</option>
                <option value="mental_math">Mental Math Sprint</option>
                <option value="equation_builder">Equation Builder</option>
                <option value="number_pattern">Number Patterns</option>
                <option value="memory_match">Memory Match</option>
                <option value="pattern_recognition">Pattern Recognition</option>
              </select>
            </div>
          )}

          {/* Generate Button */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleGenerateCustom}
            disabled={!selectedCategory}
            className="w-full"
          >
            <SparklesIcon className="h-5 w-5" />
            Generate Custom Game
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ICONS
// ────────────────────────────────────────────────────────────────────────────

function GamepadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
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
