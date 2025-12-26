/**
 * Achievement Card Component
 *
 * Displays a single achievement with progress
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Check } from 'lucide-react';
import type { Achievement } from '@aivo/ts-types/gamification.types';

interface AchievementCardProps {
  achievement: Achievement;
  onClick?: () => void;
  animate?: boolean;
}

const RARITY_COLORS = {
  common: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    border: 'border-gray-200 dark:border-gray-600',
    glow: '',
  },
  uncommon: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    glow: '',
  },
  rare: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    glow: 'shadow-blue-200/50 dark:shadow-blue-800/50',
  },
  epic: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    glow: 'shadow-purple-200/50 dark:shadow-purple-800/50',
  },
  legendary: {
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    border: 'border-amber-300 dark:border-amber-700',
    glow: 'shadow-amber-200/50 dark:shadow-amber-700/50 shadow-lg',
  },
};

export function AchievementCard({ achievement, onClick, animate = true }: AchievementCardProps) {
  const colors = RARITY_COLORS[achievement.rarity];
  const isLocked = !achievement.earned && achievement.isSecret;

  return (
    <motion.div
      className={`
        relative p-4 rounded-xl border-2 cursor-pointer
        ${colors.bg} ${colors.border} ${colors.glow}
        ${achievement.earned ? 'opacity-100' : 'opacity-60'}
        hover:opacity-100 transition-opacity
      `}
      onClick={onClick}
      initial={animate ? { opacity: 0, y: 20 } : {}}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Earned badge */}
      {achievement.earned && (
        <motion.div
          className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
          initial={animate ? { scale: 0 } : {}}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-3xl">
          {isLocked ? <Lock className="w-8 h-8 text-gray-400" /> : achievement.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
            {isLocked ? '???' : achievement.title}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {isLocked ? 'Complete to reveal' : achievement.description}
          </p>

          {/* Progress bar */}
          {!achievement.earned && achievement.threshold && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{achievement.currentProgress || 0} / {achievement.threshold}</span>
                <span>{Math.round(achievement.progressPercentage || 0)}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${achievement.progressPercentage || 0}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          )}

          {/* XP reward */}
          <div className="mt-2 flex items-center gap-1">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              +{achievement.xpReward} XP
            </span>
            <span className="text-xs text-gray-400">
              • {achievement.rarity}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default AchievementCard;
