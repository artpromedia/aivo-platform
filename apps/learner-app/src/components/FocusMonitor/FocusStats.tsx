'use client';

import { motion } from 'framer-motion';
import type { FocusStatsProps } from './types';

export function FocusStats({ session, className = '' }: FocusStatsProps) {
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const totalTime = session.focusedTime + session.wanderingTime + session.distractedTime;
  const focusPercentage = totalTime > 0 ? Math.round((session.focusedTime / totalTime) * 100) : 0;

  // Get focus quality rating
  const getQualityRating = () => {
    if (focusPercentage >= 80) return { label: 'Excellent', emoji: '🌟', color: 'text-green-600' };
    if (focusPercentage >= 60) return { label: 'Good', emoji: '👍', color: 'text-blue-600' };
    if (focusPercentage >= 40) return { label: 'Fair', emoji: '💪', color: 'text-yellow-600' };
    return { label: 'Needs Work', emoji: '📈', color: 'text-orange-600' };
  };

  const quality = getQualityRating();

  return (
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-1">Focus Session</h2>
            <p className="text-white/80 text-sm">
              {new Date(session.startedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-center">
            <span className="text-4xl">{quality.emoji}</span>
            <p className="text-sm font-medium">{quality.label}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Focus percentage ring */}
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="12"
              />
              {/* Progress circle */}
              <motion.circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="url(#focusGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                initial={{ strokeDasharray: '0 352' }}
                animate={{ strokeDasharray: `${(focusPercentage / 100) * 352} 352` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-800">{focusPercentage}%</span>
              <span className="text-xs text-gray-500">Focus</span>
            </div>
          </div>
        </div>

        {/* Time breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <span className="text-2xl">🎯</span>
            <p className="text-lg font-bold text-green-700">{formatDuration(session.focusedTime)}</p>
            <p className="text-xs text-green-600">Focused</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-xl">
            <span className="text-2xl">👀</span>
            <p className="text-lg font-bold text-yellow-700">{formatDuration(session.wanderingTime)}</p>
            <p className="text-xs text-yellow-600">Wandering</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <span className="text-2xl">😴</span>
            <p className="text-lg font-bold text-red-700">{formatDuration(session.distractedTime)}</p>
            <p className="text-xs text-red-600">Distracted</p>
          </div>
        </div>

        {/* Stats list */}
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span>⏱️</span>
              <span className="text-gray-700">Total Time</span>
            </div>
            <span className="font-semibold">{formatDuration(totalTime)}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span>🔥</span>
              <span className="text-gray-700">Longest Focus Stretch</span>
            </div>
            <span className="font-semibold">{formatDuration(session.longestFocusStretch)}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span>☕</span>
              <span className="text-gray-700">Breaks Taken</span>
            </div>
            <span className="font-semibold">{session.breaksTaken}</span>
          </div>

          {session.averageFocusStretch > 0 && (
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span>📊</span>
                <span className="text-gray-700">Avg Focus Stretch</span>
              </div>
              <span className="font-semibold">{formatDuration(session.averageFocusStretch)}</span>
            </div>
          )}
        </div>

        {/* Tips based on performance */}
        {focusPercentage < 60 && (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="font-medium text-amber-800 mb-2">💡 Tips to improve focus:</p>
            <ul className="text-sm text-amber-700 space-y-1">
              {session.distractedTime > session.focusedTime && (
                <li>• Try shorter study sessions with more breaks</li>
              )}
              {session.breaksTaken === 0 && (
                <li>• Take regular breaks to stay refreshed</li>
              )}
              <li>• Find a quiet place with fewer distractions</li>
              <li>• Try the breathing exercises before starting</li>
            </ul>
          </div>
        )}

        {focusPercentage >= 80 && (
          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <p className="font-medium text-green-800 mb-1">🌟 Amazing focus!</p>
            <p className="text-sm text-green-700">
              You maintained excellent focus during this session. Keep up the great work!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
