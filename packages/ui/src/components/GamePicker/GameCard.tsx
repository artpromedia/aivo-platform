'use client';

import { cn } from '../../utils';
import type { GameCardProps } from './types';

/**
 * GameCard Component
 *
 * Displays a game option with emoji, title, description, difficulty,
 * and optional stats (plays, high score).
 */
export function GameCard({
  game,
  onClick,
  selected = false,
  showStats = true,
  className,
}: GameCardProps) {
  const handleClick = () => {
    onClick?.(game.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(game.id);
    }
  };

  const difficultyColors = {
    Easy: 'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Hard: 'bg-red-100 text-red-700',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all cursor-pointer',
        'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        selected
          ? 'border-blue-500 ring-2 ring-blue-200'
          : 'border-slate-200 hover:border-blue-300',
        className
      )}
    >
      {/* Game Header with gradient background */}
      <div className={cn('bg-gradient-to-r p-6', game.color)}>
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
              difficultyColors[game.difficulty]
            )}
          >
            {game.difficulty}
          </span>
        </div>
        <p className="text-sm text-slate-600">{game.description}</p>

        {showStats && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>{game.plays.toLocaleString()} plays</span>
            <span>High Score: {game.highScore.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
