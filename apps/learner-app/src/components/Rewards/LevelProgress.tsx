'use client';

import { motion } from 'framer-motion';
import type { LevelProgressProps } from './types';

export function LevelProgress({
  level,
  currentXp,
  xpToNextLevel,
  className = '',
}: LevelProgressProps) {
  const progressPercentage = (currentXp / xpToNextLevel) * 100;

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-4">
        {/* Level badge */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">{level}</span>
          </div>
          {/* Shine effect */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
            className="absolute -inset-1 rounded-full border-2 border-dashed border-purple-300 opacity-50"
          />
        </div>

        {/* Progress bar */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-700">Level {level}</span>
            <span className="text-sm text-gray-500">
              {currentXp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
            </span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 relative"
            >
              {/* Shimmer effect */}
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
            </motion.div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {(xpToNextLevel - currentXp).toLocaleString()} XP to level {level + 1}
          </p>
        </div>

        {/* Next level preview */}
        <div className="hidden sm:flex flex-col items-center opacity-50">
          <span className="text-sm text-gray-400">Next</span>
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-500">{level + 1}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
