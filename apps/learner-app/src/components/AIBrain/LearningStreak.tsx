'use client';

import type { LearningStreakProps } from './types';

/**
 * Visual display of learning streak
 */
export function LearningStreak({
  currentStreak,
  bestStreak,
  className = '',
}: LearningStreakProps) {
  // Calculate flame intensity
  const getFlameSize = () => {
    if (currentStreak >= 30) return 'text-5xl';
    if (currentStreak >= 14) return 'text-4xl';
    if (currentStreak >= 7) return 'text-3xl';
    return 'text-2xl';
  };

  const getStreakMessage = () => {
    if (currentStreak >= 30) return "You're on fire! Incredible dedication!";
    if (currentStreak >= 14) return "Two weeks strong! Keep it up!";
    if (currentStreak >= 7) return "One week streak! Amazing!";
    if (currentStreak >= 3) return "Great momentum! Keep going!";
    if (currentStreak >= 1) return "Streak started! Don't break it!";
    return "Start a new streak today!";
  };

  const isNewRecord = currentStreak === bestStreak && currentStreak > 0;

  return (
    <div className={`rounded-xl bg-gradient-to-br from-orange-100 to-red-100 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Current streak */}
        <div className="flex items-center gap-3">
          <div className={`${getFlameSize()} animate-pulse`}>
            {currentStreak > 0 ? '🔥' : '❄️'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-orange-600">
                {currentStreak}
              </span>
              <span className="text-sm font-medium text-gray-600">
                day{currentStreak !== 1 ? 's' : ''}
              </span>
              {isNewRecord && (
                <span className="inline-flex animate-bounce items-center rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-bold text-yellow-900">
                  🏆 NEW RECORD!
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{getStreakMessage()}</p>
          </div>
        </div>

        {/* Best streak */}
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Best</p>
          <p className="text-xl font-bold text-gray-700">
            {bestStreak} <span className="text-sm font-normal">days</span>
          </p>
        </div>
      </div>

      {/* Streak calendar visualization */}
      <div className="mt-4 flex gap-1">
        {Array.from({ length: 7 }, (_, i) => {
          const isActive = i < (currentStreak % 7 || 7) && currentStreak > 0;
          return (
            <div
              key={i}
              className={`h-3 flex-1 rounded-full transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-orange-400 to-red-500'
                  : 'bg-gray-200'
              }`}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-gray-400">
        <span>Mon</span>
        <span>Sun</span>
      </div>
    </div>
  );
}
