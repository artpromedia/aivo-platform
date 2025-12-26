/**
 * Level Progress Ring Component
 *
 * Circular progress indicator showing level and XP progress
 */

import React from 'react';
import { motion } from 'framer-motion';

interface LevelProgressRingProps {
  level: number;
  levelName: string;
  progressPercent: number;
  xpCurrent: number;
  xpNeeded: number;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  showXP?: boolean;
  animate?: boolean;
}

const SIZES = {
  sm: { ring: 80, stroke: 6, text: 'text-lg', label: 'text-xs' },
  md: { ring: 120, stroke: 8, text: 'text-2xl', label: 'text-sm' },
  lg: { ring: 160, stroke: 10, text: 'text-4xl', label: 'text-base' },
};

export function LevelProgressRing({
  level,
  levelName,
  progressPercent,
  xpCurrent,
  xpNeeded,
  color,
  size = 'md',
  showXP = true,
  animate = true,
}: LevelProgressRingProps) {
  const { ring, stroke, text, label } = SIZES[size];
  const radius = (ring - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width={ring}
        height={ring}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          className="text-gray-200 dark:text-gray-700"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animate ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="drop-shadow-lg"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`${text} font-bold`}
          style={{ color }}
          initial={animate ? { scale: 0.5, opacity: 0 } : {}}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {level}
        </motion.span>
        <span className={`${label} text-gray-500 dark:text-gray-400`}>
          Level
        </span>
      </div>

      {/* Level name */}
      <motion.p
        className="mt-2 font-semibold text-center"
        style={{ color }}
        initial={animate ? { y: 10, opacity: 0 } : {}}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {levelName}
      </motion.p>

      {/* XP progress */}
      {showXP && (
        <motion.p
          className="text-sm text-gray-500 dark:text-gray-400"
          initial={animate ? { y: 10, opacity: 0 } : {}}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {xpCurrent.toLocaleString()} / {xpNeeded.toLocaleString()} XP
        </motion.p>
      )}
    </div>
  );
}

export default LevelProgressRing;
