/**
 * Break Reminder Component
 *
 * Shows reminders to take breaks during learning sessions
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Sun, Zap, Clock, X, Play } from 'lucide-react';

interface BreakReminderProps {
  sessionMinutes: number;
  maxDailyMinutes: number;
  todayUsage: number;
  onDismiss: () => void;
  onTakeBreak: () => void;
}

const BREAK_TIPS = [
  { icon: '🚶', text: 'Take a short walk to refresh your mind' },
  { icon: '💧', text: 'Drink some water to stay hydrated' },
  { icon: '👀', text: 'Look at something 20 feet away for 20 seconds' },
  { icon: '🧘', text: 'Do some stretches to relax your body' },
  { icon: '🌳', text: 'Look out the window at nature' },
  { icon: '🎵', text: 'Listen to a favorite song' },
];

export function BreakReminder({
  sessionMinutes,
  maxDailyMinutes,
  todayUsage,
  onDismiss,
  onTakeBreak,
}: BreakReminderProps) {
  const [tip] = useState(() => BREAK_TIPS[Math.floor(Math.random() * BREAK_TIPS.length)]);
  const remainingMinutes = maxDailyMinutes - todayUsage;
  const percentUsed = Math.min((todayUsage / maxDailyMinutes) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header gradient */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5" />
            <span className="font-semibold">Time for a Break!</span>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-white/80 mt-1">
          You've been learning for {sessionMinutes} minutes
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Tip */}
        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <span className="text-2xl">{tip.icon}</span>
          <p className="text-sm text-gray-700 dark:text-gray-300">{tip.text}</p>
        </div>

        {/* Daily usage bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">Today's learning time</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {todayUsage} / {maxDailyMinutes} min
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentUsed}%` }}
              className={`h-full rounded-full ${
                percentUsed >= 90
                  ? 'bg-red-500'
                  : percentUsed >= 70
                  ? 'bg-amber-500'
                  : 'bg-green-500'
              }`}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {remainingMinutes > 0
              ? `${remainingMinutes} minutes remaining today`
              : "You've reached your daily goal!"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Continue Learning
          </button>
          <button
            onClick={onTakeBreak}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Coffee className="w-4 h-4" />
            Take Break
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Daily Limit Reached Component
 *
 * Shows when student has reached their daily learning limit
 */
export function DailyLimitReached({
  totalMinutes,
  onClose,
}: {
  totalMinutes: number;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 text-center"
      >
        {/* Trophy icon */}
        <motion.div
          className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Sun className="w-10 h-10 text-white" />
        </motion.div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Amazing Work Today!
        </h2>
        <p className="text-gray-500 mb-4">
          You've learned for {totalMinutes} minutes today. That's incredible!
        </p>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-6">
          <p className="text-amber-700 dark:text-amber-300 text-sm">
            🌟 Taking breaks helps your brain process what you've learned.
            Come back tomorrow refreshed and ready to continue!
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          See You Tomorrow!
        </button>
      </motion.div>
    </motion.div>
  );
}

/**
 * Cooldown Timer Component
 *
 * Shows countdown until next session can start
 */
export function CooldownTimer({
  waitMinutes,
  onReady,
}: {
  waitMinutes: number;
  onReady: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(waitMinutes * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onReady();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onReady]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center max-w-sm mx-auto"
    >
      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
        <Clock className="w-8 h-8 text-blue-500" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Break Time
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Take a short break to let your brain rest
      </p>

      {/* Countdown */}
      <div className="text-4xl font-bold text-blue-500 mb-4">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      {/* Tip */}
      <div className="text-sm text-gray-500">
        {BREAK_TIPS[Math.floor(secondsLeft / 30) % BREAK_TIPS.length].icon}{' '}
        {BREAK_TIPS[Math.floor(secondsLeft / 30) % BREAK_TIPS.length].text}
      </div>
    </motion.div>
  );
}

/**
 * Session Timer Widget
 *
 * Small floating widget showing current session time
 */
export function SessionTimerWidget({
  sessionMinutes,
  maxDailyMinutes,
  todayUsage,
}: {
  sessionMinutes: number;
  maxDailyMinutes: number;
  todayUsage: number;
}) {
  const remainingMinutes = maxDailyMinutes - todayUsage;
  const isLow = remainingMinutes <= 15;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-4 right-4 z-40"
    >
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-full shadow-lg
        ${isLow
          ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-300'
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
        }
      `}>
        <Clock className={`w-4 h-4 ${isLow ? 'text-amber-500' : 'text-gray-400'}`} />
        <span className={`text-sm font-medium ${isLow ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}>
          {sessionMinutes}m
        </span>
        <span className="text-xs text-gray-400">•</span>
        <span className={`text-xs ${isLow ? 'text-amber-600' : 'text-gray-500'}`}>
          {remainingMinutes}m left
        </span>
      </div>
    </motion.div>
  );
}

export default BreakReminder;
