'use client';

import { cn } from '../../utils';
import type { StreakDisplayProps } from './types';

const DEFAULT_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * StreakDisplay Component
 *
 * Displays the learning streak with daily progress indicators.
 */
export function StreakDisplay({
  streak,
  days = DEFAULT_DAYS,
  className,
}: StreakDisplayProps) {
  const todayIndex = new Date().getDay();
  // Convert Sunday (0) to 6, and shift others to start from Monday
  const adjustedTodayIndex = todayIndex === 0 ? 6 : todayIndex - 1;

  return (
    <div
      className={cn(
        'rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 p-4 shadow-sm',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-2xl text-white">
          🔥
        </div>
        <div>
          <div className="text-2xl font-bold text-orange-700">{streak} Days</div>
          <div className="text-sm text-orange-600">Learning Streak!</div>
        </div>
      </div>
      <div className="mt-4 flex justify-between">
        {days.map((day, i) => {
          const isCompleted = i < streak % 7;
          const isToday = i === adjustedTodayIndex;
          // Future days are calculated but used implicitly via !isCompleted && !isToday

          return (
            <div key={`${day}-${i}`} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs',
                  isCompleted
                    ? 'bg-orange-500 text-white'
                    : isToday
                      ? 'border-2 border-dashed border-orange-300 text-orange-400'
                      : 'bg-slate-100 text-slate-400'
                )}
              >
                {isCompleted ? '✓' : day}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
