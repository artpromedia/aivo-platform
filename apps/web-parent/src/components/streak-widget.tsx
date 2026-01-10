/**
 * Streak Widget Component
 *
 * Displays the child's learning streak with visual feedback.
 * Inspired by gamification patterns from aivo-agentic-ai-learning-app.
 */

'use client';

import { Flame, Calendar, TrendingUp } from 'lucide-react';

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  weeklyActivity: boolean[];
  lastActiveDate?: string;
}

export function StreakWidget({
  currentStreak,
  longestStreak,
  weeklyActivity,
  lastActiveDate,
}: StreakWidgetProps) {
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const isOnFire = currentStreak >= 7;

  return (
    <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Flame className={`w-5 h-5 ${isOnFire ? 'text-orange-500' : 'text-gray-400'}`} />
          Learning Streak
        </h2>
        {isOnFire && (
          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium animate-pulse">
            On Fire!
          </span>
        )}
      </div>

      {/* Current Streak Display */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-shrink-0">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
            currentStreak > 0
              ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white'
              : 'bg-gray-200 text-gray-400'
          }`}>
            {currentStreak}
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-600">Day streak</p>
          <p className="text-xs text-gray-500">
            Best: {longestStreak} days
          </p>
          {lastActiveDate && (
            <p className="text-xs text-gray-400 mt-1">
              Last active: {lastActiveDate}
            </p>
          )}
        </div>
      </div>

      {/* Weekly Activity */}
      <div>
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          This Week
        </p>
        <div className="flex justify-between gap-1">
          {weeklyActivity.map((active, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  active
                    ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {active ? '✓' : '·'}
              </div>
              <span className="text-xs text-gray-500">{dayLabels[index]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Streak Milestones */}
      <div className="mt-4 pt-4 border-t border-orange-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Next milestone</span>
          <span className="font-medium text-orange-600 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {getNextMilestone(currentStreak)} days
          </span>
        </div>
        <div className="mt-2 h-2 bg-orange-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all"
            style={{ width: `${getProgressToMilestone(currentStreak)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function getNextMilestone(current: number): number {
  const milestones = [7, 14, 30, 60, 90, 180, 365];
  return milestones.find((m) => m > current) || 365;
}

function getProgressToMilestone(current: number): number {
  const milestones = [7, 14, 30, 60, 90, 180, 365];
  const prevMilestone = [...milestones].reverse().find((m) => m <= current) || 0;
  const nextMilestone = milestones.find((m) => m > current) || 365;
  return ((current - prevMilestone) / (nextMilestone - prevMilestone)) * 100;
}

export default StreakWidget;
