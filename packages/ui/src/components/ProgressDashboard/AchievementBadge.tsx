'use client';

import { cn } from '../../utils';
import type { AchievementBadgeProps } from './types';

/**
 * AchievementBadge Component
 *
 * Displays an achievement badge with earned/locked state.
 */
export function AchievementBadge({
  achievement,
  size = 'md',
  className,
}: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'p-1.5 text-lg',
    md: 'p-2 text-2xl',
    lg: 'p-3 text-3xl',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 rounded-xl',
        sizeClasses[size],
        achievement.earned ? 'bg-yellow-50' : 'bg-slate-100 opacity-50',
        className
      )}
      title={achievement.title}
    >
      <span>{achievement.emoji}</span>
      <span className="text-[10px] text-slate-600">
        {achievement.earned ? '✓' : '?'}
      </span>
    </div>
  );
}
