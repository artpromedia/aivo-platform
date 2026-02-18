'use client';

import { Trophy, Lock, Sparkles, Filter, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  pointsValue: number;
}

interface EarnedBadge {
  id: string;
  badge: BadgeDefinition;
  earnedAt: string;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_META: Record<string, { name: string; emoji: string }> = {
  onboarding: { name: 'Onboarding', emoji: '👋' },
  learning: { name: 'Learning', emoji: '📚' },
  streak: { name: 'Streaks', emoji: '🔥' },
  mastery: { name: 'Mastery', emoji: '⭐' },
  skill: { name: 'Skills', emoji: '🧠' },
  quiz: { name: 'Quizzes', emoji: '📝' },
  social: { name: 'Social', emoji: '👥' },
  special: { name: 'Special', emoji: '✨' },
  xp: { name: 'XP', emoji: '💎' },
  time: { name: 'Time', emoji: '⏰' },
  secret: { name: 'Secret', emoji: '🔮' },
};

const RARITY_STYLES: Record<string, { ring: string; bg: string; text: string }> = {
  common: { ring: 'ring-gray-300', bg: 'bg-gray-50', text: 'text-gray-600' },
  uncommon: { ring: 'ring-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  rare: { ring: 'ring-blue-300', bg: 'bg-blue-50', text: 'text-blue-700' },
  epic: { ring: 'ring-purple-300', bg: 'bg-purple-50', text: 'text-purple-700' },
  legendary: { ring: 'ring-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
};

const CATEGORY_EMOJI: Record<string, string> = {
  onboarding: '👋',
  learning: '📚',
  streak: '🔥',
  mastery: '⭐',
  skill: '🧠',
  quiz: '📝',
  social: '👥',
  special: '✨',
  xp: '💎',
  time: '⏰',
  secret: '🔮',
};

// ============================================================================
// Page
// ============================================================================

export default function AchievementsPage() {
  const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showEarnedOnly, setShowEarnedOnly] = useState(false);

  useEffect(() => {
    async function fetchBadges() {
      try {
        setLoading(true);
        const badgesRes = await fetch('/api/learner/gamification/badges');
        const badgesData = badgesRes.ok ? await badgesRes.json() : { badges: [] };
        const earnedRes = await fetch('/api/learner/gamification/earned');
        const earnedData = earnedRes.ok ? await earnedRes.json() : { badges: [] };
        setAllBadges(badgesData.badges ?? []);
        setEarnedBadges(earnedData.badges ?? []);
      } catch (err) {
        console.error('Failed to fetch badges:', err);
        setError('Could not load achievements. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    void fetchBadges();
  }, []);

  const earnedIds = new Set(earnedBadges.map((eb) => eb.badge?.id ?? eb.id));

  const displayBadges = allBadges.map((badge) => ({
    ...badge,
    earned: earnedIds.has(badge.id),
    earnedAt: earnedBadges.find((eb) => (eb.badge?.id ?? eb.id) === badge.id)?.earnedAt,
    emoji: CATEGORY_EMOJI[badge.category] ?? '🏆',
  }));

  const categories = [
    { id: 'all', name: 'All' },
    ...Array.from(new Set(allBadges.map((b) => b.category))).map((cat) => ({
      id: cat,
      name: CATEGORY_META[cat]?.name ?? cat,
    })),
  ];

  const filteredBadges = displayBadges.filter((b) => {
    if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;
    if (showEarnedOnly && !b.earned) return false;
    return true;
  });

  const earnedCount = displayBadges.filter((b) => b.earned).length;
  const totalCount = displayBadges.length;
  const pct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-500 text-sm">Loading achievements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header + Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
          <p className="text-gray-500 mt-1">Collect badges by learning and exploring</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {earnedCount}<span className="text-base font-normal text-gray-400">/{totalCount}</span>
            </p>
            <p className="text-xs text-gray-400">Badges earned</p>
          </div>
          <div className="relative w-14 h-14">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none" stroke="#6366f1" strokeWidth="3"
                strokeDasharray={`${pct * 0.942} 100`} strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-indigo-600">
              {pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2 flex-wrap flex-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                selectedCategory === cat.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={showEarnedOnly}
            onChange={(e) => setShowEarnedOnly(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Earned only
        </label>
      </div>

      {/* Grid */}
      {filteredBadges.length === 0 ? (
        <div className="py-16 text-center">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No achievements found with current filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBadges.map((badge) => {
            const style = RARITY_STYLES[badge.rarity] ?? RARITY_STYLES.common;
            return (
              <div
                key={badge.id}
                className={`relative bg-white rounded-2xl border border-gray-100 p-5 shadow-sm transition ${
                  badge.earned
                    ? 'hover:shadow-md'
                    : 'opacity-50 grayscale'
                }`}
              >
                {/* Rarity pill */}
                <span className={`absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                  {badge.rarity}
                </span>

                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-3 ring-2 ${
                    badge.earned ? style.ring : 'ring-gray-200 bg-gray-50'
                  }`}
                >
                  {badge.earned ? badge.emoji : <Lock className="w-6 h-6 text-gray-300" />}
                </div>

                <h3 className="font-semibold text-gray-900 text-sm">{badge.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{badge.description}</p>

                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-medium text-indigo-600">
                    <Sparkles className="w-3 h-3" />
                    +{badge.pointsValue} XP
                  </span>
                  {badge.earned && badge.earnedAt ? (
                    <span className="text-[10px] text-gray-400">
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </span>
                  ) : !badge.earned ? (
                    <span className="text-[10px] text-gray-400">Locked</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
