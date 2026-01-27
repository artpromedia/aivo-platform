/**
 * Achievements Page
 *
 * Shows all achievements and badges earned by the student.
 * Gamification elements to celebrate learning milestones.
 */

'use client';

import { format } from 'date-fns';
import {
  ArrowLeft,
  Award,
  Star,
  Trophy,
  Target,
  Zap,
  BookOpen,
  Brain,
  Heart,
  Flame,
  Medal,
  Crown,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { QueryErrorDisplay } from '@/components/error-boundary';
import { AchievementsPageSkeleton } from '@/components/skeletons';
import { useAchievements, useSelectedChild } from '@/hooks';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'learning' | 'streak' | 'mastery' | 'engagement' | 'special';
  earnedAt?: string;
  progress?: number;
  total?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

const iconMap: Record<string, React.ReactNode> = {
  star: <Star className="w-6 h-6" />,
  trophy: <Trophy className="w-6 h-6" />,
  target: <Target className="w-6 h-6" />,
  zap: <Zap className="w-6 h-6" />,
  book: <BookOpen className="w-6 h-6" />,
  brain: <Brain className="w-6 h-6" />,
  heart: <Heart className="w-6 h-6" />,
  award: <Award className="w-6 h-6" />,
  flame: <Flame className="w-6 h-6" />,
  medal: <Medal className="w-6 h-6" />,
  crown: <Crown className="w-6 h-6" />,
  sparkles: <Sparkles className="w-6 h-6" />,
};

const categoryColors = {
  learning: 'from-blue-400 to-indigo-500',
  streak: 'from-orange-400 to-amber-500',
  mastery: 'from-purple-400 to-pink-500',
  engagement: 'from-green-400 to-emerald-500',
  special: 'from-yellow-400 to-orange-500',
};

const rarityColors = {
  common: 'border-gray-300 bg-gray-50',
  rare: 'border-blue-300 bg-blue-50',
  epic: 'border-purple-300 bg-purple-50',
  legendary: 'border-yellow-400 bg-yellow-50',
};

const rarityGlow = {
  common: '',
  rare: 'shadow-blue-200',
  epic: 'shadow-purple-200',
  legendary: 'shadow-yellow-200 shadow-lg',
};

type CategoryFilter = 'all' | 'learning' | 'streak' | 'mastery' | 'engagement' | 'special';
type StatusFilter = 'all' | 'earned' | 'in-progress' | 'locked';

export default function AchievementsPage() {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  // Get selected child from parent profile
  const { selectedChildId: studentId, selectedChild: _selectedChild, isLoading: _profileLoading } = useSelectedChild();

  const { data: achievements = [], isLoading, error, refetch } = useAchievements(studentId);

  // Filter achievements
  const filteredAchievements = achievements.filter((a) => {
    // Category filter
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    // Status filter
    if (statusFilter === 'earned' && !a.earnedAt) return false;
    if (statusFilter === 'in-progress' && (!a.progress || a.earnedAt)) return false;
    if (statusFilter === 'locked' && (a.earnedAt || a.progress)) return false;
    return true;
  });

  // Stats
  const earnedCount = achievements.filter((a) => a.earnedAt).length;
  const inProgressCount = achievements.filter((a) => a.progress && !a.earnedAt).length;
  const totalCount = achievements.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  router.push('/dashboard');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-500" />
                <h1 className="text-xl font-semibold text-gray-900">Achievements</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{earnedCount} Achievements Earned</h2>
              <p className="text-white/80">
                {inProgressCount} in progress • {totalCount - earnedCount - inProgressCount} locked
              </p>
            </div>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${(earnedCount / totalCount) * 100}%` }}
            />
          </div>
          <p className="text-sm text-white/80 mt-2">
            {Math.round((earnedCount / totalCount) * 100)}% complete
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Category Filters */}
            <div className="flex gap-2 flex-wrap flex-1">
              {(
                [
                  'all',
                  'learning',
                  'streak',
                  'mastery',
                  'engagement',
                  'special',
                ] as CategoryFilter[]
              ).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoryFilter(cat);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    categoryFilter === cat
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="earned">Earned</option>
              <option value="in-progress">In Progress</option>
              <option value="locked">Locked</option>
            </select>
          </div>
        </div>

        {/* Achievement Grid */}
        {isLoading ? (
          <AchievementsPageSkeleton />
        ) : error ? (
          <QueryErrorDisplay error={error} onRetry={() => void refetch()} />
        ) : filteredAchievements.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No achievements found</h3>
            <p className="text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                onClick={() => {
                  setSelectedAchievement(achievement);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <AchievementModal
          achievement={selectedAchievement}
          onClose={() => {
            setSelectedAchievement(null);
          }}
        />
      )}
    </div>
  );
}

function AchievementCard({
  achievement,
  onClick,
}: {
  achievement: Achievement;
  onClick: () => void;
}) {
  const isEarned = !!achievement.earnedAt;
  const isInProgress = achievement.progress !== undefined && !isEarned;
  const isLocked = !isEarned && !isInProgress;

  return (
    <button
      onClick={onClick}
      className={`text-left p-6 rounded-xl border-2 transition-all hover:shadow-md ${
        rarityColors[achievement.rarity ?? 'common']
      } ${isEarned ? rarityGlow[achievement.rarity ?? 'common'] : ''} ${isLocked ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center ${
            isEarned
              ? `bg-gradient-to-br ${categoryColors[achievement.category]} text-white`
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          {isLocked ? <Lock className="w-6 h-6" /> : iconMap[achievement.icon]}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                achievement.rarity === 'legendary'
                  ? 'bg-yellow-200 text-yellow-800'
                  : achievement.rarity === 'epic'
                    ? 'bg-purple-200 text-purple-800'
                    : achievement.rarity === 'rare'
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-gray-200 text-gray-700'
              }`}
            >
              {achievement.rarity ?? 'common'}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{achievement.description}</p>

          {/* Progress bar for in-progress */}
          {isInProgress && achievement.total && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>
                  {achievement.progress} / {achievement.total}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${categoryColors[achievement.category]}`}
                  style={{
                    width: `${((achievement.progress || 0) / achievement.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Earned date */}
          {isEarned && achievement.earnedAt && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <Star className="w-3 h-3" />
              Earned {format(new Date(achievement.earnedAt), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function AchievementModal({
  achievement,
  onClose,
}: {
  achievement: Achievement;
  onClose: () => void;
}) {
  const isEarned = !!achievement.earnedAt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ×
        </button>

        <div className="text-center">
          {/* Icon */}
          <div
            className={`w-24 h-24 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
              isEarned
                ? `bg-gradient-to-br ${categoryColors[achievement.category]} text-white`
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            <div className="w-12 h-12">
              {iconMap[achievement.icon] || <Award className="w-12 h-12" />}
            </div>
          </div>

          {/* Rarity */}
          <span
            className={`inline-block px-3 py-1 text-sm font-medium rounded-full mb-2 ${
              achievement.rarity === 'legendary'
                ? 'bg-yellow-200 text-yellow-800'
                : achievement.rarity === 'epic'
                  ? 'bg-purple-200 text-purple-800'
                  : achievement.rarity === 'rare'
                    ? 'bg-blue-200 text-blue-800'
                    : 'bg-gray-200 text-gray-700'
            }`}
          >
            {(achievement.rarity ?? 'common').toUpperCase()}
          </span>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">{achievement.title}</h2>
          <p className="text-gray-500 mb-4">{achievement.description}</p>

          {/* Status */}
          {isEarned && achievement.earnedAt ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 font-medium flex items-center justify-center gap-2">
                <Star className="w-5 h-5" />
                Earned on {format(new Date(achievement.earnedAt), 'MMMM d, yyyy')}
              </p>
            </div>
          ) : achievement.progress !== undefined && achievement.total ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-700 font-medium mb-2">
                {achievement.progress} / {achievement.total} complete
              </p>
              <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${(achievement.progress / achievement.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-500 flex items-center justify-center gap-2">
                <Lock className="w-5 h-5" />
                Keep learning to unlock!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
