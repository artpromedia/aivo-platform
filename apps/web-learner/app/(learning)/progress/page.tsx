import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';

// Mock data - would come from API in production
const MOCK_WEEKLY_STATS = [
  { day: 'Mon', minutes: 45, xp: 150 },
  { day: 'Tue', minutes: 30, xp: 100 },
  { day: 'Wed', minutes: 60, xp: 200 },
  { day: 'Thu', minutes: 25, xp: 80 },
  { day: 'Fri', minutes: 40, xp: 130 },
  { day: 'Sat', minutes: 15, xp: 50 },
  { day: 'Sun', minutes: 0, xp: 0 },
];

const MOCK_SUBJECT_PROGRESS = [
  { subject: 'Math', progress: 45, color: 'bg-blue-500', lessons: 11, total: 24, mastery: 72 },
  { subject: 'Science', progress: 30, color: 'bg-green-500', lessons: 6, total: 20, mastery: 65 },
  { subject: 'Reading', progress: 60, color: 'bg-purple-500', lessons: 11, total: 18, mastery: 85 },
  { subject: 'Social Studies', progress: 20, color: 'bg-orange-500', lessons: 3, total: 16, mastery: 55 },
];

const MOCK_SKILLS = [
  { skill: 'Fractions', level: 4, maxLevel: 5, emoji: '🔢' },
  { skill: 'Reading Comprehension', level: 5, maxLevel: 5, emoji: '📖' },
  { skill: 'Scientific Method', level: 3, maxLevel: 5, emoji: '🔬' },
  { skill: 'Problem Solving', level: 4, maxLevel: 5, emoji: '🧩' },
  { skill: 'Writing', level: 3, maxLevel: 5, emoji: '✍️' },
  { skill: 'Geography', level: 2, maxLevel: 5, emoji: '🗺️' },
];

const MOCK_RECENT_ACTIVITY = [
  { id: 1, type: 'lesson', title: 'Completed "Dividing Fractions"', xp: 50, time: '2 hours ago', emoji: '📖' },
  { id: 2, type: 'quiz', title: 'Passed Math Quiz', xp: 100, time: '4 hours ago', emoji: '✅' },
  { id: 3, type: 'game', title: 'Played Focus Game', xp: 25, time: '1 day ago', emoji: '🎮' },
  { id: 4, type: 'lesson', title: 'Started "The Water Cycle"', xp: 10, time: '1 day ago', emoji: '📖' },
  { id: 5, type: 'achievement', title: 'Earned "Math Whiz" badge', xp: 75, time: '2 days ago', emoji: '🏆' },
];

export default async function ProgressPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  const maxMinutes = Math.max(...MOCK_WEEKLY_STATS.map((s) => s.minutes));
  const totalXpThisWeek = MOCK_WEEKLY_STATS.reduce((sum, s) => sum + s.xp, 0);
  const totalMinutesThisWeek = MOCK_WEEKLY_STATS.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Progress</h1>
        <p className="mt-1 text-slate-600">Track your learning journey and achievements</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
          <div className="text-3xl">⏱️</div>
          <div className="mt-2 text-2xl font-bold text-blue-700">{totalMinutesThisWeek}</div>
          <div className="text-sm text-blue-600">Minutes this week</div>
        </div>
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
          <div className="text-3xl">⭐</div>
          <div className="mt-2 text-2xl font-bold text-purple-700">{totalXpThisWeek}</div>
          <div className="text-sm text-purple-600">XP earned</div>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
          <div className="text-3xl">🔥</div>
          <div className="mt-2 text-2xl font-bold text-orange-700">5</div>
          <div className="text-sm text-orange-600">Day streak</div>
        </div>
        <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
          <div className="text-3xl">📚</div>
          <div className="mt-2 text-2xl font-bold text-green-700">31</div>
          <div className="text-sm text-green-600">Lessons completed</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Activity Chart */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">📊 Weekly Learning Time</h2>
          <div className="flex h-48 items-end justify-between gap-2">
            {MOCK_WEEKLY_STATS.map((stat, i) => (
              <div key={stat.day} className="flex flex-1 flex-col items-center">
                <div className="w-full rounded-t-lg bg-slate-100" style={{ height: '100%' }}>
                  <div
                    className={`mt-auto w-full rounded-t-lg transition-all ${
                      i < 6 ? 'bg-gradient-to-t from-blue-500 to-cyan-400' : 'bg-slate-200'
                    }`}
                    style={{ height: `${maxMinutes > 0 ? (stat.minutes / maxMinutes) * 100 : 0}%` }}
                  />
                </div>
                <div className="mt-2 text-xs font-medium text-slate-500">{stat.day}</div>
                <div className="text-xs text-slate-400">{stat.minutes}m</div>
              </div>
            ))}
          </div>
        </section>

        {/* Subject Progress */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">📚 Subject Progress</h2>
          <div className="space-y-4">
            {MOCK_SUBJECT_PROGRESS.map((subject) => (
              <div key={subject.subject}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-slate-700">{subject.subject}</span>
                  <span className="text-sm text-slate-500">
                    {subject.lessons}/{subject.total} lessons
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${subject.color} transition-all`}
                      style={{ width: `${subject.progress}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-medium text-slate-600">
                    {subject.progress}%
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Mastery Level: {subject.mastery}%
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">💪 Skills</h2>
          <div className="grid grid-cols-2 gap-3">
            {MOCK_SKILLS.map((skill) => (
              <div
                key={skill.skill}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">{skill.emoji}</span>
                  <span className="text-sm font-medium text-slate-700">{skill.skill}</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: skill.maxLevel }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full ${
                        i < skill.level ? 'bg-yellow-400' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Level {skill.level}/{skill.maxLevel}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">🕐 Recent Activity</h2>
          <div className="space-y-3">
            {MOCK_RECENT_ACTIVITY.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
              >
                <span className="text-xl">{activity.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700">{activity.title}</div>
                  <div className="text-xs text-slate-400">{activity.time}</div>
                </div>
                <div className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                  +{activity.xp} XP
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
