'use client';

import type { FocusStats as FocusStatsType } from '../../../../lib/focus-api';

interface FocusStatsProps {
  stats: FocusStatsType;
}

function formatMinutes(seconds: number): string {
  return Math.round(seconds / 60).toString();
}

function formatHours(seconds: number): string {
  return (seconds / 3600).toFixed(1);
}

/**
 * Focus Stats Component
 * 
 * Displays focus statistics and progress tracking
 */
export function FocusStats({ stats }: Readonly<FocusStatsProps>) {

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Focus Time */}
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 p-6 text-white shadow-lg">
          <div className="text-4xl">⏱️</div>
          <div className="mt-3 text-3xl font-bold">{formatHours(stats.totalFocusTime)}h</div>
          <div className="mt-1 text-sm text-white/80">Total Focus Time</div>
        </div>

        {/* Total Sessions */}
        <div className="rounded-xl bg-gradient-to-br from-green-500 to-teal-500 p-6 text-white shadow-lg">
          <div className="text-4xl">🎯</div>
          <div className="mt-3 text-3xl font-bold">{stats.totalSessions}</div>
          <div className="mt-1 text-sm text-white/80">Sessions Completed</div>
        </div>

        {/* Current Streak */}
        <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white shadow-lg">
          <div className="text-4xl">🔥</div>
          <div className="mt-3 text-3xl font-bold">{stats.currentStreak}</div>
          <div className="mt-1 text-sm text-white/80">Day Streak</div>
        </div>

        {/* Average Session */}
        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white shadow-lg">
          <div className="text-4xl">📊</div>
          <div className="mt-3 text-3xl font-bold">{formatMinutes(stats.averageSessionLength)}m</div>
          <div className="mt-1 text-sm text-white/80">Avg Session Length</div>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900">Weekly Progress</h2>
        <p className="mt-1 text-sm text-slate-600">Your focus time over the past 7 days</p>

        <div className="mt-6">
          {stats.weeklyProgress.length > 0 ? (
            <div className="space-y-3">
              {stats.weeklyProgress.map((day, index) => {
                const maxMinutes = Math.max(...stats.weeklyProgress.map((d) => d.totalMinutes));
                const percentage = maxMinutes > 0 ? (day.totalMinutes / maxMinutes) * 100 : 0;

                return (
                  <div key={`${day.week}-${day.totalMinutes}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{day.week}</span>
                      <span className="text-slate-600">
                        {day.totalMinutes} min ({day.sessionsCompleted} sessions)
                      </span>
                    </div>
                    <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              <p>No focus sessions yet. Start your first session to see progress!</p>
            </div>
          )}
        </div>
      </div>

      {/* Achievements */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900">Achievements</h2>
        <p className="mt-1 text-sm text-slate-600">Milestones you've reached</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* First Session */}
          <div
            className={`rounded-lg border-2 p-4 ${
              stats.totalSessions >= 1
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-slate-200 bg-slate-50 opacity-50'
            }`}
          >
            <div className="text-3xl">🏆</div>
            <h3 className="mt-2 font-bold text-slate-900">First Session</h3>
            <p className="mt-1 text-xs text-slate-600">Complete your first focus session</p>
          </div>

          {/* 10 Sessions */}
          <div
            className={`rounded-lg border-2 p-4 ${
              stats.totalSessions >= 10
                ? 'border-blue-400 bg-blue-50'
                : 'border-slate-200 bg-slate-50 opacity-50'
            }`}
          >
            <div className="text-3xl">⭐</div>
            <h3 className="mt-2 font-bold text-slate-900">Focus Warrior</h3>
            <p className="mt-1 text-xs text-slate-600">Complete 10 focus sessions</p>
          </div>

          {/* 7-Day Streak */}
          <div
            className={`rounded-lg border-2 p-4 ${
              stats.currentStreak >= 7
                ? 'border-orange-400 bg-orange-50'
                : 'border-slate-200 bg-slate-50 opacity-50'
            }`}
          >
            <div className="text-3xl">🔥</div>
            <h3 className="mt-2 font-bold text-slate-900">Week Streak</h3>
            <p className="mt-1 text-xs text-slate-600">Maintain a 7-day streak</p>
          </div>

          {/* 50 Sessions */}
          <div
            className={`rounded-lg border-2 p-4 ${
              stats.totalSessions >= 50
                ? 'border-purple-400 bg-purple-50'
                : 'border-slate-200 bg-slate-50 opacity-50'
            }`}
          >
            <div className="text-3xl">💎</div>
            <h3 className="mt-2 font-bold text-slate-900">Focus Master</h3>
            <p className="mt-1 text-xs text-slate-600">Complete 50 focus sessions</p>
          </div>

          {/* 10 Hours */}
          <div
            className={`rounded-lg border-2 p-4 ${
              stats.totalFocusTime >= 36000
                ? 'border-green-400 bg-green-50'
                : 'border-slate-200 bg-slate-50 opacity-50'
            }`}
          >
            <div className="text-3xl">⏰</div>
            <h3 className="mt-2 font-bold text-slate-900">Time Lord</h3>
            <p className="mt-1 text-xs text-slate-600">Accumulate 10 hours of focus time</p>
          </div>

          {/* 30-Day Streak */}
          <div
            className={`rounded-lg border-2 p-4 ${
              stats.currentStreak >= 30
                ? 'border-red-400 bg-red-50'
                : 'border-slate-200 bg-slate-50 opacity-50'
            }`}
          >
            <div className="text-3xl">🏅</div>
            <h3 className="mt-2 font-bold text-slate-900">Consistency Champion</h3>
            <p className="mt-1 text-xs text-slate-600">Maintain a 30-day streak</p>
          </div>
        </div>
      </div>

      {/* Distraction Rate */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900">Focus Quality</h2>
        <p className="mt-1 text-sm text-slate-600">Your ability to stay focused</p>

        <div className="mt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <div className="text-4xl font-bold text-slate-900">
                {((1 - stats.distractionRate) * 100).toFixed(0)}%
              </div>
              <p className="mt-1 text-sm text-slate-600">Focus Score</p>
            </div>
            <div className="flex-1">
              <div className="text-4xl font-bold text-orange-600">
                {(stats.distractionRate * 100).toFixed(0)}%
              </div>
              <p className="mt-1 text-sm text-slate-600">Distraction Rate</p>
            </div>
          </div>

          <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-blue-500"
              style={{ width: `${(1 - stats.distractionRate) * 100}%` }}
            />
          </div>

          <div className="mt-4 rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              <strong>💡 Tip:</strong>{' '}
              {(() => {
                if (stats.distractionRate < 0.1) return 'Excellent focus! You\'re maintaining great concentration.';
                if (stats.distractionRate < 0.3) return 'Good focus! Try eliminating common distractions to improve further.';
                return 'Room for improvement. Consider using the distraction blocker feature.';
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
