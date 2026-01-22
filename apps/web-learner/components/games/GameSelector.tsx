/**
 * GameSelector - Game picker UI component
 *
 * Features:
 * - Category filter buttons
 * - Grid/list view toggle
 * - Recommended games section
 * - Game cards with duration and category
 * - Search functionality
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';

import type { GameDefinition, GameCategory } from '../../lib/games/game-types';
import { CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_COLORS } from '../../lib/games/game-types';

export interface GameSelectorProps {
  games?: GameDefinition[];
  gradeBand?: string;
  recommendedGameIds?: string[];
  favorites?: string[];
  recentlyPlayed?: string[];
  onSelectGame: (game: GameDefinition) => void;
  className?: string;
  showSearch?: boolean;
  showViewToggle?: boolean;
}

type ViewMode = 'grid' | 'list';

const ALL_CATEGORIES: (GameCategory | 'all')[] = [
  'all',
  'cognitive',
  'relaxation',
  'physical',
  'creative',
];

export function GameSelector({
  games = [],
  gradeBand: _gradeBand,
  recommendedGameIds = [],
  favorites: _favorites,
  recentlyPlayed: _recentlyPlayed,
  onSelectGame,
  className = '',
  showSearch = true,
  showViewToggle = true,
}: GameSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter games by category and search
  const filteredGames = useMemo(() => {
    let filtered = games;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((game) => game.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (game) =>
          game.title.toLowerCase().includes(query) || game.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [games, selectedCategory, searchQuery]);

  // Separate recommended games
  const recommendedGames = useMemo(
    () => filteredGames.filter((game) => recommendedGameIds.includes(game.id)),
    [filteredGames, recommendedGameIds]
  );

  const otherGames = useMemo(
    () => filteredGames.filter((game) => !recommendedGameIds.includes(game.id)),
    [filteredGames, recommendedGameIds]
  );

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: games.length };
    games.forEach((game) => {
      counts[game.category] = (counts[game.category] || 0) + 1;
    });
    return counts;
  }, [games]);

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}min`;
  };

  // Get category badge style
  const getCategoryBadgeClass = useCallback((category: GameCategory) => {
    const color = CATEGORY_COLORS[category];
    return `bg-${color}-100 text-${color}-700 border-${color}-200`;
  }, []);

  // Render game card
  const renderGameCard = (game: GameDefinition, isRecommended: boolean) => (
    <button
      key={game.id}
      onClick={() => {
        onSelectGame(game);
      }}
      className={`
        relative text-left p-4 rounded-xl border-2 transition-all duration-200
        ${viewMode === 'grid' ? 'flex flex-col' : 'flex items-center gap-4'}
        hover:shadow-lg hover:border-blue-300 hover:scale-[1.02]
        bg-white border-gray-200
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
      `}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
          Recommended
        </div>
      )}

      {/* Game icon/emoji */}
      <div
        className={`
          flex-shrink-0 flex items-center justify-center
          ${viewMode === 'grid' ? 'w-12 h-12 mb-3' : 'w-10 h-10'}
          rounded-xl bg-gradient-to-br
          ${game.category === 'cognitive' ? 'from-blue-100 to-blue-200' : ''}
          ${game.category === 'relaxation' ? 'from-green-100 to-green-200' : ''}
          ${game.category === 'physical' ? 'from-orange-100 to-orange-200' : ''}
          ${game.category === 'creative' ? 'from-purple-100 to-purple-200' : ''}
        `}
      >
        <span className="text-2xl">{CATEGORY_ICONS[game.category]}</span>
      </div>

      {/* Game info */}
      <div className={viewMode === 'grid' ? '' : 'flex-1 min-w-0'}>
        <h3 className="font-semibold text-gray-800 truncate">{game.title}</h3>
        <p
          className={`
            text-sm text-gray-500
            ${viewMode === 'grid' ? 'line-clamp-2 h-10' : 'truncate'}
          `}
        >
          {game.description}
        </p>
      </div>

      {/* Meta info */}
      <div
        className={`
          flex items-center gap-2 mt-3
          ${viewMode === 'list' ? 'flex-shrink-0' : ''}
        `}
      >
        {/* Duration */}
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {formatDuration(game.durationSeconds)}
        </span>

        {/* Category badge */}
        <span
          className={`
            text-xs px-2 py-0.5 rounded-full font-medium
            ${game.category === 'cognitive' ? 'bg-blue-100 text-blue-700' : ''}
            ${game.category === 'relaxation' ? 'bg-green-100 text-green-700' : ''}
            ${game.category === 'physical' ? 'bg-orange-100 text-orange-700' : ''}
            ${game.category === 'creative' ? 'bg-purple-100 text-purple-700' : ''}
          `}
        >
          {CATEGORY_LABELS[game.category]}
        </span>
      </div>
    </button>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search bar */}
      {showSearch && (
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </div>
      )}

      {/* Category filters and view toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Category filters */}
        <div className="flex gap-2 flex-wrap">
          {ALL_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
              }}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {category === 'all' ? (
                'All'
              ) : (
                <span className="flex items-center gap-1">
                  {CATEGORY_ICONS[category]}
                  {CATEGORY_LABELS[category]}
                </span>
              )}
              <span className="ml-1 text-xs opacity-70">({categoryCounts[category] || 0})</span>
            </button>
          ))}
        </div>

        {/* View toggle */}
        {showViewToggle && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setViewMode('grid');
              }}
              className={`
                p-2 rounded-md transition-colors
                ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}
              `}
              aria-label="Grid view"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => {
                setViewMode('list');
              }}
              className={`
                p-2 rounded-md transition-colors
                ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}
              `}
              aria-label="List view"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Recommended games section */}
      {recommendedGames.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span className="text-yellow-500">⭐</span>
            Recommended for you
          </h3>
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            }
          >
            {recommendedGames.map((game) => renderGameCard(game, true))}
          </div>
        </div>
      )}

      {/* Other games */}
      {otherGames.length > 0 && (
        <div>
          {recommendedGames.length > 0 && (
            <h3 className="text-sm font-semibold text-gray-700 mb-2">All Games</h3>
          )}
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            }
          >
            {otherGames.map((game) => renderGameCard(game, false))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredGames.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-semibold text-gray-700">No games found</h3>
          <p className="text-gray-500">
            {searchQuery ? 'Try a different search term' : 'No games in this category'}
          </p>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => {
                setSelectedCategory('all');
              }}
              className="mt-3 text-blue-500 hover:underline"
            >
              View all games
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing game selection state
 */
export function useGameSelection() {
  const [selectedGame, setSelectedGame] = useState<GameDefinition | null>(null);

  const selectGame = useCallback((game: GameDefinition) => {
    setSelectedGame(game);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedGame(null);
  }, []);

  return {
    selectedGame,
    selectGame,
    clearSelection,
    isGameSelected: selectedGame !== null,
  };
}

export default GameSelector;
