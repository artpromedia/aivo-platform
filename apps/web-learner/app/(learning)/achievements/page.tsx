'use client';

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

const RARITY_COLORS: Record<string, string> = {
  common: 'from-slate-400 to-slate-500',
  uncommon: 'from-green-400 to-green-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-500',
};

const RARITY_BG: Record<string, string> = {
  common: 'bg-slate-50 border-slate-200',
  uncommon: 'bg-green-50 border-green-200',
  rare: 'bg-blue-50 border-blue-200',
  epic: 'bg-purple-50 border-purple-200',
  legendary: 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300',
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

        // Fetch all available badges from gamification-svc
        const badgesRes = await fetch('/api/learner/gamification/badges');
        const badgesData = badgesRes.ok ? await badgesRes.json() : { badges: [] };

        // Fetch earned badges for current learner
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

  // Build display items by merging definitions + earned status
  const displayBadges = allBadges.map((badge) => ({
    ...badge,
    earned: earnedIds.has(badge.id),
    earnedAt: earnedBadges.find((eb) => (eb.badge?.id ?? eb.id) === badge.id)?.earnedAt,
    emoji: CATEGORY_EMOJI[badge.category] ?? '🏆',
  }));

  // Extract unique categories
  const categories = [
    { id: 'all', name: 'All', emoji: '🏆' },
    ...Array.from(new Set(allBadges.map((b) => b.category))).map((cat) => ({
      id: cat,
      name: CATEGORY_META[cat]?.name ?? cat,
      emoji: CATEGORY_META[cat]?.emoji ?? '🏷️',
    })),
  ];

  const filteredBadges = displayBadges.filter((b) => {
    if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;
    if (showEarnedOnly && !b.earned) return false;
    return true;
  });

  const earnedCount = displayBadges.filter((b) => b.earned).length;
  const totalCount = displayBadges.length;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center text-slate-500">
          <div className="mb-2 text-4xl animate-pulse">🏆</div>
          <p>Loading achievements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center text-slate-500">
          <div className="mb-2 text-4xl">⚠️</div>
          <p>{error}</p>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 p-8 text-white shadow-lg">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">🏆 My Achievements</h1>
            <p className="mt-2 text-yellow-100">
              Collect badges by learning, exploring, and challenging yourself!
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold">
              {earnedCount}/{totalCount}
            </div>
            <div className="text-yellow-100">Achievements Earned</div>
            <div className="mt-2 h-3 w-48 rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showEarnedOnly}
            onChange={(e) => {
              setShowEarnedOnly(e.target.checked);
            }}
            className="rounded border-slate-300"
          />
          Show earned only
        </label>
      </div>

      {/* Achievement Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredBadges.map((badge) => (
          <div
            key={badge.id}
            className={`relative rounded-2xl border-2 p-4 transition ${
              badge.earned
                ? (RARITY_BG[badge.rarity] ?? RARITY_BG.common)
                : 'border-slate-200 bg-white opacity-60 grayscale'
            } ${badge.earned ? 'hover:scale-105' : ''}`}
          >
            {/* Rarity Badge */}
            <div
              className={`absolute -right-2 -top-2 rounded-full bg-gradient-to-r px-2 py-0.5 text-xs font-bold text-white ${
                RARITY_COLORS[badge.rarity] ?? RARITY_COLORS.common
              }`}
            >
              {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
            </div>

            {/* Icon */}
            <div
              className={`mb-3 flex h-16 w-16 items-center justify-center rounded-xl text-4xl ${
                badge.earned
                  ? `bg-gradient-to-br ${RARITY_COLORS[badge.rarity] ?? RARITY_COLORS.common} text-white`
                  : 'bg-slate-200 text-slate-400'
              }`}
            >
              {badge.earned ? badge.emoji : '🔒'}
            </div>

            {/* Info */}
            <h3 className="font-bold text-slate-900">{badge.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{badge.description}</p>

            {/* Points */}
            <div className="mt-2 text-xs text-blue-600 font-medium">+{badge.pointsValue} XP</div>

            {/* Earned date */}
            {badge.earned && badge.earnedAt ? (
              <div className="mt-2 text-xs text-slate-500">
                ✓ Earned {new Date(badge.earnedAt).toLocaleDateString()}
              </div>
            ) : !badge.earned ? (
              <div className="mt-2 text-xs text-slate-400">Not yet earned</div>
            ) : null}
          </div>
        ))}
      </div>

      {filteredBadges.length === 0 && (
        <div className="py-12 text-center text-slate-500">
          <div className="mb-2 text-4xl">🔍</div>
          <p>No achievements found with current filters.</p>
        </div>
      )}
    </div>
  );
}
