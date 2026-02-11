'use client';

import Link from 'next/link';

import { ErrorState, PageSkeleton } from '@/components/ui/loading-states';
import { useGames } from '@/lib/hooks/use-learner-api';

function getDifficultyBadge(difficulty: string) {
  if (difficulty === 'Easy') return 'bg-green-100 text-green-700';
  if (difficulty === 'Medium') return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
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
        <h1 className="text-2xl font-bold text-slate-900">Learning Games</h1>
        <p className="mt-1 text-slate-600">Have fun while learning new skills</p>
      </div>

      {/* Daily Challenge */}
      {dailyChallenge && (
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 p-1">
        <div className="rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-3xl">
                {dailyChallenge.emoji}
              </div>
              <div>
                <h2 className="text-xl font-bold text-orange-900">{dailyChallenge.title}</h2>
                <p className="text-sm text-orange-700">{dailyChallenge.description}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-orange-600">
                  <span>⏰ {dailyChallenge.timeLeft} left</span>
                  <span>•</span>
                  <span>🎁 {dailyChallenge.reward} XP reward</span>
                </div>
              </div>
            </div>
            <Link
              href={`/games/${dailyChallenge.id}`}
              className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 font-medium text-white shadow-lg transition hover:from-orange-600 hover:to-red-600"
            >
              Play Now ▶️
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* Game Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['All', 'Math', 'Reading', 'Science', 'Social Studies', 'Focus'].map((category) => (
          <button
            key={category}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              category === 'All'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            {/* Game Header */}
            <div className={`bg-gradient-to-r ${game.color} p-6`}>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-4xl backdrop-blur-sm">
                {game.emoji}
              </div>
            </div>

            {/* Game Content */}
            <div className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600">
                  {game.title}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${getDifficultyBadge(game.difficulty)}`}
                >
                  {game.difficulty}
                </span>
              </div>
              <p className="text-sm text-slate-600">{game.description}</p>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>🎮 {game.plays.toLocaleString()} plays</span>
                <span>🏆 High Score: {game.highScore.toLocaleString()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Leaderboard Teaser */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">🏆 Weekly Leaderboard</h2>
            <p className="mt-1 text-sm text-slate-500">
              You&apos;re currently ranked #42 out of 156 learners
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View Full Leaderboard →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          {[
            { rank: 1, name: 'Alex K.', xp: 2500, emoji: '🥇' },
            { rank: 2, name: 'Sam M.', xp: 2350, emoji: '🥈' },
            { rank: 3, name: 'Jordan L.', xp: 2200, emoji: '🥉' },
          ].map((player) => (
            <div
              key={player.rank}
              className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
            >
              <span className="text-2xl">{player.emoji}</span>
              <div className="flex-1">
                <div className="font-medium text-slate-700">{player.name}</div>
                <div className="text-xs text-slate-500">{player.xp.toLocaleString()} XP</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
