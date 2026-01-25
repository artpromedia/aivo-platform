'use client';

import { useState } from 'react';

interface SpeechProgressProps {
  learnerId: string;
}

interface Goal {
  id: string;
  title: string;
  target: string;
  current: number;
  total: number;
  dueDate: string;
  category: string;
}

interface WeeklyData {
  day: string;
  minutes: number;
  exercises: number;
}

const GOALS: Goal[] = [
  { id: '1', title: 'Master S sounds', target: 'Complete 10 S exercises', current: 7, total: 10, dueDate: '2026-02-01', category: 'Articulation' },
  { id: '2', title: 'Practice R blends', target: 'Practice 15 R-blend words', current: 5, total: 15, dueDate: '2026-02-15', category: 'Phonemes' },
  { id: '3', title: 'Fluency exercises', target: 'Complete 5 fluency sessions', current: 3, total: 5, dueDate: '2026-01-31', category: 'Fluency' },
];

const WEEKLY_DATA: WeeklyData[] = [
  { day: 'Mon', minutes: 15, exercises: 3 },
  { day: 'Tue', minutes: 20, exercises: 4 },
  { day: 'Wed', minutes: 10, exercises: 2 },
  { day: 'Thu', minutes: 25, exercises: 5 },
  { day: 'Fri', minutes: 15, exercises: 3 },
  { day: 'Sat', minutes: 0, exercises: 0 },
  { day: 'Sun', minutes: 5, exercises: 1 },
];

export function SpeechProgress({ learnerId: _learnerId }: Readonly<SpeechProgressProps>) {
  const [goals] = useState<Goal[]>(GOALS);
  const [weeklyData] = useState<WeeklyData[]>(WEEKLY_DATA);

  const totalMinutes = weeklyData.reduce((sum, d) => sum + d.minutes, 0);
  const totalExercises = weeklyData.reduce((sum, d) => sum + d.exercises, 0);
  const maxMinutes = Math.max(...weeklyData.map((d) => d.minutes), 1);

  const stats = [
    { label: 'This Week', value: `${totalMinutes} min`, icon: '⏱️', color: 'bg-blue-500' },
    { label: 'Exercises', value: totalExercises.toString(), icon: '🎯', color: 'bg-green-500' },
    { label: 'Streak', value: '5 days', icon: '🔥', color: 'bg-orange-500' },
    { label: 'Sounds Mastered', value: '8', icon: '🏆', color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color} text-white`}>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Activity Chart */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Weekly Activity</h3>
        <div className="flex items-end gap-4">
          {weeklyData.map((day) => (
            <div key={day.day} className="flex flex-1 flex-col items-center">
              <div className="relative mb-2 w-full">
                <div
                  className="w-full rounded-t-lg bg-purple-500 transition-all duration-300 hover:bg-purple-600"
                  style={{ height: `${(day.minutes / maxMinutes) * 120}px`, minHeight: day.minutes > 0 ? '20px' : '4px' }}
                />
              </div>
              <span className="text-sm font-medium text-slate-600">{day.day}</span>
              <span className="text-xs text-slate-400">{day.minutes}m</span>
            </div>
          ))}
        </div>
      </div>

      {/* Goals */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">My Goals</h3>
          <button className="text-sm font-medium text-purple-600 hover:text-purple-700">
            + Add Goal
          </button>
        </div>

        <div className="space-y-4">
          {goals.map((goal) => {
            const percentage = Math.round((goal.current / goal.total) * 100);
            return (
              <div key={goal.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">{goal.title}</h4>
                    <p className="mt-1 text-sm text-slate-500">{goal.target}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    Due: {goal.dueDate}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-600">
                      {goal.current} of {goal.total}
                    </span>
                    <span className="font-medium text-purple-600">{percentage}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percentage >= 100 ? 'bg-green-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements */}
      <div className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-white">
        <h3 className="mb-4 text-lg font-semibold">Recent Achievements</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { icon: '🎤', title: 'First Recording', desc: 'Made your first voice recording' },
            { icon: '🔥', title: '5-Day Streak', desc: 'Practiced 5 days in a row' },
            { icon: '🎯', title: 'Sound Master', desc: 'Mastered your first sound' },
          ].map((achievement) => (
            <div
              key={achievement.title}
              className="flex items-center gap-3 rounded-lg bg-white/20 p-3"
            >
              <span className="text-2xl">{achievement.icon}</span>
              <div>
                <div className="font-medium">{achievement.title}</div>
                <div className="text-sm text-white/80">{achievement.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
