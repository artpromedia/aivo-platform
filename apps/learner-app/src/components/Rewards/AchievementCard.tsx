'use client';

import { motion } from 'framer-motion';
import type { AchievementCardProps } from './types';
import { RARITY_COLORS } from './types';

export function AchievementCard({
  achievement,
  showProgress = true,
  className = '',
}: AchievementCardProps) {
  const isUnlocked = !!achievement.unlockedAt;
  const colors = RARITY_COLORS[achievement.rarity];
  const progressPercentage = achievement.progressTotal
    ? Math.min(((achievement.progress || 0) / achievement.progressTotal) * 100, 100)
    : 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative bg-white rounded-xl p-5 shadow-md overflow-hidden transition-all ${
        isUnlocked ? `border-2 ${colors.border}` : 'border border-gray-200 opacity-70'
      } ${className}`}
    >
      {/* Rarity indicator */}
      <div className={`absolute top-0 right-0 px-2 py-1 text-xs font-medium rounded-bl-lg ${colors.bg} ${colors.text}`}>
        {achievement.rarity}
      </div>

      {/* Locked overlay */}
      {!isUnlocked && !achievement.isSecret && (
        <div className="absolute top-3 right-3">
          <span className="text-gray-400">🔒</span>
        </div>
      )}

      {/* Content */}
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${
          isUnlocked ? colors.bg : 'bg-gray-100'
        }`}>
          <span className={`text-3xl ${!isUnlocked && 'grayscale opacity-50'}`}>
            {achievement.icon}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold ${isUnlocked ? 'text-gray-800' : 'text-gray-500'}`}>
            {achievement.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {achievement.description}
          </p>

          {/* Rewards */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-purple-600 font-medium">
              +{achievement.xpReward} XP
            </span>
            <span className="text-xs text-yellow-600 font-medium">
              +{achievement.coinReward} 🪙
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar (for locked achievements) */}
      {showProgress && !isUnlocked && achievement.progressTotal && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{achievement.progress || 0}/{achievement.progressTotal}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full ${isUnlocked ? colors.bg : 'bg-purple-400'}`}
            />
          </div>
        </div>
      )}

      {/* Unlocked date */}
      {isUnlocked && achievement.unlockedAt && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            ✓ Unlocked
          </span>
          <span className="text-xs text-gray-400">
            {new Date(achievement.unlockedAt).toLocaleDateString()}
          </span>
        </div>
      )}
    </motion.div>
  );
}
