/**
 * Leaderboard Component
 *
 * Displays competitive rankings with podium
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronUp, ChevronDown, Minus, Crown } from 'lucide-react';
import type { LeaderboardEntry, LeaderboardScope, LeaderboardPeriod } from '@aivo/ts-types/gamification.types';
import { OptimizedAvatar } from '../common/OptimizedAvatar';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentPlayerId?: string;
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  showPodium?: boolean;
  onScopeChange?: (scope: LeaderboardScope) => void;
  onPeriodChange?: (period: LeaderboardPeriod) => void;
}

const SCOPE_OPTIONS: { id: LeaderboardScope; label: string }[] = [
  { id: 'class', label: 'Class' },
  { id: 'school', label: 'School' },
  { id: 'global', label: 'Global' },
];

const PERIOD_OPTIONS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: 'This Week' },
  { id: 'monthly', label: 'This Month' },
  { id: 'allTime', label: 'All Time' },
];

function PodiumPlace({ entry, place }: { entry: LeaderboardEntry; place: 1 | 2 | 3 }) {
  const heights = { 1: 'h-24', 2: 'h-16', 3: 'h-12' };
  const colors = {
    1: 'from-amber-400 to-amber-600',
    2: 'from-gray-300 to-gray-500',
    3: 'from-amber-600 to-amber-800',
  };
  const order = { 1: 'order-2', 2: 'order-1', 3: 'order-3' };
  const icons = { 1: '🥇', 2: '🥈', 3: '🥉' };

  return (
    <motion.div
      className={`flex flex-col items-center ${order[place]}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: place === 1 ? 0.3 : place === 2 ? 0.1 : 0.5 }}
    >
      {/* Avatar */}
      <div className="relative mb-2">
        <OptimizedAvatar
          src={entry.avatarUrl}
          alt={entry.displayName}
          size="lg"
          className="border-2 border-white shadow-lg"
          priority={place === 1}
        />
        {place === 1 && (
          <motion.div
            className="absolute -top-3 left-1/2 -translate-x-1/2"
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Crown className="w-5 h-5 text-amber-400" />
          </motion.div>
        )}
      </div>

      {/* Name */}
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-20 text-center">
        {entry.displayName}
      </p>
      <p className="text-xs text-gray-500">{entry.xp.toLocaleString()} XP</p>

      {/* Podium */}
      <div
        className={`
          ${heights[place]} w-20 mt-2 rounded-t-lg
          bg-gradient-to-b ${colors[place]}
          flex items-center justify-center
        `}
      >
        <span className="text-2xl">{icons[place]}</span>
      </div>
    </motion.div>
  );
}

function LeaderboardRow({
  entry,
  isCurrentPlayer,
  index,
}: {
  entry: LeaderboardEntry;
  isCurrentPlayer: boolean;
  index: number;
}) {
  return (
    <motion.div
      className={`
        flex items-center gap-3 p-3 rounded-lg
        ${isCurrentPlayer
          ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }
      `}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Rank */}
      <div className="w-8 text-center">
        {entry.rank <= 3 ? (
          <span className="text-xl">{['🥇', '🥈', '🥉'][entry.rank - 1]}</span>
        ) : (
          <span className="text-sm font-bold text-gray-400">{entry.rank}</span>
        )}
      </div>

      {/* Rank change indicator */}
      <div className="w-4">
        {entry.rankChange !== undefined && entry.rankChange !== 0 && (
          <>
            {entry.rankChange > 0 ? (
              <ChevronUp className="w-4 h-4 text-green-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-red-500" />
            )}
          </>
        )}
        {entry.rankChange === 0 && (
          <Minus className="w-4 h-4 text-gray-300" />
        )}
      </div>

      {/* Avatar */}
      <OptimizedAvatar
        src={entry.avatarUrl}
        alt={entry.displayName}
        size="md"
      />

      {/* Name & Level */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">
          {entry.displayName}
          {isCurrentPlayer && (
            <span className="ml-2 text-xs text-blue-500">(You)</span>
          )}
        </p>
        <p className="text-xs text-gray-500">Level {entry.level}</p>
      </div>

      {/* Stats */}
      <div className="text-right">
        <p className="font-semibold text-amber-600">{entry.xp.toLocaleString()} XP</p>
        {entry.streak > 0 && (
          <p className="text-xs text-gray-500">🔥 {entry.streak}</p>
        )}
      </div>
    </motion.div>
  );
}

export function Leaderboard({
  entries,
  currentPlayerId,
  scope,
  period,
  showPodium = true,
  onScopeChange,
  onPeriodChange,
}: LeaderboardProps) {
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6 text-amber-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Leaderboard</h2>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Scope */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
            {SCOPE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onScopeChange?.(opt.id)}
                className={`
                  px-3 py-1 text-sm rounded-md transition-colors
                  ${scope === opt.id
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Period */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onPeriodChange?.(opt.id)}
                className={`
                  px-3 py-1 text-sm rounded-md transition-colors
                  ${period === opt.id
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Podium */}
      {showPodium && top3.length === 3 && (
        <div className="flex justify-center items-end gap-4 pt-8 pb-4 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <PodiumPlace entry={top3[1]} place={2} />
          <PodiumPlace entry={top3[0]} place={1} />
          <PodiumPlace entry={top3[2]} place={3} />
        </div>
      )}

      {/* List */}
      <div className="p-4 space-y-2">
        {!showPodium && top3.map((entry, index) => (
          <LeaderboardRow
            key={entry.studentId}
            entry={entry}
            isCurrentPlayer={entry.studentId === currentPlayerId}
            index={index}
          />
        ))}
        {rest.map((entry, index) => (
          <LeaderboardRow
            key={entry.studentId}
            entry={entry}
            isCurrentPlayer={entry.studentId === currentPlayerId}
            index={index + (showPodium ? 0 : 3)}
          />
        ))}
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500">No rankings yet this period</p>
        </div>
      )}
    </div>
  );
}

export default Leaderboard;
