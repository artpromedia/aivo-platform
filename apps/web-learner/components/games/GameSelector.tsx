'use client';

import * as React from 'react';
import { cn } from '@aivo/ui-web';

import type { GameCategory, GameSelectorProps } from './types';

interface GameDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  category: GameCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number; // in minutes
  skills: string[];
  minGrade: string;
  maxGrade: string;
  xpReward: number;
}

const GAMES_CATALOG: GameDefinition[] = [
  {
    id: 'reaction-time',
    title: 'Reaction Time',
    description: 'Test your reflexes! Click as fast as you can when you see the signal.',
    emoji: '⚡',
    color: 'from-yellow-400 to-orange-500',
    category: 'cognitive',
    difficulty: 'easy',
    duration: 2,
    skills: ['Reflexes', 'Attention', 'Focus'],
    minGrade: 'K_2',
    maxGrade: 'G9_12',
    xpReward: 50,
  },
  {
    id: 'shape-sorter',
    title: 'Shape Sorter',
    description: 'Sort falling shapes into the correct containers before time runs out!',
    emoji: '🔷',
    color: 'from-cyan-400 to-blue-600',
    category: 'cognitive',
    difficulty: 'medium',
    duration: 3,
    skills: ['Pattern Recognition', 'Speed', 'Hand-Eye Coordination'],
    minGrade: 'K_2',
    maxGrade: 'G6_8',
    xpReward: 75,
  },
  {
    id: 'word-scramble',
    title: 'Word Scramble',
    description: 'Unscramble letters to form words. Use hints if you get stuck!',
    emoji: '📝',
    color: 'from-purple-500 to-pink-600',
    category: 'language',
    difficulty: 'medium',
    duration: 5,
    skills: ['Vocabulary', 'Spelling', 'Word Recognition'],
    minGrade: 'K_2',
    maxGrade: 'G9_12',
    xpReward: 80,
  },
  {
    id: 'logic-puzzle',
    title: 'Logic Puzzle',
    description: 'Find the pattern and predict what comes next. No time pressure!',
    emoji: '🧩',
    color: 'from-teal-500 to-emerald-600',
    category: 'cognitive',
    difficulty: 'medium',
    duration: 5,
    skills: ['Logic', 'Pattern Recognition', 'Problem Solving'],
    minGrade: 'G3_5',
    maxGrade: 'G9_12',
    xpReward: 90,
  },
  {
    id: 'simon-says',
    title: 'Simon Says',
    description: 'Remember and repeat the color sequence. How far can you go?',
    emoji: '🎮',
    color: 'from-slate-700 to-slate-900',
    category: 'cognitive',
    difficulty: 'easy',
    duration: 5,
    skills: ['Memory', 'Attention', 'Sequence'],
    minGrade: 'K_2',
    maxGrade: 'G9_12',
    xpReward: 70,
  },
  // Previously implemented games
  {
    id: 'memory-match',
    title: 'Memory Match',
    description: 'Find matching pairs of cards in this classic memory game.',
    emoji: '🃏',
    color: 'from-pink-500 to-rose-600',
    category: 'cognitive',
    difficulty: 'easy',
    duration: 3,
    skills: ['Memory', 'Concentration', 'Visual Processing'],
    minGrade: 'K_2',
    maxGrade: 'G6_8',
    xpReward: 60,
  },
  {
    id: 'number-sequence',
    title: 'Number Ninja',
    description: 'Complete number sequences as fast as you can!',
    emoji: '🔢',
    color: 'from-blue-500 to-indigo-600',
    category: 'cognitive',
    difficulty: 'medium',
    duration: 3,
    skills: ['Math', 'Pattern Recognition', 'Speed'],
    minGrade: 'G3_5',
    maxGrade: 'G9_12',
    xpReward: 75,
  },
  {
    id: 'breathing-exercise',
    title: 'Calm Breaths',
    description: 'Take a moment to relax with guided breathing exercises.',
    emoji: '🧘',
    color: 'from-green-400 to-teal-500',
    category: 'relaxation',
    difficulty: 'easy',
    duration: 2,
    skills: ['Mindfulness', 'Self-Regulation', 'Calm'],
    minGrade: 'K_2',
    maxGrade: 'G9_12',
    xpReward: 30,
  },
  {
    id: 'color-match',
    title: 'Color Splash',
    description: 'Match colors and create beautiful patterns!',
    emoji: '🎨',
    color: 'from-red-400 to-purple-500',
    category: 'creative',
    difficulty: 'easy',
    duration: 3,
    skills: ['Color Recognition', 'Creativity', 'Visual Processing'],
    minGrade: 'K_2',
    maxGrade: 'G3_5',
    xpReward: 50,
  },
];

const CATEGORY_INFO: Record<GameCategory, { label: string; emoji: string; description: string }> = {
  cognitive: { label: 'Brain Training', emoji: '🧠', description: 'Sharpen your mind' },
  relaxation: { label: 'Relaxation', emoji: '🧘', description: 'Take a calming break' },
  physical: { label: 'Movement', emoji: '🏃', description: 'Get moving!' },
  creative: { label: 'Creative', emoji: '🎨', description: 'Express yourself' },
  language: { label: 'Language', emoji: '📚', description: 'Build your vocabulary' },
};

