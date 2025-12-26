/**
 * Daily Goals Widget
 *
 * Displays progress towards daily XP, lessons, and time goals
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Star, BookOpen, Clock, Check, Target } from 'lucide-react';
import type { DailyProgress } from '@aivo/ts-types/gamification.types';

interface DailyGoalsProps {
  progress: DailyProgress;
  onEditGoals?: () => void;
}

interface GoalRingProps {
  current: number;
  goal: number;
  completed: boolean;
  icon: React.ReactNode;
  label: string;
  color: string;
}

function GoalRing({ current, goal, completed, icon, label, color }: GoalRingProps) {
  const percentage = Math.min(100, (current / goal) * 100);
  const radius = 28;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="72" height="72" className="transform -rotate-90">
          {/* Background */}
          <circle
            cx="36"
            cy="36"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress */}
          <motion.circle
            cx="36"
            cy="36"
            r={radius}
            stroke={color}
            strokeWidth="6"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>

        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {completed ? (
            <motion.div
              className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <Check className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <div style={{ color }}>{icon}</div>
          )}
        </div>
      </div>

      {/* Label */}
      <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      <p className="text-xs text-gray-500">
        {current} / {goal}
      </p>
    </div>
  );
}

export function DailyGoals({ progress, onEditGoals }: DailyGoalsProps) {
  const allCompleted = progress.xpCompleted && progress.lessonsCompleted2 && progress.minutesCompleted;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Daily Goals</h3>
        </div>
        {onEditGoals && (
          <button
            onClick={onEditGoals}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Edit
          </button>
        )}
      </div>

      {/* Goals */}
      <div className="flex justify-around">
        <GoalRing
          current={progress.xpEarned}
          goal={progress.xpGoal}
          completed={progress.xpCompleted}
          icon={<Star className="w-6 h-6" />}
          label="XP"
          color="#f59e0b"
        />
        <GoalRing
          current={progress.lessonsCompleted}
          goal={progress.lessonsGoal}
          completed={progress.lessonsCompleted2}
          icon={<BookOpen className="w-6 h-6" />}
          label="Lessons"
          color="#3b82f6"
        />
        <GoalRing
          current={progress.minutesLearned}
          goal={progress.minutesGoal}
          completed={progress.minutesCompleted}
          icon={<Clock className="w-6 h-6" />}
          label="Minutes"
          color="#10b981"
        />
      </div>

      {/* All completed message */}
      {allCompleted && (
        <motion.div
          className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            🎉 All daily goals completed!
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default DailyGoals;
