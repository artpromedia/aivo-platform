'use client';

import { motion } from 'framer-motion';
import type { FocusIndicatorProps } from './types';

export function FocusIndicator({
  state,
  idleTime,
  className = '',
}: FocusIndicatorProps) {
  const getStateConfig = () => {
    switch (state) {
      case 'focused':
        return {
          emoji: '🎯',
          label: 'Focused',
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          animate: false,
        };
      case 'wandering':
        return {
          emoji: '👀',
          label: 'Wandering',
          bgColor: 'bg-yellow-500',
          textColor: 'text-white',
          animate: true,
        };
      case 'distracted':
        return {
          emoji: '😴',
          label: 'Need a break?',
          bgColor: 'bg-red-500',
          textColor: 'text-white',
          animate: true,
        };
      case 'taking_break':
        return {
          emoji: '🧘',
          label: 'On Break',
          bgColor: 'bg-purple-500',
          textColor: 'text-white',
          animate: false,
        };
      default:
        return {
          emoji: '🎯',
          label: 'Focused',
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          animate: false,
        };
    }
  };

  const config = getStateConfig();

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <motion.div
        animate={
          config.animate
            ? { scale: [1, 1.05, 1] }
            : {}
        }
        transition={{
          repeat: config.animate ? Infinity : 0,
          duration: 1,
        }}
        className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg ${config.bgColor} ${config.textColor}`}
      >
        <motion.span
          className="text-lg"
          animate={state === 'distracted' ? { y: [0, -3, 0] } : {}}
          transition={{
            repeat: state === 'distracted' ? Infinity : 0,
            duration: 0.5,
          }}
        >
          {config.emoji}
        </motion.span>
        <span className="font-semibold text-sm">{config.label}</span>

        {/* Idle time indicator for wandering/distracted */}
        {(state === 'wandering' || state === 'distracted') && (
          <span className="text-xs opacity-80">
            ({Math.floor(idleTime / 60)}:{(idleTime % 60).toString().padStart(2, '0')})
          </span>
        )}
      </motion.div>
    </div>
  );
}
