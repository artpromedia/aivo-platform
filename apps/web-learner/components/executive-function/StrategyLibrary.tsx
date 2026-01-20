'use client';

import React, { useState, useEffect, useCallback } from 'react';

import {
  getStrategies,
  getRecommendedStrategies,
  getFavoriteStrategies,
  recordStrategyUsage,
  rateStrategy,
  toggleFavoriteStrategy,
} from '../../lib/executive-function-api';
import type { EFStrategy, EFSkill, LearnerStrategyUsage } from '../../lib/executive-function-api';

const SKILL_INFO: Record<
  EFSkill,
  { label: string; icon: string; color: string; description: string }
> = {
  WORKING_MEMORY: {
    label: 'Working Memory',
    icon: '🧠',
    color: 'from-purple-500 to-indigo-500',
    description: 'Holding and using information in your mind',
  },
  COGNITIVE_FLEXIBILITY: {
    label: 'Cognitive Flexibility',
    icon: '🔄',
    color: 'from-blue-500 to-cyan-500',
    description: 'Switching between tasks and thinking flexibly',
  },
  INHIBITORY_CONTROL: {
    label: 'Inhibitory Control',
    icon: '✋',
    color: 'from-red-500 to-orange-500',
    description: 'Stopping yourself from acting impulsively',
  },
  PLANNING: {
    label: 'Planning',
    icon: '📋',
    color: 'from-green-500 to-teal-500',
    description: 'Making plans and organizing steps',
  },
  ORGANIZATION: {
    label: 'Organization',
    icon: '📁',
    color: 'from-yellow-500 to-amber-500',
    description: 'Keeping things orderly and finding what you need',
  },
  TIME_MANAGEMENT: {
    label: 'Time Management',
    icon: '⏰',
    color: 'from-pink-500 to-rose-500',
    description: 'Using time wisely and meeting deadlines',
  },
  TASK_INITIATION: {
    label: 'Task Initiation',
    icon: '🚀',
    color: 'from-emerald-500 to-green-500',
    description: 'Getting started on tasks without procrastinating',
  },
  EMOTIONAL_REGULATION: {
    label: 'Emotional Regulation',
    icon: '😊',
    color: 'from-violet-500 to-purple-500',
    description: 'Managing emotions and staying calm',
  },
  METACOGNITION: {
    label: 'Metacognition',
    icon: '🤔',
    color: 'from-slate-500 to-gray-500',
    description: 'Thinking about your own thinking',
  },
};

const ALL_SKILLS: EFSkill[] = [
  'WORKING_MEMORY',
  'COGNITIVE_FLEXIBILITY',
  'INHIBITORY_CONTROL',
  'PLANNING',
  'ORGANIZATION',
  'TIME_MANAGEMENT',
  'TASK_INITIATION',
  'EMOTIONAL_REGULATION',
  'METACOGNITION',
];

interface StrategyLibraryProps {
  learnerId: string;
  gradeLevel?: number;
  onStrategySelect?: (strategy: EFStrategy) => void;
}

type ViewMode = 'all' | 'recommended' | 'favorites';

/**
 * StrategyLibrary Component
 *
 * Browse and discover executive function strategies organized by skill area
 * Features: filtering, favorites, usage tracking, effectiveness ratings
 */
