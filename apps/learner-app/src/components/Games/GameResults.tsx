'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { GameResultsProps } from './types';

export function GameResults({
  result,
  onPlayAgain,
  onExit,
}: GameResultsProps) {
  // Trigger confetti for good results
  useEffect(() => {
    if (result.stars >= 2) {
      triggerConfetti();
    }
  }, [result.stars]);

  const triggerConfetti = async () => {
    try {
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: result.stars === 3 ? 150 : 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#3b82f6', '#22c55e', '#fbbf24'],
      });
    } catch {
      // Confetti not available, that's ok
    }
  };

  const getMessage = () => {
    if (result.perfectGame) return "PERFECT! You're amazing! 🌟";
    if (result.stars === 3) return "Incredible! You crushed it! 🎉";
    if (result.stars === 2) return "Great job! Keep it up! 💪";
    if (result.stars === 1) return "Good effort! Try again! 👍";
    return "Keep practicing! You've got this! 💡";
  };

  const getStarColor = (index: number) => {
    if (index < result.stars) {
      return 'text-yellow-400';
    }
    return 'text-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className={`p-6 text-center ${
          result.stars >= 2
            ? 'bg-gradient-to-r from-purple-500 to-blue-500'
            : 'bg-gradient-to-r from-gray-400 to-gray-500'
        }`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4"
          >
            <span className="text-5xl">
              {result.perfectGame ? '🏆' : result.stars >= 2 ? '🎮' : '🎯'}
            </span>
          </motion.div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {result.accuracy === 100 ? 'Game Complete!' : 'Game Over'}
          </h2>

          {/* Stars */}
          <div className="flex justify-center gap-2 mb-2">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.2, type: 'spring' }}
                className={`text-4xl ${getStarColor(i)}`}
              >
                ★
              </motion.span>
            ))}
          </div>

          <p className="text-white/90">{getMessage()}</p>
        </div>

        {/* Stats */}
        <div className="p-6 space-y-4">
          {/* Score */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex justify-between items-center p-4 bg-purple-50 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⭐</span>
              <span className="font-medium text-gray-700">Score</span>
            </div>
            <span className="text-2xl font-bold text-purple-600">{result.score}</span>
          </motion.div>

          {/* Accuracy */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="flex justify-between items-center p-4 bg-blue-50 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <span className="font-medium text-gray-700">Accuracy</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{Math.round(result.accuracy)}%</span>
          </motion.div>

          {/* Best Streak */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="flex justify-between items-center p-4 bg-orange-50 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <span className="font-medium text-gray-700">Best Streak</span>
            </div>
            <span className="text-2xl font-bold text-orange-600">{result.bestStreak}x</span>
          </motion.div>

          {/* Rewards */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="flex gap-4"
          >
            <div className="flex-1 text-center p-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
              <span className="text-2xl">✨</span>
              <p className="text-sm text-gray-600 mt-1">XP Earned</p>
              <p className="text-xl font-bold text-purple-700">+{result.xpEarned}</p>
            </div>
            <div className="flex-1 text-center p-4 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl">
              <span className="text-2xl">🪙</span>
              <p className="text-sm text-gray-600 mt-1">Coins</p>
              <p className="text-xl font-bold text-yellow-700">+{result.coinsEarned}</p>
            </div>
          </motion.div>

          {/* Achievements */}
          {result.achievements.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="p-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl"
            >
              <p className="text-sm font-medium text-amber-800 mb-2">Achievements Unlocked!</p>
              <div className="flex flex-wrap gap-2">
                {result.achievements.map((achievement) => (
                  <span
                    key={achievement}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm font-medium text-amber-700 shadow-sm"
                  >
                    🏅 {achievement.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* New High Score Banner */}
          {result.newHighScore && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.3, type: 'spring' }}
              className="text-center p-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl"
            >
              <span className="text-2xl">🏆</span>
              <p className="font-bold text-white">NEW HIGH SCORE!</p>
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onExit}
            className="flex-1 py-3 px-6 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
          >
            Exit
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Play Again
          </button>
        </div>
      </motion.div>
    </div>
  );
}
