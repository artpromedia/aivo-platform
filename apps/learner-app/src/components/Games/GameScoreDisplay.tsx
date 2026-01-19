'use client';

import { motion } from 'framer-motion';
import type { GameScoreDisplayProps } from './types';

export function GameScoreDisplay({
  score,
  streak,
  lives,
  timeRemaining,
}: GameScoreDisplayProps) {
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining !== undefined && timeRemaining < 30;

  return (
    <div className="flex items-center justify-between gap-4 bg-white rounded-xl shadow-md p-4">
      {/* Score */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">⭐</span>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Score</p>
          <motion.p
            key={score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-purple-600"
          >
            {score}
          </motion.p>
        </div>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-2">
        <motion.span
          animate={streak >= 3 ? { scale: [1, 1.2, 1] } : {}}
          transition={{ repeat: streak >= 3 ? Infinity : 0, duration: 0.5 }}
          className="text-2xl"
        >
          {streak >= 5 ? '🔥' : streak >= 3 ? '⚡' : '✨'}
        </motion.span>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Streak</p>
          <motion.p
            key={streak}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className={`text-2xl font-bold ${
              streak >= 5 ? 'text-orange-500' : streak >= 3 ? 'text-yellow-500' : 'text-gray-700'
            }`}
          >
            {streak}x
          </motion.p>
        </div>
      </div>

      {/* Lives */}
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.span
              key={i}
              initial={i >= lives ? { scale: 0 } : {}}
              animate={i >= lives ? { scale: 0 } : { scale: 1 }}
              className="text-lg"
            >
              {i < lives ? '❤️' : '🖤'}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Timer (if present) */}
      {timeRemaining !== undefined && (
        <div className="flex items-center gap-2">
          <motion.span
            animate={isLowTime ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: isLowTime ? Infinity : 0, duration: 0.5 }}
            className="text-2xl"
          >
            ⏱️
          </motion.span>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
            <motion.p
              animate={isLowTime ? { color: ['#EF4444', '#F59E0B', '#EF4444'] } : {}}
              transition={{ repeat: isLowTime ? Infinity : 0, duration: 1 }}
              className={`text-2xl font-bold ${isLowTime ? 'text-red-500' : 'text-gray-700'}`}
            >
              {formatTime(timeRemaining)}
            </motion.p>
          </div>
        </div>
      )}
    </div>
  );
}