function isGameAvailableForGrade(game: GameDefinition, gradeBand: string): boolean {
  const gradeOrder = ['K_2', 'G3_5', 'G6_8', 'G9_12'];
  const minIdx = gradeOrder.indexOf(game.minGrade);
  const maxIdx = gradeOrder.indexOf(game.maxGrade);
  const currentIdx = gradeOrder.indexOf(gradeBand);
  return currentIdx >= minIdx && currentIdx <= maxIdx;
}

export function GameSelector({
  categoryFilter,
  gradeBand,
  onSelectGame,
  favorites = [],
  recentlyPlayed = [],
  className,
}: GameSelectorProps) {
  const [activeCategory, setActiveCategory] = React.useState<GameCategory | null>(categoryFilter || null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [localFavorites, setLocalFavorites] = React.useState<Set<string>>(new Set(favorites));

  // Filter games based on grade, category, and search
  const filteredGames = GAMES_CATALOG.filter((game) => {
    // Check grade availability
    if (!isGameAvailableForGrade(game, gradeBand)) return false;

    // Check category filter
    if (activeCategory && game.category !== activeCategory) return false;

    // Check search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        game.title.toLowerCase().includes(query) ||
        game.description.toLowerCase().includes(query) ||
        game.skills.some((skill) => skill.toLowerCase().includes(query))
      );
    }

    return true;
  });

  // Get recently played games
  const recentGames = recentlyPlayed
    .map((id) => GAMES_CATALOG.find((g) => g.id === id))
    .filter((g): g is GameDefinition => g !== undefined && isGameAvailableForGrade(g, gradeBand))
    .slice(0, 3);

  // Get a random suggestion
  const [suggestion] = React.useState(() => {
    const available = GAMES_CATALOG.filter(
      (g) =>
        isGameAvailableForGrade(g, gradeBand) &&
        !recentlyPlayed.includes(g.id)
    );
    return available[Math.floor(Math.random() * available.length)];
  });

  const toggleFavorite = (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
      } else {
        newSet.add(gameId);
      }
      return newSet;
    });
  };

  const favoriteGames = filteredGames.filter((g) => localFavorites.has(g.id));
  const otherGames = filteredGames.filter((g) => !localFavorites.has(g.id));

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search games..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <svg
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          className={cn(
            'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition',
            activeCategory === null
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
          onClick={() => setActiveCategory(null)}
        >
          All Games
        </button>
        {(Object.entries(CATEGORY_INFO) as [GameCategory, typeof CATEGORY_INFO.cognitive][]).map(
          ([category, info]) => (
            <button
              key={category}
              className={cn(
                'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition',
                activeCategory === category
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
              onClick={() => setActiveCategory(category)}
            >
              {info.emoji} {info.label}
            </button>
          )
        )}
      </div>

      {/* Try something new suggestion */}
      {suggestion && !searchQuery && !activeCategory && (
        <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-1">
          <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl">
                  💡
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Try something new!</h3>
                  <p className="text-sm text-slate-600">
                    {suggestion.title} - {suggestion.description.substring(0, 50)}...
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectGame(suggestion.id)}
                className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-600 hover:to-purple-700"
              >
                Play
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Recently played */}
      {recentGames.length > 0 && !searchQuery && !activeCategory && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-800">Recently Played</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentGames.map((game) => (
              <button
                key={game.id}
                onClick={() => onSelectGame(game.id)}
                className="flex min-w-[200px] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md"
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-xl',
                    game.color
                  )}
                >
                  {game.emoji}
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-800">{game.title}</p>
                  <p className="text-xs text-slate-500">{game.duration} min</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Favorites */}
      {favoriteGames.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-800">Favorites</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                isFavorite={true}
                onSelect={() => onSelectGame(game.id)}
                onToggleFavorite={(e) => toggleFavorite(game.id, e)}
              />
            ))}
          </div>
        </section>
      )}

      {/* All games */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-800">
          {activeCategory ? CATEGORY_INFO[activeCategory].label : 'All Games'}
          <span className="ml-2 text-sm font-normal text-slate-500">
            ({otherGames.length} games)
          </span>
        </h2>
        {otherGames.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-500">No games found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                isFavorite={localFavorites.has(game.id)}
                onSelect={() => onSelectGame(game.id)}
                onToggleFavorite={(e) => toggleFavorite(game.id, e)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface GameCardProps {
  game: GameDefinition;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

function GameCard({ game, isFavorite, onSelect, onToggleFavorite }: GameCardProps) {
  return (
    <div
      onClick={onSelect}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >
      {/* Game Header */}
      <div className={cn('relative bg-gradient-to-r p-6', game.color)}>
        <button
          onClick={onToggleFavorite}
          className="absolute right-3 top-3 rounded-full bg-white/20 p-1.5 transition hover:bg-white/30"
        >
          <svg
            className={cn('h-5 w-5', isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-white')}
            fill={isFavorite ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-4xl backdrop-blur-sm">
          {game.emoji}
        </div>
      </div>

      {/* Game Content */}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600">
            {game.title}
          </h3>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              game.difficulty === 'easy'
                ? 'bg-green-100 text-green-700'
                : game.difficulty === 'medium'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
            )}
          >
            {game.difficulty}
          </span>
        </div>
        <p className="text-sm text-slate-600 line-clamp-2">{game.description}</p>

        <div className="mt-3 flex flex-wrap gap-1">
          {game.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            {game.duration} min
          </span>
          <span className="font-medium text-blue-600">+{game.xpReward} XP</span>
        </div>
      </div>
    </div>
  );
}
