'use client';

import { useEffect, useState } from 'react';
import type { MasteryMeterProps } from './types';
import { getSubjectConfig } from './types';

/**
 * Visual mastery meter showing progress toward mastery target
 */
export function MasteryMeter({
  subject,
  currentLevel,
  targetLevel,
  streak = 0,
  size = 'md',
  showLabel = true,
  animated = true,
}: MasteryMeterProps) {
  const [displayLevel, setDisplayLevel] = useState(animated ? 0 : currentLevel);
  const subjectConfig = getSubjectConfig(subject);

  // Animate the meter on mount
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayLevel(currentLevel);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentLevel, animated]);

  // Calculate dimensions based on size
  const dimensions = {
    sm: { width: 80, height: 80, strokeWidth: 8, fontSize: 'text-sm' },
    md: { width: 120, height: 120, strokeWidth: 10, fontSize: 'text-base' },
    lg: { width: 160, height: 160, strokeWidth: 12, fontSize: 'text-lg' },
  }[size];

  const radius = (dimensions.width - dimensions.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (displayLevel * circumference);
  const targetOffset = circumference - (targetLevel * circumference);

  // Determine color based on mastery level
  const getMasteryColor = () => {
    if (displayLevel >= targetLevel) return 'text-green-500';
    if (displayLevel >= targetLevel * 0.75) return 'text-yellow-500';
    if (displayLevel >= targetLevel * 0.5) return 'text-orange-500';
    return 'text-red-400';
  };

  const getStrokeColor = () => {
    if (displayLevel >= targetLevel) return 'stroke-green-500';
    if (displayLevel >= targetLevel * 0.75) return 'stroke-yellow-500';
    if (displayLevel >= targetLevel * 0.5) return 'stroke-orange-500';
    return 'stroke-red-400';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: dimensions.width, height: dimensions.height }}>
        <svg
          className="transform -rotate-90"
          width={dimensions.width}
          height={dimensions.height}
        >
          {/* Background circle */}
          <circle
            cx={dimensions.width / 2}
            cy={dimensions.height / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={dimensions.strokeWidth}
            className="text-gray-200"
          />

          {/* Target indicator (dashed) */}
          <circle
            cx={dimensions.width / 2}
            cy={dimensions.height / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={dimensions.strokeWidth / 2}
            strokeDasharray={`${circumference - targetOffset} ${targetOffset}`}
            className="text-gray-400 opacity-30"
          />

          {/* Progress circle */}
          <circle
            cx={dimensions.width / 2}
            cy={dimensions.height / 2}
            r={radius}
            fill="none"
            strokeWidth={dimensions.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            className={`${getStrokeColor()} transition-all duration-1000 ease-out`}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl">{subjectConfig.emoji}</span>
          <span className={`font-bold ${dimensions.fontSize} ${getMasteryColor()}`}>
            {Math.round(displayLevel * 100)}%
          </span>
        </div>

        {/* Streak badge */}
        {streak > 0 && (
          <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow-lg">
            🔥{streak}
          </div>
        )}
      </div>

      {showLabel && (
        <div className="mt-2 text-center">
          <p className={`font-medium text-gray-800 ${dimensions.fontSize}`}>
            {subjectConfig.name}
          </p>
          <p className="text-xs text-gray-500">
            Target: {Math.round(targetLevel * 100)}%
          </p>
        </div>
      )}
    </div>
  );
}
