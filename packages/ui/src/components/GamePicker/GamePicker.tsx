'use client';

import { useState, useMemo } from 'react';
import { cn } from '../../utils';
import { GameCard } from './GameCard';
import type { GamePickerProps } from './types';
import type { GameCategory, GameType } from '../../types';

// Default games for when none are provided
const DEFAULT_GAMES: GameType[] = [
  {
    id: 'breathing-game',
    title: 'Calm Breathing',
    description: 'Relax with guided breathing exercises',
    emoji: '🎈',
    color: 'from-blue-400 to-cyan-400',
    difficulty: 'Easy',
    plays: 5000,
    highScore: 100,
    category: 'Focus',
  },
  {
    id: 'focus-trainer',
    title: 'Focus Trainer',
    description: 'Improve your concentration skills',
    emoji: '🎯',
    color: 'from-indigo-500 to-purple-500',
    difficulty: 'Easy',
    plays: 3456,
    highScore: 1500,
    category: 'Focus',
  },
  {
    id: 'math-challenge',
    title: 'Math Challenge',
    description: 'Test your math skills with timed problems',
    emoji: '🧮',
    color: 'from-blue-500 to-cyan-500',
    difficulty: 'Medium',
    plays: 1234,
    highScore: 850,
    category: 'Math',
  },
  {
    id: 'word-puzzle',
    title: 'Word Wizard',
    description: 'Build words and expand your vocabulary',
    emoji: '📝',
    color: 'from-purple-500 to-pink-500',
    difficulty: 'Easy',
    plays: 2345,
    highScore: 1200,
    category: 'Reading',
  },
  {
    id: 'memory-master',
    title: 'Memory Master',
    description: 'Challenge your memory with fun exercises',
    emoji: '🧠',
    color: 'from-pink-500 to-rose-500',
    difficulty: 'Medium',
    plays: 2100,
    highScore: 1100,
    category: 'Focus',
  },
];

// Categories for filter
const CATEGORIES: GameCategory[] = ['All', 'Math', 'Reading', 'Science', 'Focus'];

/**
 * GamePicker Component
 *
 * A game selection interface that suggests games based on the learner's
 * focus state and allows filtering by category.
 */
export function GamePicker({
  focusState,
  theme: _theme = 'K5',
  previousGames: _previousGames = [],
  games = DEFAULT_GAMES,
  onGameSelected,
  onCancel,
  className,
}: GamePickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('All');

  // Get recommended games based on focus state
  const recommendedGames = useMemo(() => {
    if (focusState === 'distracted') {
      // Suggest calming/focus games when distracted
      return games.filter(
        (g) => g.category === 'Focus' || g.id === 'breathing-game'
      );
    }
    if (focusState === 'wandering') {
      // Suggest engaging but not too challenging games
      return games.filter((g) => g.difficulty !== 'Hard');
    }
    // When focused, show all games
    return games;
  }, [focusState, games]);

  // Filter games by category
  const filteredGames = useMemo(() => {
    const gamesToFilter = focusState === 'focused' ? games : recommendedGames;
    if (selectedCategory === 'All') {
      return gamesToFilter;
    }
    return gamesToFilter.filter((g) => g.category === selectedCategory);
  }, [selectedCategory, games, recommendedGames, focusState]);

  // Get focus state message
  const focusMessage = useMemo(() => {
    switch (focusState) {
      case 'distracted':
        return {
          emoji: '🌊',
          title: 'Let\'s take a breather!',
          subtitle: 'Here are some calming activities to help you refocus',
        };
      case 'wandering':
        return {
          emoji: '🌟',
          title: 'Ready for a fun break?',
          subtitle: 'Pick a game that matches your mood',
        };
      case 'focused':
      default:
        return {
          emoji: '🚀',
          title: 'You\'re doing great!',
          subtitle: 'Choose any game you\'d like to play',
        };
    }
  }, [focusState]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with focus state message */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 text-4xl">
          {focusMessage.emoji}
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          {focusMessage.title}
        </h2>
        <p className="mt-1 text-slate-600">{focusMessage.subtitle}</p>
      </div>

      {/* Category Filter */}
      {focusState === 'focused' && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition',
                selectedCategory === category
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Games Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGames.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onClick={onGameSelected}
            showStats={focusState === 'focused'}
          />
        ))}
      </div>

      {/* No games message */}
      {filteredGames.length === 0 && (
        <div className="rounded-xl bg-slate-50 p-8 text-center">
          <p className="text-slate-600">
            No games found in this category. Try selecting a different one!
          </p>
        </div>
      )}

      {/* Cancel button */}
      <div className="flex justify-center">
        <button
          onClick={onCancel}
          className="rounded-lg px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
