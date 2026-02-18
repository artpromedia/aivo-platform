'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface AssessmentTimerProps {
  timeLimit?: number; // in seconds
  onTimeout?: () => void;
  isPaused?: boolean;
}

export function AssessmentTimer({ timeLimit, onTimeout, isPaused = false }: AssessmentTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit || 0);
  const [isWarning, setIsWarning] = useState(false);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (!timeLimit || isPaused) return;

    setTimeRemaining(timeLimit);
    setIsWarning(false);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeout?.();
          return 0;
        }

        // Set warning when 30 seconds or less remain
        if (prev <= 31 && !isWarning) {
          setIsWarning(true);
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLimit, isPaused, onTimeout, isWarning]);

  if (!timeLimit) {
    return null;
  }

  const progress = (timeRemaining / timeLimit) * 100;

  return (
    <motion.div
      className={`flex items-center gap-3 px-4 py-2 rounded-full transition-colors ${
        isWarning
          ? 'bg-red-100 text-red-700'
          : 'bg-indigo-50 text-indigo-600'
      }`}
      animate={isWarning ? { scale: [1, 1.05, 1] } : {}}
      transition={{ repeat: isWarning ? Infinity : 0, duration: 1 }}
    >
      {/* Timer icon */}
      <svg
        className={`w-5 h-5 ${isWarning ? 'animate-pulse' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      {/* Time display */}
      <span className="font-bold text-lg tabular-nums">{formatTime(timeRemaining)}</span>

      {/* Progress ring */}
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 transform -rotate-90">
          <circle
            cx="16"
            cy="16"
            r="12"
            stroke={isWarning ? '#FEE2E2' : '#e5e7eb'}
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="16"
            cy="16"
            r="12"
            stroke={isWarning ? '#EF4444' : '#4F46E5'}
            strokeWidth="3"
            fill="none"
            strokeDasharray={75.4}
            strokeDashoffset={75.4 * (1 - progress / 100)}
            className="transition-all duration-1000"
          />
        </svg>
      </div>
    </motion.div>
  );
}