export function StrategyLibrary({
  learnerId,
  gradeLevel,
  onStrategySelect,
}: Readonly<StrategyLibraryProps>) {
  const [strategies, setStrategies] = useState<EFStrategy[]>([]);
  const [recommended, setRecommended] = useState<EFStrategy[]>([]);
  const [favorites, setFavorites] = useState<LearnerStrategyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<EFSkill | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedStrategy, setSelectedStrategy] = useState<EFStrategy | null>(null);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [strategiesData, recommendedData, favoritesData] = await Promise.all([
        getStrategies({ gradeLevel }),
        getRecommendedStrategies(learnerId),
        getFavoriteStrategies(learnerId),
      ]);
      setStrategies(strategiesData);
      setRecommended(recommendedData);
      setFavorites(favoritesData);

      // Extract ratings from favorites
      const ratings: Record<string, number> = {};
      favoritesData.forEach((fav) => {
        if (fav.avgRating) {
          ratings[fav.strategyId] = fav.avgRating;
        }
      });
      setUserRatings(ratings);
    } catch (error) {
      console.error('Failed to load strategies:', error);
    } finally {
      setLoading(false);
    }
  }, [learnerId, gradeLevel]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleTryStrategy(strategy: EFStrategy) {
    try {
      await recordStrategyUsage(learnerId, strategy.id);
      onStrategySelect?.(strategy);
    } catch (error) {
      console.error('Failed to record strategy usage:', error);
    }
  }

  async function handleRate(strategyId: string, rating: number) {
    try {
      await rateStrategy(learnerId, strategyId, rating);
      setUserRatings((prev) => ({ ...prev, [strategyId]: rating }));
    } catch (error) {
      console.error('Failed to rate strategy:', error);
    }
  }

  async function handleToggleFavorite(strategyId: string) {
    try {
      await toggleFavoriteStrategy(learnerId, strategyId);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }

  function isFavorite(strategyId: string): boolean {
    return favorites.some((f) => f.strategyId === strategyId && f.isFavorite);
  }

  // Filter strategies based on view mode and selected skill
  function getDisplayStrategies(): EFStrategy[] {
    let displayStrategies: EFStrategy[];

    switch (viewMode) {
      case 'recommended':
        displayStrategies = recommended;
        break;
      case 'favorites':
        displayStrategies = strategies.filter((s) => isFavorite(s.id));
        break;
      default:
        displayStrategies = strategies;
    }

    if (selectedSkill) {
      displayStrategies = displayStrategies.filter((s) => s.skill === selectedSkill);
    }

    return displayStrategies;
  }

  const displayStrategies = getDisplayStrategies();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-slate-600">Loading strategies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold">Strategy Library</h2>
        <p className="mt-2 text-white/80">
          Discover helpful strategies to strengthen your executive function skills
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setViewMode('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              viewMode === 'all' ? 'bg-white text-purple-600' : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            All Strategies
          </button>
          <button
            onClick={() => setViewMode('recommended')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              viewMode === 'recommended'
                ? 'bg-white text-purple-600'
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            ✨ Recommended for You
          </button>
          <button
            onClick={() => setViewMode('favorites')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              viewMode === 'favorites'
                ? 'bg-white text-purple-600'
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            ⭐ Favorites ({favorites.filter((f) => f.isFavorite).length})
          </button>
        </div>
      </div>

      {/* Skill Filter */}
      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="mb-3 text-sm font-medium text-slate-700">Filter by Skill Area</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSkill(null)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              selectedSkill === null
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Skills
          </button>
          {ALL_SKILLS.map((skill) => (
            <button
              key={skill}
              onClick={() => setSelectedSkill(skill)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedSkill === skill
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {SKILL_INFO[skill].icon} {SKILL_INFO[skill].label}
            </button>
          ))}
        </div>
      </div>

      {/* Skill Info Card (when skill selected) */}
      {selectedSkill && (
        <div
          className={`rounded-xl bg-gradient-to-br ${SKILL_INFO[selectedSkill].color} p-6 text-white shadow-lg`}
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">{SKILL_INFO[selectedSkill].icon}</span>
            <div>
              <h3 className="text-xl font-bold">{SKILL_INFO[selectedSkill].label}</h3>
              <p className="text-white/80">{SKILL_INFO[selectedSkill].description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Grid */}
      {displayStrategies.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow">
          <div className="text-5xl">📚</div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">No strategies found</h3>
          <p className="mt-2 text-slate-600">
            {viewMode === 'favorites'
              ? "You haven't favorited any strategies yet!"
              : 'Try adjusting your filters to see more strategies.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayStrategies.map((strategy) => (
            <div
              key={strategy.id}
              className="rounded-xl bg-white p-6 shadow transition hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{SKILL_INFO[strategy.skill].icon}</span>
                  <div>
                    <h4 className="font-bold text-slate-900">{strategy.title}</h4>
                    <span className="text-sm text-slate-500">
                      {SKILL_INFO[strategy.skill].label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleFavorite(strategy.id)}
                  className={`text-2xl transition ${
                    isFavorite(strategy.id) ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-400'
                  }`}
                >
                  {isFavorite(strategy.id) ? '★' : '☆'}
                </button>
              </div>

              <p className="mt-3 text-sm text-slate-600 line-clamp-2">{strategy.description}</p>

              {/* Category badge */}
              {strategy.category && (
                <span className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {strategy.category}
                </span>
              )}

              {/* User rating */}
              <div className="mt-4 flex items-center gap-1">
                <span className="text-sm text-slate-500">Rate this:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(strategy.id, star)}
                    className={`text-xl transition ${
                      (userRatings[strategy.id] || 0) >= star
                        ? 'text-yellow-500'
                        : 'text-slate-300 hover:text-yellow-400'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setSelectedStrategy(strategy)}
                  className="flex-1 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  Learn More
                </button>
                <button
                  onClick={() => handleTryStrategy(strategy)}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Try It
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Strategy Detail Modal */}
      {selectedStrategy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${SKILL_INFO[selectedStrategy.skill].color} text-3xl text-white`}
                >
                  {SKILL_INFO[selectedStrategy.skill].icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedStrategy.title}</h2>
                  <span className="text-slate-500">
                    {SKILL_INFO[selectedStrategy.skill].label}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStrategy(null)}
                className="text-2xl text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              <h3 className="font-bold text-slate-900">What is this strategy?</h3>
              <p className="mt-2 text-slate-600">{selectedStrategy.description}</p>
            </div>

            {/* Steps */}
            {selectedStrategy.steps && selectedStrategy.steps.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-slate-900">How to use this strategy:</h3>
                <ol className="mt-3 space-y-3">
                  {selectedStrategy.steps.map((step, index) => (
                    <li key={`step-${index}`} className="flex gap-3">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {index + 1}
                      </span>
                      <span className="text-slate-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Grade level info */}
            {(selectedStrategy.minGrade || selectedStrategy.maxGrade) && (
              <div className="mt-6 rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Recommended for:</span> Grades{' '}
                  {selectedStrategy.minGrade || 'K'} - {selectedStrategy.maxGrade || '12'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  handleTryStrategy(selectedStrategy);
                  setSelectedStrategy(null);
                }}
                className="flex-1 rounded-lg bg-blue-600 py-3 font-bold text-white hover:bg-blue-700"
              >
                🚀 Try This Strategy
              </button>
              <button
                onClick={() => handleToggleFavorite(selectedStrategy.id)}
                className={`rounded-lg px-6 py-3 font-medium transition ${
                  isFavorite(selectedStrategy.id)
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isFavorite(selectedStrategy.id) ? '★ Favorited' : '☆ Add to Favorites'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tips section */}
      <div className="rounded-xl bg-yellow-50 p-4">
        <h4 className="font-medium text-yellow-800">💡 Pro Tip</h4>
        <p className="mt-1 text-sm text-yellow-700">
          Try different strategies to find what works best for you! Everyone&apos;s brain works
          differently, so experiment and rate strategies to help you remember which ones help you
          most.
        </p>
      </div>
    </div>
  );
}
