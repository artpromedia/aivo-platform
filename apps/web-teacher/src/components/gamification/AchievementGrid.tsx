/**
 * Achievement Grid Component
 *
 * Displays achievements in a grid layout with filtering
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Filter, ChevronDown } from 'lucide-react';
import { AchievementCard } from './AchievementCard';
import type { Achievement, AchievementCategory, AchievementRarity } from '@aivo/ts-types/gamification.types';

interface AchievementGridProps {
  achievements: Achievement[];
  onAchievementClick?: (achievement: Achievement) => void;
}

const CATEGORIES: { id: AchievementCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '🏆' },
  { id: 'lessons', label: 'Lessons', icon: '📚' },
  { id: 'streaks', label: 'Streaks', icon: '🔥' },
  { id: 'xp', label: 'XP', icon: '⭐' },
  { id: 'mastery', label: 'Mastery', icon: '🎯' },
  { id: 'social', label: 'Social', icon: '👥' },
  { id: 'special', label: 'Special', icon: '✨' },
  { id: 'secret', label: 'Secret', icon: '🔒' },
];

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'earned', label: 'Earned' },
  { id: 'inProgress', label: 'In Progress' },
  { id: 'locked', label: 'Locked' },
];

export function AchievementGrid({ achievements, onAchievementClick }: AchievementGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const filteredAchievements = useMemo(() => {
    let filtered = achievements;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((a) => a.category === selectedCategory);
    }

    // Status filter
    switch (selectedFilter) {
      case 'earned':
        filtered = filtered.filter((a) => a.earned);
        break;
      case 'inProgress':
        filtered = filtered.filter((a) => !a.earned && (a.currentProgress || 0) > 0);
        break;
      case 'locked':
        filtered = filtered.filter((a) => !a.earned && !a.currentProgress);
        break;
    }

    return filtered;
  }, [achievements, selectedCategory, selectedFilter]);

  const stats = useMemo(() => {
    const earned = achievements.filter((a) => a.earned).length;
    const total = achievements.length;
    return { earned, total, percentage: Math.round((earned / total) * 100) };
  }, [achievements]);

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Achievements
            </h2>
            <p className="text-sm text-gray-500">
              {stats.earned} / {stats.total} earned ({stats.percentage}%)
            </p>
          </div>
        </div>

        {/* Filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">{FILTERS.find((f) => f.id === selectedFilter)?.label}</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showFilterMenu && (
              <motion.div
                className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => {
                      setSelectedFilter(filter.id);
                      setShowFilterMenu(false);
                    }}
                    className={`
                      w-full text-left px-4 py-2 text-sm
                      ${selectedFilter === filter.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }
                      first:rounded-t-lg last:rounded-b-lg
                    `}
                  >
                    {filter.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
              transition-colors text-sm font-medium
              ${selectedCategory === category.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
          >
            <span>{category.icon}</span>
            <span>{category.label}</span>
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        layout
      >
        <AnimatePresence mode="popLayout">
          {filteredAchievements.map((achievement) => (
            <motion.div
              key={achievement.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <AchievementCard
                achievement={achievement}
                onClick={() => onAchievementClick?.(achievement)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty state */}
      {filteredAchievements.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No achievements match your filters
          </p>
        </div>
      )}
    </div>
  );
}

export default AchievementGrid;
