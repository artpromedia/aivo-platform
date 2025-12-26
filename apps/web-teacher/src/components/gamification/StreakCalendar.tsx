/**
 * Streak Calendar Component
 *
 * Displays a visual calendar of streak activity
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Snowflake } from 'lucide-react';
import type { StreakDay } from '@aivo/ts-types/gamification.types';

interface StreakCalendarProps {
  readonly days: readonly StreakDay[];
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly freezesAvailable: number;
  readonly streakAtRisk?: boolean;
  readonly onUseFreeze?: () => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function StreakCalendar({
  days,
  currentStreak,
  longestStreak,
  freezesAvailable,
  streakAtRisk,
  onUseFreeze,
}: StreakCalendarProps) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <motion.div
            className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full"
            animate={streakAtRisk ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            <Flame className={`w-6 h-6 ${streakAtRisk ? 'text-red-500' : 'text-orange-500'}`} />
          </motion.div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentStreak} Day Streak
            </h3>
            <p className="text-sm text-gray-500">Best: {longestStreak} days</p>
          </div>
        </div>

        {/* Streak freeze button */}
        {freezesAvailable > 0 && (
          <button
            onClick={onUseFreeze}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            <Snowflake className="w-4 h-4" />
            <span className="text-sm font-medium">{freezesAvailable} Freezes</span>
          </button>
        )}
      </div>

      {/* Streak at risk warning */}
      {streakAtRisk && (
        <motion.div
          className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm text-red-600 dark:text-red-400">
            ⚠️ Complete a lesson today to keep your streak alive!
          </p>
        </motion.div>
      )}

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-400 dark:text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isToday = day.date === today;
          const isFuture = day.date > today;

          return (
            <motion.div
              key={day.date}
              className={`
                aspect-square flex items-center justify-center rounded-lg
                ${isFuture ? 'bg-gray-50 dark:bg-gray-800' : ''}
                ${day.completed && !day.frozenUsed ? 'bg-green-100 dark:bg-green-900/30' : ''}
                ${day.frozenUsed ? 'bg-blue-100 dark:bg-blue-900/30' : ''}
                ${!day.completed && !day.frozenUsed && !isFuture ? 'bg-gray-100 dark:bg-gray-700' : ''}
                ${isToday ? 'ring-2 ring-orange-400' : ''}
              `}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02 }}
            >
              {day.completed && !day.frozenUsed && (
                <Flame className="w-4 h-4 text-orange-500" />
              )}
              {day.frozenUsed && (
                <Snowflake className="w-4 h-4 text-blue-500" />
              )}
              {!day.completed && !day.frozenUsed && !isFuture && (
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
              )}
              {isFuture && (
                <span className="text-xs text-gray-300 dark:text-gray-600">
                  {new Date(day.date).getDate()}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Flame className="w-3 h-3 text-orange-500" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1">
          <Snowflake className="w-3 h-3 text-blue-500" />
          <span>Frozen</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-300" />
          <span>Missed</span>
        </div>
      </div>
    </div>
  );
}

export default StreakCalendar;
