'use client';

import { useState } from 'react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: 'learning' | 'streak' | 'mastery' | 'social' | 'special';
  earned: boolean;
  earnedDate?: string;
  progress?: number;
  progressMax?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const ACHIEVEMENTS: Achievement[] = [
  // Learning
  {
    id: 'first-lesson',
    title: 'First Steps',
    description: 'Complete your first lesson',
    emoji: '👣',
    category: 'learning',
    earned: true,
    earnedDate: '2024-09-05',
    rarity: 'common',
  },
  {
    id: 'ten-lessons',
    title: 'Knowledge Seeker',
    description: 'Complete 10 lessons',
    emoji: '📚',
    category: 'learning',
    earned: true,
    earnedDate: '2024-10-12',
    rarity: 'common',
  },
  {
    id: 'fifty-lessons',
    title: 'Scholar',
    description: 'Complete 50 lessons',
    emoji: '🎓',
    category: 'learning',
    earned: false,
    progress: 47,
    progressMax: 50,
    rarity: 'rare',
  },
  {
    id: 'hundred-lessons',
    title: 'Master Learner',
    description: 'Complete 100 lessons',
    emoji: '🏛️',
    category: 'learning',
    earned: false,
    progress: 47,
    progressMax: 100,
    rarity: 'epic',
  },
  // Streaks
  {
    id: 'streak-3',
    title: 'Getting Warmed Up',
    description: '3 day learning streak',
    emoji: '🔥',
    category: 'streak',
    earned: true,
    earnedDate: '2024-09-08',
    rarity: 'common',
  },
  {
    id: 'streak-7',
    title: 'Week Warrior',
    description: '7 day learning streak',
    emoji: '🌟',
    category: 'streak',
    earned: false,
    progress: 5,
    progressMax: 7,
    rarity: 'rare',
  },
  {
    id: 'streak-30',
    title: 'Monthly Champion',
    description: '30 day learning streak',
    emoji: '👑',
    category: 'streak',
    earned: false,
    progress: 5,
    progressMax: 30,
    rarity: 'epic',
  },
  {
    id: 'streak-100',
    title: 'Unstoppable',
    description: '100 day learning streak',
    emoji: '💎',
    category: 'streak',
    earned: false,
    progress: 5,
    progressMax: 100,
    rarity: 'legendary',
  },
  // Mastery
  {
    id: 'math-whiz',
    title: 'Math Whiz',
    description: 'Score 100% on 5 math quizzes',
    emoji: '🧮',
    category: 'mastery',
    earned: true,
    earnedDate: '2024-11-20',
    rarity: 'rare',
  },
  {
    id: 'reading-pro',
    title: 'Reading Pro',
    description: 'Complete 20 reading lessons',
    emoji: '📖',
    category: 'mastery',
    earned: false,
    progress: 12,
    progressMax: 20,
    rarity: 'rare',
  },
  {
    id: 'science-star',
    title: 'Science Star',
    description: 'Finish all science experiments',
    emoji: '🔬',
    category: 'mastery',
    earned: false,
    progress: 3,
    progressMax: 10,
    rarity: 'epic',
  },
  {
    id: 'writing-wizard',
    title: 'Writing Wizard',
    description: 'Write 10 stories',
    emoji: '✍️',
    category: 'mastery',
    earned: false,
    progress: 4,
    progressMax: 10,
    rarity: 'rare',
  },
  // Social
  {
    id: 'helper',
    title: 'Helping Hand',
    description: 'Help a classmate with a lesson',
    emoji: '🤝',
    category: 'social',
    earned: false,
    rarity: 'common',
  },
  {
    id: 'team-player',
    title: 'Team Player',
    description: 'Complete 5 group activities',
    emoji: '👥',
    category: 'social',
    earned: false,
    progress: 2,
    progressMax: 5,
    rarity: 'rare',
  },
  // Special
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Complete a lesson before 8 AM',
    emoji: '🌅',
    category: 'special',
    earned: true,
    earnedDate: '2024-10-03',
    rarity: 'rare',
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Complete a lesson after 8 PM',
    emoji: '🦉',
    category: 'special',
    earned: false,
    rarity: 'rare',
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Get 100% on 10 quizzes in a row',
    emoji: '💯',
    category: 'special',
    earned: false,
    progress: 3,
    progressMax: 10,
    rarity: 'legendary',
  },
  {
    id: 'explorer',
    title: 'Explorer',
    description: 'Try every learning tool',
    emoji: '🧭',
    category: 'special',
    earned: true,
    earnedDate: '2024-11-15',
    rarity: 'epic',
  },
];

const CATEGORIES = [
  { id: 'all', name: 'All', emoji: '🏆' },
  { id: 'learning', name: 'Learning', emoji: '📚' },
  { id: 'streak', name: 'Streaks', emoji: '🔥' },
  { id: 'mastery', name: 'Mastery', emoji: '⭐' },
  { id: 'social', name: 'Social', emoji: '👥' },
  { id: 'special', name: 'Special', emoji: '✨' },
];

const RARITY_COLORS = {
  common: 'from-slate-400 to-slate-500',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-500',
};

const RARITY_BG = {
  common: 'bg-slate-50 border-slate-200',
  rare: 'bg-blue-50 border-blue-200',
  epic: 'bg-purple-50 border-purple-200',
  legendary: 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300',
};

export default function AchievementsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showEarnedOnly, setShowEarnedOnly] = useState(false);

  const filteredAchievements = ACHIEVEMENTS.filter((a) => {
    if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
    if (showEarnedOnly && !a.earned) return false;
    return true;
  });

  const earnedCount = ACHIEVEMENTS.filter((a) => a.earned).length;
  const totalCount = ACHIEVEMENTS.length;

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
                style={{ width: `${(earnedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
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
            onChange={(e) => setShowEarnedOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show earned only
        </label>
      </div>

      {/* Achievement Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`relative rounded-2xl border-2 p-4 transition ${
              achievement.earned
                ? RARITY_BG[achievement.rarity]
                : 'border-slate-200 bg-white opacity-60 grayscale'
            } ${achievement.earned ? 'hover:scale-105' : ''}`}
          >
            {/* Rarity Badge */}
            <div
              className={`absolute -right-2 -top-2 rounded-full bg-gradient-to-r px-2 py-0.5 text-xs font-bold text-white ${
                RARITY_COLORS[achievement.rarity]
              }`}
            >
              {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
            </div>

            {/* Icon */}
            <div
              className={`mb-3 flex h-16 w-16 items-center justify-center rounded-xl text-4xl ${
                achievement.earned
                  ? `bg-gradient-to-br ${RARITY_COLORS[achievement.rarity]} text-white`
                  : 'bg-slate-200 text-slate-400'
              }`}
            >
              {achievement.earned ? achievement.emoji : '🔒'}
            </div>

            {/* Info */}
            <h3 className="font-bold text-slate-900">{achievement.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{achievement.description}</p>

            {/* Progress or Date */}
            {achievement.earned ? (
              <div className="mt-3 text-xs text-slate-500">
                ✓ Earned {new Date(achievement.earnedDate!).toLocaleDateString()}
              </div>
            ) : achievement.progress !== undefined ? (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-medium text-slate-700">
                    {achievement.progress}/{achievement.progressMax}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${(achievement.progress / achievement.progressMax!) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-slate-400">Not yet earned</div>
            )}
          </div>
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="py-12 text-center text-slate-500">
          <div className="mb-2 text-4xl">🔍</div>
          <p>No achievements found with current filters.</p>
        </div>
      )}
    </div>
  );
}
