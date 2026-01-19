'use client';

import { cn, calculateProgress } from '../../utils';
import type { GoalProgressProps } from './types';

/**
 * GoalProgress Component
 *
 * Displays a single daily goal with progress bar.
 */
export function GoalProgress({ goal, className }: GoalProgressProps) {
  const progress = calculateProgress(goal.current, goal.target);

  return (
    <div className={cn('rounded-xl bg-white/10 p-3 backdrop-blur-sm', className)}>
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span>{goal.emoji}</span>
        <span className="truncate">{goal.title}</span>
      </div>
      <div className="h-2 rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-blue-100">
        {goal.current}/{goal.target}
      </div>
    </div>
  );
}
