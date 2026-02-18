'use client';

import Link from 'next/link';
import { Gamepad2, Zap, Clock, Trophy, Play, ChevronRight, Sparkles } from 'lucide-react';

import { ErrorState, PageSkeleton } from '@/components/ui/loading-states';
import { useGames } from '@/lib/hooks/use-learner-api';

function getDifficultyBadge(difficulty: string) {
  if (difficulty === 'Easy') return 'bg-emerald-50 text-emerald-700';
  if (difficulty === 'Medium') return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

export default function GamesPage() {
  const { data, isLoading, error, refetch } = useGames();

  if (isLoading) return <PageSkeleton />;
  if (error || !data) {
    return <ErrorState message="Couldn't load games." onRetry={() => void refetch()} />;
  }

  const { games, dailyChallenge } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Learning Games</h1>
        <p className="mt-1 text-gray-500">Have fun while learning new skills</p>
      </div>

      {/* Daily Challenge */}
      {dailyChallenge && (
      <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl">
              {dailyChallenge.emoji}
            </div>
            <div>
              <p className="text-xs font-medium text-indigo-200 uppercase tracking-wider">Daily Challenge</p>
              <h2 className="text-lg font-bold">{dailyChallenge.title}</h2>
              <p className="text-sm text-indigo-200">{dailyChallenge.description}</p>
              <div className="mt-1 flex items-center gap-3 text-xs text-indigo-200">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {dailyChallenge.timeLeft} left</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> {dailyChallenge.reward} XP reward</span>
              </div>
            </div>
          </div>
          <Link
            href={`/games/${dailyChallenge.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 transition"
          >
            <Play className="h-4 w-4" /> Play Now
          </Link>
        </div>
      </section>
      )}

      {/* Game Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['All', 'Math', 'Reading', 'Science', 'Social Studies', 'Focus'].map((category) => (
          <button
            key={category}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
              category === 'All'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-100 hover:border-indigo-200 hover:text-indigo-600'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Games Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/games/${game.id}`}
            className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            {/* Game Header */}
            <div className={`bg-gradient-to-r ${game.color} p-6`}>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl backdrop-blur-sm">
                {game.emoji}
              </div>
            </div>

            {/* Game Content */}
            <div className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                  {game.title}
                </h3>
                <span
                  className={`rounded-lg px-2 py-0.5 text-xs font-medium ${getDifficultyBadge(game.difficulty)}`}
                >
                  {game.difficulty}
                </span>
              </div>
              <p className="text-sm text-gray-500">{game.description}</p>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1"><Gamepad2 className="h-3.5 w-3.5" /> {game.plays.toLocaleString()} plays</span>
                <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" /> High: {game.highScore.toLocaleString()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Leaderboard Teaser */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-gray-900">Weekly Leaderboard</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              You&apos;re currently ranked #42 out of 156 learners
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-indigo-200 hover:text-indigo-600 transition"
          >
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          {[
            { rank: 1, name: 'Alex K.', xp: 2500, color: 'bg-amber-50 text-amber-700' },
            { rank: 2, name: 'Sam M.', xp: 2350, color: 'bg-gray-50 text-gray-600' },
            { rank: 3, name: 'Jordan L.', xp: 2200, color: 'bg-orange-50 text-orange-700' },
          ].map((player) => (
            <div
              key={player.rank}
              className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${player.color}`}>
                #{player.rank}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-700">{player.name}</div>
                <div className="text-xs text-gray-500">{player.xp.toLocaleString()} XP</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
