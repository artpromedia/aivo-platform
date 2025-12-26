/**
 * Challenge Card Component
 *
 * Displays a single challenge with progress
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Target, Star, Coins, Check } from 'lucide-react';
import type { Challenge } from '@aivo/ts-types/gamification.types';

interface ChallengeCardProps {
  challenge: Challenge;
  compact?: boolean;
  onClick?: () => void;
}

const TYPE_STYLES = {
  daily: {
    badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    progress: 'from-green-400 to-emerald-500',
  },
  weekly: {
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    progress: 'from-blue-400 to-indigo-500',
  },
  monthly: {
    badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    progress: 'from-purple-400 to-pink-500',
  },
  class: {
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    progress: 'from-amber-400 to-orange-500',
  },
};

function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function ChallengeCard({ challenge, compact = false, onClick }: ChallengeCardProps) {
  const styles = TYPE_STYLES[challenge.type];

  if (compact) {
    return (
      <motion.div
        className={`
          flex items-center gap-3 p-3 rounded-lg border
          ${styles.border} bg-white dark:bg-gray-800
          cursor-pointer hover:shadow-md transition-shadow
        `}
        onClick={onClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="text-2xl">{challenge.icon || '🎯'}</div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">
            {challenge.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{challenge.currentProgress}/{challenge.targetValue}</span>
            <span>•</span>
            <span>{formatTimeRemaining(challenge.expiresAt)}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-sm font-semibold text-amber-600">+{challenge.xpReward}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-xl border-2 p-5
        bg-white dark:bg-gray-800 ${styles.border}
        cursor-pointer hover:shadow-lg transition-shadow
      `}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Completed overlay */}
      {challenge.completed && (
        <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center z-10">
          <motion.div
            className="bg-green-500 rounded-full p-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
          >
            <Check className="w-8 h-8 text-white" />
          </motion.div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{challenge.icon || '🎯'}</span>
          <div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles.badge}`}>
              {challenge.type.charAt(0).toUpperCase() + challenge.type.slice(1)}
            </span>
            <h3 className="font-semibold text-gray-900 dark:text-white mt-1">
              {challenge.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {challenge.description}
      </p>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">
            <Target className="w-4 h-4 inline mr-1" />
            {challenge.currentProgress} / {challenge.targetValue}
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {Math.round(challenge.progressPercentage)}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${styles.progress} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${challenge.progressPercentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Time remaining */}
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{formatTimeRemaining(challenge.expiresAt)}</span>
        </div>

        {/* Rewards */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-amber-600">
            <Star className="w-4 h-4" />
            <span className="text-sm font-semibold">+{challenge.xpReward}</span>
          </div>
          {challenge.coinReward && (
            <div className="flex items-center gap-1 text-yellow-600">
              <Coins className="w-4 h-4" />
              <span className="text-sm font-semibold">+{challenge.coinReward}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default ChallengeCard;
