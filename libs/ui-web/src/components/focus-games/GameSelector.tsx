'use client';

/**
 * Game Selector Component
 *
 * Displays available focus break games with filtering and recommendations.
 * Shows game previews, categories, and highlights recommended games.
 */

import { useState, useMemo } from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../button';
import { Badge } from '../badge';
import { Card } from '../card';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type GameCategory = 'cognitive' | 'relaxation' | 'physical' | 'creative';

export interface MiniGame {
  id: string;
  title: string;
  description: string;
  category: GameCategory;
  durationSeconds: number;
  instructions: string[];
  gameConfig: unknown;
}

export interface GameSelectorProps {
  games: MiniGame[];
  recommendedGameIds?: string[];
  onSelectGame: (game: MiniGame) => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function GameSelector({
  games,
  recommendedGameIds = [],
  onSelectGame,
  className,
}: GameSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | 'all'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // Filter games by category
  const filteredGames = useMemo(() => {
    if (selectedCategory === 'all') {
      return games;
    }
    return games.filter((game) => game.category === selectedCategory);
  }, [games, selectedCategory]);

  // Separate recommended games
  const recommendedGames = useMemo(() => {
    return filteredGames.filter((game) => recommendedGameIds.includes(game.id));
  }, [filteredGames, recommendedGameIds]);

  const otherGames = useMemo(() => {
    return filteredGames.filter((game) => !recommendedGameIds.includes(game.id));
  }, [filteredGames, recommendedGameIds]);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<GameCategory, number> = {
      cognitive: 0,
      relaxation: 0,
      physical: 0,
      creative: 0,
    };

    for (const game of games) {
      counts[game.category]++;
    }

    return counts;
  }, [games]);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text">Choose a Focus Game</h2>
          <p className="text-sm text-text-muted mt-1">
            Take a quick break and come back refreshed
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setView('grid')}
          >
            Grid
          </Button>
          <Button
            variant={view === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
          >
            List
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <CategoryButton
          label="All Games"
          count={games.length}
          isActive={selectedCategory === 'all'}
          onClick={() => setSelectedCategory('all')}
        />
        <CategoryButton
          label="Cognitive"
          count={categoryCounts.cognitive}
          isActive={selectedCategory === 'cognitive'}
          onClick={() => setSelectedCategory('cognitive')}
          icon="🧠"
        />
        <CategoryButton
          label="Relaxation"
          count={categoryCounts.relaxation}
          isActive={selectedCategory === 'relaxation'}
          onClick={() => setSelectedCategory('relaxation')}
          icon="🧘"
        />
        <CategoryButton
          label="Physical"
          count={categoryCounts.physical}
          isActive={selectedCategory === 'physical'}
          onClick={() => setSelectedCategory('physical')}
          icon="💪"
        />
        <CategoryButton
          label="Creative"
          count={categoryCounts.creative}
          isActive={selectedCategory === 'creative'}
          onClick={() => setSelectedCategory('creative')}
          icon="🎨"
        />
      </div>

      {/* Recommended Games */}
      {recommendedGames.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-text">Recommended for You</h3>
            <Badge variant="primary">⭐</Badge>
          </div>
          <div className={cn(
            view === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'flex flex-col gap-3'
          )}>
            {recommendedGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                isRecommended
                view={view}
                onSelect={() => onSelectGame(game)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Games */}
      {otherGames.length > 0 && (
        <div className="space-y-3">
          {recommendedGames.length > 0 && (
            <h3 className="text-lg font-semibold text-text">More Games</h3>
          )}
          <div className={cn(
            view === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'flex flex-col gap-3'
          )}>
            {otherGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                view={view}
                onSelect={() => onSelectGame(game)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredGames.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-text-muted text-lg">
            No games found in this category
          </p>
          <Button
            variant="ghost"
            onClick={() => setSelectedCategory('all')}
            className="mt-4"
          >
            View All Games
          </Button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function CategoryButton({
  label,
  count,
  isActive,
  onClick,
  icon,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  icon?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
        'border-2 flex items-center gap-2',
        isActive
          ? 'bg-primary text-on-accent border-primary'
          : 'bg-surface text-text border-border hover:bg-surface-muted'
      )}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
      <span className={cn(
        'text-xs px-1.5 py-0.5 rounded',
        isActive ? 'bg-white/20' : 'bg-surface-muted'
      )}>
        {count}
      </span>
    </button>
  );
}

function GameCard({
  game,
  isRecommended = false,
  view,
  onSelect,
}: {
  game: MiniGame;
  isRecommended?: boolean;
  view: 'grid' | 'list';
  onSelect: () => void;
}) {
  const categoryIcons: Record<GameCategory, string> = {
    cognitive: '🧠',
    relaxation: '🧘',
    physical: '💪',
    creative: '🎨',
  };

  const categoryColors: Record<GameCategory, string> = {
    cognitive: 'bg-blue-100 text-blue-700',
    relaxation: 'bg-purple-100 text-purple-700',
    physical: 'bg-green-100 text-green-700',
    creative: 'bg-pink-100 text-pink-700',
  };

  if (view === 'list') {
    return (
      <Card
        className={cn(
          'flex items-center gap-4 p-4 hover:shadow-md transition-shadow cursor-pointer',
          isRecommended && 'ring-2 ring-primary'
        )}
        onClick={onSelect}
      >
        <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-surface-muted flex items-center justify-center text-3xl">
          {categoryIcons[game.category]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-text truncate">{game.title}</h4>
            {isRecommended && <Badge variant="primary">Recommended</Badge>}
          </div>
          <p className="text-sm text-text-muted line-clamp-1">{game.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={cn('text-xs px-2 py-1 rounded-full', categoryColors[game.category])}>
              {game.category}
            </span>
            <span className="text-xs text-text-muted">
              {Math.ceil(game.durationSeconds / 60)} min
            </span>
          </div>
        </div>
        <Button variant="primary" size="sm">
          Play
        </Button>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'flex flex-col p-4 hover:shadow-md transition-shadow cursor-pointer',
        isRecommended && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
    >
      {isRecommended && (
        <Badge variant="primary" className="self-start mb-2">
          ⭐ Recommended
        </Badge>
      )}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-surface-muted flex items-center justify-center text-2xl">
          {categoryIcons[game.category]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-text line-clamp-1">{game.title}</h4>
          <span className={cn('text-xs px-2 py-0.5 rounded-full inline-block mt-1', categoryColors[game.category])}>
            {game.category}
          </span>
        </div>
      </div>
      <p className="text-sm text-text-muted line-clamp-2 mb-4 flex-1">
        {game.description}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {Math.ceil(game.durationSeconds / 60)} minutes
        </span>
        <Button variant="primary" size="sm">
          Play
        </Button>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT ADDITIONAL UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Hook for managing game selection state
 */
export function useGameSelection() {
  const [selectedGame, setSelectedGame] = useState<MiniGame | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectGame = (game: MiniGame) => {
    setSelectedGame(game);
    setIsPlaying(true);
  };

  const clearGame = () => {
    setSelectedGame(null);
    setIsPlaying(false);
  };

  return {
    selectedGame,
    isPlaying,
    selectGame,
    clearGame,
  };
}
