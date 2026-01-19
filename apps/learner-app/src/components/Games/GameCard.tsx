'use client';

import { motion } from 'framer-motion';
import type { GameCardProps } from './types';

export function GameCard({
  id,
  type,
  title,
  description,
  emoji,
  difficulty,
  unlocked,
  highScore,
  stars = 0,
  onClick,
}: GameCardProps) {
  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
      case 'adaptive':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const renderStars = () => {
    return (
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className={`text-sm ${i < stars ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <motion.button
      onClick={unlocked ? onClick : undefined}
      whileHover={unlocked ? { scale: 1.02 } : {}}
      whileTap={unlocked ? { scale: 0.98 } : {}}
      disabled={!unlocked}
      className={`relative w-full text-left rounded-2xl shadow-md overflow-hidden transition-all ${
        unlocked
          ? 'bg-white hover:shadow-lg cursor-pointer'
          : 'bg-gray-100 opacity-60 cursor-not-allowed'
      }`}
    >
      {/* Lock overlay for locked games */}
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20 z-10">
          <div className="bg-white rounded-full p-3 shadow-lg">
            <span className="text-2xl">🔒</span>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Header with emoji and difficulty */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-blue-100">
            <span className="text-3xl">{emoji}</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor()}`}>
            {difficulty}
          </span>
        </div>

        {/* Title and description */}
        <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{description}</p>

        {/* Stats footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Stars */}
          {renderStars()}

          {/* High score */}
          {highScore !== undefined && highScore > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span>🏆</span>
              <span>{highScore}</span>
            </div>
          )}
        </div>
      </div>

      {/* Play indicator */}
      {unlocked && (
        <div className="absolute bottom-4 right-4">
          <motion.div
            animate={{ x: [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-purple-400"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </motion.div>
        </div>
      )}
    </motion.button>
  );
}
